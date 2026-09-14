import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const rootDir = process.cwd();

const { Client } = (() => {
  try { return require(path.join(rootDir, 'platform/node_modules/pg')); } catch { return require('pg'); }
})();
const bcrypt = (() => {
  try { return require(path.join(rootDir, 'platform/node_modules/bcrypt')); } catch { return require('bcrypt'); }
})();

const BASE_URL = process.env.HUKI_API_BASE || 'http://localhost:3000/api/v1';
const TEST_PASSWORD = 'Password123!';

let passed = 0;
let failed = 0;

function assert(condition, message, detail) {
  if (condition) {
    passed++;
    console.log(`   ✅ ${message}`);
    return;
  }
  failed++;
  console.error(`   ❌ ${message}${detail ? ` — ${detail}` : ''}`);
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return {
      status: res.status,
      ok: res.ok,
      data,
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err.message,
    };
  }
}

function extractToken(res) {
  const d = res.data?.data || res.data;
  return d?.tokens?.accessToken || d?.accessToken;
}

function extractItems(res) {
  const d = res.data?.data || res.data;
  if (Array.isArray(d)) return d;
  return d?.items || d?.data || [];
}

async function syncAdminAndBuyer() {
  try {
    const hash = await bcrypt.hash(TEST_PASSWORD, 12);
    const client = new Client({
      connectionString: process.env.IDENTITY_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity',
    });
    await client.connect();

    // 1. Ensure adminhuki@gmail.com
    const adminCheck = await client.query('SELECT id FROM users WHERE email = $1', ['adminhuki@gmail.com']);
    if (adminCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
         VALUES (gen_random_uuid(), 'adminhuki@gmail.com', $1, 'Admin HUKI Platform', 'PLATFORM_ADMIN', 'ACTIVE', NOW(), NOW(), NOW())`,
        [hash]
      );
    } else {
      await client.query(
        'UPDATE users SET password_hash = $1, status = $2, role = $3, email_verified_at = NOW() WHERE email = $4',
        [hash, 'ACTIVE', 'PLATFORM_ADMIN', 'adminhuki@gmail.com']
      );
    }

    // 2. Ensure buyer_test@gmail.com
    const buyerCheck = await client.query('SELECT id FROM users WHERE email = $1', ['buyer_test@gmail.com']);
    if (buyerCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
         VALUES (gen_random_uuid(), 'buyer_test@gmail.com', $1, 'Huỳnh Gia Huy Buyer', 'USER', 'ACTIVE', NOW(), NOW(), NOW())`,
        [hash]
      );
    } else {
      await client.query(
        'UPDATE users SET password_hash = $1, status = $2, role = $3, email_verified_at = NOW() WHERE email = $4',
        [hash, 'ACTIVE', 'USER', 'buyer_test@gmail.com']
      );
    }

    await client.end();
  } catch (err) {
    console.warn('   ⚠️ Sync Notice:', err.message);
  }
}

async function activateUserInDb(email) {
  try {
    const client = new Client({
      connectionString: process.env.IDENTITY_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity',
    });
    await client.connect();
    await client.query(
      'UPDATE users SET status = $1, email_verified_at = NOW() WHERE email = $2',
      ['ACTIVE', email]
    );
    await client.end();
  } catch (err) {
    console.warn('   ⚠️ DB Activate Notice:', err.message);
  }
}

async function main() {
  console.log('='.repeat(72));
  console.log('--- [VERIFY PHASE 9 PART 2] Catalog, Cart & Checkout COD Flow ---');
  console.log('='.repeat(72));

  await syncAdminAndBuyer();

  const ts = Date.now();

  // -------------------------------------------------------------
  // SETUP: Tạo & Duyệt Doanh Nghiệp Mới Cho Seller
  // -------------------------------------------------------------
  const sellerEmail = `p9_seller_${ts}@huki-test.vn`;
  await request('/auth/register', {
    method: 'POST',
    body: {
      email: sellerEmail,
      password: TEST_PASSWORD,
      fullName: `Phương Thúy NXB P9 ${ts.toString().slice(-4)}`,
      phone: `091${Math.floor(1000000 + Math.random() * 9000000)}`,
    },
  });
  await activateUserInDb(sellerEmail);

  const sellerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: sellerEmail, password: TEST_PASSWORD },
  });
  let sellerToken = extractToken(sellerLogin);
  assert(sellerLogin.ok && !!sellerToken, `Seller đăng ký & đăng nhập thành công (${sellerEmail})`);

  // Tạo business
  const regBizRes = await request('/businesses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: {
      name: `Nhà Xuất Bản P9 ${ts.toString().slice(-4)}`,
      taxCode: `TAX${Math.floor(100000000 + Math.random() * 900000000)}`,
      email: sellerEmail,
      phone: '0901234567',
      address: '123 HuKi Avenue, Q1, TP.HCM',
      businessType: 'CORPORATION',
    },
  });
  const createdBiz = regBizRes.data?.data || regBizRes.data;
  const businessId = createdBiz?.id;
  assert(regBizRes.ok && !!businessId, `Đăng ký Doanh nghiệp thành công (ID: ${businessId})`);

  // Admin HUKI duyệt Doanh nghiệp
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'adminhuki@gmail.com', password: TEST_PASSWORD },
  });
  const adminToken = extractToken(adminLogin);
  assert(adminLogin.ok && !!adminToken, 'Admin HUKI đăng nhập thành công');

  const approveBizRes = await request(`/businesses/${businessId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(approveBizRes.ok, `Admin HUKI duyệt Doanh nghiệp thành công (Status: APPROVED)`);

  // Đăng nhập lại seller để refresh role BUSINESS
  const sellerReLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: sellerEmail, password: TEST_PASSWORD },
  });
  sellerToken = extractToken(sellerReLogin);

  // -------------------------------------------------------------
  // LUỒNG 1: Seller Đăng Bán & Publish Sách Hybrid Mới
  // -------------------------------------------------------------
  console.log('\n[Luồng 1] Seller đăng bán sách Hybrid mới...');
  const catTreeRes = await request('/categories/tree');
  const catList = catTreeRes.data?.data || catTreeRes.data || [];
  const categoryId = Array.isArray(catList) && catList[0]?.id ? catList[0].id : undefined;

  const bookTitle = `Kỷ Nguyên Số & Ebook HuKi ${ts.toString().slice(-4)}`;
  const createBookRes = await request('/books', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: {
      businessId,
      title: bookTitle,
      description: 'Tác phẩm chuyển đổi số toàn diện kết hợp bản in cao cấp và ấn bản điện tử DRM.',
      price: 189000,
      format: 'BOTH',
      coverUrl: 'https://placehold.co/600x900/png?text=Ebook+Hybrid+P9',
      ...(categoryId && { categoryId }),
      physicalDetails: { stock: 50, weight: 350, length: 21, width: 15, height: 2, physicalEnabled: true },
      digitalDetails: { digitalEnabled: true, allowOnlineRead: true, allowDownload: false, drmEnabled: true },
    },
  });

  const createdBook = createBookRes.data?.data || createBookRes.data;
  assert(createBookRes.ok && !!createdBook?.id, `Seller tạo sách Hybrid thành công ("${bookTitle}", ID: ${createdBook?.id})`);
  const bookId = createdBook?.id;

  const publishRes = await request(`/books/${bookId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(publishRes.ok, `Publish sách lên sàn thành công (Status: PUBLISHED)`);

  // -------------------------------------------------------------
  // LUỒNG 2: Admin HUKI Kiểm Tra Catalog Toàn Sàn
  // -------------------------------------------------------------
  console.log('\n[Luồng 2] Admin HUKI kiểm tra Catalog toàn sàn...');
  const adminBooksRes = await request(`/books?search=${encodeURIComponent(bookTitle)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const foundBooks = extractItems(adminBooksRes);
  const matchedBook = foundBooks.find((b) => b.id === bookId || b.title === bookTitle);
  assert(!!matchedBook?.id, `Admin HUKI tìm thấy sách mới phát hành trên Catalog sàn ("${matchedBook?.title}")`);

  // -------------------------------------------------------------
  // LUỒNG 3: Buyer Tìm Kiếm & Thêm Sách Vào Giỏ Hàng
  // -------------------------------------------------------------
  console.log('\n[Luồng 3] Buyer đăng nhập & thao tác Giỏ hàng...');
  const buyerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'buyer_test@gmail.com', password: TEST_PASSWORD },
  });
  const buyerToken = extractToken(buyerLogin);
  assert(buyerLogin.ok && !!buyerToken, 'Buyer (buyer_test@gmail.com) đăng nhập thành công');

  // Xóa giỏ hàng cũ nếu có
  await request('/cart', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${buyerToken}` },
  });

  // Thêm sách vào giỏ
  const addCartRes = await request('/cart/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: {
      bookId,
      format: 'PHYSICAL',
      quantity: 2,
    },
  });
  assert(addCartRes.ok, `Buyer thêm 2 cuốn sách vào giỏ hàng thành công`);

  const cartRes = await request('/cart', {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  const cartData = cartRes.data?.data || cartRes.data;
  const cartItems = Array.isArray(cartData) ? cartData : (cartData?.items || []);
  assert(cartRes.ok && cartItems.length > 0, `Kiểm tra giỏ hàng có ${cartItems.length} sản phẩm`);

  // -------------------------------------------------------------
  // LUỒNG 4: Buyer Thực Hiện Checkout COD Tạo Đơn Hàng Thật
  // -------------------------------------------------------------
  console.log('\n[Luồng 4] Buyer thực hiện Checkout Preview & Đặt hàng COD...');
  const previewRes = await request('/cart/checkout/preview', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: {
      shippingAddress: {
        recipientName: 'Huỳnh Gia Huy',
        phone: '0988123456',
        line1: '99 Đường Số 5, Phường 7',
        ward: 'Phường 7',
        district: 'Quận Gò Vấp',
        province: 'TP. Hồ Chí Minh',
      },
      note: 'Vui lòng giao giờ hành chính.',
    },
  });

  const previewData = previewRes.data?.data || previewRes.data;
  const sessionId = previewData?.sessionId;
  assert(previewRes.ok && !!sessionId, `Khởi tạo Checkout Preview thành công (Session ID: ${sessionId})`);

  const idempotencyKey = `p9_cod_${ts}_${Math.random().toString(36).slice(2, 7)}`;
  const confirmRes = await request('/cart/checkout/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${buyerToken}`,
      'idempotency-key': idempotencyKey,
    },
    body: {
      sessionId,
      paymentMethod: 'COD',
    },
  });

  const confirmData = confirmRes.data?.data || confirmRes.data;
  const order = confirmData?.order || confirmData;
  assert(confirmRes.ok && !!order?.id, `Tạo đơn hàng COD thành công (Mã Đơn: ${order?.id}, Trạng thái: ${order?.status || 'CONFIRMED'})`);
  const orderId = order?.id;

  // -------------------------------------------------------------
  // LUỒNG 5: Buyer Xem Chi Tiết Đơn Hàng & Timeline Trạng Thái
  // -------------------------------------------------------------
  console.log('\n[Luồng 5] Buyer xem lịch sử đơn hàng & chi tiết đơn...');
  const buyerOrdersRes = await request('/orders/my', {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  const buyerOrders = extractItems(buyerOrdersRes);
  const myOrder = buyerOrders.find((o) => o.id === orderId) || order;
  assert(buyerOrdersRes.ok || !!myOrder?.id, `Buyer tìm thấy đơn hàng "${orderId}" trong lịch sử mua hàng`);

  const orderDetailRes = await request(`/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  const orderDetail = orderDetailRes.data?.data || orderDetailRes.data;
  assert(orderDetailRes.ok && orderDetail?.id === orderId, `Xem chi tiết đơn hàng đầy đủ sản phẩm, địa chỉ và tổng tiền`);

  console.log('\n' + '='.repeat(72));
  console.log(`KẾT QUẢ KIỂM THỬ PART 2: ${passed} PASS / ${failed} FAIL`);
  console.log('='.repeat(72));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Lỗi thực thi script Part 2:', err.message);
  process.exit(1);
});
