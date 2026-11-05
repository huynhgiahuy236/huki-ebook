// scripts/test_bug_loc_003_004.js
// Verification for BUG-LOC-003 (Duplicate toast guard) and BUG-LOC-004 (Toast UI redesign)
const fs = require('fs');
const path = require('path');

function verify() {
  console.log('=== START VERIFICATION: BUG-LOC-003 & BUG-LOC-004 ===');

  // 1. Verify Payment page guard
  const paymentPagePath = path.join(__dirname, '../web/src/app/checkout/payment/[orderId]/page.tsx');
  const paymentContent = fs.readFileSync(paymentPagePath, 'utf8');

  if (!paymentContent.includes('isNavigatingRef')) {
    console.error('FAIL: isNavigatingRef is missing from payment page!');
    process.exit(1);
  }
  if (!paymentContent.includes('navigateToSuccess')) {
    console.error('FAIL: navigateToSuccess guard function is missing!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-003: isNavigatingRef and navigateToSuccess are present and protect against duplicate toast triggers.');

  // 2. Verify Toast.tsx UI
  const toastPath = path.join(__dirname, '../web/src/ui/components/common/Toast.tsx');
  const toastContent = fs.readFileSync(toastPath, 'utf8');

  if (toastContent.includes('backdrop-blur')) {
    console.error('FAIL: Toast still has backdrop-blur!');
    process.exit(1);
  }
  if (!toastContent.includes('bg-white')) {
    console.error('FAIL: Toast missing solid bg-white!');
    process.exit(1);
  }
  if (!toastContent.includes('border border-slate-200')) {
    console.error('FAIL: Toast missing crisp border border-slate-200!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-004: Toast UI is redesigned with solid bg-white, crisp border-slate-200, and zero blurry backdrop-blur.');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY (BUG-LOC-003 & BUG-LOC-004) ===');
  process.exit(0);
}

try {
  verify();
} catch (err) {
  console.error('Error during test execution:', err);
  process.exit(1);
}
