/**
 * Staff Management Controller (Admin)
 * Handles staff creation, verification, suspension, and termination
 * Phase 2: Care Operations
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');
const { generateId, isValidPhone } = require('../utils/validators');
const { logAction } = require('../services/auditService');
const bcrypt = require('bcrypt');

/**
 * Create a new staff user (admin action)
 * POST /api/v1/admin/staff/create
 */
exports.createStaff = asyncHandler(async (req, res) => {
  const { name, phone, email, cityId, specialization, qualification, notes } = req.body;

  // Validate input
  if (!name || !phone || !cityId || !specialization) {
    throw new ApiError('Missing required fields: name, phone, cityId, specialization', 400);
  }

  if (!isValidPhone(phone)) {
    throw new ApiError('Invalid phone number format', 400);
  }

  // Check phone not already used
  const [existingUser] = await db.execute(
    'SELECT id FROM users WHERE phone = ?',
    [phone]
  );

  if (existingUser.length > 0) {
    throw new ApiError('Phone number already registered', 409);
  }

  // Check city exists
  const [cityCheck] = await db.execute(
    'SELECT id FROM cities WHERE id = ?',
    [cityId]
  );

  if (cityCheck.length === 0) {
    throw new ApiError('City not found', 404);
  }

  // Create user (STAFF type, status UNVERIFIED)
  const userId = generateId();
  const tempPassword = Math.random().toString(36).slice(-10);
  const passwordHash = await bcrypt.hash(tempPassword, parseInt(process.env.BCRYPT_ROUNDS || 12));

  await db.execute(
    `INSERT INTO users (id, phone, password_hash, user_type, account_status, is_active, created_at)
     VALUES (?, ?, ?, 'STAFF', 'UNVERIFIED', TRUE, NOW())`,
    [userId, phone, passwordHash]
  );

  // Create staff profile
  await db.execute(
    `INSERT INTO staff_profiles (id, user_id, city_id, specialization, qualification, notes, verification_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'UNVERIFIED', NOW())`,
    [generateId(), userId, cityId, specialization, qualification || null, notes || null]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Staff',
    entityId: userId,
    newValues: { name, phone, city_id: cityId, specialization, status: 'UNVERIFIED' },
    changeReason: notes || 'Staff created via admin',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Staff user created successfully',
    data: {
      staffId: userId,
      phone,
      status: 'UNVERIFIED',
      tempPassword, // Should be sent via SMS/email separately
      note: 'Password should be shared via SMS/email securely'
    }
  });
});

/**
 * Get all staff (with filtering)
 * GET /api/v1/admin/staff?cityId=xxx&status=VERIFIED&specialization=xxx&page=1&limit=20
 */
exports.getAllStaff = asyncHandler(async (req, res) => {
  const { cityId, status, specialization, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT 
      u.id, u.phone, u.account_status, u.created_at,
      sp.city_id, sp.specialization, sp.qualification, sp.verification_status,
      c.city_name
    FROM users u
    JOIN staff_profiles sp ON u.id = sp.user_id
    JOIN cities c ON sp.city_id = c.id
    WHERE u.user_type = 'STAFF'
  `;

  const params = [];

  if (cityId) {
    query += ' AND sp.city_id = ?';
    params.push(cityId);
  }

  if (status) {
    query += ' AND sp.verification_status = ?';
    params.push(status);
  }

  if (specialization) {
    query += ' AND sp.specialization = ?';
    params.push(specialization);
  }

  query += ' ORDER BY u.created_at DESC';

  // Pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

  const [staffList] = await db.execute(query, params);

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total FROM users u
    JOIN staff_profiles sp ON u.id = sp.user_id
    WHERE u.user_type = 'STAFF'
  `;

  const countParams = [];
  if (cityId) {
    countQuery += ' AND sp.city_id = ?';
    countParams.push(cityId);
  }
  if (status) {
    countQuery += ' AND sp.verification_status = ?';
    countParams.push(status);
  }
  if (specialization) {
    countQuery += ' AND sp.specialization = ?';
    countParams.push(specialization);
  }

  const [countResult] = await db.execute(countQuery, countParams);
  const total = countResult[0]?.total || 0;

  res.json({
    success: true,
    data: staffList,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

/**
 * Get single staff detail
 * GET /api/v1/admin/staff/:staffId
 */
exports.getStaffDetail = asyncHandler(async (req, res) => {
  const { staffId } = req.params;

  const [staffData] = await db.execute(
    `SELECT 
      u.id, u.phone, u.account_status, u.created_at,
      sp.city_id, sp.specialization, sp.qualification, sp.verification_status, sp.notes,
      c.city_name
    FROM users u
    JOIN staff_profiles sp ON u.id = sp.user_id
    JOIN cities c ON sp.city_id = c.id
    WHERE u.id = ? AND u.user_type = 'STAFF'`,
    [staffId]
  );

  if (staffData.length === 0) {
    throw new ApiError('Staff not found', 404);
  }

  const staff = staffData[0];

  // Get active assignments count
  const [assignments] = await db.execute(
    `SELECT COUNT(*) as count FROM staff_assignments 
     WHERE staff_id = ? AND status = 'ACTIVE'`,
    [staffId]
  );

  // Get recent care logs
  const [careLogs] = await db.execute(
    `SELECT sl.id, sl.patient_id, sl.created_at, sl.notes
     FROM staff_assignments sa
     JOIN care_logs sl ON sa.id = sa.id
     WHERE sa.staff_id = ?
     ORDER BY sl.created_at DESC LIMIT 5`,
    [staffId]
  );

  res.json({
    success: true,
    data: {
      ...staff,
      activeAssignments: assignments[0]?.count || 0,
      recentLogs: careLogs
    }
  });
});

/**
 * Verify staff (mark as VERIFIED)
 * POST /api/v1/admin/staff/:staffId/verify
 */
exports.verifyStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new ApiError('Reason for verification is required', 400);
  }

  // Check staff exists
  const [staffCheck] = await db.execute(
    `SELECT * FROM users WHERE id = ? AND user_type = 'STAFF'`,
    [staffId]
  );

  if (staffCheck.length === 0) {
    throw new ApiError('Staff not found', 404);
  }

  // Update verification status
  await db.execute(
    `UPDATE staff_profiles 
     SET verification_status = 'VERIFIED', verified_at = NOW()
     WHERE user_id = ?`,
    [staffId]
  );

  // Update user account status
  await db.execute(
    `UPDATE users SET account_status = 'ACTIVE' WHERE id = ?`,
    [staffId]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Staff',
    entityId: staffId,
    oldValues: { verification_status: 'UNVERIFIED', account_status: 'UNVERIFIED' },
    newValues: { verification_status: 'VERIFIED', account_status: 'ACTIVE' },
    changeReason: reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Staff verified successfully',
    data: { staffId, status: 'VERIFIED' }
  });
});

/**
 * Suspend staff (temporary deactivation)
 * POST /api/v1/admin/staff/:staffId/suspend
 */
exports.suspendStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new ApiError('Reason for suspension is required', 400);
  }

  // Check staff exists
  const [staffCheck] = await db.execute(
    `SELECT account_status FROM users WHERE id = ? AND user_type = 'STAFF'`,
    [staffId]
  );

  if (staffCheck.length === 0) {
    throw new ApiError('Staff not found', 404);
  }

  const oldStatus = staffCheck[0].account_status;

  if (oldStatus === 'SUSPENDED') {
    throw new ApiError('Staff is already suspended', 400);
  }

  // Update status
  await db.execute(
    `UPDATE users SET account_status = 'SUSPENDED' WHERE id = ?`,
    [staffId]
  );

  // Deactivate active assignments
  await db.execute(
    `UPDATE staff_assignments SET status = 'PAUSED' WHERE staff_id = ? AND status = 'ACTIVE'`,
    [staffId]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Staff',
    entityId: staffId,
    oldValues: { account_status: oldStatus },
    newValues: { account_status: 'SUSPENDED' },
    changeReason: reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Staff suspended successfully',
    data: { staffId, status: 'SUSPENDED' }
  });
});

/**
 * Terminate staff (permanent)
 * POST /api/v1/admin/staff/:staffId/terminate
 */
exports.terminateStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { reason, finalPayment } = req.body;

  if (!reason) {
    throw new ApiError('Reason for termination is required', 400);
  }

  // Check staff exists
  const [staffCheck] = await db.execute(
    `SELECT account_status FROM users WHERE id = ? AND user_type = 'STAFF'`,
    [staffId]
  );

  if (staffCheck.length === 0) {
    throw new ApiError('Staff not found', 404);
  }

  const oldStatus = staffCheck[0].account_status;

  if (oldStatus === 'TERMINATED') {
    throw new ApiError('Staff is already terminated', 400);
  }

  // Update status
  await db.execute(
    `UPDATE users SET account_status = 'TERMINATED', is_active = FALSE WHERE id = ?`,
    [staffId]
  );

  // Deactivate all assignments
  await db.execute(
    `UPDATE staff_assignments SET status = 'ENDED' WHERE staff_id = ?`,
    [staffId]
  );

  // Log action with termination details
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'DELETE',
    entityType: 'Staff',
    entityId: staffId,
    oldValues: { account_status: oldStatus, is_active: true },
    newValues: { account_status: 'TERMINATED', is_active: false },
    changeReason: reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Staff terminated successfully',
    data: {
      staffId,
      status: 'TERMINATED',
      finalPaymentRequired: finalPayment || 'Pending calculation'
    }
  });
});
