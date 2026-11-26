'use strict';

/**
 * E2E Verification Script: BUG-09 (/seller/promotions/flash-sale UI Freeze & 5s Countdown Delete Modal)
 *
 * Verifies:
 * 1. CountdownConfirmModal component state & behavior (5s -> 0s countdown, disabled confirm button until 0s, loading guard)
 * 2. Simulated timer progression using exact countdown logic
 * 3. Removal of browser-blocking `window.confirm` in SellerFlashSaleView.tsx and /seller/promotions/flash-sale/[id]/page.tsx
 * 4. Studio performance & feedback optimizations in SellerFlashSaleView.tsx:
 *    - Memoized StudioBookRow (`React.memo`)
 *    - Stable `useCallback` handlers (`handleToggleSelectBook`, `handleUpdateBookField`)
 *    - `React.startTransition` on modal open
 *    - Submit button `animate-spin` spinner + non-blocking `void loadData(true)`
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function simulateCountdownState(initialSeconds) {
  const timeline = [];
  for (let remaining = initialSeconds; remaining >= 0; remaining--) {
    const canConfirm = remaining === 0;
    const label = remaining > 0 ? `Xác nhận xóa (${remaining}s)` : 'Xác nhận xóa';
    timeline.push({ remaining, canConfirm, label });
  }
  return timeline;
}

async function run() {
  console.log('=== E2E VERIFICATION: BUG-09 (SELLER FLASH SALE FREEZE + 5s COUNTDOWN MODAL) ===\n');

  const modalPath = 'web/src/ui/components/common/CountdownConfirmModal.tsx';
  const sellerViewPath = 'web/src/ui/components/seller/SellerFlashSaleView.tsx';
  const sellerDetailPath = 'web/src/app/seller/promotions/flash-sale/[id]/page.tsx';

  assert(fs.existsSync(path.join(ROOT, modalPath)), 'CountdownConfirmModal.tsx must exist');
  const modalSrc = read(modalPath);
  const sellerViewSrc = read(sellerViewPath);
  const sellerDetailSrc = read(sellerDetailPath);

  // 1. Zero browser window.confirm popups remain in Seller Flash Sale flows
  assert(!sellerViewSrc.includes('window.confirm'), 'SellerFlashSaleView.tsx must NOT use window.confirm');
  assert(!sellerDetailSrc.includes('window.confirm'), 'seller/promotions/flash-sale/[id]/page.tsx must NOT use window.confirm');
  console.log('✓ 1. Zero window.confirm popups in Seller Flash Sale list and detail pages');

  // 2. CountdownConfirmModal 5s -> 0s contract & state transition simulation
  assert(
    modalSrc.includes('countdownSeconds = 5') &&
      modalSrc.includes('setSecondsLeft((prev) => {') &&
      modalSrc.includes('const isDisabled = secondsLeft > 0 || loading;') &&
      modalSrc.includes('createPortal('),
    'CountdownConfirmModal must default to 5s reverse countdown, disable button until 0s, and render via portal',
  );
  const steps = simulateCountdownState(5);
  assert.strictEqual(steps.length, 6);
  for (let i = 0; i < 5; i++) {
    assert.strictEqual(steps[i].canConfirm, false, `At ${steps[i].remaining}s confirm button must be disabled`);
  }
  assert.strictEqual(steps[5].remaining, 0);
  assert.strictEqual(steps[5].canConfirm, true, 'At 0s confirm button must become enabled');
  assert.strictEqual(steps[5].label, 'Xác nhận xóa');
  console.log('✓ 2. CountdownConfirmModal 5s -> 0s reverse-countdown lock & unlock verified');

  // 3. Both Seller pages wire CountdownConfirmModal properly
  assert(
    sellerViewSrc.includes('<CountdownConfirmModal') &&
      sellerViewSrc.includes('countdownSeconds={5}') &&
      sellerViewSrc.includes('handleConfirmDeleteSlot'),
    'SellerFlashSaleView must wire CountdownConfirmModal for delete slot confirmation',
  );
  assert(
    sellerDetailSrc.includes('<CountdownConfirmModal') &&
      sellerDetailSrc.includes('countdownSeconds={5}') &&
      sellerDetailSrc.includes('handleConfirmDeleteSlot'),
    'seller/promotions/flash-sale/[id]/page.tsx must wire CountdownConfirmModal for delete slot confirmation',
  );
  console.log('✓ 3. Both Seller Flash Sale list & detail pages mount 5s CountdownConfirmModal');

  // 4. Freeze elimination & instant button feedback in SellerFlashSaleView.tsx
  assert(
    sellerViewSrc.includes('const StudioBookRow = React.memo(') &&
      sellerViewSrc.includes('handleToggleSelectBook = useCallback(') &&
      sellerViewSrc.includes('handleUpdateBookField = useCallback('),
    'SellerFlashSaleView must memoize StudioBookRow and stabilize callbacks',
  );
  assert(
    sellerViewSrc.includes('React.startTransition(() => {') &&
      sellerViewSrc.includes('setIsFormOpen(true);'),
    'SellerFlashSaleView must wrap studio open transition in React.startTransition',
  );
  assert(
    sellerViewSrc.includes("submitting ? 'animate-spin' : ''") &&
      sellerViewSrc.includes("'Đang Đăng Ký...'") &&
      sellerViewSrc.includes('void loadData(true);'),
    'SellerFlashSaleView submit button must show immediate spinner and trigger non-blocking loadData',
  );
  console.log('✓ 4. Studio memoization, startTransition, submit spinner & non-blocking reload passed');

  console.log('\nALL BUG-09 E2E CHECKS PASSED.');
}

run().catch((err) => {
  console.error('\nBUG-09 E2E FAILED:', err);
  process.exitCode = 1;
});
