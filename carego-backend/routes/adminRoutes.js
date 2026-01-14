const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const serviceController = require('../controllers/serviceController');

const router = express.Router();

// 🔒 Apply Security to All Routes Below
router.use(protect);
router.use(restrictTo('SUPER_ADMIN', 'ADMIN'));

// Lead Management
router.get('/leads', adminController.getAllLeads);
router.post('/leads/:id/convert', adminController.convertLead);

// Service Management (CMS)
router.get('/services', serviceController.getAllServices);
router.post('/services', serviceController.createService);
router.get('/services/:id', serviceController.getServiceById);
router.put('/services/:id', serviceController.updateService);

module.exports = router;