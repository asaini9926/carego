/**
 * Training Routes - LMS & Course Management
 * Phase 3: Courses, batches, enrollments, learning operations
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const trainingController = require('../controllers/trainingController');
const studentController = require('../controllers/studentController');
const teacherController = require('../controllers/teacherController');

/**
 * ADMIN ROUTES - Course & Batch Management
 */

// Create course
router.post(
  '/courses',
  protect,
  restrictTo('ADMIN'),
  [
    body('name').notEmpty().trim().escape(),
    body('duration').isInt({ min: 1 }),
    body('level').isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
    body('description').optional().trim().escape(),
    body('syllabus').optional().trim()
  ],
  validate,
  trainingController.createCourse
);

// Get all courses
router.get(
  '/courses',
  protect,
  restrictTo('ADMIN', 'TEACHER', 'STUDENT'),
  [
    query('level').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
    query('isActive').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  trainingController.getAllCourses
);

// Get course detail
router.get(
  '/courses/:courseId',
  protect,
  restrictTo('ADMIN', 'TEACHER', 'STUDENT'),
  [param('courseId').notEmpty()],
  validate,
  trainingController.getCourseDetail
);

// Create course offering (pricing, duration)
router.post(
  '/courses/:courseId/offerings',
  protect,
  restrictTo('ADMIN'),
  [
    param('courseId').notEmpty(),
    body('price').isDecimal({ min: 0 }),
    body('durationWeeks').isInt({ min: 1 }),
    body('maxStudents').isInt({ min: 1 })
  ],
  validate,
  trainingController.createOffering
);

// Create batch
router.post(
  '/batches',
  protect,
  restrictTo('ADMIN'),
  [
    body('courseOfferingId').notEmpty(),
    body('trainingCenterId').notEmpty(),
    body('startDate').isISO8601(),
    body('endDate').optional().isISO8601(),
    body('maxStudents').isInt({ min: 1 }),
    body('shift').optional().isIn(['MORNING', 'AFTERNOON', 'EVENING', 'WEEKEND'])
  ],
  validate,
  trainingController.createBatch
);

// Get all batches
router.get(
  '/batches',
  protect,
  restrictTo('ADMIN', 'TEACHER'),
  [
    query('status').optional().isIn(['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED']),
    query('trainingCenterId').optional().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  trainingController.getAllBatches
);

// Enroll student in batch
router.post(
  '/batches/:batchId/enroll',
  protect,
  restrictTo('ADMIN'),
  [
    param('batchId').notEmpty(),
    body('studentId').notEmpty()
  ],
  validate,
  trainingController.enrollStudent
);

// Update batch status
router.patch(
  '/batches/:batchId/status',
  protect,
  restrictTo('ADMIN'),
  [
    param('batchId').notEmpty(),
    body('status').isIn(['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED']),
    body('reason').notEmpty().trim()
  ],
  validate,
  trainingController.updateBatchStatus
);

/**
 * STUDENT ROUTES - Learning & Progress
 */

// Get student's enrolled batches
router.get(
  '/students/batches',
  protect,
  restrictTo('STUDENT'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional()
  ],
  validate,
  studentController.getMyBatches
);

// Get batch detail (with materials and assignments)
router.get(
  '/students/batches/:batchId',
  protect,
  restrictTo('STUDENT'),
  [param('batchId').notEmpty()],
  validate,
  studentController.getBatchDetail
);

// Submit assignment
router.post(
  '/students/assignments/:assignmentId/submit',
  protect,
  restrictTo('STUDENT'),
  [
    param('assignmentId').notEmpty(),
    body('submissionText').optional().trim(),
    body('fileUrl').optional().isURL()
  ],
  validate,
  studentController.submitAssignment
);

// Get batch grades
router.get(
  '/students/batches/:batchId/grades',
  protect,
  restrictTo('STUDENT'),
  [param('batchId').notEmpty()],
  validate,
  studentController.getBatchGrades
);

// Get certificates
router.get(
  '/students/certificates',
  protect,
  restrictTo('STUDENT'),
  studentController.getMyCertificates
);

// Download certificate
router.get(
  '/students/certificates/:certificateId/download',
  protect,
  restrictTo('STUDENT'),
  [param('certificateId').notEmpty()],
  validate,
  studentController.downloadCertificate
);

// Check exam eligibility
router.get(
  '/students/batches/:batchId/exam-eligibility',
  protect,
  restrictTo('STUDENT'),
  [param('batchId').notEmpty()],
  validate,
  studentController.getExamEligibility
);

/**
 * TEACHER ROUTES - Instruction & Assessment
 */

// Get teacher's assigned batches
router.get(
  '/teachers/batches',
  protect,
  restrictTo('TEACHER'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional()
  ],
  validate,
  teacherController.getMyBatches
);

// Upload course material
router.post(
  '/teachers/batches/:batchId/materials',
  protect,
  restrictTo('TEACHER'),
  [
    param('batchId').notEmpty(),
    body('title').notEmpty().trim(),
    body('fileUrl').isURL(),
    body('description').optional().trim(),
    body('materialType').optional().isIn(['PDF', 'VIDEO', 'PRESENTATION', 'DOCUMENT', 'IMAGE', 'OTHER'])
  ],
  validate,
  teacherController.uploadMaterial
);

// Create assignment
router.post(
  '/teachers/batches/:batchId/assignments',
  protect,
  restrictTo('TEACHER'),
  [
    param('batchId').notEmpty(),
    body('title').notEmpty().trim(),
    body('dueDate').isISO8601(),
    body('maxScore').isInt({ min: 1 }),
    body('description').optional().trim(),
    body('instructions').optional().trim()
  ],
  validate,
  teacherController.createAssignment
);

// Get assignment submissions
router.get(
  '/teachers/assignments/:assignmentId/submissions',
  protect,
  restrictTo('TEACHER'),
  [
    param('assignmentId').notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional()
  ],
  validate,
  teacherController.getSubmissions
);

// Grade submission
router.post(
  '/teachers/submissions/:submissionId/grade',
  protect,
  restrictTo('TEACHER'),
  [
    param('submissionId').notEmpty(),
    body('score').isInt({ min: 0 }),
    body('feedback').optional().trim()
  ],
  validate,
  teacherController.gradeSubmission
);

// Create exam
router.post(
  '/teachers/batches/:batchId/exams',
  protect,
  restrictTo('TEACHER'),
  [
    param('batchId').notEmpty(),
    body('examName').notEmpty().trim(),
    body('examDate').isISO8601(),
    body('maxScore').isInt({ min: 1 }),
    body('passingScore').isInt({ min: 0 }),
    body('instructions').optional().trim()
  ],
  validate,
  teacherController.createExam
);

// Record exam result
router.post(
  '/teachers/exams/:examId/results',
  protect,
  restrictTo('TEACHER'),
  [
    param('examId').notEmpty(),
    body('studentId').notEmpty(),
    body('score').isInt({ min: 0 })
  ],
  validate,
  teacherController.recordExamResult
);

// Mark attendance
router.post(
  '/teachers/batches/:batchId/attendance',
  protect,
  restrictTo('TEACHER'),
  [
    param('batchId').notEmpty(),
    body('studentId').notEmpty(),
    body('attendanceStatus').isIn(['PRESENT', 'ABSENT', 'LATE']),
    body('sessionDate').optional().isISO8601()
  ],
  validate,
  teacherController.markAttendance
);

module.exports = router;
