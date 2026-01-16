const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { validateSession } = require('../services/sessionService');
const { logError } = require('../utils/logger');

/**
 * 1. PROTECT MIDDLEWARE - Verify JWT Token
 * Validates token signature, expiration, and session validity
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Extract Bearer token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    // Verify JWT signature & expiration
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Verify session is still valid
    const session = await validateSession(decoded.sessionId, decoded.uid);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired or been revoked'
      });
    }

    // Fetch full user from DB (to check if account is still active)
    const [users] = await db.execute(
      'SELECT id, phone, user_type, account_status FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.uid]
    );

    if (users.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive or does not exist'
      });
    }

    const user = users[0];

    // Check if account is suspended or terminated
    if (user.account_status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'User account is ' + user.account_status.toLowerCase()
      });
    }

    // Attach decoded token & user info to request
    req.user = decoded;
    req.authenticatedUser = user;

    next();
  } catch (error) {
    logError('Auth protection failed', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * 2. RESTRICT TO ROLES - Check if user has required role
 */
exports.restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

/**
 * 3. OWNERSHIP CHECK - Verify user owns the resource
 * Usage: app.get('/api/v1/client/profile', protect, checkOwnership('profileId', 'user_id'))
 */
exports.checkOwnership = (resourceTableField, userIdField = 'user_id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.body.id;

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required'
        });
      }

      // Query to check ownership
      const query = `SELECT ${userIdField} FROM ${resourceTableField.split('.')[0]} WHERE id = ?`;
      const [resources] = await db.execute(query, [resourceId]);

      if (resources.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      const ownerId = resources[0][userIdField];

      if (ownerId !== req.user.uid && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'You do not own this resource'
        });
      }

      next();
    } catch (error) {
      logError('Ownership check failed', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};