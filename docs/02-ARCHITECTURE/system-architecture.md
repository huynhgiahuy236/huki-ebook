# 🏗️ System Architecture

Kiến trúc hệ thống HUKI EBOOK.

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENTS                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Web App   │  │ Mobile App  │  │  Admin Web  │  │ Seller Web  │             │
│  │  (Next.js)  │  │  (Flutter)  │  │  (Next.js)  │  │  (Next.js)  │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
└─────────┼────────────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │                │
          └────────────────┴────────┬───────┴────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │    API GATEWAY    │
                          │   (NestJS)        │
                          │  - Auth           │
                          │  - Routing        │
                          │  - Rate Limit     │
                          │  - CORS           │
                          └─────────┬─────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          │     ┌──────────────────┬┴──────────────────┐      │
          │     │                  │                    │      │
          ▼     ▼                  ▼                    ▼      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   IDENTITY      │  │    BUSINESS     │  │    COMMERCE     │
│   SERVICE       │  │    SERVICE      │  │    SERVICE      │
│                 │  │                 │  │                 │
│  - Auth         │  │  - Business     │  │  - Catalog      │
│  - Users        │  │  - Store        │  │  - Books        │
│  - Sessions     │  │  - Members      │  │  - Cart         │
│  - Tokens       │  │  - Registry     │  │  - Checkout     │
│                 │  │                 │  │  - Orders       │
│  ┌───────────┐  │  │  ┌───────────┐ │  │  - Payment      │
│  │PostgreSQL │  │  │  │PostgreSQL │ │  │  ┌───────────┐  │
│  └───────────┘  │  │  └───────────┘ │  │  │PostgreSQL │  │
│                 │  │                 │  │  └───────────┘  │
└────────┬────────┘  └────────┬────────┘  └───────┬────────┘
         │                    │                    │
         │            ┌───────┴───────┐            │
         │            │               │            │
         │            ▼               ▼            ▼
         │   ┌─────────────────┐ ┌─────────────────┐
         │   │    SHIPPING      │ │    COMMUNITY     │
         │   │    SERVICE       │ │    SERVICE       │
         │   │                  │ │                  │
         │   │  - Shipping      │ │  - Forum         │
         │   │  - Shipments    │ │  - Chat          │
         │   │  - Delivery      │ │  - Reviews       │
         │   │                  │ │  - Notifications │
         │   │  ┌───────────┐   │ │  - Moderation   │
         │   │  │PostgreSQL │   │ │                  │
         │   │  └───────────┘   │ │  ┌───────────┐  │
         │   │                  │ │  │  MongoDB   │  │
         │   └──────────────────┘ │  └───────────┘  │
         │                         └─────────────────┘
         │                                    │
         │                                    ▼
         │                         ┌─────────────────┐
         │                         │   PROMOTION     │
         │                         │   SERVICE       │
         │                         │                 │
         │                         │  - Vouchers     │
         │                         │  - Promotions  │
         │                         │  - Discounts    │
         │                         │  ┌───────────┐  │
         │                         │  │PostgreSQL │  │
         │                         └──┴───────────┴──┘
         │
         └───────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    RABBITMQ       │
                    │   Message Queue   │
                    │                   │
                    │  - Events         │
                    │  - Async Tasks    │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │      REDIS        │
                    │    Cache/PubSub   │
                    │                   │
                    │  - Session       │
                    │  - Cache         │
                    │  - Rate Limit   │
                    └───────────────────┘
```

## 🏛️ Service Responsibilities

### API Gateway

| Responsibility | Description |
|----------------|-------------|
| Authentication | Verify JWT tokens |
| Routing | Forward requests to services |
| Rate Limiting | Prevent abuse |
| CORS | Handle cross-origin |
| Logging | Request/response logging |
| Load Balancing | Distribute load |

### Identity Service

| Responsibility | Description |
|----------------|-------------|
| User Management | CRUD users |
| Authentication | Login, register, logout |
| Session Management | Auth sessions, refresh tokens |
| Role Management | System roles |
| Password Management | Hash, reset |

### Business Service

| Responsibility | Description |
|----------------|-------------|
| Business Registration | Register businesses |
| Store Management | Create, manage stores |
| Member Management | Business members |
| Mock Registry | Mock business verification |

### Commerce Service

| Responsibility | Description |
|----------------|-------------|
| Catalog | Books, categories |
| Inventory | Stock management |
| Cart | Shopping cart |
| Checkout | Checkout flow |
| Orders | Order management |
| Payment | Payment processing |

### Shipping Service

| Responsibility | Description |
|----------------|-------------|
| Shipping Quotes | Calculate shipping fees |
| Shipments | Shipment tracking |
| Delivery Staff | Delivery assignment |
| Delivery Status | Status updates |

### Community Service

| Responsibility | Description |
|----------------|-------------|
| Forum | Discussion posts |
| Chat | Real-time messaging |
| Reviews | Book & Store reviews |
| Notifications | In-app notifications |
| Moderation | Content moderation |

### Promotion Service

| Responsibility | Description |
|----------------|-------------|
| Vouchers | Platform & Store vouchers |
| Promotions | Discount campaigns |
| Book Discounts | Direct book discounts |

## 🔄 Communication Patterns

### 1. Synchronous (HTTP/gRPC)

```
Client → API Gateway → Service
```

**Use Cases:**
- User operations
- Read data
- Real-time needs

### 2. Asynchronous (RabbitMQ)

```
Service A → Event → RabbitMQ → Service B
```

**Use Cases:**
- Order created → Inventory update
- Payment success → Grant book access
- Business approved → Notify user

### 3. Database (Direct)

```
Service A → Database → Service B (limited)
```

**Use Cases:**
- Read replicas
- Event sourcing (limited)

## 📊 Database Distribution

### PostgreSQL Services

| Service | Database | Tables |
|---------|----------|--------|
| Identity | identity_db | users, auth_sessions |
| Business | business_db | businesses, stores, members |
| Commerce | commerce_db | books, orders, payments |
| Shipping | shipping_db | shipments, addresses, delivery_staff, delivery_logs, outbox_events |
| Promotion | promotion_db | vouchers, discounts |

### MongoDB Services

| Service | Database | Collections |
|---------|----------|-------------|
| Community | community_db | forums, posts, messages, reviews, notifications |

## 🔒 Security Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Network Layer                                              │
│     ├── WAF (Web Application Firewall)                        │
│     ├── DDoS Protection                                        │
│     └── SSL/TLS Termination                                     │
│                                                                 │
│  2. API Gateway Layer                                          │
│     ├── JWT Verification                                       │
│     ├── Rate Limiting                                          │
│     ├── CORS Policy                                            │
│     └── Request Validation                                     │
│                                                                 │
│  3. Service Layer                                              │
│     ├── Authorization (RBAC)                                   │
│     ├── Input Validation                                       │
│     └── Business Logic Validation                              │
│                                                                 │
│  4. Database Layer                                            │
│     ├── Row-Level Security                                     │
│     ├── Encryption at Rest                                     │
│     └── Audit Logging                                           │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## 🌐 External Integrations

| Service | Technology | Purpose |
|---------|------------|---------|
| Cloudinary | CDN | Image storage, optimization |
| Cloudflare R2 | Object Storage | Ebook PDF storage |
| Firebase | BaaS | Push notifications, Auth |
| PayOS | Payment Gateway | Online payments |
| AI Moderation | External API | Content moderation |

## 📈 Scalability Patterns

### Horizontal Scaling

```
                    ┌─────────────┐
                    │ Load Balancer│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐        ┌────▼────┐
   │Service 1│       │Service 2│        │Service 3│
   └─────────┘       └─────────┘        └─────────┘
```

### Database Scaling

```
Primary ───▶ Read Replica 1
  │              │
  │              ▼
  └─────────▶ Read Replica 2
```

## 🔄 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Kubernetes │    │  Kubernetes │    │  Kubernetes │         │
│  │  Cluster 1  │    │  Cluster 2  │    │  Cluster 3  │         │
│  │             │    │             │    │             │         │
│  │ Gateway     │    │ Services    │    │ Services    │         │
│  │ Services    │    │             │    │             │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐        │
│  │                    Managed Services                   │        │
│  │  PostgreSQL (RDS) │ MongoDB │ Redis │ RabbitMQ      │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐        │
│  │                    External Services                 │        │
│  │  Cloudinary │ R2 │ Firebase │ Payment Gateways     │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Monitoring Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Metrics   │    │   Logging   │    │  Tracing    │
│  (Prometheus)│    │  (Loki)     │    │  (Jaeger)   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                   ┌─────────────┐
                   │  Grafana    │
                   │  Dashboard  │
                   └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │   Alert     │
                   │  Manager    │
                   └─────────────┘
```
