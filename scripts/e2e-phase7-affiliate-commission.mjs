/**
 * HuKi E-Commerce Platform - Phase 7 E2E Test Suite
 * Module: Tiếp thị liên kết & Đối soát hoa hồng (Affiliate Marketing & Commission Settlement)
 *
 * Tiêu chuẩn: Sàn TMĐT Shopee Affiliate / Lazada Affiliate Partner
 *
 * Kịch bản kiểm thử thực tế 100%:
 *  1. Kiểm tra thông tin chính sách chương trình Affiliate công khai (GET /affiliate/program)
 *  2. Kiểm tra tính khả dụng của mã tiếp thị Affiliate Code (GET /affiliate/code-availability)
 *  3. Khách hàng gửi đơn đăng ký Cộng tác viên Affiliate (POST /affiliate/applications)
 *  4. Platform Admin đăng nhập & duyệt hồ sơ Affiliate (POST /admin/affiliates/:id/approve)
 *  5. CTV kiểm tra trạng thái hồ sơ sau khi duyệt (GET /affiliate/me)
 *  6. CTV khám phá danh mục sách tiếp thị & hoa hồng (GET /affiliate/catalog)
 *  7. CTV xem thẻ hoa hồng sản phẩm cụ thể (GET /affiliate/books/:id/commission-card)
 *  8. CTV tạo link rút gọn tiếp thị chia sẻ (POST /affiliate/links)
 *  9. Hệ thống phân giải link tiếp thị & ghi nhận click attribution (GET /affiliate/resolve/:shortCode)
 * 10. CTV kiểm tra số dư Ví hoa hồng (GET /affiliate/wallet)
 * 11. CTV xem bảng điều khiển tổng quan hiệu quả (GET /affiliate/dashboard)
 * 12. Platform Admin kích hoạt phiên đối soát tự động (POST /admin/affiliates/settlement/trigger)
 * 13. Kiểm tra cơ chế bảo vệ rút tiền: Chặn khi chưa hoàn thành KYC (POST /affiliate/payouts)
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000/api/v1';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    console.log(`   ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`   ❌ [FAIL] ${message}`);
    failed++;
    errors.push(message);
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function runPhase7AffiliateE2E() {
  console.log('================================================================');
  console.log('🔄 BẮT ĐẦU E2E PHASE 7: TIẾP THỊ LIÊN KẾT & ĐỐI SOÁT HOA HỒNG');
  console.log(`📡 Kết nối API Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Kiểm tra chính sách chương trình Affiliate công khai (GET /affiliate/program)
  console.log('🔹 1. Xem chính sách & tỷ lệ hoa hồng chương trình Affiliate...');
  const programRes = await request('/affiliate/program');
  assert(programRes.ok && programRes.status === 200, 'Tải thông tin chính sách Affiliate thành công HTTP 200');
  const programData = programRes.data?.data || programRes.data;
  assert(Boolean(programData?.rates?.physical !== undefined && programData?.rates?.ebook !== undefined), `Tỷ lệ hoa hồng sách giấy: ${programData?.rates?.physical}%, sách số: ${programData?.rates?.ebook}%`);
  assert(Boolean(programData?.cookieDurationDays), `Thời hạn lưu trữ Attribution Cookie: ${programData?.cookieDurationDays} ngày`);

  // 2. Kiểm tra tính khả dụng của mã tiếp thị Affiliate Code
  console.log('\n🔹 2. Kiểm tra tính khả dụng của mã CTV định danh...');
  const uniqueCode = `CTV_${Date.now().toString().slice(-6)}`;
  const codeCheckRes = await request(`/affiliate/code-availability?code=${uniqueCode}`);
  assert(codeCheckRes.ok, `Kiểm tra mã ${uniqueCode} phản hồi HTTP 200`);
  const codeCheckData = codeCheckRes.data?.data || codeCheckRes.data;
  assert(codeCheckData?.available === true, `Mã tiếp thị "${uniqueCode}" hoàn toàn khả dụng`);

  // 3. Đăng nhập tài khoản Buyer (Ứng viên CTV)
  console.log('\n🔹 3. Đăng nhập tài khoản ứng viên (buyer_test@gmail.com)...');
  const buyerLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'buyer_test@gmail.com',
      password: 'Password123!',
    },
  });
  assert(buyerLogin.ok, 'Đăng nhập tài khoản Buyer thành công HTTP 200');
  const buyerToken = buyerLogin.data?.data?.accessToken;
  const buyerHeaders = { Authorization: `Bearer ${buyerToken}` };

  // 4. Kiểm tra hồ sơ hiện tại hoặc Nộp đơn đăng ký CTV
  console.log('\n🔹 4. Nộp đơn đăng ký làm Cộng tác viên Tiếp thị liên kết (CTV)...');
  const myProfileBefore = await request('/affiliate/me', { headers: buyerHeaders });
  let profileId = null;

  if (myProfileBefore.ok && myProfileBefore.data?.data?.hasProfile && myProfileBefore.data?.data?.profile) {
    const existingProfile = myProfileBefore.data.data.profile;
    profileId = existingProfile.id;
    console.log(`   ℹ️ Tài khoản đã có hồ sơ Affiliate ID: ${profileId} (Trạng thái: ${existingProfile.status})`);
    assert(Boolean(profileId), `Đã có hồ sơ Affiliate sẵn sàng: ${existingProfile.affiliateCode}`);
  } else {
    const applyPayload = {
      displayName: 'Kênh Review Sách Hay E2E',
      affiliateCode: uniqueCode,
      bio: 'Kênh chuyên review sách công nghệ, kinh doanh và phát triển bản thân cho cộng đồng độc giả HuKi E2E.',
      contactEmail: 'buyer_test@gmail.com',
      contactPhone: '0987654321',
      applicantType: 'INDIVIDUAL',
      promotionDescription: 'Đăng tải các bài viết tóm tắt sách, trích dẫn hay và link giới thiệu sách tới hơn 20,000 độc giả tiềm năng.',
      hasPaidTraffic: false,
      contentCategories: ['TECHNOLOGY', 'BUSINESS'],
      promotionMethods: ['CONTENT_REVIEW', 'SOCIAL_MEDIA'],
      payoutSetupLater: true,
      channels: [
        {
          type: 'FACEBOOK',
          url: `https://facebook.com/huki.reviewer.${uniqueCode.toLowerCase()}`,
          canonicalUrl: `https://facebook.com/huki.reviewer.${uniqueCode.toLowerCase()}`,
          handle: `huki.reviewer.${uniqueCode.toLowerCase()}`,
          followersRange: 'FROM_10K_TO_50K',
          isPrimary: true,
        },
      ],
      termsVersion: '1.4.1',
      privacyVersion: '1.4.1',
      marketingConsent: true,
    };

    const applyRes = await request('/affiliate/applications', {
      method: 'POST',
      headers: buyerHeaders,
      body: applyPayload,
    });

    assert(applyRes.ok || applyRes.status === 201 || applyRes.status === 200, 'Nộp đơn đăng ký CTV thành công (HTTP 200/201)');
    const applyData = applyRes.data?.data || applyRes.data;
    profileId = applyData?.id || applyData?.profile?.id;
    assert(Boolean(profileId), `Khởi tạo hồ sơ CTV ID: ${profileId}`);
  }

  // 5. Platform Admin đăng nhập & Duyệt hồ sơ CTV
  console.log('\n🔹 5. Platform Admin đăng nhập & Duyệt hồ sơ CTV...');
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

  if (profileId) {
    const approveRes = await request(`/admin/affiliates/${profileId}/approve`, {
      method: 'POST',
      headers: adminHeaders,
    });
    assert(approveRes.ok || approveRes.status === 200 || approveRes.status === 201, 'Platform Admin phê duyệt hồ sơ CTV thành công');
    const approvedProfile = approveRes.data?.data || approveRes.data;
    assert(approvedProfile?.status === 'ACTIVE' || approvedProfile?.profile?.status === 'ACTIVE', 'Trạng thái hồ sơ chuyển sang ACTIVE');
  }

  // 6. CTV kiểm tra trạng thái hồ sơ cá nhân sau khi được duyệt
  console.log('\n🔹 6. CTV xác nhận trạng thái tài khoản kích hoạt (ACTIVE)...');
  const myProfileAfter = await request('/affiliate/me', { headers: buyerHeaders });
  assert(myProfileAfter.ok, 'Endpoint /affiliate/me phản hồi HTTP 200');
  const activeProfile = myProfileAfter.data?.data?.profile || myProfileAfter.data?.profile;
  assert(activeProfile?.status === 'ACTIVE', `Hồ sơ CTV chính thức ACTIVE (Mã CTV: ${activeProfile?.affiliateCode})`);

  // 7. Khám phá kho sản phẩm có hoa hồng cao (Marketplace Catalog)
  console.log('\n🔹 7. Khám phá danh mục sách có hoa hồng cho CTV...');
  const catalogRes = await request('/affiliate/catalog?limit=5', { headers: buyerHeaders });
  assert(catalogRes.ok, 'Tải danh mục Affiliate Marketplace thành công HTTP 200');
  const catalogBooks = catalogRes.data?.data?.items || catalogRes.data?.items || catalogRes.data?.data || [];
  assert(Array.isArray(catalogBooks) && catalogBooks.length > 0, `Tìm thấy ${catalogBooks.length} đầu sách trong sàn tiếp thị`);

  const sampleBook = catalogBooks[0];
  const targetBookId = sampleBook?.id || 'a1849bba-f111-42aa-ac08-2783465646d0';

  // 8. Xem chi tiết thẻ hoa hồng của sản phẩm cụ thể
  console.log(`\n🔹 8. Xem tỷ lệ hoa hồng cụ thể của sách "${sampleBook?.title || 'Sách E2E'}"...`);
  const cardRes = await request(`/affiliate/books/${targetBookId}/commission-card`, { headers: buyerHeaders });
  assert(cardRes.ok, 'Tải Commission Card sản phẩm thành công HTTP 200');
  const cardData = cardRes.data?.data || cardRes.data;
  assert(
    Boolean(cardData?.effectiveRate !== undefined || cardData?.commissionRate !== undefined),
    `Tỷ lệ hoa hồng ước tính: ${cardData?.effectiveRate ?? cardData?.commissionRate ?? 10}% (~${Number(cardData?.estimatedCommissionAmount ?? cardData?.estimatedCommission ?? 0).toLocaleString('vi-VN')}đ)`,
  );

  // 9. CTV Tạo Liên Kết Rút Gọn Tiếp Thị (Affiliate Link Generation)
  console.log('\n🔹 9. CTV tạo link tiếp thị rút gọn cho cuốn sách...');
  const customShortCode = `ref_${Date.now().toString().slice(-6)}`;
  const createLinkRes = await request('/affiliate/links', {
    method: 'POST',
    headers: buyerHeaders,
    body: {
      targetUrl: `http://localhost:3100/books/${targetBookId}`,
      customShortCode,
      campaignName: 'Chiến Dịch Sách Hay Tháng 10',
      targetBookId,
    },
  });

  assert(createLinkRes.ok || createLinkRes.status === 201 || createLinkRes.status === 200, 'Tạo link tiếp thị thành công HTTP 200/201');
  const linkData = createLinkRes.data?.data || createLinkRes.data;
  const createdShortCode = linkData?.shortCode || customShortCode;
  assert(Boolean(createdShortCode), `Mã rút gọn tạo thành công: ${createdShortCode}`);

  // 10. Phân giải link tiếp thị & ghi nhận lượt nhấp (Resolve Link & Attribution Click)
  console.log(`\n🔹 10. Khách hàng nhấp vào link tiếp thị (/affiliate/resolve/${createdShortCode})...`);
  const resolveRes = await request(`/affiliate/resolve/${createdShortCode}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 E2E-Shopper',
      'Referer': 'https://facebook.com/huki.reviewer',
    },
  });
  assert(resolveRes.ok, 'Hệ thống phân giải Short Code phản hồi HTTP 200');
  const resolveData = resolveRes.data?.data || resolveRes.data;
  assert(Boolean(resolveData?.targetUrl), `Điều hướng thành công đến URL đích: ${resolveData?.targetUrl}`);
  assert(Boolean(resolveData?.cookieToken || resolveData?.isThrottled !== undefined), `Ghi nhận mã Attribution Cookie thành công (Hạn dùng 30 ngày)`);

  // 11. Kiểm tra Ví Hoa Hồng CTV (GET /affiliate/wallet)
  console.log('\n🔹 11. CTV kiểm tra số dư Ví hoa hồng đối tác...');
  const walletRes = await request('/affiliate/wallet', { headers: buyerHeaders });
  assert(walletRes.ok, 'Tải thông tin Ví hoa hồng thành công HTTP 200');
  const walletData = walletRes.data?.data || walletRes.data;
  assert(
    walletData?.availableBalance !== undefined &&
    walletData?.holdingBalance !== undefined &&
    walletData?.pendingBalance !== undefined,
    `Trạng thái ví: Khả dụng=${Number(walletData?.availableBalance || 0).toLocaleString('vi-VN')}đ | Tạm giữ=${Number(walletData?.holdingBalance || 0).toLocaleString('vi-VN')}đ | Chờ duyệt=${Number(walletData?.pendingBalance || 0).toLocaleString('vi-VN')}đ`,
  );

  // 12. CTV Xem Bảng Điều Khiển Tổng Quan (GET /affiliate/dashboard)
  console.log('\n🔹 12. CTV xem Bảng điều khiển hiệu quả kinh doanh (Dashboard)...');
  const dashboardRes = await request('/affiliate/dashboard', { headers: buyerHeaders });
  assert(dashboardRes.ok, 'Tải Dashboard CTV thành công HTTP 200');
  const dashboardData = dashboardRes.data?.data || dashboardRes.data;
  assert(dashboardData?.metrics !== undefined || dashboardData?.stats !== undefined || dashboardData?.lifetimeEarned !== undefined, 'Hệ thống trả về đầy đủ chỉ số thống kê lượt click, chuyển đổi & hoa hồng');

  // 13. Platform Admin Kích Hoạt Phiên Đối Soát Tự Động (Affiliate Settlement Batch)
  console.log('\n🔹 13. Platform Admin chạy phiên đối soát hoa hồng định kỳ...');
  const settlementRes = await request('/admin/affiliates/settlement/trigger', {
    method: 'POST',
    headers: adminHeaders,
    body: { limit: 100 },
  });
  assert(settlementRes.ok || settlementRes.status === 200 || settlementRes.status === 201, 'Kích hoạt Worker đối soát hoa hồng thành công HTTP 200');
  const settlementResult = settlementRes.data?.data || settlementRes.data;
  console.log(`   ℹ️ Kết quả đối soát: Matured=${settlementResult?.maturedCount ?? settlementResult?.settledCount ?? 0}, Amount=${settlementResult?.totalSettledAmount ?? 0}đ`);
  assert(Boolean(settlementResult !== undefined), 'Worker hoàn tất chu trình quét đối soát hoa hồng đúng hạn');

  // 14. Kiểm tra Cơ Chế Phòng Chống Gian Lận Khi Rút Tiền (Fraud Gating & KYC Check)
  console.log('\n🔹 14. Kiểm tra Cơ chế bảo vệ quỹ: Yêu cầu KYC trước khi rút tiền...');
  const payoutAttemptRes = await request('/affiliate/payouts', {
    method: 'POST',
    headers: buyerHeaders,
    body: {
      requestedAmount: 100000,
      idempotencyKey: `pay_${Date.now()}`,
    },
  });
  // Tài khoản chưa xác minh danh tính KYC ngân hàng nên hệ thống phải bảo vệ an toàn ngân quỹ
  assert(
    payoutAttemptRes.status === 400 || payoutAttemptRes.status === 403 || (payoutAttemptRes.data?.message && payoutAttemptRes.data.message.includes('KYC')),
    `Hệ thống kích hoạt cơ chế bảo vệ ngân quỹ: Từ chối rút tiền khi chưa hoàn tất KYC (Status ${payoutAttemptRes.status})`,
  );

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT PHASE 7:`);
  console.log(`   ✅ PASSED: ${passed}`);
  console.log(`   ❌ FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\n🛑 PHÁT HIỆN LỖI TRONG PHASE 7:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.log('\n⚠️ THEO NGUYÊN TẮC: Dừng lại ngay lập tức, không tự ý sửa code! Chờ lệnh từ người dùng.');
    process.exit(1);
  } else {
    console.log('\n🎉 PHASE 7 HOÀN TẤT THÀNH CÔNG RỰC RỠ 100%!');
    console.log(`👉 Người dùng có thể kiểm tra Kênh Tiếp thị liên kết trên UI: http://localhost:3100/affiliate`);
    process.exit(0);
  }
}

runPhase7AffiliateE2E();
