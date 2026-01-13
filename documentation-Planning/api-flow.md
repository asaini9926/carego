API FLOW DIAGRAMS — CAREGO (PER ROLE)

Think of each flow as:

UI → API → DB → API → UI


I’ll show what triggers, which APIs, what data moves, and why.

🟦 ROLE 1: WEBSITE (PUBLIC USER)
🎯 Goal

Capture intent safely. No damage possible.

FLOW: Service / Training Enquiry
Visitor
  ↓
Website Form
  ↓
POST /api/v1/public/leads
  ↓
Lead Table (type = SERVICE / TRAINING)
  ↓
200 OK (Thank You Screen)


Key Rules

❌ No auth

❌ No user creation

❌ No payment

✅ Only lead creation

Why this is safe
Even if abused → only junk leads.

FLOW: Website Content Rendering (SEO)
Website Page Load
  ↓
GET /api/v1/public/cities
GET /api/v1/public/services
GET /api/v1/public/courses
  ↓
Read-only DB
  ↓
Rendered SEO Page

🟩 ROLE 2: CLIENT (MOBILE APP)
🎯 Goal

Peace of mind + transparency.

FLOW: Client Login & Dashboard
Client App
  ↓
POST /auth/login
  ↓
JWT (CLIENT)
  ↓
GET /client/profile
GET /client/patients
  ↓
Dashboard Render

FLOW: Daily Care Visibility
Client App (Patient Selected)
  ↓
GET /client/patients/{id}/care-logs
GET /client/patients/{id}/vitals
  ↓
Read-only Logs
  ↓
Timeline View


Important

Client cannot edit

Client cannot delete

Client cannot see staff internals

FLOW: Client Payment
Client App
  ↓
GET /client/invoices
  ↓
Select Invoice
  ↓
POST /client/invoices/{id}/pay
  ↓
Payment Gateway
  ↓
Payment + Invoice Updated
  ↓
Receipt Shown

🟨 ROLE 3: STAFF (MOBILE APP)
🎯 Goal

Truth from ground, zero manipulation.

FLOW: Staff Starts Shift
Staff App
  ↓
GET /staff/assignments/today
  ↓
Select Assignment
  ↓
POST /staff/attendance/check-in
  ↓
AttendanceLog Created


RBAC Checks

Assignment belongs to staff

Assignment ACTIVE

GPS validated

FLOW: During Shift (Care + Vitals)
Staff App
  ↓
POST /staff/care-logs
POST /staff/vitals
  ↓
Append-only Records


Important

❌ No update allowed

❌ No delete allowed

FLOW: Shift Ends
Staff App
  ↓
POST /staff/attendance/check-out
  ↓
Attendance Closed

🟪 ROLE 4: STUDENT (MOBILE APP)
🎯 Goal

Academic transparency, not teaching.

FLOW: Student Dashboard
Student App
  ↓
POST /auth/login
  ↓
JWT (STUDENT)
  ↓
GET /student/batches
  ↓
Batch List

FLOW: Academic Schedule & Material
Student App
  ↓
GET /student/batches/{batchId}/schedule
GET /student/batches/{batchId}/materials
  ↓
Read-only Academic Data

FLOW: Assignment Submission
Student App
  ↓
Upload File
  ↓
POST /student/assignments/{id}/submit
  ↓
AssignmentSubmission Created

FLOW: Results & Certificate
Student App
  ↓
GET /student/results
GET /student/certificates
  ↓
Download PDF

🟫 ROLE 5: TEACHER (MOBILE APP / WEB)
🎯 Goal

Academic execution only.

FLOW: Teacher Classes
Teacher App
  ↓
GET /teacher/classes
  ↓
Assigned Sessions

FLOW: Create Assignment
Teacher App
  ↓
POST /teacher/batches/{batchId}/assignments
  ↓
Assignment Created

FLOW: Evaluate Submissions
Teacher App
  ↓
GET /teacher/assignments/{id}/submissions
  ↓
POST /teacher/submissions/{id}/evaluate
  ↓
Marks Stored

🟥 ROLE 6: ADMIN (ERP)
🎯 Goal

Control, not execution.

FLOW: Lead → Client / Student Conversion
Admin ERP
  ↓
GET /admin/leads
  ↓
Select Lead
  ↓
POST /admin/leads/{id}/convert
  ↓
User + Profile Created

FLOW: Staff Assignment
Admin ERP
  ↓
POST /admin/staff-assignments
  ↓
StaffAssignment Created

FLOW: Exam Eligibility Override
Admin ERP
  ↓
POST /admin/exam-eligibility/override
  ↓
Override Stored + Audit Log

FLOW: Certificate Generation
Admin ERP
  ↓
POST /admin/certificates/generate
  ↓
PDF Generated + Stored

FLOW: Finance Control
Admin ERP
  ↓
POST /admin/invoices
  ↓
Invoice Created

🔐 WHERE RBAC & OWNERSHIP APPLY (SUMMARY)
Flow	Role Check	Ownership Check
Client view care	CLIENT	patient.clientId
Staff log vitals	STAFF	assignment.staffId
Student submit	STUDENT	student.batch
Teacher evaluate	TEACHER	assigned batch
Admin override	ADMIN	audit required
🧠 ONE-LINE MEMORY RULE

Website creates intent
App creates truth
Admin controls exceptions

If this stays intact, your system stays clean.