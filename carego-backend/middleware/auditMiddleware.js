const db = require('../config/db');

/**
 * Log action to audit_logs table
 * Used to track all user actions for compliance and debugging
 */
exports.logAction = async (data) => {
  const {
    userId,
    userRole,
    action,
    entityType,
    entityId,
    oldValues = null,
    newValues = null,
    changeReason = null,
    ipAddress = null,
    userAgent = null
  } = data;

  try {
    const query = `
      INSERT INTO audit_logs 
      (user_id, user_role, action, entity_type, entity_id, old_values, new_values, change_reason, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(query, [
      userId || null,
      userRole || null,
      action,
      entityType,
      entityId || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      changeReason,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit logging should not break the main operation
  }
};

/**
 * Middleware to automatically log actions with request context
 */
exports.auditMiddleware = (req, res, next) => {
  // Attach logAction to request for use in controllers
  req.logAction = async (data) => {
    return exports.logAction({
      userId: req.user?.id,
      userRole: req.user?.user_type,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      ...data
    });
  };

  next();
};
