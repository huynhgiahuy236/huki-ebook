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

| Task | Nguoi | Priority | Mo ta | Trang thai |
|------|-------|---------|-------|------------|
| T5.1 | HUY | HIGH | Database schema: categories (tree), authors, publishers | ✅ Hoan thanh |
| T5.2 | HUY | HIGH | Categories CRUD (nested categories) | ✅ Hoan thanh |
| T5.3 | HUY | HIGH | Authors CRUD | ✅ Hoan thanh |
| T5.4 | HUY | HIGH | Publishers CRUD | ✅ Hoan thanh |
| T5.5 | KIEN | HIGH | Search voi PostgreSQL full-text search | ✅ Hoan thanh |
| T5.6 | KIEN | MEDIUM | Category API voi pagination | ✅ Hoan thanh |

---

### Sprint 6: Books Management (1.5 tuan)

| Task | Nguoi | Priority | Mo ta |
|------|-------|---------|--------|
| T6.1 | HUY | HIGH | Database schema: books, physical_book_details, digital_book_details |
| T6.2 | HUY | HIGH | Books CRUD (Business creates books) |
| T6.3 | HUY | HIGH | Physical book details (stock, dimensions, weight) |
| T6.4 | HUY | HIGH | Digital book details (PDF key storage, preview) |
| T6.5 | HUY | HIGH | Book upload (cover image via Cloudinary, PDF via R2) |
| T6.6 | KIEN | HIGH | Book publishing workflow (DRAFT → PUBLISHED) |
| T6.7 | KIEN | HIGH | Book listing voi filters (category, author, price range) |
| T6.8 | HUY | MEDIUM | Book search voi Elasticsearch/Postgres |

---

### Sprint 7: Cart Service (1 tuan)

| Task | Nguoi | Priority | Mo ta | Status |
|------|-------|---------|--------|--------|
| T7.1 | KIEN | HIGH | Database schema: cart, cart_items | ✅ |
| T7.2 | KIEN | HIGH | Add to cart (voi validation: stock, format) | ✅ |
| T7.3 | KIEN | HIGH | Update cart item quantity | ✅ |
| T7.4 | KIEN | HIGH | Remove from cart | ✅ |
| T7.5 | KIEN | HIGH | Get cart (grouped by store) | ✅ |
| T7.6 | HUY | HIGH | Clear cart | ✅ |
| T7.7 | HUY | MEDIUM | Cart persistence (Redis + PostgreSQL) | ✅ |
| T7.8 | KIEN | MEDIUM | Prevent duplicate digital books | ✅ |

---

### Sprint 8: Checkout & Orders (1.5 tuan)

| Task | Nguoi | Priority | Mo ta |
|------|-------|---------|--------|
| T8.1 | KIEN | HIGH | Database schema: orders, seller_orders, order_items |
| T8.2 | KIEN | HIGH | Order creation (split by store) |
| T8.3 | KIEN | HIGH | Order listing (user view, seller view) |
| T8.4 | KIEN | HIGH | Order details |
| T8.5 | HUY | HIGH | Checkout preview (calculate totals, shipping) |
| T8.6 | HUY | HIGH | Inventory reservation |
| T8.7 | HUY | HIGH | Seller order management (confirm, prepare, ship, deliver) |
| T8.8 | HUY | HIGH | Order cancellation (release inventory) |
| T8.9 | KIEN | MEDIUM | Order status updates |
| T8.10 | HUY | MEDIUM | Order tracking timeline |

---

## 📊 Progress Tracking

```
✅ Sprint 5: Catalog Management
🔄 Sprint 6: Books Management
✅ Sprint 7: Cart Service
⬜ Sprint 8: Checkout & Orders

📦 Deliverables Phase 2:
- [x] Catalog API (Categories, Authors, Publishers)
- [ ] Books CRUD voi 2 formats (Physical, Digital)
- [x] Multi-store Cart
- [ ] Order flow hoan chinh
- [ ] Seller order management
```

---

## 🔗 Dependencies

- Sprint 6 can Sprint 5 xong
- Sprint 7 can Sprint 6 xong (can books)
- Sprint 8 can Sprint 7 xong (can cart)

---

## 📝 Notes

**KIEN:** Tap trung Checkout, Orders, Cart logic
**HUY:** Tap trung Books, Catalog, Inventory
