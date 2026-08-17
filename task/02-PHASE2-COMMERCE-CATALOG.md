# 📋 PHASE 2: Commerce & Catalog
**Thời gian ước tính: 4-6 tuần**

## Mục tiêu
- Commerce Service hoàn chỉnh (Books, Cart, Orders)
- Catalog management (Categories, Authors, Publishers)
- Inventory management
- Checkout flow

---

## 🐙 Tasks

### Sprint 5: Catalog Management (1 tuần)

| Task | Người | Priority | Mô tả | Trạng thái |
|------|-------|---------|-------|------------|
| T5.1 | HUY | HIGH | Database schema: categories (tree), authors, publishers | ✅ Hoàn thành |
| T5.2 | HUY | HIGH | Categories CRUD (nested categories) | ✅ Hoàn thành |
| T5.3 | HUY | HIGH | Authors CRUD | ✅ Hoàn thành |
| T5.4 | HUY | HIGH | Publishers CRUD | ✅ Hoàn thành |
| T5.5 | KIEN | HIGH | Search với PostgreSQL full-text search | ✅ Hoàn thành |
| T5.6 | KIEN | MEDIUM | Category API với pagination | ✅ Hoàn thành |

---

### Sprint 6: Books Management (1.5 tuần)

| Task | Người | Priority | Mô tả | Trạng thái |
|------|-------|---------|-------|------------|
| T6.1 | HUY | HIGH | Database schema: books, physical_book_details, digital_book_details | ✅ Hoàn thành |
| T6.2 | HUY | HIGH | Books CRUD (Business creates books) | ✅ Hoàn thành |
| T6.3 | HUY | HIGH | Physical book details (stock, dimensions, weight) | ✅ Hoàn thành |
| T6.4 | HUY | HIGH | Digital book details (PDF key storage, preview) | ✅ Hoàn thành |
| T6.5 | HUY | HIGH | Book upload (cover image via Cloudinary, PDF via R2) | ✅ Hoàn thành |
| T6.6 | KIEN | HIGH | Book publishing workflow (DRAFT → PUBLISHED) | ✅ Hoàn thành |
| T6.7 | KIEN | HIGH | Book listing với filters (category, author, price range) | ✅ Hoàn thành |
| T6.8 | HUY | MEDIUM | Book search với Elasticsearch/Postgres | ✅ Hoàn thành (PostgreSQL) |

---

### Sprint 7: Cart Service (1 tuần)

| Task | Người | Priority | Mô tả |
|------|-------|---------|--------|
| T7.1 | KIEN | HIGH | Database schema: cart, cart_items |
| T7.2 | KIEN | HIGH | Add to cart (với validation: stock, format) |
| T7.3 | KIEN | HIGH | Update cart item quantity |
| T7.4 | KIEN | HIGH | Remove from cart |
| T7.5 | KIEN | HIGH | Get cart (grouped by store) |
| T7.6 | HUY | HIGH | Clear cart |
| T7.7 | HUY | MEDIUM | Cart persistence (Redis + PostgreSQL) |
| T7.8 | KIEN | MEDIUM | Prevent duplicate digital books |

---

### Sprint 8: Checkout & Orders (1.5 tuần)

| Task | Người | Priority | Mô tả | Status |
|------|-------|---------|-------|--------|
| T8.1 | KIEN | HIGH | Database schema: orders, seller_orders, order_items | DONE |
| T8.2 | KIEN | HIGH | Order creation (split by store) | DONE |
| T8.3 | KIEN | HIGH | Order listing (user view, seller view) | DONE |
| T8.4 | KIEN | HIGH | Order details | DONE |
| T8.5 | HUY | HIGH | Checkout preview (calculate totals, shipping) | DONE |
| T8.6 | HUY | HIGH | Inventory reservation | DONE |
| T8.7 | HUY | HIGH | Seller order management (confirm, prepare, ship, deliver) | DONE |
| T8.8 | HUY | HIGH | Order cancellation (release inventory) | DONE |
| T8.9 | KIEN | MEDIUM | Order status updates | DONE |
| T8.10 | HUY | MEDIUM | Order tracking timeline | DONE |

---

## 📊 Progress Tracking

```
✅ Sprint 5: Catalog Management
✅ Sprint 6: Books Management
✅ Sprint 7: Cart Service
✅ Sprint 8: Checkout & Orders

📦 Deliverables Phase 2:
- [x] Catalog API (Categories, Authors, Publishers)
- [x] Books CRUD với 2 formats (Physical, Digital)
- [x] Multi-store Cart
- [x] Order flow hoàn chỉnh
- [x] Seller order management
```

---

## 🔗 Dependencies

- Sprint 6 cần Sprint 5 xong
- Sprint 7 cần Sprint 6 xong (cần books)
- Sprint 8 cần Sprint 7 xong (cần cart)

---

## 📝 Notes

**KIEN:** Tập trung Checkout, Orders, Cart logic
**HUY:** Tập trung Books, Catalog, Inventory
