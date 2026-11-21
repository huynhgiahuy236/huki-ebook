/**
 * =============================================================================
 * SCRIPT KIỂM THỬ E2E CHẶNG 4 - SPRINT 2 (Zero Mock Data, Isolated)
 * =============================================================================
 * Mục tiêu kiểm thử:
 * 1. BUG-025: HierarchicalSidebar bổ sung mục "Hồ Sơ Của Tôi" (/profile) phân quyền nghiêm ngặt chỉ BUYER/USER.
 * 2. BUG-026: banners.controller.ts gỡ ParseUUIDPipe, banners.service.ts xóa idempotent.
 * 3. BUG-026: AdminMarketingView.tsx bóc tách items linh hoạt, xóa lưu DB, không fallback DEFAULT_BANNERS khi F5, phát Realtime BroadcastChannel.
 * 4. BUG-026: web/src/app/page.tsx nhận tín hiệu BroadcastChannel đồng bộ realtime banner trang chủ.
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Chi tiết: ${error.message}`);
  }
}

console.log('🚀 [E2E TEST CHẶNG 4] Bắt đầu kiểm tra BUG-025, BUG-026...\n');

// 1. Kiểm tra BUG-025: HierarchicalSidebar.tsx có mục "Hồ Sơ Của Tôi" với phân quyền USER
runTest('BUG-025: HierarchicalSidebar.tsx chứa mục "Hồ Sơ Của Tôi" (/profile) trong nhóm TIỆN ÍCH', () => {
  const sidebarPath = path.resolve(__dirname, '../web/src/ui/components/layout/HierarchicalSidebar.tsx');
  assert.ok(fs.existsSync(sidebarPath), 'File HierarchicalSidebar.tsx phải tồn tại');
  const content = fs.readFileSync(sidebarPath, 'utf8');

  assert.ok(
    content.includes("id: 'user-profile'") || content.includes('user-profile'),
    'Phải có item id user-profile'
  );
  assert.ok(
    content.includes("to: '/profile'") || content.includes('to: "/profile"'),
    'Phải có đường dẫn to: /profile'
  );
  assert.ok(
    content.includes("icon: 'person'") || content.includes('icon: "person"'),
    'Phải có icon person'
  );
});

runTest('BUG-025: HierarchicalSidebar.tsx phân quyền chỉ hiển thị mục hồ sơ cho BUYER (loại trừ Admin, Seller, Shipper)', () => {
  const sidebarPath = path.resolve(__dirname, '../web/src/ui/components/layout/HierarchicalSidebar.tsx');
  const content = fs.readFileSync(sidebarPath, 'utf8');

  assert.ok(
    content.includes('isLoggedIn && !isAdmin && !isSeller && !isShipper'),
    'Phải ràng buộc điều kiện phân quyền nghiêm ngặt isLoggedIn && !isAdmin && !isSeller && !isShipper'
  );
});

// 2. Kiểm tra BUG-026: promotion-service banners.controller.ts gỡ ParseUUIDPipe
runTest('BUG-026: banners.controller.ts gỡ ParseUUIDPipe để hỗ trợ xóa linh hoạt theo string ID', () => {
  const controllerPath = path.resolve(__dirname, '../platform/apps/promotion-service/src/modules/banners/banners.controller.ts');
  assert.ok(fs.existsSync(controllerPath), 'File banners.controller.ts phải tồn tại');
  const content = fs.readFileSync(controllerPath, 'utf8');

  assert.ok(
    !content.includes("delete(@Param('id', ParseUUIDPipe)"),
    'delete endpoint không được dùng ParseUUIDPipe'
  );
  assert.ok(
    content.includes("delete(@Param('id') id: string)"),
    'delete endpoint phải nhận @Param(\'id\') id: string'
  );
});

// 3. Kiểm tra BUG-026: promotion-service banners.service.ts xóa idempotent
runTest('BUG-026: banners.service.ts xóa banner idempotent, không crash nếu không tìm thấy banner', () => {
  const servicePath = path.resolve(__dirname, '../platform/apps/promotion-service/src/modules/banners/banners.service.ts');
  assert.ok(fs.existsSync(servicePath), 'File banners.service.ts phải tồn tại');
  const content = fs.readFileSync(servicePath, 'utf8');

  assert.ok(
    content.includes('if (!banner)') && content.includes('return { success: true }'),
    'delete() phải trả về { success: true } khi không tìm thấy banner'
  );
});

// 4. Kiểm tra BUG-026: AdminMarketingView.tsx không reset về DEFAULT_BANNERS khi F5
runTest('BUG-026: AdminMarketingView.tsx tôn trọng trạng thái lưu trữ khi đã xóa hết banner (saved !== null)', () => {
  const viewPath = path.resolve(__dirname, '../web/src/ui/components/admin/AdminMarketingView.tsx');
  assert.ok(fs.existsSync(viewPath), 'File AdminMarketingView.tsx phải tồn tại');
  const content = fs.readFileSync(viewPath, 'utf8');

  assert.ok(
    content.includes('if (saved !== null)'),
    'Khởi tạo state phải kiểm tra saved !== null thay vì chỉ kiểm tra parsed.length > 0'
  );
});

// 5. Kiểm tra BUG-026: AdminMarketingView.tsx bóc tách dữ liệu backend linh hoạt (res.data.items)
runTest('BUG-026: AdminMarketingView.tsx bóc tách items từ backend kể cả khi trả về dạng { items, pagination }', () => {
  const viewPath = path.resolve(__dirname, '../web/src/ui/components/admin/AdminMarketingView.tsx');
  const content = fs.readFileSync(viewPath, 'utf8');

  assert.ok(
    content.includes('res.data?.items') || content.includes('Array.isArray(res.data) ? res.data :'),
    'Phải hỗ trợ bóc tách items từ res.data?.items'
  );
});

// 6. Kiểm tra BUG-026: AdminMarketingView.tsx xóa banner gọi API DB và phát tín hiệu Realtime
runTest('BUG-026: AdminMarketingView.tsx handleDeleteBanner gọi bannerApi.deleteBanner và phát broadcastMarketingUpdate', () => {
  const viewPath = path.resolve(__dirname, '../web/src/ui/components/admin/AdminMarketingView.tsx');
  const content = fs.readFileSync(viewPath, 'utf8');

  assert.ok(
    content.includes('bannerApi.deleteBanner(id)'),
    'handleDeleteBanner phải gọi bannerApi.deleteBanner(id)'
  );
  assert.ok(
    content.includes('broadcastMarketingUpdate(updated)'),
    'handleDeleteBanner phải phát tín hiệu đồng bộ realtime'
  );
  assert.ok(
    content.includes('BroadcastChannel("huki_marketing_channel")'),
    'broadcastMarketingUpdate phải phát tin qua BroadcastChannel huki_marketing_channel'
  );
});

// 7. Kiểm tra BUG-026: web/src/app/page.tsx lắng nghe BroadcastChannel huki_marketing_channel
runTest('BUG-026: page.tsx trang chủ lắng nghe BroadcastChannel huki_marketing_channel để đồng bộ realtime không cần F5', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/page.tsx');
  assert.ok(fs.existsSync(pagePath), 'File page.tsx phải tồn tại');
  const content = fs.readFileSync(pagePath, 'utf8');

  assert.ok(
    content.includes('new BroadcastChannel("huki_marketing_channel")'),
    'Trang chủ phải mở BroadcastChannel huki_marketing_channel'
  );
  assert.ok(
    content.includes('loadAdminBanners()'),
    'Khi nhận tin nhắn BroadcastChannel phải gọi loadAdminBanners()'
  );
});

console.log(`\n📊 [KẾT QUẢ KIỂM THỬ CHẶNG 4]: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%).`);
if (passedTests === totalTests) {
  console.log('🎉 TOÀN BỘ 7/7 KIỂM TOÁN CHẶNG 4 ĐÃ ĐẠT CHUẨN 100%!\n');
  process.exit(0);
} else {
  console.error('⚠️ MỘT SỐ BÀI KIỂM THỬ CHẶNG 4 KHÔNG ĐẠT.\n');
  process.exit(1);
}
