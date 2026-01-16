const db = require('../config/db');
const { asyncHandler, ApiError } = require('../utils/errors');
const { isValidPhone, isValidEmail, isValidPincode, generateId } = require('../utils/validators');
const { logInfo } = require('../utils/logger');

/**
 * GET /api/v1/public/cities
 * Get all active cities (cached 24 hours on frontend)
 */
exports.getCities = asyncHandler(async (req, res) => {
  const [cities] = await db.execute(
    'SELECT id, name, state, latitude, longitude FROM cities WHERE is_active = TRUE ORDER BY name'
  );

  res.status(200).json({
    success: true,
    message: 'Cities fetched',
    data: cities
  });
});

/**
 * GET /api/v1/public/services?cityId=uuid
 * Get services for a specific city
 */
exports.getServices = asyncHandler(async (req, res) => {
  const { cityId } = req.query;

  if (!cityId) {
    throw new ApiError('cityId query parameter required', 400);
  }

  const [services] = await db.execute(
    `SELECT id, title, slug, short_description, price_range_min, price_range_max 
     FROM services 
     WHERE city_id = ? AND is_active = TRUE 
     ORDER BY title`,
    [cityId]
  );

  res.status(200).json({
    success: true,
    message: 'Services fetched',
    data: services
  });
});

/**
 * GET /api/v1/public/services/:slug
 * Get service detail by slug
 */
exports.getServiceDetail = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const [services] = await db.execute(
    `SELECT id, title, slug, short_description, long_description, price_range_min, price_range_max 
     FROM services 
     WHERE slug = ? AND is_active = TRUE`,
    [slug]
  );

  if (services.length === 0) {
    throw new ApiError('Service not found', 404);
  }

  const service = services[0];

  // Get service sections
  const [sections] = await db.execute(
    `SELECT title, content, sort_order FROM service_sections 
     WHERE service_id = ? 
     ORDER BY sort_order`,
    [service.id]
  );

  res.status(200).json({
    success: true,
    message: 'Service detail fetched',
    data: {
      ...service,
      sections
    }
  });
});

/**
 * GET /api/v1/public/courses
 * Get all active courses
 */
exports.getCourses = asyncHandler(async (req, res) => {
  const [courses] = await db.execute(
    `SELECT c.id, c.title, c.slug, c.description, c.duration_weeks, c.total_hours, c.price,
            (SELECT COUNT(*) FROM batches WHERE course_id = c.id AND status IN ('UPCOMING', 'ACTIVE')) as upcoming_batches
     FROM courses c
     WHERE c.is_active = TRUE 
     ORDER BY c.title`
  );

  res.status(200).json({
    success: true,
    message: 'Courses fetched',
    data: courses
  });
});

/**
 * POST /api/v1/public/leads
 * Create a new lead (from website form)
 * Rate limited: 10 per IP per hour
 */
exports.createLead = asyncHandler(async (req, res) => {
  const {
    leadType = 'SERVICE',
    name,
    phone,
    email,
    cityId,
    serviceInterestId,
    addressText,
    cityName,
    stateName,
    pincode,
    latitude,
    longitude,
    source = 'website'
  } = req.body;

  // Validate required fields
  if (!name || !phone) {
    throw new ApiError('Name and phone are required', 400);
  }

  if (!isValidPhone(phone)) {
    throw new ApiError('Invalid phone format', 400);
  }

  if (email && !isValidEmail(email)) {
    throw new ApiError('Invalid email format', 400);
  }

  if (pincode && !isValidPincode(pincode)) {
    throw new ApiError('Invalid pincode format', 400);
  }

  // Check if lead with this phone already exists (within last 30 days)
  const [existingLeads] = await db.execute(
    `SELECT id FROM leads 
     WHERE phone = ? AND lead_status != 'LOST' AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
     LIMIT 1`,
    [phone]
  );

  if (existingLeads.length > 0) {
    return res.status(200).json({
      success: true,
      message: 'Lead already exists. Our team will contact you shortly.',
      data: null
    });
  }

  // Create lead
  const leadId = generateId();
  const query = `
    INSERT INTO leads 
    (id, lead_type, lead_status, name, phone, email, address_text, city_name, state_name, pincode, 
     latitude, longitude, city_id, service_interest_id, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await db.execute(query, [
    leadId,
    leadType,
    'NEW',
    name,
    phone,
    email || null,
    addressText || null,
    cityName || null,
    stateName || null,
    pincode || null,
    latitude || null,
    longitude || null,
    cityId || null,
    serviceInterestId || null,
    source
  ]);

  logInfo(`New lead created: ${phone} - ${leadType}`);

  res.status(201).json({
    success: true,
    message: 'Lead submitted successfully. Our team will contact you soon.',
    data: {
      leadId,
      phone
    }
  });
});