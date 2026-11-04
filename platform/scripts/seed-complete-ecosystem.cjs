/**
 * HUKI EBOOK - SEED COMPLETE INTERLINKED ECOSYSTEM
 * Connects 100% PK/FK chains across all 5 databases:
 * Identity -> Business -> Commerce -> Shipping -> Promotion
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Resolve database configuration
const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = Number(process.env.DATABASE_PORT || 5432);
const DB_USER = process.env.DATABASE_USER || 'postgres';
const DB_PASS = process.env.POSTGRES_PASSWORD || 'postgres123';

function getDbClient(dbName) {
  return new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: dbName,
  });
}

const BUYER_NAMES = [
  'Nguyễn Văn An',
  'Trần Thị Bích',
  'Lê Quang Minh',
  'Phạm Hoàng Nam',
  'Võ Thị Mai',
  'Đặng Tuấn Kiệt',
  'Bùi Thu Hà',
  'Hồ Minh Trí',
  'Dương Quốc Bảo',
  'Ngô Thanh Vân',
  'Lý Gia Hân',
  'Đỗ Đức Huy',
  'Trịnh Thùy Linh',
  'Mai Văn Long',
  'Đoàn Khánh Ngọc',
  'Phan Anh Quân',
  'Lương Hải Yến',
  'Vũ Nhật Minh',
  'Trương Mỹ Duyên',
  'Cao Tiến Đạt',
];

const PROVINCES = [
  { p: 'TP. Hồ Chí Minh', d: 'Quận 1', w: 'Phường Bến Nghé', a: '123 Lê Duẩn' },
  { p: 'TP. Hồ Chí Minh', d: 'Quận 3', w: 'Phường Võ Thị Sáu', a: '45 Võ Văn Tần' },
  { p: 'TP. Hồ Chí Minh', d: 'Bình Thạnh', w: 'Phường 25', a: '88 Nguyễn Xí' },
  { p: 'Hà Nội', d: 'Hoàn Kiếm', w: 'Phường Tràng Tiền', a: '12 Tràng Tiền' },
  { p: 'Hà Nội', d: 'Cầu Giấy', w: 'Phường Dịch Vọng', a: '68 Cầu Giấy' },
  { p: 'Đà Nẵng', d: 'Hải Châu', w: 'Phường Thạch Thang', a: '15 Bạch Đằng' },
];

async function runSeed() {
  console.log('===============================================================');
  console.log('🚀 BẮT ĐẦU SEED HỆ SINH THÁI ĐỒNG BỘ 100% PK/FK CHO HUKI EBOOK');
  console.log('===============================================================\n');

  const dbPrefix = process.env.DB_PREFIX || process.env.DB_NAME_PREFIX || 'huki';
  const idClient = getDbClient(`${dbPrefix}_identity`);
  const bizClient = getDbClient(`${dbPrefix}_business`);
  const comClient = getDbClient(`${dbPrefix}_commerce`);
  const shipClient = getDbClient(`${dbPrefix}_shipping`);
  const proClient = getDbClient(`${dbPrefix}_promotion`);

  await idClient.connect();
  await bizClient.connect();
  await comClient.connect();
  await shipClient.connect();
  await proClient.connect();

  try {
    // -------------------------------------------------------------
    // 1. IDENTITY: TẠO 20 BUYERS + 1 SELLER 2 + 1 SHIPPER + 1 AFFILIATE
    // -------------------------------------------------------------
    console.log('[1/8] 👤 Đang tạo tài khoản trong huki_identity...');
    const hashedPass = await bcrypt.hash('Buyer123!@#', 10);

    // 20 Buyers
    const buyerIds = [];
    for (let i = 1; i <= 20; i++) {
      const idx = String(i).padStart(2, '0');
      const email = `buyer${idx}@gmail.com`;
      const name = BUYER_NAMES[i - 1];
      const buyerId = `b0000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
      buyerIds.push({ id: buyerId, email, name });

      await idClient.query(
        `
        INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, has_completed_onboarding, updated_at)
        VALUES ($1, $2, $3, $4, 'USER', 'ACTIVE', NOW(), true, NOW())
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, status = 'ACTIVE'
      `,
        [buyerId, email, hashedPass, name]
      );
    }
    console.log(`  + Đã tạo/cập nhật 20 Buyer (Mật khẩu: Buyer123!@#)`);

    // Seller 2
    const seller2Id = 's002-0000-4000-8000-000000000002';
    await idClient.query(
      `
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, has_completed_onboarding, updated_at)
      VALUES ($1, 'seller2@huki.com', $2, 'Nhà Sách Nhã Nam Official', 'BUSINESS', 'ACTIVE', NOW(), true, NOW())
      ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'BUSINESS', status = 'ACTIVE'
    `,
      [seller2Id, hashedPass]
    );

    // Shipper Staff
    const shipperId = 'ship-0000-4000-8000-000000000003';
    await idClient.query(
      `
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, has_completed_onboarding, updated_at)
      VALUES ($1, 'shipper@huki.com', $2, 'Nguyễn Văn Giao (Shipper HUKI)', 'DELIVERY_STAFF', 'ACTIVE', NOW(), true, NOW())
      ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'DELIVERY_STAFF', status = 'ACTIVE'
    `,
      [shipperId, hashedPass]
    );

    // Affiliate Partner
    const affiliateUserId = 'aff0-0000-4000-8000-000000000004';
    await idClient.query(
      `
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, has_completed_onboarding, updated_at)
      VALUES ($1, 'affiliate@huki.com', $2, 'Trần Review Sách (Top KOC)', 'USER', 'ACTIVE', NOW(), true, NOW())
      ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, status = 'ACTIVE'
    `,
      [affiliateUserId, hashedPass]
    );
    console.log('  + Đã tạo Seller 2, Shipper, và Đối tác Affiliate.');

    // -------------------------------------------------------------
    // 2. BUSINESS: TẠO GIAN HÀNG THỨ 2 (STORE 2) TRONG huki_business
    // -------------------------------------------------------------
    console.log('\n[2/8] 🏪 Đang thiết lập Store 2 (Nhã Nam Books) trong huki_business...');
    const biz2Id = 'biz-002-nhanam-official';
    const store2Id = 'store-002-nhanam-books';

    await bizClient.query(
      `
      INSERT INTO businesses (id, name, email, phone, address, business_type, status, owner_id, updated_at)
      VALUES ($1, 'CÔNG TY CỔ PHẦN VĂN HÓA VÀ TRUYỀN THÔNG NHÃ NAM', 'seller2@huki.com', '0909123456', '59 Đỗ Quang, Cầu Giấy, Hà Nội', 'CORPORATION', 'APPROVED', $2, NOW())
      ON CONFLICT (id) DO UPDATE SET status = 'APPROVED'
    `,
      [biz2Id, seller2Id]
    );

    await bizClient.query(
      `
      INSERT INTO stores (id, name, slug, description, email, phone, status, is_active, business_id, updated_at)
      VALUES ($1, 'Nhã Nam Books Official', 'nha-nam-books-official', 'Gian hàng chính hãng Nhã Nam Books phân phối sách bản quyền trên sàn HUKI Ebook.', 'seller2@huki.com', '0909123456', 'APPROVED', true, $2, NOW())
      ON CONFLICT (id) DO UPDATE SET status = 'APPROVED', is_active = true
    `,
      [store2Id, biz2Id]
    );
    console.log(`  + Đã tạo Store 2: 'Nhã Nam Books Official' (ID: ${store2Id})`);

    // -------------------------------------------------------------
    // 3. COMMERCE: LẤY SÁCH STORE 1 VÀ CLONE SANG STORE 2 (GIÁ -10%)
    // -------------------------------------------------------------
    console.log('\n[3/8] 📚 Đang clone toàn bộ sách Store 1 sang Store 2 (chênh lệch giá -10%)...');
    const store1BooksRes = await comClient.query(`
      SELECT * FROM books WHERE store_id = '3094e54e-2549-42cc-92fb-14a8f8589277' AND status = 'PUBLISHED'
    `);
    const store1Books = store1BooksRes.rows;
    console.log(`  + Tìm thấy ${store1Books.length} cuốn sách của Store 1.`);

    const store2BookMap = new Map();
    for (const b of store1Books) {
      const s2BookId = `s2-${b.id}`;
      const s2Slug = `nn-${b.slug}`;
      const discountedPrice = Math.max(20000, Math.round((Number(b.price) * 0.9) / 1000) * 1000);

      await comClient.query(
        `
        INSERT INTO books (
          id, store_id, owner_user_id, title, slug, normalized_title, isbn,
          description, price, category_id, author_id, publisher_id, format,
          cover_url, status, published_at, view_count, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'PUBLISHED', NOW(), 150, NOW())
        ON CONFLICT (store_id, slug) DO UPDATE SET price = EXCLUDED.price, status = 'PUBLISHED'
      `,
        [
          s2BookId,
          store2Id,
          seller2Id,
          b.title,
          s2Slug,
          b.normalized_title,
          b.isbn,
          b.description,
          discountedPrice,
          b.category_id,
          b.author_id,
          b.publisher_id,
          b.format,
          b.cover_url,
        ]
      );

      // Copy physical details
      await comClient.query(
        `
        INSERT INTO physical_book_details (id, book_id, stock, reserved, weight, dimensions, page_count, physical_enabled, updated_at)
        VALUES ($1, $2, 90, 0, 350.0, '14.5 x 20.5 cm', 260, true, NOW())
        ON CONFLICT (book_id) DO UPDATE SET stock = EXCLUDED.stock, physical_enabled = true
      `,
        [`phys-${s2BookId}`, s2BookId]
      );

      // Copy digital details
      await comClient.query(
        `
        INSERT INTO digital_book_details (id, book_id, pdf_key, epub_key, preview_pdf_key, digital_enabled, access_type, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, 'FREE', NOW())
        ON CONFLICT (book_id) DO UPDATE SET digital_enabled = true
      `,
        [
          `dig-${s2BookId}`,
          s2BookId,
          `ebooks/${b.slug}.pdf`,
          `ebooks/${b.slug}.epub`,
          `ebooks/previews/${b.slug}-preview.pdf`,
        ]
      );

      store2BookMap.set(b.id, s2BookId);
    }
    console.log(`  + Đã nhân bản thành công ${store1Books.length} cuốn sách sang Store 2 với giá giảm 10%!`);

    // -------------------------------------------------------------
    // 4. DRM LICENSES & DEVICES TRONG huki_commerce
    // -------------------------------------------------------------
    console.log('\n[4/8] 🔐 Đang thiết lập DRM Licenses & Thiết bị đọc cho 20 Buyer...');
    const allBooksRes = await comClient.query(`SELECT id, title FROM books WHERE status = 'PUBLISHED'`);
    for (const b of allBooksRes.rows) {
      const licCode = `LIC-${b.id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      await comClient.query(
        `
        INSERT INTO drm_licenses (
          id, license_code, book_id, algorithm, encryption_cluster, key_fingerprint,
          watermark_engine, security_status, status_label, master_key_encrypted, chunk_size_kb,
          issued_licenses, active_readers, revoked_devices, updated_at
        )
        VALUES ($1, $2, $3, 'AES-GCM-256 (Chuẩn Quân Đội)', 'Singapore SG1 (AWS KMS)', $4,
                'Dynamic Reader Email Canvas', 'SECURE', 'An Toàn Tuyệt Đối', 'kms:arn:aws:kms:sg:huki-master-key', 1024,
                45, 12, 0, NOW())
        ON CONFLICT (book_id) DO NOTHING
      `,
        [`lic-${b.id}`, licCode, b.id, `FINGERPRINT-${b.id.slice(0, 8)}`]
      );
    }

    // Devices cho 20 buyers
    const DEVICE_MODELS = ['iPhone 15 Pro Max', 'Chrome trên Windows 11', 'MacBook Air M2', 'iPad Pro 11-inch'];
    for (let i = 0; i < buyerIds.length; i++) {
      const buyer = buyerIds[i];
      const model = DEVICE_MODELS[i % DEVICE_MODELS.length];
      await comClient.query(
        `
        INSERT INTO drm_devices (id, user_id, device_id, device_name, device_model, ip_address, is_revoked, last_active_at)
        VALUES ($1, $2, $3, $4, $5, '103.67.197.73', false, NOW())
        ON CONFLICT (user_id, device_id) DO NOTHING
      `,
        [`dev-${buyer.id}`, buyer.id, `DEVICE-HWID-${buyer.id.slice(0, 8)}`, model, model]
      );
    }
    console.log('  + Đã tạo DRM Licenses và Thiết bị đọc DRM thành công.');

    // -------------------------------------------------------------
    // 5. SHIPPING: ĐỊA CHỈ NHẬN HÀNG & NHÂN VIÊN GIAO HÀNG
    // -------------------------------------------------------------
    console.log('\n[5/8] 🚚 Đang thiết lập Hồ sơ Shipper và Địa chỉ nhận hàng...');
    for (let i = 0; i < buyerIds.length; i++) {
      const buyer = buyerIds[i];
      const prov = PROVINCES[i % PROVINCES.length];
      await shipClient.query(
        `
        INSERT INTO addresses (id, user_id, name, phone, address, province, district, ward, is_default, updated_at)
        VALUES ($1, $2, $3, '0901234567', $4, $5, $6, $7, true, NOW())
        ON CONFLICT (id) DO NOTHING
      `,
        [`addr-${buyer.id}`, buyer.id, buyer.name, prov.a, prov.p, prov.d, prov.w]
      );
    }

    const staffId = 'staff-shipper-01';
    await shipClient.query(
      `
      INSERT INTO delivery_staff (id, user_id, name, phone, email, status, current_area, updated_at)
      VALUES ($1, $2, 'Nguyễn Văn Giao (Shipper HUKI)', '0908889999', 'shipper@huki.com', 'ACTIVE', 'TP. Hồ Chí Minh', NOW())
      ON CONFLICT (user_id) DO UPDATE SET status = 'ACTIVE'
    `,
      [staffId, shipperId]
    );
    console.log('  + Đã tạo Sổ địa chỉ 20 Buyer và Nhân viên giao hàng Shipper.');

    // -------------------------------------------------------------
    // 6. PROMOTION: KÍCH HOẠT FLASH SALE VÀ BỘ VOUCHER ĐANG CHẠY (HẠN ĐẾN THÁNG 12/2026)
    // -------------------------------------------------------------
    console.log('\n[6/8] ⚡ Đang mở chiến dịch Flash Sale & Gia hạn Bộ Voucher đến 31/12/2026...');
    const flashSaleId = 'flash-sale-active-2026';
    await proClient.query(
      `
      INSERT INTO flash_sales (
        id, name, description, starts_at, ends_at, status, discount_percent, max_stores, min_stores, scope, updated_at
      )
      VALUES ($1, '⚡ SĂN DEAL GIỜ VÀNG HUKI (Tháng 11 - 12)', 'Chiến dịch giảm giá sốc tri ân độc giả HUKI Ebook.',
              NOW() - INTERVAL '2 days', NOW() + INTERVAL '60 days', 'ACTIVE', 35, 10, 1, 'PLATFORM', NOW())
      ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', ends_at = NOW() + INTERVAL '60 days'
    `,
      [flashSaleId]
    );

    // Gắn 10 cuốn sách thật vào Flash Sale
    const fsBooks = store1Books.slice(0, 10);
    for (const b of fsBooks) {
      const origPrice = Number(b.price);
      const salePrice = Math.round((origPrice * 0.65) / 1000) * 1000;
      await proClient.query(
        `
        INSERT INTO flash_sale_items (id, flash_sale_id, book_id, original_price, sale_price, stock, sold, max_per_user, store_id)
        VALUES ($1, $2, $3, $4, $5, 60, 32, 2, $6)
        ON CONFLICT (id) DO UPDATE SET sale_price = EXCLUDED.sale_price, sold = EXCLUDED.sold
      `,
        [`fsi-${b.id}`, flashSaleId, b.id, origPrice, salePrice, b.store_id]
      );
    }

    // Cập nhật/Tạo Vouchers
    const VOUCHERS_LIST = [
      { code: 'HUKINEW', name: 'Voucher Khách Mới Giảm 20%', type: 'PERCENTAGE', val: 20, min: 50000, max: 30000 },
      { code: 'HUKI10', name: 'Voucher Độc Giả Thân Thiết Giảm 10%', type: 'PERCENTAGE', val: 10, min: 100000, max: 50000 },
      { code: 'FREESHIP', name: 'Miễn Phí Vận Chuyển 30k', type: 'FIXED_AMOUNT', val: 30000, min: 80000, max: 30000 },
      { code: 'SHOP15', name: 'Ưu Đãi Đặc Biệt Từ Shop 15%', type: 'PERCENTAGE', val: 15, min: 90000, max: 40000 },
    ];

    for (const v of VOUCHERS_LIST) {
      await proClient.query(
        `
        INSERT INTO vouchers (
          id, code, name, description, type, value, min_order_amount, max_discount_amount, scope,
          total_usage, max_usage_per_user, current_usage, starts_at, expires_at, status, target_audience, updated_at
        )
        VALUES ($1, $2, $3, $3, $4, $5, $6, $7, 'PLATFORM', 500, 5, 24, NOW() - INTERVAL '5 days', NOW() + INTERVAL '60 days', 'ACTIVE', 'ALL', NOW())
        ON CONFLICT (code) DO UPDATE SET
          expires_at = NOW() + INTERVAL '60 days',
          status = 'ACTIVE',
          min_order_amount = EXCLUDED.min_order_amount,
          max_discount_amount = EXCLUDED.max_discount_amount
      `,
        [`vouch-${v.code}`, v.code, v.name, v.type, v.val, v.min, v.max]
      );
    }
    console.log('  + Đã kích hoạt Flash Sale 35% và 4 Mã Voucher còn hạn đến cuối năm!');

    // -------------------------------------------------------------
    // 7. AFFILIATE & VÍ TIỀN SELLER TRONG huki_commerce
    // -------------------------------------------------------------
    console.log('\n[7/8] 💼 Đang thiết lập Hồ sơ Affiliate KOC và Ví tiền của 2 Seller...');
    const affProfileId = 'aff-profile-01';
    await comClient.query(
      `
      INSERT INTO affiliate_profiles (
        id, user_id, affiliate_code, display_name, bio, contact_email, contact_phone, applicant_type,
        promotion_description, has_paid_traffic, content_categories, promotion_methods, payout_setup_later, status, version, updated_at
      )
      VALUES ($1, $2, 'HUKI_KOC_2026', 'Trần Review Sách (Top KOC)', 'Kênh đánh giá sách tinh hoa hàng đầu', 'affiliate@huki.com', '0912345678', 'INDIVIDUAL',
              'Chia sẻ sách hay trên TikTok và Blog cá nhân', false, '["van-hoc","kinh-doanh"]'::jsonb, '["social","blog"]'::jsonb, true, 'ACTIVE', 1, NOW())
      ON CONFLICT (user_id) DO UPDATE SET status = 'ACTIVE'
    `,
      [affProfileId, affiliateUserId]
    );

    await comClient.query(
      `
      INSERT INTO affiliate_wallets (
        id, affiliate_profile_id, user_id, available_balance, pending_balance, lifetime_earned, currency, version, updated_at
      )
      VALUES ($1, $2, $3, 540000, 120000, 660000, 'VND', 1, NOW())
      ON CONFLICT (user_id) DO UPDATE SET available_balance = EXCLUDED.available_balance
    `,
      ['aff-wallet-01', affProfileId, affiliateUserId]
    );

    // Wallets for Store 1 & Store 2
    const store1Owner = '8d501a4d-d846-45bd-8f15-fda4e30cf826';
    await comClient.query(
      `
      INSERT INTO wallets (id, store_id, owner_user_id, available_balance, pending_balance, currency, version, updated_at)
      VALUES ('w-store-01', '3094e54e-2549-42cc-92fb-14a8f8589277', $1, 4850000, 0, 'VND', 1, NOW())
      ON CONFLICT (store_id) DO UPDATE SET available_balance = EXCLUDED.available_balance
    `,
      [store1Owner]
    );

    await comClient.query(
      `
      INSERT INTO wallets (id, store_id, owner_user_id, available_balance, pending_balance, currency, version, updated_at)
      VALUES ('w-store-02', $1, $2, 3200000, 0, 'VND', 1, NOW())
      ON CONFLICT (store_id) DO UPDATE SET available_balance = EXCLUDED.available_balance
    `,
      [store2Id, seller2Id]
    );
    console.log('  + Đã thiết lập Ví Affiliate và Ví doanh thu cho cả 2 Store.');

    // -------------------------------------------------------------
    // 8. TẠO 50 ĐƠN HÀNG THẬT MÓC NỐI 100% CÁC BẢNG (KÉO SHIPPER, DRM, AFF, VOUCHER)
    // -------------------------------------------------------------
    console.log('\n[8/8] 🛒 Đang sinh 50 Đơn hàng hoàn tất kết nối toàn diện PK/FK...');
    const allStoreBooks = [...store1Books, ...Array.from(store2BookMap.values()).map(id => ({ id }))];

    for (let i = 1; i <= 50; i++) {
      const buyer = buyerIds[(i - 1) % buyerIds.length];
      const isStore1 = i % 2 !== 0;
      const targetStoreId = isStore1 ? '3094e54e-2549-42cc-92fb-14a8f8589277' : store2Id;
      const targetOwnerId = isStore1 ? store1Owner : seller2Id;

      // Chọn 1 cuốn sách của store đó
      const bookIndex = (i * 3) % store1Books.length;
      const baseBook = store1Books[bookIndex];
      const selectedBookId = isStore1 ? baseBook.id : store2BookMap.get(baseBook.id) || baseBook.id;
      const bookTitle = baseBook.title;
      const unitPrice = isStore1 ? Number(baseBook.price) : Math.round((Number(baseBook.price) * 0.9) / 1000) * 1000;
      const isPhysical = i % 3 !== 0; // 2/3 là sách giấy, 1/3 là Ebook

      const orderId = `ord-real-2026-${String(i).padStart(4, '0')}`;
      const sellerOrderId = `sord-real-2026-${String(i).padStart(4, '0')}`;
      const orderCode = `ORD-2026-${String(i).padStart(4, '0')}`;
      const sellerOrderCode = `SORD-2026-${String(i).padStart(4, '0')}`;

      const subtotal = unitPrice;
      const shippingTotal = isPhysical ? 30000 : 0;
      const discountTotal = i % 4 === 0 ? 20000 : 0; // Áp voucher cho 1 số đơn
      const grandTotal = Math.max(0, subtotal + shippingTotal - discountTotal);

      const prov = PROVINCES[i % PROVINCES.length];
      const shippingAddress = {
        name: buyer.name,
        phone: '0901234567',
        address: prov.a,
        ward: prov.w,
        district: prov.d,
        province: prov.p,
      };

      // 8.1. Insert orders
      await comClient.query(
        `
        INSERT INTO orders (
          id, code, user_id, idempotency_key, item_subtotal, shipping_total, discount_total, grand_total,
          payment_method, payment_provider, payment_status, status, shipping_address, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ONLINE_PAYMENT', 'PAYOS', 'SUCCEEDED', 'COMPLETED', $9, NOW())
        ON CONFLICT (id) DO UPDATE SET status = 'COMPLETED', payment_status = 'SUCCEEDED'
      `,
        [
          orderId,
          orderCode,
          buyer.id,
          `idem-${orderId}`,
          subtotal,
          shippingTotal,
          discountTotal,
          grandTotal,
          JSON.stringify(shippingAddress),
        ]
      );

      // 8.2. Insert seller_orders
      await comClient.query(
        `
        INSERT INTO seller_orders (
          id, order_id, code, store_id, owner_user_id, requires_shipping, item_subtotal, shipping_fee, grand_total,
          status, carrier, tracking_code, confirmed_at, shipped_at, completed_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'COMPLETED', 'GHTK', $10, NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET status = 'COMPLETED'
      `,
        [
          sellerOrderId,
          orderId,
          sellerOrderCode,
          targetStoreId,
          targetOwnerId,
          isPhysical,
          subtotal,
          shippingTotal,
          grandTotal,
          `GHTK${String(i).padStart(8, '0')}`,
        ]
      );

      // 8.3. Insert order_items (để kéo hàm aggregate soldCount thật)
      const orderItemId = `item-${orderId}`;
      await comClient.query(
        `
        INSERT INTO order_items (id, seller_order_id, book_id, book_title, format, quantity, "unitPrice", subtotal)
        VALUES ($1, $2, $3, $4, $5, 1, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `,
        [orderItemId, sellerOrderId, selectedBookId, bookTitle, isPhysical ? 'Sách giấy' : 'Ebook DRM', unitPrice, subtotal]
      );

      // 8.4. Insert order_status_history
      await comClient.query(
        `
        INSERT INTO order_status_history (id, order_id, seller_order_id, from_status, to_status, title, description, actor_type, created_at)
        VALUES ($1, $2, $3, 'SHIPPED', 'COMPLETED', 'Đơn hàng đã hoàn tất', 'Khách hàng đã nhận sách thành công', 'SYSTEM', NOW())
        ON CONFLICT (id) DO NOTHING
      `,
        [`osh-${orderId}`, orderId, sellerOrderId]
      );

      // 8.5. Insert payments
      await comClient.query(
        `
        INSERT INTO payments (id, order_id, amount, method, status, provider, transaction_id, paid_at, updated_at)
        VALUES ($1, $2, $3, 'ONLINE_PAYMENT', 'SUCCEEDED', 'PAYOS', $4, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `,
        [`pay-${orderId}`, orderId, grandTotal, `PAYOS-TXN-${String(i).padStart(6, '0')}`]
      );

      // 8.6. Nếu có Voucher -> ghi nhận vào voucher_usages trong huki_promotion
      if (discountTotal > 0) {
        await proClient.query(
          `
          INSERT INTO voucher_usages (id, voucher_id, user_id, order_id, discount)
          VALUES ($1, 'vouch-HUKI10', $2, $3, $4)
          ON CONFLICT (id) DO NOTHING
        `,
          [`vuse-${orderId}`, buyer.id, orderId, discountTotal]
        );
      }

      // 8.7. Nếu là sách giấy -> KÉO SHIPPER trong huki_shipping
      if (isPhysical) {
        const shipmentId = `ship-${sellerOrderId}`;
        const trackingNum = `GHTK-VN-${String(i).padStart(8, '0')}`;
        await shipClient.query(
          `
          INSERT INTO shipments (
            id, seller_order_id, tracking_number, carrier, status, receiver_name, receiver_phone,
            address, province, district, ward, shipping_fee, cod_fee, weight, picked_up_at, shipped_at, delivered_at,
            order_id, owner_user_id, payment_method, store_id, user_id, assigned_staff_id, updated_at
          )
          VALUES ($1, $2, $3, 'GHTK', 'DELIVERED', $4, '0901234567', $5, $6, $7, $8, 30000, 0, 350,
                  NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 hours', NOW(),
                  $9, $10, 'ONLINE_PAYMENT', $11, $12, $13, NOW())
          ON CONFLICT (id) DO UPDATE SET status = 'DELIVERED'
        `,
          [
            shipmentId,
            sellerOrderId,
            trackingNum,
            buyer.name,
            prov.a,
            prov.p,
            prov.d,
            prov.w,
            orderId,
            targetOwnerId,
            targetStoreId,
            buyer.id,
            staffId,
          ]
        );

        await shipClient.query(
          `
          INSERT INTO delivery_logs (id, shipment_id, staff_id, action, note, status, source)
          VALUES ($1, $2, $3, 'DELIVERED', 'Giao hàng thành công tận tay người nhận', 'DELIVERED', 'SYSTEM')
          ON CONFLICT (id) DO NOTHING
        `,
          [`dlog-${shipmentId}`, shipmentId, staffId]
        );
      }

      // 8.8. Nếu là Ebook -> KÉO TỦ SÁCH CÁ NHÂN & TIẾN TRÌNH ĐỌC trong huki_commerce
      if (!isPhysical) {
        await comClient.query(
          `
          INSERT INTO book_accesses (
            id, user_id, book_id, order_id, seller_order_id, access_key, reading_progress, status, access_type, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, 35, 'ACTIVE', 'FREE', NOW())
          ON CONFLICT (user_id, book_id) DO UPDATE SET status = 'ACTIVE'
        `,
          [`acc-${buyer.id}-${selectedBookId}`, buyer.id, selectedBookId, orderId, sellerOrderId, `KEY-${selectedBookId.slice(0, 8)}`]
        );

        await comClient.query(
          `
          INSERT INTO reading_progress (id, user_id, book_id, current_page, percentage, updated_at)
          VALUES ($1, $2, $3, 42, 22.5, NOW())
          ON CONFLICT (user_id, book_id) DO UPDATE SET current_page = 42, percentage = 22.5
        `,
          [`prog-${buyer.id}-${selectedBookId}`, buyer.id, selectedBookId]
        );

        await comClient.query(
          `
          INSERT INTO reader_bookmarks (id, user_id, book_id, page_number, note, updated_at)
          VALUES ($1, $2, $3, 15, 'Trang sách hay và nhiều bài học sâu sắc', NOW())
          ON CONFLICT (user_id, book_id, page_number) DO NOTHING
        `,
          [`bm-${buyer.id}-${selectedBookId}-15`, buyer.id, selectedBookId]
        );
      }

      // 8.9. KÉO AFFILIATE: Một số đơn mua qua link KOC
      if (i % 3 === 0) {
        const commAmount = Math.round(unitPrice * 0.15);
        await comClient.query(
          `
          INSERT INTO affiliate_commissions (
            id, profile_id, order_id, order_item_id, store_id, book_id, book_title, book_format,
            quantity, item_price, commission_base, commission_rate, commission_amount, currency, status,
            policy_snapshot, version, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $9, 15.0, $10, 'VND', 'AVAILABLE',
                  '{"rate": 15, "type": "KOC_STANDARD"}'::jsonb, 1, NOW())
          ON CONFLICT (id) DO NOTHING
        `,
          [
            `comm-${orderId}`,
            affProfileId,
            orderId,
            orderItemId,
            targetStoreId,
            selectedBookId,
            bookTitle,
            isPhysical ? 'PHYSICAL' : 'DIGITAL',
            unitPrice,
            commAmount,
          ]
        );
      }
    }
    console.log('  + Đã tạo thành công 50 Đơn hàng hoàn tất liên kết đầy đủ Shipper, Tủ sách DRM, Affiliate, Voucher!');

    console.log('\n===============================================================');
    console.log('🎉 TẤT CẢ DỮ LIỆU ĐÃ ĐƯỢC SEED ĐỒNG BỘ 100% VÀO DATABASE THẬT!');
    console.log('===============================================================');
  } catch (err) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH SEED:', err);
  } finally {
    await idClient.end();
    await bizClient.end();
    await comClient.end();
    await shipClient.end();
    await proClient.end();
  }
}

runSeed();
