/**
 * Subscription Routes - Care Shield Plans & Subscriptions
 * Phase 3: Subscription plans, client enrollments, management
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const subscriptionController = require('../controllers/subscriptionController');

/**
 * ADMIN ROUTES - Plan Management
 */

// Create subscription plan
router.post(
  '/plans',
  protect,
  restrictTo('ADMIN'),
  [
    body('planName').notEmpty().trim(),
    body('planCode').notEmpty().trim().isLength({ min: 2, max: 20 }),
    body('monthlyPrice').isDecimal({ min: 0 }),
    body('features').isArray({ min: 1 }),
    body('billingCycle').isIn(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL']),
    body('maxUsers').optional().isInt({ min: 1 }),
    body('description').optional().trim()
  ],
  validate,
  subscriptionController.createPlan
);

// Get all subscription plans
router.get(
  '/plans',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  [
    query('isActive').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  subscriptionController.getAllPlans
);

// Get plan detail
router.get(
  '/plans/:planId',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  [param('planId').notEmpty()],
  validate,
  subscriptionController.getPlanDetail
);

/**
 * ADMIN & CLIENT ROUTES - Subscription Management
 */

// Enroll client in subscription plan
router.post(
  '/enroll',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  [
    body('clientId').notEmpty(),
    body('planId').notEmpty(),
    body('startDate').isISO8601(),
    body('paymentMethod').isIn(['CARD', 'BANK_TRANSFER', 'UPI', 'CHECK'])
  ],
  validate,
  subscriptionController.enrollClientSubscription
);

// Get client's active subscription
router.get(
  '/clients/:clientId',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  [param('clientId').notEmpty()],
  validate,
  subscriptionController.getClientSubscription
);

// Upgrade subscription plan
router.post(
  '/:subscriptionId/upgrade',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  [
    param('subscriptionId').notEmpty(),
    body('newPlanId').notEmpty(),
    body('effectiveDate').isISO8601(),
    body('reason').optional().trim()
  ],
  validate,
  subscriptionController.upgradeSubscription
);

// Renew subscription
router.post(
  '/:subscriptionId/renew',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  [
    param('subscriptionId').notEmpty(),
    body('paymentReference').notEmpty().trim()
  ],
  validate,
  subscriptionController.renewSubscription
);

// Cancel subscription
router.post(
  '/:subscriptionId/cancel',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  [
    param('subscriptionId').notEmpty(),
    body('reason').notEmpty().trim(),
    body('refundEligible').optional().isBoolean()
  ],
  validate,
  subscriptionController.cancelSubscription
);

module.exports = router;
