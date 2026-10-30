import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const BASE_URL = process.env.HUKI_API_BASE || 'http://localhost:3000/api/v1';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, testName, detail = '') {
  if (condition) {
    passed++;
    console.log(`   ✅ [PASS] ${testName}`);
    return true;
  }
  failed++;
  const msg = `❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`;
  console.error(`   ${msg}`);
  errors.push(msg);
  return false;
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
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

async function runPhase3CheckoutPaymentE2E() {
  console.log('================================================================');
  console.log('💳 BẮT ĐẦU E2E PHASE 3: ĐẶT HÀNG, THANH TOÁN & QUẢN LÝ TIỀN ESCROW');
  console.log(`📡 Kết nối API Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Xác thực tài khoản Buyer
  console.log('🔹 1. Đăng nhập tài khoản Buyer (buyer_test@gmail.com)...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'buyer_test@gmail.com',
      password: 'Password123!',
    },
  });
  assert(loginRes.ok && loginRes.status === 200, 'Buyer đăng nhập thành công HTTP 200', `Status: ${loginRes.status}`);
  const buyerToken = loginRes.data?.data?.accessToken;
  const buyerUser = loginRes.data?.data?.user;
  assert(Boolean(buyerToken), `Buyer nhận được Bearer Token hợp lệ (User ID: ${buyerUser?.id})`);
  const authHeaders = { Authorization: `Bearer ${buyerToken}` };

  // 2. Kiểm tra Địa chỉ giao hàng (Shipping Address)
  console.log('\n🔹 2. Kiểm tra Địa chỉ giao hàng của Buyer (GET /shipping/address)...');
  let addrRes = await request('/shipping/address', { headers: authHeaders });
  let addresses = addrRes.data?.data || [];
  let userAddress = addresses[0];

  if (!userAddress) {
    console.log('   Tạo địa chỉ giao hàng mới...');
    const createAddrRes = await request('/shipping/address', {
      method: 'POST',
      headers: authHeaders,
      body: {
        name: buyerUser.fullName || 'Huỳnh Gia Huy Buyer',
        phone: '0987654321',
        address: '123 Đường Sách Nguyễn Huệ',
        ward: 'Bến Nghé',
        district: 'Quận 1',
        province: 'Hồ Chí Minh',
        isDefault: true,
      },
    });
    userAddress = createAddrRes.data?.data;
  }
  assert(Boolean(userAddress?.id), `Buyer có địa chỉ nhận hàng: "${userAddress?.name} - ${userAddress?.address}, ${userAddress?.province}"`);

  // 3. Chuẩn bị Giỏ hàng gồm 2 Store khác nhau (Store A: Physical, Store B: Digital)
  console.log('\n🔹 3. Chuẩn bị Giỏ hàng Đa Gian Hàng (Multi-Store Cart)...');
  await request('/cart', { method: 'DELETE', headers: authHeaders });

  const booksRes = await request('/books?limit=10');
  const books = booksRes.data?.data || booksRes.data?.books || [];
  let physicalBook = null;
  let digitalBook = null;

  for (const b of books) {
    if (!physicalBook && (b.format === 'PHYSICAL' || b.format === 'BOTH')) {
      physicalBook = b;
    } else if (!digitalBook && (b.format === 'DIGITAL' || b.format === 'BOTH') && (!physicalBook || b.storeId !== physicalBook.storeId)) {
      digitalBook = b;
    }
  }

  assert(Boolean(physicalBook && digitalBook && physicalBook.storeId !== digitalBook.storeId), `Đã chọn 2 sản phẩm thuộc 2 Store khác nhau`);

  await request('/cart/items', {
    method: 'POST',
    headers: authHeaders,
    body: { bookId: physicalBook.id, format: 'PHYSICAL', quantity: 1 },
  });
  await request('/cart/items', {
    method: 'POST',
    headers: authHeaders,
    body: { bookId: digitalBook.id, format: 'DIGITAL', quantity: 1 },
  });

  const cartCheck = (await request('/cart', { headers: authHeaders })).data?.data;
  assert(cartCheck?.items?.length === 2 && cartCheck?.storeGroups?.length === 2, `Giỏ hàng đã sẵn sàng với 2 món từ 2 Store`);

  // 4. Xem trước thanh toán (POST /cart/checkout/preview)
  console.log('\n🔹 4. Xem trước thanh toán & sinh Checkout Session (POST /cart/checkout/preview)...');
  const previewRes = await request('/cart/checkout/preview', {
    method: 'POST',
    headers: authHeaders,
    body: {
      addressId: userAddress.id,
      platformVoucherCode: 'HUKIE2E10',
    },
  });

  assert(previewRes.ok && previewRes.status === 200, 'Checkout Preview phản hồi HTTP 200', `Status: ${previewRes.status}`);
  const preview = previewRes.data?.data;
  assert(Boolean(preview?.sessionId), `Phiên đặt hàng được khởi tạo với Session ID: ${preview?.sessionId}`);
  assert(preview?.groups?.length === 2, `Preview tách chính xác 2 Sub-order Groups`);

  // 5. Xác nhận Đặt hàng (POST /cart/checkout/confirm) với Idempotency Key
  console.log('\n🔹 5. Xác nhận Đặt hàng với Idempotency-Key (POST /cart/checkout/confirm)...');
  const idempotencyKey = randomUUID();
  console.log(`   Khóa chống trùng lặp (Idempotency Key): ${idempotencyKey}`);

  const confirmRes = await request('/cart/checkout/confirm', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Idempotency-Key': idempotencyKey,
    },
    body: {
      sessionId: preview.sessionId,
      addressId: userAddress.id,
      paymentMethod: 'COD',
      platformVoucherCode: 'HUKIE2E10',
    },
  });

  assert(confirmRes.ok && confirmRes.status === 200, 'Tạo đơn hàng thành công HTTP 200', `Status: ${confirmRes.status}`);
  const confirmData = confirmRes.data?.data;
  const createdOrder = confirmData?.order;

  assert(Boolean(createdOrder?.id), `Mã định danh đơn hàng (Order ID): ${createdOrder?.id}`);
  assert(Boolean(createdOrder?.code), `Mã hiển thị đơn hàng (Order Code): ${createdOrder?.code}`);
  assert(createdOrder?.paymentMethod === 'COD', `Phương thức thanh toán đúng là COD`);
  assert(createdOrder?.paymentStatus === 'PENDING', `Trạng thái thanh toán ban đầu là PENDING`);
  assert(createdOrder?.status === 'PROCESSING', `Trạng thái đơn hàng COD ban đầu là PROCESSING`);
  assert(Number(createdOrder?.grandTotal) === preview.grandTotal, `Tổng tiền thanh toán khớp chính xác Preview: ${createdOrder?.grandTotal} VND`);

  // 6. Kiểm tra Cơ chế Chống Trùng Lặp (Idempotency Replay Protection)
  console.log('\n🔹 6. Kiểm tra cơ chế chống đặt trùng lặp (Idempotency Replay)...');
  const replayRes = await request('/cart/checkout/confirm', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Idempotency-Key': idempotencyKey,
    },
    body: {
      sessionId: preview.sessionId,
      addressId: userAddress.id,
      paymentMethod: 'COD',
    },
  });

  assert(replayRes.ok && replayRes.status === 200, 'Replay request phản hồi HTTP 200');
  const replayData = replayRes.data?.data;
  assert(replayData?.idempotentReplay === true, `Hệ thống nhận diện đúng Idempotent Replay (idempotentReplay: true)`);
  assert(replayData?.order?.id === createdOrder.id, `Replay trả về đúng đơn hàng cũ, không tạo thêm đơn rác`);

  // 7. Kiểm tra Tự động Làm sạch Giỏ hàng sau khi Đặt
  console.log('\n🔹 7. Kiểm tra Giỏ hàng tự động làm sạch sau khi Đặt hàng...');
  const postCheckoutCartRes = await request('/cart', { headers: authHeaders });
  const postCart = postCheckoutCartRes.data?.data;
  assert(postCart?.items?.length === 0 && postCart?.totalItems === 0, `Giỏ hàng của Buyer đã được dọn sạch hoàn toàn (0 items)`);

  // 8. Kiểm tra Chi tiết Đơn hàng & Phân Tách Sub-orders theo từng Store
  console.log('\n🔹 8. Kiểm tra Phân tách Đơn con cho từng Nhà bán (GET /orders/:id)...');
  const orderDetailRes = await request(`/orders/${createdOrder.id}`, { headers: authHeaders });
  assert(orderDetailRes.ok, `Lấy chi tiết đơn hàng ${createdOrder.id} phản hồi HTTP 200`);
  const orderDetail = orderDetailRes.data?.data;

  const sellerOrders = orderDetail?.sellerOrders || [];
  assert(sellerOrders.length === 2, `Đơn hàng cha tự động tách thành chính xác 2 Sub-orders cho 2 Store`);

  const subOrderA = sellerOrders.find((s) => s.storeId === physicalBook.storeId);
  const subOrderB = sellerOrders.find((s) => s.storeId === digitalBook.storeId);

  assert(Boolean(subOrderA), `Sub-order của Store A (${physicalBook.storeId}) được khởi tạo`);
  assert(Boolean(subOrderB), `Sub-order của Store B (${digitalBook.storeId}) được khởi tạo`);
  assert(subOrderA?.status === 'PENDING_CONFIRMATION', `Sub-order Store A ở trạng thái PENDING_CONFIRMATION chờ duyệt`);
  assert(subOrderB?.status === 'PENDING_CONFIRMATION', `Sub-order Store B ở trạng thái PENDING_CONFIRMATION chờ duyệt`);

  // 9. Kiểm tra Quản lý Tiền Escrow & Tài khoản Tạm giữ Bảo đảm (POL-14)
  console.log('\n🔹 9. Kiểm tra Tiền trong Quỹ bảo đảm Escrow (GET /orders/:id/escrow)...');
  const escrowRes = await request(`/orders/${createdOrder.id}/escrow`, { headers: authHeaders });
  assert(escrowRes.ok && escrowRes.status === 200, 'Endpoint Escrow phản hồi HTTP 200', `Status: ${escrowRes.status}`);
  const escrow = escrowRes.data?.data;

  assert(escrow?.status === 'ESCROW_HOLDING', `Trạng thái tiền: ESCROW_HOLDING (Đang được sàn bảo đảm tạm giữ)`);
  assert(escrow?.isFrozen === false, `Tiền Escrow chưa bị đóng băng tranh chấp (isFrozen: false)`);
  assert(escrow?.holdingPeriod?.totalHoldingSeconds === 604800, `Thời hạn bảo vệ người mua là 7 ngày (604.800 giây)`);
  assert(escrow?.holdingPeriod?.isDelivered === false, `Chưa giao hàng, tiền CHƯA THỂ giải ngân cho Shop`);

  // Kiểm tra phân chia tài chính 85/15 theo chính sách sàn POL-14
  const financials = escrow?.financials;
  assert(Boolean(financials), `Có dữ liệu phân tích tài chính Escrow Financials`);
  assert(financials?.platformFee > 0, `Phí sàn (15% Commission) được tính toán: ${financials?.platformFee} VND`);
  assert(financials?.sellerNet > 0, `Tiền thực nhận của Người bán (85% Net) được tạm tính: ${financials?.sellerNet} VND`);
  assert(financials?.totalAmount === financials?.platformFee + financials?.sellerNet, `Tổng tiền phân chia khớp 100%: ${financials?.totalAmount} VND`);

  // 10. Kiểm tra Dòng thời gian Đơn hàng (Order Tracking Timeline)
  console.log('\n🔹 10. Kiểm tra Dòng thời gian Tracking đơn hàng (GET /orders/:id/tracking)...');
  const trackingRes = await request(`/orders/${createdOrder.id}/tracking`, { headers: authHeaders });
  assert(trackingRes.ok && trackingRes.status === 200, 'Endpoint Tracking phản hồi HTTP 200');
  const tracking = trackingRes.data?.data;

  assert(tracking?.orderCode === createdOrder.code, `Mã tracking khớp mã đơn hàng: ${tracking?.orderCode}`);
  assert(tracking?.sellers?.length === 2, `Tracking hiển thị đầy đủ 2 kiện hàng của 2 Shop`);
  assert(Array.isArray(tracking?.timeline) && tracking.timeline.length > 0, `Dòng sự kiện timeline ghi nhận sự kiện đầu tiên: "${tracking?.timeline?.[0]?.title}"`);

  // 11. Lưu thông tin Context cho Phase 4 (Seller Fulfillment)
  const contextData = {
    orderId: createdOrder.id,
    orderCode: createdOrder.code,
    buyerUserId: buyerUser.id,
    buyerEmail: buyerUser.email,
    subOrders: sellerOrders.map((s) => ({
      sellerOrderId: s.id,
      storeId: s.storeId,
      ownerUserId: s.ownerUserId,
      status: s.status,
      grandTotal: s.grandTotal,
      requiresShipping: s.requiresShipping,
      items: s.items,
    })),
    createdAt: new Date().toISOString(),
  };

  const contextPath = path.resolve('scripts/.e2e-order-context.json');
  fs.writeFileSync(contextPath, JSON.stringify(contextData, null, 2), 'utf-8');
  console.log(`\n💾 Đã lưu Order Context vào: ${contextPath} để Phase 4 tiếp tục vận hành.`);

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT PHASE 3:`);
  console.log(`   ✅ PASSED: ${passed}`);
  console.log(`   ❌ FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\n🛑 PHÁT HIỆN LỖI TRONG PHASE 3:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.log('\n⚠️ THEO NGUYÊN TẮC: Dừng lại ngay lập tức, không tự ý sửa code! Chờ lệnh từ người dùng.');
    process.exit(1);
  } else {
    console.log('\n🎉 PHASE 3 HOÀN TẤT THÀNH CÔNG RỰC RỠ 100%!');
    console.log(`👉 Người dùng có thể kiểm tra trực tiếp Đơn hàng vừa tạo trên UI: http://localhost:3100/orders/${createdOrder.id}`);
    process.exit(0);
  }
}

runPhase3CheckoutPaymentE2E();

