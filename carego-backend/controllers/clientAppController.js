/**
 * Client App Controller
 * Handles client viewing care data, assignments, vitals
 * Phase 2: Care Operations (Client perspective)
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');

/**
 * Get client's own profile
 * GET /api/v1/client/profile
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const clientId = req.user.uid;

  const [clientData] = await db.execute(
    `SELECT 
      u.id, u.phone, u.account_status, u.created_at,
      cp.city_id, cp.organization_type, cp.contact_person, cp.contact_email,
      c.city_name,
      (SELECT COUNT(*) FROM patients WHERE client_id = ?) as total_patients,
      (SELECT COUNT(*) FROM staff_assignments sa 
       JOIN patients p ON sa.patient_id = p.id 
       WHERE p.client_id = ? AND sa.status = 'ACTIVE') as active_assignments
    FROM users u
    JOIN client_profiles cp ON u.id = cp.user_id
    JOIN cities c ON cp.city_id = c.id
    WHERE u.id = ?`,
    [clientId, clientId, clientId]
  );

  if (clientData.length === 0) {
    throw new ApiError('Client profile not found', 404);
  }

  res.json({
    success: true,
    data: clientData[0]
  });
});

/**
 * Get all patients under this client
 * GET /api/v1/client/patients
 */
exports.getPatients = asyncHandler(async (req, res) => {
  const clientId = req.user.uid;

  const [patients] = await db.execute(
    `SELECT 
      p.id, p.name, p.age, p.medical_condition, p.created_at,
      (SELECT COUNT(*) FROM staff_assignments WHERE patient_id = p.id AND status = 'ACTIVE') as active_staff,
      (SELECT COUNT(*) FROM care_logs WHERE patient_id = p.id) as total_care_logs,
      (SELECT COUNT(*) FROM vitals_logs WHERE patient_id = p.id) as total_vitals
    FROM patients p
    WHERE p.client_id = ?
    ORDER BY p.created_at DESC`,
    [clientId]
  );

  res.json({
    success: true,
    data: patients
  });
});

/**
 * Get single patient details
 * GET /api/v1/client/patients/:patientId
 */
exports.getPatientDetail = asyncHandler(async (req, res) => {
  const clientId = req.user.uid;
  const { patientId } = req.params;

  // Check patient belongs to client
  const [patientData] = await db.execute(
    `SELECT 
      id, name, age, medical_condition, notes, created_at
    FROM patients
    WHERE id = ? AND client_id = ?`,
    [patientId, clientId]
  );

  if (patientData.length === 0) {
    throw new ApiError('Patient not found', 404);
  }

  const patient = patientData[0];

  // Get active assignments
  const [assignments] = await db.execute(
    `SELECT 
      sa.id, sa.staff_id, sa.shift, sa.start_date, sa.end_date, sa.status,
      u.phone as staff_phone,
      sp.specialization
    FROM staff_assignments sa
    JOIN users u ON sa.staff_id = u.id
    JOIN staff_profiles sp ON u.id = sp.user_id
    WHERE sa.patient_id = ? AND sa.status IN ('ACTIVE', 'PAUSED')
    ORDER BY sa.start_date DESC`,
    [patientId]
  );

  res.json({
    success: true,
    data: {
      ...patient,
      currentStaff: assignments
    }
  });
});

/**
 * Get care logs for patient (read-only for client)
 * GET /api/v1/client/patients/:patientId/care-logs?limit=20&offset=0
 */
exports.getCareLogs = asyncHandler(async (req, res) => {
  const clientId = req.user.uid;
  const { patientId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  // Check patient belongs to client
  const [patientCheck] = await db.execute(
    'SELECT client_id FROM patients WHERE id = ? AND client_id = ?',
    [patientId, clientId]
  );

  if (patientCheck.length === 0) {
    throw new ApiError('Patient not found', 404);
  }

  // Get care logs
  const [careLogs] = await db.execute(
    `SELECT 
      cl.id, cl.assignment_id, cl.notes, cl.mood, cl.created_at,
      u.phone as staff_phone,
      sp.specialization
    FROM care_logs cl
    JOIN staff_assignments sa ON cl.assignment_id = sa.id
    JOIN users u ON sa.staff_id = u.id
    JOIN staff_profiles sp ON u.id = sp.user_id
    WHERE cl.patient_id = ?
    ORDER BY cl.created_at DESC
    LIMIT ? OFFSET ?`,
    [patientId, parseInt(limit), parseInt(offset)]
  );

  // Get total count
  const [countResult] = await db.execute(
    'SELECT COUNT(*) as total FROM care_logs WHERE patient_id = ?',
    [patientId]
  );

  const total = countResult[0]?.total || 0;

  res.json({
    success: true,
    data: careLogs,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total,
      hasMore: (parseInt(offset) + parseInt(limit)) < total
    }
  });
});

/**
 * Get vitals timeline for patient (read-only for client)
 * GET /api/v1/client/patients/:patientId/vitals?limit=30
 */
exports.getVitals = asyncHandler(async (req, res) => {
  const clientId = req.user.uid;
  const { patientId } = req.params;
  const { limit = 30 } = req.query;

  // Check patient belongs to client
  const [patientCheck] = await db.execute(
    'SELECT client_id FROM patients WHERE id = ? AND client_id = ?',
    [patientId, clientId]
  );

  if (patientCheck.length === 0) {
    throw new ApiError('Patient not found', 404);
  }

  // Get vitals logs
  const [vitals] = await db.execute(
    `SELECT 
      id, assignment_id, bp_systolic, bp_diastolic, spo2, pulse, temperature, blood_sugar, notes, created_at,
      (SELECT u.phone FROM staff_assignments sa JOIN users u ON sa.staff_id = u.id WHERE sa.id = vitals_logs.assignment_id) as staff_phone
    FROM vitals_logs
    WHERE patient_id = ?
    ORDER BY created_at DESC
    LIMIT ?`,
    [patientId, parseInt(limit)]
  );

  // Format for easy graphing
  const formatted = vitals.map(v => ({
    id: v.id,
    date: v.created_at,
    bp: v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : null,
    spo2: v.spo2,
    pulse: v.pulse,
    temperature: v.temperature,
    bloodSugar: v.blood_sugar,
    staffPhone: v.staff_phone,
    notes: v.notes
  }));

  res.json({
    success: true,
    data: formatted,
    metadata: {
      total: vitals.length,
      latestVitals: formatted[0] || null
    }
  });
});

/**
 * Get assignments (current and past) for patient
 * GET /api/v1/client/patients/:patientId/assignments?status=ACTIVE
 */
exports.getAssignments = asyncHandler(async (req, res) => {
  const clientId = req.user.uid;
  const { patientId } = req.params;
  const { status } = req.query;

  // Check patient belongs to client
  const [patientCheck] = await db.execute(
    'SELECT client_id FROM patients WHERE id = ? AND client_id = ?',
    [patientId, clientId]
  );

  if (patientCheck.length === 0) {
    throw new ApiError('Patient not found', 404);
  }

  let query = `
    SELECT 
      sa.id, sa.staff_id, sa.shift, sa.start_date, sa.end_date, sa.status,
      u.phone as staff_phone,
      sp.specialization,
      (SELECT COUNT(*) FROM attendance_logs WHERE assignment_id = sa.id AND check_in_time IS NOT NULL) as days_worked,
      (SELECT COUNT(*) FROM care_logs WHERE assignment_id = sa.id) as care_logs_count
    FROM staff_assignments sa
    JOIN users u ON sa.staff_id = u.id
    JOIN staff_profiles sp ON u.id = sp.user_id
    WHERE sa.patient_id = ?
  `;

  const params = [patientId];

  if (status) {
    query += ' AND sa.status = ?';
    params.push(status);
  }

  query += ' ORDER BY sa.start_date DESC';

  const [assignments] = await db.execute(query, params);

  res.json({
    success: true,
    data: assignments
  });
});

/**
 * Get daily summary of care activities for patient
 * GET /api/v1/client/patients/:patientId/daily-summary?date=2026-01-16
 */
exports.getDailySummary = asyncHandler(async (req, res) => {
  const clientId = req.user.uid;
  const { patientId } = req.params;
  const { date } = req.query;

  if (!date) {
    throw new ApiError('date parameter is required (format: YYYY-MM-DD)', 400);
  }

  // Check patient belongs to client
  const [patientCheck] = await db.execute(
    'SELECT client_id FROM patients WHERE id = ? AND client_id = ?',
    [patientId, clientId]
  );

  if (patientCheck.length === 0) {
    throw new ApiError('Patient not found', 404);
  }

  // Get attendance for the day
  const [attendance] = await db.execute(
    `SELECT 
      al.id, al.check_in_time, al.check_out_time,
      u.phone as staff_phone,
      sp.specialization
    FROM attendance_logs al
    JOIN staff_assignments sa ON al.assignment_id = sa.id
    JOIN users u ON sa.staff_id = u.id
    JOIN staff_profiles sp ON u.id = sp.user_id
    WHERE sa.patient_id = ? AND DATE(al.created_at) = ?
    ORDER BY al.created_at ASC`,
    [patientId, date]
  );

  // Get care logs for the day
  const [careLogs] = await db.execute(
    `SELECT 
      cl.id, cl.notes, cl.mood, cl.created_at,
      u.phone as staff_phone
    FROM care_logs cl
    JOIN staff_assignments sa ON cl.assignment_id = sa.id
    JOIN users u ON sa.staff_id = u.id
    WHERE cl.patient_id = ? AND DATE(cl.created_at) = ?
    ORDER BY cl.created_at ASC`,
    [patientId, date]
  );

  // Get vitals for the day
  const [vitals] = await db.execute(
    `SELECT 
      id, bp_systolic, bp_diastolic, spo2, pulse, temperature, blood_sugar, created_at,
      (SELECT u.phone FROM staff_assignments sa JOIN users u ON sa.staff_id = u.id WHERE sa.id = vitals_logs.assignment_id) as staff_phone
    FROM vitals_logs
    WHERE patient_id = ? AND DATE(created_at) = ?
    ORDER BY created_at ASC`,
    [patientId, date]
  );

  res.json({
    success: true,
    date,
    summary: {
      staffPresent: attendance.length > 0 ? attendance.map(a => a.staff_phone) : [],
      checkInTime: attendance[0]?.check_in_time || null,
      checkOutTime: attendance[attendance.length - 1]?.check_out_time || null,
      careLogsCount: careLogs.length,
      vitalsRecorded: vitals.length
    },
    data: {
      attendance,
      careLogs,
      vitals
    }
  });
});
