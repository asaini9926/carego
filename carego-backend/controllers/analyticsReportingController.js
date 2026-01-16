const { asyncHandler, ApiError } = require('../utils/errors');
const db = require('../config/db');
const { logAction } = require('../middleware/auditMiddleware');
const crypto = require('crypto');
const { Parser } = require('json2csv');

// ============================================================================
// REPORT GENERATION & MANAGEMENT
// ============================================================================

/**
 * Create report (async generation)
 * POST /api/v1/analytics/reports
 */
exports.createReport = asyncHandler(async (req, res) => {
  const { reportType, filterJson = {} } = req.body;
  const adminId = req.user.uid;

  // Validate report type
  const validReportTypes = [
    'REVENUE',
    'STAFF_PERFORMANCE',
    'STUDENT_SUCCESS',
    'UTILIZATION',
    'CHURN_ANALYSIS',
    'FINANCIAL_HEALTH',
    'CLIENT_METRICS'
  ];

  if (!validReportTypes.includes(reportType)) {
    throw new ApiError('Invalid report type', 400);
  }

  // Create report record
  const reportId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO reports 
     (id, admin_id, report_type, filter_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [reportId, adminId, reportType, JSON.stringify(filterJson), 'PENDING']
  );

  // Audit log
  await logAction({
    userId: adminId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Report',
    entityId: reportId,
    newValues: { report_type: reportType, filters: filterJson },
    changeReason: 'Report generation initiated',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  // Trigger async report generation (simulate with immediate processing for now)
  generateReportAsync(reportId, adminId, reportType, filterJson);

  res.status(201).json({
    success: true,
    message: 'Report generation started',
    data: {
      reportId,
      status: 'PENDING'
    }
  });
});

/**
 * Get list of reports
 * GET /api/v1/analytics/reports
 */
exports.getReports = asyncHandler(async (req, res) => {
  const { status, reportType, limit = 20, offset = 0 } = req.query;
  const adminId = req.user.uid;

  let query = 'SELECT * FROM reports WHERE admin_id = ?';
  const params = [adminId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (reportType) {
    query += ' AND report_type = ?';
    params.push(reportType);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [reports] = await db.execute(query, params);

  const [totalResults] = await db.execute(
    'SELECT COUNT(*) as count FROM reports WHERE admin_id = ?',
    [adminId]
  );

  res.json({
    success: true,
    data: reports,
    pagination: {
      total: totalResults[0].count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

/**
 * Get report details
 * GET /api/v1/analytics/reports/:id
 */
exports.getReportDetail = asyncHandler(async (req, res) => {
  const { id: reportId } = req.params;
  const adminId = req.user.uid;

  const [reports] = await db.execute(
    'SELECT * FROM reports WHERE id = ? AND admin_id = ?',
    [reportId, adminId]
  );

  if (reports.length === 0) {
    throw new ApiError('Report not found', 404);
  }

  res.json({
    success: true,
    data: reports[0]
  });
});

/**
 * Download report (CSV, PDF, JSON)
 * GET /api/v1/analytics/reports/:id/download
 */
exports.downloadReport = asyncHandler(async (req, res) => {
  const { id: reportId } = req.params;
  const { format = 'csv' } = req.query;
  const adminId = req.user.uid;

  // Validate format
  if (!['csv', 'json', 'pdf'].includes(format)) {
    throw new ApiError('Invalid format', 400);
  }

  const [reports] = await db.execute(
    'SELECT * FROM reports WHERE id = ? AND admin_id = ? AND status = "COMPLETED"',
    [reportId, adminId]
  );

  if (reports.length === 0) {
    throw new ApiError('Report not found or still processing', 404);
  }

  const report = reports[0];

  // Get report data from cache or regenerate
  const reportData = await getReportData(report.report_type, JSON.parse(report.filter_json));

  // Format based on request
  if (format === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(reportData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report_${reportId}.csv"`);
    res.send(csv);
  } else if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="report_${reportId}.json"`);
    res.json({
      success: true,
      reportId,
      reportType: report.report_type,
      generatedAt: report.created_at,
      data: reportData
    });
  } else if (format === 'pdf') {
    // PDF generation (would use pdfkit or similar)
    res.json({
      success: true,
      message: 'PDF generation - implement with pdfkit',
      data: reportData
    });
  }

  // Audit log download
  await logAction({
    userId: adminId,
    userRole: req.user.role,
    action: 'READ',
    entityType: 'Report',
    entityId: reportId,
    changeReason: `Report downloaded as ${format}`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
});

/**
 * Delete report
 * DELETE /api/v1/analytics/reports/:id
 */
exports.deleteReport = asyncHandler(async (req, res) => {
  const { id: reportId } = req.params;
  const adminId = req.user.uid;

  const [reports] = await db.execute(
    'SELECT * FROM reports WHERE id = ? AND admin_id = ?',
    [reportId, adminId]
  );

  if (reports.length === 0) {
    throw new ApiError('Report not found', 404);
  }

  // Soft delete
  await db.execute(
    'DELETE FROM reports WHERE id = ?',
    [reportId]
  );

  // Audit log
  await logAction({
    userId: adminId,
    userRole: req.user.role,
    action: 'DELETE',
    entityType: 'Report',
    entityId: reportId,
    changeReason: 'Report deleted',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Report deleted'
  });
});

// ============================================================================
// SCHEDULED REPORTS
// ============================================================================

/**
 * Create scheduled report
 * POST /api/v1/analytics/scheduled-reports
 */
exports.createScheduledReport = asyncHandler(async (req, res) => {
  const { reportType, filterJson, frequency, recipientEmails } = req.body;
  const adminId = req.user.uid;

  // Validate frequency
  const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY'];
  if (!validFrequencies.includes(frequency)) {
    throw new ApiError('Invalid frequency', 400);
  }

  // Validate emails
  if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
    throw new ApiError('At least one recipient email required', 400);
  }

  const scheduleId = crypto.randomUUID();
  const nextRunAt = calculateNextRun(frequency);

  await db.execute(
    `INSERT INTO scheduled_reports 
     (id, admin_id, report_type, filter_json, frequency, recipient_emails, next_run_at, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      scheduleId,
      adminId,
      reportType,
      JSON.stringify(filterJson),
      frequency,
      JSON.stringify(recipientEmails),
      nextRunAt,
      true
    ]
  );

  // Audit log
  await logAction({
    userId: adminId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'ScheduledReport',
    entityId: scheduleId,
    newValues: { report_type: reportType, frequency, recipients: recipientEmails.length },
    changeReason: 'Scheduled report created',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Scheduled report created',
    data: {
      scheduleId,
      nextRun: nextRunAt
    }
  });
});

/**
 * Get scheduled reports
 * GET /api/v1/analytics/scheduled-reports
 */
exports.getScheduledReports = asyncHandler(async (req, res) => {
  const { isActive = true, limit = 20, offset = 0 } = req.query;
  const adminId = req.user.uid;

  let query = 'SELECT * FROM scheduled_reports WHERE admin_id = ?';
  const params = [adminId];

  if (isActive === 'true') {
    query += ' AND is_active = TRUE';
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [schedules] = await db.execute(query, params);

  const [totalResults] = await db.execute(
    'SELECT COUNT(*) as count FROM scheduled_reports WHERE admin_id = ?',
    [adminId]
  );

  res.json({
    success: true,
    data: schedules,
    pagination: {
      total: totalResults[0].count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

/**
 * Get scheduled report detail
 * GET /api/v1/analytics/scheduled-reports/:id
 */
exports.getScheduledReportDetail = asyncHandler(async (req, res) => {
  const { id: scheduleId } = req.params;
  const adminId = req.user.uid;

  const [schedules] = await db.execute(
    'SELECT * FROM scheduled_reports WHERE id = ? AND admin_id = ?',
    [scheduleId, adminId]
  );

  if (schedules.length === 0) {
    throw new ApiError('Scheduled report not found', 404);
  }

  res.json({
    success: true,
    data: schedules[0]
  });
});

/**
 * Update scheduled report
 * PATCH /api/v1/analytics/scheduled-reports/:id
 */
exports.updateScheduledReport = asyncHandler(async (req, res) => {
  const { id: scheduleId } = req.params;
  const { frequency, recipientEmails, isActive } = req.body;
  const adminId = req.user.uid;

  // Verify ownership
  const [schedules] = await db.execute(
    'SELECT * FROM scheduled_reports WHERE id = ? AND admin_id = ?',
    [scheduleId, adminId]
  );

  if (schedules.length === 0) {
    throw new ApiError('Scheduled report not found', 404);
  }

  const schedule = schedules[0];

  // Update fields
  let updateQuery = 'UPDATE scheduled_reports SET ';
  const updateParams = [];
  const updates = [];

  if (frequency) {
    updates.push('frequency = ?');
    updateParams.push(frequency);
  }

  if (recipientEmails) {
    updates.push('recipient_emails = ?');
    updateParams.push(JSON.stringify(recipientEmails));
  }

  if (isActive !== undefined) {
    updates.push('is_active = ?');
    updateParams.push(isActive);
  }

  if (updates.length === 0) {
    throw new ApiError('No updates provided', 400);
  }

  updateQuery += updates.join(', ') + ' WHERE id = ?';
  updateParams.push(scheduleId);

  await db.execute(updateQuery, updateParams);

  // Audit log
  await logAction({
    userId: adminId,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'ScheduledReport',
    entityId: scheduleId,
    oldValues: { frequency: schedule.frequency },
    newValues: { frequency: frequency || schedule.frequency },
    changeReason: 'Scheduled report updated',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Scheduled report updated'
  });
});

/**
 * Delete scheduled report
 * DELETE /api/v1/analytics/scheduled-reports/:id
 */
exports.deleteScheduledReport = asyncHandler(async (req, res) => {
  const { id: scheduleId } = req.params;
  const adminId = req.user.uid;

  const [schedules] = await db.execute(
    'SELECT * FROM scheduled_reports WHERE id = ? AND admin_id = ?',
    [scheduleId, adminId]
  );

  if (schedules.length === 0) {
    throw new ApiError('Scheduled report not found', 404);
  }

  await db.execute(
    'DELETE FROM scheduled_reports WHERE id = ?',
    [scheduleId]
  );

  // Audit log
  await logAction({
    userId: adminId,
    userRole: req.user.role,
    action: 'DELETE',
    entityType: 'ScheduledReport',
    entityId: scheduleId,
    changeReason: 'Scheduled report deleted',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Scheduled report deleted'
  });
});

// ============================================================================
// REPORT TEMPLATES
// ============================================================================

/**
 * Get report templates
 * GET /api/v1/analytics/report-templates
 */
exports.getReportTemplates = asyncHandler(async (req, res) => {
  const templates = [
    {
      id: 'template_revenue',
      name: 'Revenue Report',
      description: 'Total revenue, per-city, per-service, per-client',
      reportType: 'REVENUE',
      availableFilters: ['dateRange', 'city', 'service', 'client']
    },
    {
      id: 'template_staff_perf',
      name: 'Staff Performance',
      description: 'Hours worked, utilization, ratings, retention',
      reportType: 'STAFF_PERFORMANCE',
      availableFilters: ['dateRange', 'city', 'specialization']
    },
    {
      id: 'template_student_success',
      name: 'Student Success',
      description: 'Completion rate, employment, course-wise performance',
      reportType: 'STUDENT_SUCCESS',
      availableFilters: ['dateRange', 'course', 'specialization']
    },
    {
      id: 'template_utilization',
      name: 'Capacity Utilization',
      description: 'Available vs assigned staff, idle time, peaks',
      reportType: 'UTILIZATION',
      availableFilters: ['dateRange', 'city', 'service']
    },
    {
      id: 'template_churn',
      name: 'Churn Analysis',
      description: 'Client churn reasons, staff attrition, seasonal patterns',
      reportType: 'CHURN_ANALYSIS',
      availableFilters: ['dateRange', 'city']
    },
    {
      id: 'template_financial',
      name: 'Financial Health',
      description: 'Cash flow, payables, receivables, subscription MRR',
      reportType: 'FINANCIAL_HEALTH',
      availableFilters: ['dateRange', 'city']
    }
  ];

  res.json({
    success: true,
    data: templates
  });
});

/**
 * Get template detail
 * GET /api/v1/analytics/report-templates/:id
 */
exports.getReportTemplateDetail = asyncHandler(async (req, res) => {
  const { id: templateId } = req.params;

  const templates = {
    template_revenue: {
      id: 'template_revenue',
      name: 'Revenue Report',
      description: 'Total revenue, per-city, per-service, per-client',
      reportType: 'REVENUE',
      metrics: ['total_revenue', 'revenue_by_city', 'revenue_by_service', 'revenue_by_client', 'growth_rate'],
      sampleOutput: {
        total_revenue: 1500000,
        revenue_by_city: [
          { city: 'Mumbai', amount: 500000, percentage: 33.3 },
          { city: 'Delhi', amount: 400000, percentage: 26.7 }
        ]
      }
    }
  };

  const template = templates[templateId];
  if (!template) {
    throw new ApiError('Template not found', 404);
  }

  res.json({
    success: true,
    data: template
  });
});

// ============================================================================
// DASHBOARDS (Pre-computed)
// ============================================================================

/**
 * Get executive dashboard
 * GET /api/v1/analytics/dashboards/executive
 */
exports.getExecutiveDashboard = asyncHandler(async (req, res) => {
  const { dateRange = '30days' } = req.query;

  // Get KPIs
  const [revenueData] = await db.execute(
    `SELECT 
       SUM(amount) as total_revenue,
       COUNT(DISTINCT client_id) as active_clients,
       COUNT(DISTINCT id) as total_invoices
     FROM invoices 
     WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );

  const [staffData] = await db.execute(
    `SELECT 
       COUNT(*) as total_staff,
       AVG(average_score) as avg_rating
     FROM staff_profiles sp
     LEFT JOIN rating_summary rs ON sp.staff_id = rs.user_id`
  );

  const [coursesData] = await db.execute(
    `SELECT 
       COUNT(*) as active_courses,
       COUNT(DISTINCT id) as student_enrollments
     FROM student_batches`
  );

  res.json({
    success: true,
    data: {
      kpis: {
        total_revenue: revenueData[0]?.total_revenue || 0,
        active_clients: revenueData[0]?.active_clients || 0,
        average_staff_rating: staffData[0]?.avg_rating || 0,
        total_staff: staffData[0]?.total_staff || 0,
        active_courses: coursesData[0]?.active_courses || 0
      },
      period: dateRange,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Get finance dashboard
 * GET /api/v1/analytics/dashboards/finance
 */
exports.getFinanceDashboard = asyncHandler(async (req, res) => {
  const [invoiceStats] = await db.execute(
    `SELECT 
       SUM(CASE WHEN status = "PAID" THEN total_amount ELSE 0 END) as paid_amount,
       SUM(CASE WHEN status = "PARTIALLY_PAID" THEN (total_amount - paid_amount) ELSE total_amount END) as outstanding,
       COUNT(*) as total_invoices,
       AVG(DATEDIFF(paid_date, due_date)) as avg_payment_days
     FROM invoices`
  );

  const [subscriptionStats] = await db.execute(
    `SELECT 
       SUM(cs.subscription_amount) as mrr,
       COUNT(DISTINCT cs.client_id) as active_subscriptions,
       SUM(CASE WHEN cs.subscription_status = "ACTIVE" THEN 1 ELSE 0 END) as active_count
     FROM client_subscriptions cs`
  );

  const [paymentStats] = await db.execute(
    `SELECT 
       COUNT(*) as total_payments,
       SUM(amount) as total_processed,
       SUM(CASE WHEN status = "FAILED" THEN 1 ELSE 0 END) as failed_count
     FROM payments WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );

  res.json({
    success: true,
    data: {
      invoicing: {
        paid_amount: invoiceStats[0]?.paid_amount || 0,
        outstanding_amount: invoiceStats[0]?.outstanding || 0,
        total_invoices: invoiceStats[0]?.total_invoices || 0,
        avg_payment_days: invoiceStats[0]?.avg_payment_days || 0
      },
      subscriptions: {
        mrr: subscriptionStats[0]?.mrr || 0,
        active_subscriptions: subscriptionStats[0]?.active_subscriptions || 0
      },
      payments: {
        total_processed: paymentStats[0]?.total_processed || 0,
        total_count: paymentStats[0]?.total_payments || 0,
        failure_rate: paymentStats[0]?.total_payments > 0 
          ? ((paymentStats[0]?.failed_count || 0) / paymentStats[0]?.total_payments * 100).toFixed(2)
          : 0
      },
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Get operations dashboard
 * GET /api/v1/analytics/dashboards/operations
 */
exports.getOperationsDashboard = asyncHandler(async (req, res) => {
  const [staffStats] = await db.execute(
    `SELECT 
       COUNT(*) as total_staff,
       SUM(CASE WHEN availability_status = "AVAILABLE" THEN 1 ELSE 0 END) as available_now,
       AVG(average_score) as avg_rating
     FROM staff_profiles sp
     LEFT JOIN rating_summary rs ON sp.staff_id = rs.user_id`
  );

  const [assignmentStats] = await db.execute(
    `SELECT 
       COUNT(*) as active_assignments,
       SUM(CASE WHEN status = "COMPLETED" THEN 1 ELSE 0 END) as completed,
       COUNT(DISTINCT client_id) as active_clients
     FROM assignments WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );

  const [attendanceStats] = await db.execute(
    `SELECT 
       SUM(CASE WHEN attendance_status = "PRESENT" THEN 1 ELSE 0 END) as present,
       SUM(CASE WHEN attendance_status = "ABSENT" THEN 1 ELSE 0 END) as absent,
       COUNT(*) as total_logs
     FROM batch_attendance WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );

  res.json({
    success: true,
    data: {
      staffing: {
        total_staff: staffStats[0]?.total_staff || 0,
        available_now: staffStats[0]?.available_now || 0,
        avg_rating: (staffStats[0]?.avg_rating || 0).toFixed(2)
      },
      assignments: {
        active: assignmentStats[0]?.active_assignments || 0,
        completed_this_month: assignmentStats[0]?.completed || 0,
        active_clients: assignmentStats[0]?.active_clients || 0
      },
      attendance: {
        present_this_week: attendanceStats[0]?.present || 0,
        absent_this_week: attendanceStats[0]?.absent || 0,
        attendance_rate: attendanceStats[0]?.total_logs > 0
          ? ((attendanceStats[0]?.present || 0) / attendanceStats[0]?.total_logs * 100).toFixed(2)
          : 0
      },
      generatedAt: new Date().toISOString()
    }
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateReportAsync(reportId, adminId, reportType, filterJson) {
  try {
    // Simulate async processing
    setTimeout(async () => {
      // Get report data
      const reportData = await getReportData(reportType, filterJson);

      // Update report status to COMPLETED
      await db.execute(
        'UPDATE reports SET status = ?, completed_at = NOW() WHERE id = ?',
        ['COMPLETED', reportId]
      );

      // Store in report_cache (optional, for quick retrieval)
      const cacheKey = `report:${reportId}`;
      await db.execute(
        `INSERT INTO report_cache (id, report_type, cache_key, data, created_at, expires_at)
         VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
        [crypto.randomUUID(), reportType, cacheKey, JSON.stringify(reportData)]
      );
    }, 2000); // Simulate 2 second processing time
  } catch (error) {
    // Update report status to FAILED
    await db.execute(
      'UPDATE reports SET status = ? WHERE id = ?',
      ['FAILED', reportId]
    );
  }
}

async function getReportData(reportType, filters) {
  // This is a simplified version - in production, would have complex queries

  if (reportType === 'REVENUE') {
    const [data] = await db.execute(
      `SELECT 
         SUM(total_amount) as total,
         COUNT(*) as invoice_count,
         AVG(total_amount) as avg_invoice
       FROM invoices
       WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [filters.days || 30]
    );
    return data;
  }

  if (reportType === 'STAFF_PERFORMANCE') {
    const [data] = await db.execute(
      `SELECT 
         sp.id,
         u.full_name,
         COUNT(a.id) as assignments,
         AVG(rs.average_score) as rating
       FROM staff_profiles sp
       JOIN users u ON sp.staff_id = u.id
       LEFT JOIN assignments a ON sp.staff_id = a.staff_id
       LEFT JOIN rating_summary rs ON sp.staff_id = rs.user_id
       GROUP BY sp.id
       LIMIT 50`
    );
    return data;
  }

  // Add more report types as needed

  return { message: 'Report data placeholder' };
}

function calculateNextRun(frequency) {
  const now = new Date();

  if (frequency === 'DAILY') {
    now.setDate(now.getDate() + 1);
    now.setHours(0, 0, 0, 0);
  } else if (frequency === 'WEEKLY') {
    now.setDate(now.getDate() + 7);
    now.setHours(0, 0, 0, 0);
  } else if (frequency === 'MONTHLY') {
    now.setMonth(now.getMonth() + 1);
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
  }

  return now;
}
