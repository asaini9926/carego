const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');
const { logInfo, logError } = require('./utils/logger');

// Load environment variables
dotenv.config();

const app = express();

// ============================================================
// 1. MIDDLEWARE
// ============================================================
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 400 ? '🔴' : status >= 300 ? '🟡' : '🟢';
    logInfo(`${color} ${req.method} ${req.path} - ${status} (${duration}ms)`);
  });
  next();
});

// ============================================================
// 2. ROUTES
// ============================================================
// Phase 0-1 Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/public', require('./routes/publicRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));

// Phase 2 Routes
app.use('/api/v1/admin', require('./routes/phase2AdminRoutes'));
app.use('/api/v1/staff', require('./routes/staffAppRoutes'));
app.use('/api/v1/client', require('./routes/clientAppRoutes'));

// Phase 3 Routes - Training/LMS
app.use('/api/v1/training', require('./routes/trainingRoutes'));

// Phase 3 Routes - Finance
app.use('/api/v1/finance', require('./routes/financeRoutes'));

// Phase 3 Routes - Subscriptions
app.use('/api/v1/subscriptions', require('./routes/subscriptionRoutes'));

// Phase 3 Routes - Analytics
app.use('/api/v1/analytics', require('./routes/analyticsRoutes'));

// Phase 4 Routes - Payments
app.use('/api/v1/payments', require('./routes/paymentRoutes'));

// Phase 4 Routes - Ratings
app.use('/api/v1/ratings', require('./routes/ratingsRoutes'));

// Phase 4 Routes - Recommendations
app.use('/api/v1/recommendations', require('./routes/recommendationsRoutes'));

// Phase 4 Routes - Analytics & Reporting
app.use('/api/v1/analytics', require('./routes/analyticsReportingRoutes'));

// Phase 4 Routes - Mobile Sync
app.use('/api/v1/sync', require('./routes/mobileSyncRoutes'));

// Phase 4 Routes - Integrations
app.use('/api/v1/integrations', require('./routes/integrationRoutes'));

// Phase 4 Routes - Compliance
app.use('/api/v1/compliance', require('./routes/complianceRoutes'));

// Health Check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Carego API Service Running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// ============================================================
// 3. GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logError(`${req.method} ${req.path} - ${statusCode}`, err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================
// 4. START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logInfo(`\n🚀 Carego Backend Server`);
  logInfo(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logInfo(`🔌 Port: ${PORT}`);
  logInfo(`📚 API: http://localhost:${PORT}/api/v1`);
  logInfo(`✅ Ready to accept requests\n`);
});