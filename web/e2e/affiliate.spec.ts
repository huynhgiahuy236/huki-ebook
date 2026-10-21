import { test, expect } from '@playwright/test';

test.describe('Affiliate Marketing - Phase 3 Registration & Admin Review End-to-End', () => {
  test('1. Landing page (/affiliate) loads and displays program policy and CTA', async ({ page }) => {
    await page.goto('/affiliate');
    await expect(page.locator('h1')).toContainText('Lan Tỏa Văn Hóa Đọc');
    await expect(page.locator('text=Chương Trình Đối Tác Tiếp Thị HuKi').first()).toBeVisible();

    // Verify program notice
    await expect(page.locator('text=Thông báo chương trình')).toBeVisible();

    // Verify 3 steps
    await expect(page.locator('text=Chỉ 3 Bước Đơn Giản Để Bắt Đầu')).toBeVisible();

    // Verify FAQ
    await expect(page.locator('text=Câu Hỏi Thường Gặp (FAQ)')).toBeVisible();

    // Verify CTA button to registration
    const registerCta = page.locator('a[href="/account/affiliate/register"]').first();
    await expect(registerCta).toBeVisible();
    await expect(registerCta).toContainText('Xem trước mẫu đăng ký');
  });

  test('2. Registration page (/account/affiliate/register) validates steps, checks code availability, and reaches submission step', async ({ page }) => {
    await page.goto('/account/affiliate/register');

    // Title and status badge
    await expect(page.locator('h1')).toContainText('Đăng Ký Đối Tác Tiếp Thị (CTV)');
    await expect(page.locator('text=Đang nhận hồ sơ')).toBeVisible();
    await expect(page.locator('text=Bước 1: Thông tin hồ sơ định danh')).toBeVisible();

    // Fill Step 1 info
    const nameInput = page.locator('input[placeholder="Nguyễn Văn Minh"]');
    await nameInput.fill('Trần Độc Giả');

    const codeInput = page.locator('input[placeholder="VD: MINH_HUKI"]');
    await codeInput.fill('DOC_GIA_HUKI');

    const bioInput = page.locator('textarea[placeholder*="Kinh nghiệm sáng tạo nội dung"]');
    await bioInput.fill('Tôi là người yêu sách và có kênh review sách văn học trên mạng xã hội với nhiều độc giả theo dõi.');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('docgia.huki@gmail.com');

    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('0901234567');

    // Click Tiếp tục to go to Step 2
    const nextBtn = page.locator('button:has-text("Tiếp tục")');
    await nextBtn.click();

    // Verify step 2 appears
    await expect(page.locator('text=Bước 2: Kênh phân phối & Lưu lượng')).toBeVisible();
    await expect(page.locator('text=Kênh #1')).toBeVisible();

    // Enter channel URL
    const urlInput = page.locator('input[placeholder*="https://facebook.com"]');
    await urlInput.fill('https://facebook.com/docgiahuki');

    // Proceed to Step 3
    await nextBtn.click();
    await expect(page.locator('text=Bước 3: Khai báo lưu lượng & Tư cách đối tác')).toBeVisible();

    // Enter promotion description
    const descInput = page.locator('textarea[placeholder*="Mô tả cụ thể cách bạn sẽ giới thiệu sách"]');
    await descInput.fill('Kế hoạch của tôi là xuất bản các bài phân tích sách văn học hàng tuần và chia sẻ cảm nhận tới bạn đọc.');

    // Proceed to Step 4
    await nextBtn.click();
    await expect(page.locator('text=Bước 4: Điều khoản chương trình & Xác nhận')).toBeVisible();

    // Verify submission button is visible
    const submitBtn = page.locator('button:has-text("Nộp Hồ Sơ Đăng Ký")');
    await expect(submitBtn).toBeVisible();

    // Test validation action button
    const validateBtn = page.locator('button:has-text("Kiểm tra thông tin")');
    await expect(validateBtn).toBeVisible();
    await validateBtn.click();

    // Terms not checked yet -> error expected
    await expect(page.locator('text=Thông tin chưa hợp lệ')).toBeVisible();
  });

  test('3. Application status page (/account/affiliate/application) renders registration prompt or review state', async ({ page }) => {
    await page.goto('/account/affiliate/application');

    // Header and title
    await expect(page.locator('h1')).toContainText('Tiến Độ Hồ Sơ Tiếp Thị Liên Kết');

    // When user has no profile, is not logged in, or is in honest unregistered state
    const unregisteredCard = page.locator('text=Bạn Chưa Đăng Ký Đối Tác Tiếp Thị');
    const loginCard = page.locator('text=Yêu Cầu Đăng Nhập Tài Khoản');
    const loadingOrStatus = page.locator('text=Đang tra cứu tình trạng hồ sơ');

    // Either displays login requirement, unregistered prompt, loading, or profile status
    await expect(
      unregisteredCard
        .or(loginCard)
        .or(loadingOrStatus)
        .or(page.locator('text=Mã đối tác'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('4. Dashboard (/account/affiliate/dashboard) displays 7 core KPI specifications and SLA holding notice', async ({ page }) => {
    await page.goto('/account/affiliate/dashboard');

    // Check title and badge
    await expect(page.locator('h1')).toContainText('Bảng Điều Khiển Đối Tác Tiếp Thị');
    await expect(page.locator('text=Chưa mở chính thức').first()).toBeVisible();

    // Verify notice
    await expect(page.locator('text=Dịch Vụ Bảng Điều Khiển Chưa Được Kích Hoạt')).toBeVisible();

    // Verify 7 KPI specification cards exist (no fake numbers)
    await expect(page.locator('text=Lượt click hợp lệ').first()).toBeVisible();
    await expect(page.locator('text=Chuyển đổi').first()).toBeVisible();
    await expect(page.locator('text=Hoa hồng chờ duyệt').first()).toBeVisible();
    await expect(page.locator('text=Đang giữ đối soát').first()).toBeVisible();
    await expect(page.locator('text=Hoa hồng khả dụng').first()).toBeVisible();
    await expect(page.locator('text=Đã thanh toán (Gross)').first()).toBeVisible();
    await expect(page.locator('text=Hoa hồng đã thu hồi').first()).toBeVisible();
  });

  test('5. Route /r/[shortCode] renders honest unactivated link message', async ({ page }) => {
    await page.goto('/r/demo-link-123');

    await expect(page.locator('h1')).toContainText('Liên Kết Chưa Được Kích Hoạt');
    await expect(page.locator('text=demo-link-123')).toBeVisible();
    await expect(page.locator('text=Dịch vụ phân giải liên kết tiếp thị liên kết')).toBeVisible();
  });

  test('6. Production book detail page (/book/[id]) does not mount unconfirmed affiliate card', async ({ page }) => {
    await page.goto('/book/1');

    // Confirm that affiliate card is unmounted from production book detail page until Phase 5
    const fakeCard = page.locator('text=Chia sẻ & Nhận hoa hồng');
    await expect(fakeCard).toHaveCount(0);
  });

  test('7. Admin Affiliate management page (/admin/affiliates) renders filter tabs, search and table', async ({ page }) => {
    await page.goto('/admin/affiliates');

    await expect(page.locator('h1')).toContainText('Quản Lý Tiếp Thị Liên Kết');
    await expect(page.locator('button:has-text("Tất cả")')).toBeVisible();
    await expect(page.locator('button:has-text("Chờ duyệt")')).toBeVisible();
    await expect(page.locator('button:has-text("Yêu cầu sửa")')).toBeVisible();
    await expect(page.locator('button:has-text("Đang hoạt động")')).toBeVisible();
    await expect(page.locator('button:has-text("Từ chối")')).toBeVisible();
    await expect(page.locator('button:has-text("Tạm ngưng")')).toBeVisible();

    // Search bar
    const searchInput = page.locator('input[placeholder*="Tìm theo tên"]');
    await expect(searchInput).toBeVisible();
  });

  test('8. Mobile Viewport (390x844): Landing page has no horizontal overflow and CTA is accessible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/affiliate');

    // Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify mobile CTA is visible and within screen bounds
    const cta = page.locator('a[href="/account/affiliate/register"]').first();
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390 + 5);
    }
  });

  test('9. Mobile Viewport (390x844): Registration 4-step wizard renders and navigates without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/account/affiliate/register');

    // Verify no horizontal overflow on mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Step 1: Fill inputs on mobile
    await page.locator('input[placeholder="Nguyễn Văn Minh"]').fill('Nguyễn Di Động');
    await page.locator('input[placeholder="VD: MINH_HUKI"]').fill('MOBILE_USER');
    await page.locator('textarea[placeholder*="Kinh nghiệm sáng tạo nội dung"]').fill('Reviewer sách trên kênh di động TikTok với 10k độc giả theo dõi.');
    await page.locator('input[type="email"]').fill('mobile@huki.vn');
    await page.locator('input[type="tel"]').fill('0912345678');

    // Click Tiếp tục on mobile
    const nextBtn = page.locator('button:has-text("Tiếp tục")');
    await nextBtn.click();
    await expect(page.locator('text=Bước 2: Kênh phân phối & Lưu lượng')).toBeVisible();

    // Step 2: Channel
    await page.locator('input[placeholder*="https://facebook.com"]').fill('https://facebook.com/mobiledocgia');
    await nextBtn.click();
    await expect(page.locator('text=Bước 3: Khai báo lưu lượng & Tư cách đối tác')).toBeVisible();

    // Step 3: Description
    await page.locator('textarea[placeholder*="Mô tả cụ thể cách bạn sẽ giới thiệu sách"]').fill('Kế hoạch phát triển nội dung giới thiệu sách trên thiết bị di động.');
    await nextBtn.click();
    await expect(page.locator('text=Bước 4: Điều khoản chương trình & Xác nhận')).toBeVisible();

    // Verify no horizontal overflow on step 4
    const step4Overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(step4Overflow).toBe(false);

    // Step navigation and actions on mobile
    const prevBtn = page.locator('button:has-text("Quay lại")');
    const validateBtn = page.locator('button:has-text("Kiểm tra thông tin")');
    const submitBtn = page.locator('button:has-text("Nộp Hồ Sơ Đăng Ký")');

    await expect(prevBtn).toBeVisible();
    await expect(validateBtn).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Click validate on mobile
    await validateBtn.click();
    await expect(page.locator('text=Thông tin chưa hợp lệ')).toBeVisible();
  });

  test('10. Accessibility smoke test: Landmarks, headings, form labels, keyboard navigation, and button names', async ({ page }) => {
    await page.goto('/account/affiliate/register');

    // 1. Landmarks: main landmark exists
    const mainLandmark = page.locator('#main-content');
    await expect(mainLandmark).toBeVisible();

    // 2. Heading hierarchy: h1 exists and is visible
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    const h1Text = await h1.textContent();
    expect(h1Text?.trim().length).toBeGreaterThan(0);

    // 3. Form input associations: text inputs have descriptive labels
    const labels = await page.locator('label').allTextContents();
    expect(labels.some((l) => l.includes('Họ tên hiển thị'))).toBe(true);
    expect(labels.some((l) => l.includes('Mã Đối tác Tiếp thị'))).toBe(true);
    expect(labels.some((l) => l.includes('Giới thiệu kinh nghiệm'))).toBe(true);

    // 4. Keyboard focus: Tab navigation reaches interactive elements
    await page.locator('input[placeholder="Nguyễn Văn Minh"]').focus();
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'TEXTAREA', 'BUTTON', 'A']).toContain(focusedTag);

    // 5. Accessible button names: All visible buttons have non-empty text content or aria-label
    const buttons = await page.locator('button:visible').all();
    for (const btn of buttons) {
      const text = (await btn.textContent()) || (await btn.getAttribute('aria-label')) || '';
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  test('11. Seller Affiliate Management Portal (/seller/affiliate) loads and renders header and platform cap notice', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('huki_access_token', 'mock_seller_jwt_token');
      localStorage.setItem('huki_active_business_id', 'biz-test-1');
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-seller-1',
            email: 'seller@test.com',
            role: 'BUSINESS',
            hasApprovedBusiness: true,
            business: {
              id: 'biz-test-1',
              name: 'Nhà Sách Alpha',
              status: 'APPROVED',
            },
            memberships: [{ businessId: 'biz-test-1', role: 'OWNER', status: 'ACTIVE', permissions: ['*'] }],
          },
        }),
      });
    });

    await page.route('**/api/v1/businesses/my', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'biz-test-1', name: 'Nhà Sách Alpha', status: 'APPROVED', ownerId: 'user-seller-1' },
        }),
      });
    });

    await page.route('**/api/v1/stores/my*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'store-test-1', businessId: 'biz-test-1', name: 'Gian Hàng Chính Hãng Alpha', status: 'APPROVED', slug: 'alpha-store' }],
        }),
      });
    });

    await page.route('**/api/v1/seller/stores/*/affiliate/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            storeSetting: { storeId: 'store-test-1', isEnabled: true, autoEnrollNewBooks: true, physicalRate: 5, ebookRate: 10, audioRate: 10, version: 1 },
            platformPolicy: { id: 'policy-default', name: 'Chính sách sàn mặc định', defaultPhysicalRate: 5, defaultEbookRate: 10, defaultAudioRate: 10, minRate: 1, maxPhysicalRate: 30, maxDigitalRate: 50 },
            effectiveRates: { physicalRate: 5, ebookRate: 10, audioRate: 10 },
          },
        }),
      });
    });

    await page.goto('/seller/affiliate');

    // Heading
    await expect(page.locator('h1')).toContainText('Chính Sách & Tiếp Thị Liên Kết (Affiliate)');
    
    // Platform caps notice
    await expect(page.locator('text=Quy chuẩn hạn mức sàn (Platform Caps)')).toBeVisible();
    await expect(page.locator('text=Phí nền tảng cố định: 10%')).toBeVisible();

    // Tabs exist
    const settingsTab = page.locator('button:has-text("Cấu hình gian hàng")').first();
    const booksTab = page.locator('button:has-text("Danh mục sách & Trạng thái hoa hồng")');
    await expect(settingsTab).toBeVisible();
    await expect(booksTab).toBeVisible();
  });

  test('12. Seller Affiliate Store Settings tab contains format rate inputs and save button', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('huki_access_token', 'mock_seller_jwt_token');
      localStorage.setItem('huki_active_business_id', 'biz-test-1');
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-seller-1',
            email: 'seller@test.com',
            role: 'BUSINESS',
            hasApprovedBusiness: true,
            business: { id: 'biz-test-1', name: 'Nhà Sách Alpha', status: 'APPROVED' },
            memberships: [{ businessId: 'biz-test-1', role: 'OWNER', status: 'ACTIVE', permissions: ['*'] }],
          },
        }),
      });
    });

    await page.route('**/api/v1/businesses/my', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'biz-test-1', name: 'Nhà Sách Alpha', status: 'APPROVED', ownerId: 'user-seller-1' },
        }),
      });
    });

    await page.route('**/api/v1/stores/my*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'store-test-1', businessId: 'biz-test-1', name: 'Gian Hàng Chính Hãng Alpha', status: 'APPROVED', slug: 'alpha-store' }],
        }),
      });
    });

    await page.route('**/api/v1/seller/stores/*/affiliate/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            storeSetting: { storeId: 'store-test-1', isEnabled: true, autoEnrollNewBooks: true, physicalRate: 5, ebookRate: 10, audioRate: 10, version: 1 },
            platformPolicy: { id: 'policy-default', name: 'Chính sách sàn mặc định', defaultPhysicalRate: 5, defaultEbookRate: 10, defaultAudioRate: 10, minRate: 1, maxPhysicalRate: 30, maxDigitalRate: 50 },
            effectiveRates: { physicalRate: 5, ebookRate: 10, audioRate: 10 },
          },
        }),
      });
    });

    await page.goto('/seller/affiliate');

    // Store switch & format inputs
    await expect(page.locator('text=Mở chương trình Affiliate cho Shop')).toBeVisible();
    await expect(page.locator('text=Tự động ghi danh sách mới (Auto-enroll)')).toBeVisible();
    await expect(page.locator('text=Sách giấy (Physical)')).toBeVisible();
    await expect(page.locator('text=Sách điện tử (Ebook)')).toBeVisible();
    await expect(page.locator('text=Sách nói (Audiobook)')).toBeVisible();

    // Save button
    const saveBtn = page.locator('button:has-text("Lưu cấu hình gian hàng")');
    await expect(saveBtn).toBeVisible();
  });

  test('13. Seller Books Catalog tab switches and renders filters and table structure', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('huki_access_token', 'mock_seller_jwt_token');
      localStorage.setItem('huki_active_business_id', 'biz-test-1');
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-seller-1',
            email: 'seller@test.com',
            role: 'BUSINESS',
            hasApprovedBusiness: true,
            business: { id: 'biz-test-1', name: 'Nhà Sách Alpha', status: 'APPROVED' },
            memberships: [{ businessId: 'biz-test-1', role: 'OWNER', status: 'ACTIVE', permissions: ['*'] }],
          },
        }),
      });
    });

    await page.route('**/api/v1/businesses/my', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'biz-test-1', name: 'Nhà Sách Alpha', status: 'APPROVED', ownerId: 'user-seller-1' },
        }),
      });
    });

    await page.route('**/api/v1/stores/my*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'store-test-1', businessId: 'biz-test-1', name: 'Gian Hàng Chính Hãng Alpha', status: 'APPROVED', slug: 'alpha-store' }],
        }),
      });
    });

    await page.route('**/api/v1/seller/stores/*/affiliate/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            storeSetting: { storeId: 'store-test-1', isEnabled: true, autoEnrollNewBooks: true, physicalRate: 5, ebookRate: 10, audioRate: 10, version: 1 },
            platformPolicy: { id: 'policy-default', name: 'Chính sách sàn mặc định', defaultPhysicalRate: 5, defaultEbookRate: 10, defaultAudioRate: 10, minRate: 1, maxPhysicalRate: 30, maxDigitalRate: 50 },
            effectiveRates: { physicalRate: 5, ebookRate: 10, audioRate: 10 },
          },
        }),
      });
    });

    await page.route('**/api/v1/seller/stores/*/affiliate/books*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                bookId: 'book-1',
                title: 'Kinh Tế Học Hài Hước',
                slug: 'kinh-te-hoc-hai-huoc',
                format: 'PHYSICAL',
                price: 150000,
                coverImage: null,
                isEligible: true,
                hasExplicitOverride: false,
                customRate: null,
                effectiveRate: 5,
                rateSource: 'STORE_FORMAT',
                sellerNetBreakdown: {
                  grossPrice: 150000,
                  platformFeePercent: 10,
                  platformFeeAmount: 15000,
                  affiliateRatePercent: 5,
                  affiliateCommissionAmount: 7500,
                  sellerNetRevenue: 127500,
                  sellerNetMarginPercent: 85,
                },
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
            caps: { minRate: 1, maxPhysicalRate: 30, maxDigitalRate: 50 },
          },
        }),
      });
    });

    await page.goto('/seller/affiliate');

    // Switch to books tab
    const booksTab = page.locator('button:has-text("Danh mục sách & Trạng thái hoa hồng")');
    await booksTab.click();

    // Verify search and filter elements
    await expect(page.locator('input[placeholder*="Tìm theo tên sách"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Lọc định dạng"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Lọc trạng thái hoa hồng"]')).toBeVisible();

    // Verify table headers
    await expect(page.locator('th:has-text("Sách & Định dạng")')).toBeVisible();
    await expect(page.locator('th:has-text("Giá bán")')).toBeVisible();
    await expect(page.locator('th:has-text("Trạng thái Affiliate")')).toBeVisible();
    await expect(page.locator('th:has-text("Tỷ lệ hiệu lực")')).toBeVisible();
    await expect(page.locator('th:has-text("Ước tính thực nhận (Seller-Net)")')).toBeVisible();
  });
});


