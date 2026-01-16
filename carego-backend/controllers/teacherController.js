/**
 * Teacher Controller - Instructor Operations
 * Phase 3: Teachers upload materials, create assignments, grade submissions, manage exams
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');
const { generateId } = require('../utils/validators');
const { logAction } = require('../services/auditService');

/**
 * Get batches taught by teacher
 * GET /api/v1/teachers/batches?page=1&limit=20
 */
exports.getMyBatches = asyncHandler(async (req, res) => {
  const teacherId = req.user.uid; // TEACHER user
  const { page = 1, limit = 20, status } = req.query;

  let query = `
    SELECT 
      cb.id, cb.batch_status, cb.start_date, cb.end_date, cb.shift,
      c.name as course_name, c.level,
      tc.center_name, tc.city_id,
      COUNT(DISTINCT sb.student_id) as enrolled_students,
      cb.max_students
    FROM course_batches cb
    JOIN course_offerings co ON cb.course_offering_id = co.id
    JOIN courses c ON co.course_id = c.id
    JOIN training_centers tc ON cb.training_center_id = tc.id
    JOIN batch_teachers bt ON cb.id = bt.course_batch_id
    LEFT JOIN student_batches sb ON cb.id = sb.course_batch_id
    WHERE bt.teacher_id = ?
  `;

  const params = [teacherId];

  if (status) {
    query += ' AND cb.batch_status = ?';
    params.push(status);
  }

  query += ' GROUP BY cb.id ORDER BY cb.start_date DESC';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

  const [batches] = await db.execute(query, params);

  // Get total count
  let countQuery = `
    SELECT COUNT(DISTINCT cb.id) as total
    FROM course_batches cb
    JOIN batch_teachers bt ON cb.id = bt.course_batch_id
    WHERE bt.teacher_id = ?
  `;
  const countParams = [teacherId];

  if (status) {
    countQuery += ' AND cb.batch_status = ?';
    countParams.push(status);
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
 * Upload course material
 * POST /api/v1/teachers/batches/:batchId/materials
 */
exports.uploadMaterial = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const teacherId = req.user.uid;
  const { title, description, fileUrl, materialType } = req.body;

  if (!title || !fileUrl) {
    throw new ApiError('title and fileUrl are required', 400);
  }

  const validTypes = ['PDF', 'VIDEO', 'PRESENTATION', 'DOCUMENT', 'IMAGE', 'OTHER'];
  if (materialType && !validTypes.includes(materialType)) {
    throw new ApiError(`Invalid materialType. Must be: ${validTypes.join(', ')}`, 400);
  }

  // Check teacher is assigned to batch
  const [teacherCheck] = await db.execute(
    'SELECT id FROM batch_teachers WHERE teacher_id = ? AND course_batch_id = ?',
    [teacherId, batchId]
  );

  if (teacherCheck.length === 0) {
    throw new ApiError('You are not assigned to this batch', 403);
  }

  const materialId = generateId();
  await db.execute(
    `INSERT INTO course_materials (id, course_batch_id, title, description, file_url, material_type, uploaded_by, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [materialId, batchId, title, description || null, fileUrl, materialType || 'OTHER', teacherId]
  );

  // Log action
  await logAction({
    userId: teacherId,
    userRole: 'TEACHER',
    action: 'CREATE',
    entityType: 'Material',
    entityId: materialId,
    newValues: { title, file_url: fileUrl, material_type: materialType },
    changeReason: 'Course material uploaded',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Material uploaded successfully',
    data: {
      materialId,
      title,
      uploadedAt: new Date()
    }
  });
});

/**
 * Create assignment
 * POST /api/v1/teachers/batches/:batchId/assignments
 */
exports.createAssignment = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const teacherId = req.user.uid;
  const { title, description, dueDate, maxScore, instructions } = req.body;

  if (!title || !dueDate || !maxScore) {
    throw new ApiError('title, dueDate, and maxScore are required', 400);
  }

  if (maxScore < 1) {
    throw new ApiError('maxScore must be >= 1', 400);
  }

  // Check teacher is assigned to batch
  const [teacherCheck] = await db.execute(
    'SELECT id FROM batch_teachers WHERE teacher_id = ? AND course_batch_id = ?',
    [teacherId, batchId]
  );

  if (teacherCheck.length === 0) {
    throw new ApiError('You are not assigned to this batch', 403);
  }

  const assignmentId = generateId();
  const due = new Date(dueDate);

  await db.execute(
    `INSERT INTO batch_assignments (id, course_batch_id, title, description, instructions, due_date, max_score, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [assignmentId, batchId, title, description || null, instructions || null, due, maxScore, teacherId]
  );

  // Log action
  await logAction({
    userId: teacherId,
    userRole: 'TEACHER',
    action: 'CREATE',
    entityType: 'Assignment',
    entityId: assignmentId,
    newValues: { title, due_date: due, max_score: maxScore },
    changeReason: 'Assignment created',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Assignment created successfully',
    data: {
      assignmentId,
      title,
      dueDate: due,
      maxScore
    }
  });
});

/**
 * Get submissions for assignment
 * GET /api/v1/teachers/assignments/:assignmentId/submissions?page=1&limit=20
 */
exports.getSubmissions = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const teacherId = req.user.uid;
  const { page = 1, limit = 20, status } = req.query;

  // Check teacher has access to this assignment
  const [assignmentCheck] = await db.execute(`
    SELECT ba.course_batch_id FROM batch_assignments ba
    JOIN batch_teachers bt ON ba.course_batch_id = bt.course_batch_id
    WHERE ba.id = ? AND bt.teacher_id = ?
  `, [assignmentId, teacherId]);

  if (assignmentCheck.length === 0) {
    throw new ApiError('Assignment not found or you do not have access', 404);
  }

  let query = `
    SELECT 
      bs.id, bs.student_id, bs.submission_date, bs.submission_status,
      bs.submission_text, bs.file_url, bs.is_late,
      bs.score, bs.feedback
    FROM batch_submissions bs
    WHERE bs.assignment_id = ?
  `;

  const params = [assignmentId];

  if (status) {
    query += ' AND bs.submission_status = ?';
    params.push(status);
  }

  query += ' ORDER BY bs.submission_date DESC';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

  const [submissions] = await db.execute(query, params);

  // Get count
  let countQuery = 'SELECT COUNT(*) as total FROM batch_submissions WHERE assignment_id = ?';
  const countParams = [assignmentId];

  if (status) {
    countQuery += ' AND submission_status = ?';
    countParams.push(status);
  }

  const [countResult] = await db.execute(countQuery, countParams);

  res.json({
    success: true,
    data: submissions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult[0]?.total || 0,
      pages: Math.ceil((countResult[0]?.total || 0) / parseInt(limit))
    }
  });
});

/**
 * Grade assignment submission
 * POST /api/v1/teachers/submissions/:submissionId/grade
 */
exports.gradeSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const teacherId = req.user.uid;
  const { score, feedback } = req.body;

  if (score === undefined || score === null) {
    throw new ApiError('score is required', 400);
  }

  if (score < 0) {
    throw new ApiError('score cannot be negative', 400);
  }

  // Check submission exists and get assignment details
  const [submissionData] = await db.execute(`
    SELECT bs.id, bs.assignment_id, ba.max_score, ba.course_batch_id, bs.score as old_score
    FROM batch_submissions bs
    JOIN batch_assignments ba ON bs.assignment_id = ba.id
    WHERE bs.id = ?
  `, [submissionId]);

  if (submissionData.length === 0) {
    throw new ApiError('Submission not found', 404);
  }

  const submission = submissionData[0];

  if (score > submission.max_score) {
    throw new ApiError(`Score cannot exceed maximum score of ${submission.max_score}`, 400);
  }

  // Check teacher is assigned to batch
  const [teacherCheck] = await db.execute(
    'SELECT id FROM batch_teachers WHERE teacher_id = ? AND course_batch_id = ?',
    [teacherId, submission.course_batch_id]
  );

  if (teacherCheck.length === 0) {
    throw new ApiError('You are not assigned to this batch', 403);
  }

  await db.execute(
    'UPDATE batch_submissions SET score = ?, feedback = ?, submission_status = ? WHERE id = ?',
    [score, feedback || null, 'GRADED', submissionId]
  );

  // Log action
  await logAction({
    userId: teacherId,
    userRole: 'TEACHER',
    action: 'UPDATE',
    entityType: 'Submission',
    entityId: submissionId,
    oldValues: { score: submission.old_score },
    newValues: { score, feedback: feedback || null },
    changeReason: 'Submission graded',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Submission graded successfully',
    data: {
      submissionId,
      score,
      feedback
    }
  });
});

/**
 * Create exam
 * POST /api/v1/teachers/batches/:batchId/exams
 */
exports.createExam = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const teacherId = req.user.uid;
  const { examName, examDate, maxScore, passingScore, instructions } = req.body;

  if (!examName || !examDate || !maxScore || !passingScore) {
    throw new ApiError('examName, examDate, maxScore, and passingScore are required', 400);
  }

  if (passingScore > maxScore) {
    throw new ApiError('Passing score cannot exceed maximum score', 400);
  }

  // Check teacher is assigned to batch
  const [teacherCheck] = await db.execute(
    'SELECT id FROM batch_teachers WHERE teacher_id = ? AND course_batch_id = ?',
    [teacherId, batchId]
  );

  if (teacherCheck.length === 0) {
    throw new ApiError('You are not assigned to this batch', 403);
  }

  const examId = generateId();
  const examDateObj = new Date(examDate);

  await db.execute(
    `INSERT INTO batch_exams (id, course_batch_id, exam_name, exam_date, max_score, passing_score, instructions, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [examId, batchId, examName, examDateObj, maxScore, passingScore, instructions || null, teacherId]
  );

  // Log action
  await logAction({
    userId: teacherId,
    userRole: 'TEACHER',
    action: 'CREATE',
    entityType: 'Exam',
    entityId: examId,
    newValues: { exam_name: examName, exam_date: examDateObj, max_score: maxScore, passing_score: passingScore },
    changeReason: 'Exam created',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Exam created successfully',
    data: {
      examId,
      examName,
      examDate: examDateObj,
      maxScore,
      passingScore
    }
  });
});

/**
 * Record exam result
 * POST /api/v1/teachers/exams/:examId/results
 */
exports.recordExamResult = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const teacherId = req.user.uid;
  const { studentId, score } = req.body;

  if (!studentId || score === undefined || score === null) {
    throw new ApiError('studentId and score are required', 400);
  }

  if (score < 0) {
    throw new ApiError('score cannot be negative', 400);
  }

  // Get exam details
  const [examData] = await db.execute(
    'SELECT course_batch_id, max_score, passing_score FROM batch_exams WHERE id = ?',
    [examId]
  );

  if (examData.length === 0) {
    throw new ApiError('Exam not found', 404);
  }

  const exam = examData[0];

  if (score > exam.max_score) {
    throw new ApiError(`Score cannot exceed maximum score of ${exam.max_score}`, 400);
  }

  // Check teacher is assigned to batch
  const [teacherCheck] = await db.execute(
    'SELECT id FROM batch_teachers WHERE teacher_id = ? AND course_batch_id = ?',
    [teacherId, exam.course_batch_id]
  );

  if (teacherCheck.length === 0) {
    throw new ApiError('You are not assigned to this batch', 403);
  }

  const resultId = generateId();
  const isPassed = score >= exam.passing_score;

  // Check for existing result
  const [existingResult] = await db.execute(
    'SELECT id FROM exam_results WHERE exam_id = ? AND student_id = ?',
    [examId, studentId]
  );

  if (existingResult.length > 0) {
    throw new ApiError('Result already recorded for this student', 409);
  }

  await db.execute(
    `INSERT INTO exam_results (id, exam_id, student_id, score, is_passed, recorded_by, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [resultId, examId, studentId, score, isPassed ? 1 : 0, teacherId]
  );

  // Log action
  await logAction({
    userId: teacherId,
    userRole: 'TEACHER',
    action: 'CREATE',
    entityType: 'ExamResult',
    entityId: resultId,
    newValues: { exam_id: examId, student_id: studentId, score, is_passed: isPassed },
    changeReason: 'Exam result recorded',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Exam result recorded successfully',
    data: {
      resultId,
      studentId,
      score,
      isPassed,
      examId
    }
  });
});

/**
 * Mark attendance
 * POST /api/v1/teachers/batches/:batchId/attendance
 */
exports.markAttendance = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const teacherId = req.user.uid;
  const { studentId, attendanceStatus, sessionDate } = req.body;

  if (!studentId || !attendanceStatus) {
    throw new ApiError('studentId and attendanceStatus are required', 400);
  }

  const validStatuses = ['PRESENT', 'ABSENT', 'LATE'];
  if (!validStatuses.includes(attendanceStatus)) {
    throw new ApiError(`Invalid status. Must be: ${validStatuses.join(', ')}`, 400);
  }

  // Check teacher is assigned to batch
  const [teacherCheck] = await db.execute(
    'SELECT id FROM batch_teachers WHERE teacher_id = ? AND course_batch_id = ?',
    [teacherId, batchId]
  );

  if (teacherCheck.length === 0) {
    throw new ApiError('You are not assigned to this batch', 403);
  }

  // Check student is enrolled
  const [studentCheck] = await db.execute(
    'SELECT id FROM student_batches WHERE student_id = ? AND course_batch_id = ?',
    [studentId, batchId]
  );

  if (studentCheck.length === 0) {
    throw new ApiError('Student is not enrolled in this batch', 404);
  }

  const attendanceDate = sessionDate ? new Date(sessionDate) : new Date();

  // Check for existing attendance record on same date
  const [existingAttendance] = await db.execute(
    'SELECT id FROM batch_attendance WHERE student_id = ? AND course_batch_id = ? AND DATE(attendance_date) = DATE(?)',
    [studentId, batchId, attendanceDate]
  );

  if (existingAttendance.length > 0) {
    // Update existing
    await db.execute(
      'UPDATE batch_attendance SET attendance_status = ? WHERE id = ?',
      [attendanceStatus, existingAttendance[0].id]
    );
  } else {
    // Create new
    const attendanceId = generateId();
    await db.execute(
      `INSERT INTO batch_attendance (id, student_id, course_batch_id, attendance_date, attendance_status, marked_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [attendanceId, studentId, batchId, attendanceDate, attendanceStatus, teacherId]
    );
  }

  // Log action
  await logAction({
    userId: teacherId,
    userRole: 'TEACHER',
    action: existingAttendance.length > 0 ? 'UPDATE' : 'CREATE',
    entityType: 'Attendance',
    entityId: existingAttendance.length > 0 ? existingAttendance[0].id : generateId(),
    newValues: { student_id: studentId, attendance_status: attendanceStatus },
    changeReason: 'Attendance marked',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Attendance recorded successfully',
    data: {
      studentId,
      attendanceStatus,
      attendanceDate
    }
  });
});
