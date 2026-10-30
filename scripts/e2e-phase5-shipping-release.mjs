import path from 'path';
import fs from 'fs';

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

async function runPhase5ShippingReleaseE2E() {
  console.log('================================================================');
  console.log('🚚 BẮT ĐẦU E2E PHASE 5: GIAO HÀNG, XÁC NHẬN NHẬN HÀNG & GIẢI NGÂN ESCROW');
  console.log(`📡 Kết nối API Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Đọc dữ liệu đơn hàng từ Phase 3/4 Context
  console.log('🔹 1. Đọc dữ liệu đơn hàng từ Context...');
  const contextPath = path.resolve('scripts/.e2e-order-context.json');
  assert(fs.existsSync(contextPath), `Tìm thấy file context: ${contextPath}`);

  const contextData = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
  const { orderId, orderCode, subOrders, physicalSubOrder } = contextData;
  assert(Boolean(orderId && orderCode), `Ngữ cảnh đơn hàng hợp lệ: ${orderCode} (ID: ${orderId})`);

  const targetSellerOrderId = physicalSubOrder?.sellerOrderId || subOrders?.[0]?.sellerOrderId;
  assert(Boolean(targetSellerOrderId), `Mã Sub-order Sách giấy cần giao: ${targetSellerOrderId}`);

  // 2. Đăng nhập Shipper (Bưu tá HuKi Express)
  console.log('\n🔹 2. Đăng nhập Bưu tá Shipper (shipper@huki.vn)...');
  const shipperLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'shipper@huki.vn',
      password: 'Password123!',
    },
  });

  assert(shipperLogin.ok && shipperLogin.status === 200, 'Shipper đăng nhập thành công HTTP 200');
  const shipperToken = shipperLogin.data?.data?.accessToken;
  const shipperRole = shipperLogin.data?.data?.user?.role;
  assert(shipperRole === 'DELIVERY_STAFF', `Tài khoản Shipper có vai trò chuẩn DELIVERY_STAFF`);
  const shipperHeaders = { Authorization: `Bearer ${shipperToken}` };

  // 3. Bưu Tá Cập Nhật Giao Hàng Thành Công (DELIVERED)
  console.log('\n🔹 3. Bưu tá cập nhật giao hàng thành công (PATCH /orders/shipper/orders/:id/deliver)...');
  const deliverRes = await request(`/orders/shipper/orders/${targetSellerOrderId}/deliver`, {
    method: 'PATCH',
    headers: shipperHeaders,
    body: { note: 'Đã giao hàng và thu tiền COD thành công tận tay khách hàng' },
  });

  assert(deliverRes.ok && deliverRes.status === 200, 'Shipper cập nhật trạng thái giao hàng thành công HTTP 200');
  const deliveredOrder = deliverRes.data?.data;
  assert(deliveredOrder?.status === 'DELIVERED' || deliveredOrder?.status === 'COMPLETED', `Kiện hàng chuyển sang trạng thái: ${deliveredOrder?.status}`);

  // 4. Khách Mua Hàng (Buyer) Kiểm Tra & Bấm "Đã Nhận Được Hàng"
  console.log('\n🔹 4. Buyer xác nhận nhận hàng & Giải phóng Escrow (POST /orders/:id/confirm-delivered)...');
  const buyerLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'buyer_test@gmail.com',
      password: 'Password123!',
    },
  });
  const buyerToken = buyerLogin.data?.data?.accessToken;
  const buyerHeaders = { Authorization: `Bearer ${buyerToken}` };

  const confirmReceivedRes = await request(`/orders/${orderId}/confirm-delivered`, {
    method: 'POST',
    headers: buyerHeaders,
  });

  assert(confirmReceivedRes.ok || confirmReceivedRes.status === 201, 'Buyer xác nhận nhận hàng thành công (HTTP 200/201)');
  assert(confirmReceivedRes.data?.data?.success === true, `Hệ thống xác nhận giải ngân ký quỹ: "${confirmReceivedRes.data?.message}"`);

  // 5. Kiểm tra Trạng thái Hoàn Tất Toàn Bộ Đơn Hàng (Order Master Completion)
  console.log('\n🔹 5. Kiểm tra Trạng thái Đơn hàng Tổng (GET /orders/:id)...');
  const masterOrderRes = await request(`/orders/${orderId}`, { headers: buyerHeaders });
  assert(masterOrderRes.ok, 'Lấy thông tin đơn hàng tổng phản hồi HTTP 200');
  const masterOrder = masterOrderRes.data?.data;

  assert(masterOrder?.status === 'COMPLETED', `Đơn hàng cha chuyển sang trạng thái hoàn tất: COMPLETED`);
  const allSubOrdersCompleted = masterOrder?.sellerOrders?.every((s) => s.status === 'COMPLETED');
  assert(allSubOrdersCompleted, `Toàn bộ các Sub-orders của các Store đều đã hoàn tất COMPLETED`);

  // 6. Kiểm tra Trạng thái Giải Ngân Quỹ Bảo Đảm Escrow (POL-14)
  console.log('\n🔹 6. Kiểm tra Tài khoản Escrow sau khi nhận hàng (GET /orders/:id/escrow)...');
  const escrowRes = await request(`/orders/${orderId}/escrow`, { headers: buyerHeaders });
  assert(escrowRes.ok && escrowRes.status === 200, 'Endpoint Escrow phản hồi HTTP 200');
  const escrow = escrowRes.data?.data;

  assert(escrow?.holdingPeriod?.isDelivered === true, `Kiện hàng đã ghi nhận giao thành công (isDelivered: true)`);
  assert(
    escrow?.canRelease !== undefined,
    `Quỹ bảo đảm Escrow được hạch toán minh bạch (Trạng thái canRelease: ${escrow?.canRelease})`,
  );
  assert(escrow?.financials?.totalAmount === 296000, `Tổng tiền Escrow khớp đúng giá trị hàng: 296.000 VND`);
  assert(escrow?.financials?.platformFee === 44400, `Phí sàn 15% được hạch toán: 44.400 VND`);
  assert(escrow?.financials?.sellerNet === 251600, `Số dư Net chuyển về ví Shop: 251.600 VND`);

  // 7. Kiểm tra Lịch Sử Dòng Thời Gian Tracking Đơn Hàng (Order Timeline)
  console.log('\n🔹 7. Kiểm tra Chuỗi sự kiện Timeline hoàn tất (GET /orders/:id/tracking)...');
  const trackingRes = await request(`/orders/${orderId}/tracking`, { headers: buyerHeaders });
  assert(trackingRes.ok, 'Endpoint Tracking phản hồi HTTP 200');
  const tracking = trackingRes.data?.data;

  assert(tracking?.status === 'COMPLETED', `Trạng thái tracking cập nhật thành COMPLETED`);
  const timeline = tracking?.timeline || [];
  assert(timeline.length >= 6, `Timeline ghi nhận đầy đủ các mốc vận hành (Hiện có: ${timeline.length} mốc)`);

  const titles = timeline.map((t) => t.title);
  assert(titles.some((t) => t.includes('Bưu tá đã giao hàng thành công')), 'Timeline có sự kiện bưu tá giao hàng');
  assert(titles.some((t) => t.includes('Giải ngân ký quỹ')), 'Timeline có sự kiện giải ngân ký quỹ');

  // 8. Đánh Giá Sản Phẩm (Rating & Review) & Kiểm Tra Phân Quyền Gateway
  console.log('\n🔹 8. Kiểm tra nghiệp vụ Đánh giá sản phẩm sau khi mua hàng...');
  const targetBookId = 'a1849bba-f111-42aa-ac08-2783465646d0';
  const reviewRes = await request(`/books/${targetBookId}/reviews`, {
    method: 'POST',
    headers: buyerHeaders,
    body: {
      rating: 5,
      title: 'Sách rất hay và chất lượng tuyệt vời',
      content: 'Chất lượng sách rất tuyệt vời, giao hàng nhanh và đóng gói kỹ càng!',
      format: 'PHYSICAL',
    },
  });

  if (reviewRes.ok || reviewRes.status === 201) {
    assert(true, 'Buyer gửi đánh giá 5 sao thành công!');
  } else if (reviewRes.status === 409) {
    assert(true, 'Buyer đã gửi đánh giá cho sản phẩm này (HTTP 409 Conflict Idempotency)');
  } else {
    assert(false, `Endpoint đánh giá phản hồi: HTTP ${reviewRes.status}`);
  }

  // Đọc danh sách đánh giá công khai
  const publicReviewsRes = await request(`/books/${targetBookId}/reviews`);
  assert(publicReviewsRes.ok && publicReviewsRes.status === 200, 'Đọc danh sách đánh giá của sách thành công HTTP 200');

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT PHASE 5:`);
  console.log(`   ✅ PASSED: ${passed}`);
  console.log(`   ❌ FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\n🛑 PHÁT HIỆN LỖI TRONG PHASE 5:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.log('\n⚠️ THEO NGUYÊN TẮC: Dừng lại ngay lập tức, không tự ý sửa code! Chờ lệnh từ người dùng.');
    process.exit(1);
  } else {
    console.log('\n🎉 PHASE 5 HOÀN TẤT THÀNH CÔNG RỰC RỠ 100%!');
    console.log(`👉 Người dùng có thể kiểm tra trạng thái đơn hàng COMPLETED trên UI: http://localhost:3100/orders/${orderId}`);
    process.exit(0);
  }
}

runPhase5ShippingReleaseE2E();

