# 🔐 Authentication Feature

Tài liệu chi tiết về feature Authentication.

## 📋 Mục lục

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Authentication Flows](#authentication-flows)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Security](#security)
7. [Frontend Integration](#frontend-integration)

## Overview

Hệ thống Authentication quản lý:
- Đăng ký tài khoản
- Đăng nhập/Đăng xuất
- Quản lý session
- JWT Token management
- Password reset

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| USER | Người dùng thông thường | Mua sách, đọc ebook, đánh giá |
| BUSINESS | Chủ doanh nghiệp | Quản lý cửa hàng, bán sách |
| DELIVERY_STAFF | Nhân viên giao hàng | Nhận và giao đơn |
| PLATFORM_ADMIN | Quản trị viên | Toàn quyền hệ thống |

## Authentication Flows

### Registration Flow

```
┌──────────┐     POST /auth/register      ┌──────────┐
│          │ ─────────────────────────▶ │          │
│  Client  │                             │  Identity │
│          │ ◀────────────────────────── │ Service  │
│          │     201 + JWT Tokens         │          │
└──────────┘                             └──────────┘
      │
      │ Validate input
      │ Check email exists
      │ Hash password (bcrypt)
      │ Create user
      │ Generate tokens
      │ Return response
```

### Login Flow

```
┌──────────┐     POST /auth/login       ┌──────────┐
│          │ ─────────────────────────▶ │          │
│  Client  │                             │  Identity │
│          │ ◀────────────────────────── │ Service  │
│          │     200 + JWT Tokens        │          │
└──────────┘                             └──────────┘
      │
      │ Validate credentials
      │ Verify password
      │ Create AuthSession
      │ Generate tokens
      │ Return response
```

### Token Refresh Flow

```
┌──────────┐    POST /auth/refresh     ┌──────────┐
│          │ ────────────────────────▶ │          │
│  Client  │                           │  Identity │
│          │ ◀─────────────────────── │ Service  │
│          │   200 + New Access Token  │          │
└──────────┘                           └──────────┘
      │
      │ Validate refresh token
      │ Revoke old token
      │ Generate new tokens
      │ Return new access token
```

## API Endpoints

### POST /auth/register

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "fullName": "Nguyen Van A",
  "phone": "0912345678"
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: Min 8 chars, 1 uppercase, 1 number, 1 special char
- `fullName`: Min 2 chars, max 100 chars
- `phone`: Vietnamese format (optional)

### POST /auth/login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### POST /auth/refresh

**Request:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

### POST /auth/logout

**Headers:**
```
Authorization: Bearer <access_token>
```

## Data Models

### User Entity

```typescript
interface User {
  id: string;              // UUID
  email: string;           // Unique
  passwordHash: string;     // bcrypt hash
  fullName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

enum UserRole {
  USER = 'USER',
  BUSINESS = 'BUSINESS',
  DELIVERY_STAFF = 'DELIVERY_STAFF',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN'
}

enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING = 'PENDING',
  DELETED = 'DELETED'
}
```

### AuthSession Entity

```typescript
interface AuthSession {
  id: string;                  // UUID
  userId: string;               // FK to User
  refreshTokenHash: string;      // bcrypt hash
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;              // 7 days from creation
  createdAt: Date;
  revokedAt?: Date;
}
```

## Security

### Password Hashing

```typescript
// Hash password with bcrypt
const hash = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

### JWT Token Structure

```typescript
// Access Token (15 minutes)
interface AccessToken {
  sub: string;           // userId
  email: string;
  role: string;
  iat: number;           // Issued at
  exp: number;            // Expiration
}

// Refresh Token (7 days)
interface RefreshToken {
  sub: string;           // userId
  sessionId: string;     // AuthSession ID
  iat: number;
  exp: number;
}
```

### Security Headers

```typescript
// Applied to all responses
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-XSS-Protection', '1; mode=block');
res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
```

## Frontend Integration

### NextAuth.js Configuration

```typescript
// apps/web/src/lib/auth.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        
        if (!res.ok) return null;
        
        const data = await res.json();
        return data.data.user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};
```

### React Query Hooks

```typescript
// useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';

export function useLogin() {
  const router = useRouter();
  
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });
      
      if (result?.error) {
        throw new Error('Login failed');
      }
      
      return result;
    },
    onSuccess: () => {
      router.push('/');
      router.refresh();
    },
  });
}

export function useLogout() {
  const router = useRouter();
  
  return useMutation({
    mutationFn: async () => {
      await signOut({ redirect: false });
    },
    onSuccess: () => {
      router.push('/login');
    },
  });
}
```

### Protected Route

```typescript
// components/ProtectedRoute.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ 
  children, 
  allowedRoles 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && allowedRoles) {
      if (!allowedRoles.includes(session?.user?.role)) {
        router.push('/403');
      }
    }
  }, [status, session, router, allowedRoles]);

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
```
