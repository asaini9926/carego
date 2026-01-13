🔐 RBAC & PERMISSION MIDDLEWARE — CAREGO
1️ First: What RBAC Means in Your System

RBAC is not just:

“If user.role === ADMIN allow”

That fails in real systems.

In Carego, access depends on 4 dimensions:

Who the user is (role)

From where they are accessing (website / app / admin)

What data they are touching (ownership)

What action they are performing (read / write / override)

RBAC = Role + Context + Ownership + Action

2️ Core Roles (Locked)

From your schema:

SUPER_ADMIN

ADMIN

CLIENT

STAFF

STUDENT

TEACHER

These never change dynamically.

3️ Channels (Critical but Often Missed)

Every request belongs to one channel:

Channel	Who uses it	Risk level
WEBSITE	Anonymous users	LOW
APP	Logged-in users	MEDIUM
ADMIN	Internal users	HIGH

You should enforce this via:

subdomain

API prefix

token claim

Example:

/api/v1/public/* → WEBSITE

/api/v1/app/* → APP

/api/v1/admin/* → ADMIN

4️ Authentication Middleware (Layer 1)
Purpose

Verify token

Identify user

Attach identity to request

Logic

Read Authorization header

Verify JWT

Extract:

userId

userType

Attach to request context

📌 No permission check here
Only identity.

5️ Authorization Middleware (Layer 2)

This is where RBAC actually lives.

Core Question

“Is this user allowed to do THIS action on THIS resource?”

6️ Permission Model (Simple & Safe)

Instead of storing permissions in DB (overkill for now), define them in code/config.

Permission Format (Conceptual)
ROLE → RESOURCE → ACTION


Examples:

CLIENT → PATIENT → READ

STAFF → VITALS → WRITE

ADMIN → EXAM_ELIGIBILITY → OVERRIDE

7️ Ownership Checks (Most Important Part)

Roles alone are not enough.

Example 1: Client reading patient data

Allowed only if:

patient.clientId === loggedInClientId

Even if role is CLIENT, without ownership → deny.

Example 2: Staff logging vitals

Allowed only if:

staff is assigned to that patient

assignment is ACTIVE

current time is within shift window (optional later)

Example 3: Student accessing batch

Allowed only if:

student is enrolled in that batch

8️ Admin Is NOT God (Important)

Admins have high privilege, but not absolute privilege.

Admin CAN:

create users

override eligibility

generate certificates

Admin CANNOT:

edit vitals

edit attendance

silently delete records

Even admin actions must be:

explicit

logged

reasoned

9️ Middleware Flow (Mental Model)

For every protected request:

Request
 ↓
Auth Middleware
 ↓
RBAC Middleware
 ↓
Ownership Validator
 ↓
Action Executor
 ↓
Audit Logger (if admin)


If any step fails → 403 Forbidden

🔍 10️ RBAC BY ROLE (CLEAR MATRIX)
CLIENT

READ:

own profile

own patients

care logs

vitals

invoices

WRITE:

add patient

pay invoice

❌ No override, no delete

STAFF

READ:

own assignments

WRITE:

attendance (current shift)

care logs

vitals

❌ No finance, no edit history

STUDENT

READ:

batches

schedule

materials

results

WRITE:

assignment submissions

❌ No grades, no attendance edit

TEACHER

READ:

assigned batches

submissions

WRITE:

assignments

materials

evaluations

❌ No finance, no certificates

ADMIN

READ/WRITE:

everything operational

SPECIAL ACTIONS:

override

generate

assign

🔒 Must be audited

11️ Admin Override Logic (Very Important)

Override is not a normal action.

Override rules:

Must include:

approvedBy

reason

timestamp

Must be explicit endpoint

Must create audit record

Example:

/admin/exam-eligibility/override

No override through generic update APIs.

12️ Audit Logging Middleware (Layer 3)

Triggered when:

role = ADMIN

action = WRITE / OVERRIDE

Logged data:

userId

role

action

entityType

entityId

old value (if any)

new value

reason (if provided)

This is your legal shield.

13️ Common RBAC Mistakes (DO NOT DO)

❌ “If admin allow everything”
❌ One middleware for all roles
❌ Letting website hit admin APIs
❌ Letting app call public APIs for write
❌ No ownership validation

You’re already avoiding these — good.

14️ How This Protects Your WEBSITE

Even if:

someone fakes frontend

calls APIs manually

steals token

They still cannot:

read others’ data

write outside role

override without audit

15️ Final Mental Rule (Remember This)

Authentication proves who you are
RBAC proves what you can do
Ownership proves what is yours
Audit proves you did it