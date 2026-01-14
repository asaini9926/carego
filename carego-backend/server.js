const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db'); // Import DB to ensure connection starts

// Load environment variables
dotenv.config();

const app = express();

// 1. MIDDLEWARE ------------------------------------------------
app.use(cors({
  origin: 'http://localhost:3000', // Explicitly allow the frontend URL
  credentials: true                // Allow cookies and headers to be sent
}));
app.use(express.json()); // Parse JSON bodies

// 2. ROUTES ----------------------------------------------------
// We will create these files in the next step.
// Uncomment them as we build them.

app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/public', require('./routes/publicRoutes')); // Website APIs
app.use('/api/v1/admin', require('./routes/adminRoutes'));   // CRM APIs

// Health Check Endpoint (Useful to test if server is running)
app.get('/', (req, res) => {
  res.json({ message: 'Carego API Service is Running 🚀' });
});

// 3. GLOBAL ERROR HANDLER --------------------------------------
// Catches any error thrown in the app (async or sync)
app.use((err, req, res, next) => {
  console.error('🔥 Error Stack:', err.stack);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 4. START SERVER ----------------------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
});