const { spawnSync } = require('child_process');
const path = require('path');

const tests = [
  { name: 'Bug 4 & 5 (Store Query & Shop Navigation)', file: 'scripts/e2e_test_bug_04_05_store_navigation.js' },
  { name: 'Bug 6 (Seller Discounts 0/0 Books)', file: 'scripts/e2e_test_bug_06_seller_discounts.js' },
  { name: 'Bug 7 (Seller Sidebar Routes Availability)', file: 'scripts/e2e_test_bug_07_seller_sidebar_routes.js' },
  { name: 'Bug 8 (Admin Screens Audit & Escrow Auto-Release)', file: 'scripts/e2e_test_bug_08_admin_routes_audit.js' },
];

console.log('====================================================');
console.log('       VERIFYING PHASE 2 FIXES (BUGS 4 -> 8)        ');
console.log('====================================================\n');

let allPassed = true;

for (const t of tests) {
  console.log(`>>> Running: ${t.name}...`);
  const res = spawnSync('node', [t.file], { stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    console.error(`FAILED: ${t.name}`);
    allPassed = false;
    break;
  }
  console.log(`PASSED: ${t.name}\n----------------------------------------------------\n`);
}

if (!allPassed) {
  console.error('>>> PHASE 2 VERIFICATION FAILED! <<<');
  process.exitCode = 1;
} else {
  console.log('>>> ALL PHASE 2 VERIFICATIONS PASSED 100%! <<<');
  process.exitCode = 0;
}

