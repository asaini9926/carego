const { asyncHandler, ApiError } = require('../utils/errors');
const db = require('../config/db');
const { logAction } = require('../middleware/auditMiddleware');
const crypto = require('crypto');

// ============================================================================
// RATING CREATION & RETRIEVAL
// ============================================================================

/**
 * Create rating for user (staff or student)
 * Only allowed after assignment/course completion
 * POST /api/v1/ratings
 */
exports.createRating = asyncHandler(async (req, res) => {
  const { rateeId, ratingType, assignmentId, score, comment, isAnonymous = false } = req.body;
  const raterId = req.user.uid;

  // Validation
  if (!rateeId || !ratingType || !score) {
    throw new ApiError('Missing required fields', 400);
  }

  if (score < 1 || score > 5) {
    throw new ApiError('Score must be between 1 and 5', 400);
  }

  if (ratingType !== 'STAFF' && ratingType !== 'STUDENT') {
    throw new ApiError('Invalid rating type', 400);
  }

  // Prevent self-rating
  if (raterId === rateeId) {
    throw new ApiError('Cannot rate yourself', 400);
  }

  // Verify user exists
  const [users] = await db.execute(
    'SELECT * FROM users WHERE id = ?',
    [rateeId]
  );

  if (users.length === 0) {
    throw new ApiError('User not found', 404);
  }

  // If rating is for assignment, verify it's completed
  if (assignmentId) {
    const [assignments] = await db.execute(
      'SELECT * FROM assignments WHERE id = ?',
      [assignmentId]
    );

    if (assignments.length === 0) {
      throw new ApiError('Assignment not found', 404);
    }

    const assignment = assignments[0];
    if (assignment.status !== 'COMPLETED') {
      throw new ApiError('Can only rate completed assignments', 400);
    }

    // Verify rater was involved in assignment
    if (ratingType === 'STAFF' && assignment.staff_id !== rateeId) {
      throw new ApiError('Staff ID does not match assignment', 400);
    }
  }

  // Check if rating already exists for this assignment
  if (assignmentId) {
    const [existing] = await db.execute(
      'SELECT * FROM ratings WHERE rater_id = ? AND ratee_id = ? AND assignment_id = ? AND deleted_at IS NULL',
      [raterId, rateeId, assignmentId]
    );

    if (existing.length > 0) {
      throw new ApiError('You have already rated this assignment', 400);
    }
  }

  // Create rating
  const ratingId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO ratings 
     (id, rater_id, ratee_id, rating_type, assignment_id, score, comment, is_anonymous, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [ratingId, raterId, rateeId, ratingType, assignmentId, score, comment, isAnonymous]
  );

  // Update rating summary cache (recalculate)
  await updateRatingSummary(rateeId);

  // Audit log
  await logAction({
    userId: raterId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Rating',
    entityId: ratingId,
    newValues: {
      ratee_id: rateeId,
      rating_type: ratingType,
      score,
      assignment_id: assignmentId
    },
    changeReason: 'Rating created',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Rating submitted',
    data: {
      ratingId,
      score,
      createdAt: new Date().toISOString()
    }
  });
});

/**
 * Get my ratings (ratings I've received)
 * GET /api/v1/ratings/me
 */
exports.getMyRatings = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { limit = 10, offset = 0 } = req.query;

  const [ratings] = await db.execute(
    `SELECT 
       r.*,
       u.full_name as rater_name,
       CASE WHEN r.is_anonymous THEN 'Anonymous' ELSE u.full_name END as display_name
     FROM ratings r
     LEFT JOIN users u ON r.rater_id = u.id
     WHERE r.ratee_id = ? AND r.deleted_at IS NULL
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, parseInt(limit), parseInt(offset)]
  );

  const [totalResults] = await db.execute(
    'SELECT COUNT(*) as count FROM ratings WHERE ratee_id = ? AND deleted_at IS NULL',
    [userId]
  );

  res.json({
    success: true,
    data: ratings,
    pagination: {
      total: totalResults[0].count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

/**
 * Get user's public ratings
 * GET /api/v1/users/:id/ratings
 */
exports.getUserRatings = asyncHandler(async (req, res) => {
  const { id: userId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  // Verify user exists
  const [users] = await db.execute(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    throw new ApiError('User not found', 404);
  }

  const [ratings] = await db.execute(
    `SELECT 
       id,
       score,
       comment,
       created_at,
       CASE WHEN is_anonymous THEN 'Anonymous User' ELSE (SELECT full_name FROM users WHERE id = rater_id) END as rater_name
     FROM ratings
     WHERE ratee_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, parseInt(limit), parseInt(offset)]
  );

  const [summary] = await db.execute(
    'SELECT * FROM rating_summary WHERE user_id = ?',
    [userId]
  );

  res.json({
    success: true,
    data: {
      ratings,
      summary: summary.length > 0 ? summary[0] : null
    },
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

/**
 * Get rating for specific assignment
 * GET /api/v1/ratings/assignment/:id
 */
exports.getAssignmentRating = asyncHandler(async (req, res) => {
  const { id: assignmentId } = req.params;

  const [rating] = await db.execute(
    'SELECT * FROM ratings WHERE assignment_id = ? AND deleted_at IS NULL',
    [assignmentId]
  );

  if (rating.length === 0) {
    return res.json({
      success: true,
      data: null,
      message: 'No rating for this assignment'
    });
  }

  res.json({
    success: true,
    data: rating[0]
  });
});

/**
 * Delete rating (soft delete)
 * DELETE /api/v1/ratings/:id
 */
exports.deleteRating = asyncHandler(async (req, res) => {
  const { id: ratingId } = req.params;
  const userId = req.user.uid;

  // Verify ownership
  const [ratings] = await db.execute(
    'SELECT * FROM ratings WHERE id = ?',
    [ratingId]
  );

  if (ratings.length === 0) {
    throw new ApiError('Rating not found', 404);
  }

  const rating = ratings[0];

  if (rating.rater_id !== userId && req.user.role !== 'ADMIN') {
    throw new ApiError('Unauthorized', 403);
  }

  // Soft delete
  await db.execute(
    'UPDATE ratings SET deleted_at = NOW() WHERE id = ?',
    [ratingId]
  );

  // Update summary
  await updateRatingSummary(rating.ratee_id);

  // Audit log
  await logAction({
    userId,
    userRole: req.user.role,
    action: 'DELETE',
    entityType: 'Rating',
    entityId: ratingId,
    oldValues: { score: rating.score },
    changeReason: 'Rating deleted',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Rating deleted'
  });
});

// ============================================================================
// RATING SUMMARY
// ============================================================================

/**
 * Get rating summary for user
 * GET /api/v1/ratings/summary/:userId
 */
exports.getRatingSummary = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const [summary] = await db.execute(
    'SELECT * FROM rating_summary WHERE user_id = ?',
    [userId]
  );

  if (summary.length === 0) {
    return res.json({
      success: true,
      data: {
        total_ratings: 0,
        average_score: 0,
        breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    });
  }

  const data = summary[0];
  res.json({
    success: true,
    data: {
      total_ratings: data.total_ratings,
      average_score: data.average_score,
      breakdown: {
        1: data.score_1_count,
        2: data.score_2_count,
        3: data.score_3_count,
        4: data.score_4_count,
        5: data.score_5_count
      }
    }
  });
});

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Get all ratings (admin only)
 * GET /api/v1/admin/ratings
 */
exports.getAllRatings = asyncHandler(async (req, res) => {
  const { rateeId, ratingType, minScore, limit = 20, offset = 0 } = req.query;

  let query = 'SELECT * FROM ratings WHERE deleted_at IS NULL';
  const params = [];

  if (rateeId) {
    query += ' AND ratee_id = ?';
    params.push(rateeId);
  }

  if (ratingType) {
    query += ' AND rating_type = ?';
    params.push(ratingType);
  }

  if (minScore) {
    query += ' AND score >= ?';
    params.push(parseInt(minScore));
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [ratings] = await db.execute(query, params);

  const [totalResults] = await db.execute(
    'SELECT COUNT(*) as count FROM ratings WHERE deleted_at IS NULL'
  );

  res.json({
    success: true,
    data: ratings,
    pagination: {
      total: totalResults[0].count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

/**
 * Flag inappropriate rating (admin)
 * PATCH /api/v1/admin/ratings/:id/flag
 */
exports.flagRating = asyncHandler(async (req, res) => {
  const { id: ratingId } = req.params;
  const { reason } = req.body;

  // Update rating with flag
  await db.execute(
    'UPDATE ratings SET flag_reason = ?, flagged_at = NOW() WHERE id = ?',
    [reason, ratingId]
  );

  res.json({
    success: true,
    message: 'Rating flagged for review'
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function updateRatingSummary(userId) {
  // Get all ratings for user (not deleted)
  const [ratings] = await db.execute(
    `SELECT score FROM ratings WHERE ratee_id = ? AND deleted_at IS NULL`,
    [userId]
  );

  if (ratings.length === 0) {
    // Delete summary if no ratings
    await db.execute(
      'DELETE FROM rating_summary WHERE user_id = ?',
      [userId]
    );
    return;
  }

  // Calculate statistics
  const scores = ratings.map(r => r.score);
  const total = scores.length;
  const average = (scores.reduce((a, b) => a + b, 0) / total).toFixed(2);
  const breakdown = {
    1: scores.filter(s => s === 1).length,
    2: scores.filter(s => s === 2).length,
    3: scores.filter(s => s === 3).length,
    4: scores.filter(s => s === 4).length,
    5: scores.filter(s => s === 5).length
  };

  // Insert or update summary
  const [existing] = await db.execute(
    'SELECT * FROM rating_summary WHERE user_id = ?',
    [userId]
  );

  if (existing.length > 0) {
    await db.execute(
      `UPDATE rating_summary 
       SET total_ratings = ?, average_score = ?, 
           score_1_count = ?, score_2_count = ?, score_3_count = ?, 
           score_4_count = ?, score_5_count = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [
        total,
        average,
        breakdown[1],
        breakdown[2],
        breakdown[3],
        breakdown[4],
        breakdown[5],
        userId
      ]
    );
  } else {
    await db.execute(
      `INSERT INTO rating_summary 
       (user_id, total_ratings, average_score, score_1_count, score_2_count, 
        score_3_count, score_4_count, score_5_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        total,
        average,
        breakdown[1],
        breakdown[2],
        breakdown[3],
        breakdown[4],
        breakdown[5]
      ]
    );
  }
}
