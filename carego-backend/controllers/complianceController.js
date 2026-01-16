const { asyncHandler, ApiError } = require('../utils/errors');
const db = require('../config/db');
const { logAction } = require('../middleware/auditMiddleware');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { json2csv } = require('json2csv');

// ============================================================================
// HIPAA AUDIT EXPORT
// ============================================================================

/**
 * Export HIPAA audit trail
 * POST /api/v1/compliance/hipaa/audit-export
 */
exports.exportHIPAAauditTrail = asyncHandler(async (req, res) => {
  const { patientId, startDate, endDate, includeAllUsers = false } = req.body;
  const userId = req.user.uid;

  // Validate date range
  if (!startDate || !endDate) {
    throw new ApiError('Start and end dates required', 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    throw new ApiError('Invalid date range', 400);
  }

  // Get audit logs for patient
  let auditQuery =
    `SELECT * FROM audit_logs 
     WHERE entity_type = 'PatientData' 
     AND entity_id = ? 
     AND created_at BETWEEN ? AND ?
     ORDER BY created_at DESC`;

  const auditParams = [patientId, start, end];

  const [logs] = await db.execute(auditQuery, auditParams);

  // If not including all users, filter to current staff's access
  const filteredLogs = includeAllUsers
    ? logs
    : logs.filter(log => log.user_id === userId || log.action === 'VIEW');

  // Create HIPAA-compliant report
  const report = {
    exportDate: new Date().toISOString(),
    patientId,
    dateRange: { start: startDate, end: endDate },
    accessCount: filteredLogs.length,
    accessLog: filteredLogs.map(log => ({
      timestamp: log.created_at,
      user_id: log.user_id,
      user_role: log.user_role,
      action: log.action,
      entity_type: log.entity_type,
      description: log.description,
      ip_address: log.ip_address,
      session_id: log.session_id,
    })),
  };

  // Store export record
  const exportId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO compliance_exports 
     (id, user_id, export_type, patient_id, export_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      exportId,
      userId,
      'HIPAA_AUDIT',
      patientId,
      JSON.stringify(report),
      'COMPLETED'
    ]
  );

  // Audit log (meta-audit: audit access)
  await logAction({
    userId,
    userRole: req.user.role,
    action: 'EXPORT',
    entityType: 'AuditLog',
    entityId: exportId,
    newValues: { export_type: 'HIPAA_AUDIT', record_count: filteredLogs.length },
    changeReason: 'HIPAA audit trail exported',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'HIPAA audit trail exported',
    data: {
      exportId,
      report,
    },
  });
});

// ============================================================================
// GDPR DATA EXPORT
// ============================================================================

/**
 * Export user personal data (GDPR)
 * POST /api/v1/compliance/gdpr/data-export
 */
exports.exportGDPRData = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body;
  const requesterUserId = req.user.uid;
  const requesterRole = req.user.role;

  // Validate access: Only admins can export others, users can export themselves
  if (targetUserId !== requesterUserId && requesterRole !== 'ADMIN') {
    throw new ApiError('Unauthorized', 403);
  }

  // Fetch user data from all relevant tables
  const userData = {
    user_profile: {},
    assignments: [],
    care_logs: [],
    ratings: [],
    submissions: [],
    invoice_data: [],
    audit_data: [],
  };

  // User profile
  const [userProfiles] = await db.execute(
    'SELECT * FROM staff_profiles WHERE id = ?',
    [targetUserId]
  );
  if (userProfiles.length > 0) {
    userData.user_profile = userProfiles[0];
  }

  // Assignments
  const [assignments] = await db.execute(
    'SELECT * FROM assignments WHERE staff_id = ? OR patient_id = ?',
    [targetUserId, targetUserId]
  );
  userData.assignments = assignments;

  // Care logs
  const [careLogs] = await db.execute(
    'SELECT * FROM care_logs WHERE staff_id = ? OR patient_id = ?',
    [targetUserId, targetUserId]
  );
  userData.care_logs = careLogs;

  // Ratings
  const [ratings] = await db.execute(
    'SELECT * FROM ratings WHERE rater_id = ? OR rated_user_id = ?',
    [targetUserId, targetUserId]
  );
  userData.ratings = ratings;

  // Submissions
  const [submissions] = await db.execute(
    'SELECT * FROM assignment_submissions WHERE submitted_by = ?',
    [targetUserId]
  );
  userData.submissions = submissions;

  // Invoice data
  const [invoices] = await db.execute(
    'SELECT * FROM invoices WHERE client_id = ?',
    [targetUserId]
  );
  userData.invoice_data = invoices;

  // Audit data
  const [auditLogs] = await db.execute(
    'SELECT * FROM audit_logs WHERE user_id = ?',
    [targetUserId]
  );
  userData.audit_data = auditLogs;

  // Create export record
  const exportId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO compliance_exports 
     (id, user_id, export_type, target_user_id, export_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      exportId,
      requesterUserId,
      'GDPR_DATA_EXPORT',
      targetUserId,
      JSON.stringify(userData),
      'COMPLETED'
    ]
  );

  // Audit log
  await logAction({
    userId: requesterUserId,
    userRole: requesterRole,
    action: 'EXPORT',
    entityType: 'UserData',
    entityId: exportId,
    newValues: { target_user_id: targetUserId, export_type: 'GDPR_DATA_EXPORT' },
    changeReason: 'User data exported for GDPR request',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'User data exported (GDPR)',
    data: {
      exportId,
      userData,
    },
  });
});

// ============================================================================
// GDPR DATA DELETION
// ============================================================================

/**
 * Delete user personal data (GDPR)
 * DELETE /api/v1/compliance/gdpr/data-delete
 */
exports.deleteGDPRData = asyncHandler(async (req, res) => {
  const { targetUserId, deletionReason } = req.body;
  const requesterUserId = req.user.uid;
  const requesterRole = req.user.role;

  // Only admins can delete user data
  if (requesterRole !== 'ADMIN') {
    throw new ApiError('Only admins can delete user data', 403);
  }

  if (!deletionReason) {
    throw new ApiError('Deletion reason required', 400);
  }

  // Log deletion request
  const deletionRecordId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO data_deletion_requests 
     (id, target_user_id, requested_by, reason, status, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      deletionRecordId,
      targetUserId,
      requesterUserId,
      deletionReason,
      'APPROVED'
    ]
  );

  // Soft delete: Set deleted_at on user
  await db.execute(
    'UPDATE staff_profiles SET deleted_at = NOW() WHERE id = ?',
    [targetUserId]
  );

  // Soft delete: Anonymize care logs (keep for continuity)
  await db.execute(
    `UPDATE care_logs 
     SET patient_id = NULL, staff_id = NULL, content = '[REDACTED]'
     WHERE staff_id = ? OR patient_id = ?`,
    [targetUserId, targetUserId]
  );

  // Soft delete: Anonymize ratings
  await db.execute(
    `UPDATE ratings 
     SET comment = '[REDACTED]', rater_id = NULL
     WHERE rater_id = ? OR rated_user_id = ?`,
    [targetUserId, targetUserId]
  );

  // Soft delete: Anonymize submissions
  await db.execute(
    `UPDATE assignment_submissions 
     SET submission_json = '[REDACTED]'
     WHERE submitted_by = ?`,
    [targetUserId]
  );

  // Audit log (cannot be deleted - immutable)
  await logAction({
    userId: requesterUserId,
    userRole: requesterRole,
    action: 'DELETE',
    entityType: 'UserData',
    entityId: targetUserId,
    newValues: { reason: deletionReason, deletion_record_id: deletionRecordId },
    changeReason: 'User data deleted per GDPR request',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'User data deleted (GDPR)',
    data: {
      deletionRecordId,
      targetUserId,
      deletionStatus: 'COMPLETED',
    },
  });
});

// ============================================================================
// DATA RETENTION POLICY
// ============================================================================

/**
 * Get data retention policy
 * GET /api/v1/compliance/retention-policy
 */
exports.getRetentionPolicy = asyncHandler(async (req, res) => {
  const retentionPolicy = {
    policyVersion: '1.0',
    effectiveDate: '2024-01-01',
    policies: {
      audit_logs: {
        retention_days: 2555, // 7 years
        description: 'Immutable audit logs retained for legal compliance',
      },
      patient_data: {
        retention_days: 1825, // 5 years after treatment ends
        description: 'Patient data retained per medical standards',
      },
      transaction_logs: {
        retention_days: 2555, // 7 years
        description: 'Financial records retained per tax requirements',
      },
      care_logs: {
        retention_days: 1825, // 5 years
        description: 'Care records retention per regulations',
      },
      deleted_user_data: {
        retention_days: 30,
        description: 'Soft-deleted user data retained for recovery window',
      },
      session_logs: {
        retention_days: 90,
        description: 'Session tracking for security',
      },
    },
    deletion_schedule: {
      frequency: 'MONTHLY',
      next_run: getNextMonthlyRun(),
      entities_affected: [
        'session_logs (90+ days old)',
        'soft-deleted records (30+ days old)',
      ],
    },
  };

  res.json({
    success: true,
    data: retentionPolicy,
  });
});

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

/**
 * Create data processing consent
 * POST /api/v1/compliance/consent
 */
exports.createConsent = asyncHandler(async (req, res) => {
  const { userId, consentType, dataCategories, expiresAt } = req.body;
  const adminId = req.user.uid;

  if (!userId || !consentType || !dataCategories) {
    throw new ApiError('Missing required fields', 400);
  }

  const consentId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO data_consents 
     (id, user_id, consent_type, data_categories, expires_at, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      consentId,
      userId,
      consentType,
      JSON.stringify(dataCategories),
      expiresAt || null,
      adminId,
    ]
  );

  // Audit log
  await logAction({
    userId: adminId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'DataConsent',
    entityId: consentId,
    newValues: { consent_type: consentType, data_categories: dataCategories },
    changeReason: 'Data processing consent created',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.status(201).json({
    success: true,
    message: 'Consent created',
    data: {
      consentId,
    },
  });
});

/**
 * Revoke consent
 * DELETE /api/v1/compliance/consent/:id
 */
exports.revokeConsent = asyncHandler(async (req, res) => {
  const { id: consentId } = req.params;
  const userId = req.user.uid;

  // Get consent
  const [consents] = await db.execute(
    'SELECT * FROM data_consents WHERE id = ?',
    [consentId]
  );

  if (consents.length === 0) {
    throw new ApiError('Consent not found', 404);
  }

  const consent = consents[0];

  // Only the consent holder or admin can revoke
  if (consent.user_id !== userId && req.user.role !== 'ADMIN') {
    throw new ApiError('Unauthorized', 403);
  }

  // Soft delete consent
  await db.execute(
    'UPDATE data_consents SET revoked_at = NOW() WHERE id = ?',
    [consentId]
  );

  // Audit log
  await logAction({
    userId,
    userRole: req.user.role,
    action: 'DELETE',
    entityType: 'DataConsent',
    entityId: consentId,
    newValues: { status: 'REVOKED' },
    changeReason: 'Data processing consent revoked',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Consent revoked',
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getNextMonthlyRun() {
  const now = new Date();
  const nextRun = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextRun.toISOString();
}
