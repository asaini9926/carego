const db = require('../config/db');
const bcrypt = require('bcrypt');
const { asyncHandler, ApiError } = require('../utils/errors');
const { generateId, isValidPhone, isValidEmail } = require('../utils/validators');
const { logAction } = require('../services/auditService');
const { logInfo } = require('../utils/logger');

/**
 * GET /api/v1/admin/leads
 * Get all leads with filtering & pagination
 */
exports.getAllLeads = asyncHandler(async (req, res) => {
  const { status, type, cityId, page = 1, limit = 20 } = req.query;

  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND lead_status = ?';
    params.push(status);
  }

  if (type) {
    query += ' AND lead_type = ?';
    params.push(type);
  }

  if (cityId) {
    query += ' AND city_id = ?';
    params.push(cityId);
  }

  // Count total
  const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM (${query.replace('SELECT *', 'SELECT id')}) as t`, params);
  const total = countResult[0].total;

  // Pagination
  const offset = (page - 1) * limit;
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const [leads] = await db.execute(query, params);

  res.status(200).json({
    success: true,
    message: 'Leads fetched',
    data: {
      leads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * POST /api/v1/admin/leads/:id/convert
 * Convert lead to user
 */
exports.convertLead = asyncHandler(async (req, res) => {
  const { id: leadId } = req.params;
  const { userType, password, cityId, notes } = req.body;

  // Validate input
  if (!userType || !password || password.length < 6) {
    throw new ApiError('userType and password (min 6 chars) are required', 400);
  }

  // Get lead
  const [leads] = await db.execute('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (leads.length === 0) {
    throw new ApiError('Lead not found', 404);
  }

  const lead = leads[0];

  // Check if user exists
  const [existingUserswithPhone] = await db.execute('SELECT id FROM users WHERE phone = ?', [lead.phone]);
  if (existingUserswithPhone.length > 0) {
    throw new ApiError('User with this phone already exists', 409);
  }

  const [existingUserswithEmail] = await db.execute('SELECT id FROM users WHERE phone = ?', [lead.email]);
  if (existingUserswithEmail.length > 0) {
    throw new ApiError('User with this email already exists', 409);
  }  

  // Hash password
  const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || 12));

  // Create user
  const userId = generateId();
  await db.execute(
    `INSERT INTO users (id, phone, email, password_hash, user_type, account_status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, lead.phone, lead.email || null, passwordHash, userType, 'ACTIVE']
  );

  // Update lead status
  await db.execute('UPDATE leads SET lead_status = ?, converted_user_id = ? WHERE id = ?', ['CONVERTED', userId, leadId]);

  // Create profile
  if (userType === 'CLIENT') {
    await db.execute(
      `INSERT INTO client_profiles (user_id, organization_name, city_name, operational_city_id)
       VALUES (?, ?, ?, ?)`,
      [userId, lead.name, lead.city_name, cityId || null]
    );
  } else if (userType === 'STUDENT') {
    await db.execute(
      `INSERT INTO student_profiles (user_id, full_name) VALUES (?, ?)`,
      [userId, lead.name]
    );
  } else if (userType === 'STAFF') {
    await db.execute(
      `INSERT INTO staff_profiles (user_id, full_name, operational_city_id, verification_status)
       VALUES (?, ?, ?, ?)`,
      [userId, lead.name, cityId || null, 'PENDING']
    );
  }

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CONVERT',
    entityType: 'Lead',
    entityId: leadId,
    newValues: { userId, userType, phone: lead.phone },
    changeReason: notes || 'Lead converted to user',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  logInfo(`Lead ${leadId} converted to user ${userId} (${userType})`);

  res.status(201).json({
    success: true,
    message: 'Lead converted successfully',
    data: {
      userId,
      userType,
      phone: lead.phone
    }
  });
});