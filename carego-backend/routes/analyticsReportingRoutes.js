const express = require('express');
const { body, param, query } = require('express-validator');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const analyticsReportingController = require('../controllers/analyticsReportingController');

const router = express.Router();

// ============================================================================
// REPORT LIFECYCLE (Protected - Admin Only)
// ============================================================================

// Create report
router.post(
  '/reports',
  protect,
  restrictTo('ADMIN'),
  [
    body('reportType').isIn([
      'REVENUE',
      'STAFF_PERFORMANCE',
      'STUDENT_SUCCESS',
      'UTILIZATION',
      'CHURN_ANALYSIS',
      'FINANCIAL_HEALTH',
      'CLIENT_METRICS'
    ]).withMessage('Invalid report type'),
    body('filterJson').optional().isObject()
  ],
  validate,
  analyticsReportingController.createReport
);

// Get reports list
router.get(
  '/reports',
  protect,
  restrictTo('ADMIN'),
  [
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
    query('reportType').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  analyticsReportingController.getReports
);

// Get report detail
router.get(
  '/reports/:id',
  protect,
  restrictTo('ADMIN'),
  [param('id').notEmpty().withMessage('Report ID required')],
  validate,
  analyticsReportingController.getReportDetail
);

// Download report (CSV, JSON, PDF)
router.get(
  '/reports/:id/download',
  protect,
  restrictTo('ADMIN'),
  [
    param('id').notEmpty().withMessage('Report ID required'),
    query('format').optional().isIn(['csv', 'json', 'pdf']).withMessage('Invalid format')
  ],
  validate,
  analyticsReportingController.downloadReport
);

// Delete report
router.delete(
  '/reports/:id',
  protect,
  restrictTo('ADMIN'),
  [param('id').notEmpty().withMessage('Report ID required')],
  validate,
  analyticsReportingController.deleteReport
);

// ============================================================================
// SCHEDULED REPORTS
// ============================================================================

// Create scheduled report
router.post(
  '/scheduled-reports',
  protect,
  restrictTo('ADMIN'),
  [
    body('reportType').notEmpty().withMessage('Report type required'),
    body('frequency').isIn(['DAILY', 'WEEKLY', 'MONTHLY']).withMessage('Invalid frequency'),
    body('recipientEmails').isArray({ min: 1 }).withMessage('At least one recipient email required'),
    body('filterJson').optional().isObject()
  ],
  validate,
  analyticsReportingController.createScheduledReport
);

// Get scheduled reports
router.get(
  '/scheduled-reports',
  protect,
  restrictTo('ADMIN'),
  [
    query('isActive').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  analyticsReportingController.getScheduledReports
);

// Get scheduled report detail
router.get(
  '/scheduled-reports/:id',
  protect,
  restrictTo('ADMIN'),
  [param('id').notEmpty().withMessage('Schedule ID required')],
  validate,
  analyticsReportingController.getScheduledReportDetail
);

// Update scheduled report
router.patch(
  '/scheduled-reports/:id',
  protect,
  restrictTo('ADMIN'),
  [
    param('id').notEmpty().withMessage('Schedule ID required'),
    body('frequency').optional().isIn(['DAILY', 'WEEKLY', 'MONTHLY']),
    body('recipientEmails').optional().isArray(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  analyticsReportingController.updateScheduledReport
);

// Delete scheduled report
router.delete(
  '/scheduled-reports/:id',
  protect,
  restrictTo('ADMIN'),
  [param('id').notEmpty().withMessage('Schedule ID required')],
  validate,
  analyticsReportingController.deleteScheduledReport
);

// ============================================================================
// REPORT TEMPLATES
// ============================================================================

// Get report templates
router.get(
  '/report-templates',
  protect,
  restrictTo('ADMIN'),
  analyticsReportingController.getReportTemplates
);

// Get template detail
router.get(
  '/report-templates/:id',
  protect,
  restrictTo('ADMIN'),
  [param('id').notEmpty().withMessage('Template ID required')],
  validate,
  analyticsReportingController.getReportTemplateDetail
);

// ============================================================================
// DASHBOARDS (Pre-computed, Real-time)
// ============================================================================

// Executive dashboard (KPIs)
router.get(
  '/dashboards/executive',
  protect,
  restrictTo('ADMIN'),
  [query('dateRange').optional().isIn(['7days', '30days', '90days', 'ytd'])],
  validate,
  analyticsReportingController.getExecutiveDashboard
);

// Finance dashboard (Revenue, payments, subscriptions)
router.get(
  '/dashboards/finance',
  protect,
  restrictTo('ADMIN'),
  analyticsReportingController.getFinanceDashboard
);

// Operations dashboard (Staff, assignments, attendance)
router.get(
  '/dashboards/operations',
  protect,
  restrictTo('ADMIN'),
  analyticsReportingController.getOperationsDashboard
);

module.exports = router;
