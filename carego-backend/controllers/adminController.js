const db = require('../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// @desc    Get All Leads (With Filters)
// @route   GET /api/v1/admin/leads
exports.getAllLeads = async (req, res, next) => {
  try {
    const { status, city_name, search } = req.query;

    let sql = `
      SELECT l.*, s.title AS service_name
      FROM leads l
      LEFT JOIN services s
        ON l.service_interest_id COLLATE utf8mb4_unicode_ci
           = s.id COLLATE utf8mb4_unicode_ci
      WHERE 1=1
    `;

    const params = [];

    // Filters
    if (status) {
      sql += " AND l.status = ?";
      params.push(status);
    }

    if (city_name) {
      sql += " AND l.city_name = ?";
      params.push(city_name);
    }

    if (search) {
      sql += " AND (l.name LIKE ? OR l.phone LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY l.created_at DESC LIMIT 100";

    console.log("SQL:", sql);

    const [leads] = await db.execute(sql, params);

    res.json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Convert Lead to Client (The "Magic Button")
// @route   POST /api/v1/admin/leads/:id/convert
exports.convertLead = async (req, res, next) => {
  const connection = await db.getConnection(); // Get dedicated connection for transaction
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { operational_city_id } = req.body; // Admin must select which city this client belongs to

    // 1. Fetch Lead Data
    const [leads] = await connection.execute('SELECT * FROM leads WHERE id = ?', [id]);
    if (leads.length === 0) throw new Error('Lead not found');
    const lead = leads[0];

    if (lead.status === 'CONVERTED') throw new Error('Lead is already converted');

    // 2. Check if User already exists (by phone)
    const [existingUsers] = await connection.execute('SELECT id FROM users WHERE phone = ?', [lead.phone]);
    let userId;

    if (existingUsers.length > 0) {
      // User exists -> Link to existing user
      userId = existingUsers[0].id;
    } else {
      // Create New User
      userId = uuidv4();
      const tempPassword = Math.random().toString(36).slice(-8); // Generate random password
      const hash = await bcrypt.hash(tempPassword, 10);

      await connection.execute(
        `INSERT INTO users (id, phone, email, password_hash, role) VALUES (?, ?, ?, ?, 'CLIENT')`,
        [userId, lead.phone, lead.email, hash]
      );
      
      // TODO: Send SMS with tempPassword to user
      console.log(`[SIMULATION] SMS sent to ${lead.phone}: Password is ${tempPassword}`);
    }

    // 3. Create Client Profile (Copying address data from Lead)
    await connection.execute(
      `INSERT INTO client_profiles (
        user_id, address_text, city_name, state_name, pincode, 
        latitude, longitude, google_map_link, operational_city_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE updated_at = NOW()`, // Handle case where profile exists
      [
        userId, lead.address_text, lead.city_name, lead.state_name, lead.pincode,
        lead.latitude, lead.longitude, lead.google_map_link, operational_city_id
      ]
    );

    // 4. Update Lead Status
    await connection.execute('UPDATE leads SET status = "CONVERTED" WHERE id = ?', [id]);

    // 5. Audit Log
    await connection.execute(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, "LEAD_CONVERTED", ?)',
      [req.user.id, JSON.stringify({ leadId: id, newUserId: userId })]
    );

    await connection.commit();

    res.json({ success: true, message: 'Lead converted and User created successfully!', userId });

  } catch (error) {
    await connection.rollback(); // Undo everything if error
    next(error);
  } finally {
    connection.release();
  }
};