// ============================================================
// LOGGING UTILITY
// ============================================================

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: '❌',
  WARN: '⚠️',
  INFO: 'ℹ️',
  DEBUG: '🔍'
};

/**
 * Write log to file
 */
const writeLog = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);

  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    fs.appendFileSync(logFile, logLine);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
};

/**
 * Log error
 */
const logError = (message, error = null) => {
  console.error(`${LOG_LEVELS.ERROR} ${message}`, error);
  writeLog('ERROR', message, error?.stack || error);
};

/**
 * Log warning
 */
const logWarn = (message, data = null) => {
  console.warn(`${LOG_LEVELS.WARN} ${message}`);
  writeLog('WARN', message, data);
};

/**
 * Log info
 */
const logInfo = (message, data = null) => {
  console.log(`${LOG_LEVELS.INFO} ${message}`);
  if (process.env.NODE_ENV === 'development' && data) {
    console.log(data);
  }
  writeLog('INFO', message, data);
};

/**
 * Log debug (only in development)
 */
const logDebug = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${LOG_LEVELS.DEBUG} ${message}`, data);
    writeLog('DEBUG', message, data);
  }
};

module.exports = {
  logError,
  logWarn,
  logInfo,
  logDebug
};
