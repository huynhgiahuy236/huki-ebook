#!/bin/bash
# React to Next.js Migration Script
# Run: bash scripts/migrate.sh

echo "🚀 React → Next.js Full Migration"
echo "================================"

UI_DIR="src/ui"
APP_DIR="src/app"

# Copy all page files with migration
files=(
  "pages/auth/LoginPage.jsx:app/auth/login/page.tsx"
  "pages/auth/RegisterPage.jsx:app/auth/register/page.tsx"
  "pages/auth/ForgotPasswordPage.jsx:app/auth/forgot-password/page.tsx"
  "pages/auth/VerifyOtpPage.jsx:app/auth/verify/page.tsx"
  "pages/auth/ResetPasswordPage.jsx:app/auth/reset-password/page.tsx"
  "pages/auth/ChangePasswordPage.jsx:app/auth/change-password/page.tsx"
  "pages/auth/AccountStatusPage.jsx:app/auth/status/page.tsx"
  "pages/auth/OnboardingPreferencesPage.jsx:app/auth/onboarding/page.tsx"
  "pages/store/HomePage.jsx:app/page.tsx"
  "pages/store/CatalogPage.jsx:app/books/page.tsx"
  "pages/store/BookDetailPage.jsx:app/book/[id]/page.tsx"
  "pages/store/BookPreviewPage.jsx:app/book/[id]/preview/page.tsx"
  "pages/store/ShopPage.jsx:app/shop/[id]/page.tsx"
  "pages/store/StoresPage.jsx:app/stores/page.tsx"
  "pages/store/AuthorPage.jsx:app/author/[id]/page.tsx"
  "pages/store/AudiobooksPage.jsx:app/audiobooks/page.tsx"
  "pages/store/CartPage.jsx:app/cart/page.tsx"
  "pages/store/CheckoutPage.jsx:app/checkout/page.tsx"
  "pages/store/OrderSuccessPage.jsx:app/order/success/page.tsx"
  "pages/store/OrdersPage.jsx:app/orders/page.tsx"
  "pages/store/OrderDetailPage.jsx:app/orders/[id]/page.tsx"
  "pages/store/OrderInvoicePage.jsx:app/orders/[id]/invoice/page.tsx"
  "pages/store/OrderReviewPage.jsx:app/orders/[id]/review/page.tsx"
  "pages/store/OrderReturnPage.jsx:app/orders/[id]/return/page.tsx"
  "pages/store/OrderTrackingPage.jsx:app/orders/[id]/tracking/page.tsx"
  "pages/store/ProfilePage.jsx:app/profile/page.tsx"
  "pages/store/UserAddressesPage.jsx:app/profile/addresses/page.tsx"
  "pages/store/UserSecurityPage.jsx:app/profile/security/page.tsx"
  "pages/store/WalletPage.jsx:app/profile/wallet/page.tsx"
  "pages/store/LibraryPage.jsx:app/library/page.tsx"
  "pages/store/ReaderPage.jsx:app/library/[id]/page.tsx"
  "pages/store/DeviceManagementPage.jsx:app/library/devices/page.tsx"
  "pages/store/CommunityPage.jsx:app/community/page.tsx"
  "pages/store/BookReviewsFeedPage.jsx:app/community/reviews/page.tsx"
  "pages/store/BookQuotesPage.jsx:app/community/quotes/page.tsx"
  "pages/store/BookClubsDirectoryPage.jsx:app/community/clubs/page.tsx"
  "pages/store/BookClubDetailPage.jsx:app/community/clubs/[id]/page.tsx"
  "pages/store/CommunityPostDetailPage.jsx:app/community/posts/[id]/page.tsx"
  "pages/store/ReadingChallengePage.jsx:app/community/challenge/page.tsx"
  "pages/store/MessengerPage.jsx:app/messages/page.tsx"
  "pages/store/FlashSalePage.jsx:app/flash-sale/page.tsx"
  "pages/seller/SellerPortalPage.jsx:app/seller/page.tsx"
  "pages/seller/SellerRegisterPage.jsx:app/seller/register/page.tsx"
  "pages/seller/SellerDashboardPage.jsx:app/seller/dashboard/page.tsx"
  "pages/seller/SellerBusinessProfilePage.jsx:app/seller/business/page.tsx"
  "pages/seller/SellerBusinessNotificationsPage.jsx:app/seller/business/notifications/page.tsx"
  "pages/seller/SellerOrdersPage.jsx:app/seller/orders/page.tsx"
  "pages/seller/SellerOrderDetailPage.jsx:app/seller/orders/[id]/page.tsx"
  "pages/seller/SellerStoresPage.jsx:app/seller/stores/page.tsx"
  "pages/seller/SellerProductsPage.jsx:app/seller/products/page.tsx"
  "pages/seller/SellerCreateHybrid.jsx:app/seller/products/create/page.tsx"
  "pages/seller/SellerCreateEbook.jsx:app/seller/products/create/ebook/page.tsx"
  "pages/seller/SellerCreatePhysical.jsx:app/seller/products/create/physical/page.tsx"
  "pages/seller/SellerEditHybrid.jsx:app/seller/products/[id]/edit/page.tsx"
  "pages/seller/SellerCorrection.jsx:app/seller/products/[id]/correct/page.tsx"
  "pages/seller/SellerFinancePage.jsx:app/seller/finance/page.tsx"
  "pages/seller/SellerVouchersPage.tsx:app/seller/vouchers/page.tsx"
  "pages/seller/SellerStaffPage.jsx:app/seller/staff/page.tsx"
  "pages/seller/SellerInventoryPage.jsx:app/seller/inventory/page.tsx"
  "pages/seller/SellerChatPage.jsx:app/seller/chat/page.tsx"
  "pages/seller/EdgeCasesLibrary.jsx:app/seller/edge-cases/page.tsx"
  "pages/admin/AdminDashboardPage.jsx:app/admin/page.tsx"
  "pages/admin/AdminBusinessesPage.jsx:app/admin/businesses/page.tsx"
  "pages/admin/AdminBusinessUpdateRequestsPage.jsx:app/admin/business-requests/page.tsx"
  "pages/admin/AdminStoresPage.jsx:app/admin/stores/page.tsx"
  "pages/admin/AdminBooksPage.jsx:app/admin/books/page.tsx"
  "pages/admin/AdminCategoriesPage.jsx:app/admin/categories/page.tsx"
  "pages/admin/AdminHealthPage.jsx:app/admin/health/page.tsx"
  "pages/admin/AdminPublisherLeadsPage.jsx:app/admin/publisher-leads/page.tsx"
  "pages/admin/AdminPublishersPage.jsx:app/admin/publishers/page.tsx"
  "pages/admin/AdminBookModerationPage.jsx:app/admin/book-moderation/page.tsx"
  "pages/admin/AdminUsersPage.jsx:app/admin/users/page.tsx"
  "pages/admin/AdminAccountsPage.jsx:app/admin/accounts/page.tsx"
  "pages/admin/AdminDrmVaultPage.jsx:app/admin/drm-vault/page.tsx"
  "pages/admin/AdminFinancePage.jsx:app/admin/finance/page.tsx"
  "pages/admin/AdminReportsPage.jsx:app/admin/reports/page.tsx"
  "pages/admin/AdminMarketingPage.jsx:app/admin/marketing/page.tsx"
  "pages/admin/AdminCalendarPage.jsx:app/admin/calendar/page.tsx"
  "pages/admin/AdminIntegrationsPage.jsx:app/admin/integrations/page.tsx"
  "pages/admin/AdminSettingsPage.jsx:app/admin/settings/page.tsx"
  "pages/admin/AdminSupportPage.jsx:app/admin/support/page.tsx"
)

success=0
failed=0

for item in "${files[@]}"; do
  IFS=':' read -r src dest <<< "$item"
  src_path="$UI_DIR/$src"
  dest_path="$APP_DIR/$dest"

  if [ ! -f "$src_path" ]; then
    echo "⚠️  Source not found: $src"
    ((failed++))
    continue
  fi

  # Create destination directory
  dest_dir=$(dirname "$dest_path")
  mkdir -p "$dest_dir"

  # Read and transform file
  content=$(cat "$src_path")

  # Add "use client"
  if [[ ! "$content" =~ ^\"use\ client\" ]]; then
    if [[ "$content" =~ useState|useEffect|useRouter|useCallback|useContext|useRef ]]; then
      content='"use client";'"$content"
    fi
  fi

  # Remove react-router-dom imports
  content=$(echo "$content" | sed "s/import\s*{[^}]*}\s*from\s*['\"]react-router-dom['\"]//g")

  # Replace useNavigate with useRouter
  content=$(echo "$content" | sed "s/const \+\([a-zA-Z_][a-zA-Z0-9_]*\)\s*=\s*useNavigate()/const \1 = useRouter()/g")

  # Replace navigate( with router.push(
  content=$(echo "$content" | sed 's/navigate(/router.push(/g')

  # Replace Link to= with Link href=
  content=$(echo "$content" | sed 's/<Link\s\+to=/<Link href=/g')

  # Fix imports
  content=$(echo "$content" | sed 's|from\s*['"'"']\.\./components/|from "@/ui/components/|g')
  content=$(echo "$content" | sed 's|from\s*['"'"']\.\./\.\./components/|from "@/ui/components/|g')
  content=$(echo "$content" | sed 's|from\s*['"'"']\.\./context/|from "@/ui/context/|g')
  content=$(echo "$content" | sed 's|from\s*['"'"']\.\./api/|from "@/ui/api/|g')
  content=$(echo "$content" | sed 's|from\s*['"'"']\.\./utils/|from "@/ui/utils/|g')
  content=$(echo "$content" | sed 's|from\s*['"'"']\.\./data/|from "@/ui/data/|g')
  content=$(echo "$content" | sed 's|from\s*['"'"']\.\./services/|from "@/ui/services/|g')

  # Add Next.js imports if needed
  if [[ "$content" =~ useRouter ]] && [[ ! "$content" =~ from\ \"next/navigation\" ]]; then
    content=$(echo "$content" | sed 's/import\s\+React/import { useRouter } from "next\/navigation";\nimport React/')
  fi

  if [[ "$content" =~ <Link ]] && [[ ! "$content" =~ from\ \"next/link\" ]]; then
    content=$(echo "$content" | sed 's/import\s\+React/import Link from "next\/link";\nimport React/')
  fi

  # Fix useLocation
  content=$(echo "$content" | sed 's/useLocation()/usePathname()/g')

  # Fix useParams
  if [[ "$content" =~ useParams ]]; then
    content=$(echo "$content" | sed 's/const \+{ \?\([a-zA-Z_, ]*\)} \?= useParams()/const { \1 } = params as any/g')
    content=$(echo "$content" | sed 's/import\s*{[^}]*useParams[^}]*} from "react-router-dom"/\/\/ params from Next.js layout/g')
  fi

  # Write file
  echo "$content" > "$dest_path"
  echo "✅ $src → $dest"
  ((success++))
done

echo ""
echo "================================"
echo "📊 Done: $success success, $failed failed"
