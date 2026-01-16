const { asyncHandler, ApiError } = require('../utils/errors');
const db = require('../config/db');
const { logAction } = require('../middleware/auditMiddleware');
const crypto = require('crypto');

// ============================================================================
// RECOMMENDATIONS ENGINE
// ============================================================================

/**
 * Get recommended staff for client
 * Based on: specialization match, availability, location, rating
 * GET /api/v1/recommendations/staff/:clientId
 */
exports.getStaffRecommendations = asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  // Get client details
  const [clients] = await db.execute(
    'SELECT * FROM users WHERE id = ? AND role = "CLIENT"',
    [clientId]
  );

  if (clients.length === 0) {
    throw new ApiError('Client not found', 404);
  }

  const client = clients[0];

  // Get client's city
  const [clientProfile] = await db.execute(
    'SELECT * FROM client_profiles WHERE client_id = ?',
    [clientId]
  );

  const clientCity = clientProfile.length > 0 ? clientProfile[0].city_id : null;

  // Get staff with scores
  let query = `
    SELECT 
      s.id,
      s.full_name,
      s.specialization,
      s.city_id,
      s.availability_status,
      rs.average_score,
      rs.total_ratings,
      CASE 
        WHEN s.city_id = ? THEN 0.4
        ELSE 0.0
      END as location_score,
      (COALESCE(rs.average_score, 3) / 5.0) * 0.2 as rating_score,
      (CASE WHEN s.availability_status = 'AVAILABLE' THEN 0.2 ELSE 0.0 END) as availability_score
    FROM users s
    LEFT JOIN staff_profiles sp ON s.id = sp.staff_id
    LEFT JOIN rating_summary rs ON s.id = rs.user_id
    WHERE s.role = 'STAFF' AND sp.is_verified = TRUE
    ORDER BY 
      location_score + rating_score + availability_score DESC
    LIMIT ? OFFSET ?
  `;

  const params = [clientCity, parseInt(limit), parseInt(offset)];
  const [staffList] = await db.execute(query, params);

  // Calculate relevance scores
  const recommendations = staffList.map(staff => ({
    id: staff.id,
    name: staff.full_name,
    specialization: staff.specialization,
    city_id: staff.city_id,
    availability: staff.availability_status,
    rating: {
      average: staff.average_score || 0,
      total_ratings: staff.total_ratings || 0
    },
    relevance_score: (staff.location_score + staff.rating_score + staff.availability_score).toFixed(2),
    reason: generateStaffRecommendationReason(staff)
  }));

  // Store recommendation interactions
  for (const rec of recommendations) {
    const recId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO recommendations 
       (id, recipient_id, recommendation_type, target_id, relevance_score, reason, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [
        recId,
        clientId,
        'STAFF',
        rec.id,
        rec.relevance_score,
        rec.reason
      ]
    );
  }

  res.json({
    success: true,
    data: recommendations,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: staffList.length
    }
  });
});

/**
 * Get recommended courses for student
 * Based on: demand signals, career path fit, skills gap, completion rate
 * GET /api/v1/recommendations/courses/:studentId
 */
exports.getCourseRecommendations = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  // Get student details
  const [students] = await db.execute(
    'SELECT * FROM users WHERE id = ? AND role = "STUDENT"',
    [studentId]
  );

  if (students.length === 0) {
    throw new ApiError('Student not found', 404);
  }

  // Get student's completed courses
  const [completedCourses] = await db.execute(
    `SELECT DISTINCT c.specialization FROM course_batches cb
     JOIN student_batches sb ON cb.id = sb.batch_id
     JOIN courses c ON cb.course_id = c.id
     WHERE sb.student_id = ? AND sb.enrollment_status = 'COMPLETED'`,
    [studentId]
  );

  const completedSpecializations = completedCourses.map(c => c.specialization);

  // Get trending courses not yet enrolled
  const [recommendations] = await db.execute(
    `SELECT 
       c.id,
       c.name,
       c.specialization,
       c.duration_weeks,
       c.level,
       COUNT(sb.id) as student_count,
       AVG(CASE WHEN sb.enrollment_status = 'COMPLETED' THEN 1 ELSE 0 END) as completion_rate,
       (
         SELECT COUNT(*) FROM assignments a 
         WHERE a.batch_id IN (SELECT id FROM course_batches WHERE course_id = c.id)
       ) as assignment_count,
       CASE 
         WHEN c.specialization NOT IN (?) THEN 0.4
         ELSE 0.1
       END as novelty_score,
       COUNT(sb.id) * 0.3 as demand_score
     FROM courses c
     LEFT JOIN course_batches cb ON c.id = cb.course_id
     LEFT JOIN student_batches sb ON cb.id = sb.batch_id
     WHERE c.id NOT IN (
       SELECT DISTINCT course_id FROM course_batches 
       WHERE id IN (SELECT batch_id FROM student_batches WHERE student_id = ?)
     )
     GROUP BY c.id
     ORDER BY demand_score + novelty_score DESC
     LIMIT ? OFFSET ?
    `,
    [JSON.stringify(completedSpecializations), studentId, parseInt(limit), parseInt(offset)]
  );

  const courseRecommendations = recommendations.map(course => ({
    id: course.id,
    name: course.name,
    specialization: course.specialization,
    level: course.level,
    duration_weeks: course.duration_weeks,
    student_enrollment: course.student_count,
    completion_rate: (course.completion_rate * 100).toFixed(1) + '%',
    relevance_score: (course.demand_score + course.novelty_score).toFixed(2),
    reason: generateCourseRecommendationReason(course)
  }));

  // Store recommendations
  for (const rec of courseRecommendations) {
    const recId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO recommendations 
       (id, recipient_id, recommendation_type, target_id, relevance_score, reason, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [
        recId,
        studentId,
        'COURSE',
        rec.id,
        rec.relevance_score,
        rec.reason
      ]
    );
  }

  res.json({
    success: true,
    data: courseRecommendations,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

/**
 * Get recommended services for client
 * Based on: usage patterns, market demand, client profile
 * GET /api/v1/recommendations/services/:clientId
 */
exports.getServiceRecommendations = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  // Get client's current service usage
  const [currentServices] = await db.execute(
    `SELECT DISTINCT service_type FROM assignments a
     WHERE a.client_id = ? AND a.created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)`,
    [clientId]
  );

  const usedServices = currentServices.map(s => s.service_type);

  // Get trending services
  const [recommendations] = await db.execute(
    `SELECT 
       s.id,
       s.service_name,
       s.service_type,
       COUNT(a.id) as usage_count,
       AVG(sr.average_score) as avg_quality_score
     FROM services s
     LEFT JOIN assignments a ON s.id = a.service_id
     LEFT JOIN service_ratings sr ON s.id = sr.service_id
     WHERE s.service_type NOT IN (?)
     GROUP BY s.id
     ORDER BY usage_count DESC, avg_quality_score DESC
     LIMIT 10
    `,
    [JSON.stringify(usedServices)]
  );

  const serviceRecommendations = recommendations.map((service, index) => ({
    id: service.id,
    name: service.service_name,
    service_type: service.service_type,
    current_usage_count: service.usage_count || 0,
    quality_score: service.avg_quality_score || 0,
    position: index + 1,
    reason: `This service is trending with ${service.usage_count || 0} active users in your region`
  }));

  res.json({
    success: true,
    data: serviceRecommendations
  });
});

/**
 * Log recommendation feedback
 * POST /api/v1/recommendations/feedback
 */
exports.logRecommendationFeedback = asyncHandler(async (req, res) => {
  const { recommendationId, action } = req.body;
  const userId = req.user.uid;

  // Validate action
  const validActions = ['CLICKED', 'HIRED', 'IGNORED', 'SAVED'];
  if (!validActions.includes(action)) {
    throw new ApiError('Invalid action', 400);
  }

  // Check recommendation exists
  const [recommendations] = await db.execute(
    'SELECT * FROM recommendations WHERE id = ?',
    [recommendationId]
  );

  if (recommendations.length === 0) {
    throw new ApiError('Recommendation not found', 404);
  }

  // Log feedback
  const feedbackId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO recommendation_feedback 
     (id, recommendation_id, user_id, action, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [feedbackId, recommendationId, userId, action]
  );

  // Update recommendation action counts for ML model training
  const recommendation = recommendations[0];
  await updateTrendingAnalytics(recommendation.target_id, action);

  res.json({
    success: true,
    message: 'Feedback recorded'
  });
});

/**
 * Get trending services/courses
 * GET /api/v1/recommendations/trending
 */
exports.getTrendingItems = asyncHandler(async (req, res) => {
  const { entityType = 'COURSE', period = 'WEEKLY' } = req.query;

  // Validate inputs
  const validTypes = ['COURSE', 'SERVICE'];
  const validPeriods = ['DAILY', 'WEEKLY', 'MONTHLY'];

  if (!validTypes.includes(entityType)) {
    throw new ApiError('Invalid entity type', 400);
  }

  if (!validPeriods.includes(period)) {
    throw new ApiError('Invalid period', 400);
  }

  // Get trending data
  const [trendingData] = await db.execute(
    `SELECT * FROM trending_analytics 
     WHERE entity_type = ? AND time_period = ?
     ORDER BY view_count + hire_count + enroll_count DESC
     LIMIT 10`,
    [entityType, period]
  );

  // Enrich with entity details
  const enrichedTrending = await Promise.all(
    trendingData.map(async (item) => {
      let details;

      if (entityType === 'COURSE') {
        const [courses] = await db.execute(
          'SELECT name, specialization FROM courses WHERE id = ?',
          [item.entity_id]
        );
        details = courses.length > 0 ? courses[0] : null;
      } else {
        const [services] = await db.execute(
          'SELECT service_name, service_type FROM services WHERE id = ?',
          [item.entity_id]
        );
        details = services.length > 0 ? services[0] : null;
      }

      return {
        id: item.entity_id,
        ...details,
        views: item.view_count,
        hires_or_enrollments: entityType === 'COURSE' ? item.enroll_count : item.hire_count,
        trend_period: period,
        calculated_at: item.calculated_at
      };
    })
  );

  res.json({
    success: true,
    data: enrichedTrending,
    period
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateStaffRecommendationReason(staff) {
  const reasons = [];

  if (staff.location_score > 0) {
    reasons.push('Located in your city');
  }

  if (staff.average_score >= 4.5) {
    reasons.push('Highly rated professional');
  } else if (staff.average_score >= 4.0) {
    reasons.push('Good ratings from clients');
  }

  if (staff.availability_score > 0) {
    reasons.push('Currently available');
  }

  return reasons.join('. ') || 'Matches your requirements';
}

function generateCourseRecommendationReason(course) {
  const reasons = [];

  if (course.demand_score > 50) {
    reasons.push('Trending in your region');
  }

  if (course.completion_rate > 0.8) {
    reasons.push('High completion rate');
  }

  if (course.level === 'ADVANCED') {
    reasons.push('Advanced level course');
  }

  return reasons.join('. ') || 'Recommended for your career path';
}

async function updateTrendingAnalytics(entityId, action) {
  const period = 'WEEKLY';
  const cacheKey = `trending:${entityId}:${period}`;

  // Update counter in trending_analytics table
  const [existing] = await db.execute(
    'SELECT * FROM trending_analytics WHERE entity_id = ? AND time_period = ?',
    [entityId, period]
  );

  if (existing.length > 0) {
    let updateQuery = 'UPDATE trending_analytics SET ';
    const updateParams = [];

    if (action === 'CLICKED') {
      updateQuery += 'view_count = view_count + 1';
    } else if (action === 'HIRED') {
      updateQuery += 'hire_count = hire_count + 1';
    } else if (action === 'SAVED' || action === 'IGNORED') {
      // Track implicit engagement
    }

    updateQuery += ' WHERE entity_id = ? AND time_period = ?';
    updateParams.push(entityId, period);

    await db.execute(updateQuery, updateParams);
  }
}
