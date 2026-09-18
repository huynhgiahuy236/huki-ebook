/**
 * Auto Migration Script
 *
 * Tự động tạo Next.js App Router pages cho TẤT CẢ React SPA pages
 *
 * Run: node scripts/auto-migrate-pages.js
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'ui', 'pages');
const APP_DIR = path.join(__dirname, '..', 'src', 'app');

// ============ ROUTE MAPPING ============
// Map: React page file → Next.js route path
const ROUTE_MAP = {
  // ============ STORE PAGES ============
  'store/HomePage.jsx': { route: '', icon: 'auto_stories', desc: 'Trang chủ' },
  'store/CatalogPage.jsx': { route: 'books', icon: 'menu_book', desc: 'Danh mục sách' },
  'store/BookDetailPage.jsx': { route: 'book/[id]', icon: 'book', desc: 'Chi tiết sách', param: 'id' },
  'store/BookPreviewPage.jsx': { route: 'book/[id]/preview', icon: 'preview', desc: 'Đọc thử', param: 'id' },
  'store/ShopPage.jsx': { route: 'shop/[id]', icon: 'store', desc: 'Cửa hàng', param: 'id' },
  'store/StoresPage.jsx': { route: 'stores', icon: 'storefront', desc: 'Danh sách cửa hàng' },
  'store/AuthorPage.jsx': { route: 'author/[id]', icon: 'person', desc: 'Tác giả', param: 'id' },
  'store/AudiobooksPage.jsx': { route: 'audiobooks', icon: 'headphones', desc: 'Audiobooks' },
  'store/CartPage.jsx': { route: 'cart', icon: 'shopping_cart', desc: 'Giỏ hàng' },
  'store/CheckoutPage.jsx': { route: 'checkout', icon: 'payment', desc: 'Thanh toán' },
  'store/OrderSuccessPage.jsx': { route: 'order/success', icon: 'check_circle', desc: 'Đặt hàng thành công' },
  'store/OrdersPage.jsx': { route: 'orders', icon: 'receipt_long', desc: 'Đơn hàng' },
  'store/OrderDetailPage.jsx': { route: 'orders/[id]', icon: 'receipt', desc: 'Chi tiết đơn', param: 'id' },
  'store/OrderInvoicePage.jsx': { route: 'orders/[id]/invoice', icon: 'description', desc: 'Hóa đơn', param: 'id' },
  'store/OrderReviewPage.jsx': { route: 'orders/[id]/review', icon: 'rate_review', desc: 'Đánh giá', param: 'id' },
  'store/OrderReturnPage.jsx': { route: 'orders/[id]/return', icon: 'undo', desc: 'Đổi trả', param: 'id' },
  'store/OrderTrackingPage.jsx': { route: 'orders/[id]/tracking', icon: 'local_shipping', desc: 'Theo dõi đơn', param: 'id' },
  'store/ProfilePage.jsx': { route: 'profile', icon: 'person', desc: 'Hồ sơ' },
  'store/UserAddressesPage.jsx': { route: 'profile/addresses', icon: 'location_on', desc: 'Địa chỉ' },
  'store/UserSecurityPage.jsx': { route: 'profile/security', icon: 'security', desc: 'Bảo mật' },
  'store/WalletPage.jsx': { route: 'profile/wallet', icon: 'account_balance_wallet', desc: 'Ví' },
  'store/LibraryPage.jsx': { route: 'library', icon: 'library_books', desc: 'Thư viện' },
  'store/ReaderPage.jsx': { route: 'library/[id]', icon: 'menu_book', desc: 'Đọc sách', param: 'id' },
  'store/DeviceManagementPage.jsx': { route: 'library/devices', icon: 'devices', desc: 'Thiết bị' },
  'store/CommunityPage.jsx': { route: 'community', icon: 'groups', desc: 'Cộng đồng' },
  'store/BookReviewsFeedPage.jsx': { route: 'community/reviews', icon: 'rate_review', desc: 'Đánh giá' },
  'store/BookQuotesPage.jsx': { route: 'community/quotes', icon: 'format_quote', desc: 'Trích dẫn' },
  'store/BookClubsDirectoryPage.jsx': { route: 'community/clubs', icon: 'club', desc: 'CLB sách' },
  'store/BookClubDetailPage.jsx': { route: 'community/clubs/[id]', icon: 'group', desc: 'Chi tiết CLB', param: 'id' },
  'store/CommunityPostDetailPage.jsx': { route: 'community/posts/[id]', icon: 'article', desc: 'Bài viết', param: 'id' },
  'store/ReadingChallengePage.jsx': { route: 'community/challenge', icon: 'emoji_events', desc: 'Thử thách' },
  'store/MessengerPage.jsx': { route: 'messages', icon: 'chat', desc: 'Tin nhắn' },
  'store/FlashSalePage.jsx': { route: 'flash-sale', icon: 'flash_on', desc: 'Flash Sale' },

  // ============ AUTH PAGES ============
  'auth/LoginPage.jsx': { route: 'auth/login', icon: 'login', desc: 'Đăng nhập' },
  'auth/RegisterPage.jsx': { route: 'auth/register', icon: 'person_add', desc: 'Đăng ký' },
  'auth/ForgotPasswordPage.jsx': { route: 'auth/forgot-password', icon: 'lock_open', desc: 'Quên mật khẩu' },
  'auth/VerifyOtpPage.jsx': { route: 'auth/verify', icon: 'verified_user', desc: 'Xác thực OTP' },
  'auth/ResetPasswordPage.jsx': { route: 'auth/reset-password', icon: 'restart_alt', desc: 'Đặt lại mật khẩu' },
  'auth/ChangePasswordPage.jsx': { route: 'auth/change-password', icon: 'lock', desc: 'Đổi mật khẩu' },
  'auth/AccountStatusPage.jsx': { route: 'auth/status', icon: 'account_box', desc: 'Trạng thái tài khoản' },
  'auth/OnboardingPreferencesPage.jsx': { route: 'auth/onboarding', icon: 'waving_hand', desc: 'Thiết lập ban đầu' },

  // ============ SELLER PAGES ============
  'seller/SellerPortalPage.jsx': { route: 'seller', icon: 'storefront', desc: 'Seller Portal' },
  'seller/SellerRegisterPage.jsx': { route: 'seller/register', icon: 'person_add', desc: 'Đăng ký Seller' },
  'seller/SellerDashboardPage.jsx': { route: 'seller/dashboard', icon: 'dashboard', desc: 'Dashboard' },
  'seller/SellerBusinessProfilePage.jsx': { route: 'seller/business', icon: 'store', desc: 'Hồ sơ doanh nghiệp' },
  'seller/SellerBusinessNotificationsPage.jsx': { route: 'seller/business/notifications', icon: 'notifications', desc: 'Thông báo' },
  'seller/SellerOrdersPage.jsx': { route: 'seller/orders', icon: 'shopping_bag', desc: 'Đơn hàng' },
  'seller/SellerOrderDetailPage.jsx': { route: 'seller/orders/[id]', icon: 'receipt_long', desc: 'Chi tiết đơn', param: 'id' },
  'seller/SellerStoresPage.jsx': { route: 'seller/stores', icon: 'store', desc: 'Cửa hàng' },
  'seller/SellerProductsPage.jsx': { route: 'seller/products', icon: 'inventory', desc: 'Sản phẩm' },
  'seller/SellerCreateHybrid.jsx': { route: 'seller/products/create', icon: 'add_circle', desc: 'Tạo sản phẩm' },
  'seller/SellerCreateEbook.jsx': { route: 'seller/products/create/ebook', icon: 'auto_stories', desc: 'Tạo Ebook' },
  'seller/SellerCreatePhysical.jsx': { route: 'seller/products/create/physical', icon: 'inventory_2', desc: 'Tạo sách giấy' },
  'seller/SellerEditHybrid.jsx': { route: 'seller/products/[id]/edit', icon: 'edit', desc: 'Sửa sản phẩm', param: 'id' },
  'seller/SellerCorrection.jsx': { route: 'seller/products/[id]/correct', icon: 'edit_note', desc: 'Sửa lỗi', param: 'id' },
  'seller/SellerFinancePage.jsx': { route: 'seller/finance', icon: 'account_balance_wallet', desc: 'Tài chính' },
  'seller/SellerVouchersPage.tsx': { route: 'seller/vouchers', icon: 'local_activity', desc: 'Vouchers' },
  'seller/SellerStaffPage.jsx': { route: 'seller/staff', icon: 'group', desc: 'Nhân sự' },
  'seller/SellerInventoryPage.jsx': { route: 'seller/inventory', icon: 'inventory_2', desc: 'Kho hàng' },
  'seller/SellerChatPage.jsx': { route: 'seller/chat', icon: 'chat', desc: 'Chat' },
  'seller/EdgeCasesLibrary.jsx': { route: 'seller/edge-cases', icon: 'bug_report', desc: 'Edge cases' },

  // ============ ADMIN PAGES ============
  'admin/AdminDashboardPage.jsx': { route: 'admin', icon: 'admin_panel_settings', desc: 'Admin Dashboard' },
  'admin/AdminBusinessesPage.jsx': { route: 'admin/businesses', icon: 'business', desc: 'Doanh nghiệp' },
  'admin/AdminBusinessUpdateRequestsPage.jsx': { route: 'admin/business-requests', icon: 'pending_actions', desc: 'Yêu cầu cập nhật' },
  'admin/AdminStoresPage.jsx': { route: 'admin/stores', icon: 'store', desc: 'Cửa hàng' },
  'admin/AdminBooksPage.jsx': { route: 'admin/books', icon: 'menu_book', desc: 'Sách' },
  'admin/AdminCategoriesPage.jsx': { route: 'admin/categories', icon: 'category', desc: 'Danh mục' },
  'admin/AdminHealthPage.jsx': { route: 'admin/health', icon: 'health_and_safety', desc: 'Hệ thống' },
  'admin/AdminPublisherLeadsPage.jsx': { route: 'admin/publisher-leads', icon: 'contact_page', desc: 'Leads NXB' },
  'admin/AdminPublishersPage.jsx': { route: 'admin/publishers', icon: 'local_library', desc: 'NXB' },
  'admin/AdminBookModerationPage.jsx': { route: 'admin/book-moderation', icon: 'gavel', desc: 'Kiểm duyệt' },
  'admin/AdminUsersPage.jsx': { route: 'admin/users', icon: 'people', desc: 'Người dùng' },
  'admin/AdminAccountsPage.jsx': { route: 'admin/accounts', icon: 'account_circle', desc: 'Tài khoản' },
  'admin/AdminDrmVaultPage.jsx': { route: 'admin/drm-vault', icon: 'vpn_key', desc: 'DRM Vault' },
  'admin/AdminFinancePage.jsx': { route: 'admin/finance', icon: 'attach_money', desc: 'Tài chính' },
  'admin/AdminReportsPage.jsx': { route: 'admin/reports', icon: 'assessment', desc: 'Báo cáo' },
  'admin/AdminMarketingPage.jsx': { route: 'admin/marketing', icon: 'campaign', desc: 'Marketing' },
  'admin/AdminCalendarPage.jsx': { route: 'admin/calendar', icon: 'calendar_month', desc: 'Lịch' },
  'admin/AdminIntegrationsPage.jsx': { route: 'admin/integrations', icon: 'integration_instructions', desc: 'Tích hợp' },
  'admin/AdminSettingsPage.jsx': { route: 'admin/settings', icon: 'settings', desc: 'Cài đặt' },
  'admin/AdminSupportPage.jsx': { route: 'admin/support', icon: 'support_agent', desc: 'Hỗ trợ' },

  // ============ SYSTEM PAGES ============
  'system/NotFoundPage.jsx': { route: '404', icon: 'error', desc: 'Không tìm thấy' },
  'system/ForbiddenPage.jsx': { route: '403', icon: 'block', desc: 'Bị cấm' },
  'system/ServerErrorPage.jsx': { route: '500', icon: 'warning', desc: 'Lỗi server' },
};

/**
 * Generate page.tsx content for a route
 */
function generatePageTsx(sourcePath, config) {
  const { route, icon, desc } = config;
  const hasParams = !!config.param;

  // Convert source path to import path
  const importPath = `@/ui/pages/${sourcePath}`;
  const pageName = path.basename(sourcePath, path.extname(sourcePath));

  return `"use client";

import dynamic from "next/dynamic";

/**
 * Next.js App Router page
 * Auto-migrated from: ${sourcePath}
 * Route: /${route}
 */

const ${pageName} = dynamic(() => import("${importPath}"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#f2fbf9] flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-[#003B2B] animate-pulse">
          ${icon}
        </span>
        <p className="mt-4 text-[#49454f] font-medium">Đang tải ${desc}...</p>
      </div>
    </div>
  ),
});

${hasParams ? `export default function Page({ params }: { params: { [key: string]: string } }) {
  return <${pageName} />;
}` : `export default function Page() {
  return <${pageName} />;
}`}
`;
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Auto-migrating ALL React SPA pages to Next.js App Router...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const [sourceFile, config] of Object.entries(ROUTE_MAP)) {
    const fullSourcePath = path.join(PAGES_DIR, sourceFile);

    // Check if source file exists
    if (!fs.existsSync(fullSourcePath)) {
      console.log(`⚠️  Source not found: ${sourceFile}`);
      skipped++;
      continue;
    }

    // Skip 404, 403, 500 - they're handled by Next.js not-found.tsx
    if (config.route === '404' || config.route === '403' || config.route === '500') {
      console.log(`⏭️  Skipping system page: ${sourceFile} (handled by not-found.tsx)`);
      skipped++;
      continue;
    }

    // Build destination path
    const destPath = path.join(APP_DIR, config.route, 'page.tsx');
    const destDir = path.dirname(destPath);

    try {
      // Create directory if not exists
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Generate and write page.tsx
      const content = generatePageTsx(sourceFile, config);
      fs.writeFileSync(destPath, content, 'utf-8');
      console.log(`✅ ${sourceFile} → /${config.route}/page.tsx`);
      created++;
    } catch (err) {
      console.error(`❌ Error migrating ${sourceFile}:`, err.message);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created} page.tsx files`);
  console.log(`   ⏭️  Skipped: ${skipped} files`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`\n🎉 Migration complete!`);
  console.log(`\nNext steps:`);
  console.log(`   1. Run: cd web && npm run dev`);
  console.log(`   2. Test all routes`);
  console.log(`   3. Fix any parameter issues (useParams → props.params)`);
}

main();
