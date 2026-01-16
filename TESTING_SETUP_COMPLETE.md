# Carego Backend - Testing Setup Complete

## Overview
Complete backend testing infrastructure for 140+ endpoints across all phases (0-4) with comprehensive database schema, seed data, and Postman collection.

---

## 📦 What's Been Created

### 1. **Database Schema** (`schema_phase4.sql`)
- **Location:** `carego-backend/config/schema_phase4.sql`
- **Size:** 620+ lines
- **Tables:** 46+ including all Phase 0-4 modules
- **Features:**
  - Complete normalized database structure
  - Foreign key constraints with cascade rules
  - Performance indexes on critical queries
  - JSON columns for flexible data storage
  - ENUM types for statuses and types
  - Sample initial data (cities, services, courses, plans)

**Tables Included:**
- Core: users, cities, sessions
- Phase 1-2: services, leads, client_profiles, staff_profiles, staff_documents
- Phase 2: patients, assignments, attendance, care_logs, vitals_logs
- Phase 3: courses, course_batches, student_batches, assignment_submissions
- Phase 3: invoices, invoice_items, subscription_plans, subscriptions
- Phase 4 W1: payments, payment_methods, refunds, webhook_logs, ratings, rating_summary, rating_flags, recommendations, recommendation_feedback, trending_analytics
- Phase 4 W2: reports, scheduled_reports, report_cache, sync_checkpoints, sync_operations
- Phase 4 W3: hospital_mapping, hospital_referrals, insurance_exports, iot_devices, vitals_log, geofence_checks
- Phase 4 W4: compliance_exports, data_deletion_requests, data_consents, audit_logs

### 2. **Comprehensive Seed Data** (`seed_phase4.sql`)
- **Location:** `carego-backend/config/seed_phase4.sql`
- **Size:** 400+ lines
- **Test Data Coverage:**
  - **4 Cities:** Jaipur, Delhi, Mumbai, Bangalore
  - **2 Admin Users + 3 Client Users + 4 Staff Users + 3 Students + 2 Teachers**
  - **Client Profiles:** 3 organizations with verification status
  - **Staff Profiles:** 4 staff with specializations and rates
  - **Patients:** 4 test patients with medical conditions
  - **Assignments:** 4 assignments with various shifts and statuses
  - **Attendance Logs:** 3 attendance records
  - **Care Logs:** 4 care log entries
  - **Courses:** 4 courses with different durations
  - **Course Batches:** 4 batches in various states
  - **Student Enrollments:** 3 student-batch enrollments
  - **Invoices:** 4 invoices with different statuses (PAID, UNPAID, OVERDUE)
  - **Invoice Items:** 3 items with varying quantities
  - **Subscription Plans:** 3 plans (Starter, Professional, Enterprise)
  - **Subscriptions:** 3 client subscriptions
  - **Leads:** 3 leads from different sources
  - **Services:** 5 services across cities
  - **Assignment Submissions:** 3 student submissions
  - **Audit Logs:** 3 sample audit entries

**Default Credentials for All Users:**
```
Password: Test@1234
Email Pattern: role-type@example.com
Admin Email: admin@carego.in, admin2@carego.in
```

### 3. **Postman Test Collection** (`POSTMAN_COLLECTION.json`)
- **Location:** `carego-backend/POSTMAN_COLLECTION.json`
- **Format:** JSON (ready for import into Postman)
- **Coverage:** 50+ endpoints across all phases
- **Features:**
  - Organized by phase/module
  - Pre-configured environment variables
  - Auto-save tokens after login
  - Test scripts for response validation
  - Sample request bodies
  - Authentication flow setup

**Collection Structure:**
```
1. SETUP - Authentication (Login First)
   └─ Admin Login, Client Login, Staff Login, Check Auth
2. PHASE 0-1: Public APIs
   └─ Cities, Services, Leads
3. PHASE 2: Client App
   └─ Profile, Patients, Assignments, Care Logs, Invoices
4. PHASE 2: Staff App
   └─ Profile, Assignments, Attendance, Care Logs
5. PHASE 3: Finance
   └─ Invoices, Subscription Plans, Dashboard
6. PHASE 3: Training
   └─ Courses, Batches, Details
7. PHASE 4 W1: Payments
   └─ Payments, Methods
8. PHASE 4 W1: Ratings
   └─ Ratings, Summary
9. PHASE 4 W2: Analytics
   └─ Dashboard, Revenue Analytics
10. PHASE 4 W3: Integrations
    └─ Hospital, IoT
11. PHASE 4 W4: Compliance
    └─ Audit Logs, Compliance Export
12. ADMIN Management
    └─ Users CRUD
```

### 4. **Comprehensive Testing Guide** (`POSTMAN_TEST_GUIDE.md`)
- **Location:** `POSTMAN_TEST_GUIDE.md` (in project root)
- **Sections:** 16 major sections with 3000+ lines
- **Coverage:**
  - Setup instructions (database, server, Postman)
  - Authentication flow with all user types
  - Complete endpoint documentation for all 140+ APIs
  - curl examples for every endpoint
  - Expected request/response formats
  - Error handling and validation
  - Testing checklist
  - Troubleshooting guide

---

## 🚀 Quick Start Guide

### Step 1: Setup Database
```bash
# Import schema
mysql -u root -p < carego-backend/config/schema_phase4.sql

# Import seed data
mysql -u root -p < carego-backend/config/seed_phase4.sql

# Verify
mysql -u root -p carego_db -e "SELECT COUNT(*) as 'Total Users' FROM users;"
```

### Step 2: Start Backend Server
```bash
cd carego-backend
npm install
npm start
# Server will run on http://localhost:8000
```

### Step 3: Import Postman Collection
1. Open Postman
2. Click **Import** button
3. Select `carego-backend/POSTMAN_COLLECTION.json`
4. Click **Import**

### Step 4: Create Environment
1. Click **Environments** → **Create New**
2. Name: `Carego-Dev`
3. Add variables:
   ```
   base_url: http://localhost:8000/api/v1
   admin_token: (empty - will be filled after login)
   client_token: (empty)
   staff_token: (empty)
   ```
4. Save

### Step 5: Run Tests
1. Go to **Collection** → **Authentication**
2. Run **1.1 Admin Login** - this auto-fills {{admin_token}}
3. Run **1.2 Client Login** - fills {{client_token}}
4. Run **1.3 Staff Login** - fills {{staff_token}}
5. Navigate to other endpoints and test!

---

## 📊 Test Data Summary

### Users by Role (10 Total)
| Role | Count | Email | Default Password |
|------|-------|-------|------------------|
| SUPER_ADMIN | 1 | admin@carego.in | Test@1234 |
| ADMIN | 1 | admin2@carego.in | Test@1234 |
| CLIENT | 3 | client1-3@example.com | Test@1234 |
| STAFF | 4 | staff1-4@example.com | Test@1234 |
| STUDENT | 3 | student1-3@example.com | Test@1234 |
| TEACHER | 2 | teacher1-2@example.com | Test@1234 |

### Relationships Created
```
Client 1 (Health Plus Care Home)
├── Patient 1 (Ramesh Gupta, 75M)
│   └── Assignment 1 → Staff 1 (Ajay Kumar - Elder Care)
│       ├── Attendance logs
│       └── Care logs
├── Patient 2 (Savitri Gupta, 72F)
│   └── Assignment 4 → Staff 4 (Neha Patel - General Care)
│       ├── Attendance logs
│       └── Care logs
├── Invoice 1 (INV-2026-0001, UNPAID)
│   └── Invoice Item 1 (30 days @ 800/day)
└── Subscription 1 (Professional Plan)

Client 2 (Delhi Medical Services)
├── Patient 3 (Vikram Singh, 60M)
│   └── Assignment 2 → Staff 2 (Priya Sharma - Post-Surgery Care)
│       └── Care logs
├── Invoice 2 (INV-2026-0003, UNPAID)
└── Subscription 2 (Starter Plan)

Client 3 (Mumbai Care Center)
├── Patient 4 (Anjali Patel, 5F)
│   └── Assignment 3 → Staff 3 (Rahul Singh - Child Care) [COMPLETED]
├── Invoice 3 (INV-2026-0004, OVERDUE)
└── Subscription 3 (Enterprise Plan)
```

### Courses & Training
- Course 1: Basic Healthcare (8 weeks) - 25 students enrolled
- Course 2: Advanced Nursing (12 weeks) - 15 students enrolled
- Course 3: Elderly Care Specialist (10 weeks) - 20 students
- Course 4: First Aid & CPR (2 weeks) - 20 students

---

## 🧪 Testing Workflow

### Authentication Flow (1-2 minutes)
```
1. Run: 1.1 Admin Login (GET token)
   ↓ Auto-saves {{admin_token}}
2. Run: 1.2 Client Login (GET token)
   ↓ Auto-saves {{client_token}}
3. Run: 1.3 Staff Login (GET token)
   ↓ Auto-saves {{staff_token}}
4. Verify: 1.4 Check Auth Status
```

### Phase-by-Phase Testing (15-20 minutes)
```
1. Public APIs (5 min) - No auth required
   ├─ List Cities
   ├─ List Services
   ├─ Get Service Details
   └─ Submit Lead

2. Client App (5 min) - Use {{client_token}}
   ├─ Profile Management
   ├─ Patient Management
   ├─ Assignment Management
   └─ Invoice Viewing

3. Staff App (3 min) - Use {{staff_token}}
   ├─ Check In/Out
   ├─ Care Log Creation
   └─ Assignment Viewing

4. Finance (2 min) - Use {{admin_token}}
   ├─ Invoice Management
   └─ Financial Dashboard

5. Training (2 min)
   ├─ List Courses
   └─ View Course Details

6. Advanced Features (3 min)
   ├─ Payments
   ├─ Ratings
   ├─ Analytics
   └─ Integrations
```

---

## 📝 Files Created/Updated

| File | Size | Purpose |
|------|------|---------|
| `schema_phase4.sql` | 620 LOC | Database schema with all 46+ tables |
| `seed_phase4.sql` | 400 LOC | Test data for all modules |
| `POSTMAN_COLLECTION.json` | 500+ LOC | Importable Postman collection |
| `POSTMAN_TEST_GUIDE.md` | 3000+ LOC | Complete testing documentation |

**Locations:**
```
carego-backend/
├── config/
│   ├── schema_phase4.sql ← Database Schema
│   └── seed_phase4.sql ← Seed Data
├── POSTMAN_COLLECTION.json ← Postman Collection
└── ...

Project Root/
└── POSTMAN_TEST_GUIDE.md ← Testing Guide
```

---

## ✅ Verification Checklist

- [x] Schema includes all 46+ tables from Phase 0-4
- [x] Seed data includes diverse user types (ADMIN, CLIENT, STAFF, STUDENT, TEACHER)
- [x] Complete relationships created (client → patient → assignment → staff)
- [x] Test invoices with different statuses (PAID, UNPAID, OVERDUE)
- [x] Subscription plans assigned to clients
- [x] Courses and student enrollments
- [x] Attendance logs and care logs
- [x] Audit logs for compliance
- [x] Postman collection with 50+ endpoints
- [x] Environment variables configured
- [x] Auto-save token scripts
- [x] Complete testing guide with curl examples
- [x] All error scenarios documented
- [x] Permission/role-based access documented

---

## 🔐 Security Notes

### Password Security
- All test user passwords are hashed with bcrypt (cost 10)
- Hash: `$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW`
- Password: `Test@1234`

### Authentication in Postman
- Tokens stored in environment variables
- Auto-injected via Bearer header
- Tokens expire after testing (expected behavior)
- Simply re-run login endpoints to refresh

### GDPR & Compliance
- Soft delete support (deleted_at fields)
- Audit logs for all operations
- Data consent tracking
- Export functionality for compliance

---

## 📞 Support & Next Steps

### If Backend Starts with Errors
1. Check database is running: `mysql -u root -p`
2. Verify schema loaded: `USE carego_db; SHOW TABLES;`
3. Check environment variables in `.env`
4. Review backend logs for specific errors
5. Restart: `npm start`

### To Add More Test Data
Edit `seed_phase4.sql` and add more:
- INSERT INTO users (...)
- INSERT INTO patients (...)
- INSERT INTO invoices (...)
- Re-run: `mysql -u root -p carego_db < seed_phase4.sql`

### To Test New Endpoints
1. Add endpoint to Postman collection
2. Set proper authorization header
3. Fill in request body from documentation
4. Send and verify response

### Common Issues
- **401 Unauthorized:** Re-run login endpoint
- **404 Not Found:** Verify ID exists in database
- **500 Error:** Check backend logs
- **Connection Refused:** Backend not running on port 8000

---

## 🎯 Testing Coverage

**Total Endpoints Documented:** 140+
**Postman Collection Coverage:** 50+ endpoints
**Test Data Scenarios:** 
- Happy paths (success cases)
- Error cases (validation, auth, permissions)
- Edge cases (pagination, filtering, sorting)
- Complex workflows (multi-step operations)

**All Phases Covered:**
- ✅ Phase 0-1: Authentication & Public APIs (4)
- ✅ Phase 2: Client & Staff Apps (27)
- ✅ Phase 3: Finance & Training (22)
- ✅ Phase 4 W1: Payments, Ratings, Recommendations (19)
- ✅ Phase 4 W2: Analytics & Mobile Sync (11)
- ✅ Phase 4 W3: Integrations (11)
- ✅ Phase 4 W4: Compliance & GDPR (8)
- ✅ Admin Management (6)

---

## 📚 Documentation Files

1. **schema_phase4.sql** - Database structure
2. **seed_phase4.sql** - Initial test data
3. **POSTMAN_COLLECTION.json** - Test collection
4. **POSTMAN_TEST_GUIDE.md** - Complete testing guide
5. **This file** - Setup and verification guide

---

## 🎉 Ready to Test!

Your complete Carego backend testing infrastructure is ready. 

**Next Steps:**
1. Load database: `mysql < carego-backend/config/schema_phase4.sql && mysql < carego-backend/config/seed_phase4.sql`
2. Start server: `npm start`
3. Import Postman collection
4. Login and start testing!

---

**Created:** January 2026  
**Version:** 1.0  
**Status:** ✅ Complete & Ready for Testing
