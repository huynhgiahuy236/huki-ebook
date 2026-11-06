/**
 * Automated Audit Script for UAT Test Session 2: Seller Merchant & Shipper Logistics
 * Probes https://huki-uat.duckdns.org without exposing any secrets or keys.
 */

async function runSession2Audit() {
  const UAT_BASE = 'https://huki-uat.duckdns.org';
  const API_BASE = `${UAT_BASE}/api/v1`;

  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  console.log('=====================================================');
  console.log(' UAT TEST SESSION 2: SELLER MERCHANT & SHIPPER LOGISTICS');
  console.log(' Target: ' + UAT_BASE);
  console.log('=====================================================\n');

  async function safeFetch(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  // PART 1: Seller Frontend Pages Inspection
  const sellerPages = [
    { path: '/seller', name: 'Seller Portal Root (/seller)' },
    { path: '/seller/dashboard', name: 'Seller Dashboard (/seller/dashboard)' },
    { path: '/seller/products', name: 'Quản lý sản phẩm (/seller/products)' },
    { path: '/seller/product/create', name: 'Đăng bán sách giấy (/seller/product/create)' },
    { path: '/seller/product/create-ebook', name: 'Đăng bán Ebook DRM (/seller/product/create-ebook)' },
    { path: '/seller/product/create-hybrid', name: 'Đăng bán Combo Hybrid (/seller/product/create-hybrid)' },
    { path: '/seller/orders', name: 'Quản lý đơn hàng Shop (/seller/orders)' },
    { path: '/seller/inventory', name: 'Quản lý kho hàng (/seller/inventory)' },
    { path: '/seller/revenue', name: 'Báo cáo doanh thu (/seller/revenue)' },
    { path: '/seller/escrow', name: 'Quản lý ký quỹ Escrow (/seller/escrow)' },
    { path: '/seller/wallet', name: 'Ví tiền doanh nghiệp (/seller/wallet)' },
    { path: '/seller/register', name: 'Đăng ký gian hàng (/seller/register)' },
    { path: '/seller/vouchers', name: 'Mã giảm giá của Shop (/seller/vouchers)' },
  ];

  console.log('--- Checking Seller Frontend Pages ---');
  for (const page of sellerPages) {
    try {
      const res = await safeFetch(`${UAT_BASE}${page.path}`);
      if (res.status === 200) {
        const html = await res.text();
        results.passed.push(`[PAGE-SELLER] ${page.name}: HTTP 200 OK (${html.length} bytes)`);

        if (html.includes('http://localhost:3100') || html.includes('http://localhost:3000')) {
          results.warnings.push(`[SECURITY] ${page.name}: Detected localhost string in rendered HTML!`);
        }
      } else {
        results.failed.push(`[PAGE-SELLER] ${page.name}: HTTP ${res.status}`);
      }
    } catch (err) {
      results.failed.push(`[PAGE-SELLER] ${page.name}: Failed to fetch: ${err.message}`);
    }
  }

  // PART 2: Shipper Frontend Pages Inspection
  const shipperPages = [
    { path: '/shipper', name: 'Shipper Portal Root (/shipper)' },
    { path: '/shipper/active-deliveries', name: 'Đơn hàng đang giao (/shipper/active-deliveries)' },
    { path: '/shipper/available-orders', name: 'Đơn hàng khả dụng nhận cuốc (/shipper/available-orders)' },
    { path: '/shipper/history', name: 'Lịch sử giao hàng (/shipper/history)' },
    { path: '/shipper/remit-cod', name: 'Nộp tiền COD về sàn (/shipper/remit-cod)' },
    { path: '/shipper/wallet', name: 'Ví tiền bưu tá (/shipper/wallet)' },
  ];

  console.log('\n--- Checking Shipper Frontend Pages ---');
  for (const page of shipperPages) {
    try {
      const res = await safeFetch(`${UAT_BASE}${page.path}`);
      if (res.status === 200) {
        const html = await res.text();
        results.passed.push(`[PAGE-SHIPPER] ${page.name}: HTTP 200 OK (${html.length} bytes)`);

        if (html.includes('http://localhost:3100') || html.includes('http://localhost:3000')) {
          results.warnings.push(`[SECURITY] ${page.name}: Detected localhost string in rendered HTML!`);
        }
      } else {
        results.failed.push(`[PAGE-SHIPPER] ${page.name}: HTTP ${res.status}`);
      }
    } catch (err) {
      results.failed.push(`[PAGE-SHIPPER] ${page.name}: Failed to fetch: ${err.message}`);
    }
  }

  // PART 3: Backend API Gateway Routing & RBAC Gate Check
  console.log('\n--- Checking Seller & Shipper API Endpoints & RBAC Protection ---');
  const apiChecks = [
    { name: 'Seller Orders API', endpoint: '/seller/orders', expectedStatus: 401 },
    { name: 'Seller Vouchers API', endpoint: '/seller/vouchers', expectedStatus: 401 },
    { name: 'Seller Wallet API', endpoint: '/wallet/balance', expectedStatus: 401 },
    { name: 'Shipper Orders API', endpoint: '/orders/shipper/orders', expectedStatus: 401 },
    { name: 'Shipping Carriers API', endpoint: '/shipping/carriers', expectedStatus: 401 },
    { name: 'Shipments Tracking API', endpoint: '/shipments', expectedStatus: 401 },
  ];

  for (const api of apiChecks) {
    try {
      const res = await safeFetch(`${API_BASE}${api.endpoint}`);
      if (res.status === api.expectedStatus) {
        results.passed.push(`[API-RBAC] ${api.name} (${api.endpoint}): HTTP ${res.status} (RBAC Authenticated/Seller gate active)`);
      } else if (res.status === 502) {
        results.failed.push(`[API-RBAC] ${api.name} (${api.endpoint}): HTTP 502 Bad Gateway (Service unavailable!)`);
      } else {
        results.warnings.push(`[API-RBAC] ${api.name} (${api.endpoint}): Returned HTTP ${res.status} (Expected ${api.expectedStatus})`);
      }
    } catch (err) {
      results.failed.push(`[API-RBAC] ${api.name} (${api.endpoint}): Error ${err.message}`);
    }
  }

  // SUMMARY REPORT
  console.log('\n=====================================================');
  console.log('   UAT SESSION 2 AUDIT SUMMARY');
  console.log('=====================================================');
  console.log(`Passed checks: ${results.passed.length}`);
  results.passed.forEach(p => console.log('  ' + p));

  if (results.warnings.length > 0) {
    console.log(`\nWarnings (${results.warnings.length}):`);
    results.warnings.forEach(w => console.log('  ' + w));
  }

  if (results.failed.length > 0) {
    console.log(`\nFailures (${results.failed.length}):`);
    results.failed.forEach(f => console.log('  ' + f));
  } else {
    console.log('\n>>> All critical UAT checks for Session 2 PASSED! <<<');
  }

  console.log('=====================================================');
  process.exit(0);
}

runSession2Audit();

