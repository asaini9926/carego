/**
 * Client Management Controller (Admin)
 * Handles client creation, patient management
 * Phase 2: Care Operations
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');
const { generateId, isValidPhone } = require('../utils/validators');
const { logAction } = require('../services/auditService');
const bcrypt = require('bcrypt');

/**
 * Create a new client user (admin action)
 * POST /api/v1/admin/clients/create
 */
exports.createClient = asyncHandler(async (req, res) => {
  const { name, phone, email, cityId, organizationType, notes } = req.body;

  // Validate input
  if (!name || !phone || !cityId) {
    throw new ApiError('Missing required fields: name, phone, cityId', 400);
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

  // Create user (CLIENT type, status ACTIVE)
  const userId = generateId();
  const tempPassword = Math.random().toString(36).slice(-10);
  const passwordHash = await bcrypt.hash(tempPassword, parseInt(process.env.BCRYPT_ROUNDS || 12));

  await db.execute(
    `INSERT INTO users (id, phone, password_hash, user_type, account_status, is_active, created_at)
     VALUES (?, ?, ?, 'CLIENT', 'ACTIVE', TRUE, NOW())`,
    [userId, phone, passwordHash]
  );

  // Create client profile
  await db.execute(
    `INSERT INTO client_profiles (id, user_id, city_id, organization_type, contact_person, contact_email, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [generateId(), userId, cityId, organizationType || 'INDIVIDUAL', name, email || null, notes || null]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Client',
    entityId: userId,
    newValues: { name, phone, city_id: cityId, organization_type: organizationType },
    changeReason: notes || 'Client created via admin',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Client user created successfully',
    data: {
      clientId: userId,
      phone,
      status: 'ACTIVE',
      tempPassword,
      note: 'Password should be shared via SMS/email securely'
    }
  });
});

/**
 * Get all clients (with filtering)
 * GET /api/v1/admin/clients?cityId=xxx&page=1&limit=20
 */
exports.getAllClients = asyncHandler(async (req, res) => {
  const { cityId, page = 1, limit = 20, search } = req.query;

  let query = `
    SELECT 
      u.id, u.phone, u.account_status, u.created_at,
      cp.city_id, cp.organization_type, cp.contact_person, cp.contact_email,
      c.city_name,
      COUNT(DISTINCT pa.id) as patient_count
    FROM users u
    JOIN client_profiles cp ON u.id = cp.user_id
    JOIN cities c ON cp.city_id = c.id
    LEFT JOIN patients pa ON cp.user_id = pa.client_id
    WHERE u.user_type = 'CLIENT'
  `;

  const params = [];

  if (cityId) {
    query += ' AND cp.city_id = ?';
    params.push(cityId);
  }

  if (search) {
    query += ' AND (cp.contact_person LIKE ? OR u.phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' GROUP BY u.id ORDER BY u.created_at DESC';

  // Pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

  const [clientsList] = await db.execute(query, params);

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total FROM users u
    JOIN client_profiles cp ON u.id = cp.user_id
    WHERE u.user_type = 'CLIENT'
  `;

  const countParams = [];
  if (cityId) {
    countQuery += ' AND cp.city_id = ?';
    countParams.push(cityId);
  }
  if (search) {
    countQuery += ' AND (cp.contact_person LIKE ? OR u.phone LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }

  const [countResult] = await db.execute(countQuery, countParams);
  const total = countResult[0]?.total || 0;

  res.json({
    success: true,
    data: clientsList,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

/**
 * Get single client detail with patients
 * GET /api/v1/admin/clients/:clientId
 */
exports.getClientDetail = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  const [clientData] = await db.execute(
    `SELECT 
      u.id, u.phone, u.account_status, u.created_at,
      cp.city_id, cp.organization_type, cp.contact_person, cp.contact_email,
      c.city_name
    FROM users u
    JOIN client_profiles cp ON u.id = cp.user_id
    JOIN cities c ON cp.city_id = c.id
    WHERE u.id = ? AND u.user_type = 'CLIENT'`,
    [clientId]
  );

  if (clientData.length === 0) {
    throw new ApiError('Client not found', 404);
  }

  const client = clientData[0];

  // Get patients
  const [patients] = await db.execute(
    `SELECT 
      id, name, age, medical_condition, notes, created_at,
      (SELECT COUNT(*) FROM staff_assignments WHERE patient_id = patients.id AND status = 'ACTIVE') as active_staff_count
    FROM patients
    WHERE client_id = ?
    ORDER BY created_at DESC`,
    [clientId]
  );

  // Get active assignments
  const [assignments] = await db.execute(
    `SELECT COUNT(*) as count FROM staff_assignments sa
     JOIN patients p ON sa.patient_id = p.id
     WHERE p.client_id = ? AND sa.status = 'ACTIVE'`,
    [clientId]
  );

  res.json({
    success: true,
    data: {
      ...client,
      patients,
      activeAssignments: assignments[0]?.count || 0,
      totalPatients: patients.length
    }
  });
});

/**
 * Add patient to client
 * POST /api/v1/admin/clients/:clientId/patients
 */
exports.addPatient = asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { name, age, medicalCondition, notes } = req.body;

  // Validate input
  if (!name || !age) {
    throw new ApiError('Missing required fields: name, age', 400);
  }

  if (age < 0 || age > 150) {
    throw new ApiError('Invalid age value', 400);
  }

  // Check client exists
  const [clientCheck] = await db.execute(
    'SELECT id FROM users WHERE id = ? AND user_type = "CLIENT"',
    [clientId]
  );

  if (clientCheck.length === 0) {
    throw new ApiError('Client not found', 404);
  }

  // Create patient
  const patientId = generateId();
  await db.execute(
    `INSERT INTO patients (id, client_id, name, age, medical_condition, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [patientId, clientId, name, age, medicalCondition || null, notes || null]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Patient',
    entityId: patientId,
    newValues: { client_id: clientId, name, age, medical_condition: medicalCondition },
    changeReason: 'Patient added by admin',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Patient added successfully',
    data: {
      patientId,
      clientId,
      name,
      age,
      medicalCondition
    }
  });
});

/**
 * Get all patients for a client
 * GET /api/v1/admin/clients/:clientId/patients
 */
exports.getClientPatients = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  // Check client exists
  const [clientCheck] = await db.execute(
    'SELECT id FROM users WHERE id = ? AND user_type = "CLIENT"',
    [clientId]
  );

  if (clientCheck.length === 0) {
    throw new ApiError('Client not found', 404);
  }

  const [patients] = await db.execute(
    `SELECT 
      id, name, age, medical_condition, notes, created_at,
      (SELECT COUNT(*) FROM staff_assignments WHERE patient_id = patients.id AND status = 'ACTIVE') as active_staff_count,
      (SELECT COUNT(*) FROM staff_assignments WHERE patient_id = patients.id) as total_assignments
    FROM patients
    WHERE client_id = ?
    ORDER BY created_at DESC`,
    [clientId]
  );

  res.json({
    success: true,
    data: patients
  });
});

/**
 * Update patient details
 * PATCH /api/v1/admin/clients/:clientId/patients/:patientId
 */
exports.updatePatient = asyncHandler(async (req, res) => {
  const { clientId, patientId } = req.params;
  const { name, age, medicalCondition, notes } = req.body;

  // Check patient exists and belongs to client
  const [patientCheck] = await db.execute(
    'SELECT * FROM patients WHERE id = ? AND client_id = ?',
    [patientId, clientId]
  );

  if (patientCheck.length === 0) {
    throw new ApiError('Patient not found', 404);
  }

  const oldData = patientCheck[0];

  // Update fields
  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (age !== undefined) {
    if (age < 0 || age > 150) {
      throw new ApiError('Invalid age value', 400);
    }
    updates.push('age = ?');
    values.push(age);
  }
  if (medicalCondition !== undefined) {
    updates.push('medical_condition = ?');
    values.push(medicalCondition);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes);
  }

  if (updates.length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  values.push(patientId);
  await db.execute(
    `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Patient',
    entityId: patientId,
    oldValues: { name: oldData.name, age: oldData.age, medical_condition: oldData.medical_condition },
    newValues: { name, age, medical_condition: medicalCondition },
    changeReason: 'Patient details updated',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Patient updated successfully',
    data: { patientId }
  });
});
