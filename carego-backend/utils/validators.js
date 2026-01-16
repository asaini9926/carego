// ============================================================
// VALIDATION UTILITIES
// ============================================================

const { v4: uuidv4, validate: uuidValidate } = require('uuid');

/**
 * Validate UUID format
 */
const isValidUUID = (id) => {
  return uuidValidate(id);
};

/**
 * Validate phone number (10-15 digits)
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10,15}$/;
  return phoneRegex.test(String(phone).replace(/\D/g, ''));
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate pincode (5-10 digits)
 */
const isValidPincode = (pincode) => {
  const pincodeRegex = /^[0-9]{5,10}$/;
  return pincodeRegex.test(String(pincode));
};

/**
 * Validate coordinates (latitude, longitude)
 */
const isValidCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Generate a unique UUID
 */
const generateId = () => {
  return uuidv4();
};

/**
 * Sanitize string to prevent XSS
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

module.exports = {
  isValidUUID,
  isValidPhone,
  isValidEmail,
  isValidPincode,
  isValidCoordinates,
  generateId,
  sanitizeString
};
