const express = require('express');
const { body, query, param } = require('express-validator');
const integrationController = require('../controllers/integrationController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

// ============================================================================
// HOSPITAL INTEGRATION
// ============================================================================

/**
 * POST /api/v1/integrations/hospital/sync
 * Sync patient referral from hospital
 */
router.post(
  '/hospital/sync',
  protect,
  restrictTo('ADMIN', 'STAFF'),
  [
    body('hospitalPatientId').notEmpty().withMessage('Hospital patient ID required'),
    body('hospitalId').notEmpty().withMessage('Hospital ID required'),
    body('patientData').isObject().withMessage('Patient data must be object'),
    body('patientData.name').notEmpty().withMessage('Patient name required'),
    body('patientData.phone').isMobilePhone().withMessage('Valid phone required'),
    body('referralReason').notEmpty().withMessage('Referral reason required'),
  ],
  validate,
  integrationController.syncHospitalReferral
);

/**
 * GET /api/v1/integrations/hospital/patient/:id
 * Get patient data for hospital
 */
router.get(
  '/hospital/patient/:id',
  protect,
  restrictTo('ADMIN', 'STAFF'),
  [
    param('id').notEmpty().withMessage('Patient ID required'),
  ],
  validate,
  integrationController.getHospitalPatientData
);

// ============================================================================
// INSURANCE INTEGRATION
// ============================================================================

/**
 * POST /api/v1/integrations/insurance/export
 * Export invoice for insurance claim
 */
router.post(
  '/insurance/export',
  protect,
  restrictTo('ADMIN'),
  [
    body('invoiceId').notEmpty().withMessage('Invoice ID required'),
    body('insuranceProviderId').notEmpty().withMessage('Insurance provider ID required'),
    body('format').optional().isIn(['FHIR', 'HL7', 'JSON']).withMessage('Invalid format'),
  ],
  validate,
  integrationController.exportInvoiceForInsurance
);

/**
 * GET /api/v1/integrations/insurance/claim/:id
 * Get claim status
 */
router.get(
  '/insurance/claim/:id',
  protect,
  restrictTo('ADMIN', 'CLIENT'),
  [
    param('id').notEmpty().withMessage('Claim ID required'),
  ],
  validate,
  integrationController.getClaimStatus
);

// ============================================================================
// IoT DEVICE INTEGRATION
// ============================================================================

/**
 * POST /api/v1/integrations/iot/vitals
 * Log vitals from IoT device
 */
router.post(
  '/iot/vitals',
  protect,
  restrictTo('STAFF'),
  [
    body('deviceId').notEmpty().withMessage('Device ID required'),
    body('patientId').notEmpty().withMessage('Patient ID required'),
    body('vitals').isObject().withMessage('Vitals must be object'),
    body('timestamp').optional().isISO8601().withMessage('Valid ISO8601 timestamp'),
  ],
  validate,
  integrationController.logIotVitals
);

/**
 * POST /api/v1/integrations/iot/geofence
 * Validate geofence
 */
router.post(
  '/iot/geofence',
  protect,
  restrictTo('STAFF'),
  [
    body('assignmentId').notEmpty().withMessage('Assignment ID required'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  ],
  validate,
  integrationController.validateGeofence
);

// ============================================================================
// WEBHOOKS (No Auth Required - Signature Verified)
// ============================================================================

/**
 * POST /api/v1/integrations/webhooks/hospital
 * Inbound webhook from hospital
 */
router.post(
  '/webhooks/hospital',
  [
    body('event').notEmpty().withMessage('Event required'),
    body('data').isObject().withMessage('Data must be object'),
  ],
  validate,
  integrationController.hospitalWebhook
);

/**
 * POST /api/v1/integrations/webhooks/insurance
 * Inbound webhook from insurance provider
 */
router.post(
  '/webhooks/insurance',
  [
    body('event').notEmpty().withMessage('Event required'),
    body('data').isObject().withMessage('Data must be object'),
  ],
  validate,
  integrationController.insuranceWebhook
);

module.exports = router;
