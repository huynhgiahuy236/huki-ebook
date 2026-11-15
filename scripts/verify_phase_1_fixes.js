/**
 * Verification Runner: Phase 1 (Bugs 1, 2, 3)
 */

const { execSync } = require('child_process');

console.log('====================================================');
console.log('🚀 RUNNING ALL E2E TESTS FOR PHASE 1 (BUGS 1 -> 3)');
console.log('====================================================\n');

const tests = [
  { name: 'Bug 1: Hydration Mismatch', script: 'scripts/e2e_test_bug_01_hydration.js' },
  { name: 'Bug 2: Publisher & Partner Official Logos', script: 'scripts/e2e_test_bug_02_avatars.js' },
  { name: 'Bug 3: Anti-Fraud Self-Purchase Prohibition', script: 'scripts/e2e_test_bug_03_anti_fraud_checkout.js' },
];

let allPassed = true;

for (const test of tests) {
  console.log(`\n▶️ Executing: ${test.name}...`);
  try {
    const output = execSync(`node ${test.script}`, { encoding: 'utf8' });
    console.log(output);
    console.log(`✅ [PASS] ${test.name}\n`);
  } catch (err) {
    console.error(`❌ [FAIL] ${test.name}:`, err.stdout || err.message);
    allPassed = false;
    break;
  }
}

if (allPassed) {
  console.log('====================================================');
  console.log('🎉 PHASE 1 (BUGS 1 - 3) FULLY VERIFIED & PASSED!');
  console.log('====================================================');
  process.exit(0);
} else {
  console.error('❌ PHASE 1 VERIFICATION FAILED.');
  process.exit(1);
}

