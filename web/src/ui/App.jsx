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
import CheckoutLayout from './components/layout/CheckoutLayout';
import SellerPortalLayout from './components/layout/SellerPortalLayout';
import SellerLayout from './components/layout/SellerLayout';
import AdminLayout from './components/layout/AdminLayout';
import { RequireAuth, RequireGuest, RequireSeller, RequireAdmin } from './components/auth/RouteGuards';

const page = (loader) => lazy(loader);
const HomePage = page(() => import('./pages/store/HomePage'));
const CatalogPage = page(() => import('./pages/store/CatalogPage'));
const BookDetailPage = page(() => import('./pages/store/BookDetailPage'));
const ShopPage = page(() => import('./pages/store/ShopPage'));
const StoresPage = page(() => import('./pages/store/StoresPage'));
const OrderTrackingPage = page(() => import('./pages/store/OrderTrackingPage'));
const CartPage = page(() => import('./pages/store/CartPage'));
const CheckoutPage = page(() => import('./pages/store/CheckoutPage'));
const OrderSuccessPage = page(() => import('./pages/store/OrderSuccessPage'));
const ProfilePage = page(() => import('./pages/store/ProfilePage'));
const UserAddressesPage = page(() => import('./pages/store/UserAddressesPage'));
const LoginPage = page(() => import('./pages/auth/LoginPage'));
const RegisterPage = page(() => import('./pages/auth/RegisterPage'));
const VerifyOtpPage = page(() => import('./pages/auth/VerifyOtpPage'));
const ChangePasswordPage = page(() => import('./pages/auth/ChangePasswordPage'));
const SellerPortalPage = page(() => import('./pages/seller/SellerPortalPage'));
const SellerRegisterPage = page(() => import('./pages/seller/SellerRegisterPage'));
const SellerDashboardPage = page(() => import('./pages/seller/SellerDashboardPage'));
const SellerOrdersPage = page(() => import('./pages/seller/SellerOrdersPage'));
const SellerStoresPage = page(() => import('./pages/seller/SellerStoresPage'));
const SellerCreateEbook = page(() => import('./pages/seller/SellerCreateEbook'));
const SellerEditHybrid = page(() => import('./pages/seller/SellerEditHybrid'));
const AdminDashboardPage = page(() => import('./pages/admin/AdminDashboardPage'));
const AdminPublishersPage = page(() => import('./pages/admin/AdminPublishersPage'));

const deferred = (label) => <DeferredFeature label={label} />;

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <ReaderProvider>
            <BrowserRouter>
              <RouteEffects />
              <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:shadow-lg">
                Bỏ qua điều hướng
              </a>
              <AppErrorBoundary>
              <Suspense fallback={<PageLoading />}>
              <Routes>
                {/* 1. KHU VỰC XÁC THỰC: Độc lập ngoài sàn TMĐT */}
                <Route element={<RequireGuest />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={deferred('Khôi phục mật khẩu tự phục vụ')} />
                  <Route path="/verify-otp" element={<VerifyOtpPage />} />
                  <Route path="/reset-password" element={deferred('Đặt lại mật khẩu tự phục vụ')} />
                </Route>

                {/* 2. KHU VỰC TRÌNH ĐỌC SÁCH FULLSCREEN & STANDALONE (Tách biệt hoàn toàn) */}
                <Route path="/read/:id" element={deferred('WebReader và DRM')} />
                <Route path="/read" element={deferred('WebReader và DRM')} />
                <Route path="/reader" element={deferred('WebReader và DRM')} />
                <Route path="/book/:id/preview" element={deferred('Đọc thử Ebook và DRM')} />

                {/* 3. KHU VỰC CHAT TOÀN MÀN HÌNH (Full-height Messenger Workspace) */}
                <Route path="/chat" element={deferred('Chat và tin nhắn realtime')} />
                <Route path="/messages" element={deferred('Chat và tin nhắn realtime')} />
                <Route path="/message" element={<Navigate to="/chat" replace />} />

                {/* 4. KHU VỰC HÓA ĐƠN VAT CHUẨN IN ẤN A4 (Standalone Minimal View) */}
                <Route element={<RequireAuth />}>
                  <Route path="/orders/:id/invoice" element={deferred('Hóa đơn VAT mở rộng')} />
                  <Route path="/order/:id/invoice" element={<NavigateOrderAlias suffix="invoice" />} />
                </Route>

                {/* 5. KHU VỰC THANH TOÁN (Distraction-Free: Không Mega Sidebar) */}
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
                  <Route path="/community" element={deferred('Cộng đồng và diễn đàn')} />
                  <Route path="/community/reviews" element={deferred('Đánh giá cộng đồng')} />
                  <Route path="/community/quotes" element={deferred('Kho trích dẫn')} />
                  <Route path="/community/clubs" element={deferred('Book clubs')} />
                  <Route path="/community/club/:id" element={deferred('Book clubs')} />
                  <Route path="/community/club" element={<Navigate to="/community/clubs" replace />} />
                  <Route path="/community/post/:id" element={deferred('Bài viết cộng đồng')} />
                  <Route path="/community/post" element={<Navigate to="/community" replace />} />
                  <Route path="/clubs" element={<Navigate to="/community/clubs" replace />} />
                  <Route path="/club" element={<Navigate to="/community/clubs" replace />} />
                  <Route path="/challenge/2026" element={deferred('Thử thách đọc sách')} />
                  <Route path="/challenge" element={deferred('Thử thách đọc sách')} />
                  <Route path="/profile/challenge" element={deferred('Thử thách đọc sách')} />
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
                  <Route path="/publisher/:id" element={deferred('Trang nhà xuất bản riêng')} />
                  <Route path="/publisher" element={deferred('Trang nhà xuất bản riêng')} />
                  <Route path="/author/:id" element={deferred('Trang tác giả riêng')} />
                  <Route path="/author" element={deferred('Trang tác giả riêng')} />
                  <Route path="/authors" element={deferred('Danh bạ tác giả')} />
                  <Route path="/audiobooks" element={deferred('Sách nói và podcast')} />
                  <Route path="/audiobook" element={<Navigate to="/audiobooks" replace />} />
                  <Route path="/audio" element={<Navigate to="/audiobooks" replace />} />
                  <Route path="/podcasts" element={<Navigate to="/audiobooks" replace />} />
                  <Route path="/cart" element={<CartPage />} />

                  {/* Authenticated customer profile & orders */}
                  <Route element={<RequireAuth />}>
                    <Route path="/orders/:id/review" element={deferred('Đánh giá sau mua')} />
                    <Route path="/orders/:id" element={<OrderTrackingPage />} />
                    <Route path="/orders" element={<OrderTrackingPage />} />
                    <Route path="/order" element={<Navigate to="/orders" replace />} />
                    <Route path="/order/:id/review" element={<NavigateOrderAlias suffix="review" />} />
                    <Route path="/order/tracking/:id" element={<NavigateOrderAlias />} />
                    <Route path="/order/:id/return" element={<NavigateOrderAlias suffix="return" />} />
                    <Route path="/orders/:id/return" element={deferred('Đổi trả và hoàn tiền')} />
                    <Route path="/wallet" element={deferred('Ví và điểm thưởng')} />
                    <Route path="/rewards" element={<Navigate to="/wallet" replace />} />
                    <Route path="/settings" element={<Navigate to="/settings/devices" replace />} />
                    <Route path="/settings/devices" element={deferred('Quản lý thiết bị DRM')} />
                    <Route path="/settings/addresses" element={<UserAddressesPage />} />
                    <Route path="/settings/security" element={deferred('Bảo mật và phiên đăng nhập nâng cao')} />
                    <Route path="/drm/devices" element={<Navigate to="/settings/devices" replace />} />
                    <Route path="/library" element={deferred('Tủ sách số và DRM')} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>
                </Route>

                {/* 8. KHU VỰC QUẢN TRỊ NGƯỜI BÁN ĐÃ DUYỆT (SellerLayout chuẩn) */}
                <Route element={<RequireAuth />}>
                  <Route element={<RequireSeller />}>
                    <Route element={<SellerLayout />}>
                      <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
                      <Route path="/seller/orders" element={<SellerOrdersPage />} />
                      <Route path="/seller/stores" element={<SellerStoresPage />} />
                      <Route path="/seller/stores/new" element={<SellerStoresPage />} />
                      <Route path="/seller/chat" element={deferred('Seller chat')} />
                      <Route path="/seller/products" element={<SellerEditHybrid />} />
                      <Route path="/seller/product" element={<Navigate to="/seller/products" replace />} />
                      <Route path="/seller/product/create-ebook" element={<SellerCreateEbook />} />
                      <Route path="/seller/product/create-physical" element={<SellerCreateEbook />} />
                      <Route path="/seller/product/create-hybrid" element={<SellerCreateEbook />} />
                      <Route path="/seller/product/edit-hybrid" element={<Navigate to="/seller/products" replace />} />
                      <Route path="/seller/product/correction" element={deferred('Quy trình sửa sản phẩm mở rộng')} />
                      <Route path="/seller/edge-cases" element={deferred('Thư viện edge cases')} />
                    </Route>
                  </Route>
                </Route>

                {/* 9. KHU VỰC SUPER ADMIN CRM DASHBOARD (AdminLayout chuẩn Edge-to-Edge Full Screen) */}
                <Route element={<RequireAuth />}>
                  <Route path="/change-password" element={<ChangePasswordPage />} />
                  <Route element={<RequireAdmin />}>
                    <Route element={<AdminLayout />}>
                      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                      <Route path="/admin/publishers" element={<AdminPublishersPage />} />
                      <Route path="/admin/companies" element={<AdminPublishersPage />} />
                      <Route path="/admin/businesses" element={<AdminPublishersPage />} />
                      <Route path="/admin/stores" element={<AdminPublishersPage />} />
                      <Route path="/admin/leads" element={<AdminPublishersPage />} />
                      <Route path="/admin/tasks" element={deferred('Hàng đợi kiểm duyệt')} />
                      <Route path="/admin/moderation" element={deferred('Hàng đợi kiểm duyệt')} />
                      <Route path="/admin/drm" element={deferred('Quản trị DRM')} />
                      <Route path="/admin/users" element={deferred('Quản trị người dùng mở rộng')} />
                      <Route path="/admin/contacts" element={deferred('CRM contacts mở rộng')} />
                      <Route path="/admin/deals" element={deferred('Đối soát doanh thu mở rộng')} />
                      <Route path="/admin/finance" element={deferred('Tài chính mở rộng')} />
                      <Route path="/admin/reports" element={deferred('Báo cáo và moderation')} />
                      <Route path="/admin/automation" element={deferred('Banner, voucher và flash sale')} />
                      <Route path="/admin/marketing" element={deferred('Promotion và marketing')} />
                      <Route path="/admin/calendar" element={deferred('Lịch vận hành mở rộng')} />
                      <Route path="/admin/integrations" element={deferred('Tích hợp hệ thống mở rộng')} />
                      <Route path="/admin/settings" element={deferred('Cài đặt hệ thống mở rộng')} />
                      <Route path="/admin/support" element={deferred('Support operations mở rộng')} />
                    </Route>
                  </Route>
                </Route>

                {/* 10. ROOT STANDALONE 404 NOT FOUND */}
                <Route path="*" element={<NotFound />} />
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

function DeferredFeature({ label }) {
  return (
    <section
      className="min-h-[60vh] bg-background px-4 py-14 flex items-center justify-center"
      aria-labelledby="deferred-feature-title"
    >
      <div className="w-full max-w-lg rounded-3xl border border-amber-300 bg-amber-50 p-6 text-center shadow-sm sm:p-8">
        <span
          className="material-symbols-outlined mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-3xl text-amber-800"
          aria-hidden="true"
        >
          lock_clock
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
          Ngoài happy case hiện tại
        </p>
        <h1 id="deferred-feature-title" className="mt-2 font-editorial text-3xl font-bold text-amber-950">
          {label} đang tạm khóa
        </h1>
        <p className="mt-3 text-sm leading-6 text-amber-900/80">
          Tính năng này được tài liệu dự án phân loại là DEFERRED. Giao diện được giữ làm tham chiếu thiết kế nhưng chưa cho phép người dùng thao tác.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003b2b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#00523c]">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">home</span>
            Về trang chủ
          </Link>
          <Link to="/books" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">menu_book</span>
            Xem danh mục sách
          </Link>
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
    <div className="min-h-screen bg-[#0B1320] text-white flex items-center justify-center p-6 select-none font-sans">
      <div className="text-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl">travel_explore</span>
        </div>
        <div className="text-7xl font-editorial font-bold text-emerald-400 mb-3 tracking-tight">404</div>
        <h1 className="text-2xl font-bold text-white mb-2 font-editorial">Không Tìm Thấy Trang Yêu Cầu</h1>
        <p className="text-gray-400 text-xs sm:text-sm mb-8 leading-relaxed">
          Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được chuyển sang danh mục khác trong hệ sinh thái HUKI Ebook.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-[#00875A] hover:bg-[#00734c] text-white px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            Về Trang Chủ Sàn TMĐT
          </Link>
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-bold text-xs transition-colors border border-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Super Admin
          </Link>
          <Link
            to="/seller/dashboard"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-bold text-xs transition-colors border border-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">store</span>
            Kênh Người Bán NXB
          </Link>
        </div>
      </div>
    </div>
  );
}
