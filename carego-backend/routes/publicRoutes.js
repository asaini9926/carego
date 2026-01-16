const express = require('express');
const { body } = require('express-validator');
const publicController = require('../controllers/publicController');
const { asyncHandler, ApiError } = require('../utils/errors');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// Master data endpoints
router.get('/cities', publicController.getCities);
router.get('/services', publicController.getServices);
router.get('/services/:slug', publicController.getServiceDetail);
router.get('/courses', publicController.getCourses);

// Lead creation
router.post(
  '/leads',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().isLength({ min: 10, max: 15 }).withMessage('Valid phone required'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('pincode').optional().isLength({ min: 5, max: 10 }).withMessage('Invalid pincode'),
    body('leadType').optional().isIn(['SERVICE', 'TRAINING', 'EQUIPMENT', 'STAFF', 'TEACHER']),
  ],
  validateRequest,
  publicController.createLead
);

module.exports = router;