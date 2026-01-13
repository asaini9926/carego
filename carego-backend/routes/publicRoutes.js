const express = require('express');
const { body } = require('express-validator');
const publicController = require('../controllers/publicController');
const validate = require('../middleware/validate');

const router = express.Router();

// Get Master Data
router.get('/cities', publicController.getCities);
router.get('/services', publicController.getServices);

// Create Lead (With strict validation)
router.post(
  '/leads',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone is required')
      .isLength({ min: 10, max: 15 }).withMessage('Phone must be valid'),
    body('type').optional().isIn(['SERVICE', 'TRAINING', 'OTHER']),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    // Sanitize address inputs to prevent weird characters
    body('address_text').optional().trim().escape(),
    body('city_name').optional().trim().escape(),
    body('pincode').optional().trim().isLength({ min: 6 }).withMessage('Invalid Pincode'),
    validate // Run the validation
  ],
  publicController.createLead
);

module.exports = router;