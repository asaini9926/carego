/**
 * Analytics Controller - Business Intelligence & Reporting
 * Phase 3: Admin views analytics - staff utilization, client retention, revenue, course pipeline, performance
 */

const db = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');

/**
 * Get staff utilization dashboard
 * GET /api/v1/analytics/staff-utilization?cityId=xxx&dateRange=30days
 */
exports.getStaffUtilization = asyncHandler(async (req, res) => {
  const { cityId, dateRange = '30days' } = req.query;

  let dateFilter = '';
  const dateParams = [];

  if (dateRange === '30days') {
    dateFilter = ' AND a.assignment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
  } else if (dateRange === '90days') {
    dateFilter = ' AND a.assignment_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
  } else if (dateRange === 'year') {
    dateFilter = ' AND a.assignment_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
  }

  let query = `
    SELECT 
      s.id, s.first_name, s.last_name, s.staff_status,
      COUNT(DISTINCT a.id) as total_assignments,
      COUNT(DISTINCT CASE WHEN a.assignment_status = 'COMPLETED' THEN a.id END) as completed_assignments,
      COUNT(DISTINCT CASE WHEN a.assignment_status IN ('ACTIVE', 'PAUSED') THEN a.id END) as active_assignments,
      AVG(CASE WHEN sf.vital_type = 'VITALS' THEN sf.vital_value ELSE NULL END) as avg_vital_score,
      COUNT(DISTINCT cf.id) as total_care_logs
    FROM staff s
    LEFT JOIN assignments a ON s.id = a.staff_id ${dateFilter}
    LEFT JOIN staff_vitals sf ON s.id = sf.staff_id ${dateFilter}
    LEFT JOIN care_notes cf ON s.id = cf.staff_id ${dateFilter}
    WHERE 1=1
  `;

  const params = [];

  if (cityId) {
    query += ' AND s.city_id = ?';
    params.push(cityId);
  }

  query += ' GROUP BY s.id ORDER BY total_assignments DESC';

  const [staffUtilization] = await db.execute(query, params);

  // Calculate summary
  const summary = {
    totalStaff: staffUtilization.length,
    activeStaff: staffUtilization.filter(s => s.staff_status === 'ACTIVE').length,
    totalAssignments: staffUtilization.reduce((sum, s) => sum + s.total_assignments, 0),
    completedAssignments: staffUtilization.reduce((sum, s) => sum + s.completed_assignments, 0),
    utilizationRate: staffUtilization.length > 0 
      ? (staffUtilization.reduce((sum, s) => sum + s.active_assignments, 0) / (staffUtilization.length * 30) * 100).toFixed(2)
      : 0
  };

  res.json({
    success: true,
    data: staffUtilization,
    summary
  });
});

/**
 * Get client retention analytics
 * GET /api/v1/analytics/client-retention?cityId=xxx
 */
exports.getClientRetention = asyncHandler(async (req, res) => {
  const { cityId } = req.query;

  let query = `
    SELECT 
      c.id, c.first_name, c.last_name, c.client_status,
      COUNT(DISTINCT a.id) as total_assignments,
      COUNT(DISTINCT CASE WHEN a.assignment_status = 'COMPLETED' THEN a.id END) as completed_assignments,
      AVG(CASE WHEN a.assignment_status = 'COMPLETED' THEN 1 ELSE 0 END) as completion_rate,
      MAX(a.assignment_date) as last_assignment_date,
      DATEDIFF(NOW(), c.created_at) as days_as_client
    FROM clients c
    LEFT JOIN assignments a ON c.id = a.client_id
    WHERE 1=1
  `;

  const params = [];

  if (cityId) {
    query += ' AND c.city_id = ?';
    params.push(cityId);
  }

  query += ' GROUP BY c.id ORDER BY completed_assignments DESC';

  const [clients] = await db.execute(query, params);

  // Segment clients
  const retention = {
    newClients: clients.filter(c => c.days_as_client <= 30).length,
    activeClients: clients.filter(c => c.client_status === 'ACTIVE' && c.last_assignment_date && new Date(c.last_assignment_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
    atRiskClients: clients.filter(c => c.client_status === 'ACTIVE' && (!c.last_assignment_date || new Date(c.last_assignment_date) < new Date(Date.now() - 60 * 24 * 60 * 60 * 1000))).length,
    churnedClients: clients.filter(c => c.client_status !== 'ACTIVE').length
  };

  res.json({
    success: true,
    data: clients,
    retention
  });
});

/**
 * Get revenue analytics
 * GET /api/v1/analytics/revenue?period=monthly&cityId=xxx
 */
exports.getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period = 'monthly', cityId } = req.query;

  let dateFormat = '%Y-%m';
  if (period === 'daily') dateFormat = '%Y-%m-%d';
  if (period === 'yearly') dateFormat = '%Y';

  let query = `
    SELECT 
      DATE_FORMAT(i.invoice_date, '${dateFormat}') as period,
      COUNT(DISTINCT i.id) as invoice_count,
      SUM(i.final_amount) as total_revenue,
      SUM(CASE WHEN i.invoice_status = 'PAID' THEN i.final_amount ELSE 0 END) as paid_revenue,
      SUM(CASE WHEN i.invoice_status IN ('ISSUED', 'PARTIALLY_PAID') THEN i.final_amount ELSE 0 END) as outstanding_revenue,
      AVG(i.final_amount) as avg_invoice_value
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    WHERE 1=1
  `;

  const params = [];

  if (cityId) {
    query += ' AND c.city_id = ?';
    params.push(cityId);
  }

  query += ` GROUP BY DATE_FORMAT(i.invoice_date, '${dateFormat}') ORDER BY period DESC`;

  const [revenueData] = await db.execute(query, params);

  // Summary
  const summary = {
    totalRevenue: revenueData.reduce((sum, r) => sum + r.total_revenue, 0),
    paidRevenue: revenueData.reduce((sum, r) => sum + r.paid_revenue, 0),
    outstandingRevenue: revenueData.reduce((sum, r) => sum + r.outstanding_revenue, 0),
    avgMonthlyRevenue: (revenueData.reduce((sum, r) => sum + r.total_revenue, 0) / Math.max(revenueData.length, 1)).toFixed(2),
    collectionRate: revenueData.length > 0 
      ? ((revenueData.reduce((sum, r) => sum + r.paid_revenue, 0) / revenueData.reduce((sum, r) => sum + r.total_revenue, 0) * 100) || 0).toFixed(2)
      : 0
  };

  res.json({
    success: true,
    data: revenueData,
    summary
  });
});

/**
 * Get training course pipeline
 * GET /api/v1/analytics/course-pipeline?cityId=xxx
 */
exports.getCoursePipeline = asyncHandler(async (req, res) => {
  const { cityId } = req.query;

  let query = `
    SELECT 
      c.id, c.name as course_name, c.level,
      COUNT(DISTINCT cb.id) as total_batches,
      COUNT(DISTINCT CASE WHEN cb.batch_status = 'SCHEDULED' THEN cb.id END) as scheduled_batches,
      COUNT(DISTINCT CASE WHEN cb.batch_status = 'ONGOING' THEN cb.id END) as ongoing_batches,
      COUNT(DISTINCT CASE WHEN cb.batch_status = 'COMPLETED' THEN cb.id END) as completed_batches,
      COUNT(DISTINCT sb.student_id) as total_enrollments,
      COUNT(DISTINCT CASE WHEN sb.enrollment_status = 'ENROLLED' THEN sb.student_id END) as active_students,
      COUNT(DISTINCT CASE WHEN sc.id IS NOT NULL THEN sb.student_id END) as certified_students
    FROM courses c
    LEFT JOIN course_offerings co ON c.id = co.course_id
    LEFT JOIN course_batches cb ON co.id = cb.course_offering_id
    LEFT JOIN student_batches sb ON cb.id = sb.course_batch_id
    LEFT JOIN student_certificates sc ON sb.student_id = sc.student_id AND cb.id = sc.course_batch_id
    WHERE 1=1
  `;

  const params = [];

  if (cityId) {
    query += ' AND cb.training_center_id IN (SELECT id FROM training_centers WHERE city_id = ?)';
    params.push(cityId);
  }

  query += ' GROUP BY c.id ORDER BY total_enrollments DESC';

  const [coursePipeline] = await db.execute(query, params);

  // Summary
  const summary = {
    totalCourses: coursePipeline.length,
    totalBatches: coursePipeline.reduce((sum, c) => sum + c.total_batches, 0),
    totalEnrollments: coursePipeline.reduce((sum, c) => sum + c.total_enrollments, 0),
    totalCertified: coursePipeline.reduce((sum, c) => sum + c.certified_students, 0),
    avgCompletionRate: coursePipeline.length > 0
      ? (coursePipeline.reduce((sum, c) => sum + (c.total_enrollments > 0 ? c.certified_students / c.total_enrollments : 0), 0) / coursePipeline.length * 100).toFixed(2)
      : 0
  };

  res.json({
    success: true,
    data: coursePipeline,
    summary
  });
});

/**
 * Get performance metrics dashboard
 * GET /api/v1/analytics/performance?dateRange=30days&cityId=xxx
 */
exports.getPerformanceMetrics = asyncHandler(async (req, res) => {
  const { dateRange = '30days', cityId } = req.query;

  let dateFilter = '';
  if (dateRange === '7days') {
    dateFilter = ' AND DATE(a.assignment_date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
  } else if (dateRange === '30days') {
    dateFilter = ' AND DATE(a.assignment_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
  } else if (dateRange === '90days') {
    dateFilter = ' AND DATE(a.assignment_date) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
  }

  // Staff performance
  let staffQuery = `
    SELECT 
      s.id, s.first_name, s.last_name,
      COUNT(DISTINCT a.id) as assignments_completed,
      COALESCE(AVG(sr.rating), 0) as avg_client_rating,
      COUNT(DISTINCT CASE WHEN sr.rating >= 4 THEN a.id END) as high_rated_assignments,
      COALESCE(AVG(DATEDIFF(a.actual_end_date, a.assignment_date)), 0) as avg_duration_days
    FROM staff s
    LEFT JOIN assignments a ON s.id = a.staff_id AND a.assignment_status = 'COMPLETED' ${dateFilter}
    LEFT JOIN staff_ratings sr ON s.id = sr.staff_id
    WHERE 1=1
  `;

  const staffParams = [];
  if (cityId) {
    staffQuery += ' AND s.city_id = ?';
    staffParams.push(cityId);
  }

  staffQuery += ' GROUP BY s.id ORDER BY assignments_completed DESC LIMIT 10';

  const [topStaff] = await db.execute(staffQuery, staffParams);

  // Quality metrics
  const [qualityData] = await db.execute(`
    SELECT 
      COUNT(DISTINCT a.id) as total_assignments,
      COUNT(DISTINCT CASE WHEN a.assignment_status = 'COMPLETED' THEN a.id END) as completed_on_time,
      COALESCE(AVG(sr.rating), 0) as avg_rating,
      COUNT(DISTINCT CASE WHEN sr.rating >= 4 THEN sr.id END) as highly_rated_count
    FROM assignments a
    LEFT JOIN staff_ratings sr ON a.staff_id = sr.staff_id
    WHERE 1=1 ${dateFilter}
      ${cityId ? 'AND a.staff_id IN (SELECT id FROM staff WHERE city_id = ?)' : ''}
  `, cityId ? [cityId] : []);

  const quality = qualityData[0];

  // Response time metrics
  const [responseMetrics] = await db.execute(`
    SELECT 
      AVG(HOUR(TIMEDIFF(a.actual_start_date, a.assignment_date))) as avg_response_hours,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY HOUR(TIMEDIFF(a.actual_start_date, a.assignment_date))) as median_response_hours
    FROM assignments a
    WHERE a.assignment_status IN ('ACTIVE', 'COMPLETED')
      ${dateFilter}
      ${cityId ? 'AND a.staff_id IN (SELECT id FROM staff WHERE city_id = ?)' : ''}
  `, cityId ? [cityId] : []);

  res.json({
    success: true,
    data: {
      topStaff,
      qualityMetrics: {
        totalAssignments: quality.total_assignments || 0,
        completedOnTime: quality.completed_on_time || 0,
        avgRating: parseFloat((quality.avg_rating || 0).toFixed(2)),
        highlyRatedCount: quality.highly_rated_count || 0,
        completionRate: quality.total_assignments > 0 
          ? ((quality.completed_on_time / quality.total_assignments) * 100).toFixed(2)
          : 0
      },
      responseTimeMetrics: {
        avgResponseHours: responseMetrics[0]?.avg_response_hours || 0,
        medianResponseHours: responseMetrics[0]?.median_response_hours || 0
      }
    }
  });
});

/**
 * Get city-wise comparison report
 * GET /api/v1/analytics/city-comparison
 */
exports.getCityComparison = asyncHandler(async (req, res) => {
  const [cityComparison] = await db.execute(`
    SELECT 
      ci.id, ci.city_name,
      COUNT(DISTINCT s.id) as total_staff,
      COUNT(DISTINCT c.id) as total_clients,
      COUNT(DISTINCT a.id) as total_assignments,
      COUNT(DISTINCT CASE WHEN a.assignment_status = 'COMPLETED' THEN a.id END) as completed_assignments,
      SUM(CASE WHEN i.invoice_status = 'PAID' THEN i.final_amount ELSE 0 END) as total_revenue,
      COUNT(DISTINCT cb.id) as total_batches,
      COUNT(DISTINCT sb.student_id) as total_students_trained
    FROM cities ci
    LEFT JOIN staff s ON ci.id = s.city_id
    LEFT JOIN clients c ON ci.id = c.city_id
    LEFT JOIN assignments a ON s.id = a.staff_id
    LEFT JOIN invoices i ON c.id = i.client_id
    LEFT JOIN training_centers tc ON ci.id = tc.city_id
    LEFT JOIN course_batches cb ON tc.id = cb.training_center_id
    LEFT JOIN student_batches sb ON cb.id = sb.course_batch_id
    GROUP BY ci.id
    ORDER BY total_revenue DESC
  `);

  res.json({
    success: true,
    data: cityComparison
  });
});

/**
 * Get financial health dashboard
 * GET /api/v1/analytics/financial-health
 */
exports.getFinancialHealth = asyncHandler(async (req, res) => {
  // Outstanding invoices
  const [outstanding] = await db.execute(`
    SELECT 
      COUNT(*) as outstanding_invoices,
      SUM(final_amount - COALESCE((SELECT SUM(amount) FROM invoice_payments WHERE invoice_id = invoices.id AND payment_status = 'COMPLETED'), 0)) as outstanding_amount,
      COUNT(CASE WHEN DATEDIFF(NOW(), due_date) > 30 THEN 1 END) as overdue_30days,
      COUNT(CASE WHEN DATEDIFF(NOW(), due_date) > 60 THEN 1 END) as overdue_60days
    FROM invoices
    WHERE invoice_status IN ('ISSUED', 'PARTIALLY_PAID')
  `);

  // Subscription health
  const [subscriptions] = await db.execute(`
    SELECT 
      COUNT(*) as active_subscriptions,
      SUM(sp.monthly_price) as monthly_recurring_revenue,
      COUNT(CASE WHEN cs.subscription_status = 'ACTIVE' THEN 1 END) as active_count,
      COUNT(CASE WHEN cs.subscription_status = 'TRIAL' THEN 1 END) as trial_count
    FROM client_subscriptions cs
    JOIN subscription_plans sp ON cs.subscription_plan_id = sp.id
  `);

  res.json({
    success: true,
    data: {
      outstanding: outstanding[0],
      subscriptions: subscriptions[0]
    }
  });
});
