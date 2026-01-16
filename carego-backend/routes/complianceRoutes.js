const express = require('express');
const { body, param } = require('express-validator');
const complianceController = require('../controllers/complianceController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

// ============================================================================
// HIPAA COMPLIANCE
// ============================================================================

/**
 * POST /api/v1/compliance/hipaa/audit-export
 * Export HIPAA audit trail for patient
 */
router.post(
  '/hipaa/audit-export',
  protect,
  restrictTo('ADMIN', 'STAFF'),
  [
    body('patientId').notEmpty().withMessage('Patient ID required'),
    body('startDate').isISO8601().withMessage('Valid ISO8601 start date required'),
    body('endDate').isISO8601().withMessage('Valid ISO8601 end date required'),
    body('includeAllUsers').optional().isBoolean().withMessage('Must be boolean'),
  ],
  validate,
  complianceController.exportHIPAAauditTrail
);

// ============================================================================
// GDPR COMPLIANCE
// ============================================================================

/**
 * POST /api/v1/compliance/gdpr/data-export
 * Export user personal data (GDPR Right to Data Portability)
 */
router.post(
  '/gdpr/data-export',
  protect,
  [
    body('targetUserId').notEmpty().withMessage('Target user ID required'),
  ],
  validate,
  complianceController.exportGDPRData
);

/**
 * DELETE /api/v1/compliance/gdpr/data-delete
 * Delete user personal data (GDPR Right to be Forgotten)
 */
router.delete(
  '/gdpr/data-delete',
  protect,
  restrictTo('ADMIN'),
  [
    body('targetUserId').notEmpty().withMessage('Target user ID required'),
    body('deletionReason').notEmpty().withMessage('Deletion reason required'),
  ],
  validate,
  complianceController.deleteGDPRData
);

// ============================================================================
// DATA RETENTION POLICY
// ============================================================================

/**
 * GET /api/v1/compliance/retention-policy
 * Get data retention policy
 */
router.get(
  '/retention-policy',
  protect,
  restrictTo('ADMIN'),
  complianceController.getRetentionPolicy
);

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

/**
 * POST /api/v1/compliance/consent
 * Create data processing consent
 */
router.post(
  '/consent',
  protect,
  restrictTo('ADMIN'),
  [
    body('userId').notEmpty().withMessage('User ID required'),
    body('consentType')
      .isIn(['MARKETING', 'ANALYTICS', 'DATA_SHARING', 'RESEARCH'])
      .withMessage('Invalid consent type'),
    body('dataCategories')
      .isArray()
      .withMessage('Data categories must be array'),
    body('expiresAt').optional().isISO8601().withMessage('Valid ISO8601 expiry date'),
  ],
  validate,
  complianceController.createConsent
);

/**
 * DELETE /api/v1/compliance/consent/:id
 * Revoke data processing consent
 */
router.delete(
  '/consent/:id',
  protect,
  [
    param('id').notEmpty().withMessage('Consent ID required'),
  ],
  validate,
  complianceController.revokeConsent
);

module.exports = router;
