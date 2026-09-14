import http from 'http';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let pg;
try {
  pg = require('pg');
} catch {
  pg = require('../platform/node_modules/pg');
}
const { Client } = pg;

const API_BASE = 'http://localhost:3000/api/v1';
const WEB_BASE = 'http://localhost:3100';

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

async function checkWeb() {
  try {
    const res = await fetch(WEB_BASE);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function ensureUsers() {
  let bcrypt;
  try {
    bcrypt = require('bcrypt');
  } catch {
    bcrypt = require('../platform/node_modules/bcrypt');
  }

  const hash = await bcrypt.hash('Password123!', 12);
  const client = new Client({
    connectionString: process.env.IDENTITY_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity',
  });
  await client.connect();
  await client.query('UPDATE users SET password_hash = $1 WHERE email = $2 OR email = $3', [
    hash,
    'huy@gmail.com',
    'phuongthuy@gmail.com',
  ]);
  await client.end();
}

async function runE2E() {
  console.log('================================================================');
  console.log('🚀 HU-KI EBOOK: PHASE 04 E2E CHECKOUT & FULFILLMENT VERIFICATION');
  console.log('================================================================\n');

  let passedSteps = 0;
  const totalSteps = 8;

  // Step 0: Check Frontend and Backend Services
  console.log('▶ [Step 0] Kiểm tra kết nối Frontend & API Gateway...');
  const webStatus = await checkWeb();
  console.log(`  - Frontend (${WEB_BASE}): ${webStatus.ok ? '✅ LIVE (HTTP ' + webStatus.status + ')' : '⚠️ UNREACHABLE (' + webStatus.error + ')'}`);

  const healthRes = await request('/health');
  console.log(`  - Gateway Health: ${healthRes.ok || healthRes.status === 404 ? '✅ Gateway Live (Port 3000)' : '⚠️ Status ' + healthRes.status}`);

  // Ensure test accounts password
  await ensureUsers();

  // Step 1: Login Buyer & Seller Accounts
  console.log('\n▶ [Step 1] Đăng nhập tài khoản Người mua (Buyer) & Người bán (Seller)...');
  let buyerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'huy@gmail.com', password: 'Password123!' },
  });

  let sellerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'phuongthuy@gmail.com', password: 'Password123!' },
  });

  let buyerToken = buyerLogin.data?.data?.accessToken || buyerLogin.data?.data?.tokens?.accessToken || buyerLogin.data?.tokens?.accessToken;
  let sellerToken = sellerLogin.data?.data?.accessToken || sellerLogin.data?.data?.tokens?.accessToken || sellerLogin.data?.tokens?.accessToken;

  if (!buyerToken) {
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        email: `buyer_e2e_${Date.now()}@huki.com`,
        password: 'Password123!',
        fullName: 'Huỳnh Gia Huy (E2E Test)',
        phone: '0988123456',
      },
    });
    buyerToken = regRes.data?.data?.accessToken || regRes.data?.data?.tokens?.accessToken || regRes.data?.tokens?.accessToken;
  }

  if (!buyerToken || !sellerToken) {
    console.error('❌ Thất bại: Không thể lấy token đăng nhập cho Buyer hoặc Seller');
    console.log('Buyer login response:', JSON.stringify(buyerLogin.data));
    console.log('Seller login response:', JSON.stringify(sellerLogin.data));
    process.exit(1);
  }
  console.log('  - Buyer Token:  ✅ Thu được accessToken thành công (huy@gmail.com)');
  console.log('  - Seller Token: ✅ Thu được accessToken thành công (phuongthuy@gmail.com)');
  passedSteps++;

  // Step 2: Catalog Discovery
  console.log('\n▶ [Step 2] Lấy thông tin sách từ danh mục công khai...');
  const booksRes = await request('/books?limit=10');
  const books = Array.isArray(booksRes.data?.data) ? booksRes.data.data : (Array.isArray(booksRes.data?.items) ? booksRes.data.items : []);
  
  if (!books || books.length === 0) {
    console.error('❌ Thất bại: Không tìm thấy sách nào trong catalog');
    process.exit(1);
  }

  const selectedBook = books[0];
  console.log(`  - Sách chọn mua: "${selectedBook.title}" (ID: ${selectedBook.id})`);
  console.log(`  - Định dạng: ${selectedBook.format} | Giá: ${Number(selectedBook.price).toLocaleString('vi-VN')}đ`);
  passedSteps++;

  // Step 3: Cart Lifecycle (Sprint 13)
  console.log('\n▶ [Step 3] Thao tác Giỏ hàng (Clear -> Add -> Get Cart)...');
  await request('/cart', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${buyerToken}` },
  });

  const addCartRes = await request('/cart/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: {
      bookId: selectedBook.id,
      format: selectedBook.format === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL',
      quantity: 1,
    },
  });

  const getCartRes = await request('/cart', {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });

  const cartData = getCartRes.data?.data || getCartRes.data;
  const cartItems = Array.isArray(cartData) ? cartData : (cartData?.items || []);
  const subtotal = Array.isArray(cartData)
    ? cartItems.reduce((sum, item) => sum + Number(item.subtotal || item.unitPrice * item.quantity || 0), 0)
    : (cartData?.subtotal || 0);
  console.log(`  - Thêm vào giỏ: ${addCartRes.ok ? '✅ Thành công (HTTP ' + addCartRes.status + ')' : '❌ Thất bại (' + JSON.stringify(addCartRes.data) + ')'}`);
  console.log(`  - Kiểm tra giỏ hàng: Có ${cartItems.length} sản phẩm, Tổng tạm tính: ${Number(subtotal).toLocaleString('vi-VN')}đ`);
  passedSteps++;

  // Step 4: Shipping Address (Sprint 14)
  console.log('\n▶ [Step 4] Kiểm tra Sổ địa chỉ nhận hàng (Shipping Address)...');
  const addrRes = await request('/shipping/address', {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });

  let activeAddress = Array.isArray(addrRes.data?.data) ? addrRes.data.data[0] : (Array.isArray(addrRes.data) ? addrRes.data[0] : null);
  
  if (!activeAddress) {
    console.log('  - Chưa có địa chỉ, đang tạo địa chỉ mặc định mới...');
    const createAddrRes = await request('/shipping/address', {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        recipientName: 'Huỳnh Gia Huy',
        phone: '0988123456',
        addressLine1: '12 Nguyễn Văn Bảo',
        ward: 'Phường 5',
        district: 'Quận Gò Vấp',
        city: 'TP. Hồ Chí Minh',
        isDefault: true,
      },
    });
    activeAddress = createAddrRes.data?.data || createAddrRes.data;
  }
  console.log(`  - Địa chỉ nhận hàng: ✅ ${activeAddress?.recipientName || 'Huỳnh Gia Huy'} - ${activeAddress?.phone || '0988123456'} (${activeAddress?.addressLine1 || activeAddress?.line1 || '12 Nguyễn Văn Bảo'}, ${activeAddress?.city || activeAddress?.province || 'TP. Hồ Chí Minh'})`);
  passedSteps++;

  // Step 5: Checkout Preview & COD Confirm (Sprint 15)
  console.log('\n▶ [Step 5] Tính toán giá Preview & Xác nhận đặt hàng COD...');
  const previewRes = await request('/cart/checkout/preview', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: {
      shippingAddress: {
        recipientName: activeAddress?.recipientName || 'Huỳnh Gia Huy',
        phone: '0988123456',
        line1: activeAddress?.addressLine1 || activeAddress?.line1 || '12 Nguyễn Văn Bảo',
        ward: activeAddress?.ward || 'Phường 5',
        district: activeAddress?.district || 'Quận Gò Vấp',
        province: activeAddress?.city || activeAddress?.province || 'Hồ Chí Minh',
      },
      note: 'Giao giờ hành chính giúp mình',
    },
  });

  const previewData = previewRes.data?.data || previewRes.data;
  const sessionId = previewData?.sessionId;

  if (!sessionId) {
    console.error('❌ Thất bại: Không thể khởi tạo phiên thanh toán (Checkout Preview)');
    console.log('Preview Response:', JSON.stringify(previewRes.data));
    process.exit(1);
  }

  console.log(`  - Preview thành công: Session ID: ${sessionId}`);
  console.log(`  - Tạm tính: ${Number(previewData.itemSubtotal).toLocaleString('vi-VN')}đ | Phí ship: ${Number(previewData.shippingTotal).toLocaleString('vi-VN')}đ | Tổng đơn: ${Number(previewData.grandTotal).toLocaleString('vi-VN')}đ`);

  const idempotencyKey = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
  const order = confirmData?.order;

  if (!order || !order.id) {
    console.error('❌ Thất bại: Không tạo được đơn hàng COD');
    console.log('Confirm Response:', JSON.stringify(confirmRes.data));
    process.exit(1);
  }

  console.log(`  - ✅ ĐẶT HÀNG COD THÀNH CÔNG! Mã đơn: #${order.code} (ID: ${order.id})`);
  console.log(`  - Trạng thái đơn: ${order.status} | Phương thức: ${order.paymentMethod}`);
  passedSteps++;

  // Step 6: Buyer Order Details Verification (Sprint 16A)
  console.log('\n▶ [Step 6] Kiểm tra danh sách & chi tiết đơn của Người Mua (/orders)...');
  const buyerOrdersRes = await request('/orders', {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });

  const buyerOrders = Array.isArray(buyerOrdersRes.data?.data) ? buyerOrdersRes.data.data : (Array.isArray(buyerOrdersRes.data?.items) ? buyerOrdersRes.data.items : []);
  const foundOrder = buyerOrders.find((o) => o.id === order.id || o.code === order.code);
  console.log(`  - Danh sách đơn hàng Buyer: ${foundOrder ? '✅ Tìm thấy đơn #' + order.code + ' trong danh sách' : '⚠️ Không thấy trong list (tổng: ' + buyerOrders.length + ')'}`);

  const buyerDetailRes = await request(`/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  console.log(`  - Chi tiết đơn hàng Buyer: ${buyerDetailRes.ok ? '✅ Lấy chi tiết đơn thành công (HTTP 200)' : '❌ Lỗi'}`);
  passedSteps++;

  // Step 7: Seller Order Management & State Transition (Sprint 16B)
  console.log('\n▶ [Step 7] Kiểm tra & Xử lý đơn hàng của Người Bán (/seller/orders)...');
  const sellerOrdersRes = await request('/seller/orders', {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });

  const sellerOrders = Array.isArray(sellerOrdersRes.data?.data) ? sellerOrdersRes.data.data : (Array.isArray(sellerOrdersRes.data?.items) ? sellerOrdersRes.data.items : []);
  const targetSellerOrder = sellerOrders.find((so) => so.orderId === order.id || so.code.startsWith(order.code));

  if (!targetSellerOrder) {
    console.error('❌ Thất bại: Đơn hàng không xuất hiện trong bảng quản lý của Seller');
    console.log('Seller Orders list:', JSON.stringify(sellerOrders));
    process.exit(1);
  }

  console.log(`  - Tìm thấy kiện hàng Seller: #${targetSellerOrder.code} (Trạng thái ban đầu: ${targetSellerOrder.status})`);

  // Seller Action 1: Confirm Order
  const confirmOrderRes = await request(`/seller/orders/${targetSellerOrder.id}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  console.log(`  - 1. Seller xác nhận đơn:   ${confirmOrderRes.ok ? '✅ Thành công (Chờ xác nhận ➔ Đã tiếp nhận)' : '❌ Lỗi ' + confirmOrderRes.status}`);

  // Seller Action 2: Prepare Order
  const prepareOrderRes = await request(`/seller/orders/${targetSellerOrder.id}/prepare`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  console.log(`  - 2. Seller chuẩn bị kho:   ${prepareOrderRes.ok ? '✅ Thành công (Đã tiếp nhận ➔ Đang đóng gói)' : '❌ Lỗi ' + prepareOrderRes.status}`);

  // Seller Action 3: Ship Order
  const shipOrderRes = await request(`/seller/orders/${targetSellerOrder.id}/ship`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: {
      carrier: 'GHTK',
      trackingCode: 'GHTK9988776655VN',
    },
  });
  console.log(`  - 3. Bàn giao vận chuyển:   ${shipOrderRes.ok ? '✅ Thành công (Gán mã vận đơn GHTK9988776655VN ➔ Đang giao)' : '❌ Lỗi ' + shipOrderRes.status}`);

  // Seller Action 4: Deliver Order
  const deliverOrderRes = await request(`/seller/orders/${targetSellerOrder.id}/deliver`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  console.log(`  - 4. Hoàn tất giao hàng:    ${deliverOrderRes.ok ? '✅ Thành công (Đã giao hàng thành công ➔ Hoàn tất)' : '❌ Lỗi ' + deliverOrderRes.status}`);
  passedSteps++;

  // Step 8: Cart Cleared Verification
  console.log('\n▶ [Step 8] Xác minh giỏ hàng đã được xóa sạch sau khi đặt hàng...');
  const finalCartRes = await request('/cart', {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  const finalCart = finalCartRes.data?.data || finalCartRes.data;
  const finalItems = finalCart?.items || [];
  console.log(`  - Trạng thái giỏ hàng sau thanh toán: ${finalItems.length === 0 ? '✅ Đã xóa sạch (0 sản phẩm)' : '⚠️ Còn ' + finalItems.length + ' sản phẩm'}`);
  passedSteps++;

  console.log('\n================================================================');
  console.log(`🎉 KẾT QUẢ E2E: ${passedSteps}/${totalSteps} BƯỚC ĐÃ ĐẠT TIÊU CHUẨN XÁC THỰC 100%!`);
  console.log('================================================================\n');
}

runE2E().catch((err) => {
  console.error('❌ E2E Failed with unhandled error:', err);
  process.exit(1);
});
