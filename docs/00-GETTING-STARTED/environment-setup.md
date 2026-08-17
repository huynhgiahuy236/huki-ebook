# ⚙️ Environment Setup

Hướng dẫn cấu hình biến môi trường cho dự án.

## 📁 Environment Files

```
huki-ebook/
├── .env.example              # Template - không sửa
├── .env                      # Development - gitignore
├── .env.local               # Local overrides - gitignore
├── .env.staging             # Staging - gitignore
├── .env.production          # Production - gitignore (encrypted)
│
├── services/
│   ├── identity-service/
│   │   ├── .env
│   │   └── .env.example
│   ├── business-service/
│   │   ├── .env
│   │   └── .env.example
│   └── ...
│
└── apps/
    ├── web/
    │   ├── .env.local
    │   └── .env.example
    └── mobile/
        └── .env
```

## 📋 Environment Variables Reference

### Core Variables (Bắt buộc)

```env
# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_ENV=development
PORT=3000

# ============================================
# DATABASE - PostgreSQL
# ============================================
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=huki_ebook
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password
DATABASE_SYNC=false
DATABASE_LOGGING=true

# ============================================
# DATABASE - MongoDB
# ============================================
MONGODB_URI=mongodb://localhost:27017/huki_community
MONGODB_USER=
MONGODB_PASSWORD=

# ============================================
# REDIS
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ============================================
# RABBITMQ
# ============================================
RABBITMQ_URI=amqp://localhost:5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ACCESS_TOKEN_SECRET=your-access-token-secret
JWT_REFRESH_TOKEN_SECRET=your-refresh-token-secret
```

### Service-Specific Variables

```env
# ============================================
# IDENTITY SERVICE
# ============================================
IDENTITY_SERVICE_PORT=3001
BCRYPT_ROUNDS=12

# ============================================
# BUSINESS SERVICE
# ============================================
BUSINESS_SERVICE_PORT=3002
BUSINESS_DB_NAME=huki_business

# ============================================
# COMMERCE SERVICE
# ============================================
COMMERCE_SERVICE_PORT=3003
COMMERCE_DB_NAME=huki_commerce

# ============================================
# SHIPPING SERVICE
# ============================================
SHIPPING_SERVICE_PORT=3004
SHIPPING_DB_NAME=huki_shipping

# ============================================
# COMMUNITY SERVICE
# ============================================
COMMUNITY_SERVICE_PORT=3005
COMMUNITY_DB_NAME=huki_community
SOCKET_PORT=3006

# ============================================
# PROMOTION SERVICE
# ============================================
PROMOTION_SERVICE_PORT=3007
PROMOTION_DB_NAME=huki_promotion
```

### Third-Party Services

```env
# ============================================
# CLOUDFLARE R2 (Digital Books Storage)
# ============================================
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_BUCKET_NAME=huki-ebooks
R2_PUBLIC_URL=https://your-account.r2.dev

# ============================================
# CLOUDINARY (Images)
# ============================================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ============================================
# FIREBASE (Push Notifications)
# ============================================
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# ============================================
# PAYMENT GATEWAY (VNPay/Momo)
# ============================================
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn
VNPAY_RETURN_URL=http://localhost:3000/payment/return

MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
MOMO_URL=https://test-payment.momo.vn
MOMO_RETURN_URL=http://localhost:3000/payment/momo/return
```

### API Gateway

```env
# ============================================
# API GATEWAY
# ============================================
API_GATEWAY_PORT=3000

# Service URLs (Internal)
IDENTITY_SERVICE_URL=http://localhost:3001
BUSINESS_SERVICE_URL=http://localhost:3002
COMMERCE_SERVICE_URL=http://localhost:3003
SHIPPING_SERVICE_URL=http://localhost:3004
COMMUNITY_SERVICE_URL=http://localhost:3005
PROMOTION_SERVICE_URL=http://localhost:3007

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Frontend Web

```env
# ============================================
# NEXT.JS WEB APP
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3006
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase (for Web Push)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Frontend Mobile (Flutter)

```dart
// lib/core/config/env.dart
class EnvConfig {
  static const String apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://localhost:3000/api');
  static const String wsUrl = String.fromEnvironment('WS_URL', defaultValue: 'ws://localhost:3006');
  static const bool enableCrashlytics = bool.fromEnvironment('ENABLE_CRASHLYTICS', defaultValue: false);
}
```

## 🔒 Security Notes

### KHÔNG commit các file sau

```gitignore
.env
.env.local
.env.*.local
*.pem
*.key
credentials.json
service-account.json
```

### Production Checklist

- [ ] Đổi tất cả secrets
- [ ] Sử dụng strong passwords
- [ ] Bật HTTPS
- [ ] Enable CORS properly
- [ ] Setup rate limiting
- [ ] Enable logging

## 🔄 Switching Environments

```bash
# Development
NODE_ENV=development npm run dev

# Staging
NODE_ENV=staging npm run start

# Production
NODE_ENV=production npm run start:prod
```
