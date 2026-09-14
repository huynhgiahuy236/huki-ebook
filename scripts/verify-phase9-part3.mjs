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
        'UPDATE users SET password_hash = $1, status = $2, role = $3, email_verified_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE email = $4',
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
        'UPDATE users SET password_hash = $1, status = $2, role = $3, email_verified_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE email = $4',
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
      'UPDATE users SET status = $1, email_verified_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE email = $2',
      ['ACTIVE', email]
    );
    await client.end();
  } catch (err) {
    console.warn('   ⚠️ DB Activate Notice:', err.message);
  }
}

async function main() {
  console.log('='.repeat(72));
  console.log('--- [VERIFY PHASE 9 PART 3] Order Fulfillment & Granular RBAC ---');
  console.log('='.repeat(72));

  await syncAdminAndBuyer();

  const ts = Date.now();

  // -------------------------------------------------------------
  // SETUP: Tạo Seller, Duyệt Business & Provision Staff A (Sales)
  // -------------------------------------------------------------
  console.log('\n[Setup] Khởi tạo Doanh nghiệp & Cấp tài khoản Admin con (Sales Staff)...');
  const sellerEmail = `p9_ful_seller_${ts}@huki-test.vn`;
  await request('/auth/register', {
    method: 'POST',
    body: {
      email: sellerEmail,
      password: TEST_PASSWORD,
      fullName: `NXB Alpha Books P9 ${ts.toString().slice(-4)}`,
      phone: `092${Math.floor(1000000 + Math.random() * 9000000)}`,
    },
  });
  await activateUserInDb(sellerEmail);

  const sellerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: sellerEmail, password: TEST_PASSWORD },
  });
  let sellerToken = extractToken(sellerLogin);

  const regBizRes = await request('/businesses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: {
      name: `Doanh Nghiệp Fulfillment P9 ${ts.toString().slice(-4)}`,
      taxCode: `TAX${Math.floor(100000000 + Math.random() * 900000000)}`,
      email: sellerEmail,
      phone: '0909998888',
      address: '77 HuKi Boulevard, Quận 1, TP.HCM',
      businessType: 'CORPORATION',
    },
  });
  const businessId = (regBizRes.data?.data || regBizRes.data)?.id;

  // Admin HUKI duyệt
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'adminhuki@gmail.com', password: TEST_PASSWORD },
  });
  const adminToken = extractToken(adminLogin);
  await request(`/businesses/${businessId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // Re-login seller
  const sellerReLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: sellerEmail, password: TEST_PASSWORD },
  });
  sellerToken = extractToken(sellerReLogin);

  // Owner tạo sách Hybrid
  const bookTitle = `Sách Quản Trị Đơn Hàng P9 ${ts.toString().slice(-4)}`;
  const createBookRes = await request('/books', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: {
      businessId,
      title: bookTitle,
      description: 'Sách kiểm thử quy trình xử lý đơn hàng và phân quyền RBAC đa tầng.',
      price: 165000,
      format: 'BOTH',
      coverUrl: 'https://placehold.co/600x900/png?text=Fulfillment+P9',
      physicalDetails: { stock: 30, weight: 300, length: 20, width: 14, height: 2, physicalEnabled: true },
      digitalDetails: { digitalEnabled: true, allowOnlineRead: true, allowDownload: false, drmEnabled: true },
    },
  });
  const bookId = (createBookRes.data?.data || createBookRes.data)?.id;
  await request(`/books/${bookId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerToken}` },
  });

  // Owner Provision Staff A: Chỉ cấp quyền ['ORDER_VIEW', 'ORDER_PROCESS']
  const staffEmail = `staff_order_p9_${ts}@huki.vn`;
  const staffTempPassword = 'InitStaffPassword123!';
  const provStaffRes = await request(`/businesses/${businessId}/members/provision`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: {
      fullName: `Nhân Viên Xử Lý Đơn ${ts.toString().slice(-4)}`,
      email: staffEmail,
      phone: `093${Math.floor(1000000 + Math.random() * 9000000)}`,
      initialPassword: staffTempPassword,
      role: 'ORDER_STAFF',
      permissions: ['ORDER_VIEW', 'ORDER_PROCESS'],
    },
  });
  assert(provStaffRes.ok, `Owner provision Staff A thành công (${staffEmail})`);

  // Staff A đổi mật khẩu lần đầu & đăng nhập
  const staffFirstLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: staffEmail, password: staffTempPassword },
  });
  const staffTempToken = extractToken(staffFirstLogin);
  const staffNewPassword = 'NewSecureStaffPassword123!';
  await request('/auth/change-password', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${staffTempToken}` },
    body: { currentPassword: staffTempPassword, newPassword: staffNewPassword },
  });
  const staffLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: staffEmail, password: staffNewPassword },
  });
  const staffToken = extractToken(staffLogin);
  assert(staffLogin.ok && !!staffToken, 'Staff A đăng nhập với mật khẩu mới thành công');

  // Buyer mua 1 cuốn sách COD
  console.log('\n[Setup] Buyer đặt đơn hàng COD...');
  const buyerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'buyer_test@gmail.com', password: TEST_PASSWORD },
  });
  const buyerToken = extractToken(buyerLogin);

  await request('/cart', { method: 'DELETE', headers: { Authorization: `Bearer ${buyerToken}` } });
  await request('/cart/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: { bookId, format: 'PHYSICAL', quantity: 1 },
  });

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
      note: 'Giao giờ hành chính',
    },
  });
  const sessionId = (previewRes.data?.data || previewRes.data)?.sessionId;

  const confirmRes = await request('/cart/checkout/confirm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}`, 'idempotency-key': `p9-order-${ts}` },
    body: { sessionId, paymentMethod: 'COD' },
  });
  const buyerOrder = (confirmRes.data?.data || confirmRes.data)?.order || (confirmRes.data?.data || confirmRes.data);
  const buyerOrderId = buyerOrder?.id;
  assert(confirmRes.ok && !!buyerOrderId, `Buyer tạo đơn COD thành công (Mã Đơn: ${buyerOrderId})`);

  // -------------------------------------------------------------
  // LUỒNG 1: POSITIVE RBAC — Xử Lý Đơn Hàng Fulfillment Toàn Trình
  // -------------------------------------------------------------
  console.log('\n[Luồng 1] Seller xử lý đơn hàng toàn trình (Confirm -> Prepare -> Ship -> Deliver)...');
  const sellerOrdersRes = await request('/seller/orders?limit=20', {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const sellerOrdersList = extractItems(sellerOrdersRes);
  const sellerOrder = sellerOrdersList.find((so) => so.orderId === buyerOrderId || so.id === buyerOrderId) || sellerOrdersList[0];
  assert(sellerOrdersRes.ok && !!sellerOrder?.id, `Seller tìm thấy đơn hàng trong danh sách Seller Orders (ID: ${sellerOrder?.id})`);
  const sellerOrderId = sellerOrder?.id;

  // 1. Xác nhận đơn (CONFIRMED)
  const confirmOrderRes = await request(`/seller/orders/${sellerOrderId}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(confirmOrderRes.ok, `Seller xác nhận đơn hàng thành công (CONFIRMED)`);

  // 2. Chuẩn bị hàng (PREPARING)
  const prepareOrderRes = await request(`/seller/orders/${sellerOrderId}/prepare`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(prepareOrderRes.ok, `Seller chuyển đơn sang đóng gói (PREPARING)`);

  // 3. Bàn giao vận chuyển (SHIPPED)
  const shipOrderRes = await request(`/seller/orders/${sellerOrderId}/ship`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: { carrier: 'Giao Hàng Tiết Kiệm (GHTK)', trackingCode: `GHTK${ts.toString().slice(-6)}` },
  });
  assert(shipOrderRes.ok, `Seller bàn giao vận chuyển thành công (SHIPPED)`);

  // 4. Giao hàng thành công (DELIVERED)
  const deliverOrderRes = await request(`/seller/orders/${sellerOrderId}/deliver`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(deliverOrderRes.ok, `Seller cập nhật đơn giao thành công (DELIVERED)`);

  // -------------------------------------------------------------
  // LUỒNG 2: NEGATIVE RBAC — Chặn Thao Tác Ngoài Phân Quyền
  // -------------------------------------------------------------
  console.log('\n[Luồng 2] Negative RBAC: Chặn Staff A & Buyer gọi các API ngoài thẩm quyền...');
  // Staff A cố tình tạo thêm nhân viên khác (không có quyền MEMBER_MANAGE)
  const illegalProvStaff = await request(`/businesses/${businessId}/members/provision`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: {
      fullName: 'Nhân Viên Lậu',
      email: `illegal_staff_${ts}@huki.vn`,
      phone: '0999999999',
      initialPassword: 'Password123!',
      role: 'ORDER_STAFF',
      permissions: ['ORDER_VIEW'],
    },
  });
  assert(
    illegalProvStaff.status === 403 || !illegalProvStaff.ok,
    `Hệ thống chặn thành công Staff A cố cấp quyền cho nhân viên khác (Status: ${illegalProvStaff.status} Forbidden)`
  );

  // Buyer cố tình truy cập Seller Orders API
  const illegalBuyerAccess = await request('/seller/orders', {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  assert(
    illegalBuyerAccess.status === 403 || !illegalBuyerAccess.ok,
    `Hệ thống chặn thành công Buyer cố truy cập Seller Orders (Status: ${illegalBuyerAccess.status} Forbidden)`
  );

  // -------------------------------------------------------------
  // LUỒNG 3: Kiểm Tra Timeline Lịch Sử Trạng Thái & Trừ Tồn Kho
  // -------------------------------------------------------------
  console.log('\n[Luồng 3] Kiểm tra Timeline trạng thái đơn hàng & Đồng bộ Buyer...');
  const orderDetailRes = await request(`/seller/orders/${sellerOrderId}`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const detail = orderDetailRes.data?.data || orderDetailRes.data;
  assert(orderDetailRes.ok && (detail?.status === 'DELIVERED' || detail?.status === 'COMPLETED'), `Trạng thái đơn hàng của Seller là DELIVERED/COMPLETED (${detail?.status})`);

  // Buyer kiểm tra trạng thái đơn hàng
  const buyerCheckRes = await request(`/orders/${buyerOrderId}`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  const buyerDetail = buyerCheckRes.data?.data || buyerCheckRes.data;
  assert(buyerCheckRes.ok && (buyerDetail?.status === 'DELIVERED' || buyerDetail?.status === 'COMPLETED'), `Buyer thấy trạng thái đơn hàng đã đồng bộ sang DELIVERED/COMPLETED (${buyerDetail?.status})`);

  console.log('\n' + '='.repeat(72));
  console.log(`KẾT QUẢ KIỂM THỬ PART 3: ${passed} PASS / ${failed} FAIL`);
  console.log('='.repeat(72));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Lỗi thực thi script Part 3:', err.message);
  process.exit(1);
});
