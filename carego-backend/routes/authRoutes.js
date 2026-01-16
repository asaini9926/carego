const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public auth endpoints
router.post('/login', authController.login);
router.get('/me', protect, authController.me);

router.post('/refresh', authController.refreshToken);

// Protected endpoints
router.post('/logout', protect, authController.logout);


module.exports = router;