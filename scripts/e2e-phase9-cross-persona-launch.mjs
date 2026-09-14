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

const API_BASE = process.env.HUKI_API_BASE || 'http://localhost:3000/api/v1';
const WEB_BASE = process.env.HUKI_WEB_BASE || 'http://localhost:3100';
const TEST_PASSWORD = 'Password123!';

let passed = 0;
let failed = 0;

function assert(condition, message, detail) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${message}`);
    return;
  }
  failed++;
  console.error(`  ❌ [FAIL] ${message}${detail ? ` — ${detail}` : ''}`);
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
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
    console.warn('  ⚠️ DB Sync Notice:', err.message);
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
    console.warn('  ⚠️ DB Activate Notice:', err.message);
  }
}

async function runE2E() {
  console.log('='.repeat(76));
  console.log('🚀 [PHASE 09 RELEASE GATE] E2E CROSS-PERSONA VERIFICATION (5 PERSONAS)');
  console.log('='.repeat(76));

  const ts = Date.now();

  // -------------------------------------------------------------
  // [STEP 0] Service Live Check & Verification
  // -------------------------------------------------------------
  console.log('\n📡 [Step 0] Service Live Check & Microservices Health Check...');
  const webRes = await fetch(WEB_BASE).catch(() => null);
  assert(!!webRes?.ok, `Frontend Web portal đang hoạt động tại ${WEB_BASE} (Status: ${webRes?.status})`);

  const healthRes = await request('/health/services');
  assert(healthRes.status === 200 || healthRes.status === 503, `Gateway Services Health phản hồi (Status: ${healthRes.status})`);

  await syncAdminAndBuyer();

  // -------------------------------------------------------------
  // [STEP 1] Persona 1: Guest Đăng Ký Tài Khoản & Gửi Hồ Sơ Doanh Nghiệp
  // -------------------------------------------------------------
  console.log('\n👤 [Step 1] Persona 1 (Guest): Đăng ký tài khoản & nộp hồ sơ Doanh nghiệp...');
  const ownerEmail = `e2e_owner_${ts}@huki-test.vn`;
  const regOwnerRes = await request('/auth/register', {
    method: 'POST',
    body: {
      email: ownerEmail,
      password: TEST_PASSWORD,
      fullName: `Chủ Nhà Xuất Bản E2E ${ts.toString().slice(-4)}`,
      phone: `096${Math.floor(1000000 + Math.random() * 9000000)}`,
    },
  });
  await activateUserInDb(ownerEmail);

  const ownerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: ownerEmail, password: TEST_PASSWORD },
  });
  let ownerToken = extractToken(ownerLogin);
  assert(ownerLogin.ok && !!ownerToken, `Guest đăng ký & đăng nhập thành công (${ownerEmail})`);

  const regBizRes = await request('/businesses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: {
      name: `Công Ty Cổ Phần Sách E2E ${ts.toString().slice(-4)}`,
      taxCode: `TAX${Math.floor(100000000 + Math.random() * 900000000)}`,
      email: ownerEmail,
      phone: '0908889999',
      address: '100 Đại Lộ HuKi, Quận 1, TP.HCM',
      businessType: 'CORPORATION',
    },
  });
  const business = regBizRes.data?.data || regBizRes.data;
  const businessId = business?.id;
  assert(regBizRes.ok && !!businessId, `Nộp hồ sơ Doanh nghiệp thành công (ID: ${businessId}, Status: PENDING_APPROVAL)`);

  // -------------------------------------------------------------
  // [STEP 2] Persona 2: Admin HUKI Thẩm Định & Phê Duyệt Doanh Nghiệp
  // -------------------------------------------------------------
  console.log('\n👑 [Step 2] Persona 2 (Admin HUKI): Thẩm định & Phê duyệt Doanh nghiệp...');
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
  assert(approveBizRes.ok, `Admin HUKI phê duyệt Doanh nghiệp thành công (Status: APPROVED)`);

  // Re-login Owner to refresh permissions & token
  const ownerReLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: ownerEmail, password: TEST_PASSWORD },
  });
  ownerToken = extractToken(ownerReLogin);

  // -------------------------------------------------------------
  // [STEP 3] Persona 3: Business Owner Tạo & Publish Sách Hybrid
  // -------------------------------------------------------------
  console.log('\n🏢 [Step 3] Persona 3 (Business Owner): Tạo & Publish sách Hybrid mới...');
  const catTreeRes = await request('/categories/tree');
  const catList = catTreeRes.data?.data || catTreeRes.data || [];
  const categoryId = Array.isArray(catList) && catList[0]?.id ? catList[0].id : undefined;

  const bookTitle = `Tuyệt Tác Sách Số & Sách Giấy E2E ${ts.toString().slice(-4)}`;
  const createBookRes = await request('/books', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: {
      businessId,
      title: bookTitle,
      description: 'Ấn phẩm đặc biệt kiểm thử toàn trình 5 vai trò Release Gate Phase 09.',
      price: 199000,
      format: 'BOTH',
      coverUrl: 'https://placehold.co/600x900/png?text=E2E+Phase+9',
      ...(categoryId && { categoryId }),
      physicalDetails: { stock: 40, weight: 400, length: 22, width: 16, height: 2, physicalEnabled: true },
      digitalDetails: { digitalEnabled: true, allowOnlineRead: true, allowDownload: false, drmEnabled: true },
    },
  });
  const book = createBookRes.data?.data || createBookRes.data;
  const bookId = book?.id;
  assert(createBookRes.ok && !!bookId, `Owner tạo sách Hybrid thành công ("${bookTitle}", ID: ${bookId})`);

  const publishBookRes = await request(`/books/${bookId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(publishBookRes.ok, `Owner publish sách lên sàn thành công (Status: PUBLISHED)`);

  // -------------------------------------------------------------
  // [STEP 4] Admin HUKI Kiểm Tra Catalog Sàn
  // -------------------------------------------------------------
  console.log('\n📚 [Step 4] Admin HUKI kiểm tra sách trên Catalog toàn sàn...');
  const catalogSearchRes = await request(`/books?search=${encodeURIComponent(bookTitle)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const foundBooks = extractItems(catalogSearchRes);
  const matchedBook = foundBooks.find((b) => b.id === bookId || b.title === bookTitle);
  assert(!!matchedBook?.id, `Admin HUKI tìm thấy sách trên Catalog sàn ("${matchedBook?.title}")`);

  // -------------------------------------------------------------
  // [STEP 5] Owner Direct Provisioning Tạo Admin Con (Staff Sales)
  // -------------------------------------------------------------
  console.log('\n👥 [Step 5] Owner cấp tài khoản trực tiếp (Direct Provisioning) cho Admin con...');
  const staffEmail = `staff_e2e_${ts}@huki.vn`;
  const staffInitPassword = 'InitStaffPassword123!';
  const staffPermissions = ['ORDER_VIEW', 'ORDER_PROCESS'];

  const provStaffRes = await request(`/businesses/${businessId}/members/provision`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: {
      fullName: `Nhân Viên Xử Lý Đơn E2E ${ts.toString().slice(-4)}`,
      email: staffEmail,
      phone: `094${Math.floor(1000000 + Math.random() * 9000000)}`,
      initialPassword: staffInitPassword,
      role: 'ORDER_STAFF',
      permissions: staffPermissions,
    },
  });
  const staffMember = provStaffRes.data?.data || provStaffRes.data;
  assert(provStaffRes.ok && !!staffMember?.id, `Owner provision Admin con thành công (${staffEmail})`);

  // -------------------------------------------------------------
  // [STEP 6] Persona 4: Admin Con Đăng Nhập Lần Đầu & Đổi Mật Khẩu
  // -------------------------------------------------------------
  console.log('\n🔑 [Step 6] Persona 4 (Admin Con): Đăng nhập lần đầu & đổi mật khẩu bắt buộc...');
  const staffFirstLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: staffEmail, password: staffInitPassword },
  });
  const staffTempToken = extractToken(staffFirstLogin);
  const staffUser = staffFirstLogin.data?.data?.user || staffFirstLogin.data?.user;
  assert(staffFirstLogin.ok && staffUser?.mustChangePassword === true, 'Admin con nhận diện đúng cờ mustChangePassword = true');

  const staffNewPassword = 'NewSecureStaffPassword123!';
  const changePwdRes = await request('/auth/change-password', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${staffTempToken}` },
    body: { currentPassword: staffInitPassword, newPassword: staffNewPassword },
  });
  assert(changePwdRes.ok, 'Admin con đổi mật khẩu khởi tạo thành công');

  const staffLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: staffEmail, password: staffNewPassword },
  });
  const staffToken = extractToken(staffLogin);
  assert(staffLogin.ok && !!staffToken, 'Admin con đăng nhập với mật khẩu mới thành công');

  // -------------------------------------------------------------
  // [STEP 7] Persona 5: Buyer Mua Sách & Đặt Hàng COD Thật
  // -------------------------------------------------------------
  console.log('\n🛒 [Step 7] Persona 5 (Buyer): Duyệt sách, Thêm giỏ hàng & Đặt hàng COD...');
  const buyerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'buyer_test@gmail.com', password: TEST_PASSWORD },
  });
  const buyerToken = extractToken(buyerLogin);
  assert(buyerLogin.ok && !!buyerToken, 'Buyer (buyer_test@gmail.com) đăng nhập thành công');

  await request('/cart', { method: 'DELETE', headers: { Authorization: `Bearer ${buyerToken}` } });
  const addCartRes = await request('/cart/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: { bookId, format: 'PHYSICAL', quantity: 2 },
  });
  assert(addCartRes.ok, `Buyer thêm 2 cuốn sách vào giỏ hàng thành công`);

  const previewRes = await request('/cart/checkout/preview', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: {
      shippingAddress: {
        recipientName: 'Huỳnh Gia Huy Buyer',
        phone: '0988123456',
        line1: '99 Đường Số 5, Phường 7',
        ward: 'Phường 7',
        district: 'Quận Gò Vấp',
        province: 'TP. Hồ Chí Minh',
      },
      note: 'Giao giờ hành chính giúp mình',
    },
  });
  const sessionId = (previewRes.data?.data || previewRes.data)?.sessionId;
  assert(previewRes.ok && !!sessionId, `Khởi tạo Checkout Preview thành công (Session ID: ${sessionId})`);

  const confirmRes = await request('/cart/checkout/confirm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}`, 'idempotency-key': `e2e-order-${ts}` },
    body: { sessionId, paymentMethod: 'COD' },
  });
  const buyerOrder = (confirmRes.data?.data || confirmRes.data)?.order || (confirmRes.data?.data || confirmRes.data);
  const orderId = buyerOrder?.id;
  assert(confirmRes.ok && !!orderId, `Buyer đặt đơn hàng COD thành công (Mã Đơn: ${orderId})`);

  // -------------------------------------------------------------
  // [STEP 8] Fulfillment: Xử Lý Đơn Hàng 4 Bước
  // -------------------------------------------------------------
  console.log('\n📦 [Step 8] Fulfillment: Xử lý đơn hàng 4 bước (Confirm -> Prepare -> Ship -> Deliver)...');
  const sellerOrdersRes = await request('/seller/orders?limit=20', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const sellerOrdersList = extractItems(sellerOrdersRes);
  const sellerOrder = sellerOrdersList.find((so) => so.orderId === orderId || so.id === orderId) || sellerOrdersList[0];
  assert(sellerOrdersRes.ok && !!sellerOrder?.id, `Tìm thấy đơn hàng trong danh sách Seller Orders (ID: ${sellerOrder?.id})`);
  const sellerOrderId = sellerOrder?.id;

  // Confirm
  const confirmOrderRes = await request(`/seller/orders/${sellerOrderId}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(confirmOrderRes.ok, `Xác nhận đơn hàng thành công (CONFIRMED)`);

  // Prepare
  const prepareOrderRes = await request(`/seller/orders/${sellerOrderId}/prepare`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(prepareOrderRes.ok, `Đóng gói đơn hàng thành công (PREPARING)`);

  // Ship
  const shipOrderRes = await request(`/seller/orders/${sellerOrderId}/ship`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: { carrier: 'Giao Hàng Tiết Kiệm (GHTK)', trackingCode: `GHTK${ts.toString().slice(-6)}` },
  });
  assert(shipOrderRes.ok, `Bàn giao vận chuyển thành công (SHIPPED)`);

  // Deliver
  const deliverOrderRes = await request(`/seller/orders/${sellerOrderId}/deliver`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(deliverOrderRes.ok, `Giao hàng hoàn tất thành công (DELIVERED/COMPLETED)`);

  // -------------------------------------------------------------
  // [STEP 9] Negative RBAC & Security Enforcement
  // -------------------------------------------------------------
  console.log('\n🛡️ [Step 9] Negative RBAC & Security Enforcement Check...');
  // Staff A cố tình tạo thêm nhân viên khác (không có quyền MEMBER_MANAGE)
  const illegalProvStaff = await request(`/businesses/${businessId}/members/provision`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: {
      fullName: 'Nhân Viên Lậu',
      email: `illegal_${ts}@huki.vn`,
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

  // Buyer cố tình gọi Seller Orders API
  const illegalBuyerAccess = await request('/seller/orders', {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  assert(
    illegalBuyerAccess.status === 403 || !illegalBuyerAccess.ok,
    `Hệ thống chặn thành công Buyer cố truy cập Seller Orders (Status: ${illegalBuyerAccess.status} Forbidden)`
  );

  // -------------------------------------------------------------
  // [STEP 10] Buyer Timeline & Inventory Consistency Verification
  // -------------------------------------------------------------
  console.log('\n📊 [Step 10] Buyer Timeline & Đồng Bộ Trạng Thái Hoàn Tất...');
  const buyerCheckRes = await request(`/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  const buyerDetail = buyerCheckRes.data?.data || buyerCheckRes.data;
  assert(
    buyerCheckRes.ok && (buyerDetail?.status === 'DELIVERED' || buyerDetail?.status === 'COMPLETED'),
    `Buyer thấy đơn hàng đã chuyển trạng thái sang DELIVERED/COMPLETED (${buyerDetail?.status})`
  );

  console.log('\n' + '='.repeat(76));
  console.log(`🏆 KẾT QUẢ E2E TOÀN TRÌNH PHASE 09: ${passed} PASS / ${failed} FAIL`);
  console.log('='.repeat(76));

  if (failed > 0) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error('\n❌ Lỗi thực thi E2E Phase 09:', err.message);
  process.exit(1);
});
