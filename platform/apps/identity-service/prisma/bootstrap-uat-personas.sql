-- 1. Admin
INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, has_completed_onboarding, failed_login_attempts, locked_until, created_at, updated_at)
VALUES (
  'adm0-0000-4000-8000-000000000001',
  'admin@huki.com',
  '$2b$10$0bE1lhh/6l3XwTUVZC/2YeyEBsKCYLbv58LBIUQHRriAPbYe/utRi',
  'HUKI Super Admin',
  'PLATFORM_ADMIN',
  'ACTIVE',
  NOW(),
  true,
  0,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'PLATFORM_ADMIN',
  status = 'ACTIVE',
  failed_login_attempts = 0,
  locked_until = NULL;

-- 2. Buyer (Customer)
INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, has_completed_onboarding, failed_login_attempts, locked_until, created_at, updated_at)
VALUES (
  'usr0-0000-4000-8000-000000000001',
  'user@huki.com',
  '$2b$10$AbHpqlPX81YbpcEhN1xGcu687kBlOOAfDa59651l9jwNNiFuYp2BG',
  'Nguyễn Văn An (Test Buyer)',
  'USER',
  'ACTIVE',
  NOW(),
  true,
  0,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'USER',
  status = 'ACTIVE',
  failed_login_attempts = 0,
  locked_until = NULL;

-- 3. Seller (Business Owner)
INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, has_completed_onboarding, failed_login_attempts, locked_until, created_at, updated_at)
VALUES (
  'biz0-0000-4000-8000-000000000002',
  'business@huki.com',
  '$2b$10$NehD6eV6J997qFeeE/z8LOGmqunRS52/Z7fQPpRP/5fV/mZjQaZlG',
  'Alpha Books Official (Test Business)',
  'BUSINESS',
  'ACTIVE',
  NOW(),
  true,
  0,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'BUSINESS',
  status = 'ACTIVE',
  failed_login_attempts = 0,
  locked_until = NULL;

-- 4. Shipper (Delivery Staff)
INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, has_completed_onboarding, failed_login_attempts, locked_until, created_at, updated_at)
VALUES (
  'ship-0000-4000-8000-000000000003',
  'shipper@huki.com',
  '$2b$10$Clo9O4EESZy26WlevaTEquRnq4VEoyWgs6TpYts7v0jNxp3Vww6ka',
  'Nguyễn Văn Giao (Shipper HUKI)',
  'DELIVERY_STAFF',
  'ACTIVE',
  NOW(),
  true,
  0,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'DELIVERY_STAFF',
  status = 'ACTIVE',
  failed_login_attempts = 0,
  locked_until = NULL;

-- 5. Affiliate Partner (CTV)
INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, has_completed_onboarding, failed_login_attempts, locked_until, created_at, updated_at)
VALUES (
  'aff0-0000-4000-8000-000000000004',
  'affiliate@huki.com',
  '$2b$10$2GTtuntEH4tbrbMZowbMeO/dUoR..zmfZBf7qqkfP3noVGkdzLCzS',
  'Trần Review Sách (Top KOC)',
  'USER',
  'ACTIVE',
  NOW(),
  true,
  0,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'USER',
  status = 'ACTIVE',
  failed_login_attempts = 0,
  locked_until = NULL;
