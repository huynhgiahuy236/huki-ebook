// scripts/test_bug_loc_008.js
// Verification for BUG-LOC-008 (Flash Sale card sizing scaled to store standards)
const fs = require('fs');
const path = require('path');

function verify() {
  console.log('=== START VERIFICATION: BUG-LOC-008 ===');

  const flashSalePath = path.join(__dirname, '../web/src/app/flash-sale/page.tsx');
  const content = fs.readFileSync(flashSalePath, 'utf8');

  // Verify grid density
  if (!content.includes('grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-3.5')) {
    console.error('FAIL: Platform flash sale grid is not using 6-column store density!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-008: Platform flash sale grid scaled to 6-column store density.');

  // Verify compact padding and sizing
  if (!content.includes('p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-2')) {
    console.error('FAIL: Platform flash sale cards still have oversized padding!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-008: Flash sale card body padding scaled down to compact p-2.5 sm:p-3.');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY (BUG-LOC-008) ===');
  process.exit(0);
}

try {
  verify();
} catch (err) {
  console.error('Error during test execution:', err);
  process.exit(1);
}
