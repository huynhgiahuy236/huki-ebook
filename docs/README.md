# 📚 HUKI EBOOK Documentation

Welcome to HUKI EBOOK project documentation.

## 📁 Documentation Structure

### Getting Started
- [Quick Start](00-GETTING-STARTED/quick-start.md) - Get up and running quickly
- [Environment Setup](00-GETTING-STARTED/environment-setup.md) - Configure your environment
- [Docker Setup](00-GETTING-STARTED/docker-setup.md) - Run with Docker
- [First API Call](00-GETTING-STARTED/first-api-call.md) - Test your setup
- [Troubleshooting](00-GETTING-STARTED/troubleshooting.md) - Common issues and solutions

### Project Overview
- [Project Overview](01-PROJECT-OVERVIEW/README.md) - Project description and goals
- [User Personas](01-PROJECT-OVERVIEW/user-personas.md) - Target users

### Architecture
- [System Architecture](02-ARCHITECTURE/system-architecture.md) - High-level architecture
- [Microservices Design](02-ARCHITECTURE/microservices-design.md) - Service design

### Database

- [Prisma standard and migrations](05-DATABASE/PRISMA.md) - Per-service clients, environment URLs and migration policy

### API Reference
- [API Overview](04-API-REFERENCE/README.md) - API documentation index
- [Authentication](04-API-REFERENCE/endpoints/auth.md) - Auth endpoints
- [Identity](04-API-REFERENCE/endpoints/identity.md) - User profile endpoints
- [Business](04-API-REFERENCE/endpoints/business.md) - Business & store management
- [Catalog](04-API-REFERENCE/endpoints/catalog.md) - Categories, authors, publishers
- [Books](04-API-REFERENCE/endpoints/books.md) - Book management
- [Cart](04-API-REFERENCE/endpoints/cart.md) - Shopping cart
- [Orders](04-API-REFERENCE/endpoints/orders.md) - Order management
- [Payment](04-API-REFERENCE/endpoints/payment.md) - Payment integration
- [Shipping](04-API-REFERENCE/endpoints/shipping.md) - Shipping & delivery
- [Vouchers](04-API-REFERENCE/endpoints/vouchers.md) - Vouchers & promotions
- [Forum](04-API-REFERENCE/endpoints/forum.md) - Community forum
- [Chat](04-API-REFERENCE/endpoints/chat.md) - Real-time chat
- [Reviews](04-API-REFERENCE/endpoints/reviews.md) - Reviews & ratings
- [Notifications](04-API-REFERENCE/endpoints/notifications.md) - Notifications
- [Error Responses](04-API-REFERENCE/error-response.md) - Error codes
- [Rate Limiting](04-API-REFERENCE/rate-limiting.md) - Rate limits

### Database
- [Database Overview](../05-DATABASE/) - Database documentation

### Events
- [Event System](../06-EVENTS/) - Event-driven architecture

### Frontend
- [Web Frontend](../07-FRONTEND-WEB/) - Next.js web application
- [Mobile App](../08-FRONTEND-MOBILE/) - Flutter mobile application

### Design
- [Design System](../09-DESIGN-SYSTEM/) - UI/UX design guidelines

### Features
- [Features Overview](../10-FEATURES/) - Feature documentation

### Common
- [Common Patterns](../11-COMMON/) - Shared utilities

### Operations
- [Operations](../12-OPERATIONS/) - Deployment & operations

### Testing
- [Testing Guide](../13-TESTING/) - Testing documentation

### Security
- [Security](../14-SECURITY/) - Security guidelines

### Contributing
- [Contributing Guide](../15-CONTRIBUTING/) - How to contribute

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| GitHub Repository | [Link](https://github.com/huynhgiahuy236/huki-ebook) |
| API Docs (Swagger) | http://localhost:3000/api/docs |
| Docker Hub | (coming soon) |

---

## 📊 Project Progress

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1-5: Backend Foundation | ✅ Complete | All backend phases complete |
| Phase 7: Backend Completion | ✅ Complete | Sprint 23-30: Health, Outbox, Tests, Swagger, Error Codes |
| Phase 8: Production | ⬜ Pending | PayOS, HTTPS, CI/CD |
| Frontend Web | ⬜ Pending | Phase 01-07 planning complete |
| Mobile App | ⬜ Pending | TBD |

---

## 🔄 Backend Completion (Phase 07)

| Sprint | Task | Status |
|--------|------|--------|
| 27 | API completeness | ✅ |
| 28 | Error codes | ✅ |
| 29 | Swagger docs | ✅ |
| 23 | Health checks | ✅ |
| 24 | Outbox pattern | ✅ |
| 25 | Unit tests | ✅ |
| 30 | Performance | ✅ |

**Overall: 100% COMPLETE**

---

## 📋 Frontend Planning (Web)

| Phase | Backend | Name |
|-------|---------|------|
| 01 | Identity | Auth & Layout |
| 02 | Commerce | Product Catalog |
| 03 | Commerce + Shipping | Cart & Checkout |
| 04 | Commerce + Promotion | User Dashboard |
| 05 | Community | Community |
| 06 | Business + Commerce | Seller Dashboard |
| 07 | All | Polish & Launch |

**Total: 28 sprints (7 phases)**

---

## 👥 Team

- **Huy** - Backend, Database
- **Kien** - Backend, API, Infrastructure

---

## 📞 Support

- Create an issue on GitHub
- Email: dev@huki-ebook.com
