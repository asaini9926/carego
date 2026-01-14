const mysql = require('mysql2');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create the connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'carego_db',
  waitForConnections: true,
  connectionLimit: 10, // Max concurrent connections
  queueLimit: 0,        // Unlimited queueing
  charset: 'utf8mb4'
});

// Convert pool to promise-based (allows using 'await' in controllers)
const promisePool = pool.promise();

// Test the connection on startup
(async () => {
  try {
    const [rows] = await promisePool.query('SELECT 1');
    console.log('✅ MySQL Database Connected Successfully');
  } catch (error) {
    console.error('❌ Database Connection Failed:', error.message);
    process.exit(1); // Stop server if DB fails
  }
})();

module.exports = promisePool;