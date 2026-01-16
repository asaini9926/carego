/**
 * Admin Routes - Phase 2 (Staff, Client, Assignments Management)
 * Prefix: /api/v1/admin
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { body, param, query, validationResult } = require('express-validator');

// Controllers
const staffController = require('../controllers/staffController');
const clientController = require('../controllers/clientController');
const assignmentController = require('../controllers/assignmentController');

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

// ============= STAFF ROUTES =============

/**
 * Create new staff user
 * POST /api/v1/admin/staff/create
 */
router.post(
  '/staff/create',
  protect,
  restrictTo(['ADMIN']),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('cityId').trim().notEmpty().withMessage('City ID is required'),
    body('specialization').trim().notEmpty().withMessage('Specialization is required')
  ],
  validateRequest,
  staffController.createStaff
);

/**
 * Get all staff
 * GET /api/v1/admin/staff
 */
router.get(
  '/staff',
  protect,
  restrictTo(['ADMIN']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  staffController.getAllStaff
);

/**
 * Get staff detail
 * GET /api/v1/admin/staff/:staffId
 */
router.get(
  '/staff/:staffId',
  protect,
  restrictTo(['ADMIN']),
  [param('staffId').trim().notEmpty()],
  validateRequest,
  staffController.getStaffDetail
);

/**
 * Verify staff
 * POST /api/v1/admin/staff/:staffId/verify
 */
router.post(
  '/staff/:staffId/verify',
  protect,
  restrictTo(['ADMIN']),
  [
    param('staffId').trim().notEmpty(),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  validateRequest,
  staffController.verifyStaff
);

/**
 * Suspend staff
 * POST /api/v1/admin/staff/:staffId/suspend
 */
router.post(
  '/staff/:staffId/suspend',
  protect,
  restrictTo(['ADMIN']),
  [
    param('staffId').trim().notEmpty(),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  validateRequest,
  staffController.suspendStaff
);

/**
 * Terminate staff
 * POST /api/v1/admin/staff/:staffId/terminate
 */
router.post(
  '/staff/:staffId/terminate',
  protect,
  restrictTo(['ADMIN']),
  [
    param('staffId').trim().notEmpty(),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  validateRequest,
  staffController.terminateStaff
);

// ============= CLIENT ROUTES =============

/**
 * Create new client
 * POST /api/v1/admin/clients/create
 */
router.post(
  '/clients/create',
  protect,
  restrictTo(['ADMIN']),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('cityId').trim().notEmpty().withMessage('City ID is required')
  ],
  validateRequest,
  clientController.createClient
);

/**
 * Get all clients
 * GET /api/v1/admin/clients
 */
router.get(
  '/clients',
  protect,
  restrictTo(['ADMIN']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  clientController.getAllClients
);

/**
 * Get client detail
 * GET /api/v1/admin/clients/:clientId
 */
router.get(
  '/clients/:clientId',
  protect,
  restrictTo(['ADMIN']),
  [param('clientId').trim().notEmpty()],
  validateRequest,
  clientController.getClientDetail
);

/**
 * Add patient to client
 * POST /api/v1/admin/clients/:clientId/patients
 */
router.post(
  '/clients/:clientId/patients',
  protect,
  restrictTo(['ADMIN']),
  [
    param('clientId').trim().notEmpty(),
    body('name').trim().notEmpty().withMessage('Patient name is required'),
    body('age').isInt({ min: 0, max: 150 }).withMessage('Valid age is required')
  ],
  validateRequest,
  clientController.addPatient
);

/**
 * Get client's patients
 * GET /api/v1/admin/clients/:clientId/patients
 */
router.get(
  '/clients/:clientId/patients',
  protect,
  restrictTo(['ADMIN']),
  [param('clientId').trim().notEmpty()],
  validateRequest,
  clientController.getClientPatients
);

/**
 * Update patient
 * PATCH /api/v1/admin/clients/:clientId/patients/:patientId
 */
router.patch(
  '/clients/:clientId/patients/:patientId',
  protect,
  restrictTo(['ADMIN']),
  [
    param('clientId').trim().notEmpty(),
    param('patientId').trim().notEmpty()
  ],
  validateRequest,
  clientController.updatePatient
);

// ============= ASSIGNMENT ROUTES =============

/**
 * Create new assignment
 * POST /api/v1/admin/assignments
 */
router.post(
  '/assignments',
  protect,
  restrictTo(['ADMIN']),
  [
    body('staffId').trim().notEmpty().withMessage('Staff ID is required'),
    body('patientId').trim().notEmpty().withMessage('Patient ID is required'),
    body('shift').trim().notEmpty().withMessage('Shift is required'),
    body('startDate').notEmpty().withMessage('Start date is required')
  ],
  validateRequest,
  assignmentController.createAssignment
);

/**
 * Get all assignments
 * GET /api/v1/admin/assignments
 */
router.get(
  '/assignments',
  protect,
  restrictTo(['ADMIN']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  assignmentController.getAllAssignments
);

/**
 * Get assignment detail
 * GET /api/v1/admin/assignments/:assignmentId
 */
router.get(
  '/assignments/:assignmentId',
  protect,
  restrictTo(['ADMIN']),
  [param('assignmentId').trim().notEmpty()],
  validateRequest,
  assignmentController.getAssignmentDetail
);

/**
 * Pause assignment
 * POST /api/v1/admin/assignments/:assignmentId/pause
 */
router.post(
  '/assignments/:assignmentId/pause',
  protect,
  restrictTo(['ADMIN']),
  [
    param('assignmentId').trim().notEmpty(),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  validateRequest,
  assignmentController.pauseAssignment
);

/**
 * Resume assignment
 * POST /api/v1/admin/assignments/:assignmentId/resume
 */
router.post(
  '/assignments/:assignmentId/resume',
  protect,
  restrictTo(['ADMIN']),
  [
    param('assignmentId').trim().notEmpty(),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  validateRequest,
  assignmentController.resumeAssignment
);

/**
 * End assignment
 * POST /api/v1/admin/assignments/:assignmentId/end
 */
router.post(
  '/assignments/:assignmentId/end',
  protect,
  restrictTo(['ADMIN']),
  [
    param('assignmentId').trim().notEmpty(),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  validateRequest,
  assignmentController.endAssignment
);

module.exports = router;
