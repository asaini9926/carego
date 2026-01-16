const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// ============================================================================
// PAYMENT INITIALIZATION & VERIFICATION (Protected)
// ============================================================================

// Initialize payment
router.post(
  '/initialize',
  protect,
  paymentController.initializePayment
);

// Get payment status
router.get(
  '/:id',
  protect,
  paymentController.getPaymentStatus
);

// Verify payment
router.get(
  '/:id/verify',
  protect,
  paymentController.verifyPayment
);

// ============================================================================
// PAYMENT METHODS (Saved Cards)
// ============================================================================

// Add payment method
router.post(
  '/clients/:id/payment-methods',
  protect,
  paymentController.addPaymentMethod
);

// Get payment methods
router.get(
  '/clients/:id/payment-methods',
  protect,
  paymentController.getPaymentMethods
);

// Delete payment method
router.delete(
  '/clients/:id/payment-methods/:mid',
  protect,
  paymentController.deletePaymentMethod
);

// ============================================================================
// REFUNDS
// ============================================================================

// Initiate refund
router.post(
  '/:id/refund',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  paymentController.initiateRefund
);

// Get refund status
router.get(
  '/:id/refund',
  protect,
  paymentController.getRefundStatus
);

// ============================================================================
// WEBHOOKS (No authentication required for webhook endpoints)
// ============================================================================

// Razorpay webhook
router.post(
  '/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  paymentController.razorpayWebhook
);

// Stripe webhook
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhook
);

// Paytm webhook
router.post(
  '/webhooks/paytm',
  express.raw({ type: 'application/x-www-form-urlencoded' }),
  paymentController.paytmWebhook
);

module.exports = router;
