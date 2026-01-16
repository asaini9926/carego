-- ============================================================
-- CAREGO PLATFORM - UNIFIED MASTER SEED DATA
-- ============================================================
-- Populates the Unified Master Schema
-- Includes: Cities, Users, Profiles, Services, LMS, Finance
-- Passwords hashed with bcrypt (cost 10): Test@1234
-- ============================================================

USE carego_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ========================
-- CLEANUP
-- ========================
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE payment_methods;
TRUNCATE TABLE payments;
TRUNCATE TABLE invoice_items;
TRUNCATE TABLE invoices;
TRUNCATE TABLE assignment_submissions;
TRUNCATE TABLE student_batches;
TRUNCATE TABLE batches;
TRUNCATE TABLE courses;
TRUNCATE TABLE care_logs;
TRUNCATE TABLE attendance_logs;
TRUNCATE TABLE staff_assignments;
TRUNCATE TABLE patients;
TRUNCATE TABLE staff_profiles;
TRUNCATE TABLE client_profiles;
TRUNCATE TABLE student_profiles;
TRUNCATE TABLE teacher_profiles;
TRUNCATE TABLE leads;
TRUNCATE TABLE service_sections;
TRUNCATE TABLE services;
TRUNCATE TABLE cities;
TRUNCATE TABLE sessions;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. CITIES
-- ============================================================
INSERT INTO cities (id, name, state, latitude, longitude, is_active) VALUES
('city-jaipur-001', 'Jaipur', 'Rajasthan', 26.9124, 75.7873, TRUE),
('city-delhi-001', 'Delhi', 'Delhi', 28.7041, 77.1025, TRUE),
('city-mumbai-001', 'Mumbai', 'Maharashtra', 19.0760, 72.8777, TRUE),
('city-bangalore-001', 'Bangalore', 'Karnataka', 12.9716, 77.5946, TRUE);

-- ============================================================
-- 2. USERS (Password: Test@1234)
-- ============================================================

-- SUPER ADMIN
INSERT INTO users (id, phone, email, password_hash, user_type, account_status, is_active) VALUES
('user-admin-001', '9999000001', 'admin@carego.in', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'SUPER_ADMIN', 'ACTIVE', TRUE);

-- CLIENTS
INSERT INTO users (id, phone, email, password_hash, user_type, account_status, is_active) VALUES
('user-client-001', '8800100001', 'client1@example.com', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'CLIENT', 'ACTIVE', TRUE),
('user-client-002', '8800100002', 'client2@example.com', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'CLIENT', 'ACTIVE', TRUE),
('user-client-003', '8800100003', 'client3@example.com', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'CLIENT', 'ACTIVE', TRUE);

-- STAFF
INSERT INTO users (id, phone, email, password_hash, user_type, account_status, is_active) VALUES
('user-staff-001', '9100100001', 'staff1@example.com', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'STAFF', 'ACTIVE', TRUE),
('user-staff-002', '9100100002', 'staff2@example.com', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'STAFF', 'ACTIVE', TRUE),
('user-staff-003', '9100100003', 'staff3@example.com', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'STAFF', 'ACTIVE', TRUE),
('user-staff-004', '9100100004', 'staff4@example.com', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'STAFF', 'ACTIVE', TRUE);

-- STUDENTS
INSERT INTO users (id, phone, email, password_hash, user_type, account_status, is_active) VALUES
('user-student-001', '9200100001', 'student1@example.com', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'STUDENT', 'ACTIVE', TRUE),
('user-student-002', '9200100002', 'student2@example.com', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'STUDENT', 'ACTIVE', TRUE);

-- TEACHERS
INSERT INTO users (id, phone, email, password_hash, user_type, account_status, is_active) VALUES
('user-teacher-001', '9300100001', 'teacher1@example.com', '$2b$10$JKmRFGq8Y1Hl.rTlBKT0PeYVd8b6GNGxFtxZDvUDNqJ1d0qQFk8PW', 'TEACHER', 'ACTIVE', TRUE);

-- ============================================================
-- 3. PROFILES
-- ============================================================

INSERT INTO client_profiles (user_id, organization_name, address_text, city_name, state_name, pincode, latitude, longitude, operational_city_id, contact_person_name, contact_person_phone, verification_status) VALUES
('user-client-001', 'Health Plus Care Home', 'Sector 5, Jaipur', 'Jaipur', 'Rajasthan', '302004', 26.9200, 75.7800, 'city-jaipur-001', 'Rajesh Kumar', '9999100001', 'VERIFIED'),
('user-client-002', 'Delhi Medical Services', 'New Delhi', 'Delhi', 'Delhi', '110001', 28.7050, 77.1020, 'city-delhi-001', 'Priya Singh', '9999100002', 'VERIFIED'),
('user-client-003', 'Mumbai Care Center', 'Mumbai', 'Mumbai', 'Maharashtra', '400001', 19.0800, 72.8800, 'city-mumbai-001', 'Arjun Patel', '9999100003', 'PENDING');

INSERT INTO staff_profiles (user_id, full_name, date_of_birth, address_text, city_name, state_name, pincode, latitude, longitude, operational_city_id, specialization, verification_status, pay_type, daily_rate, monthly_rate, is_available) VALUES
('user-staff-001', 'Ajay Kumar', '1985-05-15', 'Jaipur', 'Jaipur', 'Rajasthan', '302004', 26.9200, 75.7800, 'city-jaipur-001', 'Elder Care', 'VERIFIED', 'DAILY', 800, 20000, TRUE),
('user-staff-002', 'Priya Sharma', '1990-03-20', 'Delhi', 'Delhi', 'Delhi', '110001', 28.7050, 77.1020, 'city-delhi-001', 'Post-Surgery Care', 'VERIFIED', 'DAILY', 1200, 30000, TRUE),
('user-staff-003', 'Rahul Singh', '1988-07-10', 'Mumbai', 'Mumbai', 'Maharashtra', '400001', 19.0800, 72.8800, 'city-mumbai-001', 'Child Care', 'PENDING', 'DAILY', 600, 15000, TRUE),
('user-staff-004', 'Neha Patel', '1992-12-05', 'Bangalore', 'Bangalore', 'Karnataka', '560001', 12.9750, 77.6000, 'city-bangalore-001', 'General Care', 'VERIFIED', 'MONTHLY', NULL, 25000, TRUE);

INSERT INTO student_profiles (user_id, full_name, educational_background, city_name, enrollment_date) VALUES
('user-student-001', 'Vikram Student', 'B.Sc Nursing', 'Jaipur', '2025-12-01'),
('user-student-002', 'Anita Student', 'High School', 'Delhi', '2025-12-15');

INSERT INTO teacher_profiles (user_id, full_name, qualification, specialization, experience_years) VALUES
('user-teacher-001', 'Dr. S. Mehta', 'MBBS, MD', 'Geriatric Care', 15);

-- ============================================================
-- 4. SERVICES
-- ============================================================

INSERT INTO services (id, city_id, title, slug, short_description, long_description, price_range_min, price_range_max, is_active) VALUES
('svc-001', 'city-jaipur-001', 'Elder Care', 'elder-care', 'Compassionate care for seniors', 'Professional care for elderly individuals with health monitoring', 1200, 1800, TRUE),
('svc-002', 'city-jaipur-001', 'Post-Surgery Care', 'post-surgery-care', 'Professional post-operative nursing', 'Expert care after surgery with daily monitoring', 2000, 3000, TRUE),
('svc-003', 'city-delhi-001', 'Child Care', 'child-care', 'Safe childcare services', 'Nurturing care for children aged 2-6 years', 500, 800, TRUE),
('svc-004', 'city-mumbai-001', 'Physiotherapy', 'physiotherapy', 'Physical rehabilitation services', 'Professional physiotherapy for recovery and fitness', 800, 1500, TRUE),
('svc-005', 'city-bangalore-001', 'Mental Health Support', 'mental-health', 'Counseling and mental wellness', 'Professional mental health counseling and support', 1500, 2500, TRUE);

-- ============================================================
-- 5. LEADS
-- ============================================================
INSERT INTO leads (id, lead_type, lead_status, name, phone, email, address_text, city_name, state_name, pincode, city_id, source) VALUES
('lead-001', 'SERVICE', 'NEW', 'Amit Kumar', '9999300001', 'amit@example.com', 'Jaipur', 'Jaipur', 'Rajasthan', '302004', 'city-jaipur-001', 'website'),
('lead-002', 'TRAINING', 'QUALIFIED', 'Neha Singh', '9999300002', 'neha@example.com', 'Delhi', 'Delhi', 'Delhi', '110001', 'city-delhi-001', 'website');

-- ============================================================
-- 6. PATIENTS & CARE OPERATIONS
-- ============================================================

INSERT INTO patients (id, client_user_id, full_name, age, gender, medical_condition, allergies, emergency_contact_name, emergency_contact_phone) VALUES
('patient-001', 'user-client-001', 'Ramesh Gupta', 75, 'MALE', 'Hypertension, Diabetes', 'Penicillin', 'Ravi Gupta', '9999200001'),
('patient-002', 'user-client-001', 'Savitri Gupta', 72, 'FEMALE', 'Arthritis', 'None', 'Ravi Gupta', '9999200001'),
('patient-003', 'user-client-002', 'Vikram Singh', 60, 'MALE', 'Post-Surgery Recovery', 'Sulfa', 'Kamal Singh', '9999200002'),
('patient-004', 'user-client-003', 'Anjali Patel', 5, 'FEMALE', 'Healthy', 'None', 'Mehul Patel', '9999200003');

INSERT INTO staff_assignments (id, staff_user_id, patient_id, start_date, end_date, shift_type, assignment_status) VALUES
('assign-001', 'user-staff-001', 'patient-001', DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'FULL_DAY', 'ACTIVE'),
('assign-002', 'user-staff-002', 'patient-003', DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'MORNING', 'ACTIVE'),
('assign-003', 'user-staff-003', 'patient-004', DATE_SUB(CURDATE(), INTERVAL 60 DAY), CURDATE(), 'FULL_DAY', 'COMPLETED'),
('assign-004', 'user-staff-004', 'patient-002', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'EVENING', 'ACTIVE');

INSERT INTO attendance_logs (id, staff_user_id, assignment_id, check_in_time, check_out_time, status, log_date) VALUES
('attend-001', 'user-staff-001', 'assign-001', CONCAT(CURDATE(), ' 08:00:00'), CONCAT(CURDATE(), ' 17:00:00'), 'PRESENT', CURDATE()),
('attend-002', 'user-staff-002', 'assign-002', CONCAT(CURDATE(), ' 06:00:00'), CONCAT(CURDATE(), ' 14:00:00'), 'PRESENT', CURDATE()),
('attend-003', 'user-staff-003', 'assign-003', CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 08:00:00'), NULL, 'ABSENT', DATE_SUB(CURDATE(), INTERVAL 1 DAY));

INSERT INTO care_logs (id, staff_user_id, patient_id, assignment_id, care_notes, services_provided, patient_condition) VALUES
('log-001', 'user-staff-001', 'patient-001', 'assign-001', 'Morning checkup completed. Patient BP: 120/80', 'Vital checks, Medication administration', 'Stable'),
('log-002', 'user-staff-002', 'patient-003', 'assign-002', 'Post-surgery wound dressing done. No complications.', 'Wound care, Physiotherapy', 'Recovering well'),
('log-003', 'user-staff-004', 'patient-002', 'assign-004', 'Evening care: Meals, medication, exercise', 'General care, Daily living assistance', 'Good');

-- ============================================================
-- 7. LMS (Training)
-- ============================================================

INSERT INTO courses (id, title, slug, description, duration_weeks, total_hours, price, is_active) VALUES
('course-001', 'Basic Healthcare', 'basic-healthcare', 'Introduction to healthcare fundamentals', 8, 120, 5000, TRUE),
('course-002', 'Advanced Nursing', 'advanced-nursing', 'Advanced nursing techniques', 12, 180, 8000, TRUE),
('course-003', 'Elderly Care Specialist', 'elderly-care-specialist', 'Specialized training for elderly', 10, 150, 6500, TRUE);

INSERT INTO batches (id, course_id, batch_name, start_date, end_date, max_students, current_enrollment, status) VALUES
('batch-001', 'course-001', 'Batch A - Jan 2026', '2026-01-15', '2026-03-15', 30, 25, 'ACTIVE'),
('batch-002', 'course-001', 'Batch B - Feb 2026', '2026-02-01', '2026-04-01', 30, 18, 'UPCOMING'),
('batch-003', 'course-002', 'Advanced Batch 1', '2026-01-10', '2026-04-10', 20, 15, 'ACTIVE');

INSERT INTO student_batches (id, student_user_id, batch_id, enrollment_date, status, attendance_percentage) VALUES
('stbatch-001', 'user-student-001', 'batch-001', NOW(), 'ACTIVE', 95.5),
('stbatch-002', 'user-student-002', 'batch-001', NOW(), 'ACTIVE', 88.0);

INSERT INTO assignment_submissions (id, batch_id, submitted_by, submission_text, score, status, feedback) VALUES
('submit-001', NULL, 'user-student-001', 'Assignment 1 completed with detailed analysis', 95, 'GRADED', 'Excellent work'),
('submit-002', NULL, 'user-student-002', 'Assignment 1 - Basic concepts covered', 78, 'GRADED', 'Good effort');

-- ============================================================
-- 8. FINANCE & SUBSCRIPTIONS
-- ============================================================

INSERT INTO invoices (id, owner_type, owner_id, invoice_number, amount, tax_amount, total_amount, invoice_status, invoice_date, due_date, description) VALUES
('inv-001', 'CLIENT', 'user-client-001', 'INV-2026-0001', 24000, 4320, 28320, 'UNPAID', '2026-01-01', '2026-02-01', 'Care services for January'),
('inv-002', 'CLIENT', 'user-client-001', 'INV-2026-0002', 24000, 4320, 28320, 'PAID', '2025-12-01', '2026-01-01', 'Care services for December'),
('inv-003', 'CLIENT', 'user-client-002', 'INV-2026-0003', 36000, 6480, 42480, 'UNPAID', '2026-01-05', '2026-02-05', 'Post-surgery care package');

INSERT INTO invoice_items (id, invoice_id, service_code, description, quantity, unit_price, total_price, service_date) VALUES
('item-001', 'inv-001', 'FULL_DAY_CARE', 'Full day care service', 30, 800, 24000, '2026-01-31'),
('item-002', 'inv-003', 'POST_SURGERY', 'Post-surgery care package', 20, 1800, 36000, '2026-01-31');

INSERT INTO subscription_plans (id, name, description, price, billing_cycle, features, is_active) VALUES
('plan-001', 'Starter', 'For small care operations', 999, 'MONTHLY', '["3 staff profiles", "Basic analytics"]', TRUE),
('plan-002', 'Professional', 'For growing care centers', 4999, 'MONTHLY', '["25 staff profiles", "Advanced analytics"]', TRUE);

INSERT INTO client_subscriptions (id, client_user_id, plan_id, start_date, end_date, status, auto_renew) VALUES
('sub-001', 'user-client-001', 'plan-002', '2025-12-01', '2026-12-01', 'ACTIVE', TRUE),
('sub-002', 'user-client-002', 'plan-001', '2026-01-01', '2027-01-01', 'ACTIVE', TRUE);

-- ============================================================
-- 9. AUDIT LOGS
-- ============================================================

INSERT INTO audit_logs (user_id, user_role, action, entity_type, entity_id, new_values, change_reason, ip_address) VALUES
('user-admin-001', 'SUPER_ADMIN', 'LOGIN', 'USER', 'user-admin-001', JSON_OBJECT('timestamp', NOW()), 'Admin login', '192.168.1.1'),
('user-client-001', 'CLIENT', 'CREATE', 'PATIENT', 'patient-001', JSON_OBJECT('name', 'Ramesh Gupta'), 'Patient registration', '192.168.1.100');

SELECT 'Seed Data Inserted Successfully' AS Status;

COMMIT;