import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route, useParams } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ReaderProvider } from './context/ReaderContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Toast from './components/common/Toast';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import RouteEffects from './components/common/RouteEffects';
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';
import ReaderLayout from './components/layout/ReaderLayout';
import PrintLayout from './components/layout/PrintLayout';
import CheckoutLayout from './components/layout/CheckoutLayout';
import SellerPortalLayout from './components/layout/SellerPortalLayout';
import SellerLayout from './components/layout/SellerLayout';
import AdminLayout from './components/layout/AdminLayout';
import { RequireAuth, RequireGuest, RequireSeller, RequireAdmin } from './components/auth/RouteGuards';

const page = (loader) => lazy(loader);

// System Error Pages
const NotFoundPage = page(() => import('./pages/system/NotFoundPage'));
const ForbiddenPage = page(() => import('./pages/system/ForbiddenPage'));
const ServerErrorPage = page(() => import('./pages/system/ServerErrorPage'));

// Auth
const LoginPage = page(() => import('./pages/auth/LoginPage'));
const RegisterPage = page(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = page(() => import('./pages/auth/ForgotPasswordPage'));
const VerifyOtpPage = page(() => import('./pages/auth/VerifyOtpPage'));
const ResetPasswordPage = page(() => import('./pages/auth/ResetPasswordPage'));
const ChangePasswordPage = page(() => import('./pages/auth/ChangePasswordPage'));
const AccountStatusPage = page(() => import('./pages/auth/AccountStatusPage'));
const OnboardingPreferencesPage = page(() => import('./pages/auth/OnboardingPreferencesPage'));

// Store / Buyer
const HomePage = page(() => import('./pages/store/HomePage'));
const CatalogPage = page(() => import('./pages/store/CatalogPage'));
const BookDetailPage = page(() => import('./pages/store/BookDetailPage'));
const BookPreviewPage = page(() => import('./pages/store/BookPreviewPage'));
const ShopPage = page(() => import('./pages/store/ShopPage'));
const StoresPage = page(() => import('./pages/store/StoresPage'));
const AuthorPage = page(() => import('./pages/store/AuthorPage'));
const AudiobooksPage = page(() => import('./pages/store/AudiobooksPage'));
const CartPage = page(() => import('./pages/store/CartPage'));
const CheckoutPage = page(() => import('./pages/store/CheckoutPage'));
const OrderSuccessPage = page(() => import('./pages/store/OrderSuccessPage'));
const ProfilePage = page(() => import('./pages/store/ProfilePage'));
const UserAddressesPage = page(() => import('./pages/store/UserAddressesPage'));
const UserSecurityPage = page(() => import('./pages/store/UserSecurityPage'));
const OrdersPage = page(() => import('./pages/store/OrdersPage'));
const OrderDetailPage = page(() => import('./pages/store/OrderDetailPage'));
const OrderInvoicePage = page(() => import('./pages/store/OrderInvoicePage'));
const OrderReviewPage = page(() => import('./pages/store/OrderReviewPage'));
const OrderReturnPage = page(() => import('./pages/store/OrderReturnPage'));
const WalletPage = page(() => import('./pages/store/WalletPage'));
const LibraryPage = page(() => import('./pages/store/LibraryPage'));
const ReaderPage = page(() => import('./pages/store/ReaderPage'));
const DeviceManagementPage = page(() => import('./pages/store/DeviceManagementPage'));

// Community
const CommunityPage = page(() => import('./pages/store/CommunityPage'));
const BookReviewsFeedPage = page(() => import('./pages/store/BookReviewsFeedPage'));
const BookQuotesPage = page(() => import('./pages/store/BookQuotesPage'));
const BookClubsDirectoryPage = page(() => import('./pages/store/BookClubsDirectoryPage'));
const BookClubDetailPage = page(() => import('./pages/store/BookClubDetailPage'));
const CommunityPostDetailPage = page(() => import('./pages/store/CommunityPostDetailPage'));
const ReadingChallengePage = page(() => import('./pages/store/ReadingChallengePage'));
const MessengerPage = page(() => import('./pages/store/MessengerPage'));

// Seller
const SellerPortalPage = page(() => import('./pages/seller/SellerPortalPage'));
const SellerRegisterPage = page(() => import('./pages/seller/SellerRegisterPage'));
const SellerDashboardPage = page(() => import('./pages/seller/SellerDashboardPage'));
const SellerBusinessProfilePage = page(() => import('./pages/seller/SellerBusinessProfilePage'));
const SellerBusinessNotificationsPage = page(() => import('./pages/seller/SellerBusinessNotificationsPage'));
const SellerProductsPage = page(() => import('./pages/seller/SellerProductsPage'));
const SellerOrdersPage = page(() => import('./pages/seller/SellerOrdersPage'));
const SellerOrderDetailPage = page(() => import('./pages/seller/SellerOrderDetailPage'));
const SellerStoresPage = page(() => import('./pages/seller/SellerStoresPage'));
const SellerChatPage = page(() => import('./pages/seller/SellerChatPage'));
const SellerFinancePage = page(() => import('./pages/seller/SellerFinancePage'));
const SellerCreateHybrid = page(() => import('./pages/seller/SellerCreateHybrid'));
const SellerEditHybrid = page(() => import('./pages/seller/SellerEditHybrid'));
const SellerCorrection = page(() => import('./pages/seller/SellerCorrection'));
const SellerStaffPage = page(() => import('./pages/seller/SellerStaffPage'));
const EdgeCasesLibrary = page(() => import('./pages/seller/EdgeCasesLibrary'));

// Admin
const AdminDashboardPage = page(() => import('./pages/admin/AdminDashboardPage'));
const AdminBusinessesPage = page(() => import('./pages/admin/AdminBusinessesPage'));
const AdminBusinessUpdateRequestsPage = page(() => import('./pages/admin/AdminBusinessUpdateRequestsPage'));
const AdminStoresPage = page(() => import('./pages/admin/AdminStoresPage'));
const AdminBooksPage = page(() => import('./pages/admin/AdminBooksPage'));
const AdminCategoriesPage = page(() => import('./pages/admin/AdminCategoriesPage'));
const AdminHealthPage = page(() => import('./pages/admin/AdminHealthPage'));
const AdminPublisherLeadsPage = page(() => import('./pages/admin/AdminPublisherLeadsPage'));
const AdminPublishersPage = page(() => import('./pages/admin/AdminPublishersPage'));
const AdminBookModerationPage = page(() => import('./pages/admin/AdminBookModerationPage'));
const AdminUsersPage = page(() => import('./pages/admin/AdminUsersPage'));
const AdminAccountsPage = page(() => import('./pages/admin/AdminAccountsPage'));
const AdminDrmVaultPage = page(() => import('./pages/admin/AdminDrmVaultPage'));
const AdminFinancePage = page(() => import('./pages/admin/AdminFinancePage'));
const AdminReportsPage = page(() => import('./pages/admin/AdminReportsPage'));
const AdminMarketingPage = page(() => import('./pages/admin/AdminMarketingPage'));
const AdminCalendarPage = page(() => import('./pages/admin/AdminCalendarPage'));
const AdminIntegrationsPage = page(() => import('./pages/admin/AdminIntegrationsPage'));
const AdminSettingsPage = page(() => import('./pages/admin/AdminSettingsPage'));
const AdminSupportPage = page(() => import('./pages/admin/AdminSupportPage'));

const previewOnly = (Component, label) => (
  <div className="relative w-full">
    <div className="pointer-events-none select-none">
      <Component />
    </div>
    <div className="fixed bottom-4 right-4 z-40 bg-[var(--theme-primary)]/95 text-white backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-lg border border-[var(--theme-border)]/30 text-xs flex items-center gap-2 pointer-events-none">
      <span className="material-symbols-outlined text-sm text-[var(--theme-secondary)]">palette</span>
      <span>Giao diện mẫu ({label})</span>
    </div>
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <ReaderProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <RouteEffects />
              <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:shadow-lg">
                Bỏ qua điều hướng
              </a>
              <AppErrorBoundary>
              <Suspense fallback={<PageLoading />}>
              <Routes>
                {/* 1. KHU VỰC XÁC THỰC: Standalone 50/50 Desktop Canvas (Không dùng Header/Sidebar sàn) */}
                <Route element={<AuthLayout />}>
                  <Route element={<RequireGuest />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/verify-otp" element={<VerifyOtpPage />} />
                    <Route path="/verify-email" element={<VerifyOtpPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                  </Route>
                  <Route path="/change-password" element={<RequireAuth><ChangePasswordPage /></RequireAuth>} />
                  <Route path="/onboarding/preferences" element={<RequireAuth><OnboardingPreferencesPage /></RequireAuth>} />
                  <Route path="/account-status" element={<AccountStatusPage />} />
                  <Route path="/status" element={<AccountStatusPage />} />
                  <Route path="/unauthorized" element={<ForbiddenPage />} />
                </Route>

                {/* 2. KHU VỰC TRÌNH ĐỌC SÁCH FULLSCREEN & STANDALONE (Tách biệt hoàn toàn) */}
                <Route element={<ReaderLayout />}>
                  <Route path="/read/:id" element={previewOnly(ReaderPage, 'WebReader và DRM')} />
                  <Route path="/read" element={previewOnly(ReaderPage, 'WebReader và DRM')} />
                  <Route path="/reader" element={previewOnly(ReaderPage, 'WebReader và DRM')} />
                  <Route path="/book/:id/preview" element={previewOnly(BookPreviewPage, 'Đọc thử Ebook')} />
                </Route>

                {/* 3. KHU VỰC CHAT TOÀN MÀN HÌNH (Full-height Messenger Workspace) */}
                <Route path="/chat" element={previewOnly(MessengerPage, 'Messenger')} />
                <Route path="/messages" element={previewOnly(MessengerPage, 'Messenger')} />
                <Route path="/message" element={<Navigate to="/chat" replace />} />

                {/* 4. KHU VỰC HÓA ĐƠN VAT CHUẨN IN ẤN A4 (Standalone Minimal Print View) */}
                <Route element={<RequireAuth />}>
                  <Route element={<PrintLayout />}>
                    <Route path="/orders/:id/invoice" element={previewOnly(OrderInvoicePage, 'Hóa đơn VAT')} />
                    <Route path="/order/:id/invoice" element={<NavigateOrderAlias suffix="invoice" />} />
                  </Route>
                </Route>

                {/* 5. KHU VỰC THANH TOÁN (Distraction-Free: Không Sidebar) */}
                <Route element={<RequireAuth />}>
                  <Route element={<CheckoutLayout />}>
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order-success" element={<OrderSuccessPage />} />
                  </Route>
                </Route>

                {/* 6. KHU VỰC B2B PORTAL: GIỚI THIỆU & ĐĂNG KÝ NGƯỜI BÁN */}
                <Route element={<SellerPortalLayout />}>
                  <Route path="/seller" element={<SellerPortalPage />} />
                  <Route element={<RequireAuth />}>
                    <Route path="/seller/register" element={<SellerRegisterPage />} />
                    <Route path="/seller/business/register" element={<SellerRegisterPage />} />
                    <Route path="/seller/business/status" element={<SellerRegisterPage />} />
                  </Route>
                </Route>

                {/* 7. KHU VỰC SÀN TMĐT, CỘNG ĐỒNG & KHÁCH HÀNG (AppLayout chuẩn có Header, Sidebar, Footer) */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/community" element={previewOnly(CommunityPage, 'Cộng đồng & Diễn đàn')} />
                  <Route path="/community/reviews" element={previewOnly(BookReviewsFeedPage, 'Đánh giá độc giả')} />
                  <Route path="/community/quotes" element={previewOnly(BookQuotesPage, 'Trích dẫn sách')} />
                  <Route path="/community/clubs" element={previewOnly(BookClubsDirectoryPage, 'Book Clubs')} />
                  <Route path="/community/club/:id" element={previewOnly(BookClubDetailPage, 'Book Club')} />
                  <Route path="/community/club" element={<Navigate to="/community/clubs" replace />} />
                  <Route path="/community/post/:id" element={previewOnly(CommunityPostDetailPage, 'Bài viết cộng đồng')} />
                  <Route path="/community/post" element={<Navigate to="/community" replace />} />
                  <Route path="/clubs" element={<Navigate to="/community/clubs" replace />} />
                  <Route path="/club" element={<Navigate to="/community/clubs" replace />} />
                  <Route path="/challenge/2026" element={previewOnly(ReadingChallengePage, 'Thử thách đọc 2026')} />
                  <Route path="/challenge" element={previewOnly(ReadingChallengePage, 'Thử thách đọc')} />
                  <Route path="/profile/challenge" element={previewOnly(ReadingChallengePage, 'Thử thách đọc')} />
                  <Route path="/books" element={<CatalogPage />} />
                  <Route path="/search" element={<CatalogPage />} />
                  <Route path="/categories" element={<CatalogPage />} />
                  <Route path="/categories/:slug" element={<CatalogPage />} />
                  <Route path="/books/:id" element={<BookDetailPage />} />
                  <Route path="/book/:id" element={<BookDetailPage />} />
                  <Route path="/book" element={<Navigate to="/books" replace />} />
                  <Route path="/shop/:id" element={<ShopPage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/stores" element={<StoresPage />} />
                  <Route path="/stores/:id" element={<ShopPage />} />
                  <Route path="/publishers" element={<StoresPage />} />
                  <Route path="/publishers/:id" element={<ShopPage />} />
                  <Route path="/publisher/:id" element={<ShopPage />} />
                  <Route path="/publisher" element={<Navigate to="/stores?tab=publishers" replace />} />
                  <Route path="/authors" element={<StoresPage />} />
                  <Route path="/author/:id" element={<AuthorPage />} />
                  <Route path="/author" element={<Navigate to="/stores?tab=authors" replace />} />
                  <Route path="/audiobooks" element={previewOnly(AudiobooksPage, 'Sách nói & Podcasts')} />
                  <Route path="/audiobook" element={<Navigate to="/audiobooks" replace />} />
                  <Route path="/audio" element={<Navigate to="/audiobooks" replace />} />
                  <Route path="/podcasts" element={<Navigate to="/audiobooks" replace />} />
                  <Route path="/cart" element={<CartPage />} />

                  {/* Authenticated customer profile & orders */}
                  <Route element={<RequireAuth />}>
                    <Route path="/orders/:id/review" element={previewOnly(OrderReviewPage, 'Đánh giá sau mua')} />
                    <Route path="/orders/:id" element={<OrderDetailPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/order" element={<Navigate to="/orders" replace />} />
                    <Route path="/order/:id/review" element={<NavigateOrderAlias suffix="review" />} />
                    <Route path="/order/tracking/:id" element={<NavigateOrderAlias />} />
                    <Route path="/order/:id/return" element={<NavigateOrderAlias suffix="return" />} />
                    <Route path="/orders/:id/return" element={previewOnly(OrderReturnPage, 'Đổi trả hoàn tiền')} />
                    <Route path="/wallet" element={previewOnly(WalletPage, 'Ví Xu & Điểm thưởng')} />
                    <Route path="/rewards" element={<Navigate to="/wallet" replace />} />
                    <Route path="/settings" element={<Navigate to="/settings/devices" replace />} />
                    <Route path="/settings/devices" element={previewOnly(DeviceManagementPage, 'Quản lý thiết bị DRM')} />
                    <Route path="/settings/addresses" element={<UserAddressesPage />} />
                    <Route path="/settings/security" element={previewOnly(UserSecurityPage, 'Bảo mật tài khoản')} />
                    <Route path="/drm/devices" element={<Navigate to="/settings/devices" replace />} />
                    <Route path="/library" element={previewOnly(LibraryPage, 'Tủ sách cá nhân')} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>
                </Route>

                {/* 8. KHU VỰC QUẢN TRỊ NGƯỜI BÁN ĐÃ DUYỆT (SellerLayout chuẩn) */}
                <Route element={<RequireAuth />}>
                  <Route element={<RequireSeller />}>
                    <Route element={<SellerLayout />}>
                      <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
                      <Route path="/seller/business" element={<SellerBusinessProfilePage />} />
                      <Route path="/seller/business/notifications" element={<SellerBusinessNotificationsPage />} />
                      <Route path="/seller/notifications" element={<SellerBusinessNotificationsPage />} />
                      <Route path="/seller/profile" element={<SellerBusinessProfilePage />} />
                      <Route path="/seller/orders" element={<SellerOrdersPage />} />
                      <Route path="/seller/orders/:id" element={<SellerOrderDetailPage />} />
                      <Route path="/seller/order/:id" element={<Navigate to="/seller/orders/:id" replace />} />
                      <Route path="/seller/staff" element={<SellerStaffPage />} />
                      <Route path="/seller/members" element={<Navigate to="/seller/staff" replace />} />
                      <Route path="/seller/stores" element={<Navigate to="/seller/business" replace />} />
                      <Route path="/seller/stores/new" element={<Navigate to="/seller/business" replace />} />
                      <Route path="/seller/chat" element={previewOnly(SellerChatPage, 'Chat người bán')} />
                      <Route path="/seller/finance" element={<SellerFinancePage />} />
                      <Route path="/seller/wallet" element={<SellerFinancePage />} />
                      <Route path="/seller/revenue" element={<SellerFinancePage />} />
                      <Route path="/seller/products" element={<SellerProductsPage />} />
                      <Route path="/seller/product" element={<Navigate to="/seller/products" replace />} />
                      {/* Create product routes with all dash, underscore and plural aliases */}
                      <Route path="/seller/product/create-ebook" element={<SellerCreateHybrid initialFormat="DIGITAL" />} />
                      <Route path="/seller/product/create_ebook" element={<SellerCreateHybrid initialFormat="DIGITAL" />} />
                      <Route path="/seller/products/create-ebook" element={<SellerCreateHybrid initialFormat="DIGITAL" />} />
                      <Route path="/seller/products/create_ebook" element={<SellerCreateHybrid initialFormat="DIGITAL" />} />

                      <Route path="/seller/product/create-physical" element={<SellerCreateHybrid initialFormat="PHYSICAL" />} />
                      <Route path="/seller/product/create_physical" element={<SellerCreateHybrid initialFormat="PHYSICAL" />} />
                      <Route path="/seller/products/create-physical" element={<SellerCreateHybrid initialFormat="PHYSICAL" />} />
                      <Route path="/seller/products/create_physical" element={<SellerCreateHybrid initialFormat="PHYSICAL" />} />

                      <Route path="/seller/product/create-hybrid" element={<SellerCreateHybrid initialFormat="BOTH" />} />
                      <Route path="/seller/product/create_hybrid" element={<SellerCreateHybrid initialFormat="BOTH" />} />
                      <Route path="/seller/products/create-hybrid" element={<SellerCreateHybrid initialFormat="BOTH" />} />
                      <Route path="/seller/products/create_hybrid" element={<SellerCreateHybrid initialFormat="BOTH" />} />
                      <Route path="/seller/product/create" element={<SellerCreateHybrid initialFormat="BOTH" />} />
                      <Route path="/seller/products/create" element={<SellerCreateHybrid initialFormat="BOTH" />} />

                      <Route path="/seller/product/edit-hybrid" element={<SellerEditHybrid />} />
                      <Route path="/seller/product/correction" element={previewOnly(SellerCorrection, 'Sửa lỗi sản phẩm')} />
                      <Route path="/seller/edge-cases" element={previewOnly(EdgeCasesLibrary, 'Edge cases')} />
                    </Route>
                  </Route>
                </Route>

                {/* 9. KHU VỰC SUPER ADMIN CRM DASHBOARD (AdminLayout chuẩn Edge-to-Edge Full Screen) */}
                <Route element={<RequireAuth />}>
                  <Route element={<RequireAdmin />}>
                    <Route element={<AdminLayout />}>
                      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                      <Route path="/admin/businesses" element={<AdminBusinessesPage />} />
                      <Route path="/admin/business-update-requests" element={<AdminBusinessUpdateRequestsPage />} />
                      <Route path="/admin/businesses/update-requests" element={<AdminBusinessUpdateRequestsPage />} />
                      <Route path="/admin/update-requests" element={<AdminBusinessUpdateRequestsPage />} />
                      <Route path="/admin/leads" element={<AdminBusinessesPage />} />
                      <Route path="/admin/companies" element={<AdminBusinessesPage />} />
                      <Route path="/admin/publishers" element={<AdminBusinessesPage />} />
                      <Route path="/admin/stores" element={<AdminStoresPage />} />
                      <Route path="/admin/books" element={<AdminBooksPage />} />
                      <Route path="/admin/categories" element={<AdminCategoriesPage />} />
                      <Route path="/admin/health" element={<AdminHealthPage />} />
                      <Route path="/admin/system/health" element={<AdminHealthPage />} />
                      <Route path="/admin/tasks" element={previewOnly(AdminBookModerationPage, 'Hàng chờ kiểm duyệt')} />
                      <Route path="/admin/moderation" element={previewOnly(AdminBookModerationPage, 'Hàng chờ kiểm duyệt')} />
                      <Route path="/admin/drm" element={previewOnly(AdminDrmVaultPage, 'Quản trị DRM')} />
                      <Route path="/admin/accounts" element={<AdminAccountsPage />} />
                      <Route path="/admin/users-management" element={<AdminAccountsPage />} />
                      <Route path="/admin/users" element={previewOnly(AdminUsersPage, 'Quản lý bạn đọc')} />
                      <Route path="/admin/contacts" element={previewOnly(AdminUsersPage, 'Quản lý bạn đọc')} />
                      <Route path="/admin/deals" element={previewOnly(AdminFinancePage, 'Đối soát tài chính 85/15')} />
                      <Route path="/admin/finance" element={previewOnly(AdminFinancePage, 'Đối soát tài chính 85/15')} />
                      <Route path="/admin/reports" element={previewOnly(AdminReportsPage, 'Báo cáo phân tích')} />
                      <Route path="/admin/automation" element={previewOnly(AdminMarketingPage, 'Banner & Flash Deal')} />
                      <Route path="/admin/marketing" element={previewOnly(AdminMarketingPage, 'Banner & Flash Deal')} />
                      <Route path="/admin/calendar" element={previewOnly(AdminCalendarPage, 'Lịch trình toàn sàn')} />
                      <Route path="/admin/integrations" element={previewOnly(AdminIntegrationsPage, 'Cổng tích hợp DRM')} />
                      <Route path="/admin/settings" element={previewOnly(AdminSettingsPage, 'Cài đặt hệ thống')} />
                      <Route path="/admin/support" element={previewOnly(AdminSupportPage, 'Hỗ trợ & khiếu nại')} />
                    </Route>
                  </Route>
                </Route>

                {/* 10. ERROR & STATUS ROUTES */}
                <Route path="/403" element={<ForbiddenPage />} />
                <Route path="/500" element={<ServerErrorPage />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </Suspense>
              </AppErrorBoundary>
              <Toast />
            </BrowserRouter>
          </ReaderProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}

function PageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-theme-bg" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-theme-border bg-theme-surface px-6 py-3.5 text-sm font-semibold text-theme-text shadow-xs">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-theme-secondary/20 border-t-theme-secondary" aria-hidden="true" />
        Đang tải nội dung…
      </div>
    </div>
  );
}

function NavigateOrderAlias({ suffix }) {
  const { id } = useParams();
  return <Navigate to={`/orders/${id || ''}${suffix ? `/${suffix}` : ''}`} replace />;
}
