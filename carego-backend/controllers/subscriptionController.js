/**
 * Subscription Controller - Care Shield Plans & Subscriptions
 * Phase 3: Admin manages subscription plans, clients manage enrollments
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');
const { generateId } = require('../utils/validators');
const { logAction } = require('../services/auditService');

/**
 * Create subscription plan (ADMIN only)
 * POST /api/v1/subscriptions/plans
 */
exports.createPlan = asyncHandler(async (req, res) => {
  const { planName, planCode, monthlyPrice, features, maxUsers, billingCycle, description } = req.body;

  if (!planName || !planCode || !monthlyPrice || !features || !billingCycle) {
    throw new ApiError('planName, planCode, monthlyPrice, features, billingCycle are required', 400);
  }

  const validCycles = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL'];
  if (!validCycles.includes(billingCycle)) {
    throw new ApiError(`Invalid cycle. Must be: ${validCycles.join(', ')}`, 400);
  }

  if (monthlyPrice < 0) {
    throw new ApiError('monthlyPrice must be >= 0', 400);
  }

  // Check plan code is unique
  const [existingPlan] = await db.execute(
    'SELECT id FROM subscription_plans WHERE plan_code = ?',
    [planCode]
  );

  if (existingPlan.length > 0) {
    throw new ApiError('Plan code already exists', 409);
  }

  const planId = generateId();

  await db.execute(
    `INSERT INTO subscription_plans (id, plan_name, plan_code, monthly_price, billing_cycle, max_users, features, description, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
    [planId, planName, planCode, monthlyPrice, billingCycle, maxUsers || null, JSON.stringify(features), description || null]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'SubscriptionPlan',
    entityId: planId,
    newValues: { plan_name: planName, plan_code: planCode, monthly_price: monthlyPrice },
    changeReason: 'Subscription plan created',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Subscription plan created successfully',
    data: {
      planId,
      planName,
      planCode,
      monthlyPrice,
      billingCycle
    }
  });
});

/**
 * Get all subscription plans
 * GET /api/v1/subscriptions/plans?isActive=true&page=1&limit=20
 */
exports.getAllPlans = asyncHandler(async (req, res) => {
  const { isActive = true, page = 1, limit = 20 } = req.query;

  let query = 'SELECT id, plan_name, plan_code, monthly_price, billing_cycle, max_users, features, is_active, created_at FROM subscription_plans WHERE 1=1';
  const params = [];

  if (isActive !== undefined) {
    query += ' AND is_active = ?';
    params.push(isActive === 'true' ? 1 : 0);
  }

  query += ' ORDER BY created_at DESC';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

  const [plans] = await db.execute(query, params);

  // Parse features JSON
  const plansWithFeatures = plans.map(p => ({
    ...p,
    features: p.features ? JSON.parse(p.features) : []
  }));

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM subscription_plans WHERE 1=1';
  const countParams = [];

  if (isActive !== undefined) {
    countQuery += ' AND is_active = ?';
    countParams.push(isActive === 'true' ? 1 : 0);
  }

  const [countResult] = await db.execute(countQuery, countParams);

  res.json({
    success: true,
    data: plansWithFeatures,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult[0]?.total || 0,
      pages: Math.ceil((countResult[0]?.total || 0) / parseInt(limit))
    }
  });
});

/**
 * Get plan detail
 * GET /api/v1/subscriptions/plans/:planId
 */
exports.getPlanDetail = asyncHandler(async (req, res) => {
  const { planId } = req.params;

  const [planData] = await db.execute(
    'SELECT * FROM subscription_plans WHERE id = ?',
    [planId]
  );

  if (planData.length === 0) {
    throw new ApiError('Plan not found', 404);
  }

  const plan = planData[0];
  plan.features = plan.features ? JSON.parse(plan.features) : [];

  res.json({
    success: true,
    data: plan
  });
});

/**
 * Subscribe client to plan
 * POST /api/v1/subscriptions/enroll
 */
exports.enrollClientSubscription = asyncHandler(async (req, res) => {
  const { clientId, planId, startDate, paymentMethod } = req.body;

  if (!clientId || !planId || !startDate || !paymentMethod) {
    throw new ApiError('clientId, planId, startDate, paymentMethod are required', 400);
  }

  const validMethods = ['CARD', 'BANK_TRANSFER', 'UPI', 'CHECK'];
  if (!validMethods.includes(paymentMethod)) {
    throw new ApiError(`Invalid payment method. Must be: ${validMethods.join(', ')}`, 400);
  }

  // Check client exists
  const [clientCheck] = await db.execute('SELECT id FROM clients WHERE id = ?', [clientId]);
  if (clientCheck.length === 0) {
    throw new ApiError('Client not found', 404);
  }

  // Check plan exists
  const [planCheck] = await db.execute('SELECT monthly_price, billing_cycle FROM subscription_plans WHERE id = ? AND is_active = TRUE', [planId]);
  if (planCheck.length === 0) {
    throw new ApiError('Plan not found or inactive', 404);
  }

  // Check for active subscription
  const [activeSubCheck] = await db.execute(
    'SELECT id FROM client_subscriptions WHERE client_id = ? AND subscription_status IN (\'ACTIVE\', \'TRIAL\')',
    [clientId]
  );

  if (activeSubCheck.length > 0) {
    throw new ApiError('Client already has an active subscription', 409);
  }

  const subscriptionId = generateId();
  const startDateObj = new Date(startDate);
  const plan = planCheck[0];

  // Calculate end date based on billing cycle
  const endDate = new Date(startDateObj);
  const cycleMonths = {
    'MONTHLY': 1,
    'QUARTERLY': 3,
    'HALF_YEARLY': 6,
    'ANNUAL': 12
  };
  endDate.setMonth(endDate.getMonth() + (cycleMonths[plan.billing_cycle] || 1));

  const nextBillingDate = new Date(endDate);

  await db.execute(
    `INSERT INTO client_subscriptions (id, client_id, subscription_plan_id, subscription_status, start_date, end_date, next_billing_date, payment_method, enrolled_at)
     VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, NOW())`,
    [subscriptionId, clientId, planId, startDateObj, endDate, nextBillingDate, paymentMethod]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Subscription',
    entityId: subscriptionId,
    newValues: { client_id: clientId, plan_id: planId, status: 'ACTIVE' },
    changeReason: 'Client subscription activated',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Subscription activated successfully',
    data: {
      subscriptionId,
      clientId,
      planId,
      startDate: startDateObj,
      endDate,
      nextBillingDate,
      status: 'ACTIVE',
      monthlyPrice: plan.monthly_price,
      billingCycle: plan.billing_cycle
    }
  });
});

/**
 * Get client subscription
 * GET /api/v1/subscriptions/clients/:clientId
 */
exports.getClientSubscription = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  const [subData] = await db.execute(`
    SELECT 
      cs.id, cs.subscription_status, cs.start_date, cs.end_date, cs.next_billing_date,
      sp.plan_name, sp.plan_code, sp.monthly_price, sp.billing_cycle, sp.features
    FROM client_subscriptions cs
    JOIN subscription_plans sp ON cs.subscription_plan_id = sp.id
    WHERE cs.client_id = ? AND cs.subscription_status IN ('ACTIVE', 'TRIAL', 'SUSPENDED')
    ORDER BY cs.start_date DESC
    LIMIT 1
  `, [clientId]);

  if (subData.length === 0) {
    throw new ApiError('No active subscription found', 404);
  }

  const subscription = subData[0];
  subscription.features = subscription.features ? JSON.parse(subscription.features) : [];

  // Check if renewal is due
  const now = new Date();
  const isRenewalDue = now >= new Date(subscription.next_billing_date);

  res.json({
    success: true,
    data: {
      ...subscription,
      isRenewalDue
    }
  });
});

/**
 * Upgrade subscription plan
 * POST /api/v1/subscriptions/:subscriptionId/upgrade
 */
exports.upgradeSubscription = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;
  const { newPlanId, effectiveDate, reason } = req.body;

  if (!newPlanId || !effectiveDate) {
    throw new ApiError('newPlanId and effectiveDate are required', 400);
  }

  // Get current subscription
  const [subData] = await db.execute(
    'SELECT client_id, subscription_plan_id, end_date FROM client_subscriptions WHERE id = ? AND subscription_status = ?',
    [subscriptionId, 'ACTIVE']
  );

  if (subData.length === 0) {
    throw new ApiError('Subscription not found or inactive', 404);
  }

  const subscription = subData[0];

  // Check new plan exists
  const [newPlanData] = await db.execute(
    'SELECT monthly_price, billing_cycle FROM subscription_plans WHERE id = ? AND is_active = TRUE',
    [newPlanId]
  );

  if (newPlanData.length === 0) {
    throw new ApiError('New plan not found or inactive', 404);
  }

  const effectiveDateObj = new Date(effectiveDate);
  const newPlan = newPlanData[0];

  // Calculate new end date
  const newEndDate = new Date(effectiveDateObj);
  const cycleMonths = {
    'MONTHLY': 1,
    'QUARTERLY': 3,
    'HALF_YEARLY': 6,
    'ANNUAL': 12
  };
  newEndDate.setMonth(newEndDate.getMonth() + (cycleMonths[newPlan.billing_cycle] || 1));

  await db.execute(
    'UPDATE client_subscriptions SET subscription_plan_id = ?, end_date = ?, next_billing_date = ? WHERE id = ?',
    [newPlanId, newEndDate, newEndDate, subscriptionId]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Subscription',
    entityId: subscriptionId,
    oldValues: { plan_id: subscription.subscription_plan_id },
    newValues: { plan_id: newPlanId },
    changeReason: reason || 'Plan upgraded',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Subscription upgraded successfully',
    data: {
      subscriptionId,
      newPlanId,
      effectiveDate: effectiveDateObj,
      newEndDate,
      newMonthlyPrice: newPlan.monthly_price
    }
  });
});

/**
 * Renew subscription
 * POST /api/v1/subscriptions/:subscriptionId/renew
 */
exports.renewSubscription = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;
  const { paymentReference } = req.body;

  if (!paymentReference) {
    throw new ApiError('paymentReference is required', 400);
  }

  // Get subscription
  const [subData] = await db.execute(
    'SELECT client_id, subscription_plan_id, end_date FROM client_subscriptions WHERE id = ?',
    [subscriptionId]
  );

  if (subData.length === 0) {
    throw new ApiError('Subscription not found', 404);
  }

  const subscription = subData[0];

  // Get plan details
  const [planData] = await db.execute(
    'SELECT billing_cycle FROM subscription_plans WHERE id = ?',
    [subscription.subscription_plan_id]
  );

  const plan = planData[0];

  // Calculate new end date
  const newEndDate = new Date(subscription.end_date);
  const cycleMonths = {
    'MONTHLY': 1,
    'QUARTERLY': 3,
    'HALF_YEARLY': 6,
    'ANNUAL': 12
  };
  newEndDate.setMonth(newEndDate.getMonth() + (cycleMonths[plan.billing_cycle] || 1));

  await db.execute(
    'UPDATE client_subscriptions SET subscription_status = ?, end_date = ?, next_billing_date = ? WHERE id = ?',
    ['ACTIVE', newEndDate, newEndDate, subscriptionId]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Subscription',
    entityId: subscriptionId,
    newValues: { status: 'ACTIVE', end_date: newEndDate },
    changeReason: `Subscription renewed with payment reference: ${paymentReference}`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Subscription renewed successfully',
    data: {
      subscriptionId,
      newEndDate,
      nextBillingDate: newEndDate,
      status: 'ACTIVE'
    }
  });
});

/**
 * Cancel subscription
 * POST /api/v1/subscriptions/:subscriptionId/cancel
 */
exports.cancelSubscription = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;
  const { reason, refundEligible = false } = req.body;

  if (!reason) {
    throw new ApiError('reason is required', 400);
  }

  // Get subscription
  const [subData] = await db.execute(
    'SELECT subscription_status, end_date FROM client_subscriptions WHERE id = ?',
    [subscriptionId]
  );

  if (subData.length === 0) {
    throw new ApiError('Subscription not found', 404);
  }

  const oldStatus = subData[0].subscription_status;

  await db.execute(
    'UPDATE client_subscriptions SET subscription_status = ? WHERE id = ?',
    ['CANCELLED', subscriptionId]
  );

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Subscription',
    entityId: subscriptionId,
    oldValues: { subscription_status: oldStatus },
    newValues: { subscription_status: 'CANCELLED' },
    changeReason: `Subscription cancelled: ${reason}${refundEligible ? ' (Refund eligible)' : ''}`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Subscription cancelled successfully',
    data: {
      subscriptionId,
      status: 'CANCELLED',
      refundEligible
    }
  });
});
