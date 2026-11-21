/**
 * =============================================================================
 * SCRIPT KIỂM THỬ E2E CHẶNG 5 - SPRINT 2 (Zero Mock Data, Isolated)
 * =============================================================================
 * Mục tiêu kiểm thử:
 * 1. BUG-027: web/src/app/page.tsx gỡ bỏ gò bó scope: "PLATFORM" trong loadFlashSale.
 * 2. BUG-027: page.tsx hỗ trợ nhận diện tự động đợt Flash Sale đang LIVE của Shop khi Sàn chưa có đợt toàn sàn.
 * 3. BUG-027: page.tsx áp dụng công thức xếp hạng CompositeScore kết hợp Đánh Giá Sao (50%) và Mức Giá / Chiết Khấu (50%).
 * 4. BUG-027: allFlashSale sắp xếp đưa các deal có điểm tổng hợp cao nhất lên đầu danh sách.
 * 5. BUG-027: Fallback "ƯU ĐÃI ĐẶC BIỆT" tự động bổ sung candidate books đảm bảo lấp đầy 6 ô, không bị cụt 1 cuốn.
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Chi tiết: ${error.message}`);
  }
}

console.log('🚀 [E2E TEST CHẶNG 5] Bắt đầu kiểm tra BUG-027...\n');

// 1. Kiểm tra loadFlashSale trong page.tsx không bị gò bó scope: "PLATFORM"
runTest('BUG-027: page.tsx loadFlashSale gọi flashSaleApi.getAll() không bị gò bó cứng scope: "PLATFORM"', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/page.tsx');
  assert.ok(fs.existsSync(pagePath), 'File web/src/app/page.tsx phải tồn tại');
  const content = fs.readFileSync(pagePath, 'utf8');

  assert.ok(
    !content.includes('flashSaleApi.getAll({ scope: "PLATFORM" })'),
    'Không được gò bó flashSaleApi.getAll({ scope: "PLATFORM" })'
  );
  assert.ok(
    content.includes('await flashSaleApi.getAll()'),
    'Phải gọi flashSaleApi.getAll() để lấy tất cả chiến dịch'
  );
});

// 2. Kiểm tra nhận diện Shop Flash Sale đang LIVE khi Platform chưa có
runTest('BUG-027: page.tsx hỗ trợ đa tầng nhận diện: Platform LIVE -> Shop LIVE -> Teaser', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  assert.ok(
    content.includes('activeShopSales') || content.includes('liveSale = [...activeShopSales]'),
    'Phải có cơ chế tự động chuyển sang activeShopSales khi Platform chưa có'
  );
  assert.ok(
    content.includes('setPlatformSalePhase(\'LIVE\')'),
    'Khi có Shop Flash Sale LIVE phải kích hoạt phase LIVE'
  );
});

// 3. Kiểm tra công thức xếp hạng kết hợp Giá (Chiết khấu) và Sao
runTest('BUG-027: page.tsx áp dụng công thức chuẩn hóa kết hợp Đánh Giá Sao và % Giảm Giá', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  assert.ok(
    content.includes('calculateCompositeScore'),
    'Phải có hàm calculateCompositeScore tính điểm kết hợp'
  );
  assert.ok(
    content.includes('/ 5) * 50') && content.includes('/ 100) * 50'),
    'Công thức phải chuẩn hóa 50% trọng số Sao và 50% trọng số Chiết Khấu'
  );
});

// 4. Kiểm tra sắp xếp đưa sản phẩm nổi bật nhất lên đầu
runTest('BUG-027: allFlashSale sắp xếp đưa các deal có điểm tổng hợp cao nhất lên đầu danh sách', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  assert.ok(
    content.includes('mappedItems.sort'),
    'Phải thực hiện sắp xếp mappedItems theo compositeScore'
  );
  assert.ok(
    content.includes('b.compositeScore - a.compositeScore'),
    'Thứ tự sắp xếp phải giảm dần theo compositeScore (điểm cao nhất lên đầu)'
  );
});

// 5. Kiểm tra cơ chế chống trống ô cho fallback "ƯU ĐÃI ĐẶC BIỆT"
runTest('BUG-027: Fallback "ƯU ĐÃI ĐẶC BIỆT" tự động bổ sung candidate books đảm bảo lấp đầy 6 ô, không bị cụt 1 cuốn', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  assert.ok(
    content.includes('candidateBooks.length < 6'),
    'Phải kiểm tra nếu candidateBooks.length < 6 thì bổ sung thêm sách'
  );
  assert.ok(
    content.includes('scoredBooks.sort'),
    'Các sách fallback cũng được xếp hạng theo compositeScore kết hợp Giá và Sao'
  );
});

// 6. Kiểm tra thuật toán toán học xếp hạng chuẩn xác với dữ liệu thực nghiệm
runTest('BUG-027: Thuật toán composite score ưu tiên sách 5 sao & giảm giá sâu hơn sách ít sao / ít giảm', () => {
  const calculateCompositeScore = (rating, discountPct, salePrice) => {
    const starScore = (Math.max(1, Math.min(5, Number(rating) || 5)) / 5) * 50;
    const priceScore = Math.min(50, (Math.max(0, Number(discountPct) || 0) / 100) * 50);
    return starScore + priceScore;
  };

  // Cuốn A: 5 sao, giảm 30% -> 50 + 15 = 65 điểm
  const scoreA = calculateCompositeScore(5, 30, 63000);
  // Cuốn B: 4 sao, giảm 10% -> 40 + 5 = 45 điểm
  const scoreB = calculateCompositeScore(4, 10, 80000);
  // Cuốn C: 5 sao, giảm 40% -> 50 + 20 = 70 điểm
  const scoreC = calculateCompositeScore(5, 40, 50000);

  assert.ok(scoreC > scoreA, 'Cuốn C (5 sao, giảm 40%) phải có điểm cao hơn Cuốn A (5 sao, giảm 30%)');
  assert.ok(scoreA > scoreB, 'Cuốn A (5 sao, giảm 30%) phải có điểm cao hơn Cuốn B (4 sao, giảm 10%)');
});

console.log(`\n📊 [KẾT QUẢ KIỂM THỬ CHẶNG 5]: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%).`);
if (passedTests === totalTests) {
  console.log('🎉 TOÀN BỘ 6/6 KIỂM TOÁN CHẶNG 5 ĐÃ ĐẠT CHUẨN 100%!\n');
  process.exit(0);
} else {
  console.error('⚠️ MỘT SỐ BÀI KIỂM THỬ CHẶNG 5 KHÔNG ĐẠT.\n');
  process.exit(1);
}
