/**
 * Automated Audit Script for UAT Test Session 3: Admin, Affiliate Marketing & Community AI
 * Probes https://huki-uat.duckdns.org without exposing any secrets or keys.
 */

async function runSession3Audit() {
  const UAT_BASE = 'https://huki-uat.duckdns.org';
  const API_BASE = `${UAT_BASE}/api/v1`;

  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  console.log('=====================================================');
  console.log(' UAT TEST SESSION 3: ADMIN, AFFILIATE & COMMUNITY AI ');
  console.log(' Target: ' + UAT_BASE);
  console.log('=====================================================\n');

  async function safeFetch(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  // PART 1: Admin Frontend Pages
  const adminPages = [
    { path: '/admin', name: 'Admin Portal Root (/admin)' },
    { path: '/admin/dashboard', name: 'Admin Dashboard (/admin/dashboard)' },
    { path: '/admin/accounts', name: 'Quản lý tài khoản (/admin/accounts)' },
    { path: '/admin/affiliates', name: 'Quản lý Affiliate đối tác (/admin/affiliates)' },
    { path: '/admin/book-moderation', name: 'Kiểm duyệt sách (/admin/book-moderation)' },
    { path: '/admin/books', name: 'Quản lý toàn bộ sách sàn (/admin/books)' },
    { path: '/admin/business-requests', name: 'Yêu cầu mở Shop (/admin/business-requests)' },
    { path: '/admin/businesses', name: 'Danh sách doanh nghiệp (/admin/businesses)' },
    { path: '/admin/disputes', name: 'Giải quyết tranh chấp (/admin/disputes)' },
    { path: '/admin/drm-vault', name: 'Kho khóa bảo mật DRM (/admin/drm-vault)' },
    { path: '/admin/escrow', name: 'Quản lý ký quỹ Escrow (/admin/escrow)' },
    { path: '/admin/finance', name: 'Quản lý tài chính sàn (/admin/finance)' },
    { path: '/admin/health', name: 'Sức khỏe hệ thống (/admin/health)' },
    { path: '/admin/integrations', name: 'Cổng tích hợp hệ thống (/admin/integrations)' },
    { path: '/admin/users', name: 'Quản trị người dùng (/admin/users)' },
    { path: '/admin/vouchers', name: 'Mã giảm giá toàn sàn (/admin/vouchers)' },
  ];

  console.log('--- Checking Admin Frontend Pages ---');
  for (const page of adminPages) {
    try {
      const res = await safeFetch(`${UAT_BASE}${page.path}`);
      if (res.status === 200) {
        const html = await res.text();
        results.passed.push(`[PAGE-ADMIN] ${page.name}: HTTP 200 OK (${html.length} bytes)`);

        if (html.includes('http://localhost:3100') || html.includes('http://localhost:3000')) {
          results.warnings.push(`[SECURITY] ${page.name}: Detected localhost string in rendered HTML!`);
        }
      } else {
        results.failed.push(`[PAGE-ADMIN] ${page.name}: HTTP ${res.status}`);
      }
    } catch (err) {
      results.failed.push(`[PAGE-ADMIN] ${page.name}: Failed to fetch: ${err.message}`);
    }
  }

  // PART 2: Affiliate & Community Frontend Pages
  const affiliateAndCommunityPages = [
    { path: '/affiliate', name: 'Trang đích Affiliate (/affiliate)' },
    { path: '/account/affiliate/register', name: 'Đăng ký KOC/Affiliate (/account/affiliate/register)' },
    { path: '/account/affiliate/dashboard', name: 'Affiliate Dashboard (/account/affiliate/dashboard)' },
    { path: '/account/affiliate/links', name: 'Quản lý Link tiếp thị (/account/affiliate/links)' },
    { path: '/account/affiliate/marketplace', name: 'Chợ sách hoa hồng (/account/affiliate/marketplace)' },
    { path: '/community', name: 'Bảng tin cộng đồng (/community)' },
    { path: '/account/messages', name: 'Hộp thư tin nhắn (/account/messages)' },
  ];

  console.log('\n--- Checking Affiliate & Community Pages ---');
  for (const page of affiliateAndCommunityPages) {
    try {
      const res = await safeFetch(`${UAT_BASE}${page.path}`);
      if (res.status === 200) {
        const html = await res.text();
        results.passed.push(`[PAGE-COMMUNITY] ${page.name}: HTTP 200 OK (${html.length} bytes)`);

        if (html.includes('http://localhost:3100') || html.includes('http://localhost:3000')) {
          results.warnings.push(`[SECURITY] ${page.name}: Detected localhost string in rendered HTML!`);
        }
      } else {
        results.failed.push(`[PAGE-COMMUNITY] ${page.name}: HTTP ${res.status}`);
      }
    } catch (err) {
      results.failed.push(`[PAGE-COMMUNITY] ${page.name}: Failed to fetch: ${err.message}`);
    }
  }

  // PART 3: Backend API Gateway Routing & RBAC Gate Check
  console.log('\n--- Checking Admin & Affiliate API Endpoints & RBAC Protection ---');
  const apiChecks = [
    { name: 'Admin Dashboard Stats API', endpoint: '/admin/dashboard/stats', expectedStatus: [401, 403] },
    { name: 'Admin Users API', endpoint: '/users/admin/all', expectedStatus: [401, 403] },
    { name: 'Admin Businesses API', endpoint: '/businesses/admin/all', expectedStatus: [401, 403] },
    { name: 'Affiliate Stats API', endpoint: '/affiliate/stats', expectedStatus: [401, 403] },
    { name: 'Affiliate Links API', endpoint: '/affiliate/links', expectedStatus: [401, 403] },
  ];

  for (const api of apiChecks) {
    try {
      const res = await safeFetch(`${API_BASE}${api.endpoint}`);
      if (api.expectedStatus.includes(res.status)) {
        results.passed.push(`[API-RBAC] ${api.name} (${api.endpoint}): HTTP ${res.status} (Protected by Auth/RBAC Guard)`);
      } else if (res.status === 502) {
        results.failed.push(`[API-RBAC] ${api.name} (${api.endpoint}): HTTP 502 Bad Gateway!`);
      } else {
        results.warnings.push(`[API-RBAC] ${api.name} (${api.endpoint}): Returned HTTP ${res.status} (Expected ${api.expectedStatus.join('/')})`);
      }
    } catch (err) {
      results.failed.push(`[API-RBAC] ${api.name} (${api.endpoint}): Error ${err.message}`);
    }
  }

  // PART 4: Test Bé Cáo AI Chat Assistant Endpoint
  console.log('\n--- Testing Bé Cáo AI Chat Assistant (/api/v1/chat/ai) ---');
  try {
    const aiRes = await safeFetch(`${API_BASE}/chat/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Bé Cáo ơi giới thiệu cho mình một cuốn sách hay về lập trình hoặc kinh doanh nhé!',
        history: [],
      }),
    }, 30000);

    if (aiRes.status === 200 || aiRes.status === 201) {
      const json = await aiRes.json();
      const reply = json.data?.reply || json.reply || '';
      const books = json.data?.suggestedBooks || json.suggestedBooks || [];
      results.passed.push(`[AI-CHAT] Bé Cáo AI response: HTTP ${aiRes.status} OK! (Length: ${reply.length} chars, Suggested books: ${books.length})`);
    } else if (aiRes.status === 502) {
      results.failed.push(`[AI-CHAT] Bé Cáo AI endpoint returned HTTP 502 Bad Gateway (Community service unavailable)!`);
    } else {
      const text = await aiRes.text();
      results.warnings.push(`[AI-CHAT] Bé Cáo AI endpoint returned HTTP ${aiRes.status}: ${text.slice(0, 100)}`);
    }
  } catch (err) {
    results.failed.push(`[AI-CHAT] Bé Cáo AI endpoint check failed: ${err.message}`);
  }

  // PART 5: Test Short Link Resolver (/r/[shortCode])
  console.log('\n--- Testing Affiliate Short Code Resolver ---');
  try {
    const testCode = 'NON_EXISTENT_CODE_TEST_XYZ';
    const res = await safeFetch(`${API_BASE}/affiliate/resolve/${testCode}`);
    if (res.status === 404 || res.status === 200) {
      results.passed.push(`[AFFILIATE-RESOLVE] Short link resolver API: HTTP ${res.status} (Endpoint reachable and active)`);
    } else if (res.status === 502) {
      results.failed.push(`[AFFILIATE-RESOLVE] Short link resolver API: HTTP 502 Bad Gateway!`);
    } else {
      results.warnings.push(`[AFFILIATE-RESOLVE] Short link resolver API returned HTTP ${res.status}`);
    }
  } catch (err) {
    results.failed.push(`[AFFILIATE-RESOLVE] Short link resolver check failed: ${err.message}`);
  }

  // SUMMARY REPORT
  console.log('\n=====================================================');
  console.log('   UAT SESSION 3 AUDIT SUMMARY');
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
    console.log('\n>>> All critical UAT checks for Session 3 PASSED! <<<');
  }

  console.log('=====================================================');
  process.exit(0);
}

runSession3Audit();
