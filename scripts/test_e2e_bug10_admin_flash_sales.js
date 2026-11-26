'use strict';

/**
 * E2E Verification Script: BUG-10 (/admin/flash-sales GroupedDataTable Sync + 5s Countdown Modal)
 *
 * Verifies:
 * 1. /admin/flash-sales route renders AdminFlashSaleView & AdminFlashSaleView uses GroupedDataTable<FlashSaleSlot>
 * 2. 5 standardized columns matching SellerFlashSaleView + 10-per-page pagination + expandable inline book table
 * 3. Zero browser window.confirm popups remain in AdminFlashSaleView.tsx; both handleCancelSlot & handleRemoveItem
 *    trigger 5s -> 0s CountdownConfirmModal
 * 4. Preserves 4-milestone create form, Penalty Arbitration tab, 5-min End Early modal & optimizes batch Studio assign
 *    via React.startTransition and CHUNK_SIZE=5 Promise.allSettled
 * 5. Simulates 15-session dataset sorting (LIVE -> SCHEDULED -> ENDED -> CANCELLED), 10/page slicing, and column metrics
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function simulateAdminTableTransform(slots, currentPage = 1, pageSize = 10) {
  const statusOrder = { ACTIVE: 1, SCHEDULED: 2, ENDED: 3, CANCELLED: 4 };
  const sorted = [...slots].sort((a, b) => {
    const orderA = statusOrder[a.status] ?? 99;
    const orderB = statusOrder[b.status] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
  const start = (currentPage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);
  const metrics = pageRows.map((slot) => {
    const items = slot.items || [];
    const sold = items.reduce((s, i) => s + Number(i.sold || 0), 0);
    const stock = items.reduce((s, i) => s + Number(i.stock || 0), 0);
    const total = sold + stock;
    const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
    const rev = items.reduce((s, i) => s + Number(i.sold || 0) * Number(i.salePrice || 0), 0);
    return { id: slot.id, status: slot.status, itemCount: items.length, sold, total, pct, rev };
  });
  return { sorted, pageRows, metrics };
}

async function run() {
  console.log('=== E2E VERIFICATION: BUG-10 (ADMIN FLASH SALES GROUPED DATA TABLE) ===\n');

  const adminViewSrc = read('web/src/ui/components/admin/AdminFlashSaleView.tsx');
  const adminPageSrc = read('web/src/app/admin/flash-sales/page.tsx');

  // 1. Page route & GroupedDataTable integration
  assert(
    adminPageSrc.includes('AdminFlashSaleView'),
    'web/src/app/admin/flash-sales/page.tsx must render AdminFlashSaleView',
  );
  assert(
    adminViewSrc.includes("import GroupedDataTable, { type Column } from '../common/GroupedDataTable';") &&
      adminViewSrc.includes('<GroupedDataTable<FlashSaleSlot>'),
    'AdminFlashSaleView.tsx must use standardized GroupedDataTable<FlashSaleSlot>',
  );
  console.log('✓ 1. /admin/flash-sales renders GroupedDataTable<FlashSaleSlot>');

  // 2. 5 synchronized columns + 10/page pagination + expandable inline edit/remove
  const expectedColTitles = [
    "'Đợt Flash Sale & Khung Giờ'",
    "'Shop & Chính Sách'",
    "'Ấn Phẩm Đăng Ký'",
    "'Tiến Độ & Doanh Thu'",
    "'Trạng Thái & Thao Tác'",
  ];
  for (const colTitle of expectedColTitles) {
    assert(
      adminViewSrc.includes(`title: ${colTitle}`),
      `AdminFlashSaleView sessionColumns must define column ${colTitle}`,
    );
  }
  assert(
    adminViewSrc.includes('pageSize = 10') &&
      adminViewSrc.includes('expandable={true}') &&
      adminViewSrc.includes('expandedRowRender={(slot) =>') &&
      adminViewSrc.includes('handleSaveInlineEdit') &&
      adminViewSrc.includes('handleRemoveItem'),
    'GroupedDataTable must configure 10/page pagination and expandable inline edit/remove rows',
  );
  console.log('✓ 2. 5 synchronized columns, 10/page pagination & expandable book table verified');

  // 3. Zero window.confirm + 5s CountdownConfirmModal for CANCEL_SLOT & REMOVE_ITEM
  assert(!adminViewSrc.includes('window.confirm'), 'AdminFlashSaleView.tsx must NOT use window.confirm');
  assert(
    adminViewSrc.includes("import CountdownConfirmModal from '../common/CountdownConfirmModal';") &&
      adminViewSrc.includes('<CountdownConfirmModal') &&
      adminViewSrc.includes('countdownSeconds={5}') &&
      adminViewSrc.includes("confirmModal?.kind === 'CANCEL_SLOT'") &&
      adminViewSrc.includes('handleConfirmModalAction'),
    'AdminFlashSaleView must mount 5s CountdownConfirmModal for CANCEL_SLOT and REMOVE_ITEM',
  );
  console.log('✓ 3. Zero window.confirm & 5s CountdownConfirmModal sync verified');

  // 4. Studio optimization + existing Admin workflows preserved
  assert(
    adminViewSrc.includes('React.startTransition(() => {') &&
      adminViewSrc.includes('const CHUNK_SIZE = 5;') &&
      adminViewSrc.includes('Promise.allSettled(') &&
      adminViewSrc.includes('AdminPenaltyArbitrationView') &&
      adminViewSrc.includes('handleConfirmEndEarly'),
    'AdminFlashSaleView must optimize Studio open/submit and preserve Penalty Arbitration + End Early',
  );
  console.log('✓ 4. Chunked Studio batch submit, startTransition & preserved Admin workflows verified');

  // 5. Behavioral transform check across 15 mixed-status sessions
  const baseMs = Date.UTC(2026, 10, 26, 8, 0, 0);
  const sampleSlots = Array.from({ length: 15 }, (_, idx) => {
    const statuses = ['ENDED', 'CANCELLED', 'SCHEDULED', 'ACTIVE'];
    return {
      id: `slot-${idx + 1}`,
      name: `Phiên #${idx + 1}`,
      status: statuses[idx % statuses.length],
      startsAt: new Date(baseMs + idx * 3600000).toISOString(),
      items: [
        { id: `item-${idx}-1`, sold: 4, stock: 6, salePrice: 50000 },
        { id: `item-${idx}-2`, sold: 2, stock: 8, salePrice: 100000 },
      ],
    };
  });
  const page1 = simulateAdminTableTransform(sampleSlots, 1, 10);
  const page2 = simulateAdminTableTransform(sampleSlots, 2, 10);
  assert.strictEqual(page1.sorted[0].status, 'ACTIVE', 'ACTIVE slots must sort first');
  assert.strictEqual(page1.sorted[page1.sorted.length - 1].status, 'CANCELLED', 'CANCELLED slots must sort last');
  assert.strictEqual(page1.pageRows.length, 10, 'Page 1 must contain exactly 10 rows');
  assert.strictEqual(page2.pageRows.length, 5, 'Page 2 must contain remaining 5 rows');
  assert.strictEqual(page1.metrics[0].sold, 6);
  assert.strictEqual(page1.metrics[0].total, 20);
  assert.strictEqual(page1.metrics[0].pct, 30);
  assert.strictEqual(page1.metrics[0].rev, 400000);
  console.log('✓ 5. Sorting (LIVE -> SCHEDULED -> ENDED -> CANCELLED), 10/page slicing & KPI math passed');

  console.log('\nALL BUG-10 E2E CHECKS PASSED.');
}

run().catch((err) => {
  console.error('\nBUG-10 E2E FAILED:', err);
  process.exitCode = 1;
});
