import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route, Link, useParams } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ReaderProvider } from './context/ReaderContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Toast from './components/common/Toast';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import RouteEffects from './components/common/RouteEffects';
import AppLayout from './components/layout/AppLayout';
import SellerLayout from './components/layout/SellerLayout';
import { RequireAuth, RequireGuest, RequireSeller } from './components/auth/RouteGuards';

const page = (loader) => lazy(loader);
const HomePage = page(() => import('./pages/store/HomePage'));
const CommunityPage = page(() => import('./pages/store/CommunityPage'));
const CatalogPage = page(() => import('./pages/store/CatalogPage'));
const BookDetailPage = page(() => import('./pages/store/BookDetailPage'));
const ShopPage = page(() => import('./pages/store/ShopPage'));
const AuthorPage = page(() => import('./pages/store/AuthorPage'));
const OrderTrackingPage = page(() => import('./pages/store/OrderTrackingPage'));
const OrderReturnPage = page(() => import('./pages/store/OrderReturnPage'));
const WalletPage = page(() => import('./pages/store/WalletPage'));
const AudiobooksPage = page(() => import('./pages/store/AudiobooksPage'));
const BookClubDetailPage = page(() => import('./pages/store/BookClubDetailPage'));
const DeviceManagementPage = page(() => import('./pages/store/DeviceManagementPage'));
const LibraryPage = page(() => import('./pages/store/LibraryPage'));
const CartPage = page(() => import('./pages/store/CartPage'));
const CheckoutPage = page(() => import('./pages/store/CheckoutPage'));
const OrderSuccessPage = page(() => import('./pages/store/OrderSuccessPage'));
const ProfilePage = page(() => import('./pages/store/ProfilePage'));
const ReaderPage = page(() => import('./pages/store/ReaderPage'));
const BookPreviewPage = page(() => import('./pages/store/BookPreviewPage'));
const BookReviewsFeedPage = page(() => import('./pages/store/BookReviewsFeedPage'));
const BookQuotesPage = page(() => import('./pages/store/BookQuotesPage'));
const BookClubsDirectoryPage = page(() => import('./pages/store/BookClubsDirectoryPage'));
const CommunityPostDetailPage = page(() => import('./pages/store/CommunityPostDetailPage'));
const UserAddressesPage = page(() => import('./pages/store/UserAddressesPage'));
const UserSecurityPage = page(() => import('./pages/store/UserSecurityPage'));
const ReadingChallengePage = page(() => import('./pages/store/ReadingChallengePage'));
const OrderInvoicePage = page(() => import('./pages/store/OrderInvoicePage'));
const OrderReviewPage = page(() => import('./pages/store/OrderReviewPage'));
const LoginPage = page(() => import('./pages/auth/LoginPage'));
const RegisterPage = page(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = page(() => import('./pages/auth/ForgotPasswordPage'));
const VerifyOtpPage = page(() => import('./pages/auth/VerifyOtpPage'));
const ResetPasswordPage = page(() => import('./pages/auth/ResetPasswordPage'));
const SellerPortalPage = page(() => import('./pages/seller/SellerPortalPage'));
const SellerRegisterPage = page(() => import('./pages/seller/SellerRegisterPage'));
const SellerDashboardPage = page(() => import('./pages/seller/SellerDashboardPage'));
const SellerOrdersPage = page(() => import('./pages/seller/SellerOrdersPage'));
const SellerChatPage = page(() => import('./pages/seller/SellerChatPage'));
const SellerCreateEbook = page(() => import('./pages/seller/SellerCreateEbook'));
const SellerCreatePhysical = page(() => import('./pages/seller/SellerCreatePhysical'));
const SellerCreateHybrid = page(() => import('./pages/seller/SellerCreateHybrid'));
const SellerEditHybrid = page(() => import('./pages/seller/SellerEditHybrid'));
const SellerCorrection = page(() => import('./pages/seller/SellerCorrection'));
const EdgeCasesLibrary = page(() => import('./pages/seller/EdgeCasesLibrary'));
const MessengerPage = page(() => import('./pages/store/MessengerPage'));

const deferred = (element, label) => <DeferredFeature label={label}>{element}</DeferredFeature>;

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
                {/* Authentication is intentionally outside the commerce shell. */}
                <Route element={<RequireGuest />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={deferred(<ForgotPasswordPage />, 'Khôi phục mật khẩu')} />
                  <Route path="/verify-otp" element={<VerifyOtpPage />} />
                  <Route path="/reset-password" element={deferred(<ResetPasswordPage />, 'Đặt lại mật khẩu')} />
                </Route>

                {/* Standalone Fullscreen PDF / Ebook Reader */}
                <Route path="/read/:id" element={deferred(<ReaderPage />, 'Trình đọc Ebook')} />
                <Route path="/read" element={deferred(<ReaderPage />, 'Trình đọc Ebook')} />
                <Route path="/reader" element={deferred(<ReaderPage />, 'Trình đọc Ebook')} />

                {/* Public marketplace and community. */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/community" element={deferred(<CommunityPage />, 'Diễn đàn và cộng đồng')} />
                  <Route path="/community/reviews" element={deferred(<BookReviewsFeedPage />, 'Đánh giá cộng đồng')} />
                  <Route path="/community/quotes" element={deferred(<BookQuotesPage />, 'Kho trích dẫn')} />
                  <Route path="/community/clubs" element={deferred(<BookClubsDirectoryPage />, 'Book clubs')} />
                  <Route path="/community/club/:id" element={deferred(<BookClubDetailPage />, 'Book clubs')} />
                  <Route path="/community/club" element={<Navigate to="/community/clubs" replace />} />
                  <Route path="/community/post/:id" element={deferred(<CommunityPostDetailPage />, 'Bài viết cộng đồng')} />
                  <Route path="/community/post" element={<Navigate to="/community" replace />} />
                  <Route path="/clubs" element={<Navigate to="/community/clubs" replace />} />
                  <Route path="/club" element={<Navigate to="/community/clubs" replace />} />
                  <Route path="/challenge/2026" element={deferred(<ReadingChallengePage />, 'Thử thách đọc')} />
                  <Route path="/challenge" element={deferred(<ReadingChallengePage />, 'Thử thách đọc')} />
                  <Route path="/profile/challenge" element={deferred(<ReadingChallengePage />, 'Thử thách đọc')} />
                  <Route path="/books" element={<CatalogPage />} />
                  <Route path="/book/:id/preview" element={deferred(<BookPreviewPage />, 'Đọc thử Ebook')} />
                  <Route path="/book/:id" element={<BookDetailPage />} />
                  <Route path="/book" element={<Navigate to="/books" replace />} />
                  <Route path="/shop/:id" element={<ShopPage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/publisher/:id" element={deferred(<ShopPage />, 'Trang nhà xuất bản')} />
                  <Route path="/publisher" element={deferred(<ShopPage />, 'Trang nhà xuất bản')} />
                  <Route path="/author/:id" element={deferred(<AuthorPage />, 'Trang tác giả')} />
                  <Route path="/author" element={deferred(<AuthorPage />, 'Trang tác giả')} />
                  <Route path="/authors" element={deferred(<CatalogPage />, 'Danh bạ tác giả')} />
                  <Route path="/audiobooks" element={deferred(<AudiobooksPage />, 'Sách nói và podcast')} />
                  <Route path="/audiobook" element={<Navigate to="/audiobooks" replace />} />
                  <Route path="/audio" element={<Navigate to="/audiobooks" replace />} />
                  <Route path="/podcasts" element={<Navigate to="/audiobooks" replace />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/chat" element={deferred(<MessengerPage />, 'Chat và tin nhắn')} />
                  <Route path="/messages" element={deferred(<MessengerPage />, 'Chat và tin nhắn')} />
                  <Route path="/message" element={<Navigate to="/chat" replace />} />
                  <Route path="/seller" element={<SellerPortalPage />} />

                  {/* Authenticated customer area. */}
                  <Route element={<RequireAuth />}>
                    <Route path="/orders/:id/invoice" element={<OrderInvoicePage />} />
                    <Route path="/orders/:id/review" element={deferred(<OrderReviewPage />, 'Đánh giá sau mua')} />
                    <Route path="/orders/:id" element={<OrderTrackingPage />} />
                    <Route path="/orders" element={<OrderTrackingPage />} />
                    <Route path="/order" element={<Navigate to="/orders" replace />} />
                    <Route path="/order/:id/invoice" element={<NavigateOrderAlias suffix="invoice" />} />
                    <Route path="/order/:id/review" element={<NavigateOrderAlias suffix="review" />} />
                    <Route path="/order/tracking/:id" element={<NavigateOrderAlias />} />
                    <Route path="/order/:id/return" element={<NavigateOrderAlias suffix="return" />} />
                    <Route path="/orders/:id/return" element={deferred(<OrderReturnPage />, 'Đổi trả và hoàn tiền')} />
                    <Route path="/wallet" element={deferred(<WalletPage />, 'Ví, voucher và điểm thưởng')} />
                    <Route path="/rewards" element={<Navigate to="/wallet" replace />} />
                    <Route path="/settings" element={<Navigate to="/settings/devices" replace />} />
                    <Route path="/settings/devices" element={deferred(<DeviceManagementPage />, 'Quản lý thiết bị DRM')} />
                    <Route path="/settings/addresses" element={<UserAddressesPage />} />
                    <Route path="/settings/security" element={deferred(<UserSecurityPage />, 'Bảo mật nâng cao')} />
                    <Route path="/drm/devices" element={<Navigate to="/settings/devices" replace />} />
                    <Route path="/library" element={deferred(<LibraryPage />, 'Tủ sách số')} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order-success" element={<OrderSuccessPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/seller/register" element={<SellerRegisterPage />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Seller workspace: authenticated and role-gated. */}
                <Route element={<RequireAuth />}>
                  <Route element={<RequireSeller />}>
                    <Route element={<SellerLayout />}>
                      <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
                      <Route path="/seller/orders" element={<SellerOrdersPage />} />
                      <Route path="/seller/chat" element={deferred(<SellerChatPage />, 'Seller chat')} />
                      <Route path="/seller/products" element={<SellerEditHybrid />} />
                      <Route path="/seller/product" element={<Navigate to="/seller/products" replace />} />
                      <Route path="/seller/product/create-ebook" element={<SellerCreateEbook />} />
                      <Route path="/seller/product/create-physical" element={<SellerCreatePhysical />} />
                      <Route path="/seller/product/create-hybrid" element={<SellerCreateHybrid />} />
                      <Route path="/seller/product/edit-hybrid" element={<Navigate to="/seller/products" replace />} />
                      <Route path="/seller/product/correction" element={deferred(<SellerCorrection />, 'Quy trình sửa sản phẩm')} />
                      <Route path="/seller/edge-cases" element={deferred(<EdgeCasesLibrary />, 'Thư viện edge cases')} />
                    </Route>
                  </Route>
                </Route>
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
    <div className="min-h-[60vh] flex items-center justify-center bg-background" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-white px-5 py-3 text-sm font-semibold text-on-surface shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" aria-hidden="true" />
        Đang tải nội dung…
      </div>
    </div>
  );
}

function DeferredFeature({ label, children }) {
  return (
    <section className="relative min-h-[60vh]" aria-label={`${label} đang tạm khóa`}>
      <div className="pointer-events-none select-none opacity-25 blur-[1px]" inert={true}>
        {children}
      </div>
      <div className="pointer-events-none fixed inset-x-4 top-32 z-[60] flex justify-center" role="status">
        <div className="max-w-md rounded-2xl border border-amber-300 bg-amber-50/95 px-5 py-4 text-center shadow-xl backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-center gap-2 font-bold text-amber-900">
            <span className="material-symbols-outlined" aria-hidden="true">lock_clock</span>
            Tạm khóa để tập trung happy path
          </div>
          <p className="text-sm text-amber-800">
            {label} chưa thuộc phạm vi mua hàng COD, Admin HUKI và Admin doanh nghiệp hiện tại.
          </p>
        </div>
      </div>
    </section>
  );
}

function NavigateOrderAlias({ suffix }) {
  const { id } = useParams();
  return <Navigate to={`/orders/${id || ''}${suffix ? `/${suffix}` : ''}`} replace />;
}

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-background font-body-md py-16">
      <div className="text-center px-6">
        <div className="text-7xl font-editorial font-bold text-primary mb-4">404</div>
        <h1 className="text-2xl font-headline-md text-on-surface mb-2">Không tìm thấy trang</h1>
        <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang danh mục khác trong hệ thống.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#003b2b] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#00523c] transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Quay về Trang Chủ Sàn TMĐT
        </Link>
      </div>
    </div>
  );
}
