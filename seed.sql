USE carego_db;

-- ========================
-- CLEAN EXISTING DATA
-- ========================
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE users;
TRUNCATE TABLE services;
TRUNCATE TABLE cities;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================
-- SEED CITIES
-- ========================
INSERT INTO cities (id, name, state, is_active) VALUES
('c1-uuid', 'Jaipur', 'Rajasthan', TRUE),
('c2-uuid', 'Delhi', 'Delhi', TRUE);

-- ========================
-- SEED SERVICES
-- ========================
INSERT INTO services (id, title, slug, short_description, price_range) VALUES
('s1-uuid', 'Elder Care', 'elder-care', 'Compassionate care for seniors at home.', '₹1200-1800/day'),
('s2-uuid', 'Post-Surgery Care', 'post-surgery', 'Professional nursing after operations.', '₹2000-3000/day');

-- ========================
-- SEED SUPER ADMIN
-- Password: Admin@1234
-- ========================
INSERT INTO users (
    id,
    phone,
    email,
    password_hash,
    role,
    is_active
) VALUES (
    'admin-uuid-001',
    '9999999999',
    'admin@carego.in',
    '$2b$10$dcVE7pH263l.lcRyEn.sBOHweHwu.XkRpTAIi.pyM8zZk1fwqXMoW',
    'SUPER_ADMIN',
    TRUE
);
