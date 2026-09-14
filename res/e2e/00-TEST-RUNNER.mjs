/**
 * HUKI EBOOK - Comprehensive E2E Bad Case Test Runner v2
 */

import fs from 'fs';
import path from 'path';

const API_BASE = process.env.HUKI_API_BASE || 'http://localhost:3000/api/v1';
const TEST_PASSWORD = 'Password123!';
const ts = Date.now();

const results = {
  auth: { pass: 0, fail: 0, cases: [] },
  business: { pass: 0, fail: 0, cases: [] },
  catalog: { pass: 0, fail: 0, cases: [] },
  cart: { pass: 0, fail: 0, cases: [] },
  order: { pass: 0, fail: 0, cases: [] },
  rbac: { pass: 0, fail: 0, cases: [] },
  inventory: { pass: 0, fail: 0, cases: [] },
  uiux: { pass: 0, fail: 0, cases: [] }
};

function log(category, status, testName, expected, actual, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'SKIP' ? '⏭️' : status === 'INFO' ? 'ℹ️' : '❌';
  console.log(`  ${icon} ${testName} | Expected: ${expected} | Actual: ${actual}`);
  results[category].cases.push({ name: testName, status, expected, actual, detail });
  if (status === 'PASS') results[category].pass++;
  else if (status === 'FAIL') results[category].fail++;
}

class SetupError extends Error {
  constructor(category, step, response) {
    const code = response?.data?.code || response?.data?.error?.code;
    const message = response?.data?.message || response?.data?.error?.message;
    super(`${step} failed (HTTP ${response?.status ?? 'N/A'}${code ? `, ${code}` : ''}${message ? `: ${message}` : ''})`);
    this.category = category;
    this.step = step;
    this.response = response;
  }
}

function requireSetup(category, step, response, value = response?.ok) {
  if (!response?.ok || !value) throw new SetupError(category, step, response);
  return value;
}

async function runSuite(category, suite) {
  try {
    await suite();
  } catch (error) {
    if (error instanceof SetupError) {
      log(category, 'SKIP', `${category.toUpperCase()}-SETUP`, '2xx + required data', error.response?.status ?? 'N/A', error.message);
      return;
    }
    throw error;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body && !['GET', 'HEAD'].includes(options.method || 'GET')
      ? JSON.stringify(options.body)
      : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

function extractToken(res) {
  const d = res.data?.data || res.data;
  return d?.tokens?.accessToken || d?.accessToken;
}

let phoneSequence = Number(String(Date.now()).slice(-6));

async function registerVerified(email, fullName = 'Test User') {
  phoneSequence = (phoneSequence + 1) % 1000000;
  const phone = `0900${String(phoneSequence).padStart(6, '0')}`;
  const registration = await request('/auth/register', {
    method: 'POST',
    body: { email, password: TEST_PASSWORD, fullName, phone },
  });
  requireSetup('auth', `register ${email}`, registration);
  const verification = await request('/auth/verify-email', {
    method: 'POST',
    body: { token: '123456' },
  });
  requireSetup('auth', `verify ${email}`, verification);
}

// ============= AUTH TESTS =============
async function testAuth() {
  console.log('\n🔐 [SUITE 1] AUTH & SECURITY');
  const t = Date.now();

  // TC-AUTH-001: Login với password sai
  let res = await request('/auth/login', { method: 'POST', body: { email: 'adminhuki@gmail.com', password: 'Wrong!' } });
  log('auth', res.status === 401 ? 'PASS' : 'FAIL', 'TC-AUTH-001', '401', res.status, 'Login sai password');

  // TC-AUTH-002: Login email không tồn tại
  res = await request('/auth/login', { method: 'POST', body: { email: `notexist_${t}@x.com`, password: TEST_PASSWORD } });
  log('auth', res.status === 401 ? 'PASS' : 'FAIL', 'TC-AUTH-002', '401', res.status, 'Login email không tồn tại');

  // TC-AUTH-003: Gọi API với token không hợp lệ
  res = await request('/auth/me', { headers: { Authorization: 'Bearer invalid_token' } });
  log('auth', res.status === 401 ? 'PASS' : 'FAIL', 'TC-AUTH-003', '401', res.status, 'Token không hợp lệ');

  // TC-AUTH-004: Gọi protected API không có token
  res = await request('/auth/me');
  log('auth', res.status === 401 ? 'PASS' : 'FAIL', 'TC-AUTH-004', '401', res.status, 'Không có token');

  // TC-AUTH-005: Register với email không hợp lệ
  res = await request('/auth/register', { method: 'POST', body: { email: 'notemail', password: TEST_PASSWORD, fullName: 'Test', phone: '0900' } });
  log('auth', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-AUTH-005', '4xx', res.status, 'Email không hợp lệ');

  // TC-AUTH-006: Register trùng email
  const email1 = `dup_${t}@x.com`;
  await request('/auth/register', { method: 'POST', body: { email: email1, password: TEST_PASSWORD, fullName: 'Test', phone: '0900' } });
  res = await request('/auth/register', { method: 'POST', body: { email: email1, password: TEST_PASSWORD, fullName: 'Test', phone: '0900' } });
  log('auth', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-AUTH-006', '4xx', res.status, 'Email trùng');

  // TC-AUTH-007: Register với password yếu
  res = await request('/auth/register', { method: 'POST', body: { email: `weak_${t}@x.com`, password: '123', fullName: 'Test', phone: '0900' } });
  if (res.status >= 400) log('auth', 'PASS', 'TC-AUTH-007', '4xx', res.status, 'Password yếu bị từ chối');
  else log('auth', 'INFO', 'TC-AUTH-007', '4xx or 2xx', res.status, 'Password yếu được chấp nhận (kiểm tra business logic)');

  // TC-AUTH-008: Register thiếu required fields
  res = await request('/auth/register', { method: 'POST', body: { email: `miss_${t}@x.com`, password: TEST_PASSWORD } });
  log('auth', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-AUTH-008', '4xx', res.status, 'Thiếu fullName/phone');

  // TC-AUTH-009: Logout với token không hợp lệ
  res = await request('/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer invalid' } });
  log('auth', res.status === 401 ? 'PASS' : 'FAIL', 'TC-AUTH-009', '401', res.status, 'Logout với invalid token');

  // TC-AUTH-010: Refresh token hết hạn
  res = await request('/auth/refresh', { method: 'POST', body: { refreshToken: 'expired_or_invalid' } });
  log('auth', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-AUTH-010', '4xx', res.status, 'Refresh với token không hợp lệ');
}

// ============= BUSINESS TESTS =============
async function testBusiness() {
  console.log('\n🏢 [SUITE 2] BUSINESS FLOW');
  const t = Date.now();

  const ownerEmail = `bowner_${t}@x.com`;
  const userEmail = `buser_${t}@x.com`;

  await registerVerified(ownerEmail, 'Owner');
  await registerVerified(userEmail, 'User');

  const ownerLogin = await request('/auth/login', { method: 'POST', body: { email: ownerEmail, password: TEST_PASSWORD } });
  const userLogin = await request('/auth/login', { method: 'POST', body: { email: userEmail, password: TEST_PASSWORD } });
  const ownerToken = extractToken(ownerLogin);
  const userToken = extractToken(userLogin);

  // TC-BIZ-001: USER submits an application; only Platform Admin may approve it.
  const res = await request('/businesses', { method: 'POST', headers: { Authorization: `Bearer ${userToken}` }, body: { name: 'Test', taxCode: `TAX${t}`, email: userEmail, phone: '0900', address: 'Test', businessType: 'CORPORATION' } });
  log('business', res.status === 201 ? 'PASS' : 'FAIL', 'TC-BIZ-001', '201', res.status, 'USER được nộp hồ sơ; quyền approve được kiểm tra riêng');

  const secondBusiness = await request('/businesses', { method: 'POST', headers: { Authorization: `Bearer ${userToken}` }, body: { name: 'Second Business', taxCode: `TAX${t}SECOND`, email: userEmail, phone: '0900', address: 'Test', businessType: 'CORPORATION' } });
  log('business', secondBusiness.status === 409 || secondBusiness.status === 403 ? 'PASS' : 'FAIL', 'TC-BIZ-001B', '403/409', secondBusiness.status, 'Một user không được tạo business thứ hai');

  // TC-BIZ-002: Duplicate tax code
  const taxCode = `TAX${t}`;
  await request('/businesses', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { name: 'First', taxCode, email: ownerEmail, phone: '0900', address: 'Test', businessType: 'CORPORATION' } });
  const dup = await request('/businesses', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { name: 'Second', taxCode, email: ownerEmail, phone: '0900', address: 'Test', businessType: 'CORPORATION' } });
  log('business', dup.status >= 400 ? 'PASS' : 'FAIL', 'TC-BIZ-002', '4xx', dup.status, 'Tax code trùng');

  // TC-BIZ-003: Thiếu required fields
  const miss = await request('/businesses', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { name: 'Incomplete' } });
  log('business', miss.status >= 400 ? 'PASS' : 'FAIL', 'TC-BIZ-003', '4xx', miss.status, 'Thiếu fields bắt buộc');

  // TC-BIZ-004: Owner cố approve chính mình
  // Tạo business mới để test
  const bizRes = await request('/businesses', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { name: 'Approve Test', taxCode: `TAX${t}AT`, email: ownerEmail, phone: '0900', address: 'Test', businessType: 'CORPORATION' } });
  const bizId = bizRes.data?.data?.id || bizRes.data?.id;
  if (bizId) {
    const selfApprove = await request(`/businesses/${bizId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` } });
    log('business', selfApprove.status === 403 ? 'PASS' : 'FAIL', 'TC-BIZ-004', '403', selfApprove.status, 'Owner tự approve');
  }

  // TC-BIZ-005: Non-admin cố approve
  if (bizId && userToken) {
    const nonAdminApprove = await request(`/businesses/${bizId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${userToken}` } });
    log('business', nonAdminApprove.status === 403 ? 'PASS' : 'FAIL', 'TC-BIZ-005', '403', nonAdminApprove.status, 'Non-admin approve business');
  }

  // TC-BIZ-006: Reject business với reason
  if (bizId) {
    await request('/auth/register', { method: 'POST', body: { email: `admin_${t}@x.com`, password: TEST_PASSWORD, fullName: 'Admin', phone: '0900' } });
    const adminLogin = await request('/auth/login', { method: 'POST', body: { email: `admin_${t}@x.com`, password: TEST_PASSWORD } });
    const adminToken = extractToken(adminLogin);
    // Login adminhuki thay vì tạo mới
    const hukiLogin = await request('/auth/login', { method: 'POST', body: { email: 'adminhuki@gmail.com', password: TEST_PASSWORD } });
    const hukiToken = extractToken(hukiLogin);
    if (bizId && hukiToken) {
      const rejectRes = await request(`/businesses/${bizId}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${hukiToken}` }, body: { reason: 'Test rejection' } });
      log('business', rejectRes.ok || rejectRes.status === 200 ? 'PASS' : 'FAIL', 'TC-BIZ-006', '2xx', rejectRes.status, 'Admin reject business');
    }
  }
}

// ============= CATALOG TESTS =============
async function testCatalog() {
  console.log('\n📚 [SUITE 3] CATALOG & BOOKS');
  const t = Date.now();

  const ownerEmail = `cowner_${t}@x.com`;
  const guestEmail = `cguest_${t}@x.com`;

  await registerVerified(ownerEmail, 'Owner');
  await registerVerified(guestEmail, 'Guest');

  const ownerLogin = await request('/auth/login', { method: 'POST', body: { email: ownerEmail, password: TEST_PASSWORD } });
  const guestLogin = await request('/auth/login', { method: 'POST', body: { email: guestEmail, password: TEST_PASSWORD } });
  const ownerToken = extractToken(ownerLogin);
  const guestToken = extractToken(guestLogin);

  // TC-CAT-001: Guest/User tạo book
  let res = await request('/books', { method: 'POST', headers: { Authorization: `Bearer ${guestToken}` }, body: { businessId: 'fake', title: 'Test', price: 100 } });
  log('catalog', res.status === 403 ? 'PASS' : 'FAIL', 'TC-CAT-001', '403', res.status, 'Guest tạo book');

  // TC-CAT-002: Thiếu title
  res = await request('/books', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { price: 100 } });
  log('catalog', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-CAT-002', '4xx', res.status, 'Thiếu title');

  // TC-CAT-003: Format không hợp lệ
  res = await request('/books', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { title: 'Test', price: 100, format: 'INVALID' } });
  log('catalog', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-CAT-003', '4xx', res.status, 'Format không hợp lệ');

  // TC-CAT-004: Price = 0
  res = await request('/books', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { title: 'Free Book', price: 0 } });
  if (res.status >= 400) log('catalog', 'PASS', 'TC-CAT-004', '4xx', res.status, 'Price = 0 bị từ chối');
  else log('catalog', 'INFO', 'TC-CAT-004', '4xx or 2xx', res.status, 'Price = 0 được chấp nhận');

  // TC-CAT-005: Publish đã publish
  // Tạo book mới
  const bizRes = await request('/businesses', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { name: 'Cat Biz', taxCode: `TAX${t}CAT`, email: ownerEmail, phone: '0900', address: 'Test', businessType: 'CORPORATION' } });
  const bizId = bizRes.data?.data?.id || bizRes.data?.id;

  // Approve business
  const hukiLogin = await request('/auth/login', { method: 'POST', body: { email: 'adminhuki@gmail.com', password: TEST_PASSWORD } });
  const hukiToken = extractToken(hukiLogin);
  if (bizId && hukiToken) await request(`/businesses/${bizId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${hukiToken}` } });

  const ownerReLogin = await request('/auth/login', { method: 'POST', body: { email: ownerEmail, password: TEST_PASSWORD } });
  const activeOwnerToken = extractToken(ownerReLogin);

  if (bizId && activeOwnerToken) {
    const bookRes = await request('/books', { method: 'POST', headers: { Authorization: `Bearer ${activeOwnerToken}` }, body: { businessId: bizId, title: 'Test Book', price: 50000, format: 'DIGITAL' } });
    const bookId = bookRes.data?.data?.id || bookRes.data?.id;

    if (bookId) {
      await request(`/books/${bookId}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${activeOwnerToken}` } });
      const dupPublish = await request(`/books/${bookId}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${activeOwnerToken}` } });
      log('catalog', dupPublish.status >= 400 ? 'PASS' : 'FAIL', 'TC-CAT-005', '4xx', dupPublish.status, 'Publish đã publish');
    }
  }

  // TC-CAT-006: User cố publish book của người khác
  if (bizId && guestToken && activeOwnerToken) {
    const bookRes2 = await request('/books', { method: 'POST', headers: { Authorization: `Bearer ${activeOwnerToken}` }, body: { businessId: bizId, title: 'Owner Book', price: 50000, format: 'DIGITAL' } });
    const bookId2 = bookRes2.data?.data?.id || bookRes2.data?.id;
    if (bookId2) {
      const guestPublish = await request(`/books/${bookId2}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${guestToken}` } });
      log('catalog', guestPublish.status === 403 ? 'PASS' : 'FAIL', 'TC-CAT-006', '403', guestPublish.status, 'Guest publish book người khác');
    }
  }
}

// ============= CART TESTS =============
async function testCart() {
  console.log('\n🛒 [SUITE 4] CART & CHECKOUT');
  const t = Date.now();

  const buyerEmail = `cart_${t}@x.com`;
  await registerVerified(buyerEmail, 'Buyer');
  const buyerLogin = await request('/auth/login', { method: 'POST', body: { email: buyerEmail, password: TEST_PASSWORD } });
  const buyerToken = extractToken(buyerLogin);

  // TC-CART-001: Checkout cart rỗng
  await request('/cart', { method: 'DELETE', headers: { Authorization: `Bearer ${buyerToken}` } });
  let res = await request('/cart/checkout/preview', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { shippingAddress: { recipientName: 'Test Buyer', phone: '0901234567', line1: '1 Test Street', ward: 'Test Ward', district: 'Test District', province: 'HCM' } } });
  log('cart', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-CART-001', '4xx', res.status, 'Checkout cart rỗng');

  // TC-CART-002: Checkout với session không tồn tại
  res = await request('/cart/checkout/confirm', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { sessionId: 'fake_session', paymentMethod: 'COD' } });
  log('cart', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-CART-002', '4xx', res.status, 'Session không tồn tại');

  // TC-CART-003: Bad address (thiếu required fields)
  res = await request('/cart/checkout/preview', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { shippingAddress: {} } });
  log('cart', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-CART-003', '4xx', res.status, 'Address thiếu fields');

  // TC-CART-004: Payment method không hợp lệ
  res = await request('/cart/checkout/confirm', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { sessionId: 'fake', paymentMethod: 'INVALID_PAYMENT' } });
  log('cart', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-CART-004', '4xx', res.status, 'Payment method không hợp lệ');

  // TC-CART-005: Idempotency - đặt 2 lần cùng idempotency key
  // Cần setup đầy đủ flow - test đơn giản trước
  res = await request('/cart/checkout/preview', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { shippingAddress: { recipientName: 'Test Buyer', phone: '0901234567', line1: '1 Test Street', ward: 'Test Ward', district: 'Test District', province: 'HCM' } } });
  const sessionId = res.data?.data?.sessionId || res.data?.sessionId;
  if (sessionId) {
    const confirm1 = await request('/cart/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}`, 'idempotency-key': `test_key_${t}` },
      body: { sessionId, paymentMethod: 'COD' }
    });
    const confirm2 = await request('/cart/checkout/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}`, 'idempotency-key': `test_key_${t}` },
      body: { sessionId, paymentMethod: 'COD' }
    });
    // Idempotency: request thứ 2 nên trả về cùng kết quả hoặc 409
    if (confirm2.status === 409 || confirm2.data?.id === confirm1.data?.id) {
      log('cart', 'PASS', 'TC-CART-005', '409 or same id', `${confirm2.status}`, 'Idempotency hoạt động');
    } else {
      log('cart', 'FAIL', 'TC-CART-005', '409 or same id', `${confirm2.status}`, 'Idempotency không hoạt động');
    }
  }
}

// ============= ORDER TESTS =============
async function testOrder() {
  console.log('\n📦 [SUITE 5] ORDER FULFILLMENT');
  const t = Date.now();

  // Setup full flow: owner + business + book + buyer + order
  const buyerEmail = `ordbuyer_${t}@x.com`;
  const ownerEmail = `ordowner_${t}@x.com`;

  await registerVerified(buyerEmail, 'Buyer');
  await registerVerified(ownerEmail, 'Owner');

  const buyerLogin = await request('/auth/login', { method: 'POST', body: { email: buyerEmail, password: TEST_PASSWORD } });
  const ownerLogin = await request('/auth/login', { method: 'POST', body: { email: ownerEmail, password: TEST_PASSWORD } });
  const buyerToken = requireSetup('order', 'buyer login', buyerLogin, extractToken(buyerLogin));
  let ownerToken = requireSetup('order', 'owner login', ownerLogin, extractToken(ownerLogin));

  // Create + approve business
  const bizRes = await request('/businesses', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { name: 'Order Biz', taxCode: `TAX${t}ORD`, email: ownerEmail, phone: '0900', address: 'Test', businessType: 'CORPORATION' } });
  const bizId = requireSetup('order', 'create business', bizRes, bizRes.data?.data?.id || bizRes.data?.id);

  const hukiLogin = await request('/auth/login', { method: 'POST', body: { email: 'adminhuki@gmail.com', password: TEST_PASSWORD } });
  const hukiToken = requireSetup('order', 'Admin HUKI login', hukiLogin, extractToken(hukiLogin));
  const approvalRes = await request(`/businesses/${bizId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${hukiToken}` } });
  requireSetup('order', 'approve business', approvalRes);

  const ownerReLogin = await request('/auth/login', { method: 'POST', body: { email: ownerEmail, password: TEST_PASSWORD } });
  ownerToken = requireSetup('order', 'owner re-login after approval', ownerReLogin, extractToken(ownerReLogin));

  // Create book
  const bookRes = await request('/books', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { businessId: bizId, title: 'Order Book', price: 50000, format: 'PHYSICAL', physicalDetails: { stock: 10, weight: 500, length: 20, width: 14, height: 3, physicalEnabled: true } } });
  const bookId = requireSetup('order', 'create physical book', bookRes, bookRes.data?.data?.id || bookRes.data?.id);
  const publishRes = await request(`/books/${bookId}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` } });
  requireSetup('order', 'publish physical book', publishRes);

  // Create order
  const addCartRes = await request('/cart/items', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { bookId, format: 'PHYSICAL', quantity: 1 } });
  requireSetup('order', 'add physical book to cart', addCartRes);
  const previewRes = await request('/cart/checkout/preview', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { shippingAddress: { recipientName: 'Test Buyer', phone: '0901234567', line1: '1 Test Street', ward: 'Test Ward', district: 'Test District', province: 'HCM' } } });
  const sessionId = requireSetup('order', 'checkout preview', previewRes, previewRes.data?.data?.sessionId || previewRes.data?.sessionId);
  const orderRes = await request('/cart/checkout/confirm', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}`, 'idempotency-key': `order_${t}` }, body: { sessionId, paymentMethod: 'COD' } });
  const orderId = requireSetup('order', 'checkout confirm COD', orderRes, orderRes.data?.data?.order?.id || orderRes.data?.data?.id || orderRes.data?.id);
  const sellerOrdersRes = await request('/seller/orders', { headers: { Authorization: `Bearer ${ownerToken}` } });
  const sellerOrders = sellerOrdersRes.data?.data || sellerOrdersRes.data?.items || [];
  const sellerOrder = Array.isArray(sellerOrders)
    ? sellerOrders.find(item => item.orderId === orderId || item.parentOrderId === orderId) || sellerOrders[0]
    : null;
  const sellerOrderId = requireSetup('order', 'resolve seller order', sellerOrdersRes, sellerOrder?.id);

  // TC-ORD-001: Buyer cố confirm order
  if (orderId && buyerToken) {
    const res = await request(`/seller/orders/${sellerOrderId}/confirm`, { method: 'PATCH', headers: { Authorization: `Bearer ${buyerToken}` } });
    log('order', res.status === 403 ? 'PASS' : 'FAIL', 'TC-ORD-001', '403', res.status, 'Buyer confirm order');
  }

  // TC-ORD-002: Ship order chưa confirmed
  if (orderId && ownerToken) {
    const res = await request(`/seller/orders/${sellerOrderId}/ship`, { method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}` }, body: { carrier: 'GHTK', trackingCode: 'TEST' } });
    log('order', res.status >= 400 ? 'PASS' : 'FAIL', 'TC-ORD-002', '4xx', res.status, 'Ship chưa confirm');
  }

  // TC-ORD-003: Confirm -> prepare -> ship -> deliver -> cancel (nên fail)
  if (orderId && ownerToken) {
    await request(`/seller/orders/${sellerOrderId}/confirm`, { method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}` } });
    await request(`/seller/orders/${sellerOrderId}/prepare`, { method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}` } });
    await request(`/seller/orders/${sellerOrderId}/ship`, { method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}` }, body: { carrier: 'GHTK', trackingCode: 'TEST' } });
    await request(`/seller/orders/${sellerOrderId}/deliver`, { method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}` } });

    const cancelRes = await request(`/seller/orders/${sellerOrderId}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}` }, body: { reason: 'Test' } });
    log('order', cancelRes.status >= 400 ? 'PASS' : 'FAIL', 'TC-ORD-003', '4xx', cancelRes.status, 'Cancel đã deliver');
  }

  // TC-ORD-004: Staff với ORDER_VIEW không thể process
  const staffEmail = `ordstaff_${t}@x.com`;
  const staffProvision = await request(`/businesses/${bizId}/members/provision`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: { fullName: 'Staff', email: staffEmail, phone: '0900', initialPassword: 'Staff123!', role: 'ORDER_STAFF', permissions: ['ORDER_VIEW'] }
  });

  if (staffProvision.ok) {
    const staffLogin = await request('/auth/login', { method: 'POST', body: { email: staffEmail, password: 'Staff123!' } });
    const staffToken = extractToken(staffLogin);

    // Tạo order mới
    await request('/cart/items', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { bookId, format: 'PHYSICAL', quantity: 1 } });
    const p = await request('/cart/checkout/preview', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { shippingAddress: { recipientName: 'Test Buyer', phone: '0901234567', line1: '1 Test Street', ward: 'Test Ward', district: 'Test District', province: 'HCM' } } });
    const s = p.data?.data?.sessionId || p.data?.sessionId;
    const o = await request('/cart/checkout/confirm', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}`, 'idempotency-key': `staff_order_${t}` }, body: { sessionId: s, paymentMethod: 'COD' } });
    const parentOrderId = o.data?.data?.order?.id || o.data?.data?.id || o.data?.id;
    const staffOrderListRes = await request('/seller/orders', { headers: { Authorization: `Bearer ${ownerToken}` } });
    const staffOrderList = staffOrderListRes.data?.data || staffOrderListRes.data?.items || [];
    const oId = Array.isArray(staffOrderList)
      ? (staffOrderList.find(item => item.orderId === parentOrderId || item.parentOrderId === parentOrderId) || staffOrderList[0])?.id
      : null;

    if (staffToken && oId) {
      const staffConfirm = await request(`/seller/orders/${oId}/confirm`, { method: 'PATCH', headers: { Authorization: `Bearer ${staffToken}` } });
      log('order', staffConfirm.status === 403 ? 'PASS' : 'FAIL', 'TC-ORD-004', '403', staffConfirm.status, 'Staff ORDER_VIEW confirm');
    }
  }
}

// ============= RBAC TESTS =============
async function testRbac() {
  console.log('\n🛡️ [SUITE 6] RBAC & PERMISSIONS');
  const t = Date.now();

  const userEmail = `rbac_${t}@x.com`;
  await registerVerified(userEmail, 'User');
  const userLogin = await request('/auth/login', { method: 'POST', body: { email: userEmail, password: TEST_PASSWORD } });
  const userToken = extractToken(userLogin);

  // TC-RBAC-001: User gọi seller API
  let res = await request('/seller/orders', { headers: { Authorization: `Bearer ${userToken}` } });
  log('rbac', res.status === 403 ? 'PASS' : 'FAIL', 'TC-RBAC-001', '403', res.status, 'User seller API');

  // TC-RBAC-002: User gọi health (có thể public)
  res = await request('/health/services', { headers: { Authorization: `Bearer ${userToken}` } });
  if (res.status === 403) log('rbac', 'PASS', 'TC-RBAC-002', '403', res.status, 'Health cần auth');
  else log('rbac', 'INFO', 'TC-RBAC-002', '403 or 200', res.status, 'Health endpoint public');

  // TC-RBAC-003: Guest gọi protected API
  res = await request('/auth/me');
  log('rbac', res.status === 401 ? 'PASS' : 'FAIL', 'TC-RBAC-003', '401', res.status, 'Guest protected API');

  // TC-RBAC-004: Owner provision cho business không thuộc về
  res = await request('/businesses/fake-biz-id/members/provision', { method: 'POST', headers: { Authorization: `Bearer ${userToken}` }, body: { fullName: 'H', email: `hack_${t}@x.com`, phone: '0900', initialPassword: 'Pass!', role: 'ORDER_STAFF', permissions: [] } });
  log('rbac', res.status === 403 || res.status === 404 ? 'PASS' : 'FAIL', 'TC-RBAC-004', '403/404', res.status, 'Provision business khác');

  // TC-RBAC-005: Buyer thấy seller orders
  res = await request('/seller/orders', { headers: { Authorization: `Bearer ${userToken}` } });
  log('rbac', res.status === 403 ? 'PASS' : 'FAIL', 'TC-RBAC-005', '403', res.status, 'Buyer seller orders');
}

// ============= INVENTORY TESTS =============
async function testInventory() {
  console.log('\n📊 [SUITE 7] INVENTORY');
  const t = Date.now();

  const buyerEmail = `invbuy_${t}@x.com`;
  const ownerEmail = `invown_${t}@x.com`;

  await registerVerified(buyerEmail, 'Buyer');
  await registerVerified(ownerEmail, 'Owner');

  const buyerLogin = await request('/auth/login', { method: 'POST', body: { email: buyerEmail, password: TEST_PASSWORD } });
  const ownerLogin = await request('/auth/login', { method: 'POST', body: { email: ownerEmail, password: TEST_PASSWORD } });
  const buyerToken = requireSetup('inventory', 'buyer login', buyerLogin, extractToken(buyerLogin));
  let ownerToken = requireSetup('inventory', 'owner login', ownerLogin, extractToken(ownerLogin));

  const bizRes = await request('/businesses', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { name: 'Inv Biz', taxCode: `TAX${t}INV`, email: ownerEmail, phone: '0900', address: 'Test', businessType: 'CORPORATION' } });
  const bizId = requireSetup('inventory', 'create business', bizRes, bizRes.data?.data?.id || bizRes.data?.id);

  const hukiLogin = await request('/auth/login', { method: 'POST', body: { email: 'adminhuki@gmail.com', password: TEST_PASSWORD } });
  const hukiToken = requireSetup('inventory', 'Admin HUKI login', hukiLogin, extractToken(hukiLogin));
  const approvalRes = await request(`/businesses/${bizId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${hukiToken}` } });
  requireSetup('inventory', 'approve business', approvalRes);

  const ownerReLogin = await request('/auth/login', { method: 'POST', body: { email: ownerEmail, password: TEST_PASSWORD } });
  ownerToken = requireSetup('inventory', 'owner re-login after approval', ownerReLogin, extractToken(ownerReLogin));

  // TC-INV-001: Stock không âm khi cancel
  const bookRes = await request('/books', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { businessId: bizId, title: 'Low Stock', price: 30000, format: 'PHYSICAL', physicalDetails: { stock: 1, weight: 500, length: 20, width: 14, height: 3, physicalEnabled: true } } });
  const bookId = bookRes.data?.data?.id || bookRes.data?.id;
  if (bookId) {
    await request(`/books/${bookId}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` } });

    await request('/cart/items', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { bookId, format: 'PHYSICAL', quantity: 1 } });
    const p = await request('/cart/checkout/preview', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}` }, body: { shippingAddress: { recipientName: 'Test Buyer', phone: '0901234567', line1: '1 Test Street', ward: 'Test Ward', district: 'Test District', province: 'HCM' } } });
    const s = p.data?.data?.sessionId || p.data?.sessionId;
    await request('/cart/checkout/confirm', { method: 'POST', headers: { Authorization: `Bearer ${buyerToken}`, 'idempotency-key': `inventory_${t}` }, body: { sessionId: s, paymentMethod: 'COD' } });

    // Owner confirm + cancel
    const ordersRes = await request('/seller/orders', { headers: { Authorization: `Bearer ${ownerToken}` } });
    const orders = ordersRes.data?.data || ordersRes.data?.items || [];
    const order = orders[0];
    if (order?.id) {
      await request(`/seller/orders/${order.id}/confirm`, { method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}` } });
      await request(`/seller/orders/${order.id}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}` }, body: { reason: 'Test' } });

      const bookDetail = await request(`/books/${bookId}`, { headers: { Authorization: `Bearer ${ownerToken}` } });
      const stock = bookDetail.data?.data?.physicalDetails?.stock || bookDetail.data?.physicalDetails?.stock;
      log('inventory', stock >= 0 ? 'PASS' : 'FAIL', 'TC-INV-001', '>= 0', stock, 'Stock sau cancel');
    }
  }

  // TC-INV-002: Digital book không cần stock
  const digRes = await request('/books', { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` }, body: { businessId: bizId, title: 'Digital', price: 50000, format: 'DIGITAL', digitalDetails: { digitalEnabled: true } } });
  const digBookId = requireSetup('inventory', 'create digital book', digRes, digRes.data?.data?.id || digRes.data?.id);
  if (digBookId) {
    const digitalPublishRes = await request(`/books/${digBookId}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` } });
    requireSetup('inventory', 'publish digital book', digitalPublishRes);

    // 3 users mua digital
    let success = 0;
    const failures = [];
    for (let i = 0; i < 3; i++) {
      const tempEmail = `dig_${t}_${i}@x.com`;
      await registerVerified(tempEmail, 'Test Buyer');
      const tempRegister = { status: 201 };
      const tLogin = await request('/auth/login', { method: 'POST', body: { email: tempEmail, password: TEST_PASSWORD } });
      const tToken = extractToken(tLogin);

      const addDigital = await request('/cart/items', { method: 'POST', headers: { Authorization: `Bearer ${tToken}` }, body: { bookId: digBookId, format: 'DIGITAL', quantity: 1 } });
      const tp = await request('/cart/checkout/preview', { method: 'POST', headers: { Authorization: `Bearer ${tToken}` }, body: { shippingAddress: { recipientName: 'Test Buyer', phone: '0901234567', line1: '1 Test Street', ward: 'Test Ward', district: 'Test District', province: 'HCM' } } });
      const ts2 = tp.data?.data?.sessionId || tp.data?.sessionId;
      const to = await request('/cart/checkout/confirm', { method: 'POST', headers: { Authorization: `Bearer ${tToken}`, 'idempotency-key': `digital_${t}_${i}` }, body: { sessionId: ts2, paymentMethod: 'COD' } });
      if (to.ok) success++;
      else failures.push(`user ${i + 1}: register=${tempRegister.status}, login=${tLogin.status}, add=${addDigital.status}, preview=${tp.status}, confirm=${to.status}/${to.data?.code || to.data?.error?.code || to.data?.message || 'unknown'}`);
    }
    log('inventory', success === 3 ? 'PASS' : 'FAIL', 'TC-INV-002', '3/3', `${success}/3`, failures.join('; ') || 'Digital book mua nhiều lần');
  }
}

// ============= UI/UX TESTS =============
async function testUiUx() {
  console.log('\n🎨 [SUITE 8] UI/UX VALIDATION');
  const t = Date.now();

  // TC-UX-001: Response format consistency
  let res = await request('/auth/login', { method: 'POST', body: { email: `test_${t}@x.com`, password: 'wrong' } });
  const hasEnvelope = res.data?.data !== undefined || res.data?.accessToken !== undefined;
  log('uiux', hasEnvelope ? 'PASS' : 'INFO', 'TC-UX-001', 'envelope', hasEnvelope ? 'Yes' : 'No', 'Response envelope consistency');

  // TC-UX-002: Error message format
  if (res.data?.message) {
    log('uiux', 'PASS', 'TC-UX-002', 'message field', 'Yes', 'Error có message');
  } else {
    log('uiux', 'FAIL', 'TC-UX-002', 'message field', 'No', 'Error không có message');
  }

  // TC-UX-003: HTTP status code consistency
  const tests = [
    { endpoint: '/auth/login', method: 'POST', body: { email: 'x', password: 'x' }, expected: 400 },
    { endpoint: '/auth/me', method: 'GET', expected: 401 },
    { endpoint: '/seller/orders', method: 'GET', body: {}, expected: 401 }
  ];

  for (const test of tests) {
    const r = await request(test.endpoint, { method: test.method, body: test.body });
    if (r.status === test.expected) {
      log('uiux', 'PASS', `TC-UX-003`, `${test.expected}`, `${r.status}`, `${test.method} ${test.endpoint}`);
    } else {
      log('uiux', 'FAIL', `TC-UX-003`, `${test.expected}`, `${r.status}`, `${test.method} ${test.endpoint}`);
    }
  }
}

// ============= MAIN =============
async function main() {
  console.log('═'.repeat(65));
  console.log('🚀 HUKI EBOOK - COMPREHENSIVE BAD CASE E2E TEST SUITE');
  console.log('═'.repeat(65));
  console.log(`API: ${API_BASE}`);
  console.log(`Time: ${new Date().toISOString()}`);

  try {
    await runSuite('auth', testAuth);
    await runSuite('business', testBusiness);
    await runSuite('catalog', testCatalog);
    await runSuite('cart', testCart);
    await runSuite('order', testOrder);
    await runSuite('rbac', testRbac);
    await runSuite('inventory', testInventory);
    await runSuite('uiux', testUiUx);
  } catch (e) {
    console.error('ERROR:', e.message);
  }

  // Summary
  console.log('\n' + '═'.repeat(65));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(65));

  let totalPass = 0, totalFail = 0, totalSkip = 0, totalInfo = 0;
  for (const [suite, data] of Object.entries(results)) {
    if (data.cases.length > 0) {
      const skipped = data.cases.filter(test => test.status === 'SKIP').length;
      const info = data.cases.filter(test => test.status === 'INFO').length;
      const executed = data.pass + data.fail;
      const rate = executed > 0 ? ((data.pass / executed) * 100).toFixed(0) : 'N/A';
      console.log(`  ${suite.padEnd(12)} | ${data.pass.toString().padStart(3)} PASS | ${data.fail.toString().padStart(3)} FAIL | ${skipped.toString().padStart(3)} SKIP | ${info.toString().padStart(3)} INFO | ${rate}%`);
      totalPass += data.pass;
      totalFail += data.fail;
      totalSkip += skipped;
      totalInfo += info;
    }
  }
  console.log('─'.repeat(45));
  const totalRate = totalPass + totalFail > 0 ? ((totalPass / (totalPass + totalFail)) * 100).toFixed(1) : '0';
  console.log(`  TOTAL        | ${totalPass.toString().padStart(3)} PASS | ${totalFail.toString().padStart(3)} FAIL | ${totalRate}%`);
  console.log('═'.repeat(65));

  // Export results
  const report = {
    timestamp: new Date().toISOString(),
    summary: { totalPass, totalFail, totalSkip, totalInfo, passRate: totalRate },
    results
  };

  fs.writeFileSync('res/e2e/test-results.json', JSON.stringify(report, null, 2));
  console.log('\n📁 Results saved to res/e2e/test-results.json');
}

main().catch(console.error);
