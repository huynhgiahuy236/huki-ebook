const http = require('http');

function testRoute(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3100${path}`, (res) => {
      resolve({ path, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ path, status: 'ERROR', error: err.message });
    });
  });
}

const sellerRoutes = [
  '/seller/dashboard',
  '/seller/notifications',
  '/seller/orders',
  '/seller/orders?tab=PENDING_CONFIRMATION',
  '/seller/orders?tab=CANCELLED',
  '/seller/returns',
  '/seller/replacement-orders',
  '/seller/products',
  '/seller/product/create-hybrid',
  '/seller/product/correction',
  '/seller/inventory',
  '/seller/chat',
  '/seller/reviews',
  '/seller/followers',
  '/seller/promotions/discounts',
  '/seller/promotions/vouchers',
  '/seller/promotions/flash-sale',
  '/seller/affiliate',
  '/seller/finance',
  '/seller/escrow',
  '/seller/reports',
  '/seller/business',
  '/seller/staff',
];

async function runTest() {
  console.log('=== E2E TEST: BUG 7 (Seller Sidebar Routes Availability) ===\n');
  let failures = 0;

  for (const route of sellerRoutes) {
    const res = await testRoute(route);
    const ok = res.status === 200 || res.status === 307 || res.status === 308;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${route} -> HTTP ${res.status}`);
    if (!ok) failures++;
  }

  console.log(`\nResult: ${sellerRoutes.length - failures}/${sellerRoutes.length} routes passed.`);
  if (failures > 0) {
    throw new Error(`${failures} seller routes failed`);
  }
  console.log('\n>>> SUCCESS: ALL SELLER SIDEBAR ROUTES PASSED! <<<');
}

runTest().catch((err) => {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
});

