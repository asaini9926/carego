/**
 * Student Controller - Learning Operations
 * Phase 3: Students view courses, submit assignments, view grades, download certificates
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');
const { generateId } = require('../utils/validators');
const { logAction } = require('../services/auditService');

/**
 * Get student's enrolled batches
 * GET /api/v1/students/batches?page=1&limit=20
 */
exports.getMyBatches = asyncHandler(async (req, res) => {
  const studentId = req.user.uid; // STUDENT user
  const { page = 1, limit = 20, status } = req.query;

  let query = `
    SELECT 
      cb.id, cb.batch_status, cb.start_date, cb.end_date, cb.shift,
      c.name as course_name, c.level, c.description,
      co.price, co.duration_weeks,
      tc.center_name, tc.city_id,
      sb.enrollment_status, sb.enrolled_at
    FROM student_batches sb
    JOIN course_batches cb ON sb.course_batch_id = cb.id
    JOIN course_offerings co ON cb.course_offering_id = co.id
    JOIN courses c ON co.course_id = c.id
    JOIN training_centers tc ON cb.training_center_id = tc.id
    WHERE sb.student_id = ?
  `;

  const params = [studentId];

  if (status) {
    query += ' AND sb.enrollment_status = ?';
    params.push(status);
  }

  query += ' ORDER BY cb.start_date DESC';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

  const [batches] = await db.execute(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM student_batches WHERE student_id = ?';
  const countParams = [studentId];

  if (status) {
    countQuery += ' AND enrollment_status = ?';
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
 * Get batch detail with materials and assignments
 * GET /api/v1/students/batches/:batchId
 */
exports.getBatchDetail = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const studentId = req.user.uid;

  // Check student is enrolled
  const [enrollmentCheck] = await db.execute(
    'SELECT id FROM student_batches WHERE student_id = ? AND course_batch_id = ?',
    [studentId, batchId]
  );

  if (enrollmentCheck.length === 0) {
    throw new ApiError('You are not enrolled in this batch', 403);
  }

  // Get batch details
  const [batchData] = await db.execute(`
    SELECT 
      cb.id, cb.batch_status, cb.start_date, cb.end_date, cb.shift,
      c.name as course_name, c.level, c.description, c.syllabus,
      co.price, co.duration_weeks,
      tc.center_name
    FROM course_batches cb
    JOIN course_offerings co ON cb.course_offering_id = co.id
    JOIN courses c ON co.course_id = c.id
    JOIN training_centers tc ON cb.training_center_id = tc.id
    WHERE cb.id = ?
  `, [batchId]);

  if (batchData.length === 0) {
    throw new ApiError('Batch not found', 404);
  }

  const batch = batchData[0];

  // Get materials
  const [materials] = await db.execute(`
    SELECT id, title, description, file_url, uploaded_at
    FROM course_materials
    WHERE course_batch_id = ?
    ORDER BY uploaded_at DESC
  `, [batchId]);

  // Get assignments
  const [assignments] = await db.execute(`
    SELECT id, title, description, due_date, max_score
    FROM batch_assignments
    WHERE course_batch_id = ?
    ORDER BY due_date ASC
  `, [batchId]);

  // Get student's assignment submissions
  const [submissions] = await db.execute(`
    SELECT 
      bs.id, bs.assignment_id, ba.title,
      bs.submission_date, bs.score, bs.feedback,
      bs.submission_status
    FROM batch_submissions bs
    JOIN batch_assignments ba ON bs.assignment_id = ba.id
    WHERE bs.student_id = ? AND ba.course_batch_id = ?
    ORDER BY ba.due_date ASC
  `, [studentId, batchId]);

  res.json({
    success: true,
    data: {
      ...batch,
      materials,
      assignments,
      mySubmissions: submissions
    }
  });
});

/**
 * Submit assignment
 * POST /api/v1/students/assignments/:assignmentId/submit
 */
exports.submitAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const studentId = req.user.uid;
  const { submissionText, fileUrl } = req.body;

  if (!submissionText && !fileUrl) {
    throw new ApiError('Either submissionText or fileUrl must be provided', 400);
  }

  // Check assignment exists and get batch info
  const [assignmentCheck] = await db.execute(
    'SELECT course_batch_id, due_date FROM batch_assignments WHERE id = ?',
    [assignmentId]
  );

  if (assignmentCheck.length === 0) {
    throw new ApiError('Assignment not found', 404);
  }

  const batchId = assignmentCheck[0].course_batch_id;

  // Check student is enrolled in batch
  const [enrollmentCheck] = await db.execute(
    'SELECT id FROM student_batches WHERE student_id = ? AND course_batch_id = ?',
    [studentId, batchId]
  );

  if (enrollmentCheck.length === 0) {
    throw new ApiError('You are not enrolled in this batch', 403);
  }

  // Check for duplicate submission
  const [existingSubmission] = await db.execute(
    'SELECT id FROM batch_submissions WHERE student_id = ? AND assignment_id = ?',
    [studentId, assignmentId]
  );

  if (existingSubmission.length > 0) {
    throw new ApiError('You have already submitted this assignment', 409);
  }

  const submissionId = generateId();
  const isLate = new Date() > assignmentCheck[0].due_date;

  await db.execute(
    `INSERT INTO batch_submissions (id, assignment_id, student_id, submission_text, file_url, submission_date, submission_status, is_late)
     VALUES (?, ?, ?, ?, ?, NOW(), 'SUBMITTED', ?)`,
    [submissionId, assignmentId, studentId, submissionText || null, fileUrl || null, isLate ? 1 : 0]
  );

  // Log action
  await logAction({
    userId: studentId,
    userRole: 'STUDENT',
    action: 'CREATE',
    entityType: 'Submission',
    entityId: submissionId,
    newValues: { assignment_id: assignmentId, is_late: isLate },
    changeReason: 'Assignment submitted',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Assignment submitted successfully' + (isLate ? ' (Late submission)' : ''),
    data: {
      submissionId,
      assignmentId,
      submittedAt: new Date(),
      isLate
    }
  });
});

/**
 * Get student's grades for a batch
 * GET /api/v1/students/batches/:batchId/grades
 */
exports.getBatchGrades = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const studentId = req.user.uid;

  // Check enrollment
  const [enrollmentCheck] = await db.execute(
    'SELECT id FROM student_batches WHERE student_id = ? AND course_batch_id = ?',
    [studentId, batchId]
  );

  if (enrollmentCheck.length === 0) {
    throw new ApiError('You are not enrolled in this batch', 403);
  }

  // Get all assignments and student's scores
  const [grades] = await db.execute(`
    SELECT 
      ba.id, ba.title, ba.max_score,
      COALESCE(bs.score, NULL) as student_score,
      COALESCE(bs.feedback, NULL) as feedback,
      COALESCE(bs.submission_date, NULL) as submission_date,
      COALESCE(bs.submission_status, 'NOT_SUBMITTED') as submission_status,
      ba.due_date
    FROM batch_assignments ba
    LEFT JOIN batch_submissions bs ON ba.id = bs.assignment_id AND bs.student_id = ?
    WHERE ba.course_batch_id = ?
    ORDER BY ba.due_date ASC
  `, [studentId, batchId]);

  // Calculate overall grade
  const scoredAssignments = grades.filter(g => g.student_score !== null);
  const totalScore = scoredAssignments.reduce((sum, g) => sum + g.student_score, 0);
  const maxTotalScore = scoredAssignments.reduce((sum, g) => sum + g.max_score, 0);
  const percentScore = maxTotalScore > 0 ? ((totalScore / maxTotalScore) * 100).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      batchId,
      assignments: grades,
      overall: {
        totalScore,
        maxTotalScore,
        percentScore: parseFloat(percentScore),
        assignmentsSubmitted: scoredAssignments.length,
        totalAssignments: grades.length
      }
    }
  });
});

/**
 * Get student's certificates
 * GET /api/v1/students/certificates
 */
exports.getMyCertificates = asyncHandler(async (req, res) => {
  const studentId = req.user.uid;

  const [certificates] = await db.execute(`
    SELECT 
      cert.id, cert.course_batch_id, cert.certificate_number,
      cert.issued_date, cert.certificate_url,
      c.name as course_name, c.level,
      cb.start_date as batch_start, cb.end_date as batch_end,
      tc.center_name
    FROM student_certificates cert
    JOIN course_batches cb ON cert.course_batch_id = cb.id
    JOIN course_offerings co ON cb.course_offering_id = co.id
    JOIN courses c ON co.course_id = c.id
    JOIN training_centers tc ON cb.training_center_id = tc.id
    WHERE cert.student_id = ?
    ORDER BY cert.issued_date DESC
  `, [studentId]);

  res.json({
    success: true,
    data: certificates
  });
});

/**
 * Download certificate
 * GET /api/v1/students/certificates/:certificateId/download
 */
exports.downloadCertificate = asyncHandler(async (req, res) => {
  const { certificateId } = req.params;
  const studentId = req.user.uid;

  // Check certificate belongs to student
  const [certCheck] = await db.execute(
    'SELECT certificate_url FROM student_certificates WHERE id = ? AND student_id = ?',
    [certificateId, studentId]
  );

  if (certCheck.length === 0) {
    throw new ApiError('Certificate not found or you do not have access', 404);
  }

  // Log action
  await logAction({
    userId: studentId,
    userRole: 'STUDENT',
    action: 'READ',
    entityType: 'Certificate',
    entityId: certificateId,
    changeReason: 'Certificate downloaded',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Certificate available for download',
    data: {
      certificateId,
      downloadUrl: certCheck[0].certificate_url
    }
  });
});

/**
 * View exam eligibility
 * GET /api/v1/students/batches/:batchId/exam-eligibility
 */
exports.getExamEligibility = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const studentId = req.user.uid;

  // Check enrollment
  const [enrollmentCheck] = await db.execute(
    'SELECT id FROM student_batches WHERE student_id = ? AND course_batch_id = ?',
    [studentId, batchId]
  );

  if (enrollmentCheck.length === 0) {
    throw new ApiError('You are not enrolled in this batch', 403);
  }

  // Get exam details
  const [examData] = await db.execute(`
    SELECT id, exam_name, max_score, passing_score, exam_date
    FROM batch_exams
    WHERE course_batch_id = ?
  `, [batchId]);

  if (examData.length === 0) {
    throw new ApiError('No exam for this batch', 404);
  }

  const exam = examData[0];

  // Check attendance (must attend >= 80% of sessions)
  const [attendanceData] = await db.execute(
    `SELECT 
      COUNT(*) as total_sessions,
      SUM(CASE WHEN attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as attended
    FROM batch_attendance
    WHERE student_id = ? AND course_batch_id = ?`,
    [studentId, batchId]
  );

  const attendance = attendanceData[0];
  const attendancePercentage = attendance.total_sessions > 0 
    ? ((attendance.attended / attendance.total_sessions) * 100) 
    : 0;

  // Check assignments completion (must have submitted all)
  const [submissionCount] = await db.execute(`
    SELECT 
      COUNT(DISTINCT ba.id) as total_assignments,
      COUNT(DISTINCT bs.assignment_id) as submitted_assignments
    FROM batch_assignments ba
    LEFT JOIN batch_submissions bs ON ba.id = bs.assignment_id AND bs.student_id = ?
    WHERE ba.course_batch_id = ?
  `, [studentId, batchId]);

  const submissions = submissionCount[0];

  // Check exam eligibility
  const isEligible = attendancePercentage >= 80 && 
                     submissions.submitted_assignments === submissions.total_assignments;

  res.json({
    success: true,
    data: {
      batchId,
      exam: {
        id: exam.id,
        name: exam.exam_name,
        maxScore: exam.max_score,
        passingScore: exam.passing_score,
        examDate: exam.exam_date
      },
      eligibility: {
        isEligible,
        attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
        attendanceRequired: 80,
        assignmentsSubmitted: submissions.submitted_assignments,
        totalAssignments: submissions.total_assignments,
        reasons: {
          attendanceStatus: attendancePercentage >= 80 ? 'PASS' : 'FAIL',
          assignmentsStatus: submissions.submitted_assignments === submissions.total_assignments ? 'PASS' : 'FAIL'
        }
      }
    }
  });
});
