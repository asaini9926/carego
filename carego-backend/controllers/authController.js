const db = require('../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { generateAccessToken, generateRefreshToken, verifyToken, hashRefreshToken } = require('../services/tokenService');
const { createSession, revokeSession } = require('../services/sessionService');
const { logAction } = require('../services/auditService');
const { isValidPhone, isValidEmail } = require('../utils/validators');
const { asyncHandler, ApiError } = require('../utils/errors');
const { logInfo, logError } = require('../utils/logger');

/**
 * POST /api/v1/auth/login
 * Login user with phone and password
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password) {
    throw new ApiError('Phone and password are required', 400);
  }

  if (!isValidEmail(email)) {
    throw new ApiError('Invalid email format', 400);
  }

  // 2. Find user by phone
  const [users] = await db.execute(
    `SELECT id, email, phone, user_type, account_status, password_hash 
     FROM users WHERE email = ? AND is_active = TRUE`,
    [email]
  );

  if (users.length === 0) {
    throw new ApiError('Invalid credentials', 401);
  }

  const user = users[0];

  // 3. Check account status
  if (user.account_status === 'SUSPENDED') {
    throw new ApiError('Account is suspended. Contact admin.', 403);
  }

  if (user.account_status === 'TERMINATED') {
    throw new ApiError('Account has been terminated.', 403);
  }

  // 4. Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new ApiError('Invalid credentials', 401);
  }

  // 5. Get profile ID (if exists)
  let profileId = null;
  const profileTable = `${user.user_type.toLowerCase()}_profiles`;

  try {
    const [profiles] = await db.execute(
      `SELECT user_id FROM ${profileTable} WHERE user_id = ?`,
      [user.id]
    );
    if (profiles.length > 0) {
      profileId = user.id;
    }
  } catch (error) {
    // Profile table might not exist for this role, that's OK
  }

  // 6. Create session
  const refreshToken = generateRefreshToken(user, null);
  const sessionId = await createSession(
    user.id,
    refreshToken,
    req.ip,
    req.get('user-agent')
  );

  // 7. Generate tokens with sessionId
  const accessToken = generateAccessToken(user, profileId, sessionId);
  const refreshTokenWithSession = generateRefreshToken(user, sessionId);

  // 8. Update session with refresh token hash
  await db.execute(
    'UPDATE sessions SET refresh_token_hash = ? WHERE id = ?',
    [hashRefreshToken(refreshTokenWithSession), sessionId]
  );

  // 9. Log action
  await logAction({
    userId: user.id,
    userRole: user.user_type,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  logInfo(`User ${email} logged in`);

  // 10. Send response
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        phone: user.phone,
        userType: user.user_type
      },
      accessToken,
      refreshToken: refreshTokenWithSession,
      expiresIn: 900 // 15 minutes in seconds
    }
  });
});

/**
 * GET /api/v1/auth/me
 * Get current logged-in user
 */
exports.me = asyncHandler(async (req, res) => {
  const [users] = await db.execute(
    `SELECT id, email, phone, user_type, account_status
     FROM users
     WHERE id = ? AND is_active = TRUE`,
    [req.user.uid]
  );

  if (users.length === 0) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: users[0]
  });
});


/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError('Refresh token required', 400);
  }

  // 1. Verify refresh token
  let decoded;
  try {
    decoded = verifyToken(refreshToken, true);
  } catch (error) {
    throw new ApiError('Invalid refresh token', 401);
  }

  // 2. Validate session
  const [sessions] = await db.execute(
    `SELECT * FROM sessions 
     WHERE id = ? AND user_id = ? AND is_valid = TRUE AND expires_at > NOW()`,
    [decoded.sessionId, decoded.uid]
  );

  if (sessions.length === 0) {
    throw new ApiError('Session has expired or been revoked', 401);
  }

  // 3. Verify token hash matches
  const tokenHash = require('crypto').createHash('sha256').update(refreshToken).digest('hex');
  if (sessions[0].refresh_token_hash !== tokenHash) {
    throw new ApiError('Refresh token mismatch', 401);
  }

  // 4. Get user
  const [users] = await db.execute(
    `SELECT id, phone, user_type FROM users WHERE id = ? AND is_active = TRUE`,
    [decoded.uid]
  );

  if (users.length === 0) {
    throw new ApiError('User not found', 404);
  }

  const user = users[0];

  // 5. Generate new access token
  let profileId = null;
  try {
    const [profiles] = await db.execute(
      `SELECT user_id FROM ${user.user_type.toLowerCase()}_profiles WHERE user_id = ?`,
      [user.id]
    );
    if (profiles.length > 0) {
      profileId = user.id;
    }
  } catch (error) {
    // Profile doesn't exist
  }

  const newAccessToken = generateAccessToken(user, profileId, decoded.sessionId);

  logInfo(`Token refreshed for user ${user.phone}`);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken: newAccessToken,
      expiresIn: 900 // 15 minutes in seconds
    }
  });
});

/**
 * POST /api/v1/auth/logout
 * Logout user (revoke session)
 */
exports.logout = asyncHandler(async (req, res) => {
  const { sessionId } = req.user;

  if (!sessionId) {
    throw new ApiError('Session ID required', 400);
  }

  // Revoke session
  await revokeSession(sessionId);

  // Log action
  await logAction({
    userId: req.user.uid,
    userRole: req.user.role,
    action: 'LOGOUT',
    entityType: 'Session',
    entityId: sessionId,
    ipAddress: req.ip
  });

  logInfo(`User ${req.user.uid} logged out`);

  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});