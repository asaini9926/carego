// ============================================================
// AUDIT LOGGING SERVICE (Append-only, immutable)
// ============================================================

const db = require('../config/db');

/**
 * Log admin action for compliance & audit trail
 * @param {Object} options
 *   - userId: Admin who performed action
 *   - userRole: Admin role
 *   - action: Action name (CREATE, UPDATE, DELETE, OVERRIDE, CONVERT)
 *   - entityType: What was changed (User, Lead, Invoice, etc.)
 *   - entityId: ID of entity
 *   - oldValues: Previous state (JSON)
 *   - newValues: New state (JSON)
 *   - changeReason: Why was it changed
 *   - ipAddress: IP address
 *   - userAgent: User agent
 */
const logAction = async (options) => {
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
  } = options;

  try {
    const query = `
      INSERT INTO audit_logs 
      (user_id, user_role, action, entity_type, entity_id, old_values, new_values, change_reason, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(query, [
      userId,
      userRole,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      changeReason,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('❌ Audit log failed:', error);
    // Do NOT throw - logging failures should not break the app
  }
};

/**
 * Query audit logs with filters
 */
const queryAuditLogs = async (filters = {}) => {
  const {
    userId = null,
    action = null,
    entityType = null,
    entityId = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0
  } = filters;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }

  if (entityType) {
    query += ' AND entity_type = ?';
    params.push(entityType);
  }

  if (entityId) {
    query += ' AND entity_id = ?';
    params.push(entityId);
  }

  if (startDate) {
    query += ' AND created_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND created_at <= ?';
    params.push(endDate);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  try {
    const [logs] = await db.execute(query, params);
    return logs;
  } catch (error) {
    console.error('❌ Audit query failed:', error);
    return [];
  }
};

module.exports = {
  logAction,
  queryAuditLogs
};
