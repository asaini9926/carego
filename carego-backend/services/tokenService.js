// ============================================================
// JWT & TOKEN SERVICE
// ============================================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate Access Token (15 minutes)
 * Contains: uid, role, channel, profileId, scopes
 */
const generateAccessToken = (user, profileId = null, sessionId = null) => {
  const payload = {
    uid: user.id,
    phone: user.phone,
    role: user.user_type,
    profileId: profileId,
    sessionId: sessionId,
    channel: 'APP', // or 'ADMIN'
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });
};

/**
 * Generate Refresh Token (7 days)
 * Minimal payload, hashed in DB
 */
const generateRefreshToken = (user, sessionId) => {
  const payload = {
    uid: user.id,
    sessionId: sessionId,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });
};

/**
 * Hash refresh token before storing in DB
 */
const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify and decode JWT
 */
const verifyToken = (token, isRefresh = false) => {
  try {
    const secret = isRefresh ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyToken
};
