
---

# 🏗️ CAREGO PLATFORM: PRINCIPAL SYSTEMS ARCHITECT PLAN
## A Healthcare + Training + Staffing Operating System

---

## **1️⃣ SYSTEM OVERVIEW (ARCHITECT'S INTERPRETATION)**

### What Carego Is

Carego is a **multi-domain operational OS** serving the intersection of three markets:

1. **Acute care supply** (clients + patients needing field staff)
2. **Healthcare workforce development** (LMS + training)
3. **Digital-first care logistics** (scheduling, accountability, finance)

It is **not** a patient record system, telemedicine platform, or hospital EHR. It is a **last-mile care operations engine** built for India's healthcare staffing ecosystem.

### The Golden Triangle (Why It Works)

```
            TRAINING
           /        \
          /          \
      (builds)     (staffs)
        /              \
       /                \
   LMS STUDENTS ----→ CARE STAFF ----→ CLIENTS
       ↑                   ↑              ↓
       |              ASSIGNMENTS      INVOICES
       |                   |              |
       └───────────────────┴──────────────┘
           MONETIZATION + LOCK-IN
```

**Why it is defensible:**

- **Training creates debt** (clients invest months in course completion)
- **Staff certification locks buyers** (clients trust brand + verified capability)
- **Recurring billing** (subscriptions, per-shift payments, training fees)
- **Network effects** (more cities → more courses → more staff → more clients)
- **Switching costs** (clients can't easily retrain staff; staff can't easily change platforms)

**Why it is NOT just a recruitment board:**

- You control the **quality layer** (training + verification)
- You control the **assignment layer** (who goes where)
- You control the **compliance layer** (audit logs, vitals, attendance)
- You own the **relationship** (direct billing, client SLAs)

This is **SaaS for care operations**, not a gig marketplace.

### How All Domains Interact

1. **Website** → captures intent, ranks for local keywords, converts leads
2. **Admin/ERP** → converts leads → creates users → assigns roles → onboards
3. **Training/LMS** → develops students, issues certificates, builds pipeline
4. **Staffing/HR** → manages verified staff, assignments, attendance, payroll
5. **Care Ops** → logs daily work (vitals, notes), creates accountability
6. **Finance** → invoices clients, pays staff, tracks subscription revenue
7. **Shared Infrastructure** → auth, audit, secrets, files

All seven touch a single **master identity** (User) but operate in **strict domains**.

---

## **2️⃣ DOMAIN MAP (CLEAR SEPARATION & OWNERSHIP)**

### Domain 1: **Website / Marketing (Public Layer)**

**Owned by:** Marketing + Growth team

**Responsibility:**
- SEO ranking (service pages, course pages, city pages)
- Lead capture (forms)
- Content rendering (trust signals, outcomes, pricing ranges)

**What it reads:**
- Cities (public)
- Services list (public)
- Courses (public)
- Training centers (public)
- Precomputed trust metrics (# students trained, # caregivers, avg rating)

**What it writes:**
- Leads (lead table only)

**What it NEVER touches:**
- Client data
- Staff data
- Financial data
- LMS data
- Any authenticated endpoints

**Architecture:**
- Static / ISR pages (Next.js)
- Cloudflare CDN
- Public API calls only
- No JWT
- Rate-limited lead forms

**Key Risk:** If public APIs leak private data → everything fails. (Mitigated by strict schema separation.)

---

### Domain 2: **Core Ops (Care Operations)**

**Owned by:** Operations team

**Responsibility:**
- Assign staff to patients
- Track daily care (vitals, notes, attendance)
- Manage patient records
- Verify staff qualifications

**Who uses it:**
- Clients (app) → view care logs, vitals
- Staff (app) → log attendance, vitals, care notes
- Admin (ERP) → assign, override, audit

**Data owned:**
- ClientProfile, Patient
- StaffProfile, StaffAssignment
- AttendanceLog, CareLog, VitalsLog
- ExamEligibility (soft link to LMS)

**What is written:**
- Assignments (admin)
- Attendance (staff, append-only)
- Care logs (staff, append-only)
- Vitals (staff, append-only)

**Audit guarantee:**
- No edit / delete on care data
- All staff input is logged with timestamp
- Admin overrides are explicit + reasoned

**Key Risk:** If a staff member logs false vitals or attendance → clients lose trust. (Mitigated by GPS validation, check-in/out gates, digital signature of logs.)

---

### Domain 3: **Training / LMS**

**Owned by:** Academic team

**Responsibility:**
- Design courses, curricula, batches
- Manage student enrollment
- Track attendance, assignments, exams
- Issue certificates

**Who uses it:**
- Students (app) → view materials, submit work, see results
- Teachers (app/web) → create assignments, grade, track progress
- Admin (ERP) → manage batches, override eligibility, generate certs

**Data owned:**
- Course, Syllabus, CourseOffering
- Batch, StudentBatch, StudentAttendance
- Assignment, AssignmentSubmission, Exam, ExamResult
- Certificate, ExamEligibility

**Enrollment gates:**
- Admin converts lead → creates student profile
- Student self-enrolls in batch
- Attendance is tracked
- Eligibility is checked before exams

**Audit guarantee:**
- All grades are final (no edit)
- Eligibility overrides are logged
- Certificates are immutable

**Key Risk:** If a student gets a certificate without completing course → your brand is worthless. (Mitigated by strict eligibility checks, attendance thresholds, exam marks.)

---

### Domain 4: **Staffing / HR**

**Owned by:** HR + Operations team

**Responsibility:**
- Recruit and verify staff
- Manage certifications + specializations
- Track assignments and payroll
- Monitor performance metrics

**Who uses it:**
- Staff (app) → view assignments, log work, upload documents
- Admin (ERP) → create staff, verify, assign, pay, terminate

**Data owned:**
- StaffProfile (includes verification status, specialization, payType)
- StaffAssignment
- AttendanceLog (linked to both staff and patient)

**Verification workflow:**
- Admin creates staff profile
- Staff uploads docs (certificates, ID, police check)
- Admin reviews, marks VERIFIED / REJECTED
- Only VERIFIED staff can be assigned

**Payroll integration:**
- Staff payType = DAILY or MONTHLY
- AttendanceLogs feed payroll (days worked)
- Invoices → Payments (to staff)

**Key Risk:** If unverified staff are assigned → liability + malpractice. (Mitigated by explicit verification gate before assignment.)

---

### Domain 5: **Finance / Subscriptions**

**Owned by:** Finance + Revenue team

**Responsibility:**
- Invoice clients for care services
- Invoice students for courses
- Process payments
- Manage subscriptions
- Track receivables

**Who uses it:**
- Clients (app) → view invoices, pay
- Students (app) → view fees, pay
- Admin (ERP) → create invoices, manage payment plans, chase overdue

**Data owned:**
- Invoice (ownerType = CLIENT or STUDENT, ownerId)
- Payment
- SubscriptionPlan
- ClientSubscription

**Revenue streams:**
1. **Per-shift service fees** (staff assigned to client → daily invoice)
2. **Subscription plans** (monthly/yearly care package)
3. **Course fees** (student enrollment in batch)
4. **Staffing agency commissions** (staff referral / placement fee)

**Lock-in mechanism:**
- Clients on subscription cannot easily leave (contract)
- Staff have certification debt (training investment)
- Students pay upfront for course

**Key Risk:** If payment system fails → revenue stops. (Mitigated by retry logic, webhook callbacks, redundant gateways.)

---

### Domain 6: **Admin / ERP**

**Owned by:** Operations + Compliance team

**Responsibility:**
- Lead management (convert → user creation)
- Master data (cities, courses, staff, clients, batches)
- Audit trails
- Override controls
- Reporting

**Who uses it:**
- Admin + Super Admin only

**Data owned:**
- Everything (read + write)
- Audit log (append-only)
- Session management

**Explicit actions:**
- Convert lead → user
- Create staff, verify
- Create batch, assign students
- Override exam eligibility (with reason)
- Generate certificate
- Create invoice
- Terminate user (suspend account)

**Audit guarantee:**
- Every write is logged with:
  - Who (admin user ID)
  - What (entity type, ID, old/new values)
  - When (timestamp)
  - Why (reason/comment)

**Key Risk:** If admin actions go unaudited → zero compliance defense. (Mitigated by mandatory audit logging on all writes.)

---

### Domain 7: **Shared Infrastructure**

**Owned by:** Platform / Backend team

**Responsibility:**
- Authentication (JWT, refresh tokens, sessions)
- Authorization middleware (RBAC + ownership)
- Audit logging
- File storage (documents, certificates, assignments)
- Secrets management
- Rate limiting / DDoS protection

**All domains depend on this.**

**Auth services:**
- Login (phone + password)
- Token refresh
- Session management
- Token revocation (termination, lockout)

**RBAC services:**
- Role → permission mapping
- Ownership validation (client can only see own patients)
- Channel enforcement (app token ≠ admin API)

**File services:**
- Study material uploads (teacher)
- Assignment uploads (student)
- Certificate generation (admin)
- Staff document uploads (staff)
- Virus scanning, storage, CDN delivery

**Audit services:**
- Log every admin action
- Immutable log (append-only, no edit)
- Queryable (who did what when)

---

## **3️⃣ PHASED EXECUTION PLAN (6-MONTH ROADMAP)**

### **PHASE 0: FOUNDATIONS (Weeks 1–4)**

**Goal:** Build the secure, scalable infrastructure that all domains depend on.

**Do NOT build features yet. Build trust.**

#### 3.0.1 Modules Built

**A. Database + ORM**
- Deploy Prisma schema (you have it)
- Set up MySQL (prod), SQLite (dev)
- Run migrations
- Create indices on:
  - User.phone (login)
  - Client/Staff/Student/Teacher profileId lookup
  - Patient.clientId (client's view)
  - StaffAssignment.staffId, patientId (staff work queries)
  - Lead.status, createdAt (admin leads dashboard)

**B. Auth Service**
- JWT issuer (HS256 signing)
- Token structure (with custom claims: uid, role, channel, cityId, profileId, scopes, sessionId)
- Access token TTL by role (see jwt-token.md)
- Refresh token storage + rotation
- Session table + revocation logic
- Login endpoint (phone + password)
- Refresh endpoint
- Logout endpoint (session revocation)

**C. Authorization Middleware**
- Verify JWT signature + exp
- Extract claims
- Check channel (APP vs ADMIN)
- Route to role-specific validators
- Ownership check (query DB if needed)
- Deny with 403 if failed
- Attach identity to request context

**D. Audit Logging Service**
- AuditLog table (userId, role, action, entityType, entityId, oldValues, newValues, reason, timestamp)
- Middleware to auto-log all ADMIN writes
- Query builder (who did what when filter)
- Immutable log (no updates, no deletes, only appends)

**E. File Service**
- S3-compatible storage (AWS S3 or MinIO)
- File upload endpoint (authenticated)
- File download + CDN delivery
- Virus scan integration (ClamAV or Yara)
- Quota per user (storage limits)

**F. Rate Limiting**
- Redis-based rate limiter
- Per-endpoint rules (public leads: 10/hour, login: 5/hour, etc.)
- DDoS protection (Cloudflare)

#### 3.0.2 APIs Exposed

- `POST /api/v1/auth/login` (public)
- `POST /api/v1/auth/refresh` (public)
- `POST /api/v1/auth/logout` (authenticated)
- `POST /api/v1/files/upload` (authenticated)
- `GET /api/v1/files/{fileId}` (authenticated)

#### 3.0.3 Roles Involved

- Backend engineer (core)
- DevOps engineer (infra, secrets, DB)
- Security engineer (audit log design, token strategy)

#### 3.0.4 Security Considerations

- All passwords hashed (bcrypt, cost ≥ 12)
- JWT never contains sensitive data
- Refresh tokens stored hashed in DB
- Session revocation enforced on every request
- Audit log is write-only
- File uploads scanned before storage
- Rate limiting prevents brute force

#### 3.0.5 What is NOT Built Yet

- User creation (admin does it in Phase 1)
- Data (empty schema)
- Website (no public APIs)
- App features (no app endpoints)
- Lead form (no public lead creation)

**Outcome:** You have a secure, audited, scalable foundation. No feature can be added without going through RBAC + audit.

---

### **PHASE 1: TRUST & INTAKE (Weeks 5–9)**

**Goal:** Build the public-facing lead capture and convert leads to real users.

**By end of this phase:** Marketing can rank for local keywords, leads flow in, admin converts leads.

#### 3.1.1 Modules Built

**A. Public APIs (Website)**
- `GET /api/v1/public/cities` (cached 24h)
- `GET /api/v1/public/services?cityId` (cached 24h)
- `GET /api/v1/public/courses` (cached 24h)
- `GET /api/v1/public/training-centers?cityId` (cached 24h)
- `POST /api/v1/public/leads` (no cache, rate-limited, CAPTCHA)

**B. Lead Management (Admin)**
- `GET /api/v1/admin/leads` (filter by status, type, city, date)
- `GET /api/v1/admin/leads/{id}` (full lead + notes)
- `POST /api/v1/admin/leads/{id}/convert` (convert → user creation)
  - Input: lead ID, role (CLIENT or STUDENT), cityId
  - Output: new user created, profile created, password generated
  - Audit: logged with reason
- `POST /api/v1/admin/leads/{id}/reject` (mark LOST, reason stored)
- `POST /api/v1/admin/leads/{id}/note` (add internal notes, not visible to lead)

**C. Website Pages (SSR / ISR)**
- Homepage (cities, services, courses overview)
- City + service pages (e.g., /jaipur/elder-care)
- Course detail pages (e.g., /courses/icu-assistant)
- Training center pages (with batch schedule)
- Lead form (embedded on all pages)

**D. Trust Metrics (Website)**
- Precomputed counters:
  - Total students trained (by city)
  - Total caregivers verified (by city)
  - Services delivered this month
  - Courses offered
- Cache: 1 hour, refresh via webhook from ERP

**E. Email / SMS Integration**
- Lead confirmation (SMS to lead phone after form submission)
- Admin notification (email to admin when new lead)
- User onboarding (SMS with temp password after conversion)

#### 3.1.2 APIs Exposed

(Listed above)

#### 3.1.3 Roles Involved

- Frontend engineer (website)
- Backend engineer (admin APIs, lead conversion)
- DevOps engineer (CDN, caching, email/SMS providers)
- Growth/Marketing (SEO, content, keyword strategy)

#### 3.1.4 Security Considerations

- Public APIs serve only non-sensitive data
- Lead form CAPTCHA prevents spam bots
- Rate limiting on lead creation (10 per IP per hour)
- Lead conversion is explicit (admin must manually convert or auto-convert based on rules)
- User creation includes password generation (emailed or SMSed securely)
- No PII exposed in public APIs
- Website cannot call admin APIs (no auth header)

#### 3.1.5 What is NOT Built Yet

- Staff app
- Client app
- Training system
- Staffing assignments
- Finance system
- Care logging

**Outcome:** You have marketing that ranks, leads flowing in, admin can onboard users. System is still lean, secure, audited.

---

### **PHASE 2: OPERATIONS (Weeks 10–18)**

**Goal:** Build the core care operations: staff assignments, attendance, vitals logging, client visibility.

**By end of this phase:** Staff can log work, clients can see care, admin can manage operations.

#### 3.2.1 Modules Built

**A. Staff Management (Admin)**
- `POST /api/v1/admin/users` (create staff user)
  - Input: name, phone, city, specialization
  - Output: user created, staff profile created, status = UNVERIFIED
- `POST /api/v1/admin/staff/{staffId}/verify` (mark VERIFIED, with reason)
- `GET /api/v1/admin/staff` (list all staff, filter by city, verification status, specialization)
- `GET /api/v1/admin/staff/{staffId}` (detail view)
- `POST /api/v1/admin/staff/{staffId}/suspend` (set status = SUSPENDED, reason, audit)
- `POST /api/v1/admin/staff/{staffId}/terminate` (set status = TERMINATED, final payoff, audit)

**B. Client Management (Admin)**
- `POST /api/v1/admin/users` (create client user)
  - Input: name, phone, city
  - Output: user created, client profile created
- `POST /api/v1/admin/clients/{clientId}/add-patient` (add patient to client)
  - Input: name, age, condition, medical notes
- `GET /api/v1/admin/clients` (list all clients)
- `GET /api/v1/admin/clients/{clientId}` (detail view + patient list)

**C. Staffing Assignments (Admin)**
- `POST /api/v1/admin/assignments` (create staff assignment)
  - Input: staffId, patientId, shift, startDate, endDate
  - Validation: staff VERIFIED, patient exists, staff not already assigned
  - Output: StaffAssignment created, status = ACTIVE
- `GET /api/v1/admin/assignments` (filter by status, staff, patient, date range)
- `PATCH /api/v1/admin/assignments/{assignmentId}` (pause / end assignment early)

**D. Staff App: Attendance & Work Logging**
- `GET /api/v1/staff/assignments/today` (today's assigned shifts)
- `POST /api/v1/staff/attendance/check-in`
  - Input: assignmentId, latitude, longitude, time
  - Validation: assignment active, no duplicate check-in
  - Output: AttendanceLog created
- `POST /api/v1/staff/attendance/check-out`
  - Input: assignmentId, time, latitude, longitude
  - Validation: existing check-in, no duplicate check-out
  - Output: AttendanceLog updated
- `POST /api/v1/staff/care-logs`
  - Input: assignmentId, notes, mood, images (optional)
  - Validation: staff assigned to patient
  - Output: CareLog created (append-only)
- `POST /api/v1/staff/vitals`
  - Input: patientId, assignmentId, bpSys, bpDia, spo2, pulse, temp, sugar
  - Validation: staff assigned to patient
  - Output: VitalsLog created (append-only)
- `GET /api/v1/staff/past-assignments` (history for profile building)

**E. Client App: Care Visibility**
- `GET /api/v1/client/profile` (client details)
- `GET /api/v1/client/patients` (list patient under care)
- `POST /api/v1/client/patients` (add new patient)
  - Input: name, age, condition
- `GET /api/v1/client/patients/{patientId}/care-logs` (timeline, read-only)
  - Pagination: latest first
  - Fields: staff name, date, notes, mood, attachments
- `GET /api/v1/client/patients/{patientId}/vitals` (latest vitals, read-only)
  - Graph-friendly format: date, bp, spo2, pulse, temp, sugar
- `GET /api/v1/client/patients/{patientId}/assignments` (current + past staff)
  - Fields: staff name, dates, status, avg rating (if implemented)

**F. Audit & Operations Dashboard (Admin)**
- `GET /api/v1/admin/audit-logs` (filter by user, action, entity type, date range)
- `GET /api/v1/admin/operations/daily-summary` (staff check-ins, vitals logged, issues)

#### 3.2.2 APIs Exposed

(Listed above, ~20 new endpoints)

#### 3.2.3 Roles Involved

- Backend engineer (core operations APIs)
- Mobile engineer (staff app, client app)
- DevOps engineer (GPS validation, SMS notifications)
- Operations lead (UX design, process validation)

#### 3.2.4 Security Considerations

- Staff can ONLY check-in/out for assignments assigned to them
- Clients can ONLY read care logs for patients they own
- All care logs are append-only (no edit / delete)
- GPS validation on check-in (optional: geofencing)
- Attendance gaps trigger alerts (admin visibility)
- Staff cannot see other staff's assignments
- Client cannot see staff payment / scheduling details
- All work inputs are timestamped + logged
- Admin can view all but not silently edit work logs

#### 3.2.5 What is NOT Built Yet

- Training / LMS system
- Finance / invoicing
- Subscription management
- Staffing analytics
- Performance metrics
- Ratings / reviews

**Outcome:** Your core operations are digital. Staff work is logged. Clients have visibility. Everything is audited.

---

### **PHASE 3: LOCK-IN & SCALE (Weeks 19–26)**

**Goal:** Build training system, finance system, subscription lock-in. Expand to multiple cities.

**By end of this phase:** You have revenue, staff development pipeline, multi-city footprint, and customer switching costs.

#### 3.3.1 Modules Built

**A. Training / LMS System (Admin + Teachers + Students)**

**Admin:**
- `POST /api/v1/admin/courses` (create course)
- `POST /api/v1/admin/courses/{courseId}/offerings` (create course offering with price, duration)
- `POST /api/v1/admin/batches` (create batch in training center)
  - Input: centerId, courseOfferingId, shift, startDate, endDate, maxStudents
- `GET /api/v1/admin/batches` (list, filter by center, course, date)
- `POST /api/v1/admin/batches/{batchId}/enroll-student` (manually enroll student)

**Teachers:**
- `GET /api/v1/teacher/batches` (assigned batches)
- `POST /api/v1/teacher/batches/{batchId}/materials` (upload study material)
- `POST /api/v1/teacher/batches/{batchId}/assignments` (create assignment)
  - Input: title, dueDate
- `GET /api/v1/teacher/batches/{batchId}/submissions` (filter by assignment, student)
- `POST /api/v1/teacher/submissions/{submissionId}/evaluate` (grade + comments)
- `GET /api/v1/teacher/batches/{batchId}/attendance` (student attendance tracker)

**Students:**
- `GET /api/v1/student/batches` (enrolled batches)
- `GET /api/v1/student/batches/{batchId}/schedule` (class sessions, dates, topics)
- `GET /api/v1/student/batches/{batchId}/materials` (downloadable resources)
- `POST /api/v1/student/assignments/{assignmentId}/submit` (upload file)
- `GET /api/v1/student/assignments/{assignmentId}/feedback` (grade + comments)
- `GET /api/v1/student/results` (exams passed, grades, status)
- `GET /api/v1/student/certificates` (download issued certificates)

**Admin (Override):**
- `POST /api/v1/admin/exam-eligibility/override` (force student to take exam despite attendance)
  - Input: studentId, batchId, reason
  - Audit: logged with admin ID, reason
- `POST /api/v1/admin/certificates/generate` (issue certificate)
  - Input: studentId, batchId, date
  - Output: Certificate created, PDF stored, link provided

**B. Finance & Invoicing**

**Admin:**
- `POST /api/v1/admin/invoices` (create invoice)
  - Input: ownerType (CLIENT or STUDENT), ownerId, amount, description
  - Output: Invoice created, status = UNPAID
- `GET /api/v1/admin/invoices` (filter by status, owner, date range)
- `POST /api/v1/admin/invoices/{invoiceId}/send-reminder` (SMS/email reminder)
- `GET /api/v1/admin/receivables` (overdue, aging report)

**Client / Student:**
- `GET /api/v1/client/invoices` (list own invoices)
- `GET /api/v1/student/invoices` (list own invoices)
- `POST /api/v1/client/invoices/{invoiceId}/pay` (initiate payment)
  - Calls payment gateway (Razorpay / Stripe)
- `GET /api/v1/client/invoices/{invoiceId}/receipt` (download receipt)

**Payment Webhook:**
- `POST /webhooks/payments` (payment gateway callback)
  - Updates Invoice status = PAID
  - Logs audit entry
  - Sends SMS/email to customer

**C. Subscriptions (Care Shield Plans)**

**Admin:**
- `POST /api/v1/admin/plans` (create subscription plan)
  - Input: name, price, duration (monthly / yearly), features (e.g., "20 hours/week")
- `POST /api/v1/admin/clients/{clientId}/subscribe` (enroll client in plan)
  - Input: planId, startDate
  - Creates ClientSubscription + first invoice
- `GET /api/v1/admin/subscriptions` (list, filter by plan, status)

**Client:**
- `GET /api/v1/client/subscription` (current active plan)
- `POST /api/v1/client/subscription/upgrade` (change plan, pro-rated billing)
- `POST /api/v1/client/subscription/cancel` (end subscription, reason)
  - Cancellation effective end-of-month (gives you time for notice)
  - Creates final invoice if applicable

**D. Multi-City Expansion**

- Deploy second city in database (new City record)
- Duplicate courses, training centers, staff, service offerings per city
- Scoped admin per city (city-level admin who manages own city)
- Leads, clients, staff segregated by city
- Reports aggregated for super-admin

**E. Staffing Analytics (Admin Dashboard)**

- Staff availability (VERIFIED count by city, specialization)
- Utilization (avg hours/week per staff)
- Churn (% terminated/suspended)
- Client retention (churn %, NPS)
- Revenue per staff
- Revenue per client
- Course pipeline (students in flight → staff in pipeline)

#### 3.3.2 APIs Exposed

(~50+ new endpoints across LMS, Finance, Subscriptions, Admin)

#### 3.3.3 Roles Involved

- Backend engineer (finance, subscriptions, LMS)
- Mobile engineer (student app, teacher app, invoice pay)
- DevOps engineer (payment gateway integration, webhooks, reporting DB)
- Finance lead (subscription terms, payment policies)
- Academic lead (LMS workflow, grading rules)

#### 3.3.4 Security Considerations

- Students can ONLY see own batches, assignments, grades
- Teachers can ONLY see assigned batches
- Exam eligibility has explicit rules (attendance %, assignment completion %)
- Admin overrides create audit entries (who, when, why)
- Certificates are immutable (no issue, no revoke without explicit action + reason)
- Payment processing never touches internal systems (isolated payment service)
- Invoices are immutable (no edit, only new invoice if error)
- Subscription changes are explicit + logged
- Refunds require admin + reason + audit

#### 3.3.5 What is NOT Built Yet

- Analytics (BI layer, data warehouse)
- Integrations (hospital partnerships, insurance claims)
- Mobile app polish (offline support, push notifications)
- Advanced scheduling (AI shift optimization)
- Ratings / reviews
- Recommendations

**Outcome:** You have a revenue engine. Training pipeline feeds staffing. Staffing feeds services. Subscriptions create lock-in. You are now a real business OS.

---

### **PHASE 4: EXPANSION & OPTIMIZATION (Weeks 27–30 & Beyond)**

**Goal:** Optimize for scale, add advanced features, prepare for integrations.

**By end of this phase:** System is battle-tested, cost-optimized, ready for 10K+ concurrent users and multi-state operations.

#### 3.4.1 Modules Built

**A. Advanced Analytics & Reporting**

- Data warehouse (Snowflake / BigQuery)
- ETL pipeline (sync from MySQL to DW nightly)
- Reports:
  - Revenue per city, per service, per client
  - Staff performance (hours, satisfaction, retention)
  - Student success rate (completion, employment)
  - Utilization (capacity vs assigned)
  - Churn analysis (why clients leave, when)
- Admin dashboards (filterable, exportable to CSV)
- API: `GET /api/v1/admin/reports/{reportId}`

**B. Offline-First Mobile App Support**

- Sync engine (queue local actions, sync when online)
- Local SQLite DB (store assignments, forms)
- Service workers (background data sync)
- Offline-safe APIs (idempotent, timestamp-based conflict resolution)

**C. Integrations with External Systems**

**Hospital Partnerships:**
- API: receive patient referrals from hospital EHR
- Mapping: hospital patient ID → Carego patient
- Sync: vital signs bidirectional if approved by client

**Insurance Claims:**
- Invoice export to insurance format
- Claim status tracking
- Reimbursement webhooks

**IoT Device Integration:**
- Pulse oximeter, BP monitor → vitals auto-logged
- GPS device → geofencing validation
- Biometric attendance (fingerprint)

**Payment Gateways:**
- Support Razorpay, Stripe, Paytm
- International payments (if expanding outside India)

**D. Ratings & Reviews (Client-Facing)**

- Client can rate staff after assignment (1-5 stars, comments)
- Teacher can rate student (academic performance, engagement)
- Visible to staff/students in profile
- Not editable (append-only)
- Used for recommendations, matching

**E. Staffing Recommendations Engine**

- Simple ML (not heavy):
  - Recommend staff to client based on:
    - Specialization match
    - Availability
    - Location proximity
    - Previous ratings
  - Recommend courses to staff based on:
    - Demand signals
    - Their specialization
    - Market gaps

**F. Compliance & Regulatory**

- HIPAA / healthcare data privacy audit
- Export audit logs in legal format
- Data retention policies (automatic deletion per policy)
- GDPR right-to-be-forgotten (delete personal data on request)
- SOC 2 Type II certification process

**G. Performance Optimization**

- Database:
  - Read replicas for heavy queries
  - Caching layer (Redis) for frequently accessed data
  - Materialized views for complex aggregations
- APIs:
  - GraphQL layer (optional, for complex queries)
  - Response compression (gzip)
  - Query pagination (mandatory, no unbounded reads)
- Website:
  - Edge functions (Cloudflare Workers) for dynamic content
  - Image optimization (WebP, responsive sizes)
  - JavaScript code splitting

#### 3.4.2 APIs Exposed

- Reporting APIs (read-only)
- Integration webhooks (inbound, validated)
- Ratings API (POST / GET)
- Recommendations API (GET)

#### 3.4.3 Roles Involved

- Data engineer (warehouse, ETL)
- ML engineer (recommendations, churn prediction)
- DevOps engineer (performance, scale testing)
- Security engineer (compliance, penetration testing)
- Integration engineer (hospital, insurance, IoT partnerships)

#### 3.4.4 Security Considerations

- Third-party integrations use OAuth 2.0 or API keys (not passwords)
- Integrations have scoped access (can only read/write their domain)
- Webhooks are signed (HMAC-SHA256)
- Offline data is encrypted at rest (SQLite with encryption)
- BI queries never leak PII (aggregates only)
- Ratings cannot be faked (verified post-assignment only)

#### 3.4.5 What is NOT Built Yet

- **Market expansion to other verticals** (elder care only for now, expand to remote work later)
- **AI-driven scheduling** (complex, low ROI initially)
- **Telehealth layer** (video calls between patient + staff)
- **Insurance billing** (complex compliance, build after proving unit economics)
- **Public mobile marketplace** (staff can browse jobs) — risk of brain drain

**Outcome:** You have a world-class operations OS. Optimized for scale, audited, integrated, compliant.

---

## **4️⃣ SECURITY & GOVERNANCE MODEL**

### 4.1 RBAC Enforcement Strategy

**Rule 1: Role-Based Access Control**

Every request is checked against:
1. **Role** (USER_TYPE) — SUPER_ADMIN, ADMIN, CLIENT, STAFF, STUDENT, TEACHER
2. **Channel** (APP vs ADMIN) — enforced via JWT claim
3. **Ownership** — DB check (does user own this data?)
4. **Action** (READ, WRITE, OVERRIDE) — endpoint-specific

```
Authorization Middleware:
  1. Verify JWT + channel
  2. Load user role
  3. Check role → resource → action permission
  4. If ownership required, query DB
  5. If permission tree fails → 403 FORBIDDEN
  6. If admin action → log audit entry
  7. Proceed to handler
```

**Rule 2: No Role Drift**

User roles are immutable:
- `User.userType` set at creation, never changes
- If someone needs different role → create new user
- Reason: audit clarity, role mixing is a security hole

**Rule 3: Admin is Not God**

Admin has HIGH privilege, not ABSOLUTE:

**Admin CAN:**
- Create users
- Verify staff
- Assign staff to patients
- Override exam eligibility (with reason)
- Generate certificates
- Create invoices
- Terminate users (suspend account)
- View audit logs

**Admin CANNOT:**
- Edit vitals (staff logged them, they are immutable)
- Edit attendance (staff logged it)
- Edit grades (teacher assigned them)
- Silently delete records
- Bypass audit logging

### 4.2 JWT Lifecycle Usage

**Token Lifetime (Access):**
```
CLIENT / STUDENT / TEACHER: 15 minutes
STAFF: 10 minutes (higher churn risk, short window)
ADMIN: 5 minutes (highest privilege)
```

**Refresh Token (Long-Lived):**
```
Mobile app: 30 days (user experience)
Admin ERP: 12 hours (security conscious)
```

**Token Claims (What JWT Carries):**
```json
{
  "iss": "carego",
  "aud": "carego-app",
  "iat": 1737200000,
  "exp": 1737203600,
  "sub": "user-uuid",
  "uid": "user-uuid",
  "role": "CLIENT",
  "channel": "APP",
  "cityId": "city-uuid",
  "profileId": "client-profile-uuid",
  "scopes": ["READ_SELF", "READ_ASSIGNED", "WRITE_OWN"],
  "sessionId": "session-uuid"
}
```

**Token Validation (Every Request):**
1. Verify signature (HS256)
2. Check `exp` (not expired)
3. Check `sessionId` in DB (not revoked)
4. Extract `role`, `channel`, `uid`
5. Proceed to RBAC check

**Token Revocation (When):**
- User logs out → sessionId marked revoked
- User terminated → all sessions revoked
- User suspected hacked → all sessions revoked
- Admin force-logout → session revoked
- Refresh token expired → must re-login

### 4.3 Admin Override Controls

**All overrides are explicit, logged, and reasoned.**

**Example 1: Exam Eligibility Override**

```
Endpoint: POST /admin/exam-eligibility/override

Input:
{
  "studentId": "uuid",
  "batchId": "uuid",
  "reason": "Illness, made up assignments on recovery"
}

Middleware:
  - Check: role = ADMIN or SUPER_ADMIN
  - Check: channel = ADMIN
  - Validate: student exists, batch exists

Handler:
  - Create ExamEligibility record (eligible = true)
  - Log audit: adminId, action, studentId, reason, timestamp
  - Return: confirmation

Database:
  ExamEligibility {
    studentId,
    batchId,
    eligible: true,
    approvedBy: adminId,
    reason: "...",
    timestamp
  }

Immutable: Cannot edit reason later. Override is permanent.
```

**Example 2: Certificate Generation**

```
Endpoint: POST /admin/certificates/generate

Input:
{
  "studentId": "uuid",
  "batchId": "uuid",
  "note": "(optional) skipped assignment due to medical emergency"
}

Validations:
  - Student completed course (marks ≥ pass, attendance ≥ threshold)
  - OR: Admin override approved
  - Else: 403 FORBIDDEN

Handler:
  - Generate PDF (student name, course, batch, date, signature)
  - Store in file system
  - Create Certificate record
  - Log audit: adminId, studentId, note
  - Return: certificate URL

Certificate is immutable: No revoke, no re-issue without new record.
```

**Example 3: Staff Termination**

```
Endpoint: POST /admin/staff/{staffId}/terminate

Input:
{
  "reason": "Verified misconduct, patient complaint #1234"
}

Handler:
  - Set StaffProfile.status = TERMINATED
  - Update User.status = SUSPENDED
  - End all active assignments (status = COMPLETED)
  - Log audit: adminId, staffId, reason, timestamp
  - Email staff: termination letter (legal compliance)
  - Calculate final payoff, create invoice
  - Return: confirmation

No silent deletes. Everything is logged.
```

### 4.4 Audit Guarantees

**What is Logged:**
- Every ADMIN write (create, update, soft-delete)
- Every OVERRIDE action
- Every token refresh
- Every failed auth attempt (3+ failures = alert)
- Every file upload / delete
- Every subscription change
- Every refund / payment reversal

**What is NOT Logged (Not Required):**
- Successful READs (would bloat logs, use analytics if needed)
- Internal system events (scheduler jobs)

**Audit Entry Structure:**
```
AuditLog {
  id: uuid
  userId: admin-id
  role: "ADMIN"
  action: "create" | "update" | "override" | "delete"
  entityType: "User" | "StaffAssignment" | "ExamEligibility" | "Certificate" | ...
  entityId: uuid
  oldValues: { ... }          // if update/delete
  newValues: { ... }          // if create/update
  reason: "...",              // if override
  timestamp: now(),
  ipAddress: "...",           // source
  userAgent: "..."            // browser/app
}
```

**Immutability:**
- AuditLog is append-only. No updates, no deletes.
- TTL: 7 years (legal hold + regulatory)
- Encrypted at rest (AES-256)
- Queryable by admin (who did what when filter)

**Legal Value:**
- Admissible in court (if questioned)
- Demonstrates good governance
- Regulatory compliance (healthcare)

### 4.5 Failure Containment

**If Database is Hacked:**
- Passwords are bcrypt hashed → attacker cannot login
- Refresh tokens are hashed → cannot forge access tokens
- PII is encrypted in transit + at rest
- Audit logs cannot be edited → attack is logged
- Payment data stored separately (PCI compliance) → not in main DB

**If Refresh Token is Stolen:**
- Token has TTL (max 30 days exposure)
- Admin can revoke all sessions
- New access tokens can be issued without old token
- Old token detected as replay (sessionId mismatch) → force re-login

**If Admin Credentials Leak:**
- All admin actions are logged with IP, userAgent
- Suspicious activity (bulk overrides) is detected
- Admin can be force-logged-out globally
- Investigation can review audit logs
- Attacker activity is documented

**If Website is Compromised:**
- Hacker can only create junk leads
- Cannot read clients, staff, finances
- Cannot bypass RBAC (no auth token)
- Lead creation is rate-limited
- DDoS is blocked at CDN

**If Mobile App Token is Stolen:**
- Token can only be used by that role (STAFF, CLIENT, STUDENT)
- Ownership checks still apply (staff can only see own assignments)
- Token TTL is short (10-15 min) → limited exposure
- Client cannot see staff payment
- Staff cannot see all patients in system

---

## **5️⃣ WEBSITE ↔ CORE SYSTEM STRATEGY**

### 5.1 What the Website Can Read

**Tier 1: Static / Semi-Static (Aggressively Cached)**

Endpoint: `GET /api/v1/public/cities`
```json
[
  { "id": "city-uuid", "name": "Jaipur", "state": "Rajasthan" },
  { "id": "city-uuid", "name": "Delhi", "state": "Delhi" }
]
```
- Cache: 24 hours (cities don't change daily)
- Source: City table (no joins)

Endpoint: `GET /api/v1/public/services?cityId=city-uuid`
```json
[
  { "serviceName": "Elder Care", "priceRange": "₹1200–₹1800/day" },
  { "serviceName": "Post-Surgery Care", "priceRange": "₹2000–₹3000/day" }
]
```
- Cache: 24 hours
- Source: Precomputed service list (updated by admin)
- No joins to client / patient data

Endpoint: `GET /api/v1/public/courses`
```json
[
  {
    "courseId": "uuid",
    "name": "ICU Assistant",
    "duration": "6 months",
    "price": "₹18000",
    "nextBatch": "2026-02-01",
    "description": "Learn to assist ICU nurses",
    "outline": "Module 1, Module 2, ..."
  }
]
```
- Cache: 6 hours (batch dates change monthly)
- Source: Course + CourseOffering (no student data)

Endpoint: `GET /api/v1/public/training-centers?cityId=city-uuid`
```json
[
  {
    "centerId": "uuid",
    "name": "Care Academy, Jaipur",
    "address": "...",
    "courses": [ { courseId, nextBatch } ]
  }
]
```
- Cache: 6 hours
- Source: TrainingCenter + Batch (no enrollment data)

Endpoint: `GET /api/v1/public/trust-metrics?cityId=city-uuid`
```json
{
  "totalStudentsTrained": 1200,
  "totalCaregiversCertified": 450,
  "servicesDelivered": 15000,
  "avgClientSatisfaction": 4.7,
  "coursesOffered": 8
}
```
- Cache: 1 hour (refreshed via webhook from admin)
- Source: Precomputed counters table (updated nightly or on admin action)
- No individual names, no PII

### 5.2 What It Can NEVER Touch

**🔴 FORBIDDEN FOREVER:**
- Client profiles (personal, medical, financial)
- Patient data (health condition, vitals, care logs)
- Staff profiles (assignments, payment, personal info)
- Student data (grades, submissions, personal info)
- Finance data (invoices, payments, revenue)
- Audit logs (admin actions, overrides)
- Any authenticated endpoint
- Any data with JWT required

**Why:**
- Website is public, no authentication
- SEO crawlers can see it
- If public APIs leak private data → regulatory violation + loss of trust
- Hackers target public APIs first

### 5.3 How SEO, Caching, and Truth Metrics Are Handled

**SEO Strategy:**

**Server-Side Rendering (SSR) / Incremental Static Regeneration (ISR)**
```
Page: /jaipur/elder-care

Build time (Next.js):
  1. GET /api/v1/public/cities → fetch all cities
  2. GET /api/v1/public/services?cityId=jaipur → fetch services in Jaipur
  3. GET /api/v1/public/training-centers?cityId=jaipur → fetch centers
  4. Render HTML with meta tags
  5. Cache generated page for 10 minutes (ISR)
  6. Serve prerendered HTML (fast, SEO-safe)

When admin creates new batch:
  - Webhook: POST /webhooks/website/revalidate
  - Website: regenerate /jaipur/courses/icu-assistant page
  - Fresh data, SEO updated, no downtime
```

**Meta Tags for Ranking:**
```
<title>Elder Care Services in Jaipur | Carego</title>
<meta name="description" content="Verified caregivers for post-surgery, elderly care in Jaipur. ₹1200–₹1800/day.">
<meta name="keywords" content="elder care Jaipur, home nursing, post-surgery care, verified caregivers">
<meta property="og:image" content="...">
<meta property="og:title" content="Elder Care Services in Jaipur">
```

**Structured Data (Schema.org):**
```json
{
  "@context": "https.//schema.org",
  "@type": "LocalBusiness",
  "name": "Carego Elder Care, Jaipur",
  "address": "...",
  "telephone": "...",
  "url": "https://...",
  "areaServed": "Jaipur",
  "serviceType": "Elder Care, Home Nursing",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "450"
  }
}
```

**Truth Metrics (Real, Not Fake):**

Instead of vanity metrics, publish verifiable outcomes:
```
"300+ students trained and certified"
  → Count COMPLETED students with Certificate

"450+ caregivers verified"
  → Count StaffProfile with status = VERIFIED

"15,000 care assignments delivered"
  → Count StaffAssignment with status = COMPLETED

"4.7/5 client satisfaction"
  → Avg rating from ClientRating table (real, post-assignment)
```

These are **auditable**, **verifiable**, **not faked** — that's your moat.

### 5.4 How Leads Safely Enter the System

**Lead Flow:**
```
1. Visitor fills form on website
   → Name, Phone, City, Service Interest

2. Website validates (phone format, CAPTCHA)
   → Prevents bot spam

3. Website submits:
   POST /api/v1/public/leads
   {
     "type": "SERVICE",
     "name": "Rajesh Kumar",
     "phone": "98765432100",
     "city": "Jaipur",
     "source": "website",
     "notes": null
   }

4. Backend validates:
   - Phone is unique? (prevent duplicates)
   - City exists in system?
   - Rate limit check (10 leads/IP/hour)
   - CRM flags as duplicate if phone exists in Lead table

5. Lead created:
   Lead {
     id: "uuid",
     type: "SERVICE",
     status: "NEW",
     name: "Rajesh Kumar",
     phone: "98765432100",
     city: "Jaipur",
     source: "website",
     createdAt: now()
   }

6. Backend sends:
   - SMS to lead: "Thanks! We'll contact you soon."
   - Email to admin: "New service enquiry from Rajesh, Jaipur"

7. Admin reviews lead:
   GET /api/v1/admin/leads/{leadId}
   → Full details, can call/contact

8. Admin converts:
   POST /api/v1/admin/leads/{leadId}/convert
   {
     "role": "CLIENT",
     "cityId": "jaipur-uuid"
   }
   → New User + ClientProfile created
   → Lead status = CONVERTED
   → SMS to lead: "Welcome! App download link: ..."

9. Lead becomes active user
   → Can login with phone + temp password
   → Access client app
```

**Safety Guarantees:**
- Lead form doesn't auth (no JWT exposure)
- Lead creation is rate-limited (prevents spam)
- CAPTCHA on form (prevents bots)
- Lead data never exposes other leads
- Admin must manually convert (prevents auto-activation, reduces fraud)
- New user gets temp password (secure SMS delivery)

---

## **6️⃣ EXTENSIBILITY & FUTURE-PROOFING**

### 6.1 Additional Services / Features That May Be Added

**Without Refactoring:**

**A. Telehealth / Virtual Care**
- Add VideoSession model
- Link to StaffAssignment
- Video call instead of in-person
- Vitals can still be logged (staff observes, client inputs)
- Rate: slightly lower than in-person
- Design now: Add `assignmentType: "IN_PERSON" | "VIRTUAL"` to StaffAssignment

**B. Insurance Claim Processing**
- Add InsuranceClaim model
- Link to Invoice
- Track claim status (SUBMITTED, APPROVED, REJECTED, PAID)
- Auto-generate claim docs from invoice + care logs
- Design now: Add `insuranceProviderId` to ClientProfile, `claimStatus` to Invoice

**C. Remote / Virtual Training (Online LMS)**
- Add CourseDeliveryMode: "IN_PERSON" | "HYBRID" | "ONLINE"
- Add LiveSession model (Zoom URL, recording link)
- Same grading, same certificates
- Design now: Already modular, just add mode enum

**D. Staffing Marketplace (Staff Can Browse Jobs)**
- Add JobPosting model
- Staff can apply
- Auto-match recommendations
- Design now: Risk (staff brain drain), but technically possible
- Hold off: Build internal matching first

**E. Hospital Partnership API**
- Hospitals refer patients to Carego
- Bidirectional vital sync (with consent)
- Insurance pre-approval integration
- Design now: Add `externalReferralId`, `partnerHospitalId` to Patient

**F. IoT Device Integration**
- Pulse oximeter, BP monitor, glucose meter
- Auto-log vitals (no manual entry)
- Biometric attendance (fingerprint on device)
- Design now: Add `iotDeviceId`, `automaticVitals: boolean` to Patient/Assignment

**G. Predictive Analytics**
- Churn prediction (which clients likely to leave)
- Staff attrition prediction
- Course dropout prediction
- Design now: Schema is ready, just add ML layer on top of data warehouse

**H. Ratings & Recommendations**
- Client rates staff after assignment
- Staff rates client (reliability, communication)
- ML recommendation engine
- Design now: Add Rating model, link to assignment
- Already separated PHASE 4

**I. Subscription Tiers (Premium Features)**
- Basic: 1 caregiver, 5 hours/week
- Premium: 2 caregivers, 20 hours/week
- VIP: Dedicated caregiver, 24/7 on-call
- Design now: Already in plan, easy to add feature gates

### 6.2 Data Models or Hooks That Should Exist Now

**A. Audit Log (Already Included)**
- Every admin action is logged
- Critical for compliance, investigations

**B. Session Management (Already Included)**
- SessionId in JWT
- Revocable tokens
- Device tracking possible

**C. Soft Deletes (Consider Adding)**
- Instead of DELETE, add `deletedAt` field to user-facing tables
- Keeps history, supports recovery
- Recommended for: User, StaffAssignment, ClientSubscription
```
User {
  ...
  deletedAt: DateTime? @default(null)
}
```

**D. Change Log (Consider Adding)**
- Track changes to critical fields (phone, email, password)
- When changed, by whom, why
```
ChangeLog {
  userId: String
  fieldName: String
  oldValue: String
  newValue: String
  changedBy: String
  changedAt: DateTime
  reason: String?
}
```

**E. Webhooks (Already in Plan)**
- External systems subscribe to events
- E.g., "assignment completed" → invoice created
- Decouples domains
```
Webhook {
  id: String
  url: String
  event: String ("assignment.completed", "student.certified", ...)
  secret: String (HMAC signing)
  active: Boolean
}
```

**F. Feature Flags (Recommend Adding)**
- Gradual rollout of new features
- A/B testing
- Kill switches
```
FeatureFlag {
  name: String
  enabled: Boolean
  rolloutPercentage: Int (0-100)
  targetRoles: UserType[]
  targetCities: String[]
}
```

**G. Encryption for Sensitive Fields (Add Now)**
- Phone number (indexed for login, but encrypted at rest)
- Email
- Patient condition (medical)
- Care notes (medical)
```
Use Prisma middleware to auto-encrypt/decrypt on read/write
```

### 6.3 Clear Rules for Adding Future Modules Without Refactors

**Rule 1: New Model = New Domain**
- Don't add fields to existing models without reason
- Create new models for new domains
- Example: Don't add `insuranceId` to Invoice
  - Create `InsuranceClaim` model instead
  - Link Invoice → InsuranceClaim

**Rule 2: Ownership is Explicit**
- Every new model must answer: "Who owns this data?"
- Example:
  - Rating owned by rater (client or staff)
  - Claim owned by patient (client's patient)
  - Video session owned by assignment

**Rule 3: Immutability Rules Are Clear**
- Before adding a model, decide: Can it be edited? Deleted?
- Example:
  - Certificate: immutable (issued once)
  - Exam result: immutable (grade is final)
  - Care log: immutable (work history)
  - Rating: immutable (no edit after submission)

**Rule 4: RBAC is Defined Before Code**
- Before writing endpoints, list who can do what
- Matrix style:
  ```
  Insurance claim creation:
    - Admin: can create
    - Client: READ_OWN only
    - Staff: cannot access
    
  Hospital partner: can READ vital data only (scoped to their referrals)
  ```

**Rule 5: Audit Trail Exists or Doesn't (Binary)**
- If model has sensitive writes (admin or compliance-related) → log it
- If model is just user-generated content (rating) → log it too
- Never have unmarked writes

**Rule 6: API Versioning**
- New endpoint versions don't break old ones
- Example:
  - `/api/v1/admin/invoices` (old, basic)
  - `/api/v2/admin/invoices` (new, with insurance claims)
  - Both coexist for 6 months, then deprecated

---

## **7️⃣ FINAL ARCHITECTURAL GUARANTEES**

### What This System Guarantees Long-Term

**🔐 Security Guarantee**
- No single point of breach can leak all data
- Admin actions are always audited
- Website cannot access private data
- Staff work is immutable
- Client data is isolated by ownership
- **Result:** HIPAA-ready, audit-safe, legally defensible

**📈 Scalability Guarantee**
- Website traffic doesn't affect operations
- Read-heavy paths are cached
- Database queries are indexed
- Admin load doesn't degrade public service
- Multi-city rollout is built-in
- **Result:** Can grow from 1K to 100K users without architecture change

**💰 Revenue Guarantee**
- Subscription model locks in clients
- Training investment locks in staff
- Certification creates recurring demand
- Finance is auditable (regulatory compliance)
- **Result:** Predictable, defensible revenue

**🧠 Operational Guarantee**
- All work is logged (no ghost assignments)
- Vitals are immutable (no fake health records)
- Eligibility is explicit (no shortcuts)
- Admin has explicit controls (not "god mode")
- **Result:** Clients trust you, staff can't cheat, audits pass

**🌱 Extensibility Guarantee**
- New features don't require database refactors
- Clear ownership separates domains
- RBAC is modular (add roles, permissions without core change)
- APIs are versioned (old clients still work)
- Audit log is forever (supports future investigations)
- **Result:** Can add features for 10 years without rewriting

---

### What Problems This System Permanently Avoids

**❌ God Tables**
- You won't have one mega-table with mixed data
- Each domain has its tables
- Patient ≠ Staff ≠ Student

**❌ Leaky Abstractions**
- Website cannot call operations APIs
- Staff cannot see finance
- Students cannot see grades via vitals endpoint
- Domains are clearly separated

**❌ Unaudited Admin Power**
- Admins don't have a silent "god button"
- Every override is logged, reasoned, verifiable
- Investigations can trace every change
- Legal compliance is built-in

**❌ Unverified Staff**
- Gate before assignment
- No workarounds
- Staff without certificates cannot work

**❌ Editable History**
- Care logs, vitals, attendance cannot be edited
- Only appended to
- Prevents tampering, enables audit

**❌ Token as Database**
- JWT is identity context only
- Claims are hints, not truth
- Every action validates ownership in database
- Prevents token tampering exploits

**❌ Security Theater**
- No fake "admin approval" that isn't audited
- No encryption that leaks keys
- No "backup" that can be restored silently
- Security is real, not appearance

---

### Trade-Offs Consciously Made

**Trade-Off 1: Strict Ownership Checks**
- ✅ Security benefit: Isolated data, no cross-contamination
- ❌ Performance cost: Extra DB queries
- Decision: Worth it (security > performance for healthcare)

**Trade-Off 2: Append-Only Care Data**
- ✅ Audit benefit: Complete history, tamper-proof
- ❌ Storage cost: Data grows forever
- Decision: Worth it (storage is cheap, auditability is priceless)

**Trade-Off 3: Admin Overrides Are Logged**
- ✅ Compliance benefit: Explicit, reasoned, auditable
- ❌ UX cost: Extra fields (reason), slower API
- Decision: Worth it (compliance > convenience)

**Trade-Off 4: Website Can't Read Everything**
- ✅ Security benefit: Attack surface is tiny
- ❌ Content cost: Can't show "student success stories" with names
- Decision: Worth it (you can show anonymized metrics instead)

**Trade-Off 5: No Real-Time BI on Website**
- ✅ Separation benefit: Website is static, fast, SEO-safe
- ❌ Content cost: Trust metrics are slightly stale (1-hour cache)
- Decision: Worth it (1 hour is fine for business metrics)

**Trade-Off 6: Refresh Tokens Have TTL**
- ✅ Security benefit: Stolen token has limited lifespan
- ❌ UX cost: Users logged out after 30 days
- Decision: Worth it (can request re-login with 1-click)

**Trade-Off 7: Multi-Tenant is City-Based, Not True Isolation**
- ✅ Operational benefit: Simpler, faster to deploy
- ❌ Scaling risk: If one city falls, affects system
- Decision: Worth it for now (true multi-tenancy is over-engineering at this stage)
- Future: Can move to true tenant isolation if needed

---

## **8️⃣ EXECUTION ROADMAP (6 MONTHS AT A GLANCE)**

```
PHASE 0: Foundations (Weeks 1-4)
├─ Database + schema
├─ JWT auth service
├─ Authorization middleware
├─ Audit logging
├─ File storage
├─ Rate limiting
└─ Outcome: Secure, audited foundation

PHASE 1: Trust & Intake (Weeks 5-9)
├─ Public APIs (cities, services, courses)
├─ Website (SSR, SEO, pages)
├─ Lead creation
├─ Lead management (admin)
├─ Lead conversion → user creation
└─ Outcome: Marketing + lead pipeline

PHASE 2: Operations (Weeks 10-18)
├─ Staff management (create, verify, assign)
├─ Client management (create, patients)
├─ Assignments (create, track status)
├─ Staff app (check-in, care logs, vitals)
├─ Client app (view care logs, vitals)
└─ Outcome: Digital care operations

PHASE 3: Lock-In & Scale (Weeks 19-26)
├─ Training / LMS (batches, students, exams, certificates)
├─ Finance (invoices, payments, receipts)
├─ Subscriptions (plans, enrollment, cancellation)
├─ Multi-city support
├─ Analytics dashboard
└─ Outcome: Revenue engine + lock-in

PHASE 4: Expansion (Weeks 27-30+)
├─ Advanced analytics (data warehouse, BI)
├─ Offline-first support
├─ Integrations (hospitals, insurance, IoT)
├─ Compliance (HIPAA, SOC2)
├─ Optimization (performance, scale)
└─ Outcome: Enterprise-grade system
```
