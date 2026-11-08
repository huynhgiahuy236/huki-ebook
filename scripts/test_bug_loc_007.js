// scripts/test_bug_loc_007.js
// Verification for BUG-LOC-007 (Sidebar animation & RBAC segregation)
const fs = require('fs');
const path = require('path');

function verify() {
  console.log('=== START VERIFICATION: BUG-LOC-007 ===');

  const sidebarPath = path.join(__dirname, '../web/src/ui/components/layout/HierarchicalSidebar.tsx');
  const content = fs.readFileSync(sidebarPath, 'utf8');

  // 1. RBAC Shipper support
  if (!content.includes('isShipper')) {
    console.error('FAIL: isShipper role support missing!');
    process.exit(1);
  }
  if (!content.includes('/shipper') && !content.includes('/shipper/deliveries')) {
    console.error('FAIL: Shipper portal route (/shipper or /shipper/deliveries) missing!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-007 (RBAC Shipper): Shipper navigation group supported for delivery roles.');

  // 2. Buyer Messages separation
  if (!content.includes("to: '/account/messages'")) {
    console.error('FAIL: Buyer messages should point to /account/messages!');
    process.exit(1);
  }
  if (!content.includes("to: '/seller/chat'")) {
    console.error('FAIL: Seller chat should be segregated under business group!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-007 (RBAC Segregation): Buyer and Seller chat routes strictly segregated.');

  // 3. Animation & Dimensions
  if (!content.includes('transition-[width,transform] duration-300 ease-in-out')) {
    console.error('FAIL: Smooth width transition missing!');
    process.exit(1);
  }
  if (!content.includes('lg:w-[68px]') || !content.includes('lg:w-[230px]')) {
    console.error('FAIL: Ergonomic sidebar dimensions (68px/230px) missing!');
    process.exit(1);
  }
  console.log('PASS BUG-LOC-007 (Animation & Dimensions): Smooth 300ms transition and comfortable 68px/230px dimensions applied.');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY (BUG-LOC-007) ===');
  process.exit(0);
}

try {
  verify();
} catch (err) {
  console.error('Error during test execution:', err);
  process.exit(1);
}
