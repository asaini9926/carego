/**
 * Staffing Assignments Controller (Admin)
 * Handles staff assignments to patients, assignment management
 * Phase 2: Care Operations
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');
const { generateId, isValidUUID } = require('../utils/validators');
const { logAction } = require('../services/auditService');

/**
 * Create new staff assignment
 * POST /api/v1/admin/assignments
 */
exports.createAssignment = asyncHandler(async (req, res) => {
  const { staffId, patientId, shift, startDate, endDate, notes } = req.body;

  // Validate input
  if (!staffId || !patientId || !shift || !startDate) {
    throw new ApiError('Missing required fields: staffId, patientId, shift, startDate', 400);
  }

  // Validate dates
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (isNaN(start.getTime())) {
    throw new ApiError('Invalid startDate format', 400);
  }

  if (end && isNaN(end.getTime())) {
    throw new ApiError('Invalid endDate format', 400);
  }

  if (end && end <= start) {
    throw new ApiError('endDate must be after startDate', 400);
  }

  // Check staff exists and is VERIFIED
  const [staffCheck] = await db.execute(
    `SELECT u.id, u.account_status, sp.verification_status 
     FROM users u
     JOIN staff_profiles sp ON u.id = sp.user_id
     WHERE u.id = ? AND u.user_type = 'STAFF'`,
    [staffId]
  );

  if (staffCheck.length === 0) {
    throw new ApiError('Staff not found', 404);
  }

  if (staffCheck[0].verification_status !== 'VERIFIED') {
    throw new ApiError('Staff must be VERIFIED before assignment', 400);
  }

  if (staffCheck[0].account_status !== 'ACTIVE') {
    throw new ApiError('Staff account is not ACTIVE', 400);
  }

  // Check patient exists
  const [patientCheck] = await db.execute(
    'SELECT id, client_id FROM patients WHERE id = ?',
    [patientId]
  );

  if (patientCheck.length === 0) {
    throw new ApiError('Patient not found', 404);
  }

  // Check for overlapping assignments
  const [overlap] = await db.execute(
    `SELECT id FROM staff_assignments 
     WHERE staff_id = ? AND status = 'ACTIVE'
     AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)`,
    [staffId, end || new Date('2099-12-31'), start]
  );

  if (overlap.length > 0) {
    throw new ApiError('Staff has overlapping assignment in this period', 409);
  }

  // Create assignment
  const assignmentId = generateId();
  await db.execute(
    `INSERT INTO staff_assignments 
     (id, staff_id, patient_id, shift, start_date, end_date, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NOW())`,
    [assignmentId, staffId, patientId, shift, start, end, notes || null]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Assignment',
    entityId: assignmentId,
    newValues: { staff_id: staffId, patient_id: patientId, shift, start_date: start, end_date: end },
    changeReason: notes || 'Assignment created',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Assignment created successfully',
    data: {
      assignmentId,
      staffId,
      patientId,
      shift,
      startDate: start,
      endDate: end,
      status: 'ACTIVE'
    }
  });
});

/**
 * Get all assignments (with filtering)
 * GET /api/v1/admin/assignments?status=ACTIVE&staffId=xxx&patientId=xxx&page=1&limit=20
 */
exports.getAllAssignments = asyncHandler(async (req, res) => {
  const { status, staffId, patientId, cityId, page = 1, limit = 20, startDate, endDate } = req.query;

  let query = `
    SELECT 
      sa.id, sa.staff_id, sa.patient_id, sa.shift, sa.start_date, sa.end_date, sa.status, sa.notes, sa.created_at,
      u.phone as staff_phone,
      sp.specialization,
      p.name as patient_name, p.age as patient_age,
      cp.contact_person, c.city_name
    FROM staff_assignments sa
    JOIN users u ON sa.staff_id = u.id
    JOIN staff_profiles sp ON u.id = sp.user_id
    JOIN patients p ON sa.patient_id = p.id
    JOIN client_profiles cp ON p.client_id = cp.user_id
    JOIN cities c ON sp.city_id = c.id
    WHERE 1=1
  `;

  const params = [];

  if (status) {
    query += ' AND sa.status = ?';
    params.push(status);
  }

  if (staffId) {
    query += ' AND sa.staff_id = ?';
    params.push(staffId);
  }

  if (patientId) {
    query += ' AND sa.patient_id = ?';
    params.push(patientId);
  }

  if (cityId) {
    query += ' AND sp.city_id = ?';
    params.push(cityId);
  }

  if (startDate) {
    query += ' AND sa.start_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND sa.end_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY sa.created_at DESC';

  // Pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

  const [assignmentsList] = await db.execute(query, params);

  // Get total count
  let countQuery = `SELECT COUNT(*) as total FROM staff_assignments WHERE 1=1`;
  const countParams = [];

  if (status) {
    countQuery += ' AND status = ?';
    countParams.push(status);
  }
  if (staffId) {
    countQuery += ' AND staff_id = ?';
    countParams.push(staffId);
  }
  if (patientId) {
    countQuery += ' AND patient_id = ?';
    countParams.push(patientId);
  }

  const [countResult] = await db.execute(countQuery, countParams);
  const total = countResult[0]?.total || 0;

  res.json({
    success: true,
    data: assignmentsList,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

/**
 * Get single assignment detail
 * GET /api/v1/admin/assignments/:assignmentId
 */
exports.getAssignmentDetail = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  const [assignmentData] = await db.execute(
    `SELECT 
      sa.id, sa.staff_id, sa.patient_id, sa.shift, sa.start_date, sa.end_date, sa.status, sa.notes, sa.created_at,
      u.phone as staff_phone,
      sp.specialization,
      p.name as patient_name, p.age as patient_age, p.medical_condition,
      cp.contact_person, c.city_name
    FROM staff_assignments sa
    JOIN users u ON sa.staff_id = u.id
    JOIN staff_profiles sp ON u.id = sp.user_id
    JOIN patients p ON sa.patient_id = p.id
    JOIN client_profiles cp ON p.client_id = cp.user_id
    JOIN cities c ON sp.city_id = c.id
    WHERE sa.id = ?`,
    [assignmentId]
  );

  if (assignmentData.length === 0) {
    throw new ApiError('Assignment not found', 404);
  }

  const assignment = assignmentData[0];

  // Get attendance logs
  const [attendance] = await db.execute(
    `SELECT id, check_in_time, check_out_time, check_in_latitude, check_in_longitude, created_at
     FROM attendance_logs
     WHERE assignment_id = ?
     ORDER BY created_at DESC LIMIT 10`,
    [assignmentId]
  );

  // Get care logs
  const [careLogs] = await db.execute(
    `SELECT id, notes, created_at
     FROM care_logs
     WHERE assignment_id = ?
     ORDER BY created_at DESC LIMIT 5`,
    [assignmentId]
  );

  res.json({
    success: true,
    data: {
      ...assignment,
      recentAttendance: attendance,
      recentCareLogs: careLogs
    }
  });
});

/**
 * Pause/pause assignment (temporarily)
 * POST /api/v1/admin/assignments/:assignmentId/pause
 */
exports.pauseAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new ApiError('Reason for pause is required', 400);
  }

  // Check assignment exists
  const [assignmentCheck] = await db.execute(
    'SELECT status FROM staff_assignments WHERE id = ?',
    [assignmentId]
  );

  if (assignmentCheck.length === 0) {
    throw new ApiError('Assignment not found', 404);
  }

  const oldStatus = assignmentCheck[0].status;

  if (oldStatus !== 'ACTIVE') {
    throw new ApiError(`Cannot pause assignment with status: ${oldStatus}`, 400);
  }

  // Update status
  await db.execute(
    'UPDATE staff_assignments SET status = ? WHERE id = ?',
    ['PAUSED', assignmentId]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Assignment',
    entityId: assignmentId,
    oldValues: { status: oldStatus },
    newValues: { status: 'PAUSED' },
    changeReason: reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Assignment paused successfully',
    data: { assignmentId, status: 'PAUSED' }
  });
});

/**
 * Resume assignment (from paused)
 * POST /api/v1/admin/assignments/:assignmentId/resume
 */
exports.resumeAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new ApiError('Reason for resume is required', 400);
  }

  // Check assignment exists
  const [assignmentCheck] = await db.execute(
    'SELECT status FROM staff_assignments WHERE id = ?',
    [assignmentId]
  );

  if (assignmentCheck.length === 0) {
    throw new ApiError('Assignment not found', 404);
  }

  const oldStatus = assignmentCheck[0].status;

  if (oldStatus !== 'PAUSED') {
    throw new ApiError(`Can only resume PAUSED assignments, current status: ${oldStatus}`, 400);
  }

  // Update status
  await db.execute(
    'UPDATE staff_assignments SET status = ? WHERE id = ?',
    ['ACTIVE', assignmentId]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Assignment',
    entityId: assignmentId,
    oldValues: { status: oldStatus },
    newValues: { status: 'ACTIVE' },
    changeReason: reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Assignment resumed successfully',
    data: { assignmentId, status: 'ACTIVE' }
  });
});

/**
 * End assignment (early termination)
 * POST /api/v1/admin/assignments/:assignmentId/end
 */
exports.endAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { reason, endDate } = req.body;

  if (!reason) {
    throw new ApiError('Reason for ending assignment is required', 400);
  }

  // Check assignment exists
  const [assignmentCheck] = await db.execute(
    'SELECT status, start_date FROM staff_assignments WHERE id = ?',
    [assignmentId]
  );

  if (assignmentCheck.length === 0) {
    throw new ApiError('Assignment not found', 404);
  }

  const oldStatus = assignmentCheck[0].status;

  if (oldStatus === 'ENDED') {
    throw new ApiError('Assignment is already ended', 400);
  }

  const finalEndDate = endDate ? new Date(endDate) : new Date();

  // Update status
  await db.execute(
    'UPDATE staff_assignments SET status = ?, end_date = ? WHERE id = ?',
    ['ENDED', finalEndDate, assignmentId]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Assignment',
    entityId: assignmentId,
    oldValues: { status: oldStatus },
    newValues: { status: 'ENDED', end_date: finalEndDate },
    changeReason: reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Assignment ended successfully',
    data: { assignmentId, status: 'ENDED', endDate: finalEndDate }
  });
});
