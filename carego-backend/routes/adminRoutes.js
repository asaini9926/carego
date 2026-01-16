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

module.exports = router;