const { asyncHandler, ApiError } = require('../utils/errors');
const db = require('../config/db');
const { logAction } = require('../middleware/auditMiddleware');
const crypto = require('crypto');
const axios = require('axios');

// ============================================================================
// HOSPITAL INTEGRATION
// ============================================================================

/**
 * Hospital referral sync
 * POST /api/v1/integrations/hospital/sync
 */
exports.syncHospitalReferral = asyncHandler(async (req, res) => {
  const { hospitalPatientId, hospitalId, patientData, referralReason } = req.body;
  const userId = req.user.uid;

  // Validate inputs
  if (!hospitalPatientId || !hospitalId || !patientData) {
    throw new ApiError('Missing required fields', 400);
  }

  // Create or find patient
  let caregoPatienti = patientData.caregoPatienti;
  if (!caregoPatienti) {
    caregoPatienti = crypto.randomUUID();

    await db.execute(
      `INSERT INTO patients 
       (id, patient_name, phone, city_id, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [
        caregoPatienti,
        patientData.name,
        patientData.phone,
        patientData.city_id,
      ]
    );
  }

  // Create hospital mapping
  const mappingId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO hospital_mapping 
     (id, hospital_patient_id, carego_patient_id, hospital_id, mapping_verified, verified_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [mappingId, hospitalPatientId, caregoPatienti, hospitalId, true]
  );

  // Create referral record
  const referralId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO hospital_referrals 
     (id, hospital_id, hospital_patient_id, carego_patient_id, referral_reason, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [referralId, hospitalId, hospitalPatientId, caregoPatienti, referralReason, 'ACCEPTED']
  );

  // Audit log
  await logAction({
    userId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'HospitalReferral',
    entityId: referralId,
    newValues: {
      hospital_id: hospitalId,
      patient_name: patientData.name,
      referral_reason: referralReason
    },
    changeReason: 'Hospital referral synced',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Hospital referral synced',
    data: {
      referralId,
      caregoPatienti,
      mappingId
    }
  });
});

/**
 * Get hospital patient data
 * GET /api/v1/integrations/hospital/patient/:id
 */
exports.getHospitalPatientData = asyncHandler(async (req, res) => {
  const { id: caregoPatienti } = req.params;

  // Get patient record
  const [patients] = await db.execute(
    'SELECT * FROM patients WHERE id = ?',
    [caregoPatienti]
  );

  if (patients.length === 0) {
    throw new ApiError('Patient not found', 404);
  }

  // Get hospital mapping
  const [mappings] = await db.execute(
    'SELECT * FROM hospital_mapping WHERE carego_patient_id = ?',
    [caregoPatienti]
  );

  // Get vitals
  const [vitals] = await db.execute(
    'SELECT * FROM vitals_log WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10',
    [caregoPatienti]
  );

  res.json({
    success: true,
    data: {
      patient: patients[0],
      hospital_mapping: mappings.length > 0 ? mappings[0] : null,
      recent_vitals: vitals
    }
  });
});

// ============================================================================
// INSURANCE INTEGRATION
// ============================================================================

/**
 * Export invoice for insurance claim
 * POST /api/v1/integrations/insurance/export
 */
exports.exportInvoiceForInsurance = asyncHandler(async (req, res) => {
  const { invoiceId, insuranceProviderId, format = 'FHIR' } = req.body;
  const userId = req.user.uid;

  // Get invoice
  const [invoices] = await db.execute(
    'SELECT * FROM invoices WHERE id = ?',
    [invoiceId]
  );

  if (invoices.length === 0) {
    throw new ApiError('Invoice not found', 404);
  }

  const invoice = invoices[0];

  // Get invoice items
  const [items] = await db.execute(
    'SELECT * FROM invoice_items WHERE invoice_id = ?',
    [invoiceId]
  );

  // Convert to insurance format (FHIR example)
  const claimData = {
    resourceType: 'Claim',
    id: invoiceId,
    status: 'active',
    type: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/claim-type',
        code: 'institutional'
      }]
    },
    patient: {
      reference: `Patient/${invoice.client_id}`
    },
    created: new Date(invoice.created_at).toISOString(),
    items: items.map(item => ({
      sequence: item.id,
      productOrService: {
        coding: [{
          system: 'http://www.ama-assn.org/go/cpt',
          code: item.service_code || 'CARE'
        }]
      },
      servicedDate: item.service_date,
      unitPrice: {
        value: item.unit_price,
        currency: 'INR'
      },
      net: {
        value: item.total_price,
        currency: 'INR'
      }
    })),
    total: {
      value: invoice.total_amount,
      currency: 'INR'
    }
  };

  // Store export record
  const exportId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO insurance_exports 
     (id, invoice_id, provider_id, export_format, claim_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      exportId,
      invoiceId,
      insuranceProviderId,
      format,
      JSON.stringify(claimData),
      'EXPORTED'
    ]
  );

  // Audit log
  await logAction({
    userId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'InsuranceExport',
    entityId: exportId,
    newValues: {
      invoice_id: invoiceId,
      provider_id: insuranceProviderId,
      format
    },
    changeReason: 'Invoice exported for insurance claim',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Invoice exported for insurance',
    data: {
      exportId,
      claimData
    }
  });
});

/**
 * Get claim status
 * GET /api/v1/integrations/insurance/claim/:id
 */
exports.getClaimStatus = asyncHandler(async (req, res) => {
  const { id: claimId } = req.params;

  // Get claim/export record
  const [exports] = await db.execute(
    'SELECT * FROM insurance_exports WHERE id = ?',
    [claimId]
  );

  if (exports.length === 0) {
    throw new ApiError('Claim not found', 404);
  }

  const claim = exports[0];

  // Parse stored claim data
  const claimData = JSON.parse(claim.claim_json);

  res.json({
    success: true,
    data: {
      claimId,
      invoiceId: claim.invoice_id,
      providerId: claim.provider_id,
      status: claim.status,
      claimData,
      createdAt: claim.created_at,
      updatedAt: claim.updated_at
    }
  });
});

// ============================================================================
// IoT DEVICE INTEGRATION
// ============================================================================

/**
 * Log vitals from IoT device
 * POST /api/v1/integrations/iot/vitals
 */
exports.logIotVitals = asyncHandler(async (req, res) => {
  const { deviceId, patientId, vitals, timestamp } = req.body;
  const staffId = req.user.uid;

  // Validate inputs
  if (!deviceId || !patientId || !vitals) {
    throw new ApiError('Missing required fields', 400);
  }

  // Verify device belongs to staff
  const [devices] = await db.execute(
    'SELECT * FROM iot_devices WHERE id = ? AND staff_id = ? AND is_active = TRUE',
    [deviceId, staffId]
  );

  if (devices.length === 0) {
    throw new ApiError('Device not found or inactive', 400);
  }

  const device = devices[0];

  // Validate vitals based on device type
  const validatedVitals = validateIoTVitals(vitals, device.device_type);

  // Create vitals record
  const vitalId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO vitals_log 
     (id, patient_id, staff_id, device_id, vitals_json, source_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      vitalId,
      patientId,
      staffId,
      deviceId,
      JSON.stringify(validatedVitals),
      'IoT',
      timestamp ? new Date(timestamp) : new Date()
    ]
  );

  // Update device sync time
  await db.execute(
    'UPDATE iot_devices SET last_sync_at = NOW() WHERE id = ?',
    [deviceId]
  );

  // Audit log
  await logAction({
    userId: staffId,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'VitalSign',
    entityId: vitalId,
    newValues: { device_type: device.device_type, vitals: validatedVitals },
    changeReason: 'IoT vitals logged',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    message: 'Vitals logged from IoT device',
    data: {
      vitalId,
      vitals: validatedVitals
    }
  });
});

/**
 * Geofence validation
 * POST /api/v1/integrations/iot/geofence
 */
exports.validateGeofence = asyncHandler(async (req, res) => {
  const { assignmentId, latitude, longitude } = req.body;
  const staffId = req.user.uid;

  // Validate coordinates
  if (latitude === undefined || longitude === undefined) {
    throw new ApiError('Latitude and longitude required', 400);
  }

  // Get assignment with location
  const [assignments] = await db.execute(
    `SELECT a.*, p.latitude, p.longitude 
     FROM assignments a
     JOIN patients p ON a.patient_id = p.id
     WHERE a.id = ? AND a.staff_id = ?`,
    [assignmentId, staffId]
  );

  if (assignments.length === 0) {
    throw new ApiError('Assignment not found', 404);
  }

  const assignment = assignments[0];

  // Calculate distance (Haversine formula)
  const distance = calculateDistance(
    latitude,
    longitude,
    assignment.latitude,
    assignment.longitude
  );

  // Check geofence (assuming 100m radius)
  const geofenceRadius = 100; // meters
  const isWithinGeofence = distance <= geofenceRadius;

  // Log geofence check
  const checkId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO geofence_checks 
     (id, assignment_id, staff_id, latitude, longitude, distance_meters, is_valid, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      checkId,
      assignmentId,
      staffId,
      latitude,
      longitude,
      distance,
      isWithinGeofence
    ]
  );

  res.json({
    success: true,
    data: {
      checkId,
      isWithinGeofence,
      distance: distance.toFixed(2),
      allowed_radius: geofenceRadius
    }
  });
});

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Hospital inbound webhook
 * POST /api/v1/integrations/webhooks/hospital
 */
exports.hospitalWebhook = asyncHandler(async (req, res) => {
  const { event, data } = req.body;

  // Verify webhook signature (implement based on hospital's method)

  if (event === 'patient.admitted') {
    // Handle patient admission
    const referralId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO hospital_referrals 
       (id, hospital_id, hospital_patient_id, carego_patient_id, referral_reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [referralId, data.hospital_id, data.patient_id, null, 'Admission', 'PENDING']
    );
  } else if (event === 'vitals.update') {
    // Update vitals from hospital
    // Store external vitals reference
  }

  res.json({ success: true });
});

/**
 * Insurance inbound webhook
 * POST /api/v1/integrations/webhooks/insurance
 */
exports.insuranceWebhook = asyncHandler(async (req, res) => {
  const { event, data } = req.body;

  if (event === 'claim.approved') {
    // Update claim status
    await db.execute(
      'UPDATE insurance_exports SET status = ? WHERE id = ?',
      ['APPROVED', data.claim_id]
    );
  } else if (event === 'claim.rejected') {
    // Handle rejection
    await db.execute(
      'UPDATE insurance_exports SET status = ? WHERE id = ?',
      ['REJECTED', data.claim_id]
    );
  } else if (event === 'reimbursement.initiated') {
    // Log reimbursement
  }

  res.json({ success: true });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateIoTVitals(vitals, deviceType) {
  const validated = {};

  if (deviceType === 'PULSE_OXIMETER') {
    validated.oxygen_saturation = validateRange(vitals.oxygen_saturation, 0, 100);
    validated.pulse_rate = validateRange(vitals.pulse_rate, 30, 200);
  } else if (deviceType === 'BP_MONITOR') {
    validated.systolic = validateRange(vitals.systolic, 60, 250);
    validated.diastolic = validateRange(vitals.diastolic, 30, 150);
    validated.pulse = validateRange(vitals.pulse, 30, 200);
  } else if (deviceType === 'TEMPERATURE') {
    validated.temperature = validateRange(vitals.temperature, 32, 42);
  }

  return validated;
}

function validateRange(value, min, max) {
  if (value === undefined || value === null) return null;
  if (value < min || value > max) {
    throw new ApiError(`Value out of range: ${min}-${max}`, 400);
  }
  return value;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}
