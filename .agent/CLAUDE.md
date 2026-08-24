# CLAUDE.md - HUKI EBOOK Agent Instructions

> **ĐỌC FILE NÀY ĐẦU TIÊN** trước khi làm bất cứ điều gì
> Last updated: 2026-08-24

---

## 🚀 ONBOARDING (BẮT BUỘC đọc theo thứ tự)

1. **`CLAUDE.md`** (file này) - Quy trình làm việc
2. **`.agent/PROJECT-STATE.md`** - State hiện tại của project
3. **`.agent/SESSION-LOG.md`** - Lịch sử các phiên làm việc
4. **`.agent/WORKFLOW.md`** - Workflow Git & commit
5. Bắt đầu làm việc

---

## 📁 Project Structure

```
HuKi/
├── .agent/              ← AGENT INSTRUCTIONS (đọc file này)
│   ├── CLAUDE.md        ← File này - Main instructions
│   ├── PROJECT-STATE.md ← State hiện tại của project
│   ├── SESSION-LOG.md   ← Log các phiên làm việc
│   ├── WORKFLOW.md      ← Git workflow & conventions
│   └── TEMPLATES/       ← Templates cho reports/docs
│
├── docs/                ← TÀI LIỆU CHÍNH THỨC
├── flow/                ← Business flow diagrams
├── err/                 ← Error codes catalog
├── res/                 ← Resources (API, domain, contracts)
│   ├── DOMAIN/          ← Domain schemas
│   ├── API/             ← API specs
│   ├── CONTRACTS/       ← Event contracts
│   └── claude/          ← Báo cáo sessions
│
├── task/                ← Task tracking
├── skill/               ← UI/UX skills
├── ebook/               ← Tài liệu gốc (.docx)
├── scripts/             ← Utility scripts
├── test/                ← Test files
│
├── platform/            ← Backend (NestJS microservices)
│   ├── apps/
│   ├── libs/shared/     ← Shared libraries
│   └── ...
│
├── web/                 ← Frontend (Next.js)
├── mobile/              ← Mobile (Flutter)
│
├── postman/             ← Postman collections (ignored)
├── api/                 ← API stats (ignored)
│
└── docker-compose.yml   ← Docker setup
```

---

## 🔄 QUY TRÌNH LÀM VIỆC (BẮT BUỘC)

### Bắt đầu phiên mới
```
1. Đọc .agent/CLAUDE.md (file này)
2. Đọc .agent/PROJECT-STATE.md (state hiện tại)
3. Đọc .agent/SESSION-LOG.md (đã làm gì trước đó)
4. Hiểu context → Bắt đầu task
```

### Trong phiên làm việc
```
1. Tạo branch mới theo convention (xem WORKFLOW.md)
2. Làm task
3. Update .agent/PROJECT-STATE.md nếu thay đổi lớn
4. Tạo/sửa code
5. Update docs liên quan
6. Append log vào .agent/SESSION-LOG.md
7. Hỏi user: "Push và merge develop không?"
```

### Kết thúc phiên
```
1. Commit với message rõ ràng
2. Append session vào .agent/SESSION-LOG.md
3. Tạo báo cáo trong res/claude/YYYY-MM-DD-sessionN.md
4. Hỏi: "Push và merge develop không?"
5. Nếu có → git pull → merge → push (xử lý conflict)
```

---

## 📋 QUY ĐỊNH VỀ FILE

| Loại file | Đặt ở | Ghi chú |
|-----------|--------|---------|
| **Code Backend** | `platform/apps/*/src/` | NestJS microservices |
| **Code Frontend** | `web/` | Next.js |
| **Code Mobile** | `mobile/` | Flutter |
| **Shared Libs** | `platform/libs/shared/src/` | Dùng chung |
| **API Docs** | `docs/04-API-REFERENCE/` | |
| **Domain Schemas** | `res/DOMAIN/` | User, Book, Order, etc. |
| **Business Flows** | `flow/` | Mermaid diagrams |
| **Error Codes** | `err/CODES/` | Theo service |
| **Event Contracts** | `res/CONTRACTS/` | RabbitMQ events |
| **API Stats** | `api/` | Báo cáo (gitignored) |
| **Postman** | `postman/` | Collections (gitignored) |
| **Agent Reports** | `res/claude/` | Session reports |
| **Test Scripts** | `scripts/` | |
| **Temp/Test files** | `test/` | |

---

## 🏗️ Architecture

```
API Gateway (:3000)
├── Identity (:3001)    → Auth, Users, Sessions
├── Business (:3002)    → Business, Stores, Members
├── Commerce (:3003)    → Books, Cart, Orders, Payments
├── Shipping (:3004)    → Shipments, Addresses
├── Community (:3005)   → Forum, Chat, Reviews, Notifications
└── Promotion (:3007)   → Vouchers, Banners, Flash Sales
```

**Stack:** NestJS, PostgreSQL, MongoDB, Redis, RabbitMQ, PayOS, Cloudflare R2, Cloudinary, Firebase FCM

**Patterns:** Microservices, Event-Driven, Outbox, CQRS, Saga

---

## 🔑 KEY FILES (Đọc theo thứ tự ưu tiên)

| Priority | File | Mô tả |
|----------|------|--------|
| 1 | `.agent/PROJECT-STATE.md` | State hiện tại |
| 1 | `.agent/SESSION-LOG.md` | Lịch sử |
| 2 | `res/DOMAIN/*.md` | Domain schemas |
| 3 | `flow/*.md` | Business flows |
| 4 | `err/CODES/*.md` | Error codes |
| 5 | `docs/04-API-REFERENCE/` | API docs |
| 6 | `docs/05-DATABASE/` | DB schemas |

---

## 📊 BÁO CÁO SAU MỖI PHIÊN

**SAU KHI LÀM XONG → TẠO FILE TRONG `res/claude/`**

### Naming
```
res/claude/YYYY-MM-DD-sessionN.md
```

### Format mẫu: xem `.agent/TEMPLATES/session-report.md`

---

## ⚠️ NGUYÊN TẮC

1. **KHÔNG** tự ý push lên main → Hỏi user
2. **LUÔN** update PROJECT-STATE.md khi thay đổi lớn
3. **LUÔN** append vào SESSION-LOG.md
4. **LUÔN** tạo báo cáo session
5. **KHÔNG** skip bước onboarding
6. **LUÔN** commit với message rõ ràng theo convention
7. **LUÔN** test build trước khi commit

---

## 🔗 Quick Links

- [Onboarding Checklist](.agent/WORKFLOW.md#onboarding-checklist)
- [Git Workflow](.agent/WORKFLOW.md)
- [Session Template](.agent/TEMPLATES/session-report.md)
- [Project State](.agent/PROJECT-STATE.md)
- [Session Log](.agent/SESSION-LOG.md)
- [Domain Schemas](res/DOMAIN/)
- [Business Flows](flow/)
- [Error Codes](err/CODES/)

---

*Maintained by: Claude*
*Version: 2.0*