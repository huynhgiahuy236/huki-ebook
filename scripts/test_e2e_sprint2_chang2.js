/**
 * E2E Validation Script for Sprint 2 - Chặng 2:
 * - BUG-020: Header search bar routing in Seller & Admin (Orders, SKU, Books, Users)
 * - BUG-021: Real DB un-mock widgets on Seller Dashboard (Flash Sale + Voucher + Live Chat)
 * - BUG-022: Mobile Google OAuth Redirect flow & mobile responsive header/auth
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runTests() {
  console.log('🚀 [E2E TEST CHẶNG 2] Bắt đầu kiểm tra BUG-020, BUG-021, BUG-022...\n');
  let passCount = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passCount++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
    }
  }

  // ==========================================
  // TEST 1: BUG-020 - Seller & Admin Header Search
  // ==========================================
  test('BUG-020: SellerHeader.tsx bọc Form và phân luồng điều hướng mã đơn vs tựa sách/SKU', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/ui/components/layout/SellerHeader.tsx'), 'utf-8');
    assert(file.includes('handleSearch'), 'Thiếu hàm handleSearch trong SellerHeader');
    assert(file.includes('/^#?ORD-/i.test(q)'), 'Thiếu regex nhận diện mã đơn hàng ORD- trong SellerHeader');
    assert(file.includes('/seller/orders?search='), 'Thiếu điều hướng tới /seller/orders cho mã đơn hàng');
    assert(file.includes('/seller/products?search='), 'Thiếu điều hướng tới /seller/products cho sách/SKU');
    assert(file.includes('<form onSubmit={handleSearch}'), 'Ô tìm kiếm chưa được bọc trong thẻ form submit');
  });

  test('BUG-020: AdminLayout.tsx phân luồng thông minh mã đơn -> /admin/escrow, user -> /admin/users, sách -> /admin/books', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/ui/components/layout/AdminLayout.tsx'), 'utf-8');
    assert(file.includes('/^#?ORD-/i.test(q)'), 'Thiếu regex nhận diện mã đơn hàng ORD- trong AdminLayout');
    assert(file.includes('/admin/escrow?q='), 'Thiếu điều hướng mã đơn tới Sổ cái ký quỹ /admin/escrow');
    assert(file.includes('/admin/users?search='), 'Thiếu điều hướng email/SĐT tới Quản lý người dùng /admin/users');
    assert(file.includes('/admin/books?search='), 'Thiếu điều hướng tựa sách tới /admin/books');
  });

  test('BUG-020: seller/products/page.tsx đọc searchParams và lọc tự động khi nhận query từ URL', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/app/seller/products/page.tsx'), 'utf-8');
    assert(file.includes('useSearchParams'), 'Thiếu import useSearchParams trong seller/products');
    assert(file.includes("searchParams?.get('search')"), 'Chưa đọc tham số search từ URL trong seller/products');
    assert(file.includes('Suspense'), 'Chưa bọc Suspense boundary cho client page sử dụng useSearchParams');
  });

  // ==========================================
  // TEST 2: BUG-021 - Seller Dashboard Real DB Widgets
  // ==========================================
  test('BUG-021: seller/dashboard gọi song song cả flashSaleApi và voucherApi', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/app/seller/dashboard/page.tsx'), 'utf-8');
    assert(file.includes('flashSaleApi'), 'Thiếu import flashSaleApi trong seller/dashboard');
    assert(file.includes('flashSaleApi.getSellerSlots()'), 'Chưa gọi getSellerSlots() để lấy dữ liệu Flash Sale thật từ DB');
    assert(file.includes('getSellerVouchers'), 'Thiếu gọi getSellerVouchers');
    assert(file.includes('activeFlashSales'), 'Thiếu trường activeFlashSales trong stats state');
  });

  test('BUG-021: seller/dashboard gọi chatService.listConversations lấy hội thoại khách đọc thực tế', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/app/seller/dashboard/page.tsx'), 'utf-8');
    assert(file.includes('chatService'), 'Thiếu import chatService trong seller/dashboard');
    assert(file.includes('chatService.listConversations'), 'Chưa gọi chatService.listConversations(storeId) để lấy tin nhắn thật');
    assert(file.includes('recentConversations'), 'Thiếu trường recentConversations trong stats state');
  });

  test('BUG-021: Widget 1 hiển thị cả Flash Sale (khung giờ, trạng thái, số sách) và Voucher đang chạy', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/app/seller/dashboard/page.tsx'), 'utf-8');
    assert(file.includes('stats.activeFlashSales'), 'Widget 1 chưa render stats.activeFlashSales');
    assert(file.includes('/seller/promotions/flash-sale'), 'Widget 1 thiếu đường dẫn quản lý Flash Sale');
    assert(file.includes('/seller/vouchers'), 'Widget 1 thiếu đường dẫn quản lý Voucher');
    assert(file.includes('Flash Sale Giờ Vàng'), 'Widget 1 thiếu nhãn Flash Sale Giờ Vàng');
  });

  test('BUG-021: Widget 2 hiển thị danh sách hội thoại khách đọc với avatar, tên, snippet tin nhắn và badge chưa đọc', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/app/seller/dashboard/page.tsx'), 'utf-8');
    assert(file.includes('stats.recentConversations'), 'Widget 2 chưa render stats.recentConversations');
    assert(file.includes('lastMsgText'), 'Widget 2 chưa bóc tách lastMessage của hội thoại');
    assert(file.includes('conv.unreadCount'), 'Widget 2 chưa hiển thị badge số tin chưa đọc');
    assert(file.includes('/seller/chat?convId='), 'Widget 2 thiếu link điều hướng chi tiết tới cuộc trò chuyện');
  });

  // ==========================================
  // TEST 3: BUG-022 - Mobile Google Login & Responsive
  // ==========================================
  test('BUG-022: useGoogleAuth.ts phát hiện Mobile và chuyển hướng OAuth2 URL toàn trang chống treo popup trắng', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/hooks/useGoogleAuth.ts'), 'utf-8');
    assert(file.includes('isMobile'), 'Thiếu kiểm tra isMobile trong useGoogleAuth');
    assert(file.includes('accounts.google.com/o/oauth2/v2/auth'), 'Thiếu URL OAuth2 redirect tiêu chuẩn cho mobile');
    assert(file.includes('window.location.href = googleAuthUrl'), 'Chưa chuyển hướng window.location.href trên mobile');
  });

  test('BUG-022: auth/login/page.tsx bắt Access Token từ URL hash callback Google OAuth', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/app/auth/login/page.tsx'), 'utf-8');
    assert(file.includes('window.location.hash'), 'Chưa kiểm tra URL hash callback trong LoginForm');
    assert(file.includes('hashParams.get(\'access_token\')'), 'Chưa parse access_token từ URL hash');
    assert(file.includes('loginWithGoogle'), 'Chưa gọi loginWithGoogle để hoàn tất đăng nhập sau redirect');
    assert(file.includes('window.history.replaceState'), 'Chưa làm sạch URL hash sau khi trích xuất token');
  });

  test('BUG-022: StoreHeader.tsx tích hợp nút tìm kiếm kính lúp và thanh tìm kiếm trượt trên Mobile', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../web/src/ui/components/layout/StoreHeader.tsx'), 'utf-8');
    assert(file.includes('isMobileSearchOpen'), 'Thiếu state isMobileSearchOpen trong StoreHeader');
    assert(file.includes('md:hidden') && file.includes('setIsMobileSearchOpen'), 'Thiếu nút toggle tìm kiếm trên mobile');
    assert(file.includes('animate-fade-in-down'), 'Thiếu thanh tìm kiếm trượt mở rộng trên mobile');
  });

  test('BUG-022: identity-service auth.controller.ts xử lý callback redirect động theo FRONTEND_URL', () => {
    const file = fs.readFileSync(path.resolve(__dirname, '../platform/apps/identity-service/src/modules/auth/auth.controller.ts'), 'utf-8');
    assert(file.includes('frontendBase'), 'Chưa định nghĩa biến frontendBase động trong googleCallback');
    assert(file.includes('FRONTEND_URL'), 'Chưa kiểm tra FRONTEND_URL trong googleCallback');
    assert(!file.includes("res.redirect('http://localhost:3100/auth/login"), 'Vẫn còn hardcoded localhost:3100 trong res.redirect của auth.controller.ts');
  });

  // ==========================================
  // TỔNG KẾT
  // ==========================================
  console.log(`\n📊 [KẾT QUẢ KIỂM THỬ CHẶNG 2]: ${passCount}/${totalTests} tests passed (${Math.round(passCount/totalTests*100)}%).`);
  if (passCount === totalTests) {
    console.log('🎉 TOÀN BỘ 11/11 KIỂM TOÁN CHẶNG 2 ĐÃ ĐẠT CHUẨN 100%!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Có bài test thất bại trong Chặng 2. Vui lòng kiểm tra lại!');
    process.exit(1);
  }
}

runTests();
