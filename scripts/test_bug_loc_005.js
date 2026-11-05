// scripts/test_bug_loc_005.js
// Verification for BUG-LOC-005 (BookCard Wishlist & Cart button, Header Actions standardization)
const fs = require('fs');
const path = require('path');

function verify() {
  console.log('=== START VERIFICATION: BUG-LOC-005 ===');

  // 1. Verify BookCard.tsx
  const bookCardPath = path.join(__dirname, '../web/src/ui/components/common/BookCard.tsx');
  const bookCardContent = fs.readFileSync(bookCardPath, 'utf8');

  if (bookCardContent.includes('absolute bottom-2 right-2')) {
    console.error('FAIL: BookCard still positions wishlist at bottom-2 right-2!');
    process.exit(1);
  }
  if (!bookCardContent.includes('absolute top-1.5 right-1.5')) {
    console.error('FAIL: BookCard missing top-1.5 right-1.5 position for wishlist!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-005 (BookCard): Wishlist heart is moved to top-1.5 right-1.5, away from cover stickers.');

  // 2. Verify StoreHeader.tsx
  const headerPath = path.join(__dirname, '../web/src/ui/components/layout/StoreHeader.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');

  if (!headerContent.includes('w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-xl border border-slate-200')) {
    console.error('FAIL: StoreHeader missing standardized 38x38 rounded-xl button containers!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-005 (StoreHeader): Action buttons standardized to uniform 38x38 rounded-xl containers.');

  // 3. Verify UniversalNotificationBell.tsx
  const bellPath = path.join(__dirname, '../web/src/ui/components/common/UniversalNotificationBell.tsx');
  const bellContent = fs.readFileSync(bellPath, 'utf8');

  if (!bellContent.includes('w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-xl border border-slate-200')) {
    console.error('FAIL: UniversalNotificationBell button size does not match StoreHeader form factor!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-005 (UniversalNotificationBell): Notification bell matches Header standard dimensions.');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY (BUG-LOC-005) ===');
  process.exit(0);
}

try {
  verify();
} catch (err) {
  console.error('Error during test execution:', err);
  process.exit(1);
}
