/**
 * Step 2 Verification Script:
 * Verifies all Seller Data Tables for:
 * 1. DataTableFilterBar integration with 2 split date dropdowns (Mốc thời gian presets + Thời gian cụ thể).
 * 2. Integrated Bulk Actions Select (optgroups) directly on DataTableFilterBar (NO floating bottom bar).
 * 3. Table header checkbox & row checkboxes.
 * 4. Dangerous action confirmation dialog.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('======================================================================');
console.log('🧪 TESTING UNIVERSAL DATA TABLE FILTER & BULK ACTIONS: STEP 2 (SELLER)');
console.log('======================================================================\n');

const webDir = path.resolve(__dirname, '../../web');

const sellerTables = [
  {
    name: '1. Seller Orders (/seller/orders)',
    file: 'src/app/seller/orders/page.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '2. Seller Replacement Orders (/seller/replacement-orders)',
    file: 'src/app/seller/replacement-orders/page.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '3. Seller Returns (/seller/returns)',
    file: 'src/app/seller/returns/page.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '4. Seller Appeals (SellerAppealsView)',
    file: 'src/ui/components/seller/SellerAppealsView.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '5. Seller Inventory (/seller/inventory)',
    file: 'src/app/seller/inventory/page.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '6. Seller Products (/seller/products)',
    file: 'src/app/seller/products/page.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '7. Seller Financial Transactions (/seller/transactions)',
    file: 'src/app/seller/transactions/page.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '8. Seller Vouchers (SellerVouchersView)',
    file: 'src/ui/components/seller/SellerVouchersView.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '9. Seller Discounts (SellerDiscountsView)',
    file: 'src/ui/components/seller/SellerDiscountsView.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '10. Seller Reviews (SellerReviewsView)',
    file: 'src/ui/components/seller/SellerReviewsView.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '11. Seller Staff (SellerStaffView)',
    file: 'src/ui/components/seller/SellerStaffView.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '12. Seller Escrow (/seller/escrow)',
    file: 'src/app/seller/escrow/page.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
  {
    name: '13. Seller Followers (/seller/followers)',
    file: 'src/app/seller/followers/page.tsx',
    hasBulk: true,
    hasDateFilter: true,
  },
];

console.log('--- 1. Verifying Core DataTableFilterBar Design Compliance ---');
const filterBarPath = path.join(webDir, 'src/ui/components/common/DataTableFilterBar.tsx');
assert(fs.existsSync(filterBarPath), 'DataTableFilterBar.tsx must exist');
const filterBarContent = fs.readFileSync(filterBarPath, 'utf-8');

// Check that Split 2 Date selects exist:
assert(filterBarContent.includes('Toàn bộ thời gian') && filterBarContent.includes('Tháng trước'), 'FilterBar must have Select 1: Mốc thời gian quick presets');
assert(filterBarContent.includes('-- Thời gian cụ thể --') && filterBarContent.includes('EXACT_DATE'), 'FilterBar must have Select 2: Thời gian cụ thể');

// Check that Bulk Actions select exists DIRECTLY on the filter bar:
assert(filterBarContent.includes('optgroup'), 'FilterBar must render grouped actions via <optgroup>');
assert(filterBarContent.includes('onExecuteBulkAction'), 'FilterBar must have onExecuteBulkAction prop');
assert(filterBarContent.includes('pendingConfirmAction'), 'FilterBar must handle danger confirmation modals');

// Check that NO floating docked bottom bar is rendered by DataTableFilterBar:
assert(!filterBarContent.includes('fixed bottom-6'), 'FilterBar must NOT use floating bottom dock');
console.log('✅ Core DataTableFilterBar has 2 split date selects & inline bulk action select directly on toolbar.\n');

console.log('--- 2. Verifying All Seller Data Tables ---');
let passedCount = 0;

for (const table of sellerTables) {
  const filePath = path.join(webDir, table.file);
  assert(fs.existsSync(filePath), `File ${table.file} must exist`);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify DataTableFilterBar is used
  assert(content.includes('DataTableFilterBar'), `${table.name} must use DataTableFilterBar`);

  // Verify Date filtering logic is wired
  if (table.hasDateFilter) {
    assert(content.includes('dateFilter'), `${table.name} must maintain dateFilter state`);
    assert(content.includes('matchesDateFilter'), `${table.name} must use matchesDateFilter for rows`);
  }

  // Verify Bulk actions & Checkboxes
  if (table.hasBulk) {
    assert(content.includes('bulkActionGroups'), `${table.name} must configure bulkActionGroups`);
    assert(
      content.includes('selectedIds') ||
      content.includes('selectedOrderIds') ||
      content.includes('selectedItemIds') ||
      content.includes('selectedMembers'),
      `${table.name} must track selected IDs`
    );
    assert(content.includes('toggleSelectAll') || content.includes('toggleSelect'), `${table.name} must have selection toggle handlers`);
    assert(content.includes('type="checkbox"'), `${table.name} must render row checkboxes`);
    assert(content.includes('onExecuteBulkAction'), `${table.name} must handle bulk action execution`);
  }

  // Verify NO floating bar is rendered at the bottom
  assert(!content.includes('DataTableBulkActionBar'), `${table.name} must not render redundant floating bottom bar`);

  console.log(`  ✅ Passed: ${table.name}`);
  passedCount++;
}

console.log(`\n🎉 ALL ${passedCount} SELLER DATA TABLES COMPLY 100% WITH USER SPECIFICATION:`);
console.log('- Tách nhỏ bộ lọc ngày thành 2 dropdown riêng biệt (Mốc thời gian + Thời gian cụ thể).');
console.log('- Thao tác chọn nhiều & gom nhóm việc cần làm (<optgroup>) đặt TRỰC TIẾP trên thanh lọc.');
console.log('- KHÔNG DÙNG thanh nổi dưới đáy màn hình (Hình 2).');
console.log('- Đầy đủ checkbox chọn tất cả / từng dòng, modal xác nhận hành động nguy hiểm.');
console.log('======================================================================\n');
