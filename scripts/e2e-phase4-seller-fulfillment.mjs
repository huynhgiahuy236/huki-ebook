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

async function runPhase4SellerFulfillmentE2E() {
  console.log('================================================================');
  console.log('📦 BẮT ĐẦU E2E PHASE 4: NGƯỜI BÁN XÁC NHẬN & VẬN HÀNH ĐƠN HÀNG');
  console.log(`📡 Kết nối API Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Đọc Order Context từ Phase 3
  console.log('🔹 1. Đọc dữ liệu đơn hàng từ Phase 3 Context...');
  const contextPath = path.resolve('scripts/.e2e-order-context.json');
  assert(fs.existsSync(contextPath), `Tìm thấy file context đơn hàng: ${contextPath}`);

  const contextData = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
  const { orderId, orderCode, subOrders, buyerEmail } = contextData;
  assert(Boolean(orderId && orderCode), `Ngữ cảnh đơn hàng hợp lệ: ${orderCode} (ID: ${orderId})`);

  const physicalSubOrder = subOrders.find((s) => s.requiresShipping === true);
  const digitalSubOrder = subOrders.find((s) => s.requiresShipping === false);

  assert(Boolean(physicalSubOrder), `Tìm thấy Đơn con Sách giấy: ${physicalSubOrder?.sellerOrderId}`);
  assert(Boolean(digitalSubOrder), `Tìm thấy Đơn con Ebook: ${digitalSubOrder?.sellerOrderId}`);

  // 2. Đăng nhập Người bán Store A (Bán Sách Giấy)
  console.log('\n🔹 2. Đăng nhập Người bán Store A (e2e_owner_1792582952856@huki-test.vn)...');
  const sellerALogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'e2e_owner_1792582952856@huki-test.vn',
      password: 'Password123!',
    },
  });
  assert(sellerALogin.ok && sellerALogin.status === 200, 'Người bán Store A đăng nhập thành công HTTP 200');
  const sellerAToken = sellerALogin.data?.data?.accessToken;
  const sellerAHeaders = { Authorization: `Bearer ${sellerAToken}` };

  // 3. Truy cập Kênh Người Bán & Xem Danh Sách Đơn Hàng (GET /seller/orders)
  console.log('\n🔹 3. Kênh Người Bán Store A tải danh sách đơn hàng (GET /seller/orders)...');
  const sellerOrdersRes = await request('/seller/orders', { headers: sellerAHeaders });
  assert(sellerOrdersRes.ok, 'Kênh người bán phản hồi HTTP 200');
  const sellerOrderList = sellerOrdersRes.data?.data?.items || sellerOrdersRes.data?.data || [];
  assert(Array.isArray(sellerOrderList) && sellerOrderList.length > 0, `Store A có danh sách đơn hàng (Tổng: ${sellerOrderList.length} đơn)`);

  const targetSellerOrder = sellerOrderList.find((o) => o.id === physicalSubOrder.sellerOrderId || o.orderId === orderId);
  assert(Boolean(targetSellerOrder), `Đơn hàng ${orderCode} xuất hiện chính xác trong danh sách quản lý của Shop`);

  // 4. Xem Chi Tiết Đơn Hàng Bán (GET /seller/orders/:id)
  console.log('\n🔹 4. Xem chi tiết đơn hàng bán (GET /seller/orders/:id)...');
  const detailRes = await request(`/seller/orders/${targetSellerOrder.id}`, { headers: sellerAHeaders });
  assert(detailRes.ok && detailRes.status === 200, `Lấy chi tiết đơn bán phản hồi HTTP 200`);
  const orderDetail = detailRes.data?.data;

  assert(orderDetail.status === 'PENDING_CONFIRMATION' || orderDetail.status === 'CONFIRMED' || orderDetail.status === 'PREPARING' || orderDetail.status === 'SHIPPED', `Trạng thái đơn bán hợp lệ: ${orderDetail.status}`);
  assert(Boolean(orderDetail.order?.shippingAddress), `Đơn bán hiển thị đầy đủ địa chỉ nhận hàng của Buyer`);
  assert(orderDetail.order?.paymentMethod === 'COD', `Hiển thị đúng phương thức thanh toán COD`);

  // 5. Người Bán Duyệt Đơn (PATCH /seller/orders/:id/confirm)
  console.log('\n🔹 5. Người bán duyệt xác nhận đơn hàng (PATCH /seller/orders/:id/confirm)...');
  if (orderDetail.status === 'PENDING_CONFIRMATION') {
    const confirmRes = await request(`/seller/orders/${targetSellerOrder.id}/confirm`, {
      method: 'PATCH',
      headers: sellerAHeaders,
    });
    assert(confirmRes.ok && confirmRes.status === 200, 'Duyệt đơn hàng thành công HTTP 200');
    assert(confirmRes.data?.data?.status === 'CONFIRMED', `Trạng thái chuyển thành CONFIRMED`);
  } else {
    console.log(`   ℹ️ Đơn hàng đã ở trạng thái ${orderDetail.status}, tiếp tục quy trình...`);
    assert(true, 'Đơn hàng đã được duyệt trước đó');
  }

  // 6. Đóng Gói & Chuẩn Bị Hàng (PATCH /seller/orders/:id/prepare)
  console.log('\n🔹 6. Đóng gói & chuẩn bị xuất kho (PATCH /seller/orders/:id/prepare)...');
  const currentStatusRes = await request(`/seller/orders/${targetSellerOrder.id}`, { headers: sellerAHeaders });
  const currentStatus = currentStatusRes.data?.data?.status;

  if (currentStatus === 'CONFIRMED') {
    const prepareRes = await request(`/seller/orders/${targetSellerOrder.id}/prepare`, {
      method: 'PATCH',
      headers: sellerAHeaders,
    });
    assert(prepareRes.ok && prepareRes.status === 200, 'Đóng gói hàng thành công HTTP 200');
    assert(prepareRes.data?.data?.status === 'PREPARING', `Trạng thái chuyển thành PREPARING (Đang đóng gói)`);
  } else {
    assert(currentStatus === 'PREPARING' || currentStatus === 'SHIPPED', `Đơn hàng đang ở trạng thái xử lý hợp lệ: ${currentStatus}`);
  }

  // 7. Bàn Giao Cho Đơn Vị Vận Chuyển (PATCH /seller/orders/:id/ship)
  console.log('\n🔹 7. Bàn giao kiện hàng cho đơn vị vận chuyển (PATCH /seller/orders/:id/ship)...');
  const randNum = Math.floor(100000 + Math.random() * 900000);
  const carrierName = 'HUKI_EXPRESS';
  const trackingNumber = `HKX${Date.now().toString().slice(-6)}${randNum}`;

  const beforeShipRes = await request(`/seller/orders/${targetSellerOrder.id}`, { headers: sellerAHeaders });
  if (beforeShipRes.data?.data?.status === 'PREPARING') {
    const shipRes = await request(`/seller/orders/${targetSellerOrder.id}/ship`, {
      method: 'PATCH',
      headers: sellerAHeaders,
      body: {
        carrier: carrierName,
        trackingCode: trackingNumber,
      },
    });

    assert(shipRes.ok && shipRes.status === 200, 'Bàn giao Shipper thành công HTTP 200');
    const shippedOrder = shipRes.data?.data;
    assert(shippedOrder?.status === 'SHIPPED', `Trạng thái đơn hàng cập nhật thành SHIPPED`);
    assert(shippedOrder?.carrier === carrierName, `Ghi nhận đơn vị vận chuyển: ${carrierName}`);
    assert(Boolean(shippedOrder?.trackingCode), `Ghi nhận mã vận đơn Tracking Code: ${shippedOrder?.trackingCode}`);
  } else {
    assert(beforeShipRes.data?.data?.status === 'SHIPPED', `Đơn hàng đã được bàn giao vận chuyển (SHIPPED)`);
  }

  // 8. Đăng nhập Người bán Store B & Xử Lý Đơn Số Ebook (Instant Provisioning)
  console.log('\n🔹 8. Người bán Store B xử lý Đơn hàng Ebook kỹ thuật số...');
  const sellerBLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'phuongthuy@gmail.com',
      password: 'Password123!',
    },
  });
  assert(sellerBLogin.ok, 'Người bán Store B đăng nhập thành công');
  const sellerBHeaders = { Authorization: `Bearer ${sellerBLogin.data?.data?.accessToken}` };

  const digitalDetailRes = await request(`/seller/orders/${digitalSubOrder.sellerOrderId}`, { headers: sellerBHeaders });
  const digitalDetail = digitalDetailRes.data?.data;

  if (digitalDetail?.status === 'PENDING_CONFIRMATION') {
    const confirmDigitalRes = await request(`/seller/orders/${digitalSubOrder.sellerOrderId}/confirm`, {
      method: 'PATCH',
      headers: sellerBHeaders,
    });
    assert(confirmDigitalRes.ok, 'Duyệt đơn hàng Ebook thành công');
    assert(confirmDigitalRes.data?.data?.status === 'COMPLETED', 'Đơn Ebook số tự động hoàn tất COMPLETED ngay khi xác nhận');
  } else {
    assert(digitalDetail?.status === 'COMPLETED', `Đơn Ebook số ở trạng thái COMPLETED (Không cần giao vận lý)`);
  }

  // 9. Buyer Theo Dõi Hành Trình Đơn Hàng (Order Tracking Synchronization)
  console.log('\n🔹 9. Khách mua hàng kiểm tra đồng bộ Hành trình Tracking (GET /orders/:id/tracking)...');
  const buyerLoginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'buyer_test@gmail.com',
      password: 'Password123!',
    },
  });
  const buyerToken = buyerLoginRes.data?.data?.accessToken;
  const buyerHeaders = { Authorization: `Bearer ${buyerToken}` };

  const trackingRes = await request(`/orders/${orderId}/tracking`, { headers: buyerHeaders });
  assert(trackingRes.ok && trackingRes.status === 200, 'Endpoint Tracking phản hồi HTTP 200');
  const trackingData = trackingRes.data?.data;

  const physicalSellerTracking = trackingData?.sellers?.find((s) => s.id === targetSellerOrder.id);
  assert(physicalSellerTracking?.status === 'SHIPPED', `Kiện hàng sách giấy hiển thị trạng thái SHIPPED trên giao diện Buyer`);
  assert(Boolean(physicalSellerTracking?.trackingCode), `Buyer nhìn thấy Mã vận đơn: ${physicalSellerTracking?.trackingCode}`);
  assert(Boolean(physicalSellerTracking?.carrier), `Buyer nhìn thấy Đơn vị vận chuyển: ${physicalSellerTracking?.carrier}`);

  // Kiểm tra chuỗi sự kiện Timeline
  const timeline = trackingData?.timeline || [];
  assert(timeline.length >= 3, `Dòng thời gian ghi nhận đầy đủ chuỗi mốc sự kiện (Hiện có: ${timeline.length} mốc)`);
  const statusesRecorded = timeline.map((t) => t.toStatus);
  assert(statusesRecorded.includes('PROCESSING'), 'Timeline ghi nhận sự kiện đặt hàng');
  assert(statusesRecorded.includes('CONFIRMED'), 'Timeline ghi nhận sự kiện người bán duyệt');
  assert(statusesRecorded.includes('PREPARING'), 'Timeline ghi nhận sự kiện đóng gói xuất kho');
  assert(statusesRecorded.includes('SHIPPED'), 'Timeline ghi nhận sự kiện bàn giao shipper');

  // 10. Cập nhật Order Context cho Phase 5 (Shipping & Release)
  contextData.physicalSubOrder = {
    sellerOrderId: targetSellerOrder.id,
    storeId: targetSellerOrder.storeId,
    status: 'SHIPPED',
    carrier: physicalSellerTracking?.carrier || carrierName,
    trackingCode: physicalSellerTracking?.trackingCode || trackingNumber,
    grandTotal: targetSellerOrder.grandTotal,
  };
  contextData.digitalSubOrder = {
    sellerOrderId: digitalSubOrder.sellerOrderId,
    storeId: digitalSubOrder.storeId,
    status: 'COMPLETED',
  };
  fs.writeFileSync(contextPath, JSON.stringify(contextData, null, 2), 'utf-8');
  console.log(`\n💾 Đã cập nhật Order Context vào: ${contextPath} để Phase 5 tiếp tục vận hành.`);

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT PHASE 4:`);
  console.log(`   ✅ PASSED: ${passed}`);
  console.log(`   ❌ FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\n🛑 PHÁT HIỆN LỖI TRONG PHASE 4:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.log('\n⚠️ THEO NGUYÊN TẮC: Dừng lại ngay lập tức, không tự ý sửa code! Chờ lệnh từ người dùng.');
    process.exit(1);
  } else {
    console.log('\n🎉 PHASE 4 HOÀN TẤT THÀNH CÔNG RỰC RỠ 100%!');
    console.log(`👉 Người bán có thể kiểm tra đơn trên Kênh Người Bán: http://localhost:3100/seller/orders`);
    console.log(`👉 Người mua có thể theo dõi mã vận đơn tại: http://localhost:3100/orders/${orderId}`);
    process.exit(0);
  }
}

runPhase4SellerFulfillmentE2E();

