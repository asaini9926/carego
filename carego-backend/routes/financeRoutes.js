/**
 * Finance Routes - Invoicing & Payment Management
 * Phase 3: Invoices, payments, receivables, refunds
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const financeController = require('../controllers/financeController');

/**
 * ADMIN ROUTES - Invoice & Payment Management
 */

// Create invoice
router.post(
  '/invoices',
  protect,
  restrictTo('ADMIN'),
  [
    body('clientId').notEmpty(),
    body('invoiceDate').isISO8601(),
    body('dueDate').isISO8601(),
    body('items').isArray({ min: 1 }),
    body('items.*.description').notEmpty().trim(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.unitPrice').isDecimal({ min: 0 }),
    body('discount').optional().isDecimal({ min: 0 }),
    body('notes').optional().trim()
  ],
  validate,
  financeController.createInvoice
);

// Get all invoices
router.get(
  '/invoices',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  [
    query('clientId').optional().notEmpty(),
    query('status').optional().isIn(['ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  financeController.getAllInvoices
);

// Get invoice detail
router.get(
  '/invoices/:invoiceId',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  [param('invoiceId').notEmpty()],
  validate,
  financeController.getInvoiceDetail
);

// Record payment
router.post(
  '/invoices/:invoiceId/payments',
  protect,
  restrictTo('ADMIN'),
  [
    param('invoiceId').notEmpty(),
    body('amount').isDecimal({ min: 0.01 }),
    body('paymentMethod').isIn(['CASH', 'CHECK', 'BANK_TRANSFER', 'CARD', 'UPI', 'OTHER']),
    body('referenceNumber').notEmpty().trim(),
    body('paymentDate').optional().isISO8601()
  ],
  validate,
  financeController.recordPayment
);

// Get receivables aging report
router.get(
  '/receivables',
  protect,
  restrictTo('ADMIN'),
  [
    query('daysOverdue').optional().isInt({ min: 1 }),
    query('clientId').optional().notEmpty()
  ],
  validate,
  financeController.getReceivablesAging
);

// Send payment reminder
router.post(
  '/invoices/:invoiceId/reminder',
  protect,
  restrictTo('ADMIN'),
  [
    param('invoiceId').notEmpty(),
    body('reminderType').isIn(['GENTLE', 'URGENT', 'FINAL']),
    body('message').optional().trim()
  ],
  validate,
  financeController.sendPaymentReminder
);

// Process refund
router.post(
  '/invoices/:invoiceId/refund',
  protect,
  restrictTo('ADMIN'),
  [
    param('invoiceId').notEmpty(),
    body('refundAmount').isDecimal({ min: 0.01 }),
    body('reason').notEmpty().trim(),
    body('refundMethod').isIn(['ORIGINAL_PAYMENT', 'CREDIT_NOTE', 'BANK_TRANSFER', 'CHECK'])
  ],
  validate,
  financeController.processRefund
);

module.exports = router;
