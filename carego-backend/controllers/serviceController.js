const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// @desc    Get All Services (Admin View)
// @route   GET /api/v1/admin/services
exports.getAllServices = async (req, res, next) => {
  try {
    // Join with City name for better visibility
    const sql = `
      SELECT s.*, c.name as city_name 
      FROM services s
      JOIN cities c ON s.city_id = c.id
      ORDER BY s.title ASC
    `;
    const [services] = await db.execute(sql);
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a New Service (With Sections)
// @route   POST /api/v1/admin/services
exports.createService = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { city_id, title, slug, short_description, price_range, sections } =
      req.body;
    const serviceId = uuidv4();

    // 1. Insert Service
    await connection.execute(
      `INSERT INTO services (id, city_id, title, slug, short_description, price_range) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [serviceId, city_id, title, slug, short_description, price_range]
    );

    // 2. Insert Sections (if any)
    if (sections && sections.length > 0) {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        await connection.execute(
          `INSERT INTO service_sections (id, service_id, title, content, sort_order) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), serviceId, sec.title, sec.content, i]
        );
      }
    }

    await connection.commit();
    res
      .status(201)
      .json({ success: true, message: "Service created successfully" });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// @desc    Get Single Service Details (For Editing)
exports.getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [services] = await db.execute("SELECT * FROM services WHERE id = ?", [
      id,
    ]);

    if (services.length === 0)
      return res.status(404).json({ message: "Service not found" });

    const [sections] = await db.execute(
      "SELECT * FROM service_sections WHERE service_id = ? ORDER BY sort_order ASC",
      [id]
    );

    res.json({ success: true, data: { ...services[0], sections } });
  } catch (error) {
    next(error);
  }
};

exports.updateService = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { city_id, title, slug, short_description, price_range, sections } = req.body;

    // 1. Verify Service Exists
    const [existing] = await connection.execute('SELECT id FROM services WHERE id = ?', [id]);
    if (existing.length === 0) {
      throw new Error('Service not found');
    }

    // 2. Update Basic Details
    await connection.execute(
      `UPDATE services 
       SET city_id = ?, title = ?, slug = ?, short_description = ?, price_range = ? 
       WHERE id = ?`,
      [city_id, title, slug, short_description, price_range, id]
    );

    // 3. Handle Sections (Strategy: Delete All & Re-insert)
    // This is the safest way to handle re-ordering, edits, and deletions simultaneously.
    await connection.execute('DELETE FROM service_sections WHERE service_id = ?', [id]);

    if (sections && sections.length > 0) {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        await connection.execute(
          `INSERT INTO service_sections (id, service_id, title, content, sort_order) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), id, sec.title, sec.content, i]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Service updated successfully' });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
