// ============================================================
// SESSION MANAGEMENT SERVICE
// ============================================================

const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { hashRefreshToken } = require('./tokenService');

/**
 * Create a new session for user login
 */
const createSession = async (userId, refreshToken, ipAddress, userAgent) => {
  const sessionId = uuidv4();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    const query = `
      INSERT INTO sessions (id, user_id, refresh_token_hash, ip_address, user_agent, expires_at, is_valid)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(query, [
      sessionId,
      userId,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
      true
    ]);

    return sessionId;
  } catch (error) {
    console.error('❌ Session creation failed:', error);
    throw error;
  }
};

/**
 * Validate session exists and is valid
 */
const validateSession = async (sessionId, userId) => {
  try {
    const query = `
      SELECT * FROM sessions 
      WHERE id = ? AND user_id = ? AND is_valid = TRUE AND expires_at > NOW()
    `;

    const [sessions] = await db.execute(query, [sessionId, userId]);

    return sessions.length > 0 ? sessions[0] : null;
  } catch (error) {
    console.error('❌ Session validation failed:', error);
    return null;
  }
};

/**
 * Revoke a session (logout)
 */
const revokeSession = async (sessionId) => {
  try {
    const query = `
      UPDATE sessions SET is_valid = FALSE, updated_at = NOW()
      WHERE id = ?
    `;

    await db.execute(query, [sessionId]);
    return true;
  } catch (error) {
    console.error('❌ Session revocation failed:', error);
    throw error;
  }
};

/**
 * Revoke all sessions for a user (account termination/lockout)
 */
const revokeAllUserSessions = async (userId) => {
  try {
    const query = `
      UPDATE sessions SET is_valid = FALSE, updated_at = NOW()
      WHERE user_id = ?
    `;

    await db.execute(query, [userId]);
    return true;
  } catch (error) {
    console.error('❌ Bulk session revocation failed:', error);
    throw error;
  }
};

/**
 * Clean up expired sessions (run periodically)
 */
const cleanupExpiredSessions = async () => {
  try {
    const query = `
      DELETE FROM sessions WHERE expires_at < NOW() OR is_valid = FALSE
    `;

    const result = await db.execute(query);
    console.log('✅ Cleanup: Removed expired sessions');
    return result;
  } catch (error) {
    console.error('❌ Session cleanup failed:', error);
  }
};

module.exports = {
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions,
  cleanupExpiredSessions
};
