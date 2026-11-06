# BÁO CÁO TRIỂN KHAI UAT, DATABASE MIGRATIONS & CONTAINER HEALTH AUDIT
## MÔI TRƯỜNG UAT / STAGING (STACK: DOCKER-COMPOSE.UAT.YML)

---

## 1. ĐỒNG BỘ MÃ NGUỒN & COMMIT HASH
- **Branch**: `develop`
- **Remote Repository**: `https://github.com/huynhgiahuy236/huki-ebook.git`
- **Commit Hash HEAD**: `d2f00d9`
- **Thông điệp Commit**: `fix(commerce-migrations): ensure 20260821000000_init is idempotent on fresh databases`
- **Trạng thái Git Local**: `nothing to commit, working tree clean`
- **Trạng thái Đồng bộ Remote**: Đã đồng bộ (`git push origin develop` thành công 100%).

---

## 2. KẾT QUẢ THỰC THI DATABASE MIGRATIONS TRÊN CỤM UAT

### 2.1. `identity-service` (`huki_uat_identity`)
```
Prisma schema loaded from apps\identity-service\prisma\schema.prisma
Datasource "db": PostgreSQL database "huki_uat_identity", schema "public" at "localhost:5432"

4 migrations found in prisma/migrations
Applying migration `20260817134927_init`
Applying migration `20260827080000_add_email_verification_expires_at`
Applying migration `20260827235500_add_identity_outbox`
Applying migration `20261021160000_add_user_onboarding_preferences`

All migrations have been successfully applied.
```

### 2.2. `business-service` (`huki_uat_business`)
```
Prisma schema loaded from apps\business-service\prisma\schema.prisma
Datasource "db": PostgreSQL database "huki_uat_business", schema "public" at "localhost:5432"

1 migration found in prisma/migrations
Applying migration `20260817135224_init`

All migrations have been successfully applied.
```

### 2.3. `commerce-service` (`huki_uat_commerce`)
```
Prisma schema loaded from apps\commerce-service\prisma\schema.prisma
Datasource "db": PostgreSQL database "huki_uat_commerce", schema "public" at "localhost:5432"

13 migrations found in prisma/migrations
Applying migration `20260818125035_init`
Applying migration `20260821000000_init`
Applying migration `20260821010000_sprint11_events`
Applying migration `20260918235000_reader_bookmarks_progress`
Applying migration `20260919001000_forensic_evidence`
Applying migration `20260919020000_seller_wallet`
Applying migration `20260919021500_double_entry_ledger`
Applying migration `20260919030000_wallet_security_and_audit`
Applying migration `20260919040000_payout_requests`
Applying migration `20260919050000_bank_payout_disbursement`
Applying migration `20260919060000_finance_reconciliation_runs`
Applying migration `20260920090000_sanction_enforcement_logic`
Applying migration `20261021210000_affiliate_marketing_foundation`

All migrations have been successfully applied.
```

### 2.4. `shipping-service` (`huki_uat_shipping`)
```
Prisma schema loaded from apps\shipping-service\prisma\schema.prisma
Datasource "db": PostgreSQL database "huki_uat_shipping", schema "public" at "localhost:5432"

3 migrations found in prisma/migrations
Applying migration `20260817135319_init`
Applying migration `20260821010000_sprint11_events`
Applying migration `20260827090000_align_shipping_schema`

All migrations have been successfully applied.
```

### 2.5. `promotion-service` (`huki_uat_promotion`)
```
Prisma schema loaded from apps\promotion-service\prisma\schema.prisma
Datasource "db": PostgreSQL database "huki_uat_promotion", schema "public" at "localhost:5432"

4 migrations found in prisma/migrations
Applying migration `20260817135338_init`
Applying migration `20260824062827_init_promotions`
Applying migration `20260916073000_add_flash_sale_banner`
Applying migration `20261105000000_add_voucher_target_audience`

All migrations have been successfully applied.
```

### 2.6. `analytics-service` (`huki_uat_analytics`)
```
Prisma schema loaded from apps\analytics-service\prisma\schema.prisma
Datasource "db": PostgreSQL database "huki_uat_analytics", schema "public" at "localhost:5432"

1 migration found in prisma/migrations
Applying migration `20260919000000_init_analytics`

All migrations have been successfully applied.
```

---

## 3. BẢNG KIỂM TOÁN TRẠNG THÁI 13 CONTAINERS STACK UAT
(Đang cập nhật sau khi container startup hoàn tất...)

