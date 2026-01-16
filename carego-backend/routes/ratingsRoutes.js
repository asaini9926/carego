const express = require('express');
const { body, param, query } = require('express-validator');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const ratingsController = require('../controllers/ratingsController');

const router = express.Router();

// ============================================================================
// RATING CREATION & RETRIEVAL (Protected)
// ============================================================================

// Create rating
router.post(
  '/',
  protect,
  [
    body('rateeId').notEmpty().withMessage('User ID required'),
    body('ratingType').isIn(['STAFF', 'STUDENT']).withMessage('Invalid rating type'),
    body('score').isInt({ min: 1, max: 5 }).withMessage('Score must be between 1 and 5'),
    body('comment').optional().isString().trim().isLength({ max: 500 }),
    body('assignmentId').optional().notEmpty(),
    body('isAnonymous').optional().isBoolean()
  ],
  validate,
  ratingsController.createRating
);

// Get my ratings (ratings I've received)
router.get(
  '/me',
  protect,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  ratingsController.getMyRatings
);

// Get user's public ratings
router.get(
  '/users/:id/ratings',
  [
    param('id').notEmpty().withMessage('User ID required'),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  ratingsController.getUserRatings
);

// Get rating for assignment
router.get(
  '/assignment/:id',
  [param('id').notEmpty().withMessage('Assignment ID required')],
  validate,
  ratingsController.getAssignmentRating
);

// Delete rating
router.delete(
  '/:id',
  protect,
  [param('id').notEmpty().withMessage('Rating ID required')],
  validate,
  ratingsController.deleteRating
);

// Get rating summary
router.get(
  '/summary/:userId',
  [param('userId').notEmpty().withMessage('User ID required')],
  validate,
  ratingsController.getRatingSummary
);

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

// Get all ratings (admin)
router.get(
  '/admin/ratings',
  protect,
  restrictTo('ADMIN'),
  [
    query('rateeId').optional().notEmpty(),
    query('ratingType').optional().isIn(['STAFF', 'STUDENT']),
    query('minScore').optional().isInt({ min: 1, max: 5 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  ratingsController.getAllRatings
);

// Flag inappropriate rating
router.patch(
  '/admin/ratings/:id/flag',
  protect,
  restrictTo('ADMIN'),
  [
    param('id').notEmpty().withMessage('Rating ID required'),
    body('reason').notEmpty().withMessage('Reason required')
  ],
  validate,
  ratingsController.flagRating
);

module.exports = router;
