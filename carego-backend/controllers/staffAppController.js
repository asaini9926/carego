/**
 * Staff App Controller
 * Handles staff check-in/out, care logging, vitals submission
 * Phase 2: Care Operations (Staff perspective)
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');
const { generateId, isValidCoordinates } = require('../utils/validators');
const { logAction } = require('../services/auditService');

/**
 * Get today's assignments for staff
 * GET /api/v1/staff/assignments/today
 */
exports.getTodayAssignments = asyncHandler(async (req, res) => {
  const staffId = req.user.uid;
  const today = new Date().toISOString().split('T')[0];

  const [assignments] = await db.execute(
    `SELECT 
      sa.id, sa.patient_id, sa.shift, sa.start_date, sa.end_date, sa.status,
      p.name as patient_name, p.age, p.medical_condition,
      cp.contact_person, cp.contact_email, c.city_name
    FROM staff_assignments sa
    JOIN patients p ON sa.patient_id = p.id
    JOIN client_profiles cp ON p.client_id = cp.user_id
    JOIN staff_profiles sp ON sa.staff_id = sp.user_id
    JOIN cities c ON sp.city_id = c.id
    WHERE sa.staff_id = ? AND sa.status IN ('ACTIVE', 'PAUSED')
    AND DATE(sa.start_date) <= ? AND (sa.end_date IS NULL OR DATE(sa.end_date) >= ?)
    ORDER BY sa.shift ASC`,
    [staffId, today, today]
  );

  // Get check-in status for today
  const enriched = await Promise.all(assignments.map(async (assignment) => {
    const [checkins] = await db.execute(
      `SELECT check_in_time, check_out_time FROM attendance_logs 
       WHERE assignment_id = ? AND DATE(created_at) = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [assignment.id, today]
    );

    return {
      ...assignment,
      checkedIn: checkins.length > 0 && checkins[0].check_in_time ? true : false,
      checkedOut: checkins.length > 0 && checkins[0].check_out_time ? true : false,
      lastCheckIn: checkins[0]?.check_in_time || null
    };
  }));

  res.json({
    success: true,
    date: today,
    data: enriched
  });
});

/**
 * Check in for assignment
 * POST /api/v1/staff/attendance/check-in
 */
exports.checkIn = asyncHandler(async (req, res) => {
  const staffId = req.user.uid;
  const { assignmentId, latitude, longitude, notes } = req.body;

  // Validate input
  if (!assignmentId) {
    throw new ApiError('assignmentId is required', 400);
  }

  if (!latitude || !longitude) {
    throw new ApiError('latitude and longitude are required for check-in', 400);
  }

  if (!isValidCoordinates(latitude, longitude)) {
    throw new ApiError('Invalid coordinates', 400);
  }

  // Check assignment exists and belongs to staff
  const [assignmentCheck] = await db.execute(
    `SELECT sa.id, sa.status, sa.patient_id FROM staff_assignments sa
     WHERE sa.id = ? AND sa.staff_id = ? AND sa.status IN ('ACTIVE', 'PAUSED')`,
    [assignmentId, staffId]
  );

  if (assignmentCheck.length === 0) {
    throw new ApiError('Assignment not found or not assigned to you', 404);
  }

  if (assignmentCheck[0].status !== 'ACTIVE') {
    throw new ApiError(`Cannot check in for assignment with status: ${assignmentCheck[0].status}`, 400);
  }

  // Check for duplicate check-in today
  const today = new Date().toISOString().split('T')[0];
  const [duplicate] = await db.execute(
    `SELECT id FROM attendance_logs 
     WHERE assignment_id = ? AND DATE(created_at) = ? AND check_in_time IS NOT NULL`,
    [assignmentId, today]
  );

  if (duplicate.length > 0) {
    throw new ApiError('Already checked in today. Use check-out or contact admin.', 409);
  }

  // Create attendance log
  const logId = generateId();
  await db.execute(
    `INSERT INTO attendance_logs 
     (id, assignment_id, check_in_time, check_in_latitude, check_in_longitude, notes, created_at)
     VALUES (?, ?, NOW(), ?, ?, ?, NOW())`,
    [logId, assignmentId, latitude, longitude, notes || null]
  );

  // Log action (optional - depends on audit needs)
  await logAction({
    userId: staffId,
    userRole: 'STAFF',
    action: 'CREATE',
    entityType: 'AttendanceLog',
    entityId: logId,
    newValues: { assignment_id: assignmentId, check_in_latitude: latitude, check_in_longitude: longitude },
    changeReason: 'Staff check-in',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Checked in successfully',
    data: {
      logId,
      assignmentId,
      checkInTime: new Date(),
      location: { latitude, longitude }
    }
  });
});

/**
 * Check out from assignment
 * POST /api/v1/staff/attendance/check-out
 */
exports.checkOut = asyncHandler(async (req, res) => {
  const staffId = req.user.uid;
  const { assignmentId, latitude, longitude, notes } = req.body;

  // Validate input
  if (!assignmentId) {
    throw new ApiError('assignmentId is required', 400);
  }

  if (!latitude || !longitude) {
    throw new ApiError('latitude and longitude are required for check-out', 400);
  }

  if (!isValidCoordinates(latitude, longitude)) {
    throw new ApiError('Invalid coordinates', 400);
  }

  // Check assignment exists and belongs to staff
  const [assignmentCheck] = await db.execute(
    `SELECT sa.id, sa.status FROM staff_assignments sa
     WHERE sa.id = ? AND sa.staff_id = ?`,
    [assignmentId, staffId]
  );

  if (assignmentCheck.length === 0) {
    throw new ApiError('Assignment not found or not assigned to you', 404);
  }

  // Check for existing check-in today
  const today = new Date().toISOString().split('T')[0];
  const [checkin] = await db.execute(
    `SELECT id FROM attendance_logs 
     WHERE assignment_id = ? AND DATE(created_at) = ? AND check_in_time IS NOT NULL`,
    [assignmentId, today]
  );

  if (checkin.length === 0) {
    throw new ApiError('No check-in found for today. Check in first.', 400);
  }

  const logId = checkin[0].id;

  // Check for duplicate check-out
  const [duplicate] = await db.execute(
    `SELECT id FROM attendance_logs 
     WHERE assignment_id = ? AND DATE(created_at) = ? AND check_out_time IS NOT NULL`,
    [assignmentId, today]
  );

  if (duplicate.length > 0) {
    throw new ApiError('Already checked out today', 409);
  }

  // Update attendance log
  await db.execute(
    `UPDATE attendance_logs 
     SET check_out_time = NOW(), check_out_latitude = ?, check_out_longitude = ?
     WHERE id = ?`,
    [latitude, longitude, logId]
  );

  // Log action
  await logAction({
    userId: staffId,
    userRole: 'STAFF',
    action: 'UPDATE',
    entityType: 'AttendanceLog',
    entityId: logId,
    newValues: { check_out_latitude: latitude, check_out_longitude: longitude },
    changeReason: 'Staff check-out',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Checked out successfully',
    data: {
      logId,
      assignmentId,
      checkOutTime: new Date(),
      location: { latitude, longitude }
    }
  });
});

/**
 * Submit care log / notes for patient
 * POST /api/v1/staff/care-logs
 */
exports.submitCareLog = asyncHandler(async (req, res) => {
  const staffId = req.user.uid;
  const { assignmentId, patientId, notes, mood } = req.body;

  // Validate input
  if (!assignmentId || !patientId || !notes) {
    throw new ApiError('Missing required fields: assignmentId, patientId, notes', 400);
  }

  // Validate mood
  const validMoods = ['GOOD', 'FAIR', 'POOR', 'CRITICAL'];
  if (mood && !validMoods.includes(mood)) {
    throw new ApiError(`Invalid mood. Must be one of: ${validMoods.join(', ')}`, 400);
  }

  // Check assignment belongs to staff and patient
  const [assignmentCheck] = await db.execute(
    `SELECT id, patient_id FROM staff_assignments sa
     WHERE sa.id = ? AND sa.staff_id = ? AND sa.patient_id = ?`,
    [assignmentId, staffId, patientId]
  );

  if (assignmentCheck.length === 0) {
    throw new ApiError('Assignment not found or not assigned to this patient', 404);
  }

  // Create care log (immutable)
  const logId = generateId();
  await db.execute(
    `INSERT INTO care_logs (id, assignment_id, patient_id, notes, mood, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [logId, assignmentId, patientId, notes, mood || 'GOOD']
  );

  // Log action
  await logAction({
    userId: staffId,
    userRole: 'STAFF',
    action: 'CREATE',
    entityType: 'CareLog',
    entityId: logId,
    newValues: { assignment_id: assignmentId, patient_id: patientId, mood },
    changeReason: 'Care log submitted by staff',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Care log submitted successfully',
    data: {
      logId,
      assignmentId,
      patientId,
      notes,
      mood,
      submittedAt: new Date()
    }
  });
});

/**
 * Submit vitals for patient
 * POST /api/v1/staff/vitals
 */
exports.submitVitals = asyncHandler(async (req, res) => {
  const staffId = req.user.uid;
  const { assignmentId, patientId, bpSystolic, bpDiastolic, spo2, pulse, temperature, bloodSugar, notes } = req.body;

  // Validate input
  if (!assignmentId || !patientId) {
    throw new ApiError('Missing required fields: assignmentId, patientId', 400);
  }

  // Validate vitals if provided
  if (bpSystolic !== undefined && (bpSystolic < 50 || bpSystolic > 300)) {
    throw new ApiError('BP Systolic should be between 50-300', 400);
  }
  if (bpDiastolic !== undefined && (bpDiastolic < 30 || bpDiastolic > 200)) {
    throw new ApiError('BP Diastolic should be between 30-200', 400);
  }
  if (spo2 !== undefined && (spo2 < 70 || spo2 > 100)) {
    throw new ApiError('SpO2 should be between 70-100%', 400);
  }
  if (pulse !== undefined && (pulse < 30 || pulse > 200)) {
    throw new ApiError('Pulse should be between 30-200 bpm', 400);
  }
  if (temperature !== undefined && (temperature < 94 || temperature > 107)) {
    throw new ApiError('Temperature should be between 94-107°F', 400);
  }
  if (bloodSugar !== undefined && (bloodSugar < 40 || bloodSugar > 400)) {
    throw new ApiError('Blood sugar should be between 40-400 mg/dL', 400);
  }

  // Check assignment
  const [assignmentCheck] = await db.execute(
    `SELECT id FROM staff_assignments sa
     WHERE sa.id = ? AND sa.staff_id = ? AND sa.patient_id = ?`,
    [assignmentId, staffId, patientId]
  );

  if (assignmentCheck.length === 0) {
    throw new ApiError('Assignment not found or not assigned to this patient', 404);
  }

  // Create vitals log (immutable, append-only)
  const logId = generateId();
  await db.execute(
    `INSERT INTO vitals_logs 
     (id, assignment_id, patient_id, bp_systolic, bp_diastolic, spo2, pulse, temperature, blood_sugar, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      logId, assignmentId, patientId, bpSystolic || null, bpDiastolic || null,
      spo2 || null, pulse || null, temperature || null, bloodSugar || null, notes || null
    ]
  );

  // Log action
  await logAction({
    userId: staffId,
    userRole: 'STAFF',
    action: 'CREATE',
    entityType: 'VitalsLog',
    entityId: logId,
    newValues: { assignment_id: assignmentId, patient_id: patientId, bp: `${bpSystolic}/${bpDiastolic}`, spo2, pulse },
    changeReason: 'Vitals submitted by staff',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Vitals submitted successfully',
    data: {
      logId,
      assignmentId,
      patientId,
      vitals: {
        bp: `${bpSystolic}/${bpDiastolic}`,
        spo2,
        pulse,
        temperature,
        bloodSugar
      },
      submittedAt: new Date()
    }
  });
});

/**
 * Get past assignments (for profile/history)
 * GET /api/v1/staff/assignments/past?limit=20
 */
exports.getPastAssignments = asyncHandler(async (req, res) => {
  const staffId = req.user.uid;
  const { limit = 20 } = req.query;

  const [assignments] = await db.execute(
    `SELECT 
      sa.id, sa.patient_id, sa.shift, sa.start_date, sa.end_date, sa.status,
      p.name as patient_name, p.age, p.medical_condition,
      cp.contact_person,
      (SELECT COUNT(*) FROM care_logs WHERE assignment_id = sa.id) as care_logs_count,
      (SELECT COUNT(*) FROM vitals_logs WHERE assignment_id = sa.id) as vitals_count,
      (SELECT COUNT(*) FROM attendance_logs WHERE assignment_id = sa.id AND check_in_time IS NOT NULL) as days_worked
    FROM staff_assignments sa
    JOIN patients p ON sa.patient_id = p.id
    JOIN client_profiles cp ON p.client_id = cp.user_id
    WHERE sa.staff_id = ? AND sa.status IN ('ENDED', 'PAUSED')
    ORDER BY sa.end_date DESC LIMIT ?`,
    [staffId, parseInt(limit)]
  );

  res.json({
    success: true,
    data: assignments
  });
});
