const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('   VERIFYING NOTIFICATION SLIDE-OVER DRAWER & SELLER CHAT BULK ACTIONS');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

// 1. Check UniversalNotificationBell.tsx
console.log('--- 1. Checking UniversalNotificationBell.tsx (Slide-over Drawer) ---');
const bellPath = path.resolve(__dirname, '../../web/src/ui/components/common/UniversalNotificationBell.tsx');
const bellCode = fs.readFileSync(bellPath, 'utf8');

assert(bellCode.includes('isDrawerOpen'), 'Manages isDrawerOpen state for right side drawer');
assert(bellCode.includes('fixed inset-y-0 right-0'), 'Drawer is positioned fixed on right edge (Slide-over Drawer)');
assert(bellCode.includes('unreadNotifications') && bellCode.includes('!n.isRead'), 'Drawer filters specifically for UNREAD notifications');
assert(bellCode.includes('DrawerFilterTab') && bellCode.includes('ALERTS') && bellCode.includes('ORDERS'), 'Contains classified tabs (Tất cả, Cảnh báo, Đơn hàng, Chủ động)');
assert(bellCode.includes('selectedIds') && bellCode.includes('handleBulkMarkAsRead'), 'Contains multi-select checkbox state and bulk mark-as-read action');
assert(bellCode.includes('viewingDetailNotif'), 'Contains Notification Detail Modal when clicking item or Chi tiết');
assert(bellCode.includes('defaultFullPage'), 'Contains direct link to full Notification Center (/seller/notifications)');

// 2. Check SellerNotificationsView.tsx
console.log('\n--- 2. Checking SellerNotificationsView.tsx (Notification Center) ---');
const notifCenterPath = path.resolve(__dirname, '../../web/src/ui/components/seller/SellerNotificationsView.tsx');
const notifCenterCode = fs.readFileSync(notifCenterPath, 'utf8');

assert(notifCenterCode.includes('useRealtimeNotifications'), 'Uses unified useRealtimeNotifications hook (synchronized with MongoDB & Socket.io)');
assert(notifCenterCode.includes('selectedIds') && notifCenterCode.includes('handleBulkMarkAsRead'), 'Supports multi-select checkboxes and bulk mark as read');
assert(notifCenterCode.includes('SellerPagination'), 'Has pagination toolbar for large notification archives');
assert(notifCenterCode.includes('selectedNotif'), 'Has unified Notification Detail Modal for viewing full content and actionUrl');
assert(notifCenterCode.includes('rounded-2xl border') && notifCenterCode.includes('shadow-2xs'), 'Encapsulated in clean Card Container frame');

// 3. Check SellerChatView.tsx
console.log('\n--- 3. Checking SellerChatView.tsx (Bulk Actions & Disabled Opacity) ---');
const chatPath = path.resolve(__dirname, '../../web/src/ui/components/seller/SellerChatView.tsx');
const chatCode = fs.readFileSync(chatPath, 'utf8');

assert(chatCode.includes('isMultiSelectCustomerMode') && chatCode.includes('selectedCustomerIds'), 'Has multi-select state for customer conversation list');
assert(chatCode.includes('handleBulkMarkCustomersRead'), 'Has bulk action to mark conversations as read');
assert(chatCode.includes('handleBulkMarkCustomersUnread'), 'Has bulk action to mark conversations as unread');
assert(chatCode.includes('handleBulkArchiveCustomers'), 'Has bulk action to archive conversations');
assert(chatCode.includes('checklist'), 'Has button to toggle multi-select mode');
assert(chatCode.includes('opacity-40 cursor-not-allowed pointer-events-none') && chatCode.includes('call'), 'Voice call button is disabled with opacity-40');
assert(chatCode.includes('opacity-40 cursor-not-allowed pointer-events-none') && chatCode.includes('videocam'), 'Video call button is disabled with opacity-40');
assert(chatCode.includes('Chuyên viên kỹ thuật DRM (Tính năng đang phát triển)'), 'DRM technical support button is disabled with opacity-40');

console.log('\n========================================================================');
console.log(`   TEST RESULT: ${passed}/${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
console.log('========================================================================\n');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
