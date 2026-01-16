/**
 * Finance Controller - Invoicing & Payments
 * Phase 3: Admin manages invoices, payments, receivables, refunds
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');
const { generateId } = require('../utils/validators');
const { logAction } = require('../services/auditService');

/**
 * Create invoice
 * POST /api/v1/finance/invoices
 */
exports.createInvoice = asyncHandler(async (req, res) => {
  const { clientId, invoiceDate, dueDate, items, notes, discount = 0 } = req.body;

  if (!clientId || !invoiceDate || !dueDate || !items || items.length === 0) {
    throw new ApiError('clientId, invoiceDate, dueDate, and items are required', 400);
  }

  // Check client exists
  const [clientCheck] = await db.execute('SELECT id FROM clients WHERE id = ?', [clientId]);
  if (clientCheck.length === 0) {
    throw new ApiError('Client not found', 404);
  }

  // Validate items
  let totalAmount = 0;
  for (const item of items) {
    if (!item.description || !item.quantity || !item.unitPrice) {
      throw new ApiError('Each item must have description, quantity, unitPrice', 400);
    }
    if (item.quantity < 1 || item.unitPrice < 0) {
      throw new ApiError('Invalid quantity or unitPrice', 400);
    }
    totalAmount += item.quantity * item.unitPrice;
  }

  if (discount < 0 || discount > totalAmount) {
    throw new ApiError('Invalid discount amount', 400);
  }

  const finalAmount = totalAmount - discount;
  const invoiceId = generateId();
  const invoiceDateObj = new Date(invoiceDate);
  const dueDateObj = new Date(dueDate);

  // Create invoice
  const [insertResult] = await db.execute(
    `INSERT INTO invoices (id, client_id, invoice_date, due_date, total_amount, discount_amount, final_amount, notes, invoice_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', NOW())`,
    [invoiceId, clientId, invoiceDateObj, dueDateObj, totalAmount, discount, finalAmount, notes || null]
  );

  // Add items
  for (const item of items) {
    const itemId = generateId();
    await db.execute(
      `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, line_amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [itemId, invoiceId, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
    );
  }

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Invoice',
    entityId: invoiceId,
    newValues: { client_id: clientId, total_amount: totalAmount, final_amount: finalAmount },
    changeReason: 'Invoice created',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: {
      invoiceId,
      clientId,
      totalAmount,
      discount,
      finalAmount,
      status: 'ISSUED',
      dueDate: dueDateObj
    }
  });
});

/**
 * Get all invoices
 * GET /api/v1/finance/invoices?clientId=xxx&status=ISSUED&page=1&limit=20
 */
exports.getAllInvoices = asyncHandler(async (req, res) => {
  const { clientId, status, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT id, client_id, invoice_date, due_date, total_amount, discount_amount, final_amount, invoice_status, created_at
    FROM invoices
    WHERE 1=1
  `;

  const params = [];

  if (clientId) {
    query += ' AND client_id = ?';
    params.push(clientId);
  }

  if (status) {
    query += ' AND invoice_status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

  const [invoices] = await db.execute(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM invoices WHERE 1=1';
  const countParams = [];

  if (clientId) {
    countQuery += ' AND client_id = ?';
    countParams.push(clientId);
  }
  if (status) {
    countQuery += ' AND invoice_status = ?';
    countParams.push(status);
  }

  const [countResult] = await db.execute(countQuery, countParams);

  res.json({
    success: true,
    data: invoices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult[0]?.total || 0,
      pages: Math.ceil((countResult[0]?.total || 0) / parseInt(limit))
    }
  });
});

/**
 * Get invoice detail with items and payments
 * GET /api/v1/finance/invoices/:invoiceId
 */
exports.getInvoiceDetail = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  const [invoiceData] = await db.execute(`
    SELECT id, client_id, invoice_date, due_date, total_amount, discount_amount, final_amount, invoice_status, notes, created_at
    FROM invoices
    WHERE id = ?
  `, [invoiceId]);

  if (invoiceData.length === 0) {
    throw new ApiError('Invoice not found', 404);
  }

  const invoice = invoiceData[0];

  // Get items
  const [items] = await db.execute(`
    SELECT id, description, quantity, unit_price, line_amount
    FROM invoice_items
    WHERE invoice_id = ?
  `, [invoiceId]);

  // Get payments
  const [payments] = await db.execute(`
    SELECT id, payment_date, amount, payment_method, reference_number, payment_status
    FROM invoice_payments
    WHERE invoice_id = ?
    ORDER BY payment_date DESC
  `, [invoiceId]);

  // Calculate paid amount
  const paidAmount = payments.reduce((sum, p) => sum + (p.payment_status === 'COMPLETED' ? p.amount : 0), 0);

  res.json({
    success: true,
    data: {
      ...invoice,
      items,
      payments,
      paidAmount,
      remainingAmount: invoice.final_amount - paidAmount
    }
  });
});

/**
 * Record payment against invoice
 * POST /api/v1/finance/invoices/:invoiceId/payments
 */
exports.recordPayment = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;
  const { amount, paymentMethod, referenceNumber, paymentDate } = req.body;

  if (!amount || !paymentMethod || !referenceNumber) {
    throw new ApiError('amount, paymentMethod, and referenceNumber are required', 400);
  }

  if (amount <= 0) {
    throw new ApiError('amount must be > 0', 400);
  }

  const validMethods = ['CASH', 'CHECK', 'BANK_TRANSFER', 'CARD', 'UPI', 'OTHER'];
  if (!validMethods.includes(paymentMethod)) {
    throw new ApiError(`Invalid method. Must be: ${validMethods.join(', ')}`, 400);
  }

  // Get invoice
  const [invoiceData] = await db.execute(
    'SELECT client_id, final_amount FROM invoices WHERE id = ?',
    [invoiceId]
  );

  if (invoiceData.length === 0) {
    throw new ApiError('Invoice not found', 404);
  }

  // Check amount doesn't exceed remaining
  const [payments] = await db.execute(
    'SELECT SUM(CASE WHEN payment_status = \'COMPLETED\' THEN amount ELSE 0 END) as paid FROM invoice_payments WHERE invoice_id = ?',
    [invoiceId]
  );

  const paidAmount = payments[0]?.paid || 0;
  const remainingAmount = invoiceData[0].final_amount - paidAmount;

  if (amount > remainingAmount) {
    throw new ApiError(`Amount exceeds remaining balance of ${remainingAmount}`, 400);
  }

  const paymentId = generateId();
  const payDateObj = paymentDate ? new Date(paymentDate) : new Date();

  await db.execute(
    `INSERT INTO invoice_payments (id, invoice_id, payment_date, amount, payment_method, reference_number, payment_status, recorded_by, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, NOW())`,
    [paymentId, invoiceId, payDateObj, amount, paymentMethod, referenceNumber, req.user.uid]
  );

  // Update invoice status if fully paid
  if (paidAmount + amount >= invoiceData[0].final_amount) {
    await db.execute('UPDATE invoices SET invoice_status = ? WHERE id = ?', ['PAID', invoiceId]);
  } else if (paidAmount + amount > 0) {
    await db.execute('UPDATE invoices SET invoice_status = ? WHERE id = ?', ['PARTIALLY_PAID', invoiceId]);
  }

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Payment',
    entityId: paymentId,
    newValues: { invoice_id: invoiceId, amount, payment_method: paymentMethod },
    changeReason: 'Payment recorded',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: {
      paymentId,
      invoiceId,
      amount,
      paymentMethod,
      paymentDate: payDateObj,
      newInvoiceStatus: paidAmount + amount >= invoiceData[0].final_amount ? 'PAID' : 'PARTIALLY_PAID'
    }
  });
});

/**
 * Get receivables aging report
 * GET /api/v1/finance/receivables?daysOverdue=30&clientId=xxx
 */
exports.getReceivablesAging = asyncHandler(async (req, res) => {
  const { daysOverdue = 30, clientId } = req.query;

  let query = `
    SELECT 
      i.id, i.client_id, i.invoice_date, i.due_date, i.final_amount,
      COALESCE(SUM(CASE WHEN ip.payment_status = 'COMPLETED' THEN ip.amount ELSE 0 END), 0) as paid_amount,
      i.final_amount - COALESCE(SUM(CASE WHEN ip.payment_status = 'COMPLETED' THEN ip.amount ELSE 0 END), 0) as outstanding_amount,
      DATEDIFF(NOW(), i.due_date) as days_overdue,
      CASE 
        WHEN DATEDIFF(NOW(), i.due_date) > ? THEN 'OVERDUE'
        WHEN DATEDIFF(NOW(), i.due_date) > 0 THEN 'DUE'
        ELSE 'UPCOMING'
      END as aging_bucket
    FROM invoices i
    LEFT JOIN invoice_payments ip ON i.id = ip.invoice_id
    WHERE i.invoice_status IN ('ISSUED', 'PARTIALLY_PAID')
  `;

  const params = [parseInt(daysOverdue)];

  if (clientId) {
    query += ' AND i.client_id = ?';
    params.push(clientId);
  }

  query += ' GROUP BY i.id ORDER BY i.due_date ASC';

  const [receivables] = await db.execute(query, params);

  // Summary
  const summary = {
    totalOutstanding: receivables.reduce((sum, r) => sum + r.outstanding_amount, 0),
    overdue: receivables.filter(r => r.days_overdue > parseInt(daysOverdue)).reduce((sum, r) => sum + r.outstanding_amount, 0),
    dueCount: receivables.length,
    overdueCount: receivables.filter(r => r.days_overdue > parseInt(daysOverdue)).length
  };

  res.json({
    success: true,
    data: receivables,
    summary
  });
});

/**
 * Send payment reminder
 * POST /api/v1/finance/invoices/:invoiceId/reminder
 */
exports.sendPaymentReminder = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;
  const { reminderType, message } = req.body;

  if (!reminderType) {
    throw new ApiError('reminderType is required', 400);
  }

  const validTypes = ['GENTLE', 'URGENT', 'FINAL'];
  if (!validTypes.includes(reminderType)) {
    throw new ApiError(`Invalid type. Must be: ${validTypes.join(', ')}`, 400);
  }

  // Get invoice
  const [invoiceData] = await db.execute(`
    SELECT i.id, i.client_id, c.email, i.final_amount,
    COALESCE(SUM(CASE WHEN ip.payment_status = 'COMPLETED' THEN ip.amount ELSE 0 END), 0) as paid_amount
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN invoice_payments ip ON i.id = ip.invoice_id
    WHERE i.id = ?
    GROUP BY i.id
  `, [invoiceId]);

  if (invoiceData.length === 0) {
    throw new ApiError('Invoice not found', 404);
  }

  const invoice = invoiceData[0];
  const outstandingAmount = invoice.final_amount - invoice.paid_amount;

  // In real implementation, this would send email via mail service
  // For now, log action only
  const reminderId = generateId();

  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'PaymentReminder',
    entityId: reminderId,
    newValues: { invoice_id: invoiceId, reminder_type: reminderType, sent_to: invoice.email },
    changeReason: message || `${reminderType} payment reminder sent`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Payment reminder sent successfully',
    data: {
      reminderId,
      invoiceId,
      clientId: invoice.client_id,
      reminderType,
      emailSentTo: invoice.email,
      outstandingAmount
    }
  });
});

/**
 * Process refund
 * POST /api/v1/finance/invoices/:invoiceId/refund
 */
exports.processRefund = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;
  const { refundAmount, reason, refundMethod } = req.body;

  if (!refundAmount || !reason || !refundMethod) {
    throw new ApiError('refundAmount, reason, and refundMethod are required', 400);
  }

  if (refundAmount <= 0) {
    throw new ApiError('refundAmount must be > 0', 400);
  }

  const validMethods = ['ORIGINAL_PAYMENT', 'CREDIT_NOTE', 'BANK_TRANSFER', 'CHECK'];
  if (!validMethods.includes(refundMethod)) {
    throw new ApiError(`Invalid method. Must be: ${validMethods.join(', ')}`, 400);
  }

  // Get invoice with payments
  const [invoiceData] = await db.execute(`
    SELECT i.id, i.client_id, i.final_amount,
    COALESCE(SUM(CASE WHEN ip.payment_status = 'COMPLETED' THEN ip.amount ELSE 0 END), 0) as paid_amount
    FROM invoices i
    LEFT JOIN invoice_payments ip ON i.id = ip.invoice_id
    WHERE i.id = ?
    GROUP BY i.id
  `, [invoiceId]);

  if (invoiceData.length === 0) {
    throw new ApiError('Invoice not found', 404);
  }

  const invoice = invoiceData[0];

  if (refundAmount > invoice.paid_amount) {
    throw new ApiError(`Refund amount cannot exceed paid amount of ${invoice.paid_amount}`, 400);
  }

  const refundId = generateId();

  await db.execute(
    `INSERT INTO invoice_refunds (id, invoice_id, refund_amount, refund_method, reason, refund_status, processed_by, processed_at)
     VALUES (?, ?, ?, ?, ?, 'PROCESSED', ?, NOW())`,
    [refundId, invoiceId, refundAmount, refundMethod, reason, req.user.uid]
  );

  // Update invoice status
  const newPaidAmount = invoice.paid_amount - refundAmount;
  if (newPaidAmount === 0) {
    await db.execute('UPDATE invoices SET invoice_status = ? WHERE id = ?', ['ISSUED', invoiceId]);
  } else if (newPaidAmount < invoice.final_amount) {
    await db.execute('UPDATE invoices SET invoice_status = ? WHERE id = ?', ['PARTIALLY_PAID', invoiceId]);
  }

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Refund',
    entityId: refundId,
    newValues: { invoice_id: invoiceId, refund_amount: refundAmount, reason },
    changeReason: `Refund processed: ${reason}`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Refund processed successfully',
    data: {
      refundId,
      invoiceId,
      refundAmount,
      refundMethod,
      newInvoiceStatus: newPaidAmount === 0 ? 'ISSUED' : 'PARTIALLY_PAID'
    }
  });
});
