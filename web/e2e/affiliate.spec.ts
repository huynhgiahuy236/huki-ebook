import { test, expect } from '@playwright/test';

test.describe('Affiliate Marketing - Phase 1 Honest Verification (No Mock Runtime)', () => {
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

    // Verify CTA button to register preview
    const registerCta = page.locator('a[href="/account/affiliate/register"]');
    await expect(registerCta.first()).toBeVisible();
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
    const submitBtn = page.locator('button:has-text("Nộp Hồ Sơ (Chưa Kích Hoạt)")');
    await expect(submitBtn).toBeDisabled();

    // Test Zod validation action button
    const validateBtn = page.locator('button:has-text("Kiểm Tra Tính Hợp Lệ (Zod Contract)")');
    await expect(validateBtn).toBeVisible();
  });

  test('3. Application status page (/account/affiliate/application) displays honest unactivated state without fake profile', async ({ page }) => {
    await page.goto('/account/affiliate/application');

    // Header and badge
    await expect(page.locator('h1')).toContainText('Tiến Độ Hồ Sơ Tiếp Thị Liên Kết');
    await expect(page.locator('text=Chưa có hồ sơ').first()).toBeVisible();

    // Honest explanation card
    await expect(page.locator('text=Chưa Tìm Thấy Hồ Sơ Đăng Ký')).toBeVisible();

    // SLA timeline explanation
    await expect(page.locator('text=Quy Trình Xét Duyệt Tiêu Chuẩn')).toBeVisible();

    // Verify no prototype switcher exists
    await expect(page.locator('text=Mô phỏng:')).not.toBeVisible();
  });

  test('4. Dashboard (/account/affiliate/dashboard) displays honest in-development state and 7 core KPI specifications', async ({ page }) => {
    await page.goto('/account/affiliate/dashboard');

    // Check title and in-development badge
    await expect(page.locator('h1')).toContainText('Bảng Điều Khiển Đối Tác Tiếp Thị');
    await expect(page.locator('text=Đang phát triển').first()).toBeVisible();

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
});
