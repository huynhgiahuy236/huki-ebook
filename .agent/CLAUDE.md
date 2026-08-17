# CLAUDE.md - HUKI EBOOK Agent Instructions

> **Đọc `ebook.md` TRƯỚC KHI làm bất cứ gì**

---

## 🎯 Quick Start

1. Đọc **`ebook.md`** - Tổng quan toàn bộ project
2. Đọc **`docs/00-START-HERE/README.md`** - Chi tiết hơn
3. Bắt đầu làm việc

---

## 📁 Project Structure

```
HuKi/
├── HuKi/              ← CODE
│   ├── web/           ← Frontend (Next.js)
│   ├── platform/      ← Backend (NestJS)
│   └── mobile/        ← Mobile (Flutter)
├── docs/              ← TÀI LIỆU
├── ebook/             ← Tài liệu gốc (.docx)
├── scripts/           ← Script test
├── test/              ← File linh tinh
├── skill/             ← UI/UX skills
└── res/               ← BÁO CÁO
    └── claude/        ← Báo cáo của bạn (Claude)
```

---

## 📋 QUY ĐỊNH VỀ FILE

| Loại | Đặt ở |
|------|--------|
| **Code chính** | `HuKi/web`, `HuKi/platform`, `HuKi/mobile` |
| **Script test** | `scripts/` |
| **File linh tinh** | `test/` |
| **Design/UI** | `skill/` |
| **Báo cáo** | `res/claude/` |

---

## 📊 BÁO CÁO SAU KHI LÀM VIỆC

**SAU KHI LÀM XONG VIỆC → TẠO BÁO CÁO TRONG `res/claude/`**

### Format báo cáo

```markdown
# 📋 Báo cáo - YYYY-MM-DD

## Agent: Claude
## Thời gian: HH:MM - HH:MM

---

## ✅ Đã hoàn thành

| Task | Files | Status |
|------|-------|--------|
| [Tên task] | [File] | ✅ Done |

## 📁 Files đã tạo/sửa
- `path/to/file` - Mô tả

## 📈 Thống kê

| Metric | Số lượng |
|--------|----------|
| Files created | X |
| Files modified | X |

## 🔜 Việc cần làm tiếp
- [Task tiếp theo]

## 📝 Notes
- Ghi chú khác
```

### Ví dụ
```markdown
# 📋 Báo cáo - 2026-08-14

## Agent: Claude
## Thời gian: 14:00 - 16:00

---

## ✅ Đã hoàn thành

| Task | Files | Status |
|------|-------|--------|
| Tạo API docs | docs/04-API-REFERENCE/endpoints/orders.md | ✅ Done |

## 📁 Files đã tạo
- `docs/04-API-REFERENCE/endpoints/orders.md`

## 📈 Thống kê

| Metric | Số lượng |
|--------|----------|
| Files created | 1 |
| API endpoints | 10 |

## 🔜 Việc cần làm tiếp
- Tạo payment API docs

## 📝 Notes
- Đã thống nhất format với team
```

---

## 🏗️ Architecture

```
API Gateway (:3000)
├── Identity (:3001)    → Auth, Users
├── Business (:3002)   → Business, Stores
├── Commerce (:3003)   → Books, Cart, Orders, Payments
├── Shipping (:3004)   → Shipping
├── Community (:3005)  → Forum, Chat, Reviews
└── Promotion (:3007)  → Vouchers
```

**Stack:** NestJS, PostgreSQL, MongoDB, Redis, RabbitMQ, VNPay, MoMo, R2, Cloudinary, Firebase

---

## 🔄 Working Guidelines

### Thêm feature
1. Đọc `docs/03-PROJECTS/` - cấu trúc code
2. Xem `docs/04-API-REFERENCE/` - pattern
3. Xem `docs/05-DATABASE/` - schema
4. Implement → Update docs nếu cần

### Sửa lỗi
1. Xem error codes trong `docs/04-API-REFERENCE/`
2. Tìm service trong `docs/01-ARCHITECTURE/`

---

## 🔑 Key Files

| File | Mô tả |
|------|--------|
| **`ebook.md`** | **ĐỌC ĐẦU TIÊN** - Tổng quan project |
| `docs/00-START-HERE/README.md` | Orientation |
| `docs/04-API-REFERENCE/README.md` | API patterns |
| `docs/05-DATABASE/README.md` | Database schemas |

---

## ❓ Questions?

1. `docs/00-START-HERE/glossary.md` - Thuật ngữ
2. Hỏi team lead

---

*Last updated: 2026-08-14*
