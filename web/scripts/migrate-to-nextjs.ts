/**
 * Migration Script: React SPA → Next.js App Router
 *
 * Run: npx ts-node scripts/migrate-to-nextjs.ts
 *
 * This script:
 * 1. Reads all JSX pages from src/ui/pages
 * 2. Transforms them for Next.js App Router
 * 3. Writes to src/app with proper routing
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, basename, dirname } from "path";

const PAGES_DIR = join(__dirname, "..", "ui", "pages");
const APP_DIR = join(__dirname, "..", "app");

// Route mapping: legacy path -> new path
const ROUTE_MAP: Record<string, { file: string; params?: string[] }> = {
  // Store - Home
  "HomePage.jsx": { file: "page.tsx", params: [] },

  // Store - Books
  "CatalogPage.jsx": { file: "books/page.tsx", params: [] },
  "FlashSalePage.jsx": { file: "flash-sale/page.tsx", params: [] },

  // Store - Book Detail (dynamic)
  "BookDetailPage.jsx": { file: "book/[id]/page.tsx", params: ["id"] },
  "BookPreviewPage.jsx": { file: "book/[id]/preview/page.tsx", params: ["id"] },

  // Store - Shop
  "ShopPage.jsx": { file: "shop/[id]/page.tsx", params: ["id"] },
  "StoresPage.jsx": { file: "shops/page.tsx", params: [] },
  "AuthorPage.jsx": { file: "author/[id]/page.tsx", params: ["id"] },
  "AudiobooksPage.jsx": { file: "audiobooks/page.tsx", params: [] },

  // Store - Cart & Checkout
  "CartPage.jsx": { file: "cart/page.tsx", params: [] },
  "CheckoutPage.jsx": { file: "checkout/page.tsx", params: [] },
  "OrderSuccessPage.jsx": { file: "order/success/page.tsx", params: [] },

  // Store - Orders
  "OrdersPage.jsx": { file: "orders/page.tsx", params: [] },
  "OrderDetailPage.jsx": { file: "orders/[id]/page.tsx", params: ["id"] },
  "OrderInvoicePage.jsx": { file: "orders/[id]/invoice/page.tsx", params: ["id"] },
  "OrderReviewPage.jsx": { file: "orders/[id]/review/page.tsx", params: ["id"] },
  "OrderReturnPage.jsx": { file: "orders/[id]/return/page.tsx", params: ["id"] },
  "OrderTrackingPage.jsx": { file: "orders/[id]/tracking/page.tsx", params: ["id"] },

  // Store - Profile
  "ProfilePage.jsx": { file: "profile/page.tsx", params: [] },
  "UserAddressesPage.jsx": { file: "profile/addresses/page.tsx", params: [] },
  "UserSecurityPage.jsx": { file: "profile/security/page.tsx", params: [] },
  "WalletPage.jsx": { file: "profile/wallet/page.tsx", params: [] },

  // Store - Library
  "LibraryPage.jsx": { file: "library/page.tsx", params: [] },
  "ReaderPage.jsx": { file: "library/[id]/page.tsx", params: ["id"] },
  "DeviceManagementPage.jsx": { file: "library/devices/page.tsx", params: [] },

  // Store - Community
  "CommunityPage.jsx": { file: "community/page.tsx", params: [] },
  "BookReviewsFeedPage.jsx": { file: "community/reviews/page.tsx", params: [] },
  "BookQuotesPage.jsx": { file: "community/quotes/page.tsx", params: [] },
  "BookClubsDirectoryPage.jsx": { file: "community/clubs/page.tsx", params: [] },
  "BookClubDetailPage.jsx": { file: "community/clubs/[id]/page.tsx", params: ["id"] },
  "CommunityPostDetailPage.jsx": { file: "community/posts/[id]/page.tsx", params: ["id"] },
  "ReadingChallengePage.jsx": { file: "community/challenge/page.tsx", params: [] },
  "MessengerPage.jsx": { file: "messages/page.tsx", params: [] },

  // Auth
  "LoginPage.jsx": { file: "auth/login/page.tsx", params: [] },
  "RegisterPage.jsx": { file: "auth/register/page.tsx", params: [] },
  "ForgotPasswordPage.jsx": { file: "auth/forgot-password/page.tsx", params: [] },
  "VerifyOtpPage.jsx": { file: "auth/verify/page.tsx", params: [] },
  "ResetPasswordPage.jsx": { file: "auth/reset-password/page.tsx", params: [] },
  "ChangePasswordPage.jsx": { file: "auth/change-password/page.tsx", params: [] },
  "AccountStatusPage.jsx": { file: "auth/status/page.tsx", params: [] },
  "OnboardingPreferencesPage.jsx": { file: "auth/onboarding/page.tsx", params: [] },

  // Seller
  "SellerPortalPage.jsx": { file: "seller/page.tsx", params: [] },
  "SellerRegisterPage.jsx": { file: "seller/register/page.tsx", params: [] },
  "SellerDashboardPage.jsx": { file: "seller/dashboard/page.tsx", params: [] },
  "SellerBusinessProfilePage.jsx": { file: "seller/business/page.tsx", params: [] },
  "SellerBusinessNotificationsPage.jsx": { file: "seller/business/notifications/page.tsx", params: [] },
  "SellerOrdersPage.jsx": { file: "seller/orders/page.tsx", params: [] },
  "SellerOrderDetailPage.jsx": { file: "seller/orders/[id]/page.tsx", params: ["id"] },
  "SellerStoresPage.jsx": { file: "seller/stores/page.tsx", params: [] },
  "SellerProductsPage.jsx": { file: "seller/products/page.tsx", params: [] },
  "SellerCreateHybrid.jsx": { file: "seller/products/create/page.tsx", params: [] },
  "SellerCreateEbook.jsx": { file: "seller/products/create/ebook/page.tsx", params: [] },
  "SellerCreatePhysical.jsx": { file: "seller/products/create/physical/page.tsx", params: [] },
  "SellerEditHybrid.jsx": { file: "seller/products/[id]/edit/page.tsx", params: ["id"] },
  "SellerCorrection.jsx": { file: "seller/products/[id]/correct/page.tsx", params: ["id"] },
  "SellerFinancePage.jsx": { file: "seller/finance/page.tsx", params: [] },
  "SellerVouchersPage.tsx": { file: "seller/vouchers/page.tsx", params: [] },
  "SellerStaffPage.jsx": { file: "seller/staff/page.tsx", params: [] },
  "SellerInventoryPage.jsx": { file: "seller/inventory/page.tsx", params: [] },
  "SellerChatPage.jsx": { file: "seller/chat/page.tsx", params: [] },

  // Admin
  "AdminDashboardPage.jsx": { file: "admin/page.tsx", params: [] },
  "AdminBusinessesPage.jsx": { file: "admin/businesses/page.tsx", params: [] },
  "AdminBusinessUpdateRequestsPage.jsx": { file: "admin/business-requests/page.tsx", params: [] },
  "AdminStoresPage.jsx": { file: "admin/stores/page.tsx", params: [] },
  "AdminBooksPage.jsx": { file: "admin/books/page.tsx", params: [] },
  "AdminCategoriesPage.jsx": { file: "admin/categories/page.tsx", params: [] },
  "AdminHealthPage.jsx": { file: "admin/health/page.tsx", params: [] },
  "AdminPublisherLeadsPage.jsx": { file: "admin/publisher-leads/page.tsx", params: [] },
  "AdminPublishersPage.jsx": { file: "admin/publishers/page.tsx", params: [] },
  "AdminBookModerationPage.jsx": { file: "admin/book-moderation/page.tsx", params: [] },
  "AdminUsersPage.jsx": { file: "admin/users/page.tsx", params: [] },
  "AdminAccountsPage.jsx": { file: "admin/accounts/page.tsx", params: [] },
  "AdminDrmVaultPage.jsx": { file: "admin/drm-vault/page.tsx", params: [] },
  "AdminFinancePage.jsx": { file: "admin/finance/page.tsx", params: [] },
  "AdminReportsPage.jsx": { file: "admin/reports/page.tsx", params: [] },
  "AdminMarketingPage.jsx": { file: "admin/marketing/page.tsx", params: [] },
  "AdminCalendarPage.jsx": { file: "admin/calendar/page.tsx", params: [] },
  "AdminIntegrationsPage.jsx": { file: "admin/integrations/page.tsx", params: [] },
  "AdminSettingsPage.jsx": { file: "admin/settings/page.tsx", params: [] },
  "AdminSupportPage.jsx": { file: "admin/support/page.tsx", params: [] },
};

/**
 * Transform JSX code for Next.js App Router
 */
function transformCode(code: string, filename: string): string {
  let result = code;

  // 1. Add "use client" directive if using hooks
  const usesHooks =
    result.includes("useState") ||
    result.includes("useEffect") ||
    result.includes("useCallback") ||
    result.includes("useMemo") ||
    result.includes("useRouter") ||
    result.includes("useContext") ||
    result.includes("useRef") ||
    result.includes("useParams");

  if (usesHooks && !result.trim().startsWith('"use client"') && !result.trim().startsWith("'use client'")) {
    result = '"use client";\n\n' + result;
  }

  // 2. Replace react-router-dom imports
  if (result.includes("from 'react-router-dom'") || result.includes('from "react-router-dom"')) {
    // Replace Link
    result = result.replace(
      /<Link /g,
      '<Link '
    );

    // Replace useNavigate with useRouter
    if (result.includes("useNavigate")) {
      // Add useRouter import
      if (!result.includes("useRouter")) {
        result = result.replace(
          /from ["']react["']/,
          '{ useRouter } from "next/navigation"\nimport React from "react"'
        );
      }

      // Replace navigate = useNavigate() with router = useRouter()
      result = result.replace(
        /const (\w+) = useNavigate\(\)/g,
        "const $1 = useRouter()"
      );

      // Replace navigate(...) with router.push(...)
      result = result.replace(
        /(\w+)\(([^)]+)\)(?!\s*\))/g,
        (match, fnName, args) => {
          if (["navigate", "useNavigate", "Link"].includes(fnName)) {
            return match;
          }
          if (result.includes(`const ${fnName} = useRouter()`) || result.includes(`const ${fnName} = useNavigate()`)) {
            // This is a navigation call
            if (!args.includes("onClick") && !args.includes("href")) {
              return `router.push(${args})`;
            }
          }
          return match;
        }
      );
    }
  }

  // 3. Replace useParams (for dynamic routes)
  const routeInfo = ROUTE_MAP[filename];
  if (routeInfo?.params?.length) {
    // For dynamic routes, we'll handle params in a wrapper
    // For now, just add a comment
    if (result.includes("useParams")) {
      result = result.replace(
        /const \{ ([^}]+) \} = useParams\(\)/g,
        `// params will be passed as props from Next.js layout\nconst params = props.params;\nconst { $1 } = params || {};`
      );
    }
  }

  // 4. Fix relative imports (../../components -> @/components or @/ui/components)
  result = result.replace(
    /from ['"]\.\.\/\.\.\/components\//g,
    'from "@/components/'
  );
  result = result.replace(
    /from ['"]\.\.\/components\//g,
    'from "@/ui/components/'
  );
  result = result.replace(
    /from ['"]\.\.\/context\//g,
    'from "@/ui/context/'
  );
  result = result.replace(
    /from ['"]\.\.\/api\//g,
    'from "@/ui/api/'
  );
  result = result.replace(
    /from ['"]\.\.\/utils\//g,
    'from "@/ui/utils/'
  );
  result = result.replace(
    /from ['"]\.\.\/data\//g,
    'from "@/ui/data/'
  );
  result = result.replace(
    /from ['"]\.\.\/services\//g,
    'from "@/ui/services/'
  );

  return result;
}

/**
 * Create page file with proper imports
 */
function createPageFile(code: string, filename: string, destPath: string): void {
  const transformed = transformCode(code, filename);

  // Ensure directory exists
  const dir = dirname(destPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write the file
  writeFileSync(destPath, transformed, "utf-8");
  console.log(`✓ ${filename} → ${destPath}`);
}

/**
 * Main migration function
 */
function migrate() {
  console.log("🚀 Starting React → Next.js migration...\n");

  let migrated = 0;
  let skipped = 0;

  function processDir(dir: string, prefix: string = "") {
    const files = readdirSync(dir);

    for (const file of files) {
      const fullPath = join(dir, file);

      // Recurse into subdirectories
      if (!file.includes(".")) {
        processDir(fullPath, prefix + file + "/");
        continue;
      }

      // Only process .jsx files
      if (!file.endsWith(".jsx") && !file.endsWith(".tsx")) {
        skipped++;
        continue;
      }

      const routeInfo = ROUTE_MAP[file];
      if (!routeInfo) {
        console.log(`⚠ No route mapping for: ${file}`);
        skipped++;
        continue;
      }

      try {
        const code = readFileSync(fullPath, "utf-8");
        const destPath = join(APP_DIR, routeInfo.file);
        createPageFile(code, file, destPath);
        migrated++;
      } catch (err) {
        console.error(`✗ Error migrating ${file}:`, err);
      }
    }
  }

  processDir(PAGES_DIR);

  console.log(`\n📊 Migration complete!`);
  console.log(`   ✓ Migrated: ${migrated} files`);
  console.log(`   - Skipped: ${skipped} files`);
  console.log(`\nNext steps:`);
  console.log(`   1. Review migrated files for manual fixes`);
  console.log(`   2. Update dynamic route handling (useParams → props.params)`);
  console.log(`   3. Run: npm run dev`);
  console.log(`   4. Fix any remaining issues`);
}

// Run migration
migrate();
