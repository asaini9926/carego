# Carego Platform - Postman Testing Guide

Complete testing documentation for all 140+ backend endpoints across all phases (0-4).

---

## 1. SETUP INSTRUCTIONS

### Prerequisites
- Postman (latest version)
- Backend running on `http://localhost:8000`
- MySQL database with schema and seed data loaded

### Step 1: Setup Database
```bash
# Load schema
mysql -u root -p < carego-backend/config/schema_phase4.sql

# Load test data
mysql -u root -p < carego-backend/config/seed_phase4.sql
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
2. Click "Import" → Select [Carego_Collection.json](./carego-backend/POSTMAN_COLLECTION.json)
3. Import the collection
4. Create environment named "Carego-Dev"
5. Set variables (see Step 4)

### Step 4: Create Environment Variables
In Postman, create environment "Carego-Dev" with these variables:

```
{
  "base_url": "http://localhost:8000/api/v1",
  "admin_token": "",
  "client_token": "",
  "staff_token": "",
  "student_token": "",
  "teacher_token": "",
  "current_user_id": ""
}
```

---

## 2. AUTHENTICATION FLOW

### Test User Credentials
```
Email              | Password   | Role         | ID
--------------------|------------|--------------|------------------
admin@carego.in   | Admin@123  | SUPER_ADMIN  | user-admin-001
admin2@carego.in  | Admin@123  | ADMIN        | user-admin-002
client1@example.com | Admin@123  | CLIENT       | user-client-001
client2@example.com | Admin@123  | CLIENT       | user-client-002
client3@example.com | Admin@123  | CLIENT       | user-client-003
staff1@example.com  | Admin@123  | STAFF        | user-staff-001
staff2@example.com  | Admin@123  | STAFF        | user-staff-002
staff3@example.com  | Admin@123  | STAFF        | user-staff-003
student1@example.com| Admin@123  | STUDENT      | user-student-001
teacher1@example.com| Admin@123  | TEACHER      | user-teacher-001
```

### Login Flow

**Endpoint:** POST `/auth/login`

**Request Body:**
```json
{
  "email": "admin@carego.in",
  "password": "Admin@123"
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-admin-001",
      "email": "admin@carego.in",
      "phone": "9999000001",
      "user_type": "SUPER_ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Setup Instructions:**
1. Send login request for each role (admin, client, staff, etc.)
2. Copy `token` from response
3. Store in environment variable (e.g., {{admin_token}})
4. All subsequent requests automatically inject token in header

---

## 3. PHASE 0-1: AUTHENTICATION & PUBLIC

### A. Authentication Endpoints (4)

#### 1. User Login
```
POST /auth/login
Headers: -
Body: { "email", "password" }
Auth: None
Test: Valid credentials → 200 with token
```

#### 2. User Logout
```
POST /auth/logout
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required
Test: Logout → 200, token invalidated
```

#### 3. Refresh Token
```
POST /auth/refresh
Headers: Authorization: Bearer {{admin_token}}
Body: { "refreshToken" }
Auth: Required
Test: Valid refresh → 200 with new token
```

#### 4. Check Auth Status
```
GET /auth/me
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required
Test: Get current user → 200 with user data
```

### B. Public Endpoints (4)

#### 1. List All Services by City
```
GET /public/services?city_id=city-jaipur-001
Headers: -
Body: -
Auth: None
Test: Get services → 200 with service list
Response: [
  { "id", "title", "price_range_min", "price_range_max" }
]
```

#### 2. Get Service Details
```
GET /public/services/:id
Headers: -
Body: -
Auth: None
Test: Get single service → 200
```

#### 3. Submit Lead Form
```
POST /public/leads
Headers: -
Body: { "name", "phone", "email", "lead_type", "city_id" }
Auth: None
Test: Submit lead → 201, returns lead_id
```

#### 4. List Cities
```
GET /public/cities
Headers: -
Body: -
Auth: None
Test: Get all cities → 200
```

---

## 4. PHASE 2: CLIENT & STAFF APPS

### A. Client App (15 endpoints)

#### 1. Get Client Profile
```
GET /client/profile
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, returns client profile
```

#### 2. Update Client Profile
```
PUT /client/profile
Headers: Authorization: Bearer {{client_token}}
Body: { "organization_name", "contact_person_name", ... }
Auth: Required (CLIENT)
Test: 200, profile updated
```

#### 3. List Patient Assignments
```
GET /client/patients?page=1&limit=10
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, returns paginated patients
```

#### 4. Create Patient
```
POST /client/patients
Headers: Authorization: Bearer {{client_token}}
Body: { "full_name", "age", "gender", "medical_condition" }
Auth: Required (CLIENT)
Test: 201, patient created
```

#### 5. Get Patient Details
```
GET /client/patients/:id
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, patient data
```

#### 6. Update Patient
```
PUT /client/patients/:id
Headers: Authorization: Bearer {{client_token}}
Body: { "medical_condition", "allergies", ... }
Auth: Required (CLIENT)
Test: 200, patient updated
```

#### 7. Create Assignment
```
POST /client/assignments
Headers: Authorization: Bearer {{client_token}}
Body: { 
  "staff_id": "user-staff-001",
  "patient_id": "patient-001",
  "shift_type": "FULL_DAY",
  "start_date": "2026-01-15"
}
Auth: Required (CLIENT)
Test: 201, assignment created
```

#### 8. Update Assignment
```
PUT /client/assignments/:id
Headers: Authorization: Bearer {{client_token}}
Body: { "status": "ACTIVE|PAUSED|COMPLETED" }
Auth: Required (CLIENT)
Test: 200, assignment updated
```

#### 9. Get Assignment Details
```
GET /client/assignments/:id
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, assignment with care logs
```

#### 10. List Care Logs for Assignment
```
GET /client/assignments/:id/care-logs
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, paginated care logs
```

#### 11. View Attendance Reports
```
GET /client/reports/attendance?start_date=2026-01-01&end_date=2026-01-31
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, attendance data
```

#### 12. View Invoice
```
GET /client/invoices/:id
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, invoice details
```

#### 13. List Invoices
```
GET /client/invoices?status=UNPAID
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, filtered invoices
```

#### 14. Estimate Service Cost
```
POST /client/estimate
Headers: Authorization: Bearer {{client_token}}
Body: { 
  "patient_id", 
  "service_type", 
  "start_date", 
  "end_date",
  "shift_type"
}
Auth: Required (CLIENT)
Test: 200, returns cost estimate
```

#### 15. List Assigned Staff
```
GET /client/staff-assignments
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, list of assigned staff
```

### B. Staff App (12 endpoints)

#### 1. Get Staff Profile
```
GET /staff/profile
Headers: Authorization: Bearer {{staff_token}}
Body: -
Auth: Required (STAFF)
Test: 200, staff profile
```

#### 2. Update Staff Profile
```
PUT /staff/profile
Headers: Authorization: Bearer {{staff_token}}
Body: { "daily_rate", "monthly_rate", "is_available" }
Auth: Required (STAFF)
Test: 200, profile updated
```

#### 3. Get Today's Assignments
```
GET /staff/assignments/today
Headers: Authorization: Bearer {{staff_token}}
Body: -
Auth: Required (STAFF)
Test: 200, assignments for today
```

#### 4. Get All Assignments
```
GET /staff/assignments?status=ACTIVE
Headers: Authorization: Bearer {{staff_token}}
Body: -
Auth: Required (STAFF)
Test: 200, paginated assignments
```

#### 5. Check In
```
POST /staff/attendance/check-in
Headers: Authorization: Bearer {{staff_token}}
Body: { 
  "assignment_id",
  "latitude": 26.9124,
  "longitude": 75.7873
}
Auth: Required (STAFF)
Test: 201, check-in recorded
```

#### 6. Check Out
```
POST /staff/attendance/check-out
Headers: Authorization: Bearer {{staff_token}}
Body: { 
  "assignment_id",
  "latitude": 26.9124,
  "longitude": 75.7873
}
Auth: Required (STAFF)
Test: 200, check-out recorded
```

#### 7. Create Care Log
```
POST /staff/care-logs
Headers: Authorization: Bearer {{staff_token}}
Body: { 
  "assignment_id",
  "patient_id",
  "content": "Patient BP: 120/80",
  "services_provided": "Vital checks"
}
Auth: Required (STAFF)
Test: 201, care log created
```

#### 8. Update Care Log
```
PUT /staff/care-logs/:id
Headers: Authorization: Bearer {{staff_token}}
Body: { "content", "services_provided", "patient_condition" }
Auth: Required (STAFF)
Test: 200, updated
```

#### 9. Submit Attendance
```
POST /staff/attendance/submit
Headers: Authorization: Bearer {{staff_token}}
Body: { "assignment_id", "log_date" }
Auth: Required (STAFF)
Test: 200, attendance submitted
```

#### 10. Get Salary Info
```
GET /staff/salary
Headers: Authorization: Bearer {{staff_token}}
Body: -
Auth: Required (STAFF)
Test: 200, salary calculation
```

#### 11. Submit Documents
```
POST /staff/documents
Headers: Authorization: Bearer {{staff_token}}
Body: { "type": "CERTIFICATE|ID|POLICE_CHECK", "url" }
Auth: Required (STAFF)
Test: 201, document uploaded
```

#### 12. Get Performance Rating
```
GET /staff/performance
Headers: Authorization: Bearer {{staff_token}}
Body: -
Auth: Required (STAFF)
Test: 200, rating and reviews
```

---

## 5. PHASE 3: FINANCE & TRAINING

### A. Finance (12 endpoints)

#### 1. Create Invoice
```
POST /finance/invoices
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "client_id", 
  "invoice_number",
  "amount",
  "tax_percentage": 18,
  "due_date": "2026-02-01"
}
Auth: Required (ADMIN/SUPER_ADMIN)
Test: 201, invoice created
```

#### 2. Get Invoice
```
GET /finance/invoices/:id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, invoice data
```

#### 3. List Invoices
```
GET /finance/invoices?status=UNPAID&client_id=user-client-001
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, filtered list
```

#### 4. Update Invoice
```
PUT /finance/invoices/:id
Headers: Authorization: Bearer {{admin_token}}
Body: { "status": "PAID|UNPAID|OVERDUE", "notes" }
Auth: Required (ADMIN)
Test: 200, updated
```

#### 5. Add Invoice Item
```
POST /finance/invoices/:id/items
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "service_code": "FULL_DAY_CARE",
  "quantity": 30,
  "unit_price": 800
}
Auth: Required (ADMIN)
Test: 201, item added
```

#### 6. Mark Invoice Paid
```
POST /finance/invoices/:id/mark-paid
Headers: Authorization: Bearer {{admin_token}}
Body: { "payment_method": "UPI|CARD|BANK" }
Auth: Required (ADMIN)
Test: 200, invoice marked paid
```

#### 7. Create Subscription Plan
```
POST /finance/subscription-plans
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "name": "Premium",
  "price": 4999,
  "billing_cycle": "MONTHLY",
  "features": ["Feature1", "Feature2"]
}
Auth: Required (SUPER_ADMIN)
Test: 201, plan created
```

#### 8. List Subscription Plans
```
GET /finance/subscription-plans
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, all plans
```

#### 9. Assign Subscription to Client
```
POST /finance/subscriptions
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "client_id": "user-client-001",
  "plan_id": "plan-002",
  "auto_renew": true
}
Auth: Required (ADMIN)
Test: 201, subscription assigned
```

#### 10. Get Client Subscription
```
GET /finance/subscriptions/:id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, subscription details
```

#### 11. Cancel Subscription
```
POST /finance/subscriptions/:id/cancel
Headers: Authorization: Bearer {{admin_token}}
Body: { "reason": "Cancellation reason" }
Auth: Required (ADMIN)
Test: 200, cancelled
```

#### 12. Get Financial Dashboard
```
GET /finance/dashboard
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, revenue, invoices, subscriptions summary
```

### B. Training (10 endpoints)

#### 1. Create Course
```
POST /training/courses
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "title": "New Course",
  "description": "Description",
  "duration_weeks": 8,
  "price": 5000
}
Auth: Required (ADMIN)
Test: 201, course created
```

#### 2. List Courses
```
GET /training/courses
Headers: Authorization: Bearer -
Body: -
Auth: None (public)
Test: 200, all courses
```

#### 3. Get Course Details
```
GET /training/courses/:id
Headers: Authorization: Bearer -
Body: -
Auth: None
Test: 200, course + batches
```

#### 4. Create Course Batch
```
POST /training/courses/:id/batches
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "batch_name": "Batch A",
  "start_date": "2026-02-01",
  "max_students": 30
}
Auth: Required (ADMIN)
Test: 201, batch created
```

#### 5. List Course Batches
```
GET /training/courses/:id/batches
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, batches list
```

#### 6. Enroll Student in Batch
```
POST /training/batches/:id/enroll
Headers: Authorization: Bearer {{admin_token}}
Body: { "student_id": "user-student-001" }
Auth: Required (ADMIN)
Test: 201, enrolled
```

#### 7. List Batch Students
```
GET /training/batches/:id/students
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, students list
```

#### 8. Submit Assignment
```
POST /training/assignments/submit
Headers: Authorization: Bearer {{student_token}}
Body: { 
  "batch_id",
  "submission_text": "Assignment content"
}
Auth: Required (STUDENT)
Test: 201, submitted
```

#### 9. Grade Submission
```
POST /training/assignments/:id/grade
Headers: Authorization: Bearer {{teacher_token}}
Body: { 
  "score": 95,
  "feedback": "Excellent work"
}
Auth: Required (TEACHER)
Test: 200, graded
```

#### 10. Get Student Progress
```
GET /training/progress/:student_id
Headers: Authorization: Bearer {{teacher_token}}
Body: -
Auth: Required (TEACHER)
Test: 200, progress data
```

---

## 6. PHASE 4 WEEK 1: PAYMENTS, RATINGS, RECOMMENDATIONS

### A. Payments (8 endpoints)

#### 1. Process Payment
```
POST /payments/process
Headers: Authorization: Bearer {{client_token}}
Body: { 
  "invoice_id": "inv-001",
  "amount": 28320,
  "gateway": "STRIPE",
  "payment_method_id": "pm_xxx"
}
Auth: Required (CLIENT)
Test: 201, payment processed
Response: { "payment_id", "status": "SUCCESS|PENDING" }
```

#### 2. Get Payment
```
GET /payments/:id
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, payment details
```

#### 3. List Payments
```
GET /payments?client_id=user-client-001&status=SUCCESS
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, payments list
```

#### 4. Save Payment Method
```
POST /payments/methods
Headers: Authorization: Bearer {{client_token}}
Body: { 
  "card_token": "tok_xxx",
  "card_last_four": "4242",
  "is_default": true
}
Auth: Required (CLIENT)
Test: 201, method saved
```

#### 5. Get Payment Methods
```
GET /payments/methods
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, saved methods
```

#### 6. Process Refund
```
POST /payments/refunds
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "payment_id": "pay-001",
  "amount": 28320,
  "reason": "Service cancellation"
}
Auth: Required (ADMIN)
Test: 201, refund initiated
```

#### 7. Get Refund Status
```
GET /payments/refunds/:id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, refund details
```

#### 8. Webhook Receiver
```
POST /payments/webhook
Headers: X-Webhook-Signature: signature
Body: { webhook_event_payload }
Auth: None (secured by signature)
Test: 200, event processed
```

### B. Ratings (6 endpoints)

#### 1. Create Rating
```
POST /ratings
Headers: Authorization: Bearer {{client_token}}
Body: { 
  "assignment_id": "assign-001",
  "rated_user_id": "user-staff-001",
  "score": 5,
  "review": "Excellent service",
  "categories": ["professionalism", "punctuality", "care_quality"]
}
Auth: Required (CLIENT)
Test: 201, rating created
```

#### 2. Get Rating
```
GET /ratings/:id
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, rating details
```

#### 3. List Ratings
```
GET /ratings?rated_user_id=user-staff-001
Headers: Authorization: Bearer -
Body: -
Auth: None (public)
Test: 200, ratings list
```

#### 4. Flag Rating (Inappropriate)
```
POST /ratings/:id/flag
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "reason": "Inappropriate content",
  "severity": "LOW|MEDIUM|HIGH"
}
Auth: Required (ADMIN)
Test: 201, flagged
```

#### 5. Update Rating
```
PUT /ratings/:id
Headers: Authorization: Bearer {{client_token}}
Body: { "score", "review" }
Auth: Required (CLIENT, rater only)
Test: 200, updated
```

#### 6. Get User Rating Summary
```
GET /ratings/summary/:user_id
Headers: Authorization: Bearer -
Body: -
Auth: None
Test: 200, avg_score, total_ratings
```

### C. Recommendations (5 endpoints)

#### 1. Get Recommendations
```
GET /recommendations
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, staff recommendations
Response: [
  { "staff_id", "name", "specialization", "avg_rating" }
]
```

#### 2. Create Recommendation
```
POST /recommendations
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "user_id": "user-client-001",
  "recommended_staff_id": "user-staff-001",
  "relevance_score": 0.95
}
Auth: Required (ADMIN)
Test: 201, recommendation created
```

#### 3. Record Recommendation Feedback
```
POST /recommendations/:id/feedback
Headers: Authorization: Bearer {{client_token}}
Body: { 
  "action": "CLICKED|HIRED|IGNORED|SAVED"
}
Auth: Required (CLIENT)
Test: 201, feedback recorded
```

#### 4. Get Trending Staff
```
GET /recommendations/trending
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, top trending staff
```

#### 5. Get Recommendations for Staff
```
GET /recommendations/staff/:staff_id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, staff recommendations
```

---

## 7. PHASE 4 WEEK 2: ANALYTICS & MOBILE SYNC

### A. Analytics Reporting (7 endpoints)

#### 1. Get Analytics Dashboard
```
GET /analytics/dashboard
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, KPIs and charts
```

#### 2. Create Scheduled Report
```
POST /analytics/reports/scheduled
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "report_type": "REVENUE|OPERATIONS|STAFF_PERFORMANCE",
  "frequency": "DAILY|WEEKLY|MONTHLY",
  "recipient_emails": ["admin@example.com"]
}
Auth: Required (ADMIN)
Test: 201, report scheduled
```

#### 3. Generate Report
```
POST /analytics/reports/generate
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "report_type": "REVENUE",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31"
}
Auth: Required (ADMIN)
Test: 201, report queued
Response: { "report_id", "status": "PENDING" }
```

#### 4. Get Report Status
```
GET /analytics/reports/:id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, report details + download URL
```

#### 5. Download Report
```
GET /analytics/reports/:id/download
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, file download (CSV/PDF)
```

#### 6. Get Revenue Analytics
```
GET /analytics/revenue?period=MONTHLY&months=6
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, revenue trends
```

#### 7. Get Staff Performance Analytics
```
GET /analytics/staff-performance?metric=rating|attendance|assignments
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, performance metrics
```

### B. Mobile Sync (4 endpoints)

#### 1. Get Sync Checkpoint
```
GET /sync/checkpoint
Headers: Authorization: Bearer {{staff_token}}
Body: -
Auth: Required (STAFF)
Test: 200, last sync timestamp
Response: { "checkpoint_time", "status" }
```

#### 2. Sync Data (Pull)
```
POST /sync/pull
Headers: Authorization: Bearer {{staff_token}}
Body: { 
  "checkpoint_time": "2026-01-01T10:00:00",
  "entities": ["assignments", "care_logs", "patients"]
}
Auth: Required (STAFF)
Test: 200, changed data since checkpoint
```

#### 3. Sync Data (Push)
```
POST /sync/push
Headers: Authorization: Bearer {{staff_token}}
Body: { 
  "operations": [
    { "type": "CREATE|UPDATE", "entity": "care_log", "data": {...} }
  ]
}
Auth: Required (STAFF)
Test: 200, changes synced
```

#### 4. Get Sync Status
```
GET /sync/status
Headers: Authorization: Bearer {{staff_token}}
Body: -
Auth: Required (STAFF)
Test: 200, sync queue status
```

---

## 8. PHASE 4 WEEK 3: INTEGRATIONS

### A. Hospital Integration (4 endpoints)

#### 1. Map Hospital Patient
```
POST /integrations/hospital/map
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "hospital_patient_id": "HSP-12345",
  "carego_patient_id": "patient-001",
  "hospital_id": "hosp-001"
}
Auth: Required (ADMIN)
Test: 201, mapping created
```

#### 2. Get Hospital Patient Mapping
```
GET /integrations/hospital/map/:id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, mapping details
```

#### 3. Create Hospital Referral
```
POST /integrations/hospital/referrals
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "hospital_id": "hosp-001",
  "patient_id": "patient-001",
  "referral_reason": "Complex surgery needed"
}
Auth: Required (ADMIN)
Test: 201, referral created
```

#### 4. Get Hospital Referral Status
```
GET /integrations/hospital/referrals/:id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, referral status
```

### B. Insurance Integration (2 endpoints)

#### 1. Export to Insurance Provider
```
POST /integrations/insurance/export
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "invoice_id": "inv-001",
  "provider_id": "INS-001"
}
Auth: Required (ADMIN)
Test: 201, exported
Response: { "export_id", "status": "PENDING" }
```

#### 2. Get Insurance Export Status
```
GET /integrations/insurance/export/:id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, export status
```

### C. IoT Integration (3 endpoints)

#### 1. Register IoT Device
```
POST /integrations/iot/devices
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "staff_id": "user-staff-001",
  "device_type": "PULSE_OXIMETER|BLOOD_PRESSURE|THERMOMETER",
  "device_id": "DEV-12345"
}
Auth: Required (ADMIN)
Test: 201, device registered
```

#### 2. Record Vitals from IoT
```
POST /integrations/iot/vitals
Headers: Authorization: Bearer {{staff_token}}
Body: { 
  "patient_id": "patient-001",
  "device_id": "DEV-12345",
  "vitals_json": {
    "heart_rate": 78,
    "oxygen_level": 98,
    "temperature": 98.6
  }
}
Auth: Required (STAFF)
Test: 201, vitals recorded
```

#### 3. Get Device Vitals History
```
GET /integrations/iot/vitals/:patient_id?days=7
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, vitals history
```

### D. Geofence Integration (2 endpoints)

#### 1. Record Geofence Check
```
POST /integrations/geofence/check
Headers: Authorization: Bearer {{staff_token}}
Body: { 
  "assignment_id": "assign-001",
  "latitude": 26.9124,
  "longitude": 75.7873
}
Auth: Required (STAFF)
Test: 201, check recorded
Response: { "is_within_geofence", "distance_meters" }
```

#### 2. Get Geofence History
```
GET /integrations/geofence/history/:assignment_id?days=7
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, geofence checks
```

---

## 9. PHASE 4 WEEK 4: COMPLIANCE & GDPR

### A. Compliance (3 endpoints)

#### 1. Generate Compliance Export
```
POST /compliance/export
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "export_type": "HIPAA|SOC2|GDPR",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31"
}
Auth: Required (ADMIN)
Test: 201, export created
```

#### 2. Get Compliance Export
```
GET /compliance/export/:id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, export details
```

#### 3. Download Compliance Report
```
GET /compliance/export/:id/download
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, file download
```

### B. Data Deletion (GDPR) (3 endpoints)

#### 1. Request Data Deletion
```
POST /compliance/deletion-request
Headers: Authorization: Bearer {{client_token}}
Body: { 
  "target_user_id": "user-client-001",
  "reason": "User request for data deletion"
}
Auth: Required (CLIENT or ADMIN)
Test: 201, deletion request created
```

#### 2. Get Deletion Request Status
```
GET /compliance/deletion-request/:id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, request details
```

#### 3. Process Deletion Request
```
POST /compliance/deletion-request/:id/execute
Headers: Authorization: Bearer {{admin_token}}
Body: { "confirmed": true }
Auth: Required (ADMIN)
Test: 200, deletion executed
```

### C. Consent Management (2 endpoints)

#### 1. Record User Consent
```
POST /compliance/consent
Headers: Authorization: Bearer {{client_token}}
Body: { 
  "consent_type": "TERMS|PRIVACY|MARKETING",
  "data_categories": ["PERSONAL", "HEALTH", "LOCATION"]
}
Auth: Required (CLIENT)
Test: 201, consent recorded
```

#### 2. Get User Consents
```
GET /compliance/consent
Headers: Authorization: Bearer {{client_token}}
Body: -
Auth: Required (CLIENT)
Test: 200, all consents
```

### D. Audit Logs (2 endpoints)

#### 1. Get Audit Log
```
GET /audit-logs?entity_type=PATIENT&entity_id=patient-001
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, audit entries
```

#### 2. Export Audit Trail
```
GET /audit-logs/export?start_date=2026-01-01&end_date=2026-01-31
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, audit CSV
```

---

## 10. ADMIN MANAGEMENT

### User Management (6 endpoints)

#### 1. Create User (Admin)
```
POST /admin/users
Headers: Authorization: Bearer {{admin_token}}
Body: { 
  "email": "newuser@carego.in",
  "phone": "9999000005",
  "user_type": "STAFF|CLIENT|ADMIN",
  "password": "SecurePass@1234"
}
Auth: Required (ADMIN/SUPER_ADMIN)
Test: 201, user created
```

#### 2. List Users
```
GET /admin/users?user_type=STAFF&page=1&limit=20
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, paginated users
```

#### 3. Get User Details
```
GET /admin/users/:id
Headers: Authorization: Bearer {{admin_token}}
Body: -
Auth: Required (ADMIN)
Test: 200, user profile
```

#### 4. Update User
```
PUT /admin/users/:id
Headers: Authorization: Bearer {{admin_token}}
Body: { "user_type", "account_status", "is_active" }
Auth: Required (ADMIN)
Test: 200, updated
```

#### 5. Deactivate User
```
POST /admin/users/:id/deactivate
Headers: Authorization: Bearer {{admin_token}}
Body: { "reason": "Inactivity" }
Auth: Required (ADMIN)
Test: 200, deactivated
```

#### 6. Reset User Password
```
POST /admin/users/:id/reset-password
Headers: Authorization: Bearer {{admin_token}}
Body: { "new_password": "NewPass@1234" }
Auth: Required (ADMIN)
Test: 200, password reset
```

---

## 11. ERROR HANDLING & VALIDATION

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET returns data |
| 201 | Created | POST creates resource |
| 400 | Bad Request | Invalid JSON/validation fails |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry |
| 422 | Validation Error | Invalid field values |
| 500 | Server Error | Internal error |

### Example Error Response (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Password must be 8+ characters"]
  }
}
```

### Example Error Response (401)
```json
{
  "success": false,
  "message": "Authentication failed",
  "error": "Invalid or expired token"
}
```

---

## 12. POSTMAN COLLECTION STRUCTURE

```
Carego Platform API
├── Authentication
│   ├── Login
│   ├── Logout
│   ├── Refresh Token
│   └── Check Auth
├── Phase 0-1: Public
│   ├── Services
│   ├── Cities
│   └── Leads
├── Phase 2: Client App
│   ├── Profile
│   ├── Patients
│   ├── Assignments
│   ├── Care Logs
│   ├── Invoices
│   └── Reports
├── Phase 2: Staff App
│   ├── Profile
│   ├── Assignments
│   ├── Attendance
│   ├── Care Logs
│   └── Performance
├── Phase 3: Finance
│   ├── Invoices
│   ├── Payments
│   └── Subscriptions
├── Phase 3: Training
│   ├── Courses
│   ├── Batches
│   ├── Enrollments
│   └── Assignments
├── Phase 4 Week 1: Payments
│   ├── Process Payment
│   ├── Manage Methods
│   ├── Refunds
│   └── Webhooks
├── Phase 4 Week 1: Ratings
│   ├── Create Rating
│   ├── View Ratings
│   └── Flag Rating
├── Phase 4 Week 1: Recommendations
│   ├── Get Recommendations
│   ├── Record Feedback
│   └── Trending
├── Phase 4 Week 2: Analytics
│   ├── Dashboard
│   ├── Reports
│   ├── Revenue
│   └── Staff Performance
├── Phase 4 Week 2: Mobile Sync
│   ├── Get Checkpoint
│   ├── Sync Pull
│   ├── Sync Push
│   └── Status
├── Phase 4 Week 3: Integrations
│   ├── Hospital
│   ├── Insurance
│   ├── IoT
│   └── Geofence
├── Phase 4 Week 4: Compliance
│   ├── Compliance Export
│   ├── GDPR Deletion
│   ├── Consent
│   └── Audit Logs
└── Admin Management
    ├── Users
    ├── Roles
    └── System
```

---

## 13. QUICK CURL EXAMPLES

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@carego.in",
    "password": "Admin@123"
  }'
```

### Create Patient (with auth)
```bash
curl -X POST http://localhost:8000/api/v1/client/patients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "age": 65,
    "gender": "MALE",
    "medical_condition": "Diabetes"
  }'
```

### Get Assignments
```bash
curl -X GET "http://localhost:8000/api/v1/staff/assignments?status=ACTIVE" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Invoice
```bash
curl -X POST http://localhost:8000/api/v1/finance/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "user-client-001",
    "invoice_number": "INV-2026-0005",
    "amount": 24000,
    "tax_percentage": 18,
    "due_date": "2026-02-01"
  }'
```

---

## 14. TESTING CHECKLIST

- [ ] Database setup complete (schema + seed)
- [ ] Backend server running on port 8000
- [ ] Postman collection imported
- [ ] Environment variables set
- [ ] Login successful for all user types
- [ ] Tokens stored in environment
- [ ] Authentication tests passing
- [ ] All CRUD operations tested
- [ ] Permission/authorization working
- [ ] Error handling tested
- [ ] Pagination tested
- [ ] Filtering working
- [ ] Status codes correct
- [ ] Response formats valid

---

## 15. TROUBLESHOOTING

### Issue: 401 Unauthorized
- **Cause:** Token missing or expired
- **Fix:** Login again, update token in environment

### Issue: 403 Forbidden
- **Cause:** User lacks permission for this operation
- **Fix:** Check user role, use correct user token

### Issue: 404 Not Found
- **Cause:** Resource doesn't exist
- **Fix:** Verify resource ID, create it first

### Issue: 500 Internal Server Error
- **Cause:** Server error
- **Fix:** Check backend logs, restart server

### Issue: Connection Refused
- **Cause:** Backend not running
- **Fix:** Start backend: `npm start`

---

## 16. NEXT STEPS

1. Import Postman collection
2. Setup environment variables
3. Run test suite by phase
4. Verify all endpoints working
5. Document any custom modifications
6. Create deployment checklist

---

**Last Updated:** 2026-01-13  
**Version:** 1.0  
**Total Endpoints:** 140+
