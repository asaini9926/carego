/**
 * Staff App Routes - Phase 2 (Staff operations)
 * Prefix: /api/v1/staff
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { body, param, query, validationResult } = require('express-validator');

// Controller
const staffAppController = require('../controllers/staffAppController');

// Middleware to handle validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Get today's assignments for logged-in staff
 * GET /api/v1/staff/assignments/today
 */
router.get(
  '/assignments/today',
  protect,
  restrictTo(['STAFF']),
  staffAppController.getTodayAssignments
);

/**
 * Get past assignments (history)
 * GET /api/v1/staff/assignments/past
 */
router.get(
  '/assignments/past',
  protect,
  restrictTo(['STAFF']),
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  staffAppController.getPastAssignments
);

/**
 * Check in for assignment
 * POST /api/v1/staff/attendance/check-in
 */
router.post(
  '/attendance/check-in',
  protect,
  restrictTo(['STAFF']),
  [
    body('assignmentId').trim().notEmpty().withMessage('Assignment ID is required'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
  ],
  validateRequest,
  staffAppController.checkIn
);

/**
 * Check out from assignment
 * POST /api/v1/staff/attendance/check-out
 */
router.post(
  '/attendance/check-out',
  protect,
  restrictTo(['STAFF']),
  [
    body('assignmentId').trim().notEmpty().withMessage('Assignment ID is required'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
  ],
  validateRequest,
  staffAppController.checkOut
);

/**
 * Submit care log
 * POST /api/v1/staff/care-logs
 */
router.post(
  '/care-logs',
  protect,
  restrictTo(['STAFF']),
  [
    body('assignmentId').trim().notEmpty().withMessage('Assignment ID is required'),
    body('patientId').trim().notEmpty().withMessage('Patient ID is required'),
    body('notes').trim().notEmpty().withMessage('Notes are required'),
    body('mood').optional().isIn(['GOOD', 'FAIR', 'POOR', 'CRITICAL']).withMessage('Invalid mood value')
  ],
  validateRequest,
  staffAppController.submitCareLog
);

/**
 * Submit vitals
 * POST /api/v1/staff/vitals
 */
router.post(
  '/vitals',
  protect,
  restrictTo(['STAFF']),
  [
    body('assignmentId').trim().notEmpty().withMessage('Assignment ID is required'),
    body('patientId').trim().notEmpty().withMessage('Patient ID is required'),
    body('bpSystolic').optional().isInt({ min: 50, max: 300 }),
    body('bpDiastolic').optional().isInt({ min: 30, max: 200 }),
    body('spo2').optional().isInt({ min: 70, max: 100 }),
    body('pulse').optional().isInt({ min: 30, max: 200 }),
    body('temperature').optional().isFloat({ min: 94, max: 107 }),
    body('bloodSugar').optional().isInt({ min: 40, max: 400 })
  ],
  validateRequest,
  staffAppController.submitVitals
);

module.exports = router;
