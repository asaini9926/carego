🔐 JWT TOKEN STRUCTURE & CLAIMS — CAREGO
1️⃣ Core JWT Strategy (High-Level)

You will use two tokens:

Access Token

Short-lived

Sent with every protected request

Carries RBAC context

Refresh Token

Long-lived

Used only to get new access tokens

Stored securely

This is non-negotiable for a system like yours.

2️⃣ Channels & Token Usage (Very Important)
Channel	Uses JWT	Notes
Website (public)	❌	No auth, SEO-safe
Mobile App	✅	Client / Staff / Student / Teacher
Admin ERP	✅	Admin / Super Admin

Rule:

If a request has a JWT → it is NOT cacheable

3️⃣ Access Token — Structure
Token Type

JWT

Signed (HS256 or RS256)

Never encrypted (payload is readable)

Standard Claims (Required)
{
  "iss": "carego",
  "aud": "carego-app",
  "iat": 1737200000,
  "exp": 1737203600,
  "sub": "user-uuid"
}


Meaning

iss → issuer (your system)

aud → which app this token is for

iat → issued at

exp → expiry

sub → user ID (UUID)

Custom Claims (Carego-Specific)
{
  "uid": "user-uuid",
  "role": "CLIENT",
  "channel": "APP",
  "cityId": "city-uuid",
  "profileId": "role-profile-uuid",
  "scopes": ["READ_SELF", "READ_ASSIGNED", "WRITE_OWN"],
  "sessionId": "session-uuid"
}

4️⃣ Explanation of Each Custom Claim (CRITICAL)
🔹 uid

Canonical user identifier

Used everywhere (logs, audits)

🔹 role

One of:

SUPER_ADMIN
ADMIN
CLIENT
STAFF
STUDENT
TEACHER


RBAC starts from here, but does not end here.

🔹 channel
APP | ADMIN


Used to:

block admin tokens from app APIs

block app tokens from admin APIs

This prevents cross-surface abuse.

🔹 cityId

Primary operational city

Used for:

data scoping

defaults

performance

Admins may override city via query params (with audit).

🔹 profileId

Points to:

ClientProfile.userId

StaffProfile.userId

StudentProfile.userId

TeacherProfile.userId

This avoids repeated DB lookups.

🔹 scopes

High-level permission hints (NOT full RBAC).

Examples:

READ_SELF
READ_ASSIGNED
WRITE_OWN
SUBMIT
EVALUATE
OVERRIDE


These:

speed up middleware checks

reduce DB queries

do NOT replace ownership validation

🔹 sessionId

Unique per login

Used to:

revoke tokens

force logout

detect suspicious activity

5️⃣ Access Token Lifetime (STRICT)
Role	Access Token TTL
Client	15 min
Student	15 min
Staff	10 min
Teacher	15 min
Admin	5 min
Super Admin	5 min

Why?

Staff/Admin tokens are higher risk

Short TTL limits damage

6️⃣ Refresh Token — Structure & Rules
What it contains

Random opaque string (NOT JWT)

Stored hashed in DB

Linked to:

userId

sessionId

device info

TTL

Mobile App: 30 days

Admin ERP: 12 hours

Usage
POST /auth/refresh


Validates refresh token

Issues new access token

Rotates refresh token

7️⃣ Token Storage (VERY IMPORTANT)
Mobile App

Secure storage (Keychain / Keystore)

Never localStorage

Admin ERP (Web)

HTTP-only cookies

Secure + SameSite=Strict

❌ Never store JWT in:

localStorage

sessionStorage

8️⃣ Token Revocation Strategy (Real-World)

You MUST support:

staff termination

admin lockout

device loss

How

Maintain sessionId table

Mark session as revoked

Middleware checks:

token valid

session active

If revoked → force re-login.

9️⃣ JWT + RBAC — How Middleware Uses It

For every request:

1. Verify JWT signature
2. Check exp
3. Check channel matches API prefix
4. Extract role + scopes
5. Run RBAC rules
6. Run ownership checks (DB)
7. Allow or deny


JWT alone is never enough.

🔴 10️⃣ What JWT MUST NOT Contain

❌ Personal data (name, phone)
❌ Financial info
❌ Patient info
❌ Permissions lists copied from DB

JWT is identity context, not a database.

11️⃣ Website & JWT (Important Reminder)

Website never uses JWT

Website never sees tokens

Website never calls protected APIs

This keeps:

SEO clean

security strong

12️⃣ Example: Real Request Walkthrough
Staff logs vitals

Staff app sends:

Authorization: Bearer <JWT>


Middleware checks:

role = STAFF

channel = APP

scope = WRITE_OWN

Ownership check:

staffId matches assignment.staffId

Action allowed

Vitals appended

13️⃣ One Golden Rule (Remember This)

JWT tells you WHO is asking
RBAC tells you WHAT they can do
Ownership tells you WHERE they can do it

If you never mix these, your system stays secure.