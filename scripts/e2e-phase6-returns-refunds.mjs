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

async function runPhase6ReturnsRefundsE2E() {
  console.log('================================================================');
  console.log('🔄 BẮT ĐẦU E2E PHASE 6: TRẢ HÀNG, HOÀN TIỀN & XỬ LÝ KHIẾU NẠI (RMA)');
  console.log(`📡 Kết nối API Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Đọc dữ liệu Context từ Phase 3/4/5
  console.log('🔹 1. Đọc dữ liệu đơn hàng từ Context...');
  const contextPath = path.resolve('scripts/.e2e-order-context.json');
  assert(fs.existsSync(contextPath), `Tìm thấy file context: ${contextPath}`);

  const contextData = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
  const { orderId, orderCode, subOrders, physicalSubOrder } = contextData;
  assert(Boolean(orderId && orderCode), `Ngữ cảnh đơn hàng hợp lệ: ${orderCode} (ID: ${orderId})`);

  const targetSellerOrderId = physicalSubOrder?.sellerOrderId || subOrders?.[0]?.sellerOrderId;
  const targetItem = physicalSubOrder?.items?.[0] || subOrders?.[0]?.items?.[0];
  const orderItemId = targetItem?.id;

  assert(Boolean(orderItemId), `Mã Order Item Sách giấy: ${orderItemId} ("${targetItem?.bookTitle}")`);

  // 2. Đăng nhập Khách mua hàng (Buyer)
  console.log('\n🔹 2. Đăng nhập tài khoản Buyer (buyer_test@gmail.com)...');
  const buyerLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'buyer_test@gmail.com',
      password: 'Password123!',
    },
  });
  assert(buyerLogin.ok && buyerLogin.status === 200, 'Buyer đăng nhập thành công HTTP 200');
  const buyerToken = buyerLogin.data?.data?.accessToken;
  const buyerHeaders = { Authorization: `Bearer ${buyerToken}` };

  // 3. Buyer Gửi Yêu Cầu Đổi Trả / Hoàn Tiền (POST /orders/:id/items/:orderItemId/return-request)
  console.log('\n🔹 3. Buyer gửi yêu cầu Đổi trả / Hoàn tiền sản phẩm lỗi...');
  const returnPayload = {
    type: 'REFUND',
    reason: 'DAMAGED_TORN',
    reasonDetail: 'Sách in bị rách gáy và nhòe mực trang 45-50, không thể đọc được',
    bookTitle: targetItem?.bookTitle || 'Tuyệt Tác Sách Số & Sách Giấy E2E 2856',
    evidenceImages: [
      'https://placehold.co/800x600/png?text=Evidence+Damaged+Page+45',
      'https://placehold.co/800x600/png?text=Evidence+Torn+Spine',
    ],
    customerEvidence: {
      images: [
        'https://placehold.co/800x600/png?text=Evidence+Damaged+Page+45',
      ],
    },
    shippingMethod: 'PICKUP_BY_SHIPPER',
    amount: targetItem?.unitPrice || 199000,
  };

  const createRmaRes = await request(`/orders/${orderId}/items/${orderItemId}/return-request`, {
    method: 'POST',
    headers: buyerHeaders,
    body: returnPayload,
  });

  assert(createRmaRes.ok || createRmaRes.status === 201 || createRmaRes.status === 200, 'Gửi yêu cầu đổi trả thành công (HTTP 200/201)');
  const rmaData = createRmaRes.data?.data || createRmaRes.data;
  const returnRequestId = rmaData?.id;
  assert(Boolean(returnRequestId), `Khởi tạo Yêu cầu Đổi trả RMA ID: ${returnRequestId}`);
  assert(rmaData?.status === 'PENDING_REVIEW' || rmaData?.status === 'SELLER_ACCEPTED' || rmaData?.status === 'DISPUTED_BY_SELLER' || rmaData?.status === 'ARBITRATED_BUYER_WINS', `Trạng thái yêu cầu RMA hợp lệ: ${rmaData?.status}`);

  // 4. Kiểm Tra Tự Động Đóng Băng Tiền Escrow (Escrow Frozen Event)
  console.log('\n🔹 4. Kiểm tra Dòng sự kiện Escrow lập tức bị ĐÓNG BĂNG (ESCROW_FROZEN)...');
  const trackingRes = await request(`/orders/${orderId}/tracking`, { headers: buyerHeaders });
  assert(trackingRes.ok, 'Endpoint Tracking phản hồi HTTP 200');
  const trackingTimeline = trackingRes.data?.data?.timeline || [];

  const frozenEvent = trackingTimeline.find((t) => t.toStatus === 'ESCROW_FROZEN');
  assert(Boolean(frozenEvent), `Hệ thống ghi nhận sự kiện đóng băng tiền: "${frozenEvent?.title}"`);
  assert(frozenEvent?.toStatus === 'ESCROW_FROZEN', 'Trạng thái chuyển sang ESCROW_FROZEN (Bảo vệ quyền lợi Buyer)');

  // 5. Buyer Xem Danh Sách Đổi Trả Cá Nhân (GET /orders/buyer/return-requests)
  console.log('\n🔹 5. Buyer xem danh sách yêu cầu Đổi trả của mình...');
  const buyerRmaListRes = await request('/orders/buyer/return-requests', { headers: buyerHeaders });
  assert(buyerRmaListRes.ok, 'Endpoint Buyer RMA list phản hồi HTTP 200');
  const buyerRmas = buyerRmaListRes.data?.data || buyerRmaListRes.data || [];
  const myRma = buyerRmas.find((r) => r.id === returnRequestId || r.orderId === orderId);
  assert(Boolean(myRma), `Yêu cầu đổi trả xuất hiện trong mục quản lý của Buyer`);

  // 6. Đăng nhập Người Bán Store A (Seller)
  console.log('\n🔹 6. Người bán Store A đăng nhập tiếp nhận yêu cầu đổi trả...');
  const sellerLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'e2e_owner_1792582952856@huki-test.vn',
      password: 'Password123!',
    },
  });
  assert(sellerLogin.ok, 'Seller Store A đăng nhập thành công');
  const sellerToken = sellerLogin.data?.data?.accessToken;
  const sellerHeaders = { Authorization: `Bearer ${sellerToken}` };

  const sellerRmaListRes = await request('/orders/seller/return-requests', { headers: sellerHeaders });
  assert(sellerRmaListRes.ok, 'Kênh người bán tải danh sách yêu cầu đổi trả phản hồi HTTP 200');
  const sellerRmas = sellerRmaListRes.data?.data || sellerRmaListRes.data || [];
  const storeRma = sellerRmas.find((r) => r.id === returnRequestId || r.orderId === orderId);
  assert(Boolean(storeRma), `Store A nhận được thông báo yêu cầu đổi trả từ Buyer`);

  // 7. Người Bán Gửi Khiếu Nại Trọng Tài (Seller Dispute)
  console.log('\n🔹 7. Shop không đồng ý và gửi khiếu nại lên Trọng tài Sàn (Seller Dispute)...');
  const disputeRes = await request(`/orders/seller/return-requests/${returnRequestId}/dispute`, {
    method: 'POST',
    headers: sellerHeaders,
    body: {
      reason: 'Shop đã kiểm tra camera đóng hàng niêm phong cẩn thận. Sách có dấu hiệu bị bóc màng co và làm rách từ phía người dùng.',
      evidence: {
        note: 'Ảnh chụp kiện hàng khi gửi đi còn nguyên seal 100%',
        images: ['https://placehold.co/800x600/png?text=Shop+CCTV+Evidence'],
      },
    },
  });

  assert(disputeRes.ok || disputeRes.status === 200 || disputeRes.status === 201, 'Shop gửi khiếu nại tranh chấp thành công (HTTP 200/201)');
  const disputedRma = disputeRes.data?.data || disputeRes.data;
  assert(disputedRma?.status === 'DISPUTED_BY_SELLER' || disputedRma?.status === 'ARBITRATED_BUYER_WINS', `Trạng thái yêu cầu chuyển thành: ${disputedRma?.status}`);

  // 8. Đăng nhập Platform Admin để Phân Xử Trọng Tài
  console.log('\n🔹 8. Platform Admin đăng nhập phân xử khiếu nại...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'adminhuki@gmail.com',
      password: 'Password123!',
    },
  });
  assert(adminLogin.ok, 'Platform Admin đăng nhập thành công HTTP 200');
  const adminToken = adminLogin.data?.data?.accessToken;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const adminRmaListRes = await request('/orders/admin/return-requests', { headers: adminHeaders });
  assert(adminRmaListRes.ok, 'Admin tải danh sách tranh chấp phản hồi HTTP 200');
  const adminRmas = adminRmaListRes.data?.data || adminRmaListRes.data || [];
  const targetDispute = adminRmas.find((r) => r.id === returnRequestId || r.orderId === orderId);
  assert(Boolean(targetDispute), `Admin nhìn thấy vụ tranh chấp giữa Buyer và Store A`);

  // 9. Admin Phán Quyết Trọng Tài: BUYER_WINS (Bảo Vệ Người Tiêu Dùng)
  console.log('\n🔹 9. Admin ra Phán quyết Trọng tài sàn (Admin Arbitration Ruling)...');
  const arbitrateRes = await request(`/orders/admin/return-requests/${returnRequestId}/arbitrate`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      ruling: 'BUYER_WINS',
      notes: 'Đối chiếu bằng chứng: Sách bị lỗi in ấn từ khâu xuất bản (lỗi kỹ thuật trang 45-50). Phán quyết Người mua THẮNG, hoàn tiền 100% vào tài khoản ví của Người mua.',
    },
  });

  assert(arbitrateRes.ok && arbitrateRes.status === 200, 'Admin ban hành phán quyết thành công HTTP 200');
  const arbitratedData = arbitrateRes.data?.data || arbitrateRes.data;
  assert(arbitratedData?.status === 'ARBITRATED_BUYER_WINS', `Trạng thái RMA chính thức là ARBITRATED_BUYER_WINS`);
  assert(arbitratedData?.arbitrationRuling === 'BUYER_WINS', `Kết quả phán quyết: BUYER_WINS`);

  // 10. Kiểm tra Hạch Toán Hoàn Tiền (Refund Ledger) Trong Timeline
  console.log('\n🔹 10. Kiểm tra Hạch toán Hoàn tiền (REFUNDED) trong Dòng thời gian...');
  const finalTrackingRes = await request(`/orders/${orderId}/tracking`, { headers: buyerHeaders });
  const finalTimeline = finalTrackingRes.data?.data?.timeline || [];

  const refundEvent = finalTimeline.find((t) => t.toStatus === 'REFUNDED');
  assert(Boolean(refundEvent), `Timeline ghi nhận sự kiện hoàn tiền: "${refundEvent?.title}"`);
  assert(refundEvent?.actorType === 'ADMIN', `Người ra quyết định hoàn tiền là ADMIN sàn`);

  // 11. Buyer Nhận Kết Quả Phán Quyết Minh Bạch
  console.log('\n🔹 11. Khách mua hàng kiểm tra kết quả phán quyết minh bạch...');
  const buyerCheckRes = await request('/orders/buyer/return-requests', { headers: buyerHeaders });
  const buyerUpdatedRma = (buyerCheckRes.data?.data || buyerCheckRes.data || []).find((r) => r.id === returnRequestId);
  assert(buyerUpdatedRma?.status === 'ARBITRATED_BUYER_WINS', `Buyer nhận thông báo thắng kiện đổi trả (ARBITRATED_BUYER_WINS)`);
  assert(Boolean(buyerUpdatedRma?.arbitrationNotes), `Buyer đọc được căn cứ phán quyết minh bạch của Sàn HuKi`);

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT PHASE 6:`);
  console.log(`   ✅ PASSED: ${passed}`);
  console.log(`   ❌ FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\n🛑 PHÁT HIỆN LỖI TRONG PHASE 6:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.log('\n⚠️ THEO NGUYÊN TẮC: Dừng lại ngay lập tức, không tự ý sửa code! Chờ lệnh từ người dùng.');
    process.exit(1);
  } else {
    console.log('\n🎉 PHASE 6 HOÀN TẤT THÀNH CÔNG RỰC RỠ 100%!');
    console.log(`👉 Người dùng có thể kiểm tra danh sách đổi trả trên UI: http://localhost:3100/profile/orders`);
    process.exit(0);
  }
}

runPhase6ReturnsRefundsE2E();

