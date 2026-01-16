/**
 * Client App Routes - Phase 2 (Client operations)
 * Prefix: /api/v1/client
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { param, query, validationResult } = require('express-validator');

// Controller
const clientAppController = require('../controllers/clientAppController');

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
 * Get client's own profile
 * GET /api/v1/client/profile
 */
router.get(
  '/profile',
  protect,
  restrictTo(['CLIENT']),
  clientAppController.getProfile
);

/**
 * Get all patients under this client
 * GET /api/v1/client/patients
 */
router.get(
  '/patients',
  protect,
  restrictTo(['CLIENT']),
  clientAppController.getPatients
);

/**
 * Get single patient detail
 * GET /api/v1/client/patients/:patientId
 */
router.get(
  '/patients/:patientId',
  protect,
  restrictTo(['CLIENT']),
  [param('patientId').trim().notEmpty()],
  validateRequest,
  clientAppController.getPatientDetail
);

/**
 * Get care logs for patient
 * GET /api/v1/client/patients/:patientId/care-logs
 */
router.get(
  '/patients/:patientId/care-logs',
  protect,
  restrictTo(['CLIENT']),
  [
    param('patientId').trim().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  clientAppController.getCareLogs
);

/**
 * Get vitals timeline for patient
 * GET /api/v1/client/patients/:patientId/vitals
 */
router.get(
  '/patients/:patientId/vitals',
  protect,
  restrictTo(['CLIENT']),
  [
    param('patientId').trim().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  clientAppController.getVitals
);

/**
 * Get assignments for patient
 * GET /api/v1/client/patients/:patientId/assignments
 */
router.get(
  '/patients/:patientId/assignments',
  protect,
  restrictTo(['CLIENT']),
  [param('patientId').trim().notEmpty()],
  validateRequest,
  clientAppController.getAssignments
);

/**
 * Get daily summary for patient
 * GET /api/v1/client/patients/:patientId/daily-summary?date=2026-01-16
 */
router.get(
  '/patients/:patientId/daily-summary',
  protect,
  restrictTo(['CLIENT']),
  [
    param('patientId').trim().notEmpty(),
    query('date').notEmpty().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date format must be YYYY-MM-DD')
  ],
  validateRequest,
  clientAppController.getDailySummary
);

module.exports = router;
