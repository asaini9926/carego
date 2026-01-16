const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// 🔒 Apply security middleware to all routes
router.use(protect);
router.use(restrictTo('SUPER_ADMIN', 'ADMIN'));


// Lead Management
router.get('/leads', adminController.getAllLeads);
router.post('/leads/:id/convert', adminController.convertLead);

// Dashboard Stats
router.get('/stats', adminController.getDashboardStats);

// City Management
router.post('/cities', adminController.createCity);
router.put('/cities/:id', adminController.updateCity);
router.delete('/cities/:id', adminController.deleteCity);

// Service Management
router.post('/services', adminController.createService);
router.put('/services/:id', adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

module.exports = router;