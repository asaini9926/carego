const express = require('express');
const { param, query, body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const recommendationsController = require('../controllers/recommendationsController');

const router = express.Router();

// ============================================================================
// RECOMMENDATIONS (Protected)
// ============================================================================

// Get recommended staff for client
router.get(
  '/staff/:clientId',
  protect,
  [
    param('clientId').notEmpty().withMessage('Client ID required'),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  recommendationsController.getStaffRecommendations
);

// Get recommended courses for student
router.get(
  '/courses/:studentId',
  protect,
  [
    param('studentId').notEmpty().withMessage('Student ID required'),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  recommendationsController.getCourseRecommendations
);

// Get recommended services for client
router.get(
  '/services/:clientId',
  protect,
  [param('clientId').notEmpty().withMessage('Client ID required')],
  validate,
  recommendationsController.getServiceRecommendations
);

// Log recommendation feedback (interaction tracking)
router.post(
  '/feedback',
  protect,
  [
    body('recommendationId').notEmpty().withMessage('Recommendation ID required'),
    body('action').isIn(['CLICKED', 'HIRED', 'IGNORED', 'SAVED']).withMessage('Invalid action')
  ],
  validate,
  recommendationsController.logRecommendationFeedback
);

// Get trending services/courses
router.get(
  '/trending',
  [
    query('entityType').optional().isIn(['COURSE', 'SERVICE']),
    query('period').optional().isIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  ],
  validate,
  recommendationsController.getTrendingItems
);

module.exports = router;
