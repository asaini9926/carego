# Carego Backend - Production Ready

**Healthcare Staffing & Training Operating System**

Pure JavaScript/Node.js/Express backend (NO TypeScript, NO Prisma).

---

## 🎯 Architecture Overview

```
Carego Backend = Multi-Domain Operating System

Domain 1: AUTH & SESSIONS
  ├── Login/Logout
  ├── Token Management (JWT + Refresh Tokens)
  ├── Session Revocation
  └── Account Status Checks

Domain 2: PUBLIC APIS (Website)
  ├── Cities, Services, Courses (cached)
  ├── Service Details, Training Centers
  └── Lead Form Submission (rate-limited)

Domain 3: ADMIN/ERP
  ├── Lead Management (view, convert, reject, notes)
  ├── User Creation
  ├── Audit Logging (immutable)
  └── RBAC (Role-based access control)

Domain 4: SHARED INFRASTRUCTURE
  ├── Database (MySQL)
  ├── Logging
  ├── Error Handling
  ├── Validation
  └── Audit Trail
```

---

## 🗄️ Database Schema

**17 Tables** covering all operations:

- `users` - Core identity (SUPER_ADMIN, ADMIN, CLIENT, STAFF, STUDENT, TEACHER)
- `sessions` - Active sessions with refresh token tracking
- `cities`, `services` - Master data for website
- `leads` - Public intake (conversions tracked)
- `client_profiles`, `staff_profiles`, `student_profiles`, `teacher_profiles` - Role-specific data
- `patients`, `staff_assignments` - Care operations
- `attendance_logs`, `care_logs`, `vitals_logs` - Audit trail (append-only)
- `courses`, `batches`, `student_batches` - LMS/Training
- `invoices`, `payments`, `subscription_plans` - Finance
- `certificates` - Credentials
- `audit_logs` - Immutable compliance log
- `files` - Storage metadata

**Key Guarantees:**
- No edit/delete on care logs, attendance, or audit trails
- All admin actions logged with who/what/when/why
- Session-based token invalidation
- Account status enforcement on every request

---

## 🔐 Authentication Flow

```
CLIENT SENDS:  { phone, password }
    ↓
SERVER FINDS:  User by phone
    ↓
SERVER CHECKS: Password hash, account status
    ↓
SERVER CREATES: Session record with refresh token hash
    ↓
SERVER GENERATES: 
    - accessToken (15 min, includes sessionId)
    - refreshToken (7 days, hashed in DB)
    ↓
CLIENT STORES: Tokens in memory (not localStorage)
    ↓
CLIENT REQUESTS: Bearer <accessToken> in Authorization header
    ↓
SERVER VALIDATES:
    - JWT signature & expiration
    - Session exists & is valid
    - User is ACTIVE
    ↓
ALLOWED: Request proceeds
```

### Token Refresh Flow

```
CLIENT SENDS: { refreshToken }
    ↓
SERVER VALIDATES: Token signature, session validity, token hash
    ↓
SERVER GENERATES: New accessToken (same sessionId)
    ↓
CLIENT UPDATES: Access token in memory
```

### Logout Flow

```
CLIENT SENDS: /logout
    ↓
SERVER REVOKES: session.is_valid = FALSE
    ↓
ALL FUTURE REQUESTS: With this sessionId fail (even valid JWT)
```

---

## 🚀 API Endpoints

### PUBLIC (No Auth)

```
GET  /api/v1/public/cities
GET  /api/v1/public/services?cityId=uuid
GET  /api/v1/public/services/:slug
GET  /api/v1/public/courses
GET  /api/v1/public/training-centers?cityId=uuid
POST /api/v1/public/leads
```

### AUTH (No Auth)

```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout (Protected)
```

### ADMIN (Protected + Role Check)

```
GET  /api/v1/admin/leads?status=NEW&page=1&limit=20
POST /api/v1/admin/leads/:id/convert
POST /api/v1/admin/users
```

---

## 📁 Project Structure

```
carego-backend/
├── config/
│   ├── db.js              # MySQL connection pool
│   └── schema.sql         # Full database schema
├── controllers/
│   ├── authController.js  # Login, refresh, logout
│   ├── publicController.js # Cities, services, leads
│   └── adminController.js # Lead conversion, user management
├── middleware/
│   └── authMiddleware.js  # protect, restrictTo, checkOwnership
├── routes/
│   ├── authRoutes.js
│   ├── publicRoutes.js
│   └── adminRoutes.js
├── services/
│   ├── tokenService.js    # JWT generation & verification
│   ├── sessionService.js  # Session lifecycle
│   └── auditService.js    # Compliance logging
├── utils/
│   ├── errors.js          # ApiError, asyncHandler
│   ├── validators.js      # Phone, email, UUID validation
│   └── logger.js          # Structured logging
├── .env.example           # Environment template
├── server.js              # Express app
└── package.json
```

---

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
cd carego-backend
npm install
```

### 2. Setup Database

```bash
# MySQL should be running
mysql -u root -p

# Then in MySQL shell:
mysql> source config/schema.sql
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

**Required Variables:**
```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=carego_db
JWT_SECRET=min-32-chars-super-secret-key-!!!
JWT_REFRESH_SECRET=min-32-chars-super-secret-key-!!!
BCRYPT_ROUNDS=12
```

### 4. Run Server

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

---

## 🧪 Testing Endpoints

### 1. Create a Lead

```bash
curl -X POST http://localhost:5000/api/v1/public/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "9999999999",
    "email": "john@example.com",
    "leadType": "SERVICE",
    "cityName": "Jaipur"
  }'
```

### 2. Admin Converts Lead to User

```bash
# First, login as admin (you need to create admin user in DB)
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9999999999",
    "password": "your_password"
  }'

# Copy accessToken from response

# Then convert lead
curl -X POST http://localhost:5000/api/v1/admin/leads/LEAD_ID/convert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "userType": "CLIENT",
    "password": "newpassword123",
    "cityId": "city-jaipur",
    "notes": "Converted from website form"
  }'
```

### 3. Refresh Token

```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 4. Logout

```bash
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

## 📊 Audit Trail

Every admin action is logged with:

- `user_id` - Who did it
- `user_role` - Their role
- `action` - What (CREATE, UPDATE, DELETE, CONVERT, OVERRIDE)
- `entity_type` - What was changed
- `entity_id` - Which record
- `old_values` - Before (JSON)
- `new_values` - After (JSON)
- `change_reason` - Why
- `ip_address` - From where
- `created_at` - When

**Immutable:** No updates or deletes on audit_logs table.

**Query Example:**
```javascript
SELECT * FROM audit_logs
WHERE action = 'CONVERT' AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY created_at DESC;
```

---

## 🛡️ Security Features

✅ **Password Hashing** - bcrypt (cost 12)
✅ **JWT Signing** - HS256 with strong secret
✅ **Session Revocation** - Session table tracks validity
✅ **Account Status** - ACTIVE/SUSPENDED/TERMINATED checked on every request
✅ **Audit Logging** - Immutable compliance trail
✅ **Phone Validation** - 10-15 digits
✅ **Email Validation** - RFC standard
✅ **Rate Limiting** - (To be added with Redis)
✅ **CORS** - Origin whitelist
✅ **SQL Injection Protection** - Parameterized queries
✅ **RBAC** - Role-based access control
✅ **Ownership Checks** - Users can only access their own data

---

## 📝 Logging

Logs are written to `/logs/` directory:
- `error.log` - Errors and stack traces
- `warn.log` - Warnings
- `info.log` - General info
- `debug.log` - Debug info (dev only)

Each log entry includes:
```json
{
  "timestamp": "2026-01-16T10:30:45.123Z",
  "level": "ERROR",
  "message": "User not found",
  "data": { ... }
}
```

---

## 🚀 Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets (min 32 chars, random)
- [ ] Enable HTTPS (use reverse proxy like nginx)
- [ ] Setup database backups (daily)
- [ ] Configure Redis for rate limiting & caching
- [ ] Setup email/SMS service for notifications
- [ ] Enable DDoS protection (Cloudflare)
- [ ] Monitor error logs
- [ ] Setup health check endpoint monitoring
- [ ] Test session cleanup job (daily)

---

## 📞 Support

For questions or issues, refer to the [Plan Documentation](../documentation-Planning/plan.md).
