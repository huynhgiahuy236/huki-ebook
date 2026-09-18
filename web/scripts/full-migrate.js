/**
 * Next.js Migration Script - Full Migration
 *
 * Migrates ALL React files to Next.js
 * Changes: useNavigate->useRouter, Link, imports
 */

const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, '..', 'src', 'ui');
const APP_DIR = path.join(__dirname, '..', 'src', 'app');

// All page files with their destinations
const ALL_FILES = {
  // Auth
  'pages/auth/LoginPage.jsx': 'app/auth/login/page.tsx',
  'pages/auth/RegisterPage.jsx': 'app/auth/register/page.tsx',
  'pages/auth/ForgotPasswordPage.jsx': 'app/auth/forgot-password/page.tsx',
  'pages/auth/VerifyOtpPage.jsx': 'app/auth/verify/page.tsx',
  'pages/auth/ResetPasswordPage.jsx': 'app/auth/reset-password/page.tsx',
  'pages/auth/ChangePasswordPage.jsx': 'app/auth/change-password/page.tsx',
  'pages/auth/AccountStatusPage.jsx': 'app/auth/status/page.tsx',
  'pages/auth/OnboardingPreferencesPage.jsx': 'app/auth/onboarding/page.tsx',

  // Store
  'pages/store/HomePage.jsx': 'app/page.tsx',
  'pages/store/CatalogPage.jsx': 'app/books/page.tsx',
  'pages/store/BookDetailPage.jsx': 'app/book/[id]/page.tsx',
  'pages/store/BookPreviewPage.jsx': 'app/book/[id]/preview/page.tsx',
  'pages/store/ShopPage.jsx': 'app/shop/[id]/page.tsx',
  'pages/store/StoresPage.jsx': 'app/stores/page.tsx',
  'pages/store/AuthorPage.jsx': 'app/author/[id]/page.tsx',
  'pages/store/AudiobooksPage.jsx': 'app/audiobooks/page.tsx',
  'pages/store/CartPage.jsx': 'app/cart/page.tsx',
  'pages/store/CheckoutPage.jsx': 'app/checkout/page.tsx',
  'pages/store/OrderSuccessPage.jsx': 'app/order/success/page.tsx',
  'pages/store/OrdersPage.jsx': 'app/orders/page.tsx',
  'pages/store/OrderDetailPage.jsx': 'app/orders/[id]/page.tsx',
  'pages/store/OrderInvoicePage.jsx': 'app/orders/[id]/invoice/page.tsx',
  'pages/store/OrderReviewPage.jsx': 'app/orders/[id]/review/page.tsx',
  'pages/store/OrderReturnPage.jsx': 'app/orders/[id]/return/page.tsx',
  'pages/store/OrderTrackingPage.jsx': 'app/orders/[id]/tracking/page.tsx',
  'pages/store/ProfilePage.jsx': 'app/profile/page.tsx',
  'pages/store/UserAddressesPage.jsx': 'app/profile/addresses/page.tsx',
  'pages/store/UserSecurityPage.jsx': 'app/profile/security/page.tsx',
  'pages/store/WalletPage.jsx': 'app/profile/wallet/page.tsx',
  'pages/store/LibraryPage.jsx': 'app/library/page.tsx',
  'pages/store/ReaderPage.jsx': 'app/library/[id]/page.tsx',
  'pages/store/DeviceManagementPage.jsx': 'app/library/devices/page.tsx',
  'pages/store/CommunityPage.jsx': 'app/community/page.tsx',
  'pages/store/BookReviewsFeedPage.jsx': 'app/community/reviews/page.tsx',
  'pages/store/BookQuotesPage.jsx': 'app/community/quotes/page.tsx',
  'pages/store/BookClubsDirectoryPage.jsx': 'app/community/clubs/page.tsx',
  'pages/store/BookClubDetailPage.jsx': 'app/community/clubs/[id]/page.tsx',
  'pages/store/CommunityPostDetailPage.jsx': 'app/community/posts/[id]/page.tsx',
  'pages/store/ReadingChallengePage.jsx': 'app/community/challenge/page.tsx',
  'pages/store/MessengerPage.jsx': 'app/messages/page.tsx',
  'pages/store/FlashSalePage.jsx': 'app/flash-sale/page.tsx',

  // Seller
  'pages/seller/SellerPortalPage.jsx': 'app/seller/page.tsx',
  'pages/seller/SellerRegisterPage.jsx': 'app/seller/register/page.tsx',
  'pages/seller/SellerDashboardPage.jsx': 'app/seller/dashboard/page.tsx',
  'pages/seller/SellerBusinessProfilePage.jsx': 'app/seller/business/page.tsx',
  'pages/seller/SellerBusinessNotificationsPage.jsx': 'app/seller/business/notifications/page.tsx',
  'pages/seller/SellerOrdersPage.jsx': 'app/seller/orders/page.tsx',
  'pages/seller/SellerOrderDetailPage.jsx': 'app/seller/orders/[id]/page.tsx',
  'pages/seller/SellerStoresPage.jsx': 'app/seller/stores/page.tsx',
  'pages/seller/SellerProductsPage.jsx': 'app/seller/products/page.tsx',
  'pages/seller/SellerCreateHybrid.jsx': 'app/seller/products/create/page.tsx',
  'pages/seller/SellerCreateEbook.jsx': 'app/seller/products/create/ebook/page.tsx',
  'pages/seller/SellerCreatePhysical.jsx': 'app/seller/products/create/physical/page.tsx',
  'pages/seller/SellerEditHybrid.jsx': 'app/seller/products/[id]/edit/page.tsx',
  'pages/seller/SellerCorrection.jsx': 'app/seller/products/[id]/correct/page.tsx',
  'pages/seller/SellerFinancePage.jsx': 'app/seller/finance/page.tsx',
  'pages/seller/SellerVouchersPage.tsx': 'app/seller/vouchers/page.tsx',
  'pages/seller/SellerStaffPage.jsx': 'app/seller/staff/page.tsx',
  'pages/seller/SellerInventoryPage.jsx': 'app/seller/inventory/page.tsx',
  'pages/seller/SellerChatPage.jsx': 'app/seller/chat/page.tsx',
  'pages/seller/EdgeCasesLibrary.jsx': 'app/seller/edge-cases/page.tsx',

  // Admin
  'pages/admin/AdminDashboardPage.jsx': 'app/admin/page.tsx',
  'pages/admin/AdminBusinessesPage.jsx': 'app/admin/businesses/page.tsx',
  'pages/admin/AdminBusinessUpdateRequestsPage.jsx': 'app/admin/business-requests/page.tsx',
  'pages/admin/AdminStoresPage.jsx': 'app/admin/stores/page.tsx',
  'pages/admin/AdminBooksPage.jsx': 'app/admin/books/page.tsx',
  'pages/admin/AdminCategoriesPage.jsx': 'app/admin/categories/page.tsx',
  'pages/admin/AdminHealthPage.jsx': 'app/admin/health/page.tsx',
  'pages/admin/AdminPublisherLeadsPage.jsx': 'app/admin/publisher-leads/page.tsx',
  'pages/admin/AdminPublishersPage.jsx': 'app/admin/publishers/page.tsx',
  'pages/admin/AdminBookModerationPage.jsx': 'app/admin/book-moderation/page.tsx',
  'pages/admin/AdminUsersPage.jsx': 'app/admin/users/page.tsx',
  'pages/admin/AdminAccountsPage.jsx': 'app/admin/accounts/page.tsx',
  'pages/admin/AdminDrmVaultPage.jsx': 'app/admin/drm-vault/page.tsx',
  'pages/admin/AdminFinancePage.jsx': 'app/admin/finance/page.tsx',
  'pages/admin/AdminReportsPage.jsx': 'app/admin/reports/page.tsx',
  'pages/admin/AdminMarketingPage.jsx': 'app/admin/marketing/page.tsx',
  'pages/admin/AdminCalendarPage.jsx': 'app/admin/calendar/page.tsx',
  'pages/admin/AdminIntegrationsPage.jsx': 'app/admin/integrations/page.tsx',
  'pages/admin/AdminSettingsPage.jsx': 'app/admin/settings/page.tsx',
  'pages/admin/AdminSupportPage.jsx': 'app/admin/support/page.tsx',
};

function migrate(code) {
  // 1. Add "use client"
  if (!code.trim().startsWith('"use client"') && !code.trim().startsWith("'use client'")) {
    if (code.includes('useState') || code.includes('useEffect') || code.includes('useRouter') ||
        code.includes('useCallback') || code.includes('useContext') || code.includes('useRef')) {
      code = '"use client";\n\n' + code;
    }
  }

  // 2. Remove react-router-dom imports
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*['"]react-router-dom['"]/g, '');

  // 3. Add Next.js router import if needed
  if (code.includes('useRouter') && !code.includes('from "next/navigation"')) {
    code = code.replace(/import\s+React/, 'import { useRouter } from "next/navigation";\nimport React');
  }

  // 4. Replace useNavigate with useRouter
  code = code.replace(/const\s+(\w+)\s*=\s*useNavigate\(\)/g, 'const $1 = useRouter()');

  // 5. Replace navigate(...) with router.push(...)
  code = code.replace(/navigate\(/g, 'router.push(');

  // 6. Replace Link from react-router-dom with Next.js Link
  // Add import if Link is used
  if ((code.includes('<Link ') || code.includes('<Link>')) && !code.includes('from "next/link"')) {
    code = code.replace(/import\s+React/, 'import Link from "next/link";\nimport React');
  }

  // 7. Replace Link to= with Link href=
  code = code.replace(/<Link\s+to=/g, '<Link href=');

  // 8. Fix imports from ../../ to @/ui/
  code = code.replace(/from\s+['"]\.\.\/components\//g, 'from "@/ui/components/');
  code = code.replace(/from\s+['"]\.\.\/\.\.\/components\//g, 'from "@/ui/components/');
  code = code.replace(/from\s+['"]\.\.\/context\//g, 'from "@/ui/context/');
  code = code.replace(/from\s+['"]\.\.\/api\//g, 'from "@/ui/api/');
  code = code.replace(/from\s+['"]\.\.\/utils\//g, 'from "@/ui/utils/');
  code = code.replace(/from\s+['"]\.\.\/data\//g, 'from "@/ui/data/');
  code = code.replace(/from\s+['"]\.\.\/services\//g, 'from "@/ui/services/');

  // 9. Handle useParams (replace with comment for now)
  if (code.includes('useParams')) {
    code = code.replace(
      /const\s+\{([^}]+)\}\s*=\s*useParams\(\)/g,
      (match, params) => {
        const paramList = params.split(',').map(p => p.trim());
        return `// params from Next.js layout\nconst {${params}} = params as any;`;
      }
    );
    // Remove useParams import
    code = code.replace(/,\s*useParams\s*}/g, '}');
    code = code.replace(/useParams,\s*/g, '');
  }

  // 10. Handle useLocation -> usePathname
  code = code.replace(/useLocation\(\)/g, 'usePathname()');
  if (code.includes('usePathname') && !code.includes('from "next/navigation"')) {
    code = code.replace(/import\s+\{[^}]*useRouter[^}]*\}/, (m) => m.replace('}', 'usePathname}'));
  }

  return code;
}

// Run migration
console.log('🚀 Starting Full Migration...\n');
let success = 0;
let failed = 0;

for (const [src, dest] of Object.entries(ALL_FILES)) {
  const srcPath = path.join(UI_DIR, src);
  const destPath = path.join(APP_DIR, dest);

  if (!fs.existsSync(srcPath)) {
    console.log(`⚠️  Source not found: ${src}`);
    failed++;
    continue;
  }

  try {
    let code = fs.readFileSync(srcPath, 'utf-8');
    code = migrate(code);

    // Create directory
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(destPath, code, 'utf-8');
    console.log(`✅ ${src} → ${dest}`);
    success++;
  } catch (err) {
    console.log(`❌ ${src}: ${err.message}`);
    failed++;
  }
}

console.log(`\n📊 Done: ${success} success, ${failed} failed`);
