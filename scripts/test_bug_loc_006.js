// scripts/test_bug_loc_006.js
// Verification for BUG-LOC-006 (Remove "Đọc Thử" & Rebalance 3-column /book/[id] layout)
const fs = require('fs');
const path = require('path');

function verify() {
  console.log('=== START VERIFICATION: BUG-LOC-006 ===');

  const bookDetailPath = path.join(__dirname, '../web/src/app/book/[id]/page.tsx');
  const bookDetailContent = fs.readFileSync(bookDetailPath, 'utf8');

  if (bookDetailContent.includes('Đọc Thử Bản Trực Tuyến')) {
    console.error('FAIL: "Đọc Thử Bản Trực Tuyến" button still exists in book detail!');
    process.exit(1);
  }
  if (bookDetailContent.includes('Đọc Thử Mẫu')) {
    console.error('FAIL: "Đọc Thử Mẫu" tab still exists in book detail!');
    process.exit(1);
  }
  if (bookDetailContent.includes('grid-cols-4') && bookDetailContent.includes('Đọc thử')) {
    console.error('FAIL: Specs grid still has 4 columns with "Đọc thử"!');
    process.exit(1);
  }
  if (!bookDetailContent.includes('grid-cols-3')) {
    console.error('FAIL: 3-column specs grid not found!');
    process.exit(1);
  }
  if (!bookDetailContent.includes('Bản Quyền Chính Hãng 100%')) {
    console.error('FAIL: DRM Trust Guarantee block missing from Column 1!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-006 (book/[id]): "Đọc thử" eliminated, 3-column specs grid applied, DRM trust block rebalances column 1.');

  const previewPath = path.join(__dirname, '../web/src/app/book/[id]/preview/page.tsx');
  const previewContent = fs.readFileSync(previewPath, 'utf8');
  if (!previewContent.includes('router.replace')) {
    console.error('FAIL: preview page does not redirect cleanly!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-006 (preview redirect): Legacy preview route redirects cleanly to product detail.');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY (BUG-LOC-006) ===');
  process.exit(0);
}

try {
  verify();
} catch (err) {
  console.error('Error during test execution:', err);
  process.exit(1);
}
