/**
 * React to Next.js Migration Script
 *
 * Tự động migrate TẤT CẢ files từ React (src/ui/) sang Next.js (src/app/)
 *
 * Changes:
 * 1. useNavigate → useRouter + router.push()
 * 2. Link from react-router-dom → Next.js Link
 * 3. useParams → props.params
 * 4. Import paths updates
 * 5. Remove "use client" directive (Next.js handles this)
 *
 * Run: node scripts/migrate-all-files.js
 */

const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, '..', 'src', 'ui');
const APP_DIR = path.join(__dirname, '..', 'src', 'app');

// ============ FILE MAPPINGS ============
const STORE_FILES = {
  'HomePage.jsx': 'page.tsx',
  'CatalogPage.jsx': 'books/page.tsx',
  'BookDetailPage.jsx': 'book/[id]/page.tsx',
  'BookPreviewPage.jsx': 'book/[id]/preview/page.tsx',
  'ShopPage.jsx': 'shop/[id]/page.tsx',
  'StoresPage.jsx': 'stores/page.tsx',
  'AuthorPage.jsx': 'author/[id]/page.tsx',
  'AudiobooksPage.jsx': 'audiobooks/page.tsx',
  'CartPage.jsx': 'cart/page.tsx',
  'CheckoutPage.jsx': 'checkout/page.tsx',
  'OrderSuccessPage.jsx': 'order/success/page.tsx',
  'OrdersPage.jsx': 'orders/page.tsx',
  'OrderDetailPage.jsx': 'orders/[id]/page.tsx',
  'OrderInvoicePage.jsx': 'orders/[id]/invoice/page.tsx',
  'OrderReviewPage.jsx': 'orders/[id]/review/page.tsx',
  'OrderReturnPage.jsx': 'orders/[id]/return/page.tsx',
  'OrderTrackingPage.jsx': 'orders/[id]/tracking/page.tsx',
  'ProfilePage.jsx': 'profile/page.tsx',
  'UserAddressesPage.jsx': 'profile/addresses/page.tsx',
  'UserSecurityPage.jsx': 'profile/security/page.tsx',
  'WalletPage.jsx': 'profile/wallet/page.tsx',
  'LibraryPage.jsx': 'library/page.tsx',
  'ReaderPage.jsx': 'library/[id]/page.tsx',
  'DeviceManagementPage.jsx': 'library/devices/page.tsx',
  'CommunityPage.jsx': 'community/page.tsx',
  'BookReviewsFeedPage.jsx': 'community/reviews/page.tsx',
  'BookQuotesPage.jsx': 'community/quotes/page.tsx',
  'BookClubsDirectoryPage.jsx': 'community/clubs/page.tsx',
  'BookClubDetailPage.jsx': 'community/clubs/[id]/page.tsx',
  'CommunityPostDetailPage.jsx': 'community/posts/[id]/page.tsx',
  'ReadingChallengePage.jsx': 'community/challenge/page.tsx',
  'MessengerPage.jsx': 'messages/page.tsx',
  'FlashSalePage.jsx': 'flash-sale/page.tsx',
};

const AUTH_FILES = {
  'LoginPage.jsx': 'auth/login/page.tsx',
  'RegisterPage.jsx': 'auth/register/page.tsx',
  'ForgotPasswordPage.jsx': 'auth/forgot-password/page.tsx',
  'VerifyOtpPage.jsx': 'auth/verify/page.tsx',
  'ResetPasswordPage.jsx': 'auth/reset-password/page.tsx',
  'ChangePasswordPage.jsx': 'auth/change-password/page.tsx',
  'AccountStatusPage.jsx': 'auth/status/page.tsx',
  'OnboardingPreferencesPage.jsx': 'auth/onboarding/page.tsx',
};

const SELLER_FILES = {
  'SellerPortalPage.jsx': 'seller/page.tsx',
  'SellerRegisterPage.jsx': 'seller/register/page.tsx',
  'SellerDashboardPage.jsx': 'seller/dashboard/page.tsx',
  'SellerBusinessProfilePage.jsx': 'seller/business/page.tsx',
  'SellerBusinessNotificationsPage.jsx': 'seller/business/notifications/page.tsx',
  'SellerOrdersPage.jsx': 'seller/orders/page.tsx',
  'SellerOrderDetailPage.jsx': 'seller/orders/[id]/page.tsx',
  'SellerStoresPage.jsx': 'seller/stores/page.tsx',
  'SellerProductsPage.jsx': 'seller/products/page.tsx',
  'SellerCreateHybrid.jsx': 'seller/products/create/page.tsx',
  'SellerCreateEbook.jsx': 'seller/products/create/ebook/page.tsx',
  'SellerCreatePhysical.jsx': 'seller/products/create/physical/page.tsx',
  'SellerEditHybrid.jsx': 'seller/products/[id]/edit/page.tsx',
  'SellerCorrection.jsx': 'seller/products/[id]/correct/page.tsx',
  'SellerFinancePage.jsx': 'seller/finance/page.tsx',
  'SellerVouchersPage.tsx': 'seller/vouchers/page.tsx',
  'SellerStaffPage.jsx': 'seller/staff/page.tsx',
  'SellerInventoryPage.jsx': 'seller/inventory/page.tsx',
  'SellerChatPage.jsx': 'seller/chat/page.tsx',
  'EdgeCasesLibrary.jsx': 'seller/edge-cases/page.tsx',
};

const ADMIN_FILES = {
  'AdminDashboardPage.jsx': 'admin/page.tsx',
  'AdminBusinessesPage.jsx': 'admin/businesses/page.tsx',
  'AdminBusinessUpdateRequestsPage.jsx': 'admin/business-requests/page.tsx',
  'AdminStoresPage.jsx': 'admin/stores/page.tsx',
  'AdminBooksPage.jsx': 'admin/books/page.tsx',
  'AdminCategoriesPage.jsx': 'admin/categories/page.tsx',
  'AdminHealthPage.jsx': 'admin/health/page.tsx',
  'AdminPublisherLeadsPage.jsx': 'admin/publisher-leads/page.tsx',
  'AdminPublishersPage.jsx': 'admin/publishers/page.tsx',
  'AdminBookModerationPage.jsx': 'admin/book-moderation/page.tsx',
  'AdminUsersPage.jsx': 'admin/users/page.tsx',
  'AdminAccountsPage.jsx': 'admin/accounts/page.tsx',
  'AdminDrmVaultPage.jsx': 'admin/drm-vault/page.tsx',
  'AdminFinancePage.jsx': 'admin/finance/page.tsx',
  'AdminReportsPage.jsx': 'admin/reports/page.tsx',
  'AdminMarketingPage.jsx': 'admin/marketing/page.tsx',
  'AdminCalendarPage.jsx': 'admin/calendar/page.tsx',
  'AdminIntegrationsPage.jsx': 'admin/integrations/page.tsx',
  'AdminSettingsPage.jsx': 'admin/settings/page.tsx',
  'AdminSupportPage.jsx': 'admin/support/page.tsx',
};

// ============ MIGRATION FUNCTIONS ============

/**
 * Remove React Router imports and add Next.js imports
 */
function fixImports(code) {
  let result = code;

  // Remove react-router-dom imports
  result = result.replace(/import\s*\{[^}]*\}\s*from\s*['"]react-router-dom['"]/g, '');

  // Add Next.js imports
  if (result.includes('useRouter') || result.includes('usePathname') || result.includes('useSearchParams')) {
    const nextImports = [];
    if (result.includes('useRouter')) nextImports.push('useRouter');
    if (result.includes('usePathname')) nextImports.push('usePathname');
    if (result.includes('useSearchParams')) nextImports.push('useSearchParams');
    result = result.replace(
      /import\s+React/,
      `import { ${nextImports.join(', ')} } from "next/navigation";\nimport React`
    );
  }

  // Fix Link import - remove if no longer needed, or keep for Next.js
  // Replace: import { Link } from "react-router-dom" -> import Link from "next/link"
  if (result.includes('from "next/link"') || result.includes("from 'next/link'")) {
    // Already has Next.js Link
  } else if (result.includes('<Link ') || result.includes('<Link>')) {
    // Add Link import
    result = result.replace(
      /import\s+React/,
      'import Link from "next/link";\nimport React'
    );
  }

  // Fix relative imports
  result = result.replace(/from\s+['"]\.\.\/\.\.\/components\//g, 'from "@/ui/components/');
  result = result.replace(/from\s+['"]\.\.\/components\//g, 'from "@/ui/components/');
  result = result.replace(/from\s+['"]\.\.\/context\//g, 'from "@/ui/context/');
  result = result.replace(/from\s+['"]\.\.\/api\//g, 'from "@/ui/api/');
  result = result.replace(/from\s+['"]\.\.\/utils\//g, 'from "@/ui/utils/');
  result = result.replace(/from\s+['"]\.\.\/data\//g, 'from "@/ui/data/');
  result = result.replace(/from\s+['"]\.\.\/services\//g, 'from "@/ui/services/');

  // Fix component imports
  result = result.replace(/from\s+['"]\.\.\/\.\.\/components\//g, 'from "@/ui/components/');
  result = result.replace(/from\s+['"]\.\.\/components\//g, 'from "@/ui/components/');

  return result;
}

/**
 * Replace useNavigate with useRouter
 */
function fixNavigation(code) {
  let result = code;

  // Replace: const navigate = useNavigate() -> const router = useRouter()
  result = result.replace(
    /const\s+(\w+)\s*=\s*useNavigate\(\)/g,
    'const $1 = useRouter()'
  );

  // Replace: navigate(...) -> router.push(...)
  // But not in onClick handlers
  result = result.replace(
    /(\w+)\((["'`][^"'`]*["'`])(?!\s*[,\)])/g,
    (match, fn, arg) => {
      // Skip if it's a Link component or onClick
      if (['Link', 'NavLink'].includes(fn)) return match;
      // It's a navigation function
      return `${fn}.push(${arg}`;
    }
  );

  // Handle navigate("/path") -> router.push("/path")
  result = result.replace(
    /navigate\((["'`][^"'`]*["'`])/g,
    'router.push($1'
  );

  // Handle navigate(path) -> router.push(path)
  result = result.replace(
    /navigate\(\s*path/g,
    'router.push(path'
  );

  return result;
}

/**
 * Replace Link component props
 */
function fixLinkProps(code) {
  let result = code;

  // Replace: <Link to="/path" -> <Link href="/path"
  result = result.replace(/<Link\s+to=/g, '<Link href=');

  // Replace: <Link to={"..."} -> <Link href={...}
  result = result.replace(/<Link\s+to=\{([^}]+)\}/g, '<Link href={$1}');

  // Replace: navigate(to="/path") -> router.push("/path")
  result = result.replace(/navigate\(to=/g, 'router.push(');
  result = result.replace(/navigate\(to=\{([^}]+)\}\)/g, 'router.push($1)');

  return result;
}

/**
 * Replace useParams
 */
function fixUseParams(code, hasParams) {
  if (!code.includes('useParams')) return code;

  let result = code;

  // If the page has params, we need to pass them from the parent
  // For now, just add a comment
  result = result.replace(
    /import\s*\{[^}]*useParams[^}]*\}\s*from\s*['"]react-router-dom['"]/g,
    '// params are passed from Next.js layout'
  );

  // Replace: const { id } = useParams() -> const id = params.id
  result = result.replace(
    /const\s+\{([^}]+)\}\s*=\s*useParams\(\)/g,
    (match, params) => {
      const paramList = params.split(',').map(p => p.trim());
      const assignments = paramList.map(p => `const ${p} = params.${p}`).join('; ');
      return `// params from Next.js\n${assignments};`;
    }
  );

  return result;
}

/**
 * Add "use client" directive if needed
 */
function addUseClient(code) {
  const needsClient =
    code.includes('useState') ||
    code.includes('useEffect') ||
    code.includes('useCallback') ||
    code.includes('useMemo') ||
    code.includes('useRouter') ||
    code.includes('useContext') ||
    code.includes('useRef') ||
    code.includes('useParams');

  if (needsClient && !code.trim().startsWith('"use client"') && !code.trim().startsWith("'use client'")) {
    return '"use client";\n\n' + code;
  }

  return code;
}

/**
 * Main migration function for a single file
 */
function migrateFile(sourcePath, destPath) {
  try {
    let code = fs.readFileSync(sourcePath, 'utf-8');

    // Apply migrations
    code = addUseClient(code);
    code = fixImports(code);
    code = fixNavigation(code);
    code = fixLinkProps(code);

    // Determine if this is a dynamic route
    const isDynamicRoute = destPath.includes('[') && destPath.includes(']');
    code = fixUseParams(code, isDynamicRoute);

    // Create destination directory
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Write migrated file
    fs.writeFileSync(destPath, code, 'utf-8');

    return { success: true, destPath };
  } catch (err) {
    return { success: false, error: err.message, sourcePath };
  }
}

/**
 * Migrate all files in a category
 */
function migrateCategory(categoryName, fileMap) {
  console.log(`\n📁 ${categoryName}:`);
  console.log('─'.repeat(50));

  let success = 0;
  let errors = 0;

  for (const [sourceFile, destPath] of Object.entries(fileMap)) {
    const sourcePath = path.join(UI_DIR, categoryName.toLowerCase().replace(' files', ''), sourceFile);
    const fullDestPath = path.join(APP_DIR, destPath);

    const result = migrateFile(sourcePath, fullDestPath);

    if (result.success) {
      console.log(`  ✅ ${sourceFile} → ${destPath}`);
      success++;
    } else {
      console.log(`  ❌ ${sourceFile}: ${result.error}`);
      errors++;
    }
  }

  return { success, errors };
}

/**
 * Main
 */
function main() {
  console.log('🚀 React → Next.js Full Migration');
  console.log('═'.repeat(50));
  console.log('Source: src/ui/pages/');
  console.log('Dest:   src/app/');
  console.log('═'.repeat(50));

  let totalSuccess = 0;
  let totalErrors = 0;

  const results = [
    migrateCategory('Store Files', STORE_FILES),
    migrateCategory('Auth Files', AUTH_FILES),
    migrateCategory('Seller Files', SELLER_FILES),
    migrateCategory('Admin Files', ADMIN_FILES),
  ];

  for (const r of results) {
    totalSuccess += r.success;
    totalErrors += r.errors;
  }

  console.log('\n' + '═'.repeat(50));
  console.log('📊 SUMMARY:');
  console.log(`   ✅ Migrated: ${totalSuccess} files`);
  console.log(`   ❌ Errors:  ${totalErrors} files`);
  console.log('═'.repeat(50));

  if (totalErrors > 0) {
    console.log('\n⚠️  Manual review needed for error files');
  }
}

main();
