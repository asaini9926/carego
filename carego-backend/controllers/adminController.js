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

/**
 * GET /api/v1/admin/stats
 * Dashboard statistics
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  // 1. Leads Count (Total, Converted, Pending)
  const [leadCounts] = await db.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN lead_status = 'CONVERTED' THEN 1 ELSE 0 END) as converted,
      SUM(CASE WHEN lead_status = 'NEW' THEN 1 ELSE 0 END) as pending
    FROM leads
  `);

  // 2. Today's Leads
  const [todayLeads] = await db.execute(`
    SELECT COUNT(*) as count FROM leads 
    WHERE created_at >= CURDATE()
  `);

  // 3. Leads Graph (This Month - Grouped by Day)
  const [leadsByDay] = await db.execute(`
    SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count
    FROM leads
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
    ORDER BY date ASC
  `);

  // 4. Leads Graph (This Year - Grouped by Month)
  const [leadsByMonth] = await db.execute(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
    FROM leads
    WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-01-01')
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month ASC
  `);

  res.status(200).json({
    success: true,
    data: {
      leads: {
        total: leadCounts[0].total,
        converted: leadCounts[0].converted,
        pending: leadCounts[0].pending,
        today: todayLeads[0].count
      },
      graphs: {
        daily: leadsByDay,
        monthly: leadsByMonth
      }
    }
  });
});

/**
 * POST /api/v1/admin/cities
 * Create a new city
 */
exports.createCity = asyncHandler(async (req, res) => {
  const { name, state, latitude, longitude, isActive = true } = req.body;

  if (!name || !state) {
    throw new ApiError('Name and state are required', 400);
  }

  const id = generateId(); 
  // Assuming 'generateId' creates a string like 'city-...' or just a UUID. 
  // If your validator utils generate specific IDs, use that. 
  // For safety, let's assume simple ID or UUID.
  
  await db.execute(
    `INSERT INTO cities (id, name, state, latitude, longitude, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, state, latitude || null, longitude || null, isActive]
  );

  res.status(201).json({
    success: true,
    message: 'City created',
    data: { id, name, state }
  });
});

/**
 * PUT /api/v1/admin/cities/:id
 * Update city details
 */
exports.updateCity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, state, latitude, longitude, isActive } = req.body;

  await db.execute(
    `UPDATE cities 
     SET name = COALESCE(?, name), 
         state = COALESCE(?, state), 
         latitude = COALESCE(?, latitude), 
         longitude = COALESCE(?, longitude), 
         is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [name, state, latitude, longitude, isActive, id]
  );

  res.status(200).json({
    success: true,
    message: 'City updated'
  });
});

/**
 * DELETE /api/v1/admin/cities/:id
 * Delete city (Soft delete or check dependencies)
 */
exports.deleteCity = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check dependencies (e.g., services, leads linked to this city)
  // Simply setting is_active to FALSE is safer than DELETE
  // But if strictly DELETE requested:
  
  try {
     await db.execute('DELETE FROM cities WHERE id = ?', [id]);
  } catch (error) {
     if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ApiError('City cannot be deleted as it is being used.', 400);
     }
     throw error;
  }

  res.status(200).json({
    success: true,
    message: 'City deleted'
  });
});

/**
 * POST /api/v1/admin/services
 * Create a new service
 */
exports.createService = asyncHandler(async (req, res) => {
  const { title, slug, shortDescription, longDescription, priceMin, priceMax, cityId, isActive = true } = req.body;

  if (!title || !slug || !cityId) {
    throw new ApiError('Title, slug, and cityId are required', 400);
  }

  const id = generateId();

  await db.execute(
    `INSERT INTO services 
     (id, title, slug, short_description, long_description, price_range_min, price_range_max, city_id, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, title, slug, shortDescription, longDescription, priceMin, priceMax, cityId, isActive]
  );

  res.status(201).json({
    success: true,
    message: 'Service created',
    data: { id, title }
  });
});

/**
 * PUT /api/v1/admin/services/:id
 * Update service
 */
exports.updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, slug, shortDescription, longDescription, priceMin, priceMax, cityId, isActive } = req.body;

  await db.execute(
    `UPDATE services 
     SET title = COALESCE(?, title), 
         slug = COALESCE(?, slug), 
         short_description = COALESCE(?, short_description), 
         long_description = COALESCE(?, long_description), 
         price_range_min = COALESCE(?, price_range_min), 
         price_range_max = COALESCE(?, price_range_max), 
         city_id = COALESCE(?, city_id), 
         is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [title, slug, shortDescription, longDescription, priceMin, priceMax, cityId, isActive, id]
  );

  res.status(200).json({
    success: true,
    message: 'Service updated'
  });
});

/**
 * DELETE /api/v1/admin/services/:id
 * Delete service
 */
exports.deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await db.execute('DELETE FROM services WHERE id = ?', [id]);

  res.status(200).json({
    success: true,
    message: 'Service deleted'
  });
});
