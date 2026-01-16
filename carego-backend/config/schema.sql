-- ============================================================
-- CAREGO PLATFORM - UNIFIED MASTER SCHEMA
-- ============================================================
-- Merges Production Implementation & Phase 4 Advanced Features
-- Supports: Core Ops, LMS, Finance, IoT, Analytics, Sync
-- Database: MySQL 8.0+
-- ============================================================

DROP DATABASE IF EXISTS carego_db;
CREATE DATABASE carego_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE carego_db;

-- ============================================================
-- 1. CORE: LOCATIONS & SETTINGS
-- ============================================================

CREATE TABLE cities (
  id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL UNIQUE,
  state VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_state (state),
  KEY idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE files (
  id CHAR(36) NOT NULL,
  uploaded_by_user_id CHAR(36),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_url VARCHAR(500),
  file_type VARCHAR(50),
  file_size BIGINT,
  mime_type VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id CHAR(36),
  is_virus_scanned BOOLEAN DEFAULT FALSE,
  virus_scan_result VARCHAR(10),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_uploader (uploaded_by_user_id),
  KEY idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. CORE: USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE users (
  id CHAR(36) NOT NULL,
  phone VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  user_type ENUM('SUPER_ADMIN', 'ADMIN', 'CLIENT', 'STAFF', 'STUDENT', 'TEACHER', 'SYSTEM') NOT NULL DEFAULT 'CLIENT',
  account_status ENUM('ACTIVE', 'SUSPENDED', 'TERMINATED') DEFAULT 'ACTIVE',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_phone (phone),
  KEY idx_user_type (user_type),
  KEY idx_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  expires_at TIMESTAMP NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  KEY idx_expires (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. PROFILES (EXTENDED)
-- ============================================================

CREATE TABLE client_profiles (
  user_id CHAR(36) NOT NULL,
  organization_name VARCHAR(255),
  address_text TEXT,
  city_name VARCHAR(100),
  state_name VARCHAR(100),
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  operational_city_id CHAR(36),
  contact_person_name VARCHAR(100),
  contact_person_phone VARCHAR(15),
  verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_operational_city (operational_city_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (operational_city_id) REFERENCES cities(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE staff_profiles (
  user_id CHAR(36) NOT NULL,
  full_name VARCHAR(100),
  date_of_birth DATE,
  address_text TEXT,
  city_name VARCHAR(100),
  state_name VARCHAR(100),
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  operational_city_id CHAR(36),
  specialization VARCHAR(100),
  verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
  pay_type ENUM('DAILY', 'MONTHLY') DEFAULT 'DAILY',
  daily_rate DECIMAL(10, 2),
  monthly_rate DECIMAL(10, 2),
  is_available BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_operational_city (operational_city_id),
  KEY idx_verification (verification_status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (operational_city_id) REFERENCES cities(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE staff_documents (
  id CHAR(36) NOT NULL,
  staff_user_id CHAR(36) NOT NULL,
  document_type ENUM('CERTIFICATE', 'ID', 'POLICE_CHECK', 'QUALIFICATION') NOT NULL,
  file_path VARCHAR(500),
  file_url VARCHAR(500),
  document_number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff (staff_user_id),
  FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_profiles (
  user_id CHAR(36) NOT NULL,
  full_name VARCHAR(100),
  date_of_birth DATE,
  address_text TEXT,
  city_name VARCHAR(100),
  state_name VARCHAR(100),
  pincode VARCHAR(10),
  educational_background VARCHAR(255),
  enrollment_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE teacher_profiles (
  user_id CHAR(36) NOT NULL,
  full_name VARCHAR(100),
  qualification VARCHAR(255),
  specialization VARCHAR(100),
  experience_years INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. SERVICES & LEADS
-- ============================================================

CREATE TABLE services (
  id CHAR(36) NOT NULL,
  city_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  short_description TEXT,
  long_description TEXT,
  price_range_min DECIMAL(10, 2),
  price_range_max DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_city_slug (city_id, slug),
  KEY idx_city (city_id),
  KEY idx_active (is_active),
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_sections (
  id CHAR(36) NOT NULL,
  service_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_service (service_id),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leads (
  id CHAR(36) NOT NULL,
  lead_type ENUM('SERVICE', 'TRAINING', 'EQUIPMENT', 'STAFF', 'TEACHER') NOT NULL DEFAULT 'SERVICE',
  lead_status ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST') DEFAULT 'NEW',
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(255),
  address_text TEXT,
  city_name VARCHAR(100),
  state_name VARCHAR(100),
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city_id CHAR(36),
  service_interest_id CHAR(36),
  source VARCHAR(50) DEFAULT 'website',
  admin_notes TEXT,
  converted_user_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_phone (phone),
  KEY idx_city (city_id),
  KEY idx_status (lead_status),
  KEY idx_created (created_at),
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
  FOREIGN KEY (service_interest_id) REFERENCES services(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. TRAINING / LMS
-- ============================================================

CREATE TABLE courses (
  id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description LONGTEXT,
  duration_weeks INT,
  total_hours DECIMAL(5, 2),
  price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE batches (
  id CHAR(36) NOT NULL,
  course_id CHAR(36) NOT NULL,
  batch_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  max_students INT DEFAULT 30,
  current_enrollment INT DEFAULT 0,
  status ENUM('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'UPCOMING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_course (course_id),
  KEY idx_status (status),
  KEY idx_start_date (start_date),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_batches (
  id CHAR(36) NOT NULL,
  student_user_id CHAR(36) NOT NULL,
  batch_id CHAR(36) NOT NULL,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('ACTIVE', 'COMPLETED', 'DROPPED') DEFAULT 'ACTIVE',
  attendance_percentage DECIMAL(5, 2) DEFAULT 0,
  final_score DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_student_batch (student_user_id, batch_id),
  KEY idx_batch (batch_id),
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assignment_submissions (
  id CHAR(36) NOT NULL,
  batch_id CHAR(36),
  submitted_by CHAR(36) NOT NULL,
  submission_title VARCHAR(255),
  submission_json JSON,
  submission_text TEXT,
  submission_file_url VARCHAR(500),
  score DECIMAL(5, 2),
  status ENUM('SUBMITTED', 'GRADED', 'RETURNED') DEFAULT 'SUBMITTED',
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_batch (batch_id),
  KEY idx_submitted_by (submitted_by),
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE certificates (
  id CHAR(36) NOT NULL,
  student_user_id CHAR(36) NOT NULL,
  course_id CHAR(36) NOT NULL,
  batch_id CHAR(36),
  certificate_number VARCHAR(100) NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  certificate_url VARCHAR(500),
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_student (student_user_id),
  KEY idx_course (course_id),
  KEY idx_batch (batch_id),
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. CARE OPERATIONS & PATIENTS
-- ============================================================

CREATE TABLE patients (
  id CHAR(36) NOT NULL,
  client_user_id CHAR(36) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  age INT,
  gender ENUM('MALE', 'FEMALE', 'OTHER'),
  medical_condition TEXT,
  allergies TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_client (client_user_id),
  FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE staff_assignments (
  id CHAR(36) NOT NULL,
  staff_user_id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  shift_type ENUM('MORNING', 'EVENING', 'NIGHT', 'FULL_DAY') DEFAULT 'FULL_DAY',
  assignment_status ENUM('ACTIVE', 'PAUSED', 'COMPLETED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff (staff_user_id),
  KEY idx_patient (patient_id),
  KEY idx_status (assignment_status),
  FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attendance_logs (
  id CHAR(36) NOT NULL,
  staff_user_id CHAR(36) NOT NULL,
  assignment_id CHAR(36),
  check_in_time TIMESTAMP NULL,
  check_out_time TIMESTAMP NULL,
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  check_out_latitude DECIMAL(10, 8),
  check_out_longitude DECIMAL(11, 8),
  status ENUM('PRESENT', 'ABSENT', 'LATE') DEFAULT 'ABSENT',
  notes TEXT,
  log_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff (staff_user_id),
  KEY idx_assignment (assignment_id),
  KEY idx_log_date (log_date),
  FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignment_id) REFERENCES staff_assignments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE care_logs (
  id CHAR(36) NOT NULL,
  staff_user_id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  assignment_id CHAR(36),
  care_notes TEXT NOT NULL,
  services_provided TEXT,
  patient_condition TEXT,
  log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff (staff_user_id),
  KEY idx_patient (patient_id),
  KEY idx_assignment (assignment_id),
  KEY idx_log_date (log_date),
  FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (assignment_id) REFERENCES staff_assignments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE geofence_checks (
  id CHAR(36) NOT NULL,
  assignment_id CHAR(36) NOT NULL,
  staff_id CHAR(36) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_meters DECIMAL(10, 2),
  is_valid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assignment_staff (assignment_id, staff_id),
  FOREIGN KEY (assignment_id) REFERENCES staff_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. HEALTH IoT & EXTERNAL INTEGRATIONS
-- ============================================================

CREATE TABLE hospital_mapping (
  id CHAR(36) NOT NULL,
  hospital_patient_id VARCHAR(100),
  carego_patient_id CHAR(36),
  hospital_id VARCHAR(100),
  mapping_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_mapping (hospital_patient_id, hospital_id),
  KEY idx_carego_patient (carego_patient_id),
  FOREIGN KEY (carego_patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hospital_referrals (
  id CHAR(36) NOT NULL,
  hospital_id VARCHAR(100),
  hospital_patient_id VARCHAR(100),
  carego_patient_id CHAR(36),
  referral_reason VARCHAR(255),
  status ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status (status),
  FOREIGN KEY (carego_patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE iot_devices (
  id CHAR(36) NOT NULL,
  staff_id CHAR(36) NOT NULL,
  device_type ENUM('PULSE_OXIMETER', 'BP_MONITOR', 'TEMPERATURE') NOT NULL,
  device_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_active (staff_id, is_active),
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vitals_logs (
  id CHAR(36) NOT NULL,
  staff_user_id CHAR(36),
  patient_id CHAR(36) NOT NULL,
  assignment_id CHAR(36),
  device_id CHAR(36),
  temperature DECIMAL(5, 2),
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  heart_rate INT,
  respiratory_rate INT,
  blood_glucose INT,
  oxygen_saturation DECIMAL(5, 2),
  notes TEXT,
  vitals_json JSON,
  source_type ENUM('MANUAL', 'IoT') DEFAULT 'MANUAL',
  log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_patient (patient_id),
  KEY idx_log_time (log_time),
  FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (assignment_id) REFERENCES staff_assignments(id) ON DELETE SET NULL,
  FOREIGN KEY (device_id) REFERENCES iot_devices(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. FINANCE & SUBSCRIPTIONS
-- ============================================================

CREATE TABLE subscription_plans (
  id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  billing_cycle ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') DEFAULT 'MONTHLY',
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE client_subscriptions (
  id CHAR(36) NOT NULL,
  client_user_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status ENUM('ACTIVE', 'PAUSED', 'CANCELLED') DEFAULT 'ACTIVE',
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_client (client_user_id),
  KEY idx_plan (plan_id),
  FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoices (
  id CHAR(36) NOT NULL,
  owner_type ENUM('CLIENT', 'STUDENT') NOT NULL,
  owner_id CHAR(36) NOT NULL,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  invoice_status ENUM('DRAFT', 'SENT', 'PAID', 'UNPAID', 'OVERDUE', 'CANCELLED') DEFAULT 'DRAFT',
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  description TEXT,
  payment_terms VARCHAR(100),
  related_entity_type VARCHAR(50),
  related_entity_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_owner (owner_type, owner_id),
  KEY idx_status (invoice_status),
  KEY idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
  id CHAR(36) NOT NULL,
  invoice_id CHAR(36) NOT NULL,
  service_code VARCHAR(100),
  description VARCHAR(255),
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(12, 2),
  service_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invoice (invoice_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id CHAR(36) NOT NULL,
  invoice_id CHAR(36),
  payer_user_id CHAR(36) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  gateway ENUM('RAZORPAY', 'STRIPE', 'PAYTM', 'CASH', 'BANK_TRANSFER') NOT NULL,
  provider_payment_id VARCHAR(255),
  provider_intent_id VARCHAR(255),
  status ENUM('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
  payment_method_id CHAR(36),
  metadata JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  captured_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status (status),
  KEY idx_provider_id (provider_payment_id),
  KEY idx_payer (payer_user_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (payer_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_methods (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_id VARCHAR(255) NOT NULL,
  card_last_four VARCHAR(4),
  expiry_month INT,
  expiry_year INT,
  is_default BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refunds (
  id CHAR(36) NOT NULL,
  payment_id CHAR(36) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(255),
  status ENUM('INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'INITIATED',
  provider_refund_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE insurance_exports (
  id CHAR(36) NOT NULL,
  invoice_id CHAR(36),
  provider_id VARCHAR(100),
  export_format ENUM('FHIR', 'HL7', 'JSON') DEFAULT 'FHIR',
  claim_json LONGTEXT,
  status ENUM('EXPORTED', 'SUBMITTED', 'APPROVED', 'REJECTED') DEFAULT 'EXPORTED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status (status),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. REVIEWS & RATINGS
-- ============================================================

CREATE TABLE ratings (
  id CHAR(36) NOT NULL,
  assignment_id CHAR(36),
  rater_id CHAR(36) NOT NULL,
  rated_user_id CHAR(36) NOT NULL,
  score INT CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rated_user (rated_user_id),
  KEY idx_assignment (assignment_id),
  FOREIGN KEY (assignment_id) REFERENCES staff_assignments(id) ON DELETE SET NULL,
  FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rating_summary (
  user_id CHAR(36) NOT NULL,
  avg_score DECIMAL(2, 1),
  total_ratings INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rating_flags (
  id CHAR(36) NOT NULL,
  rating_id CHAR(36) NOT NULL,
  flagged_by CHAR(36) NOT NULL,
  reason VARCHAR(255),
  severity ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
  resolved_at TIMESTAMP NULL,
  resolution_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (rating_id) REFERENCES ratings(id) ON DELETE CASCADE,
  FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. RECOMMENDATIONS & ANALYTICS
-- ============================================================

CREATE TABLE recommendations (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  recommended_item_id CHAR(36),
  item_type ENUM('STAFF', 'COURSE', 'SERVICE') NOT NULL,
  relevance_score DECIMAL(3, 2),
  algorithm_version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_item (user_id, item_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recommendation_feedback (
  id CHAR(36) NOT NULL,
  recommendation_id CHAR(36),
  user_id CHAR(36) NOT NULL,
  action ENUM('CLICKED', 'HIRED', 'IGNORED', 'SAVED') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_action (user_id, action),
  FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trending_analytics (
  id CHAR(36) NOT NULL,
  item_id CHAR(36) NOT NULL,
  item_type ENUM('STAFF', 'COURSE', 'SERVICE') NOT NULL,
  period ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
  engagement_count INT DEFAULT 0,
  growth_rate DECIMAL(5, 2),
  trend_score DECIMAL(3, 2),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_trend (item_id, item_type, period),
  KEY idx_trend_score (trend_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. REPORTING & SYNC
-- ============================================================

CREATE TABLE reports (
  id CHAR(36) NOT NULL,
  admin_id CHAR(36) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  filter_json JSON,
  status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
  file_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status (status),
  KEY idx_created (created_at),
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE scheduled_reports (
  id CHAR(36) NOT NULL,
  admin_id CHAR(36) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
  recipient_emails JSON,
  next_run_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_next_run (next_run_at),
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_cache (
  id CHAR(36) NOT NULL,
  report_type VARCHAR(100),
  cache_key VARCHAR(255),
  data LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_cache_key (cache_key),
  KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sync_checkpoints (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  checkpoint_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_sync_at TIMESTAMP,
  status ENUM('ACTIVE', 'COMPLETED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_status (user_id, status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sync_operations (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  checkpoint_id CHAR(36),
  entity_type VARCHAR(100),
  action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  local_id VARCHAR(255),
  server_id CHAR(36),
  status ENUM('SUCCESS', 'FAILED', 'CONFLICT') DEFAULT 'SUCCESS',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_op (checkpoint_id, local_id),
  KEY idx_user_checkpoint (user_id, checkpoint_id),
  FOREIGN KEY (checkpoint_id) REFERENCES sync_checkpoints(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE webhook_logs (
  id CHAR(36) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100),
  payload JSON,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_webhook (provider, provider_event_id),
  KEY idx_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. COMPLIANCE & AUDIT
-- ============================================================

CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36),
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id CHAR(36),
  old_values JSON,
  new_values JSON,
  change_reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  KEY idx_entity (entity_type, entity_id),
  KEY idx_action (action),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE compliance_exports (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  export_type ENUM('HIPAA_AUDIT', 'GDPR_DATA_EXPORT') NOT NULL,
  patient_id CHAR(36),
  target_user_id CHAR(36),
  export_json LONGTEXT,
  status ENUM('PENDING', 'COMPLETED', 'FAILED') DEFAULT 'COMPLETED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_type (user_id, export_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE data_deletion_requests (
  id CHAR(36) NOT NULL,
  target_user_id CHAR(36) NOT NULL,
  requested_by CHAR(36) NOT NULL,
  reason VARCHAR(255),
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status (status),
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE data_consents (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  consent_type VARCHAR(50),
  data_categories JSON,
  expires_at TIMESTAMP,
  created_by CHAR(36),
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_revoked (user_id, revoked_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

