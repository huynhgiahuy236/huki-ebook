/**
 * HuKi E-Commerce Platform - Phase 8 E2E Test Suite
 * Module: Tài sản số Ebook, Bản quyền DRM & Trình đọc WebReader
 *
 * Tiêu chuẩn: Nền tảng phân phối sách số bản quyền cao cấp
 *
 * Kịch bản kiểm thử thực tế 100%:
 *  1. Đăng nhập tài khoản Buyer (buyer_test@gmail.com)
 *  2. Kiểm tra Tủ sách cá nhân (GET /books/library/my-books)
 *  3. Xác thực quyền đọc số thời gian thực (GET /books/:id/access -> OWNED)
 *  4. Quản trị viên DRM kiểm tra tổng quan kho khóa bản quyền (GET /admin/drm/overview)
 *  5. Khởi tạo phiên đọc sách bản quyền DRM Vault (POST /admin/drm/licenses/:id/session)
 *  6. Kết thúc phiên đọc sách bản quyền DRM (POST /admin/drm/licenses/:id/session-leave)
 *  7. Phân tích chữ ký số Forensic Watermark chống sao chép lậu (POST /forensics/decode)
 *  8. Đồng bộ tiến độ đọc WebReader (PUT /reader/progress & GET /reader/progress/:bookId)
 *  9. Quản lý dấu trang đọc sách (POST, GET, DELETE /reader/bookmarks)
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

async function runPhase8EbookDrmReaderE2E() {
  console.log('================================================================');
  console.log('🔄 BẮT ĐẦU E2E PHASE 8: TÀI SẢN SỐ EBOOK, DRM & TRÌNH ĐỌC WEBREADER');
  console.log(`📡 Kết nối API Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Đăng nhập Khách mua hàng (Buyer)
  console.log('🔹 1. Đăng nhập tài khoản Buyer (buyer_test@gmail.com)...');
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

  // 2. Kiểm tra Tủ Sách Cá Nhân (My Library)
  console.log('\n🔹 2. Kiểm tra Tủ Sách Cá Nhân của Người mua (GET /books/library/my-books)...');
  const myLibraryRes = await request('/books/library/my-books', { headers: buyerHeaders });
  assert(myLibraryRes.ok, 'Tải Tủ sách cá nhân thành công HTTP 200');
  const libraryBooks = myLibraryRes.data?.data || myLibraryRes.data || [];
  assert(Array.isArray(libraryBooks) && libraryBooks.length > 0, `Tủ sách sở hữu ${libraryBooks.length} cuốn sách số có bản quyền`);

  const targetBook = libraryBooks[0]?.book || libraryBooks[0];
  const targetBookId = targetBook?.id || '20e8b837-830f-4c19-95db-016ba34972c5';
  console.log(`   ℹ️ Sách số mục tiêu: "${targetBook?.title}" (ID: ${targetBookId})`);

  // 3. Xác thực quyền đọc Ebook thời gian thực (Real-time Access Check)
  console.log(`\n🔹 3. Kiểm tra thẩm quyền truy cập sách số (GET /books/${targetBookId}/access)...`);
  const accessRes = await request(`/books/${targetBookId}/access`, { headers: buyerHeaders });
  assert(accessRes.ok, 'Endpoint /books/:id/access phản hồi HTTP 200');
  const accessData = accessRes.data?.data || accessRes.data;
  assert(accessData?.allowed === true, 'Độc giả ĐƯỢC PHÉP TRUY CẬP đọc toàn bộ nội dung sách');
  assert(accessData?.reason === 'OWNED', `Lý do cấp quyền: "${accessData?.reason}" (${accessData?.message})`);

  // 4. Platform Admin đăng nhập quản lý DRM Vault
  console.log('\n🔹 4. Platform Admin kiểm tra Kho khóa bảo mật DRM Vault...');
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

  const drmOverviewRes = await request('/admin/drm/overview', { headers: adminHeaders });
  assert(drmOverviewRes.ok, 'Tải tổng quan DRM Vault phản hồi HTTP 200');
  const drmStats = drmOverviewRes.data?.data || drmOverviewRes.data;
  assert(
    drmStats?.totalEncryptedBooks !== undefined || drmStats?.algorithmSummary !== undefined,
    `Hệ thống báo cáo chỉ số bản quyền DRM Vault minh bạch: ${drmStats?.algorithmSummary || 'AES-GCM-256'} (Khóa KMS: ${drmStats?.kmsHardwareClusters || 'Active'})`,
  );

  // 5. Khởi tạo phiên đọc bảo mật trên thiết bị (DRM Session Start)
  console.log('\n🔹 5. Bắt đầu phiên đọc bảo mật DRM trên thiết bị...');
  const sessionRes = await request(`/admin/drm/licenses/${targetBookId}/session`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      userId: buyerLogin.data?.data?.user?.id || '04609db5-d34d-4f54-a640-c6e7d820777b',
      deviceId: 'DEVICE_E2E_CHROME_WIN',
      deviceName: 'Chrome on Windows 11 Pro E2E',
      ipAddress: '127.0.0.1',
    },
  });
  assert(sessionRes.ok || sessionRes.status === 200 || sessionRes.status === 201, 'Kích hoạt DRM Session thành công HTTP 200/201');

  // 6. Giải phóng phiên đọc bảo mật (DRM Session Leave)
  console.log('\n🔹 6. Kết thúc phiên đọc và giải phóng tài nguyên DRM...');
  const endSessionRes = await request(`/admin/drm/licenses/${targetBookId}/session-leave`, {
    method: 'POST',
    headers: adminHeaders,
  });
  assert(endSessionRes.ok || endSessionRes.status === 200, 'Giải phóng DRM Session thành công');

  // 7. Giải mã chữ ký số Forensic Watermark bảo vệ bản quyền (POST /forensics/decode)
  console.log('\n🔹 7. Kiểm tra giải mã chữ ký số Forensic Watermark chống in lậu...');
  const sampleWatermarkText = `HUKI • buyer_test@gmail.com • P.42 • 2026-10-30 17:00 UTC`;
  const decodeRes = await request('/forensics/decode', {
    method: 'POST',
    headers: adminHeaders,
    body: { watermarkText: sampleWatermarkText },
  });
  assert(decodeRes.ok || decodeRes.status === 200, 'Giải mã Watermark phản hồi HTTP 200');
  const decodedData = decodeRes.data?.data || decodeRes.data;
  assert(
    decodedData?.rawIdentifier === 'buyer_test@gmail.com' && decodedData?.isValidHukiWatermark === true,
    `Nhận diện chính xác chữ ký độc giả: ${decodedData?.rawIdentifier} (Trang ${decodedData?.pageNumber})`,
  );

  // 8. Lưu & Đồng bộ tiến độ đọc WebReader (PUT /reader/progress)
  console.log('\n🔹 8. Độc giả lật trang sách, đồng bộ tiến độ đọc WebReader...');
  const saveProgressRes = await request('/reader/progress', {
    method: 'PUT',
    headers: buyerHeaders,
    body: {
      bookId: targetBookId,
      currentPage: 42,
      percentage: 12.0,
    },
  });
  assert(saveProgressRes.ok, 'Lưu tiến độ đọc thành công HTTP 200');

  // 9. Lấy lại tiến độ đọc khi mở lại sách (GET /reader/progress/:bookId)
  console.log('\n🔹 9. Độc giả mở lại sách trên thiết bị khác, kiểm tra vị trí cuộn trang...');
  const getProgressRes = await request(`/reader/progress/${targetBookId}`, { headers: buyerHeaders });
  assert(getProgressRes.ok, 'Tải tiến độ đọc thành công HTTP 200');
  const progressData = getProgressRes.data?.data || getProgressRes.data;
  assert(progressData?.currentPage === 42, `Đồng bộ chính xác trang đang đọc dở: Trang ${progressData?.currentPage}`);

  // 10. Tạo Dấu trang (Bookmark) tại vị trí trang sách hay (POST /reader/bookmarks)
  console.log('\n🔹 10. Tạo dấu trang ghi chú (POST /reader/bookmarks)...');
  const addBookmarkRes = await request('/reader/bookmarks', {
    method: 'POST',
    headers: buyerHeaders,
    body: {
      bookId: targetBookId,
      pageNumber: 42,
      note: 'Chương 3: Phân tích kiến trúc vi dịch vụ & Sàn TMĐT đa gian hàng',
    },
  });
  assert(addBookmarkRes.ok || addBookmarkRes.status === 201 || addBookmarkRes.status === 200, 'Tạo Bookmark thành công HTTP 200/201');
  const createdBookmark = addBookmarkRes.data?.data || addBookmarkRes.data;
  const bookmarkId = createdBookmark?.id;
  assert(Boolean(bookmarkId), `Mã dấu trang được lưu: ${bookmarkId}`);

  // 11. Độc giả xem danh sách dấu trang đã lưu (GET /reader/bookmarks/:bookId)
  console.log('\n🔹 11. Độc giả mở mục Dấu trang trong WebReader...');
  const listBookmarksRes = await request(`/reader/bookmarks/${targetBookId}`, { headers: buyerHeaders });
  assert(listBookmarksRes.ok, 'Tải danh sách bookmarks thành công HTTP 200');
  const bookmarks = listBookmarksRes.data?.data || listBookmarksRes.data || [];
  const foundBm = bookmarks.find((b) => b.id === bookmarkId || b.pageNumber === 42);
  assert(Boolean(foundBm), `Tìm thấy dấu trang ghi chú: "${foundBm?.note || foundBm?.title}"`);

  // 12. Xóa Dấu trang (DELETE /reader/bookmarks/:id)
  if (bookmarkId) {
    console.log('\n🔹 12. Độc giả dọn dẹp xóa dấu trang đã đọc xong...');
    const deleteBmRes = await request(`/reader/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
      headers: buyerHeaders,
    });
    assert(deleteBmRes.ok || deleteBmRes.status === 200 || deleteBmRes.status === 204, 'Xóa dấu trang thành công HTTP 200/204');
  }

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT PHASE 8:`);
  console.log(`   ✅ PASSED: ${passed}`);
  console.log(`   ❌ FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\n🛑 PHÁT HIỆN LỖI TRONG PHASE 8:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.log('\n⚠️ THEO NGUYÊN TẮC: Dừng lại ngay lập tức, không tự ý sửa code! Chờ lệnh từ người dùng.');
    process.exit(1);
  } else {
    console.log('\n🎉 PHASE 8 HOÀN TẤT THÀNH CÔNG RỰC RỠ 100%!');
    console.log(`👉 Người dùng có thể kiểm tra Tủ sách trên UI: http://localhost:3100/profile/library`);
    process.exit(0);
  }
}

runPhase8EbookDrmReaderE2E();
