/**
 * Verification Script: Check that all DataTableFilterBar usages have the card container frame.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('======================================================================');
console.log('🧪 VERIFYING CARD CONTAINER FRAME (KHUNG HÌNH 2) FOR ALL TABLES');
console.log('======================================================================\n');

const webDir = path.resolve(__dirname, '../../web');

const filesToCheck = [
  // Seller (13)
  'src/app/seller/orders/page.tsx',
  'src/app/seller/replacement-orders/page.tsx',
  'src/app/seller/returns/page.tsx',
  'src/ui/components/seller/SellerAppealsView.tsx',
  'src/app/seller/inventory/page.tsx',
  'src/app/seller/products/page.tsx',
  'src/app/seller/transactions/page.tsx',
  'src/ui/components/seller/SellerVouchersView.tsx',
  'src/ui/components/seller/SellerDiscountsView.tsx',
  'src/ui/components/seller/SellerReviewsView.tsx',
  'src/ui/components/seller/SellerStaffView.tsx',
  'src/app/seller/escrow/page.tsx',
  'src/app/seller/followers/page.tsx',
  // Admin (16)
  'src/ui/components/admin/AdminUsersView.tsx',
  'src/ui/components/admin/AdminShippersView.tsx',
  'src/ui/components/admin/AdminBusinessesView.tsx',
  'src/ui/components/admin/AdminBusinessUpdateRequestsView.tsx',
  'src/ui/components/admin/AdminBooksView.tsx',
  'src/ui/components/admin/AdminBookModerationView.tsx',
  'src/ui/components/admin/AdminFinanceView.tsx',
  'src/ui/components/admin/AdminEscrowView.tsx',
  'src/ui/components/admin/AdminDisputesView.tsx',
  'src/ui/components/admin/AdminAppealsView.tsx',
  'src/ui/components/admin/AdminReturnRequestsView.tsx',
  'src/ui/components/admin/AdminVouchersView.tsx',
  'src/ui/components/admin/AdminStoresView.tsx',
  'src/ui/components/admin/AdminPublishersView.tsx',
  'src/ui/components/admin/AdminAccountsView.tsx',
  'src/ui/components/admin/AdminDrmVaultView.tsx',
  // Shipper & Customer (4)
  'src/ui/components/shipper/ShipperAvailableOrdersView.tsx',
  'src/ui/components/shipper/ShipperHistoryView.tsx',
  'src/ui/components/shipper/ShipperWalletView.tsx',
  'src/app/orders/page.tsx',
];

// Check core component default className
const coreFilterBarPath = path.join(webDir, 'src/ui/components/common/DataTableFilterBar.tsx');
const coreCode = fs.readFileSync(coreFilterBarPath, 'utf-8');
assert(
  coreCode.includes('bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80'),
  'DataTableFilterBar must have default card container frame styling'
);
console.log('✅ Core DataTableFilterBar has card frame set as default prop.\n');

let passed = 0;
for (const relPath of filesToCheck) {
  const fullPath = path.join(webDir, relPath);
  assert(fs.existsSync(fullPath), `File ${relPath} must exist`);
  const content = fs.readFileSync(fullPath, 'utf-8');

  // Verify that it is either framed inside an existing card (transactions) or has explicit card styling
  const hasCardStyle =
    content.includes('rounded-2xl border') ||
    content.includes('rounded-xl border') ||
    content.includes('bg-white p-3.5 rounded-2xl');

  assert(hasCardStyle, `${relPath} must have card frame container`);
  console.log(`  ✅ Passed: ${relPath}`);
  passed++;
}

console.log(`\n🎉 ALL ${passed} TABLES ARE BEAUTIFULLY FRAMED IN CARD CONTAINERS (HÌNH 2 STYLE)!`);
console.log('======================================================================\n');
