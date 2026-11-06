// /**
//  * TEST 4: MULTI-TENANT SELLER SCOPING & ANTI-IDOR/BOLA VERIFICATION
//  * File: scriptstest/audit/commerce-service/test_seller_data_isolation.ts
//  * Target: commerce-service (Port 3003) Seller APIs (Orders, Books, Wallet)
//  * Database: PostgreSQL huki_commerce & huki_business
//  */
//
// import { Client } from 'pg';
// import * as jwt from 'jsonwebtoken';
//
// const COMMERCE_URL = process.env.COMMERCE_SERVICE_URL || 'http://localhost:3003';
// const COMMERCE_DB_URL = process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce';
// const BUSINESS_DB_URL = process.env.BUSINESS_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_business';
// const JWT_SECRET = process.env.JWT_SECRET || '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0';
//
// async function runTest() {
//   console.log('===============================================================');
//   console.log('🚀 [TEST 4] KIỂM CHỨNG CÔ LẬP DỮ LIỆU ĐA GIAN HÀNG (MULTI-TENANT & ANTI-IDOR/BOLA)');
//   console.log(`🎯 Target Commerce URL: ${COMMERCE_URL}`);
//   console.log(`🗄️ Commerce DB:          ${COMMERCE_DB_URL}`);
//   console.log(`🗄️ Business DB:          ${BUSINESS_DB_URL}`);
//   console.log('===============================================================\n');
//
//   let passed = 0;
//   let total = 0;
//
//   function assertCheck(desc: string, condition: boolean, details: string = '') {
//     total++;
//     if (condition) {
//       passed++;
//       console.log(`  ✅ [PASS] ${desc} ${details ? '(' + details + ')' : ''}`);
//     } else {
//       console.log(`  🚨 [FAIL / SECURITY OBSERVATION] ${desc} ${details ? '(' + details + ')' : ''}`);
//     }
//   }
//
//   const dbCommerce = new Client({ connectionString: COMMERCE_DB_URL });
//   const dbBusiness = new Client({ connectionString: BUSINESS_DB_URL });
//
//   await dbCommerce.connect();
//   await dbBusiness.connect();
//
//   // Test Entities
//   const sellerAId = '44444444-1111-4000-a000-000000000001';
//   const sellerBId = '44444444-2222-4000-a000-000000000002';
//
//   const businessAId = '44444444-1111-4000-a000-000000000011';
//   const businessBId = '44444444-2222-4000-a000-000000000012';
//
//   const storeAId = '44444444-1111-4000-a000-000000000021';
//   const storeBId = '44444444-2222-4000-a000-000000000022';
//
//   const bookBId = '44444444-2222-4000-a000-000000000031';
//   const orderBId = '44444444-2222-4000-a000-000000000041';
//   const sellerOrderBId = '44444444-2222-4000-a000-000000000042';
//
//   const tokenSellerA = jwt.sign({ sub: sellerAId, role: 'BUSINESS' }, JWT_SECRET, { expiresIn: '1h' });
//   const tokenSellerB = jwt.sign({ sub: sellerBId, role: 'BUSINESS' }, JWT_SECRET, { expiresIn: '1h' });
//
//   try {
//     // 0. Cleanup
//     console.log('--- BƯỚC 0: DỌN DẸP DỮ LIỆU CŨ TẠI CẢ 2 DATABASE ---');
//     await dbCommerce.query('DELETE FROM wallets WHERE store_id IN ($1, $2)', [storeAId, storeBId]);
//     await dbCommerce.query('DELETE FROM order_items WHERE seller_order_id = $1', [sellerOrderBId]);
//     await dbCommerce.query('DELETE FROM seller_orders WHERE id = $1', [sellerOrderBId]);
//     await dbCommerce.query('DELETE FROM orders WHERE id = $1', [orderBId]);
//     await dbCommerce.query('DELETE FROM books WHERE id = $1', [bookBId]);
//
//     await dbBusiness.query('DELETE FROM stores WHERE id IN ($1, $2)', [storeAId, storeBId]);
//     await dbBusiness.query('DELETE FROM businesses WHERE id IN ($1, $2)', [businessAId, businessBId]);
//
//     // 1. Seed Business & Store in huki_business
//     console.log('\n--- BƯỚC 1: SEED DOANH NGHIỆP & CỬA HÀNG TRONG HUKI_BUSINESS ---');
//     await dbBusiness.query(`
//       INSERT INTO businesses (id, name, email, owner_id, status, created_at, updated_at)
//       VALUES ($1, 'Doanh Nghiệp A Audit', 'dna@audit.local', $2, 'APPROVED', NOW(), NOW()),
//              ($3, 'Doanh Nghiệp B Audit', 'dnb@audit.local', $4, 'APPROVED', NOW(), NOW())
//     `, [businessAId, sellerAId, businessBId, sellerBId]);
//
//     await dbBusiness.query(`
//       INSERT INTO stores (id, business_id, name, slug, email, status, created_at, updated_at)
//       VALUES ($1, $2, 'Gian Hàng A Audit', 'gian-hang-a-audit', 'storea@audit.local', 'APPROVED', NOW(), NOW()),
//              ($3, $4, 'Gian Hàng B Audit', 'gian-hang-b-audit', 'storeb@audit.local', 'APPROVED', NOW(), NOW())
//     `, [storeAId, businessAId, storeBId, businessBId]);
//
//     console.log(`  Store A: ${storeAId} (Owner: Seller A: ${sellerAId})`);
//     console.log(`  Store B: ${storeBId} (Owner: Seller B: ${sellerBId})`);
//
//     // 2. Seed Book and Order in Store B (huki_commerce)
//     console.log('\n--- BƯỚC 2: SEED SÁCH & ĐƠN HÀNG THUỘC GIAN HÀNG B (HUKI_COMMERCE) ---');
//     await dbCommerce.query(`
//       INSERT INTO books (id, store_id, owner_user_id, title, normalized_title, slug, description, format, price, status, created_at, updated_at)
//       VALUES ($1, $2, $3, 'Sách Độc Quyền Shop B', 'sach doc quyen shop b', 'sach-doc-quyen-shop-b', 'Sách riêng tư của Shop B', 'PHYSICAL', 150000, 'PUBLISHED', NOW(), NOW())
//     `, [bookBId, storeBId, sellerBId]);
//
//     await dbCommerce.query(`
//       INSERT INTO orders (id, code, user_id, idempotency_key, item_subtotal, shipping_total, discount_total, grand_total, payment_method, payment_status, status, created_at, updated_at)
//       VALUES ($1, 'ORD-STORE-B-01', 'buyer-user-01', 'idemp-store-b', 150000, 0, 0, 150000, 'COD', 'PENDING', 'PENDING', NOW(), NOW())
//     `, [orderBId]);
//
//     await dbCommerce.query(`
//       INSERT INTO seller_orders (id, order_id, code, store_id, owner_user_id, item_subtotal, shipping_fee, grand_total, status, created_at, updated_at)
//       VALUES ($1, $2, 'SO-STORE-B-01', $3, $4, 150000, 0, 150000, 'PENDING_CONFIRMATION', NOW(), NOW())
//     `, [sellerOrderBId, orderBId, storeBId, sellerBId]);
//
//     await dbCommerce.query(`
//       INSERT INTO wallets (id, store_id, owner_user_id, available_balance, pending_balance, currency, version, created_at, updated_at)
//       VALUES (gen_random_uuid(), $1, $2, 5000000, 0, 'VND', 1, NOW(), NOW())
//     `, [storeBId, sellerBId]);
//
//     console.log(`  Đã tạo sách ${bookBId} và đơn hàng ${sellerOrderBId} thuộc Store B.`);
//
//     // 3. SCENARIO 1: Seller A tries to view Seller B's order
//     console.log('\n--- BƯỚC 3: SELLER A TRUY CẬP TRÁI PHÉP ĐƠN HÀNG CỦA SELLER B (ANTI-IDOR) ---');
//     const resOrderA = await fetch(`${COMMERCE_URL}/api/v1/seller/orders/${sellerOrderBId}`, {
//       headers: {
//         'Authorization': `Bearer ${tokenSellerA}`,
//       },
//     });
//     const bodyOrderA = await resOrderA.json().catch(() => ({}));
//     console.log(`  [Response Seller A -> Order B] Status: ${resOrderA.status} | Code: ${bodyOrderA.code || bodyOrderA.status}`);
//
//     assertCheck('Hệ thống chặn 403 Forbidden khi Seller A cố đọc đơn hàng của Seller B (Anti-IDOR)', resOrderA.status === 403, `Status: ${resOrderA.status}`);
//
//     // Verify Seller B CAN access their own order
//     const resOrderB = await fetch(`${COMMERCE_URL}/api/v1/seller/orders/${sellerOrderBId}`, {
//       headers: {
//         'Authorization': `Bearer ${tokenSellerB}`,
//       },
//     });
//     console.log(`  [Response Seller B -> Order B] Status: ${resOrderB.status}`);
//     assertCheck('Seller B truy cập hợp lệ đơn hàng của chính mình (200 OK)', resOrderB.status === 200, `Status: ${resOrderB.status}`);
//
//     // 4. SCENARIO 2: Seller A tries to mutate / cancel Seller B's order
//     console.log('\n--- BƯỚC 4: SELLER A CỐ THAY ĐỔI TRẠNG THÁI ĐƠN HÀNG CỦA SELLER B (ANTI-BOLA) ---');
//     const resCancelA = await fetch(`${COMMERCE_URL}/api/v1/seller/orders/${sellerOrderBId}/cancel`, {
//       method: 'PATCH',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${tokenSellerA}`,
//       },
//       body: JSON.stringify({
//         reason: 'Hủy đơn trộm từ Shop A',
//       }),
//     });
//     const bodyCancelA = await resCancelA.json().catch(() => ({}));
//     console.log(`  [Response Cancel Order B by Seller A] Status: ${resCancelA.status} | Code: ${bodyCancelA.code || bodyCancelA.status}`);
//
//     assertCheck('Hệ thống chặn 403 Forbidden khi Seller A cố hủy đơn hàng của Seller B', resCancelA.status === 403, `Status: ${resCancelA.status}`);
//
//     // 5. SCENARIO 3: BOLA / IDOR LEAK in books.service.ts findOwned (?store=storeBId)
//     console.log('\n--- BƯỚC 5: KIỂM CHỨNG LỖ HỔNG LỘ DỮ LIỆU SÁCH QUA PARAM ?store= (BOLA LEAK) ---');
//     // Call 1: Seller A queries /books/owned normally -> should NOT see Book B
//     const resBooksA = await fetch(`${COMMERCE_URL}/api/v1/books/owned`, {
//       headers: { 'Authorization': `Bearer ${tokenSellerA}` },
//     });
//     const bodyBooksA = await resBooksA.json().catch(() => ({}));
//     const itemsA = bodyBooksA.data?.items || bodyBooksA.data || [];
//     const seesBookBNormally = Array.isArray(itemsA) && itemsA.some((b: any) => b.id === bookBId);
//     console.log(`  Seller A gọi /books/owned bình thường: Số sách tìm thấy = ${itemsA.length}, Thấy sách B = ${seesBookBNormally}`);
//
//     // Call 2: Seller A queries /books/owned?store=storeBId -> due to OR condition bug in books.service.ts:539
//     const resBooksATampered = await fetch(`${COMMERCE_URL}/api/v1/books/owned?store=${storeBId}`, {
//       headers: { 'Authorization': `Bearer ${tokenSellerA}` },
//     });
//     const bodyBooksATampered = await resBooksATampered.json().catch(() => ({}));
//     const itemsTampered = bodyBooksATampered.data?.items || bodyBooksATampered.data || [];
//     const seesBookBWithTamper = Array.isArray(itemsTampered) && itemsTampered.some((b: any) => b.id === bookBId);
//     console.log(`  Seller A gọi /books/owned?store=${storeBId}: Số sách tìm thấy = ${itemsTampered.length}, Thấy sách B = ${seesBookBWithTamper}`);
//
//     const isBolaBlocked = resBooksATampered.status === 403 && !seesBookBWithTamper;
//     if (isBolaBlocked) {
//       console.log(`  🛡️ [BẢO MẬT ĐÃ ĐƯỢC CỦNG CỐ]: Hệ thống chặn đứng 403 Forbidden khi Seller A truyền ?store=${storeBId} của Seller B!`);
//     } else {
//       console.log(`  🚨 LỖ HỔNG BOLA: Seller A vẫn có thể đọc sách của Store B!`);
//     }
//
//     assertCheck(
//       'Xác nhận lỗ hổng BOLA đã được khắc phục: Seller A bị chặn 403 Forbidden khi truyền ?store của Seller B',
//       isBolaBlocked,
//       `Status: ${resBooksATampered.status}, Leaked: ${seesBookBWithTamper}`
//     );
//
//     // 6. SCENARIO 4: Wallet Multi-tenant Isolation
//     console.log('\n--- BƯỚC 6: SELLER A TRUY CẬP VÍ TIỀN CỦA STORE B ---');
//     const resWallet = await fetch(`${COMMERCE_URL}/api/v1/wallet?storeId=${storeBId}`, {
//       headers: { 'Authorization': `Bearer ${tokenSellerA}` },
//     });
//     const bodyWallet = await resWallet.json().catch(() => ({}));
//     console.log(`  [Response Seller A -> Wallet Store B] Status: ${resWallet.status} | Code: ${bodyWallet.code || bodyWallet.status}`);
//
//     assertCheck('Hệ thống chặn khi Seller A cố truy vấn số dư ví của Store B', resWallet.status === 403 || resWallet.status === 404, `Status: ${resWallet.status}`);
//
//     // 7. Cleanup
//     console.log('\n--- BƯỚC 7: DỌN DẸP DỮ LIỆU TEST ---');
//     await dbCommerce.query('DELETE FROM wallets WHERE store_id IN ($1, $2)', [storeAId, storeBId]);
//     await dbCommerce.query('DELETE FROM order_items WHERE seller_order_id = $1', [sellerOrderBId]);
//     await dbCommerce.query('DELETE FROM seller_orders WHERE id = $1', [sellerOrderBId]);
//     await dbCommerce.query('DELETE FROM orders WHERE id = $1', [orderBId]);
//     await dbCommerce.query('DELETE FROM books WHERE id = $1', [bookBId]);
//
//     await dbBusiness.query('DELETE FROM stores WHERE id IN ($1, $2)', [storeAId, storeBId]);
//     await dbBusiness.query('DELETE FROM businesses WHERE id IN ($1, $2)', [businessAId, businessBId]);
//     console.log('  Cleaned up all multi-tenant test records.');
//
//   } catch (error: any) {
//     console.error('❌ Lỗi ngoại lệ trong quá trình chạy test:', error);
//   } finally {
//     await dbCommerce.end();
//     await dbBusiness.end();
//   }
//
//   console.log('\n===============================================================');
//   console.log(`📊 KẾT QUẢ TEST 4: Passed ${passed}/${total} assertions.`);
//   console.log('===============================================================');
//   process.exitCode = (passed === total ? 0 : 1);
// }
//
// runTest();
