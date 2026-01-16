/**
 * Training Controller - LMS Admin Operations
 * Phase 3: Training/LMS System
 * Admin manages courses, offerings, batches, enrollments
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');
const { generateId } = require('../utils/validators');
const { logAction } = require('../services/auditService');

/**
 * Create a new course
 * POST /api/v1/training/courses
 */
exports.createCourse = asyncHandler(async (req, res) => {
  const { name, description, duration, level, syllabus } = req.body;

  if (!name || !duration || !level) {
    throw new ApiError('Missing required fields: name, duration, level', 400);
  }

  const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
  if (!validLevels.includes(level)) {
    throw new ApiError(`Invalid level. Must be: ${validLevels.join(', ')}`, 400);
  }

  const courseId = generateId();
  await db.execute(
    `INSERT INTO courses (id, name, description, duration_hours, level, syllabus, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())`,
    [courseId, name, description || null, duration, level, syllabus || null]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Course',
    entityId: courseId,
    newValues: { name, duration_hours: duration, level },
    changeReason: 'Course created by admin',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: {
      courseId,
      name,
      duration,
      level
    }
  });
});

/**
 * Get all courses
 * GET /api/v1/training/courses?level=BEGINNER&isActive=true&page=1&limit=20
 */
exports.getAllCourses = asyncHandler(async (req, res) => {
  const { level, isActive = true, page = 1, limit = 20 } = req.query;

  let query = 'SELECT id, name, description, duration_hours, level, is_active, created_at FROM courses WHERE 1=1';
  const params = [];

  if (level) {
    query += ' AND level = ?';
    params.push(level);
  }

  if (isActive !== undefined) {
    query += ' AND is_active = ?';
    params.push(isActive === 'true' ? 1 : 0);
  }

  query += ' ORDER BY created_at DESC';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

  const [courses] = await db.execute(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM courses WHERE 1=1';
  const countParams = [];

  if (level) {
    countQuery += ' AND level = ?';
    countParams.push(level);
  }
  if (isActive !== undefined) {
    countQuery += ' AND is_active = ?';
    countParams.push(isActive === 'true' ? 1 : 0);
  }

  const [countResult] = await db.execute(countQuery, countParams);

  res.json({
    success: true,
    data: courses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult[0]?.total || 0,
      pages: Math.ceil((countResult[0]?.total || 0) / parseInt(limit))
    }
  });
});

/**
 * Get course detail
 * GET /api/v1/training/courses/:courseId
 */
exports.getCourseDetail = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const [courseData] = await db.execute(
    `SELECT id, name, description, duration_hours, level, syllabus, is_active, created_at
     FROM courses WHERE id = ?`,
    [courseId]
  );

  if (courseData.length === 0) {
    throw new ApiError('Course not found', 404);
  }

  const course = courseData[0];

  // Get offerings
  const [offerings] = await db.execute(
    `SELECT id, price, duration_weeks, max_students, created_at FROM course_offerings WHERE course_id = ? AND is_active = TRUE`,
    [courseId]
  );

  res.json({
    success: true,
    data: {
      ...course,
      offerings
    }
  });
});

/**
 * Create course offering (price, duration, max students)
 * POST /api/v1/training/courses/:courseId/offerings
 */
exports.createOffering = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { price, durationWeeks, maxStudents } = req.body;

  if (!price || !durationWeeks || !maxStudents) {
    throw new ApiError('Missing required fields: price, durationWeeks, maxStudents', 400);
  }

  if (price < 0 || durationWeeks < 1 || maxStudents < 1) {
    throw new ApiError('Invalid values: price >= 0, durationWeeks >= 1, maxStudents >= 1', 400);
  }

  // Check course exists
  const [courseCheck] = await db.execute('SELECT id FROM courses WHERE id = ?', [courseId]);
  if (courseCheck.length === 0) {
    throw new ApiError('Course not found', 404);
  }

  const offeringId = generateId();
  await db.execute(
    `INSERT INTO course_offerings (id, course_id, price, duration_weeks, max_students, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, TRUE, NOW())`,
    [offeringId, courseId, price, durationWeeks, maxStudents]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'CourseOffering',
    entityId: offeringId,
    newValues: { course_id: courseId, price, duration_weeks: durationWeeks, max_students: maxStudents },
    changeReason: 'Course offering created',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Course offering created',
    data: {
      offeringId,
      courseId,
      price,
      durationWeeks,
      maxStudents
    }
  });
});

/**
 * Create a batch (offering in a training center)
 * POST /api/v1/training/batches
 */
exports.createBatch = asyncHandler(async (req, res) => {
  const { courseOfferingId, trainingCenterId, startDate, endDate, maxStudents, shift } = req.body;

  if (!courseOfferingId || !trainingCenterId || !startDate || !maxStudents) {
    throw new ApiError('Missing required fields', 400);
  }

  const validShifts = ['MORNING', 'AFTERNOON', 'EVENING', 'WEEKEND'];
  if (shift && !validShifts.includes(shift)) {
    throw new ApiError(`Invalid shift. Must be: ${validShifts.join(', ')}`, 400);
  }

  // Check offering exists
  const [offeringCheck] = await db.execute(
    'SELECT course_id FROM course_offerings WHERE id = ?',
    [courseOfferingId]
  );
  if (offeringCheck.length === 0) {
    throw new ApiError('Course offering not found', 404);
  }

  // Check training center exists
  const [centerCheck] = await db.execute(
    'SELECT id FROM training_centers WHERE id = ?',
    [trainingCenterId]
  );
  if (centerCheck.length === 0) {
    throw new ApiError('Training center not found', 404);
  }

  const batchId = generateId();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  await db.execute(
    `INSERT INTO course_batches (id, course_offering_id, training_center_id, start_date, end_date, max_students, shift, batch_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', NOW())`,
    [batchId, courseOfferingId, trainingCenterId, start, end, maxStudents, shift || 'MORNING']
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Batch',
    entityId: batchId,
    newValues: { offering_id: courseOfferingId, center_id: trainingCenterId, start_date: start },
    changeReason: 'Batch created',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Batch created successfully',
    data: {
      batchId,
      courseOfferingId,
      trainingCenterId,
      startDate: start,
      status: 'SCHEDULED'
    }
  });
});

/**
 * Get all batches
 * GET /api/v1/training/batches?status=SCHEDULED&trainingCenterId=xxx&page=1&limit=20
 */
exports.getAllBatches = asyncHandler(async (req, res) => {
  const { status, trainingCenterId, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT 
      cb.id, cb.batch_status, cb.start_date, cb.end_date, cb.max_students, cb.shift,
      c.name as course_name, c.level,
      tc.city_id, tc.center_name
    FROM course_batches cb
    JOIN course_offerings co ON cb.course_offering_id = co.id
    JOIN courses c ON co.course_id = c.id
    JOIN training_centers tc ON cb.training_center_id = tc.id
    WHERE 1=1
  `;

  const params = [];

  if (status) {
    query += ' AND cb.batch_status = ?';
    params.push(status);
  }

  if (trainingCenterId) {
    query += ' AND cb.training_center_id = ?';
    params.push(trainingCenterId);
  }

  query += ' ORDER BY cb.start_date DESC';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

  const [batches] = await db.execute(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM course_batches WHERE 1=1';
  const countParams = [];

  if (status) {
    countQuery += ' AND batch_status = ?';
    countParams.push(status);
  }
  if (trainingCenterId) {
    countQuery += ' AND training_center_id = ?';
    countParams.push(trainingCenterId);
  }

  const [countResult] = await db.execute(countQuery, countParams);

  res.json({
    success: true,
    data: batches,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult[0]?.total || 0,
      pages: Math.ceil((countResult[0]?.total || 0) / parseInt(limit))
    }
  });
});

/**
 * Enroll student in batch
 * POST /api/v1/training/batches/:batchId/enroll
 */
exports.enrollStudent = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { studentId } = req.body;

  if (!studentId) {
    throw new ApiError('studentId is required', 400);
  }

  // Check batch exists
  const [batchCheck] = await db.execute(
    'SELECT max_students FROM course_batches WHERE id = ?',
    [batchId]
  );

  if (batchCheck.length === 0) {
    throw new ApiError('Batch not found', 404);
  }

  // Check student not already enrolled
  const [alreadyEnrolled] = await db.execute(
    'SELECT id FROM student_batches WHERE student_id = ? AND course_batch_id = ?',
    [studentId, batchId]
  );

  if (alreadyEnrolled.length > 0) {
    throw new ApiError('Student already enrolled in this batch', 409);
  }

  // Check enrollment capacity
  const [enrollmentCount] = await db.execute(
    'SELECT COUNT(*) as count FROM student_batches WHERE course_batch_id = ?',
    [batchId]
  );

  if (enrollmentCount[0].count >= batchCheck[0].max_students) {
    throw new ApiError('Batch is full', 400);
  }

  const enrollmentId = generateId();
  await db.execute(
    `INSERT INTO student_batches (id, student_id, course_batch_id, enrollment_status, enrolled_at)
     VALUES (?, ?, ?, 'ENROLLED', NOW())`,
    [enrollmentId, studentId, batchId]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Enrollment',
    entityId: enrollmentId,
    newValues: { student_id: studentId, batch_id: batchId },
    changeReason: 'Student enrolled in batch',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Student enrolled successfully',
    data: {
      enrollmentId,
      studentId,
      batchId,
      status: 'ENROLLED'
    }
  });
});

/**
 * Update batch status (SCHEDULED -> ONGOING -> COMPLETED/CANCELLED)
 * PATCH /api/v1/training/batches/:batchId/status
 */
exports.updateBatchStatus = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { status, reason } = req.body;

  if (!status || !reason) {
    throw new ApiError('status and reason are required', 400);
  }

  const validStatuses = ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(`Invalid status. Must be: ${validStatuses.join(', ')}`, 400);
  }

  // Check batch exists
  const [batchCheck] = await db.execute(
    'SELECT batch_status FROM course_batches WHERE id = ?',
    [batchId]
  );

  if (batchCheck.length === 0) {
    throw new ApiError('Batch not found', 404);
  }

  const oldStatus = batchCheck[0].batch_status;

  await db.execute(
    'UPDATE course_batches SET batch_status = ? WHERE id = ?',
    [status, batchId]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Batch',
    entityId: batchId,
    oldValues: { batch_status: oldStatus },
    newValues: { batch_status: status },
    changeReason: reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Batch status updated',
    data: { batchId, status }
  });
});
