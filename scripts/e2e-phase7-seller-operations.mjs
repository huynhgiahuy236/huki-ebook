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
  const client = new Client({
    connectionString: process.env.IDENTITY_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity',
  });
  const hash = await bcrypt.hash(TEST_PASSWORD, 12);
  await client.connect();
  await client.query(
    'UPDATE users SET password_hash = $1 WHERE email = ANY($2::text[])',
    [hash, ['phuongthuy@gmail.com', 'buyer_test@gmail.com', 'huy@gmail.com']],
  );
  await client.end();
}

async function login(email) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email, password: TEST_PASSWORD },
  });
  return { response, token: tokenOf(response) };
}

async function checkoutPhysicalBook(buyerToken, bookId, suffix) {
  await request('/cart', { method: 'DELETE', token: buyerToken });
  const add = await request('/cart/items', {
    method: 'POST',
    token: buyerToken,
    body: { bookId, format: 'PHYSICAL', quantity: 1 },
  });
  assert(add.ok, `Thêm sách vào giỏ (${suffix})`, JSON.stringify(add.data));

  const preview = await request('/cart/checkout/preview', {
    method: 'POST',
    token: buyerToken,
    body: {
      shippingAddress: {
        recipientName: 'Buyer Phase 7',
        phone: '0988123456',
        line1: '12 Nguyễn Văn Bảo',
        ward: 'Phường 5',
        district: 'Gò Vấp',
        province: 'Hồ Chí Minh',
      },
      note: `Phase 7 E2E ${suffix}`,
    },
  });
  const sessionId = dataOf(preview)?.sessionId;
  assert(preview.ok && !!sessionId, `Tạo checkout preview (${suffix})`, JSON.stringify(preview.data));
  if (!sessionId) return null;

  const confirm = await request('/cart/checkout/confirm', {
    method: 'POST',
    token: buyerToken,
    headers: { 'idempotency-key': `phase7-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: { sessionId, paymentMethod: 'COD' },
  });
  const order = dataOf(confirm)?.order;
  assert(confirm.ok && !!order?.id, `Tạo đơn COD (${suffix})`, JSON.stringify(confirm.data));
  return order || null;
}

async function findSellerOrder(sellerToken, buyerOrderId) {
  const response = await request('/seller/orders?limit=100', { token: sellerToken });
  return itemsOf(response).find(item => item.orderId === buyerOrderId);
}

async function run() {
  console.log('='.repeat(72));
  console.log('PHASE 07 E2E — SELLER CATALOG, INVENTORY & ORDER OPERATIONS');
  console.log('='.repeat(72));

  console.log('\n[Step 0] Service live check');
  const web = await fetch(WEB_BASE).catch(() => null);
  const gateway = await request('/businesses/my');
  assert(!!web?.ok, `Web live tại ${WEB_BASE}`);
  assert(gateway.status === 401, `Gateway live và auth guard hoạt động (${gateway.status})`);

  await resetTestPasswords();

  console.log('\n[Step 1] Seller login và business scope');
  const seller = await login('phuongthuy@gmail.com');
  let buyer = await login('buyer_test@gmail.com');
  if (!buyer.token) buyer = await login('huy@gmail.com');
  assert(!!seller.token, 'Seller owner đăng nhập thành công', JSON.stringify(seller.response.data));
  assert(!!buyer.token, 'Buyer đăng nhập thành công', JSON.stringify(buyer.response.data));
  if (!seller.token || !buyer.token) throw new Error('Không thể tiếp tục nếu thiếu token');
  const businessResponse = await request('/businesses/my', { token: seller.token });
  const business = dataOf(businessResponse);
  assert(businessResponse.ok && !!business?.id, 'Lấy đúng business của seller', JSON.stringify(businessResponse.data));

  console.log('\n[Step 2] Tạo và publish sách Hybrid');
  const categoriesResponse = await request('/categories/tree');
  const categories = dataOf(categoriesResponse) || [];
  const categoryId = categories[0]?.id;
  const title = `Phase 7 Hybrid E2E ${Date.now()}`;
  const createBook = await request('/books', {
    method: 'POST',
    token: seller.token,
    body: {
      businessId: business?.id,
      title,
      description: 'Sách kiểm thử tự động toàn trình Phase 07 Seller Operations.',
      price: 97000,
      format: 'BOTH',
      coverUrl: 'https://placehold.co/600x900/png?text=Phase+7+E2E',
      ...(categoryId && { categoryId }),
      physicalDetails: { stock: 5, weight: 350, length: 20, width: 14, height: 2, physicalEnabled: true },
      digitalDetails: { digitalEnabled: true, allowOnlineRead: true, allowDownload: false, drmEnabled: true },
    },
  });
  const book = dataOf(createBook);
  assert(createBook.ok && book?.format === 'BOTH', 'Tạo sách Hybrid thành công', JSON.stringify(createBook.data));
  if (!book?.id) throw new Error('Không có bookId');
  const publish = await request(`/books/${book.id}/publish`, { method: 'POST', token: seller.token });
  assert(publish.ok, 'Publish sách Hybrid thành công', JSON.stringify(publish.data));

  console.log('\n[Step 3] Cập nhật tồn kho lên 100');
  const stockUpdate = await request(`/books/${book.id}/inventory`, {
    method: 'PATCH',
    token: seller.token,
    body: { operation: 'SET', quantity: 100, reason: 'MANUAL_ADJUSTMENT' },
  });
  assert(stockUpdate.ok && Number(dataOf(stockUpdate)?.stock) === 100, 'Tồn kho được cập nhật chính xác thành 100', JSON.stringify(stockUpdate.data));

  console.log('\n[Step 4] Buyer đặt mua sách bằng COD');
  const order = await checkoutPhysicalBook(buyer.token, book.id, 'fulfillment');
  if (!order?.id) throw new Error('Không có order để fulfillment');
  const sellerOrder = await findSellerOrder(seller.token, order.id);
  assert(!!sellerOrder?.id, 'Đơn mới xuất hiện trong danh sách Seller');
  if (!sellerOrder?.id) throw new Error('Không tìm thấy seller order');

  console.log('\n[Step 5] Seller xác nhận đơn');
  const confirmed = await request(`/seller/orders/${sellerOrder.id}/confirm`, { method: 'PATCH', token: seller.token });
  assert(confirmed.ok && dataOf(confirmed)?.status === 'CONFIRMED', 'PENDING_CONFIRMATION → CONFIRMED', JSON.stringify(confirmed.data));

  console.log('\n[Step 6] Chuẩn bị và bàn giao vận chuyển');
  const prepared = await request(`/seller/orders/${sellerOrder.id}/prepare`, { method: 'PATCH', token: seller.token });
  assert(prepared.ok && dataOf(prepared)?.status === 'PREPARING', 'CONFIRMED → PREPARING', JSON.stringify(prepared.data));
  const shipped = await request(`/seller/orders/${sellerOrder.id}/ship`, {
    method: 'PATCH', token: seller.token,
    body: { carrier: 'GHTK', trackingCode: `P7${Date.now()}` },
  });
  assert(shipped.ok && dataOf(shipped)?.status === 'SHIPPED', 'PREPARING → SHIPPED', JSON.stringify(shipped.data));

  console.log('\n[Step 7] Hoàn tất và kiểm tra trừ tồn kho');
  const delivered = await request(`/seller/orders/${sellerOrder.id}/deliver`, { method: 'PATCH', token: seller.token });
  assert(delivered.ok && ['DELIVERED', 'COMPLETED'].includes(dataOf(delivered)?.status), 'SHIPPED → COMPLETED', JSON.stringify(delivered.data));
  const privateBook = await request(`/books/${book.id}`, { token: seller.token });
  assert(Number(dataOf(privateBook)?.physicalDetails?.stock) === 99, 'Tồn kho tự động giảm từ 100 xuống 99', JSON.stringify(privateBook.data));
  const detail = await request(`/seller/orders/${sellerOrder.id}`, { token: seller.token });
  assert(detail.ok && Array.isArray(dataOf(detail)?.timeline) && dataOf(detail).timeline.length >= 3, 'Chi tiết Seller có timeline trạng thái thật');

  console.log('\n[Step 8] Hủy đơn kèm lý do và đảm bảo hoàn kho');
  const cancelOrder = await checkoutPhysicalBook(buyer.token, book.id, 'cancel');
  if (!cancelOrder?.id) throw new Error('Không có order để hủy');
  const cancellable = await findSellerOrder(seller.token, cancelOrder.id);
  assert(!!cancellable?.id, 'Seller nhìn thấy đơn dùng để kiểm thử hủy');
  const cancelReason = 'E2E Phase 7: Khách yêu cầu';
  const cancelled = await request(`/seller/orders/${cancellable.id}/cancel`, {
    method: 'PATCH', token: seller.token, body: { reason: cancelReason },
  });
  assert(cancelled.ok && dataOf(cancelled)?.status === 'CANCELLED', 'Hủy đơn thành công', JSON.stringify(cancelled.data));
  const cancelledDetail = await request(`/seller/orders/${cancellable.id}`, { token: seller.token });
  assert(dataOf(cancelledDetail)?.cancelReason === cancelReason, 'Lý do hủy được lưu và trả về Buyer/Seller timeline');
  const finalBook = await request(`/books/${book.id}`, { token: seller.token });
  assert(Number(dataOf(finalBook)?.physicalDetails?.stock) === 99, 'Đơn hủy không làm giảm tồn kho đã hoàn tất');

  console.log('\n' + '='.repeat(72));
  console.log(`KẾT QUẢ: ${passed} PASS / ${failed} FAIL`);
  console.log('='.repeat(72));
  if (failed > 0) process.exitCode = 1;
}

run().catch(error => {
  console.error(`\n❌ E2E dừng do lỗi: ${error.stack || error.message}`);
  process.exitCode = 1;
});
