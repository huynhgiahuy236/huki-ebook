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

const adminRoutes = [
  '/admin/dashboard',
  '/admin/accounts',
  '/admin/affiliates',
  '/admin/ai-audiobooks',
  '/admin/appeals',
  '/admin/book-moderation',
  '/admin/books',
  '/admin/business-requests',
  '/admin/business-update-requests',
  '/admin/businesses',
  '/admin/calendar',
  '/admin/categories',
  '/admin/disputes',
  '/admin/drm-vault',
  '/admin/escrow',
  '/admin/finance',
  '/admin/flash-sales',
  '/admin/health',
  '/admin/integrations',
  '/admin/leads',
  '/admin/maintenance',
  '/admin/marketing',
  '/admin/moderation',
  '/admin/notifications',
  '/admin/promotions/flash-sale',
  '/admin/promotions/vouchers',
  '/admin/publisher-leads',
  '/admin/publishers',
  '/admin/reports',
  '/admin/return-requests',
  '/admin/seller-features',
  '/admin/settings',
  '/admin/shippers',
  '/admin/stores',
  '/admin/support',
  '/admin/users',
  '/admin/vouchers',
];

async function runTest() {
  console.log('=== E2E TEST: BUG 8 (Admin Routes Availability & Audit) ===\n');
  let failures = 0;

  for (const route of adminRoutes) {
    const res = await testRoute(route);
    const ok = res.status === 200 || res.status === 307 || res.status === 308;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${route} -> HTTP ${res.status}`);
    if (!ok) failures++;
  }

  console.log(`\nResult: ${adminRoutes.length - failures}/${adminRoutes.length} admin routes passed.`);
  if (failures > 0) {
    throw new Error(`${failures} admin routes failed`);
  }
  console.log('\n>>> SUCCESS: ALL ADMIN ROUTES PASSED AUDIT! <<<');
}

runTest().catch((err) => {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
});

