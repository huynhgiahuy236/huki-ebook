/**
 * E2E Validation Script for Sprint 2 - Chặng 3:
 * - BUG-023: Redesign modal ân hạn xóa tài khoản sang tông trắng & trừ quota lượt xóa chính xác
 * - BUG-024: Thiết kế lại cụm nút danh sách đơn hàng người mua chuẩn bảng kê tài chính (border-t)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runTests() {
  console.log('🚀 [E2E TEST CHẶNG 3] Bắt đầu kiểm tra BUG-023, BUG-024...\n');
  let passCount = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passCount++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
    }
  }

  // ==========================================
  // TEST 1: BUG-023 - Backend Deletion Count API
  // ==========================================
  test('BUG-023: user.controller.ts trả deletionCount từ DB trong getProfile', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../platform/apps/identity-service/src/modules/user/user.controller.ts'), 'utf-8');
    assert(file.includes('deletionCount: user.deletionCount ?? 0'), 'getProfile chưa trả deletionCount từ database');
    assert(file.includes('deletionScheduledAt: user.deletionScheduledAt'), 'getProfile chưa trả deletionScheduledAt');
    assert(file.includes('isPendingDeletion: user.status === \'PENDING_DELETION\''), 'getProfile chưa trả isPendingDeletion');
  });

  test('BUG-023: user.service.ts trả deletionCount sau khi hủy yêu cầu xóa trong cancelDeletion', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../platform/apps/identity-service/src/modules/user/user.service.ts'), 'utf-8');
    assert(file.includes('deletionCount: updated.deletionCount ?? 0'), 'cancelDeletion chưa trả deletionCount sau khi cập nhật');
  });

  // ==========================================
  // TEST 2: BUG-023 - Redesign Modal Ân Hạn Nền Trắng
  // ==========================================
  test('BUG-023: AccountPendingDeletionModal.tsx sử dụng nền trắng thanh lịch, loại bỏ màu xanh đen AI u ám', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/ui/components/common/AccountPendingDeletionModal.tsx'), 'utf-8');
    assert(!file.includes('bg-[#031510]'), 'Vẫn còn màu xanh đen AI bg-[#031510]');
    assert(!file.includes('bg-[#00261C]'), 'Vẫn còn màu xanh đậm AI bg-[#00261C]');
    assert(file.includes('bg-white'), 'Thiếu nền trắng bg-white cho modal card');
    assert(file.includes('border-slate-200'), 'Thiếu viền xám tinh tế border-slate-200');
    assert(file.includes('text-slate-900') || file.includes('text-slate-800'), 'Chưa dùng màu chữ đen sắc nét text-slate');
    assert(file.includes('bg-amber-100'), 'Thiếu badge ân hạn amber thanh lịch');
  });

  test('BUG-023: AccountPendingDeletionModal.tsx đồng bộ deletionCount vào user session khi khôi phục', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/ui/components/common/AccountPendingDeletionModal.tsx'), 'utf-8');
    assert(file.includes('deletionCount:'), 'handleRestoreAccount chưa cập nhật deletionCount vào session');
  });

  test('BUG-023: profile/security/page.tsx hiển thị hạn mức xóa còn lại từ Single Source of Truth', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/app/profile/security/page.tsx'), 'utf-8');
    assert(file.includes('deletionCount = profile?.deletionCount'), 'profile/security chưa đọc deletionCount từ profile');
    assert(file.includes('remainingDeletions = Math.max(0, maxDeletionCount - deletionCount)'), 'Sai công thức tính số lượt xóa còn lại');
  });

  // ==========================================
  // TEST 3: BUG-024 - Cụm Nút Đơn Hàng Chuẩn Bảng Kê Tài Chính
  // ==========================================
  test('BUG-024: orders/page.tsx tách riêng hàng nút thao tác có viền trên border-t chuẩn Bảng Kê Tài Chính', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/app/orders/page.tsx'), 'utf-8');
    assert(file.includes('border-t border-slate-100'), 'Thiếu viền trên border-t phân tách hàng nút thao tác');
    assert(file.includes('h-9 px-3.5'), 'Chiều cao nút thao tác chưa chuẩn hóa h-9');
    assert(file.includes('bg-[#003B2B]'), 'Thiếu nút Primary xanh thương hiệu nổi bật');
    assert(file.includes('Nhắn Shop'), 'Chưa có nút Nhắn Shop đồng bộ');
  });

  test('BUG-024: orders/page.tsx chuẩn hóa phân cấp nút chính và nút phụ mượt mà', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/app/orders/page.tsx'), 'utf-8');
    assert(file.includes('text-slate-500 hover:text-rose-600'), 'Nút Hủy Đơn chưa được làm mượt mà tối giản');
    assert(file.includes('border-slate-200'), 'Các nút phụ chưa dùng viền xám mờ mượt mà');
  });

  test('BUG-024: orders/[id]/page.tsx chuẩn hóa hàng nút trên đầu trang chi tiết', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/app/orders/[id]/page.tsx'), 'utf-8');
    assert(file.includes('h-9 px-3.5') || file.includes('h-9 px-4'), 'Hàng nút chi tiết đơn chưa chuẩn hóa h-9');
    assert(file.includes('bg-[#003B2B]'), 'Nút Đánh Giá Sản Phẩm chưa dùng nền xanh thương hiệu');
    assert(file.includes('text-slate-500 hover:text-rose-600'), 'Nút Hủy Đơn trên chi tiết chưa làm mượt mà tối giản');
  });

  // ==========================================
  // TỔNG KẾT
  // ==========================================
  console.log(`\n📊 [KẾT QUẢ KIỂM THỬ CHẶNG 3]: ${passCount}/${totalTests} tests passed (${Math.round(passCount/totalTests*100)}%).`);
  if (passCount === totalTests) {
    console.log('🎉 TOÀN BỘ 8/8 KIỂM TOÁN CHẶNG 3 ĐÃ ĐẠT CHUẨN 100%!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Có bài test thất bại trong Chặng 3. Vui lòng kiểm tra lại!');
    process.exit(1);
  }
}

runTests();
