# 🏪 Business Management Feature

Tài liệu về feature quản lý Business và Store.

## 📋 Mục lục

1. [Overview](#overview)
2. [Business Registration](#business-registration)
3. [Store Management](#store-management)
4. [Member Management](#member-management)
5. [Permissions](#permissions)

## Overview

Business Management cho phép:
- Đăng ký Business mới
- Admin duyệt Business
- Tạo và quản lý Store
- Mời thành viên vào Business
- Phân quyền cho member

## Business Registration

### Registration Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      BUSINESS REGISTRATION FLOW                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User clicks "Register Business"                                           │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────┐                                                   │
│  │  Fill Form        │                                                   │
│  │  - Tax Code       │                                                   │
│  │  - Legal Name     │                                                   │
│  │  - Address        │                                                   │
│  │  - Representative │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │  Verify Registry  │                                                   │
│  │  - Check tax code│                                                   │
│  │  - Match info    │                                                   │
│  │    with registry │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│     ┌─────┴─────┐                                                        │
│   Match     No Match                                                     │
│     │           │                                                        │
│     ▼           ▼                                                        │
│  ┌──────┐  ┌──────────────┐                                             │
│  │ AUTO │  │ MANUAL REVIEW │                                             │
│  │APPROVE│ │  Required    │                                             │
│  └──────┘  └──────────────┘                                             │
│     │                                                              │
│     ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │  Status = APPROVED│                                                   │
│  │  User can create   │                                                   │
│  │  Store            │                                                   │
│  └──────────────────┘                                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Business Entity

```typescript
interface Business {
  id: string;
  enterpriseCode: string;
  taxCode: string;
  legalName: string;
  representativeName: string;
  representativeTitle?: string;
  headOfficeAddress: string;
  province: string;
  status: BusinessStatus;
  verifiedRegistryId?: string;
  createdByUserId: string;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

enum BusinessStatus {
  PENDING = 'PENDING',      // Chờ duyệt
  APPROVED = 'APPROVED',     // Đã duyệt
  REJECTED = 'REJECTED',    // Bị từ chối
  SUSPENDED = 'SUSPENDED'   // Bị tạm ngưng
}
```

### Registration API

```http
POST /api/v1/business/register
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "enterpriseCode": "MST001",
  "taxCode": "0123456789",
  "legalName": "Công Ty TNHH Tech Books Việt Nam",
  "representativeName": "Nguyễn Văn A",
  "representativeTitle": "Giám đốc",
  "headOfficeAddress": "123 Nguyễn Trãi, Quận 1, TP.HCM",
  "province": "Ho Chi Minh City"
}
```

## Store Management

### Store Entity

```typescript
interface Store {
  id: string;
  businessId: string;
  storeName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  province?: string;
  status: StoreStatus;
  isFeatured: boolean;
  ratingAverage: number;
  ratingCount: number;
  followerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

enum StoreStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED'
}
```

### Create Store Flow

```
Business clicks "Create Store"
        │
        ▼
Fill Store Info:
- Store Name
- Description
- Contact Info
- Address
        │
        ▼
Upload Logo & Banner
        │
        ▼
Save as DRAFT
        │
        ▼
Publish → ACTIVE
        │
        ▼
Store visible on catalog
```

### Store Settings

```typescript
interface StoreSettings {
  storeId: string;
  
  // Appearance
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  
  // Contact
  contactEmail: string;
  contactPhone: string;
  address: string;
  operatingHours: {
    [day: string]: { open: string; close: string } | null;
  };
  
  // Shipping
  defaultShippingFee: number;
  freeShippingThreshold: number;
  shippingRegions: ShippingRegion[];
  
  // Policies
  returnPolicy: string;
  shippingPolicy: string;
  
  // Notifications
  emailNotifications: boolean;
  orderAlerts: boolean;
}
```

## Member Management

### Business Roles

| Role | Permissions |
|------|-------------|
| OWNER | Full access, can delete business, manage billing |
| MANAGER | Manage staff, orders, books, settings |
| ORDER_STAFF | View and process orders, handle returns |
| CONTENT_STAFF | Manage books, reviews, content |

### Add Member Flow

```
Owner/Manager clicks "Invite Member"
        │
        ▼
Enter email
Select role
        │
        ▼
Send invitation email
        │
        ▼
Member accepts
        │
        ▼
Member added to business
```

### Member Entity

```typescript
interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    avatar?: string;
  };
  role: BusinessMemberRole;
  status: 'ACTIVE' | 'INVITED' | 'REMOVED';
  invitedBy?: string;
  invitedAt?: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

enum BusinessMemberRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  ORDER_STAFF = 'ORDER_STAFF',
  CONTENT_STAFF = 'CONTENT_STAFF'
}
```

### Permissions Matrix

| Permission | OWNER | MANAGER | ORDER_STAFF | CONTENT_STAFF |
|------------|-------|---------|-------------|--------------|
| View Dashboard | ✅ | ✅ | ✅ | ❌ |
| View Orders | ✅ | ✅ | ✅ | ❌ |
| Process Orders | ✅ | ✅ | ✅ | ❌ |
| Cancel Orders | ✅ | ✅ | ❌ | ❌ |
| View Books | ✅ | ✅ | ❌ | ✅ |
| Create/Edit Books | ✅ | ✅ | ❌ | ✅ |
| Delete Books | ✅ | ✅ | ❌ | ❌ |
| View Vouchers | ✅ | ✅ | ❌ | ❌ |
| Create Vouchers | ✅ | ✅ | ❌ | ❌ |
| View Reviews | ✅ | ✅ | ❌ | ✅ |
| Reply Reviews | ✅ | ✅ | ❌ | ✅ |
| View Analytics | ✅ | ✅ | ❌ | ❌ |
| Manage Members | ✅ | ✅ | ❌ | ❌ |
| Store Settings | ✅ | ✅ | ❌ | ❌ |
| Billing | ✅ | ❌ | ❌ | ❌ |
| Delete Business | ✅ | ❌ | ❌ | ❌ |

## API Endpoints

### Business

```http
# Register business
POST /api/v1/business/register

# Get my businesses
GET /api/v1/business/me

# Get business details
GET /api/v1/business/:id

# Update business (OWNER only)
PATCH /api/v1/business/:id
```

### Stores

```http
# Create store
POST /api/v1/stores

# Get my stores
GET /api/v1/stores/my

# Update store
PATCH /api/v1/stores/:id

# Update store settings
PATCH /api/v1/stores/:id/settings
```

### Members

```http
# Invite member
POST /api/v1/business/:id/members
{
  "email": "staff@example.com",
  "role": "ORDER_STAFF"
}

# Get members
GET /api/v1/business/:id/members

# Update member role
PATCH /api/v1/business/:id/members/:memberId

# Remove member
DELETE /api/v1/business/:id/members/:memberId

# Accept invitation
POST /api/v1/members/invitations/:token/accept
```

### Admin Endpoints

```http
# Get pending businesses
GET /api/v1/admin/businesses?status=PENDING

# Approve business
POST /api/v1/admin/businesses/:id/approve

# Reject business
POST /api/v1/admin/businesses/:id/reject
{
  "reason": "Thông tin không chính xác"
}

# Suspend business
POST /api/v1/admin/businesses/:id/suspend
{
  "reason": "Vi phạm điều khoản"
}
```
