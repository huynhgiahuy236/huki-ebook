/**
 * Automated Audit Script for UAT Test Session 1: Buyer, Reader & Commerce Core
 * Probes https://huki-uat.duckdns.org without exposing any secrets or keys.
 */

async function runSession1Audit() {
  const UAT_BASE = 'https://huki-uat.duckdns.org';
  const API_BASE = `${UAT_BASE}/api/v1`;

  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  console.log('=====================================================');
  console.log('   UAT TEST SESSION 1: BUYER, READER & COMMERCE CORE ');
  console.log('   Target: ' + UAT_BASE);
  console.log('=====================================================\n');

  // Helper fetch with timeout
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

  // TEST 1: Health & Gateway Status
  try {
    const res = await safeFetch(`${API_BASE}/health/live`);
    if (res.status === 200) {
      const json = await res.json();
      results.passed.push(`[TC-UAT-100] API Gateway live: Status ${json.status || 200}, Service ${json.data?.service || 'OK'}`);
    } else {
      results.failed.push(`[TC-UAT-100] API Gateway live returned HTTP ${res.status}`);
    }
  } catch (err) {
    results.failed.push(`[TC-UAT-100] API Gateway health check failed: ${err.message}`);
  }

  // TEST 2: Books API Limit=1000 & Filter
  let sampleBookId = null;
  try {
    const res = await safeFetch(`${API_BASE}/books?limit=1000`);
    if (res.status === 200) {
      const json = await res.json();
      const count = json.data?.length || 0;
      sampleBookId = json.data?.[0]?.id;
      results.passed.push(`[TC-UAT-101] Books endpoint limit=1000: HTTP 200 OK (${count} books returned without 400 Bad Request)`);
    } else {
      const text = await res.text();
      results.failed.push(`[TC-UAT-101] Books endpoint limit=1000 failed: HTTP ${res.status} - ${text.slice(0, 150)}`);
    }
  } catch (err) {
    results.failed.push(`[TC-UAT-101] Books endpoint failed: ${err.message}`);
  }

  // TEST 3: Categories Listing
  try {
    const res = await safeFetch(`${API_BASE}/categories`);
    if (res.status === 200) {
      const json = await res.json();
      const count = Array.isArray(json) ? json.length : json.data?.length || 0;
      results.passed.push(`[TC-UAT-101b] Categories endpoint: HTTP 200 OK (${count} categories)`);
    } else {
      results.warnings.push(`[TC-UAT-101b] Categories endpoint returned HTTP ${res.status}`);
    }
  } catch (err) {
    results.warnings.push(`[TC-UAT-101b] Categories endpoint failed: ${err.message}`);
  }

  // TEST 4: Flash Sale API
  try {
    const res = await safeFetch(`${API_BASE}/flash-sales/active`);
    if (res.status === 200) {
      const json = await res.json();
      const count = json.data?.items?.length || json.data?.length || 0;
      results.passed.push(`[TC-UAT-102] Flash Sale active endpoint: HTTP 200 OK (${count} campaign items)`);
    } else {
      results.warnings.push(`[TC-UAT-102] Flash Sale endpoint returned HTTP ${res.status} (Campaign may not be currently active)`);
    }
  } catch (err) {
    results.warnings.push(`[TC-UAT-102] Flash Sale endpoint check failed: ${err.message}`);
  }

  // TEST 5: Stores & Businesses Public API
  try {
    const res = await safeFetch(`${API_BASE}/businesses/public`);
    if (res.status === 200) {
      const json = await res.json();
      const businesses = json.data || json || [];
      results.passed.push(`[TC-UAT-103] Public Stores endpoint: HTTP 200 OK (${businesses.length} businesses listed)`);
    } else {
      results.failed.push(`[TC-UAT-103] Public Stores endpoint returned HTTP ${res.status}`);
    }
  } catch (err) {
    results.failed.push(`[TC-UAT-103] Public Stores endpoint failed: ${err.message}`);
  }

  // TEST 6: Active Vouchers API
  try {
    const res = await safeFetch(`${API_BASE}/vouchers?limit=50`);
    if (res.status === 200) {
      const json = await res.json();
      const vouchers = json.data || [];
      results.passed.push(`[TC-UAT-106] Public Vouchers endpoint: HTTP 200 OK (${vouchers.length} vouchers retrieved from DB)`);
    } else {
      results.warnings.push(`[TC-UAT-106] Public Vouchers endpoint returned HTTP ${res.status}`);
    }
  } catch (err) {
    results.warnings.push(`[TC-UAT-106] Public Vouchers endpoint check failed: ${err.message}`);
  }

  // TEST 7: Frontend Pages Delivery & Content Inspection
  const pagesToTest = [
    { path: '/', name: 'Trang chủ (Homepage)' },
    { path: '/books', name: 'Khám phá sách (/books)' },
    { path: '/flash-sale', name: 'Săn deal Flash Sale (/flash-sale)' },
    { path: '/stores', name: 'NXB & Gian hàng (/stores)' },
    { path: '/stores?tab=authors', name: 'Danh sách tác giả (/stores?tab=authors)' },
    { path: '/library', name: 'Tủ sách cá nhân (/library)' },
  ];

  if (sampleBookId) {
    pagesToTest.push({ path: `/book/${sampleBookId}`, name: `Chi tiết sách (/book/${sampleBookId})` });
  }

  for (const page of pagesToTest) {
    try {
      const res = await safeFetch(`${UAT_BASE}${page.path}`);
      if (res.status === 200) {
        const html = await res.text();
        
        // Check for trial reading ("Đọc Thử") in book detail page
        if (page.path.startsWith('/book/')) {
          const hasTrialButton = html.includes('Đọc Thử Bản Trực Tuyến') || html.includes('Đọc Thử Mẫu');
          if (hasTrialButton) {
            results.failed.push(`[TC-UAT-104] ${page.name}: Still contains "Đọc Thử" button or tab in HTML!`);
          } else {
            results.passed.push(`[TC-UAT-104] ${page.name}: HTTP 200 OK, "Đọc Thử" completely eliminated!`);
          }
        } else {
          results.passed.push(`[PAGE] ${page.name}: HTTP 200 OK (Content-Length: ${html.length} bytes)`);
        }

        // Security check: Check for localhost leakage in rendered HTML
        if (html.includes('http://localhost:3100') || html.includes('http://localhost:3000')) {
          results.warnings.push(`[SECURITY] ${page.name}: Detected 'localhost' string in rendered page HTML!`);
        }

      } else {
        results.failed.push(`[PAGE] ${page.name}: Returned HTTP ${res.status}`);
      }
    } catch (err) {
      results.failed.push(`[PAGE] ${page.name}: Failed to fetch: ${err.message}`);
    }
  }

  // SUMMARY REPORT
  console.log('--- TEST RESULTS SUMMARY ---');
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
    console.log('\n>>> All critical UAT checks for Session 1 PASSED without failures! <<<');
  }

  console.log('\n=====================================================');
  process.exit(0);
}

runSession1Audit();

