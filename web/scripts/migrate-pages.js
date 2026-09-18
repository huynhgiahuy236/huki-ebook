// Migration Script - Run with: node scripts/migrate-pages.js
// This script migrates React Router pages to Next.js App Router

const fs = require('fs');
const path = require('path');

const UI_DIR = 'src/ui';
const APP_DIR = 'src/app';

const files = [
  // Store Pages
  { src: 'pages/store/HomePage.jsx', dest: 'app/page.tsx' },
  { src: 'pages/store/CatalogPage.jsx', dest: 'app/books/page.tsx' },
  { src: 'pages/store/BookDetailPage.jsx', dest: 'app/book/[id]/page.tsx' },
  { src: 'pages/store/BookPreviewPage.jsx', dest: 'app/book/[id]/preview/page.tsx' },
  { src: 'pages/store/ShopPage.jsx', dest: 'app/shop/[id]/page.tsx' },
  { src: 'pages/store/StoresPage.jsx', dest: 'app/stores/page.tsx' },
  { src: 'pages/store/AuthorPage.jsx', dest: 'app/author/[id]/page.tsx' },
  { src: 'pages/store/AudiobooksPage.jsx', dest: 'app/audiobooks/page.tsx' },
  { src: 'pages/store/CartPage.jsx', dest: 'app/cart/page.tsx' },
  { src: 'pages/store/CheckoutPage.jsx', dest: 'app/checkout/page.tsx' },
  { src: 'pages/store/OrderSuccessPage.jsx', dest: 'app/order/success/page.tsx' },
  { src: 'pages/store/OrdersPage.jsx', dest: 'app/orders/page.tsx' },
  { src: 'pages/store/OrderDetailPage.jsx', dest: 'app/orders/[id]/page.tsx' },
  { src: 'pages/store/OrderInvoicePage.jsx', dest: 'app/orders/[id]/invoice/page.tsx' },
  { src: 'pages/store/OrderReviewPage.jsx', dest: 'app/orders/[id]/review/page.tsx' },
  { src: 'pages/store/OrderReturnPage.jsx', dest: 'app/orders/[id]/return/page.tsx' },
  { src: 'pages/store/OrderTrackingPage.jsx', dest: 'app/orders/[id]/tracking/page.tsx' },
  { src: 'pages/store/ProfilePage.jsx', dest: 'app/profile/page.tsx' },
  { src: 'pages/store/UserAddressesPage.jsx', dest: 'app/profile/addresses/page.tsx' },
  { src: 'pages/store/UserSecurityPage.jsx', dest: 'app/profile/security/page.tsx' },
  { src: 'pages/store/WalletPage.jsx', dest: 'app/profile/wallet/page.tsx' },
  { src: 'pages/store/LibraryPage.jsx', dest: 'app/library/page.tsx' },
  { src: 'pages/store/ReaderPage.jsx', dest: 'app/library/[id]/page.tsx' },
  { src: 'pages/store/DeviceManagementPage.jsx', dest: 'app/library/devices/page.tsx' },
  { src: 'pages/store/CommunityPage.jsx', dest: 'app/community/page.tsx' },
  { src: 'pages/store/BookReviewsFeedPage.jsx', dest: 'app/community/reviews/page.tsx' },
  { src: 'pages/store/BookQuotesPage.jsx', dest: 'app/community/quotes/page.tsx' },
  { src: 'pages/store/BookClubsDirectoryPage.jsx', dest: 'app/community/clubs/page.tsx' },
  { src: 'pages/store/BookClubDetailPage.jsx', dest: 'app/community/clubs/[id]/page.tsx' },
  { src: 'pages/store/CommunityPostDetailPage.jsx', dest: 'app/community/posts/[id]/page.tsx' },
  { src: 'pages/store/ReadingChallengePage.jsx', dest: 'app/community/challenge/page.tsx' },
  { src: 'pages/store/MessengerPage.jsx', dest: 'app/messages/page.tsx' },
  { src: 'pages/store/FlashSalePage.jsx', dest: 'app/flash-sale/page.tsx' },
  // Seller Pages
  { src: 'pages/seller/SellerPortalPage.jsx', dest: 'app/seller/page.tsx' },
  { src: 'pages/seller/SellerRegisterPage.jsx', dest: 'app/seller/register/page.tsx' },
  { src: 'pages/seller/SellerDashboardPage.jsx', dest: 'app/seller/dashboard/page.tsx' },
  { src: 'pages/seller/SellerBusinessProfilePage.jsx', dest: 'app/seller/business/page.tsx' },
  { src: 'pages/seller/SellerBusinessNotificationsPage.jsx', dest: 'app/seller/business/notifications/page.tsx' },
  { src: 'pages/seller/SellerOrdersPage.jsx', dest: 'app/seller/orders/page.tsx' },
  { src: 'pages/seller/SellerOrderDetailPage.jsx', dest: 'app/seller/orders/[id]/page.tsx' },
  { src: 'pages/seller/SellerStoresPage.jsx', dest: 'app/seller/stores/page.tsx' },
  { src: 'pages/seller/SellerProductsPage.jsx', dest: 'app/seller/products/page.tsx' },
  { src: 'pages/seller/SellerCreateHybrid.jsx', dest: 'app/seller/products/create/page.tsx' },
  { src: 'pages/seller/SellerCreateEbook.jsx', dest: 'app/seller/products/create/ebook/page.tsx' },
  { src: 'pages/seller/SellerCreatePhysical.jsx', dest: 'app/seller/products/create/physical/page.tsx' },
  { src: 'pages/seller/SellerEditHybrid.jsx', dest: 'app/seller/products/[id]/edit/page.tsx' },
  { src: 'pages/seller/SellerCorrection.jsx', dest: 'app/seller/products/[id]/correct/page.tsx' },
  { src: 'pages/seller/SellerFinancePage.jsx', dest: 'app/seller/finance/page.tsx' },
  { src: 'pages/seller/SellerVouchersPage.tsx', dest: 'app/seller/vouchers/page.tsx' },
  { src: 'pages/seller/SellerStaffPage.jsx', dest: 'app/seller/staff/page.tsx' },
  { src: 'pages/seller/SellerInventoryPage.jsx', dest: 'app/seller/inventory/page.tsx' },
  { src: 'pages/seller/SellerChatPage.jsx', dest: 'app/seller/chat/page.tsx' },
  { src: 'pages/seller/EdgeCasesLibrary.jsx', dest: 'app/seller/edge-cases/page.tsx' },
  // Admin Pages
  { src: 'pages/admin/AdminDashboardPage.jsx', dest: 'app/admin/page.tsx' },
  { src: 'pages/admin/AdminBusinessesPage.jsx', dest: 'app/admin/businesses/page.tsx' },
  { src: 'pages/admin/AdminBusinessUpdateRequestsPage.jsx', dest: 'app/admin/business-requests/page.tsx' },
  { src: 'pages/admin/AdminStoresPage.jsx', dest: 'app/admin/stores/page.tsx' },
  { src: 'pages/admin/AdminBooksPage.jsx', dest: 'app/admin/books/page.tsx' },
  { src: 'pages/admin/AdminCategoriesPage.jsx', dest: 'app/admin/categories/page.tsx' },
  { src: 'pages/admin/AdminHealthPage.jsx', dest: 'app/admin/health/page.tsx' },
  { src: 'pages/admin/AdminPublisherLeadsPage.jsx', dest: 'app/admin/publisher-leads/page.tsx' },
  { src: 'pages/admin/AdminPublishersPage.jsx', dest: 'app/admin/publishers/page.tsx' },
  { src: 'pages/admin/AdminBookModerationPage.jsx', dest: 'app/admin/book-moderation/page.tsx' },
  { src: 'pages/admin/AdminUsersPage.jsx', dest: 'app/admin/users/page.tsx' },
  { src: 'pages/admin/AdminAccountsPage.jsx', dest: 'app/admin/accounts/page.tsx' },
  { src: 'pages/admin/AdminDrmVaultPage.jsx', dest: 'app/admin/drm-vault/page.tsx' },
  { src: 'pages/admin/AdminFinancePage.jsx', dest: 'app/admin/finance/page.tsx' },
  { src: 'pages/admin/AdminReportsPage.jsx', dest: 'app/admin/reports/page.tsx' },
  { src: 'pages/admin/AdminMarketingPage.jsx', dest: 'app/admin/marketing/page.tsx' },
  { src: 'pages/admin/AdminCalendarPage.jsx', dest: 'app/admin/calendar/page.tsx' },
  { src: 'pages/admin/AdminIntegrationsPage.jsx', dest: 'app/admin/integrations/page.tsx' },
  { src: 'pages/admin/AdminSettingsPage.jsx', dest: 'app/admin/settings/page.tsx' },
  { src: 'pages/admin/AdminSupportPage.jsx', dest: 'app/admin/support/page.tsx' },
];

function migrateContent(content) {
  // 1. Add "use client" directive if needed
  if (!content.startsWith('"use client"') && !content.startsWith("'use client'")) {
    if (content.match(/useState|useEffect|useRouter|useCallback|useContext|useRef/)) {
      content = '"use client";\n\n' + content;
    }
  }

  // 2. Remove react-router-dom imports
  content = content.replace(/import\s*\{[^}]*\}\s*from\s*['"]react-router-dom['"];?\n?/g, '');

  // 3. Add Next.js imports if needed
  if (content.includes('useRouter') && !content.includes('from "next/navigation"')) {
    content = content.replace(
      /import\s+React/,
      'import { useRouter } from "next/navigation";\nimport React'
    );
  }

  if (content.includes('<Link ') && !content.includes('from "next/link"')) {
    content = content.replace(
      /import\s+React/,
      'import Link from "next/link";\nimport React'
    );
  }

  // 4. Replace useNavigate with useRouter
  content = content.replace(
    /const\s+(\w+)\s*=\s*useNavigate\(\)/g,
    'const $1 = useRouter()'
  );

  // 5. Replace navigate(...) with router.push(...)
  content = content.replace(/navigate\(/g, 'router.push(');

  // 6. Replace Link to= with Link href=
  content = content.replace(/<Link\s+to=/g, '<Link href=');

  // 7. Fix relative imports to absolute
  content = content.replace(/from\s+['"]\.\.\/components\//g, 'from "@/ui/components/');
  content = content.replace(/from\s+['"]\.\.\/\.\.\/components\//g, 'from "@/ui/components/');
  content = content.replace(/from\s+['"]\.\.\/context\//g, 'from "@/ui/context/');
  content = content.replace(/from\s+['"]\.\.\/api\//g, 'from "@/ui/api/');
  content = content.replace(/from\s+['"]\.\.\/utils\//g, 'from "@/ui/utils/');
  content = content.replace(/from\s+['"]\.\.\/data\//g, 'from "@/ui/data/');
  content = content.replace(/from\s+['"]\.\.\/services\//g, 'from "@/ui/services/');

  // 8. Fix useLocation to usePathname
  content = content.replace(/useLocation\(\)/g, 'usePathname()');

  // 9. Add usePathname import if needed
  if (content.includes('usePathname') && !content.includes('from "next/navigation"')) {
    content = content.replace(
      /useRouter\s*}/,
      'useRouter, usePathname}'
    );
  }

  // 10. Fix useParams
  if (content.includes('useParams')) {
    content = content.replace(
      /const\s+\{([^}]+)\}\s*=\s*useParams\(\)/g,
      '// params from Next.js layout\nconst { $1 } = params as any'
    );
  }

  return content;
}

function migrateFile(srcPath, destPath) {
  try {
    if (!fs.existsSync(srcPath)) {
      console.log(`⚠️  Source not found: ${srcPath}`);
      return false;
    }

    let content = fs.readFileSync(srcPath, 'utf8');
    content = migrateContent(content);

    // Create destination directory
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.writeFileSync(destPath, content, 'utf8');
    console.log(`✅ ${srcPath} → ${destPath}`);
    return true;
  } catch (err) {
    console.log(`❌ ${srcPath}: ${err.message}`);
    return false;
  }
}

// Run migration
console.log('🚀 React → Next.js Migration');
console.log('='.repeat(50));

let success = 0;
let failed = 0;

for (const file of files) {
  const srcPath = path.join(UI_DIR, file.src);
  const destPath = path.join(APP_DIR, file.dest);

  if (migrateFile(srcPath, destPath)) {
    success++;
  } else {
    failed++;
  }
}

console.log('');
console.log('='.repeat(50));
console.log(`📊 Done: ${success} success, ${failed} failed`);
