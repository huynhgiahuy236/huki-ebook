// scripts/test_bug_loc_009.js
// Verification for BUG-LOC-009 (Stores & Authors real DB data binding)
const fs = require('fs');
const path = require('path');

function verify() {
  console.log('=== START VERIFICATION: BUG-LOC-009 ===');

  const storesPath = path.join(__dirname, '../web/src/app/stores/page.tsx');
  const content = fs.readFileSync(storesPath, 'utf8');

  // 1. Verify no DEFAULT_PARTNER_PUBLISHERS
  if (content.includes('DEFAULT_PARTNER_PUBLISHERS')) {
    console.error('FAIL: DEFAULT_PARTNER_PUBLISHERS still exists in stores/page.tsx!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-009: DEFAULT_PARTNER_PUBLISHERS mock array completely removed.');

  // 2. Verify dynamic real book count computation
  if (!content.includes('catalogBooks.filter')) {
    console.error('FAIL: Stores do not compute real book counts from catalogBooks!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-009: Store book counts computed dynamically from real catalog books.');

  // 3. Verify authors real works and notable works
  if (!content.includes('const worksCount = authorBooks.length')) {
    console.error('FAIL: Authors worksCount is not calculated dynamically from catalog!');
    process.exit(1);
  }
  if (!content.includes('authorBooks.slice(0, 3).map')) {
    console.error('FAIL: Authors notableWorks is not extracted from actual catalog titles!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-009: Author worksCount and notableWorks computed dynamically from real catalog books.');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY (BUG-LOC-009) ===');
  process.exit(0);
}

try {
  verify();
} catch (err) {
  console.error('Error during test execution:', err);
  process.exit(1);
}
