const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Generate Access Token (15 min)
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Generate Refresh Token (7 days)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// @desc    Login User / Admin
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // 1. Input Validation
    if (!phone || !password) {
      const error = new Error('Phone and Password are required');
      error.statusCode = 400;
      throw error;
    }

    // 2. Find User in DB
    const [users] = await db.execute(
      'SELECT id, phone, role, password_hash, is_active FROM users WHERE phone = ?', 
      [phone]
    );

    if (users.length === 0) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const user = users[0];

    // 3. Check Active Status
    if (!user.is_active) {
      const error = new Error('Account is suspended. Contact admin.');
      error.statusCode = 403;
      throw error;
    }

    // 4. Verify Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    // 5. Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 6. Send Response (Hide password hash)
    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    next(error);
  }
};