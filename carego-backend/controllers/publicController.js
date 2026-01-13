const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// @desc    Get All Active Cities (For Dropdowns)
// @route   GET /api/v1/public/cities
exports.getCities = async (req, res, next) => {
  try {
    const [cities] = await db.execute(
      'SELECT id, name, state FROM cities WHERE is_active = TRUE ORDER BY name ASC'
    );
    res.json({ success: true, data: cities });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Active Services (For Service Page/Dropdowns)
// @route   GET /api/v1/public/services
exports.getServices = async (req, res, next) => {
  try {
    const [services] = await db.execute(
      'SELECT id, title, slug, price_range, short_description FROM services WHERE is_active = TRUE'
    );
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a New Lead
// @route   POST /api/v1/public/leads
exports.createLead = async (req, res, next) => {
  try {
    const {
      type, name, phone, email,
      address_text, city_name, state_name, pincode,
      latitude, longitude, google_map_link,
      service_city_id, service_interest_id, source
    } = req.body;

    const leadId = uuidv4();

    // Insert into DB
    const sql = `
      INSERT INTO leads (
        id, type, name, phone, email,
        address_text, city_name, state_name, pincode,
        latitude, longitude, google_map_link,
        service_city_id, service_interest_id, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      leadId, type || 'SERVICE', name, phone, email || null,
      address_text || null, city_name || null, state_name || null, pincode || null,
      latitude || null, longitude || null, google_map_link || null,
      service_city_id || null, service_interest_id || null, source || 'website'
    ];

    await db.execute(sql, values);

    // TODO: Send SMS/Email notification to Admin here

    res.status(201).json({
      success: true,
      message: 'Request received successfully!',
      leadId: leadId
    });

  } catch (error) {
    next(error);
  }
};