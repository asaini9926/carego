const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// 🔒 Apply Security to All Routes Below
router.use(protect);
router.use(restrictTo('SUPER_ADMIN', 'ADMIN'));

// Lead Management
router.get('/leads', adminController.getAllLeads);
router.post('/leads/:id/convert', adminController.convertLead);

module.exports = router;