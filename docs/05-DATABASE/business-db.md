# 🗄️ Business Database Schema

Chi tiết database schema cho Business Service.

## ERD Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                            BUSINESSES                                 │
├─────────────────────────────────────────────────────────────────────┤
│ id                    │ UUID (PK)                                    │
│ enterprise_code       │ VARCHAR(50) UNIQUE NOT NULL                   │
│ tax_code              │ VARCHAR(50) UNIQUE NOT NULL                   │
│ legal_name            │ VARCHAR(255) NOT NULL                         │
│ representative_name   │ VARCHAR(255)                                   │
│ head_office_address   │ TEXT                                          │
│ status                │ VARCHAR(50) DEFAULT 'PENDING'                 │
│ verified_registry_id   │ UUID                                          │
│ created_by_user_id    │ UUID NOT NULL                                  │
│ approved_at           │ TIMESTAMP                                     │
│ approved_by           │ UUID                                          │
│ suspended_at          │ TIMESTAMP                                     │
│ suspension_reason     │ TEXT                                          │
│ created_at            │ TIMESTAMP DEFAULT NOW()                       │
│ updated_at            │ TIMESTAMP DEFAULT NOW()                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              STORES                                   │
├─────────────────────────────────────────────────────────────────────┤
│ id                    │ UUID (PK)                                    │
│ business_id           │ UUID (FK → businesses.id) NOT NULL           │
│ store_name            │ VARCHAR(255) NOT NULL                        │
│ slug                  │ VARCHAR(255) UNIQUE NOT NULL                 │
│ description           │ TEXT                                          │
│ logo_url              │ VARCHAR(500)                                  │
│ banner_url             │ VARCHAR(500)                                  │
│ contact_phone         │ VARCHAR(20)                                   │
│ contact_email         │ VARCHAR(255)                                   │
│ address               │ TEXT                                          │
│ province              │ VARCHAR(100)                                   │
│ status                │ VARCHAR(50) DEFAULT 'DRAFT'                  │
│ created_at            │ TIMESTAMP DEFAULT NOW()                       │
│ updated_at            │ TIMESTAMP DEFAULT NOW()                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BUSINESS_MEMBERS                              │
├─────────────────────────────────────────────────────────────────────┤
│ id                    │ UUID (PK)                                    │
│ business_id            │ UUID (FK → businesses.id) NOT NULL           │
│ user_id                │ UUID NOT NULL                                 │
│ role                   │ VARCHAR(50) NOT NULL                         │
│ status                 │ VARCHAR(50) DEFAULT 'ACTIVE'                │
│ invited_by             │ UUID                                          │
│ created_at            │ TIMESTAMP DEFAULT NOW()                       │
│ updated_at            │ TIMESTAMP DEFAULT NOW()                       │
│ UNIQUE(business_id, user_id)                                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Tables

### businesses

```sql
-- Businesses table
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_code VARCHAR(50) NOT NULL UNIQUE,
    tax_code VARCHAR(50) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    representative_name VARCHAR(255),
    representative_title VARCHAR(100),
    head_office_address TEXT,
    province VARCHAR(100),
    business_type VARCHAR(100),
    registration_date DATE,
    registration_authority VARCHAR(255),
    website VARCHAR(500),
    phone VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    verified_registry_id UUID,
    verified_at TIMESTAMP,
    verification_notes TEXT,
    created_by_user_id UUID NOT NULL,
    approved_at TIMESTAMP,
    approved_by UUID,
    rejected_at TIMESTAMP,
    rejected_by UUID,
    rejection_reason TEXT,
    suspended_at TIMESTAMP,
    suspended_by UUID,
    suspension_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT businesses_user_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_tax_code ON businesses(tax_code);
CREATE INDEX idx_businesses_enterprise_code ON businesses(enterprise_code);
CREATE INDEX idx_businesses_created_by ON businesses(created_by_user_id);
CREATE INDEX idx_businesses_legal_name ON businesses(legal_name);
```

### stores

```sql
-- Stores table
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    address TEXT,
    ward VARCHAR(100),
    district VARCHAR(100),
    province VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    operating_hours JSONB,  -- {"monday": "9:00-18:00", ...}
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    is_featured BOOLEAN DEFAULT FALSE,
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    follower_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT stores_business_fk FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_stores_business ON stores(business_id);
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_province ON stores(province);
CREATE INDEX idx_stores_featured ON stores(is_featured, status) WHERE status = 'ACTIVE';
```

### business_members

```sql
-- Business members
CREATE TABLE business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    permissions JSONB,  -- Additional permissions beyond role
    invited_by UUID,
    invited_at TIMESTAMP,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT business_members_business_fk FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT business_members_user_fk FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT business_members_unique UNIQUE (business_id, user_id)
);

-- Indexes
CREATE INDEX idx_business_members_business ON business_members(business_id);
CREATE INDEX idx_business_members_user ON business_members(user_id);
CREATE INDEX idx_business_members_role ON business_members(role);
```

### member_invitations

```sql
-- Pending member invitations
CREATE TABLE member_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    invited_by UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'PENDING',
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT member_invitations_business_fk FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE INDEX idx_member_invitations_token ON member_invitations(token);
CREATE INDEX idx_member_invitations_email ON member_invitations(email);
CREATE INDEX idx_member_invitations_status ON member_invitations(status);
```

### mock_registry

```sql
-- Mock business registry for verification
CREATE TABLE mock_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_code VARCHAR(50) NOT NULL UNIQUE,
    tax_code VARCHAR(50) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(255),
    enterprise_type VARCHAR(100),
    head_office_address TEXT,
    province VARCHAR(100),
    registration_date DATE,
    registration_authority VARCHAR(255),
    legal_representative_name VARCHAR(255),
    legal_representative_title VARCHAR(100),
    business_status VARCHAR(50),
    capital DECIMAL(15,2),
    employee_count INT,
    is_mock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mock_registry_tax_code ON mock_registry(tax_code);
CREATE INDEX idx_mock_registry_enterprise_code ON mock_registry(enterprise_code);
```

### business_audit_logs

```sql
-- Audit logs for business changes
CREATE TABLE business_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    actor_id UUID,
    actor_type VARCHAR(50),  -- USER, SYSTEM, ADMIN
    changes JSONB,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT business_audit_logs_business_fk FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE INDEX idx_business_audit_business ON business_audit_logs(business_id);
CREATE INDEX idx_business_audit_action ON business_audit_logs(action);
CREATE INDEX idx_business_audit_created ON business_audit_logs(created_at DESC);
```

## Enums

```sql
CREATE TYPE business_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
);

CREATE TYPE store_status AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'ACTIVE',
    'SUSPENDED',
    'CLOSED'
);

CREATE TYPE business_member_role AS ENUM (
    'OWNER',
    'MANAGER',
    'ORDER_STAFF',
    'CONTENT_STAFF'
);
```

## Business Status Flow

```
┌─────────┐     submit      ┌───────────┐    approve    ┌──────────┐
│  DRAFT  │───────────────▶│  PENDING  │──────────────▶│ APPROVED │
└─────────┘                └───────────┘               └──────────┘
     │                           │                            │
     │                           │ reject                     │ suspend
     │                           ▼                            ▼
     │                      ┌──────────┐               ┌────────────┐
     └─────────────────────▶│ REJECTED │               │ SUSPENDED  │
                            └──────────┘               └────────────┘
```

## Sample Data

```sql
-- Mock registry entries
INSERT INTO mock_registry (
    enterprise_code, tax_code, legal_name, enterprise_type,
    head_office_address, province, business_status, is_mock
) VALUES
    ('MST001', '0123456789', 'Công Ty TNHH Tech Books Việt Nam', 
     'TNHH', '123 Nguyễn Trãi, Q1, TP.HCM', 'Ho Chi Minh City', 'ACTIVE', TRUE),
    ('MST002', '9876543210', 'Công Ty CP Sách Văn Hóa',
     'Cổ phần', '456 Lý Thường Kiệt, Q.Hoàn Kiếm, Hà Nội', 'Hà Nội', 'ACTIVE', TRUE);

-- Sample business
INSERT INTO businesses (
    id, enterprise_code, tax_code, legal_name, representative_name,
    head_office_address, status, verified_registry_id, created_by_user_id,
    approved_at, approved_by
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'MST001', '0123456789', 'Công Ty TNHH Tech Books Việt Nam',
    'Nguyễn Văn A', '123 Nguyễn Trãi, Q1, TP.HCM',
    'APPROVED', 'registry-id-1', '00000000-0000-0000-0000-000000000003',
    NOW(), '00000000-0000-0000-0000-000000000001'
);

-- Sample store
INSERT INTO stores (
    id, business_id, store_name, slug, description,
    contact_email, province, status
) VALUES (
    's0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Tech Books Store',
    'tech-books-store',
    'Cửa hàng sách công nghệ hàng đầu',
    'contact@techbooks.vn',
    'Ho Chi Minh City',
    'ACTIVE'
);
```
