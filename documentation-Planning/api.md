0️⃣ GLOBAL API PRINCIPLES (NON-NEGOTIABLE)
Base Rules

REST-style APIs

JSON only

UUID everywhere

All write APIs are authenticated (except leads)

Versioning
/api/v1/...

Authentication

JWT Access Token

Refresh Token (for App + Admin)

Website mostly unauthenticated

Headers
Authorization: Bearer <token>
Content-Type: application/json

1️⃣ AUTH & IDENTITY APIs (ALL CHANNELS)
1.1 Login
POST /api/v1/auth/login


Body

{
  "phone": "9999999999",
  "password": "******"
}


Response

{
  "accessToken": "...",
  "refreshToken": "...",
  "userType": "CLIENT"
}


Auth: ❌
Used by: App, Admin

1.2 Refresh Token
POST /api/v1/auth/refresh


Auth: ❌
Used by: App, Admin

2️⃣ WEBSITE APIs (PUBLIC / LOW PRIVILEGE)
2.1 Get Cities
GET /api/v1/public/cities


Response

[
  { "id": "uuid", "name": "Jaipur", "state": "Rajasthan" }
]


Auth: ❌
Used by: Website

2.2 Get Services (per city)
GET /api/v1/public/services?cityId=uuid


Response

[
  {
    "serviceName": "Elder Care",
    "priceRange": "₹1200–₹1800/day"
  }
]


Auth: ❌

2.3 Get Courses
GET /api/v1/public/courses


Response

[
  {
    "courseId": "uuid",
    "name": "ICU Assistant",
    "duration": "6 months",
    "nextBatch": "2026-02-01"
  }
]


Auth: ❌

2.4 Create Lead (VERY IMPORTANT)
POST /api/v1/public/leads


Body

{
  "type": "TRAINING",
  "name": "Rahul",
  "phone": "9xxxx",
  "city": "Jaipur",
  "source": "website"
}


Auth: ❌
Writes to: Lead

🔒 Website can ONLY do this write.

3️⃣ CLIENT APIs (APP – CLIENT ROLE)
3.1 Get Client Profile
GET /api/v1/client/profile


Auth: ✅ CLIENT

3.2 Get Patients
GET /api/v1/client/patients

3.3 Add Patient
POST /api/v1/client/patients


Body

{
  "name": "Mother",
  "age": 65,
  "condition": "Post surgery"
}

3.4 View Care Logs
GET /api/v1/client/patients/{patientId}/care-logs


Read-only

3.5 View Vitals
GET /api/v1/client/patients/{patientId}/vitals

3.6 View Invoices
GET /api/v1/client/invoices

3.7 Pay Invoice
POST /api/v1/client/invoices/{invoiceId}/pay

4️⃣ STAFF APIs (APP – STAFF ROLE)
4.1 Get Today’s Assignment
GET /api/v1/staff/assignments/today

4.2 Check-In
POST /api/v1/staff/attendance/check-in


Body

{
  "assignmentId": "uuid",
  "latitude": 26.9,
  "longitude": 75.8
}

4.3 Check-Out
POST /api/v1/staff/attendance/check-out

4.4 Add Care Log
POST /api/v1/staff/care-logs

4.5 Add Vitals
POST /api/v1/staff/vitals

5️⃣ STUDENT APIs (APP – STUDENT ROLE)
5.1 Get My Batches
GET /api/v1/student/batches

5.2 Get Schedule
GET /api/v1/student/batches/{batchId}/schedule

5.3 Get Study Material
GET /api/v1/student/batches/{batchId}/materials

5.4 Submit Assignment
POST /api/v1/student/assignments/{assignmentId}/submit

5.5 View Results
GET /api/v1/student/results

5.6 Download Certificate
GET /api/v1/student/certificates/{certificateId}

6️⃣ TEACHER APIs (APP – TEACHER ROLE)
6.1 Get Assigned Classes
GET /api/v1/teacher/classes

6.2 Create Assignment
POST /api/v1/teacher/batches/{batchId}/assignments

6.3 Upload Study Material
POST /api/v1/teacher/batches/{batchId}/materials

6.4 Evaluate Submission
POST /api/v1/teacher/assignments/{submissionId}/evaluate

7️⃣ ADMIN / ERP APIs (HIGH PRIVILEGE)
7.1 Leads Management
GET /api/v1/admin/leads
POST /api/v1/admin/leads/{leadId}/convert

7.2 User Creation
POST /api/v1/admin/users

7.3 Assign Staff to Patient
POST /api/v1/admin/staff-assignments

7.4 Override Exam Eligibility
POST /api/v1/admin/exam-eligibility/override

7.5 Generate Certificate
POST /api/v1/admin/certificates/generate

7.6 Create Invoice (Client / Student)
POST /api/v1/admin/invoices

7.7 Create Batch / Course Offering
POST /api/v1/admin/courses
POST /api/v1/admin/batches

8️⃣ AUTHORIZATION MATRIX (VERY IMPORTANT)
API Group	Website	Client	Staff	Student	Teacher	Admin
Public APIs	✅	❌	❌	❌	❌	❌
Leads	✅	❌	❌	❌	❌	✅
Care Logs	❌	READ	WRITE	❌	❌	READ
Vitals	❌	READ	WRITE	❌	❌	READ
Exams	❌	❌	❌	READ	WRITE	OVERRIDE
Finance	❌	READ/PAY	❌	READ	❌	FULL
Certificates	❌	❌	❌	READ	❌	GENERATE