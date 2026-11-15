const { spawnSync } = require('child_process');

const tests = [
  { name: 'Bug 10 (Session Location & DRM 5-Device Limit)', file: 'scripts/e2e_test_bug_10_drm_and_sessions.js' },
  { name: 'Bug 11 (Unique Phone Registration Constraint)', file: 'scripts/e2e_test_bug_11_duplicate_phone.js' },
  { name: 'Bug 12 & 13 (OSM Clean Map Tiles & MISA VAT Invoice)', file: 'scripts/e2e_test_bug_12_13_map_and_vat.js' },
];

console.log('====================================================');
console.log('       VERIFYING PHASE 3 FIXES (BUGS 9 -> 13)       ');
console.log('====================================================\n');

let allPassed = true;

for (const t of tests) {
  console.log(`>>> Running: ${t.name}...`);
  const res = spawnSync('node', [t.file], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_PATH: 'platform/node_modules' }
  });
  if (res.status !== 0) {
    console.error(`FAILED: ${t.name}`);
    allPassed = false;
    break;
  }
  console.log(`PASSED: ${t.name}\n----------------------------------------------------\n`);
}

if (!allPassed) {
  console.error('>>> PHASE 3 VERIFICATION FAILED! <<<');
  process.exitCode = 1;
} else {
  console.log('>>> ALL PHASE 3 VERIFICATIONS PASSED 100%! <<<');
  process.exitCode = 0;
}

