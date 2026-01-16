// ============================================================
// ERROR HANDLING UTILITY
// ============================================================

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Async handler wrapper to avoid try-catch in every route
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Standard error response
 */
const sendErrorResponse = (res, statusCode, message, details = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && details && { details })
  });
};

/**
 * Standard success response
 */
const sendSuccessResponse = (res, statusCode, data, message = 'Success') => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

module.exports = {
  ApiError,
  asyncHandler,
  sendErrorResponse,
  sendSuccessResponse
};
