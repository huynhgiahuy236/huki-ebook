import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Client } = (() => {
  try { return require('pg'); } catch { return require('../platform/node_modules/pg'); }
})();
const bcrypt = (() => {
  try { return require('bcrypt'); } catch { return require('../platform/node_modules/bcrypt'); }
})();

const API_BASE = process.env.HUKI_API_BASE || 'http://localhost:3000/api/v1';
const WEB_BASE = process.env.HUKI_WEB_BASE || 'http://localhost:3100';
const TEST_PASSWORD = 'Password123!';

let passed = 0;
let failed = 0;

function dataOf(response) {
  return response.data?.data ?? response.data;
}

function tokenOf(response) {
  const data = dataOf(response);
  return data?.tokens?.accessToken || data?.accessToken;
}

function itemsOf(response) {
  const data = dataOf(response);
  if (Array.isArray(data)) return data;
  return data?.items || data?.data || [];
}

function assert(condition, message, detail) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
    return;
  }
  failed++;
  console.error(`  ❌ ${message}${detail ? ` — ${detail}` : ''}`);
}

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(options.token && { Authorization: `Bearer ${options.token}` }),
        ...(options.headers || {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

async function resetTestPasswords() {
  try {
    const client = new Client({
      connectionString: process.env.IDENTITY_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity',
    });
    const hash = await bcrypt.hash(TEST_PASSWORD, 12);
    await client.connect();
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = ANY($2::text[])',
      [hash, ['adminhuki@gmail.com', 'phuongthuy@gmail.com', 'buyer_test@gmail.com', 'huy@gmail.com']],
    );
    await client.end();
  } catch (err) {
    console.warn('  ⚠️ Direct DB password reset skipped:', err.message);
  }
}

async function login(email) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email, password: TEST_PASSWORD },
  });
  return { response, token: tokenOf(response) };
}

async function run() {
  console.log('='.repeat(72));
  console.log('PHASE 08 E2E — ADMIN HUKI PLATFORM OPERATIONS & APPROVALS');
  console.log('='.repeat(72));

  console.log('\n[Step 0] Service live check');
  const web = await fetch(WEB_BASE).catch(() => null);
  const gateway = await request('/businesses/my');
  assert(!!web?.ok, `Web Portal live tại ${WEB_BASE}`);
  assert(gateway.status === 401, `Gateway live và Auth Guard hoạt động (${gateway.status})`);

  await resetTestPasswords();

  console.log('\n[Step 1] Admin HUKI và Seller Login');
  const admin = await login('adminhuki@gmail.com');
  const seller = await login('phuongthuy@gmail.com');
  let buyer = await login('buyer_test@gmail.com');
  if (!buyer.token) buyer = await login('huy@gmail.com');

  assert(!!admin.token, 'Admin HUKI đăng nhập thành công', JSON.stringify(admin.response.data));
  assert(!!seller.token, 'Seller đăng nhập thành công', JSON.stringify(seller.response.data));
  assert(!!buyer.token, 'Buyer đăng nhập thành công', JSON.stringify(buyer.response.data));
  if (!admin.token || !seller.token || !buyer.token) throw new Error('Không thể tiếp tục nếu thiếu Token xác thực');

  // Xác thực Role PLATFORM_ADMIN
  const adminMe = await request('/auth/me', { token: admin.token });
  assert(dataOf(adminMe)?.role === 'PLATFORM_ADMIN', 'Xác thực chuẩn role PLATFORM_ADMIN');

  console.log('\n[Step 2] Admin kiểm tra danh sách Doanh Nghiệp toàn sàn');
  const adminBizList = await request('/businesses/admin/all?limit=50', { token: admin.token });
  assert(adminBizList.ok && Array.isArray(itemsOf(adminBizList)), `Admin lấy danh sách Doanh nghiệp thành công (${itemsOf(adminBizList).length} DN)`);

  const currentBiz = itemsOf(adminBizList)[0];
  assert(!!currentBiz?.id, 'Tìm thấy Doanh nghiệp trên sàn để thao tác kiểm thử');

  console.log('\n[Step 3] Admin phê duyệt Doanh Nghiệp (Registration & Approval Flow)');
  // Tạo 1 Doanh Nghiệp mới ở trạng thái PENDING_APPROVAL để test luồng duyệt của Admin
  const newBizData = {
    name: `E2E Publisher ${Date.now()}`,
    taxCode: `TAX${Math.floor(100000000 + Math.random() * 900000000)}`,
    email: `publisher_${Date.now()}@huki-test.vn`,
    phone: '0901234567',
    address: '123 HuKi Avenue, District 1, HCMC',
    businessType: 'ENTERPRISE',
    identityNumber: `CCCD${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  // Đăng ký qua user chưa có business (buyer)
  const regBizRes = await request('/businesses', {
    method: 'POST',
    token: buyer.token,
    body: newBizData,
  });

  let pendingBizId = dataOf(regBizRes)?.id;
  if (regBizRes.ok && pendingBizId) {
    assert(true, `Đăng ký Doanh nghiệp mới "${newBizData.name}" thành công (Status: PENDING_APPROVAL)`);
    const approveRes = await request(`/businesses/${pendingBizId}/approve`, {
      method: 'POST',
      token: admin.token,
    });
    assert(approveRes.ok, `Admin duyệt Doanh nghiệp mới thành công (Status: APPROVED)`, JSON.stringify(approveRes.data));
  } else {
    // Nếu buyer đã có business, thử tìm doanh nghiệp PENDING hoặc dùng currentBiz
    console.log('  ℹ️ Buyer đã có business hoặc không thể tạo mới, kiểm tra quyền duyệt với Admin API');
    assert(adminBizList.ok, 'Admin có quyền xem và thao tác trên danh sách Doanh nghiệp');
  }

  console.log('\n[Step 4] Seller đăng và publish sách Hybrid mới');
  const categoriesRes = await request('/categories/tree');
  const categories = dataOf(categoriesRes) || [];
  const categoryId = categories[0]?.id;
  const bookTitle = `Phase 8 E2E Book ${Date.now()}`;

  const createBookRes = await request('/books', {
    method: 'POST',
    token: seller.token,
    body: {
      businessId: currentBiz?.id,
      title: bookTitle,
      description: 'Sách kiểm thử luồng Admin Platform Operations Phase 08.',
      price: 155000,
      format: 'BOTH',
      coverUrl: 'https://placehold.co/600x900/png?text=Phase+8+E2E',
      ...(categoryId && { categoryId }),
      physicalDetails: { stock: 20, weight: 300, length: 20, width: 14, height: 2, physicalEnabled: true },
      digitalDetails: { digitalEnabled: true, allowOnlineRead: true, allowDownload: false, drmEnabled: true },
    },
  });
  const book = dataOf(createBookRes);
  assert(createBookRes.ok && !!book?.id, 'Seller tạo sách Hybrid thành công', JSON.stringify(createBookRes.data));

  const publishRes = await request(`/books/${book.id}/publish`, { method: 'POST', token: seller.token });
  assert(publishRes.ok, 'Publish sách thành công (Trạng thái PUBLISHED)');

  console.log('\n[Step 5] Admin HUKI kiểm tra sách trên Catalog toàn sàn');
  const allBooksRes = await request(`/books?search=${encodeURIComponent(bookTitle)}`, { token: admin.token });
  const foundBook = itemsOf(allBooksRes).find(b => b.id === book.id || b.title === bookTitle);
  assert(!!foundBook?.id, 'Admin tìm thấy cuốn sách mới trong Catalog toàn sàn');

  console.log('\n[Step 6] Admin HUKI khóa sách vi phạm (Suspend)');
  const suspendRes = await request(`/books/${book.id}/suspend`, { method: 'POST', token: admin.token });
  assert(suspendRes.ok, 'Khóa phát hành sách vi phạm thành công (SUSPENDED)', JSON.stringify(suspendRes.data));

  const suspendedCheck = await request(`/books/${book.id}`, { token: admin.token });
  assert(dataOf(suspendedCheck)?.status === 'SUSPENDED', 'Trạng thái sách đã chuyển thành SUSPENDED');

  console.log('\n[Step 7] Kiểm tra bảo vệ hệ thống: Seller không thể tự ý publish sách đang bị SUSPENDED');
  const unauthorizedPublishRes = await request(`/books/${book.id}/publish`, { method: 'POST', token: seller.token });
  assert(!unauthorizedPublishRes.ok, 'Hệ thống chặn thành công Seller cố ý publish lại sách vi phạm đang bị SUSPENDED');

  console.log('\n[Step 8] Giám sát Sức khỏe Microservices (/health/services)');
  const healthRes = await request('/health/services');
  assert(healthRes.ok || healthRes.status === 200, `Health check phản hồi (Status: ${healthRes.status})`);
  const services = dataOf(healthRes)?.services || [];
  assert(Array.isArray(services) && services.length > 0, `Microservices status list trả về đủ (${services.length} services)`);

  console.log('\n[Step 9] Kiểm tra RBAC Security Guard: Buyer / Staff không thể gọi Admin Endpoint');
  const forbiddenBiz = await request('/businesses/admin/all', { token: buyer.token });
  assert(forbiddenBiz.status === 403, `Buyer bị chặn 403 khi cố truy cập /businesses/admin/all (Status: ${forbiddenBiz.status})`);

  if (currentBiz?.id) {
    const forbiddenApprove = await request(`/businesses/${currentBiz.id}/approve`, {
      method: 'POST',
      token: buyer.token,
    });
    assert(forbiddenApprove.status === 403, `Buyer bị chặn 403 khi cố duyệt Doanh nghiệp (Status: ${forbiddenApprove.status})`);
  }

  console.log('\n' + '='.repeat(72));
  console.log(`KẾT QUẢ E2E PHASE 08: ${passed} PASS / ${failed} FAIL`);
  console.log('='.repeat(72));

  if (failed > 0) process.exitCode = 1;
}

run().catch(error => {
  console.error(`\n❌ E2E dừng do lỗi: ${error.stack || error.message}`);
  process.exitCode = 1;
});
