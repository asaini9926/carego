const express = require('express');
const { body, query, param } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const mobileSyncController = require('../controllers/mobileSyncController');

const router = express.Router();

// ============================================================================
// SYNC LIFECYCLE (Protected - Mobile Apps)
// ============================================================================

// Create sync checkpoint (begin sync)
router.post(
  '/checkpoint',
  protect,
  [
    body('lastSyncAt').optional().isISO8601()
  ],
  validate,
  mobileSyncController.createSyncCheckpoint
);

// Upload local changes (batch)
router.post(
  '/upload',
  protect,
  [
    body('checkpointId').notEmpty().withMessage('Checkpoint ID required'),
    body('operations').isArray({ min: 1 }).withMessage('At least one operation required'),
    body('operations.*.id').notEmpty().withMessage('Operation ID required'),
    body('operations.*.entity').notEmpty().withMessage('Entity type required'),
    body('operations.*.action').isIn(['CREATE', 'UPDATE', 'DELETE']).withMessage('Invalid action'),
    body('operations.*.data').notEmpty().withMessage('Data required'),
    body('operations.*.localTimestamp').optional().isISO8601()
  ],
  validate,
  mobileSyncController.uploadChanges
);

// Pull server changes
router.get(
  '/pull',
  protect,
  [
    query('checkpointId').notEmpty().withMessage('Checkpoint ID required')
  ],
  validate,
  mobileSyncController.pullChanges
);

// Mark sync complete
router.post(
  '/complete',
  protect,
  [
    body('checkpointId').notEmpty().withMessage('Checkpoint ID required')
  ],
  validate,
  mobileSyncController.completeSyncSession
);

module.exports = router;
