/**
 * Analytics Routes - Business Intelligence & Reporting
 * Phase 3: Analytics, dashboards, reports, metrics
 */

const express = require('express');
const { query, param } = require('express-validator');
const router = express.Router();

const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const analyticsController = require('../controllers/analyticsController');

/**
 * ADMIN ROUTES - Analytics & Reporting
 */

// Get staff utilization dashboard
router.get(
  '/staff-utilization',
  protect,
  restrictTo('ADMIN'),
  [
    query('cityId').optional().notEmpty(),
    query('dateRange').optional().isIn(['7days', '30days', '90days', 'year'])
  ],
  validate,
  analyticsController.getStaffUtilization
);

// Get client retention analytics
router.get(
  '/client-retention',
  protect,
  restrictTo('ADMIN'),
  [
    query('cityId').optional().notEmpty()
  ],
  validate,
  analyticsController.getClientRetention
);

// Get revenue analytics
router.get(
  '/revenue',
  protect,
  restrictTo('ADMIN'),
  [
    query('period').optional().isIn(['daily', 'monthly', 'yearly']),
    query('cityId').optional().notEmpty()
  ],
  validate,
  analyticsController.getRevenueAnalytics
);

// Get training course pipeline
router.get(
  '/course-pipeline',
  protect,
  restrictTo('ADMIN'),
  [
    query('cityId').optional().notEmpty()
  ],
  validate,
  analyticsController.getCoursePipeline
);

// Get performance metrics dashboard
router.get(
  '/performance',
  protect,
  restrictTo('ADMIN'),
  [
    query('dateRange').optional().isIn(['7days', '30days', '90days']),
    query('cityId').optional().notEmpty()
  ],
  validate,
  analyticsController.getPerformanceMetrics
);

// Get city-wise comparison report
router.get(
  '/city-comparison',
  protect,
  restrictTo('ADMIN'),
  analyticsController.getCityComparison
);

// Get financial health dashboard
router.get(
  '/financial-health',
  protect,
  restrictTo('ADMIN'),
  analyticsController.getFinancialHealth
);

module.exports = router;
