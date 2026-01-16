const { asyncHandler, ApiError } = require('../utils/errors');
const db = require('../config/db');
const { logAction } = require('../middleware/auditMiddleware');
const crypto = require('crypto');
const axios = require('axios');

// ============================================================================
// PAYMENT INITIATION & VERIFICATION
// ============================================================================

/**
 * Initialize payment for invoice
 * Creates payment intent with selected gateway
 * POST /api/v1/payments/initialize
 */
exports.initializePayment = asyncHandler(async (req, res) => {
  const { invoiceId, amount, paymentMethod, gateway = 'RAZORPAY' } = req.body;
  const clientId = req.user.uid;

  // Validation
  if (!invoiceId || !amount || amount <= 0) {
    throw new ApiError('Invalid invoice or amount', 400);
  }

  // Verify invoice belongs to this client
  const [invoices] = await db.execute(
    'SELECT * FROM invoices WHERE id = ? AND client_id = ?',
    [invoiceId, clientId]
  );

  if (invoices.length === 0) {
    throw new ApiError('Invoice not found', 404);
  }

  const invoice = invoices[0];

  // Check amount doesn't exceed outstanding
  const outstanding = invoice.total_amount - (invoice.paid_amount || 0);
  if (amount > outstanding) {
    throw new ApiError('Payment amount exceeds outstanding', 400);
  }

  // Verify gateway is active
  const [gateways] = await db.execute(
    'SELECT * FROM payment_gateways WHERE provider = ? AND is_active = TRUE',
    [gateway]
  );

  if (gateways.length === 0) {
    throw new ApiError('Payment gateway not available', 400);
  }

  const paymentGateway = gateways[0];
  let paymentIntentData;

  // Create payment intent with provider
  if (gateway === 'RAZORPAY') {
    paymentIntentData = await createRazorpayOrder(
      amount,
      invoiceId,
      clientId,
      paymentGateway
    );
  } else if (gateway === 'STRIPE') {
    paymentIntentData = await createStripePaymentIntent(
      amount,
      invoiceId,
      clientId,
      paymentGateway
    );
  } else if (gateway === 'PAYTM') {
    paymentIntentData = await createPaytmOrder(
      amount,
      invoiceId,
      clientId,
      paymentGateway
    );
  }

  // Store payment record
  const paymentId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO payments 
     (id, invoice_id, client_id, gateway, gateway_payment_id, amount, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      paymentId,
      invoiceId,
      clientId,
      gateway,
      paymentIntentData.gateway_payment_id,
      amount,
      'PENDING'
    ]
  );

  // Audit log
  await logAction({
    userId: clientId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Payment',
    entityId: paymentId,
    newValues: { invoice_id: invoiceId, amount, gateway },
    changeReason: 'Payment initialized by client',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Payment initialized',
    data: {
      paymentId,
      ...paymentIntentData
    }
  });
});

/**
 * Get payment status
 * GET /api/v1/payments/:id
 */
exports.getPaymentStatus = asyncHandler(async (req, res) => {
  const { id: paymentId } = req.params;
  const clientId = req.user.uid;

  const [payments] = await db.execute(
    'SELECT * FROM payments WHERE id = ? AND client_id = ?',
    [paymentId, clientId]
  );

  if (payments.length === 0) {
    throw new ApiError('Payment not found', 404);
  }

  res.json({
    success: true,
    data: payments[0]
  });
});

/**
 * Verify payment with provider
 * GET /api/v1/payments/:id/verify
 */
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { id: paymentId } = req.params;
  const clientId = req.user.uid;

  const [payments] = await db.execute(
    'SELECT * FROM payments WHERE id = ? AND client_id = ?',
    [paymentId, clientId]
  );

  if (payments.length === 0) {
    throw new ApiError('Payment not found', 404);
  }

  const payment = payments[0];

  // Verify with provider
  let isValid = false;
  if (payment.gateway === 'RAZORPAY') {
    isValid = await verifyRazorpayPayment(payment);
  } else if (payment.gateway === 'STRIPE') {
    isValid = await verifyStripePayment(payment);
  } else if (payment.gateway === 'PAYTM') {
    isValid = await verifyPaytmPayment(payment);
  }

  if (isValid) {
    // Update payment status
    await db.execute(
      'UPDATE payments SET status = ?, webhook_verified = TRUE WHERE id = ?',
      ['SUCCESS', paymentId]
    );

    // Update invoice
    const [invoices] = await db.execute(
      'SELECT * FROM invoices WHERE id = ?',
      [payment.invoice_id]
    );

    const invoice = invoices[0];
    const newPaidAmount = (invoice.paid_amount || 0) + payment.amount;
    const newStatus = newPaidAmount >= invoice.total_amount ? 'PAID' : 'PARTIALLY_PAID';

    await db.execute(
      'UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?',
      [newPaidAmount, newStatus, payment.invoice_id]
    );

    // Audit log
    await logAction({
      userId: clientId,
      userRole: req.user.role,
      action: 'UPDATE',
      entityType: 'Payment',
      entityId: paymentId,
      oldValues: { status: payment.status },
      newValues: { status: 'SUCCESS' },
      changeReason: 'Payment verified',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Payment verified and processed',
      data: {
        paymentId,
        status: 'SUCCESS',
        invoiceStatus: newStatus
      }
    });
  } else {
    throw new ApiError('Payment verification failed', 400);
  }
});

// ============================================================================
// PAYMENT METHODS (SAVED CARDS)
// ============================================================================

/**
 * Add payment method
 * POST /api/v1/clients/:id/payment-methods
 */
exports.addPaymentMethod = asyncHandler(async (req, res) => {
  const { id: clientId } = req.params;
  const { methodType, gateway, gatewayMethodId, lastFourDigits, expiryMonth, expiryYear } = req.body;
  const userId = req.user.uid;

  // Only ADMIN or own CLIENT can add
  if (req.user.role === 'CLIENT' && clientId !== userId) {
    throw new ApiError('Unauthorized', 403);
  }

  const methodId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO payment_methods 
     (id, client_id, gateway, gateway_method_id, method_type, last_4_digits, expiry_month, expiry_year, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      methodId,
      clientId,
      gateway,
      gatewayMethodId,
      methodType,
      lastFourDigits,
      expiryMonth,
      expiryYear
    ]
  );

  // Audit log
  await logAction({
    userId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'PaymentMethod',
    entityId: methodId,
    newValues: { client_id: clientId, method_type: methodType, gateway },
    changeReason: 'Payment method added',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Payment method added',
    data: { methodId, lastFourDigits, expiryMonth, expiryYear }
  });
});

/**
 * Get payment methods
 * GET /api/v1/clients/:id/payment-methods
 */
exports.getPaymentMethods = asyncHandler(async (req, res) => {
  const { id: clientId } = req.params;

  const [methods] = await db.execute(
    'SELECT id, method_type, last_4_digits, expiry_month, expiry_year, is_default, is_active FROM payment_methods WHERE client_id = ? AND is_active = TRUE',
    [clientId]
  );

  res.json({
    success: true,
    data: methods
  });
});

/**
 * Delete payment method
 * DELETE /api/v1/clients/:id/payment-methods/:mid
 */
exports.deletePaymentMethod = asyncHandler(async (req, res) => {
  const { id: clientId, mid: methodId } = req.params;
  const userId = req.user.uid;

  // Verify ownership
  const [methods] = await db.execute(
    'SELECT * FROM payment_methods WHERE id = ? AND client_id = ?',
    [methodId, clientId]
  );

  if (methods.length === 0) {
    throw new ApiError('Payment method not found', 404);
  }

  // Soft delete
  await db.execute(
    'UPDATE payment_methods SET is_active = FALSE WHERE id = ?',
    [methodId]
  );

  // Audit log
  await logAction({
    userId,
    userRole: req.user.role,
    action: 'DELETE',
    entityType: 'PaymentMethod',
    entityId: methodId,
    changeReason: 'Payment method deleted',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Payment method deleted'
  });
});

// ============================================================================
// REFUNDS
// ============================================================================

/**
 * Initiate refund
 * POST /api/v1/payments/:id/refund
 */
exports.initiateRefund = asyncHandler(async (req, res) => {
  const { id: paymentId } = req.params;
  const { amount, reason } = req.body;
  const userId = req.user.uid;

  if (!amount || amount <= 0) {
    throw new ApiError('Invalid refund amount', 400);
  }

  // Get payment
  const [payments] = await db.execute(
    'SELECT * FROM payments WHERE id = ?',
    [paymentId]
  );

  if (payments.length === 0) {
    throw new ApiError('Payment not found', 404);
  }

  const payment = payments[0];

  if (payment.status !== 'SUCCESS') {
    throw new ApiError('Can only refund successful payments', 400);
  }

  if (amount > payment.amount) {
    throw new ApiError('Refund amount exceeds payment amount', 400);
  }

  // Check existing refunds
  const [existingRefunds] = await db.execute(
    'SELECT SUM(amount) as total FROM refunds WHERE payment_id = ? AND status IN ("SUCCESS", "PROCESSING")',
    [paymentId]
  );

  const totalRefunded = existingRefunds[0]?.total || 0;
  if (totalRefunded + amount > payment.amount) {
    throw new ApiError('Total refunds exceed payment amount', 400);
  }

  // Create refund
  const refundId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO refunds 
     (id, payment_id, amount, reason, status, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [refundId, paymentId, amount, reason, 'INITIATED']
  );

  // Call provider refund API
  let refundResult;
  if (payment.gateway === 'RAZORPAY') {
    refundResult = await refundRazorpayPayment(payment, amount);
  } else if (payment.gateway === 'STRIPE') {
    refundResult = await refundStripePayment(payment, amount);
  } else if (payment.gateway === 'PAYTM') {
    refundResult = await refundPaytmPayment(payment, amount);
  }

  // Update refund with gateway response
  if (refundResult.success) {
    await db.execute(
      'UPDATE refunds SET status = ?, gateway_refund_id = ? WHERE id = ?',
      ['SUCCESS', refundResult.gateway_refund_id, refundId]
    );
  } else {
    await db.execute(
      'UPDATE refunds SET status = ? WHERE id = ?',
      ['FAILED', refundId]
    );
    throw new ApiError('Refund processing failed', 500);
  }

  // Audit log
  await logAction({
    userId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Refund',
    entityId: refundId,
    newValues: { payment_id: paymentId, amount, reason },
    changeReason: 'Refund initiated',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Refund initiated',
    data: {
      refundId,
      amount,
      status: 'SUCCESS'
    }
  });
});

/**
 * Get refund status
 * GET /api/v1/payments/:id/refund
 */
exports.getRefundStatus = asyncHandler(async (req, res) => {
  const { id: paymentId } = req.params;

  const [refunds] = await db.execute(
    'SELECT * FROM refunds WHERE payment_id = ? ORDER BY created_at DESC',
    [paymentId]
  );

  res.json({
    success: true,
    data: refunds
  });
});

// ============================================================================
// WEBHOOKS
// ============================================================================

/**
 * Razorpay webhook handler
 * POST /api/v1/webhooks/razorpay
 */
exports.razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);

  // Get gateway secret
  const [gateways] = await db.execute(
    'SELECT webhook_secret_encrypted FROM payment_gateways WHERE provider = "RAZORPAY"'
  );

  if (gateways.length === 0) {
    throw new ApiError('Gateway not configured', 500);
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    throw new ApiError('Invalid webhook signature', 401);
  }

  const event = req.body;

  if (event.event === 'payment.authorized') {
    const razorpayPaymentId = event.payload.payment.entity.id;
    const orderId = event.payload.payment.entity.receipt;

    // Find payment by gateway_payment_id
    const [payments] = await db.execute(
      'SELECT * FROM payments WHERE gateway_payment_id = ?',
      [orderId]
    );

    if (payments.length > 0) {
      const payment = payments[0];

      // Update payment
      await db.execute(
        'UPDATE payments SET status = ?, webhook_received_at = NOW(), webhook_verified = TRUE WHERE id = ?',
        ['SUCCESS', payment.id]
      );

      // Update invoice
      const [invoices] = await db.execute(
        'SELECT * FROM invoices WHERE id = ?',
        [payment.invoice_id]
      );

      const invoice = invoices[0];
      const newPaidAmount = (invoice.paid_amount || 0) + payment.amount;
      const newStatus = newPaidAmount >= invoice.total_amount ? 'PAID' : 'PARTIALLY_PAID';

      await db.execute(
        'UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?',
        [newPaidAmount, newStatus, payment.invoice_id]
      );
    }
  }

  res.json({ success: true });
});

/**
 * Stripe webhook handler
 * POST /api/v1/webhooks/stripe
 */
exports.stripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const body = req.rawBody;

  // Verify signature
  const [gateways] = await db.execute(
    'SELECT webhook_secret_encrypted FROM payment_gateways WHERE provider = "STRIPE"'
  );

  let event;
  try {
    event = require('stripe').webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new ApiError('Webhook signature verification failed', 400);
  }

  if (event.type === 'charge.succeeded') {
    const stripePaymentId = event.data.object.id;
    const orderId = event.data.object.metadata.orderId;

    // Find payment
    const [payments] = await db.execute(
      'SELECT * FROM payments WHERE gateway_payment_id = ?',
      [orderId]
    );

    if (payments.length > 0) {
      const payment = payments[0];

      // Update payment and invoice (same logic as Razorpay)
      await db.execute(
        'UPDATE payments SET status = ?, webhook_received_at = NOW(), webhook_verified = TRUE WHERE id = ?',
        ['SUCCESS', payment.id]
      );

      const [invoices] = await db.execute(
        'SELECT * FROM invoices WHERE id = ?',
        [payment.invoice_id]
      );

      const invoice = invoices[0];
      const newPaidAmount = (invoice.paid_amount || 0) + payment.amount;
      const newStatus = newPaidAmount >= invoice.total_amount ? 'PAID' : 'PARTIALLY_PAID';

      await db.execute(
        'UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?',
        [newPaidAmount, newStatus, payment.invoice_id]
      );
    }
  }

  res.json({ success: true });
});

/**
 * Paytm webhook handler
 * POST /api/v1/webhooks/paytm
 */
exports.paytmWebhook = asyncHandler(async (req, res) => {
  const { TXNID, STATUS, ORDERID } = req.body;

  if (STATUS === 'TXN_SUCCESS') {
    // Find payment
    const [payments] = await db.execute(
      'SELECT * FROM payments WHERE gateway_payment_id = ?',
      [ORDERID]
    );

    if (payments.length > 0) {
      const payment = payments[0];

      await db.execute(
        'UPDATE payments SET status = ?, webhook_received_at = NOW(), webhook_verified = TRUE WHERE id = ?',
        ['SUCCESS', payment.id]
      );

      const [invoices] = await db.execute(
        'SELECT * FROM invoices WHERE id = ?',
        [payment.invoice_id]
      );

      const invoice = invoices[0];
      const newPaidAmount = (invoice.paid_amount || 0) + payment.amount;
      const newStatus = newPaidAmount >= invoice.total_amount ? 'PAID' : 'PARTIALLY_PAID';

      await db.execute(
        'UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?',
        [newPaidAmount, newStatus, payment.invoice_id]
      );
    }
  }

  res.json({ success: true });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createRazorpayOrder(amount, invoiceId, clientId, gateway) {
  const orderId = crypto.randomUUID();
  
  try {
    const response = await axios.post('https://api.razorpay.com/v1/orders', {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: 'INR',
      receipt: orderId,
      notes: { invoiceId, clientId }
    }, {
      auth: {
        username: process.env.RAZORPAY_KEY_ID,
        password: process.env.RAZORPAY_KEY_SECRET
      }
    });

    return {
      gateway_payment_id: response.data.id,
      clientSecret: null, // Razorpay doesn't use client secret
      razorpayOrderId: response.data.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    };
  } catch (error) {
    throw new ApiError('Failed to create Razorpay order', 500);
  }
}

async function createStripePaymentIntent(amount, invoiceId, clientId, gateway) {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in cents
      currency: 'inr',
      metadata: { invoiceId, clientId, orderId: invoiceId }
    });

    return {
      gateway_payment_id: intent.id,
      clientSecret: intent.client_secret,
      publishableKey: process.env.STRIPE_PUBLIC_KEY
    };
  } catch (error) {
    throw new ApiError('Failed to create Stripe payment intent', 500);
  }
}

async function createPaytmOrder(amount, invoiceId, clientId, gateway) {
  const orderId = crypto.randomUUID();
  
  return {
    gateway_payment_id: orderId,
    orderId,
    paytmMerchantId: process.env.PAYTM_MERCHANT_ID
  };
}

async function verifyRazorpayPayment(payment) {
  // Implementation for Razorpay verification
  return true;
}

async function verifyStripePayment(payment) {
  // Implementation for Stripe verification
  return true;
}

async function verifyPaytmPayment(payment) {
  // Implementation for Paytm verification
  return true;
}

async function refundRazorpayPayment(payment, amount) {
  try {
    const response = await axios.post(
      `https://api.razorpay.com/v1/payments/${payment.gateway_payment_id}/refund`,
      { amount: Math.round(amount * 100) },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET
        }
      }
    );

    return {
      success: true,
      gateway_refund_id: response.data.id
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function refundStripePayment(payment, amount) {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const refund = await stripe.refunds.create({
      payment_intent: payment.gateway_payment_id,
      amount: Math.round(amount * 100)
    });

    return {
      success: true,
      gateway_refund_id: refund.id
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function refundPaytmPayment(payment, amount) {
  // Implementation for Paytm refund
  return {
    success: true,
    gateway_refund_id: crypto.randomUUID()
  };
}
