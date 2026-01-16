const { asyncHandler, ApiError } = require('../utils/errors');
const db = require('../config/db');
const { logAction } = require('../middleware/auditMiddleware');
const crypto = require('crypto');

// ============================================================================
// SYNC CHECKPOINT & SESSION MANAGEMENT
// ============================================================================

/**
 * Begin sync session / get checkpoint
 * POST /api/v1/sync/checkpoint
 */
exports.createSyncCheckpoint = asyncHandler(async (req, res) => {
  const { lastSyncAt } = req.body;
  const userId = req.user.uid;

  // Create checkpoint
  const checkpointId = crypto.randomUUID();
  const checkpointTime = new Date();

  await db.execute(
    `INSERT INTO sync_checkpoints 
     (id, user_id, checkpoint_time, last_sync_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      checkpointId,
      userId,
      checkpointTime,
      lastSyncAt ? new Date(lastSyncAt) : null,
      'ACTIVE'
    ]
  );

  res.status(201).json({
    success: true,
    message: 'Sync checkpoint created',
    data: {
      checkpointId,
      checkpointTime: checkpointTime.toISOString(),
      since: lastSyncAt || null
    }
  });
});

// ============================================================================
// UPLOAD LOCAL CHANGES
// ============================================================================

/**
 * Upload local changes (batch operations)
 * POST /api/v1/sync/upload
 */
exports.uploadChanges = asyncHandler(async (req, res) => {
  const { checkpointId, operations } = req.body;
  const userId = req.user.uid;

  // Validate checkpoint
  if (!checkpointId || !operations || !Array.isArray(operations)) {
    throw new ApiError('Invalid checkpoint or operations', 400);
  }

  const [checkpoints] = await db.execute(
    'SELECT * FROM sync_checkpoints WHERE id = ? AND user_id = ? AND status = "ACTIVE"',
    [checkpointId, userId]
  );

  if (checkpoints.length === 0) {
    throw new ApiError('Invalid or expired checkpoint', 400);
  }

  const results = [];
  const failedOps = [];

  // Process each operation atomically
  for (const op of operations) {
    try {
      const { id: operationId, entity, action, data, localTimestamp } = op;

      // Validate operation
      if (!operationId || !entity || !action || !data) {
        failedOps.push({
          operationId,
          error: 'Missing required fields'
        });
        continue;
      }

      // Process based on action (CREATE, UPDATE, DELETE)
      let result;
      if (action === 'CREATE') {
        result = await processCreateOperation(entity, data, userId, localTimestamp);
      } else if (action === 'UPDATE') {
        result = await processUpdateOperation(entity, data, userId, localTimestamp);
      } else if (action === 'DELETE') {
        result = await processDeleteOperation(entity, data, userId);
      } else {
        failedOps.push({
          operationId,
          error: 'Invalid action'
        });
        continue;
      }

      // Store sync record
      await db.execute(
        `INSERT INTO sync_operations 
         (id, user_id, checkpoint_id, entity_type, action, local_id, server_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          crypto.randomUUID(),
          userId,
          checkpointId,
          entity,
          action,
          operationId,
          result.id,
          'SUCCESS'
        ]
      );

      results.push({
        operationId,
        status: 'SUCCESS',
        serverId: result.id
      });
    } catch (error) {
      failedOps.push({
        operationId: op.id,
        error: error.message
      });
    }
  }

  // Audit log
  await logAction({
    userId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'SyncOperation',
    entityId: checkpointId,
    newValues: { operations_count: operations.length, successful: results.length },
    changeReason: 'Mobile sync upload',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: `Processed ${results.length} operations`,
    data: {
      checkpointId,
      successful: results,
      failed: failedOps,
      totalProcessed: results.length + failedOps.length
    }
  });
});

// ============================================================================
// PULL SERVER CHANGES
// ============================================================================

/**
 * Pull changes from server since checkpoint
 * GET /api/v1/sync/pull
 */
exports.pullChanges = asyncHandler(async (req, res) => {
  const { checkpointId } = req.query;
  const userId = req.user.uid;

  // Get checkpoint
  const [checkpoints] = await db.execute(
    'SELECT * FROM sync_checkpoints WHERE id = ? AND user_id = ?',
    [checkpointId, userId]
  );

  if (checkpoints.length === 0) {
    throw new ApiError('Checkpoint not found', 404);
  }

  const checkpoint = checkpoints[0];
  const sincTime = checkpoint.last_sync_at || checkpoint.created_at;

  // Get updated assignments
  const [assignmentChanges] = await db.execute(
    `SELECT id, staff_id, client_id, patient_id, status, updated_at
     FROM assignments 
     WHERE (staff_id = ? OR client_id = ?) AND updated_at > ?
     LIMIT 100`,
    [userId, userId, sincTime]
  );

  // Get updated care logs
  const [careLogChanges] = await db.execute(
    `SELECT id, assignment_id, log_type, vitals_json, created_at
     FROM care_logs 
     WHERE staff_id = ? AND created_at > ?
     LIMIT 100`,
    [userId, sincTime]
  );

  // Get updated attendance
  const [attendanceChanges] = await db.execute(
    `SELECT id, batch_id, attendance_status, created_at
     FROM batch_attendance 
     WHERE student_id = ? AND created_at > ?
     LIMIT 100`,
    [userId, sincTime]
  );

  const changes = [
    ...assignmentChanges.map(a => ({
      id: a.id,
      entity: 'assignment',
      action: 'UPDATE',
      data: a,
      serverTimestamp: a.updated_at
    })),
    ...careLogChanges.map(c => ({
      id: c.id,
      entity: 'care_log',
      action: 'CREATE',
      data: c,
      serverTimestamp: c.created_at
    })),
    ...attendanceChanges.map(a => ({
      id: a.id,
      entity: 'attendance',
      action: 'CREATE',
      data: a,
      serverTimestamp: a.created_at
    }))
  ];

  res.json({
    success: true,
    data: {
      checkpointId,
      changes,
      changeCount: changes.length,
      pulledAt: new Date().toISOString()
    }
  });
});

// ============================================================================
// COMPLETE SYNC
// ============================================================================

/**
 * Mark sync as complete
 * POST /api/v1/sync/complete
 */
exports.completeSyncSession = asyncHandler(async (req, res) => {
  const { checkpointId } = req.body;
  const userId = req.user.uid;

  // Update checkpoint status
  await db.execute(
    'UPDATE sync_checkpoints SET status = "COMPLETED", completed_at = NOW() WHERE id = ? AND user_id = ?',
    [checkpointId, userId]
  );

  // Audit log
  await logAction({
    userId,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'SyncCheckpoint',
    entityId: checkpointId,
    changeReason: 'Sync session completed',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Sync session completed',
    data: {
      checkpointId,
      completedAt: new Date().toISOString()
    }
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function processCreateOperation(entity, data, userId, localTimestamp) {
  const id = crypto.randomUUID();

  if (entity === 'care_log') {
    // Validate required fields
    if (!data.assignmentId || !data.logType) {
      throw new ApiError('Missing required fields for care_log', 400);
    }

    // Verify assignment exists and user is staff
    const [assignments] = await db.execute(
      'SELECT * FROM assignments WHERE id = ? AND staff_id = ?',
      [data.assignmentId, userId]
    );

    if (assignments.length === 0) {
      throw new ApiError('Assignment not found', 400);
    }

    // Create care log
    await db.execute(
      `INSERT INTO care_logs 
       (id, assignment_id, staff_id, log_type, vitals_json, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.assignmentId,
        userId,
        data.logType,
        data.vitals ? JSON.stringify(data.vitals) : null,
        data.notes,
        new Date(localTimestamp) // Use client timestamp
      ]
    );

    return { id };
  }

  if (entity === 'assignment_submission') {
    // Create assignment submission (for students)
    await db.execute(
      `INSERT INTO batch_submissions 
       (id, assignment_id, student_id, submission_content, submitted_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        data.assignmentId,
        userId,
        data.content,
        new Date(localTimestamp)
      ]
    );

    return { id };
  }

  throw new ApiError('Unknown entity type', 400);
}

async function processUpdateOperation(entity, data, userId, localTimestamp) {
  if (entity === 'assignment') {
    const { id, status } = data;

    // Verify user is involved in assignment
    const [assignments] = await db.execute(
      'SELECT * FROM assignments WHERE id = ? AND (staff_id = ? OR client_id = ?)',
      [id, userId, userId]
    );

    if (assignments.length === 0) {
      throw new ApiError('Assignment not found', 400);
    }

    // Update status
    await db.execute(
      'UPDATE assignments SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    return { id };
  }

  if (entity === 'attendance') {
    const { id, attendanceStatus } = data;

    // Update attendance
    await db.execute(
      'UPDATE batch_attendance SET attendance_status = ? WHERE id = ? AND student_id = ?',
      [attendanceStatus, id, userId]
    );

    return { id };
  }

  throw new ApiError('Unknown entity type', 400);
}

async function processDeleteOperation(entity, data, userId) {
  if (entity === 'care_log') {
    const { id } = data;

    // Verify ownership
    const [logs] = await db.execute(
      'SELECT * FROM care_logs WHERE id = ? AND staff_id = ?',
      [id, userId]
    );

    if (logs.length === 0) {
      throw new ApiError('Care log not found', 400);
    }

    // Soft delete
    await db.execute(
      'UPDATE care_logs SET deleted_at = NOW() WHERE id = ?',
      [id]
    );

    return { id };
  }

  throw new ApiError('Unknown entity type', 400);
}
