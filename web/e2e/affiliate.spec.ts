import { test, expect } from '@playwright/test';

test.describe('Affiliate Marketing - Phase 1 Honest Verification (No Mock Runtime)', () => {
  test('1. Landing page (/affiliate) loads and displays program policy and preview CTA', async ({ page }) => {
    await page.goto('/affiliate');
    await expect(page.locator('h1')).toContainText('Lan Tỏa Văn Hóa Đọc');
    await expect(page.locator('text=Chương Trình Đối Tác Tiếp Thị HuKi').first()).toBeVisible();

    // Verify program notice
    await expect(page.locator('text=Thông báo chương trình')).toBeVisible();

    // Verify 3 steps
    await expect(page.locator('text=Chỉ 3 Bước Đơn Giản Để Bắt Đầu')).toBeVisible();

    // Verify FAQ
    await expect(page.locator('text=Câu Hỏi Thường Gặp (FAQ)')).toBeVisible();

    // Verify CTA button to preview registration
    const registerCta = page.locator('a[href="/account/affiliate/register"]').first();
    await expect(registerCta).toBeVisible();
    await expect(registerCta).toContainText('Xem trước mẫu đăng ký');
  });

  test('2. Registration page (/account/affiliate/register) validates steps and disables submission when API is unavailable', async ({ page }) => {
    await page.goto('/account/affiliate/register');

    // Title and status badge
    await expect(page.locator('h1')).toContainText('Đăng Ký Đối Tác Tiếp Thị (CTV)');
    await expect(page.locator('text=Chưa mở tiếp nhận')).toBeVisible();
    await expect(page.locator('text=Bước 1: Thông tin hồ sơ định danh')).toBeVisible();

    // Fill valid step 1 info
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

    // Verify submission button is disabled
    const submitBtn = page.locator('button:has-text("Nộp Hồ Sơ (Chưa Mở)")');
    await expect(submitBtn).toBeDisabled();

    // Test validation action button
    const validateBtn = page.locator('button:has-text("Kiểm tra thông tin")');
    await expect(validateBtn).toBeVisible();
  });

  test('3. Application status page (/account/affiliate/application) displays honest unactivated lookup state', async ({ page }) => {
    await page.goto('/account/affiliate/application');

    // Header and badge
    await expect(page.locator('h1')).toContainText('Tiến Độ Hồ Sơ Tiếp Thị Liên Kết');
    await expect(page.locator('text=Chưa thể tra cứu').first()).toBeVisible();

    // Honest explanation card
    await expect(page.locator('text=Chưa Thể Tải Trạng Thái Hồ Sơ')).toBeVisible();

    // SLA timeline explanation
    await expect(page.locator('text=Quy Trình Xét Duyệt Dự Kiến')).toBeVisible();

    // Verify no prototype switcher exists
    await expect(page.locator('text=Mô phỏng:')).not.toBeVisible();
  });

  test('4. Dashboard (/account/affiliate/dashboard) displays honest in-development state and 7 core KPI specifications', async ({ page }) => {
    await page.goto('/account/affiliate/dashboard');

    // Check title and badge
    await expect(page.locator('h1')).toContainText('Bảng Điều Khiển Đối Tác Tiếp Thị');
    await expect(page.locator('text=Chưa mở chính thức').first()).toBeVisible();

    // Verify honest notice
    await expect(page.locator('text=Dịch Vụ Bảng Điều Khiển Chưa Được Kích Hoạt')).toBeVisible();

    // Verify 7 KPI specification cards exist (no fake numbers)
    await expect(page.locator('text=Lượt click hợp lệ').first()).toBeVisible();
    await expect(page.locator('text=Chuyển đổi').first()).toBeVisible();
    await expect(page.locator('text=Hoa hồng chờ duyệt').first()).toBeVisible();
    await expect(page.locator('text=Đang giữ đối soát').first()).toBeVisible();
    await expect(page.locator('text=Hoa hồng khả dụng').first()).toBeVisible();
    await expect(page.locator('text=Đã thanh toán (Gross)').first()).toBeVisible();
    await expect(page.locator('text=Hoa hồng đã thu hồi').first()).toBeVisible();

    // Verify no prototype switcher exists
    await expect(page.locator('text=Chuyển đổi 7 Trạng Thái UI')).not.toBeVisible();
  });

  test('5. Route /r/[shortCode] renders honest unactivated link message (no fake redirect)', async ({ page }) => {
    await page.goto('/r/demo-link-123');

    await expect(page.locator('h1')).toContainText('Liên Kết Chưa Được Kích Hoạt');
    await expect(page.locator('text=demo-link-123')).toBeVisible();
    await expect(page.locator('text=Dịch vụ phân giải liên kết tiếp thị liên kết')).toBeVisible();
  });

  test('6. Production book detail page (/book/[id]) does not mount unconfirmed affiliate card', async ({ page }) => {
    await page.goto('/book/1');

    // Confirm that fake affiliate card is unmounted from production book detail page
    const fakeCard = page.locator('text=Chia sẻ & Nhận hoa hồng');
    await expect(fakeCard).toHaveCount(0);
  });

  test('7. Mobile Viewport (390x844): Landing page has no horizontal overflow and CTA is accessible', async ({ page }) => {
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
      expect(box.x + box.width).toBeLessThanOrEqual(390 + 5); // within viewport
    }
  });

  test('8. Mobile Viewport (390x844): Registration 4-step wizard renders and navigates without overflow', async ({ page }) => {
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
    const submitBtn = page.locator('button:has-text("Nộp Hồ Sơ (Chưa Mở)")');

    await expect(prevBtn).toBeVisible();
    await expect(validateBtn).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // Click validate on mobile
    await validateBtn.click();
    await expect(page.locator('text=Thông tin chưa hợp lệ')).toBeVisible();
  });

  test('9. Accessibility smoke test: Landmarks, headings, form labels, keyboard navigation, and button names', async ({ page }) => {
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
});
