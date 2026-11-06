// /**
//  * TEST 6: KIỂM THỬ PHỦ ĐỊNH & XỬ LÝ NGOẠI LỆ (NEGATIVE & RESILIENCE TESTING)
//  * File: scriptstest/audit/api-gateway/test_negative_resilience.ts
//  * Target: api-gateway on http://localhost:3000
//  */
//
// const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
//
// async function runTest() {
//   console.log('===============================================================');
//   console.log('🛡️  [TEST 6] KIỂM THỬ PHỦ ĐỊNH & NGOẠI LỆ BIÊN (NEGATIVE & RESILIENCE)');
//   console.log(`🎯 Target Gateway: ${BASE_URL}`);
//   console.log('===============================================================\n');
//
//   let passed = 0;
//   let total = 0;
//
//   function assertCheck(desc, condition, details = '') {
//     total++;
//     if (condition) {
//       passed++;
//       console.log(`  ✅ [PASS] ${desc} ${details ? '(' + details + ')' : ''}`);
//     } else {
//       console.log(`  🚨 [FAIL / VULNERABILITY] ${desc} ${details ? '(' + details + ')' : ''}`);
//     }
//   }
//
//   try {
//     // =========================================================================
//     // PHẦN 1: MALFORMED URLS & PATH TRAVERSAL PROBING
//     // =========================================================================
//     console.log('--- PHẦN 1: MALFORMED URLS & PATH TRAVERSAL PROBING ---');
//
//     // 1.1: Double slash path normalization
//     console.log('\n  1.1. Thử nghiệm URL chứa dấu gạch chéo kép (//api/v1//books)');
//     const resDoubleSlash = await fetch(`${BASE_URL}//api/v1//books`, {
//       method: 'GET',
//       headers: { 'X-Forwarded-For': '10.0.96.1' },
//     });
//     console.log(`  [Response Double Slash] HTTP Status: ${resDoubleSlash.status}`);
//     assertCheck(
//       'Gateway chuẩn hóa dấu gạch chéo lặp lại và định tuyến chính xác tới route PUBLIC',
//       resDoubleSlash.status === 200,
//       `Status: ${resDoubleSlash.status}`
//     );
//
//     // 1.2: Path Traversal probing trying to reach internal endpoints
//     console.log('\n  1.2. Thử nghiệm dò quét Path Traversal nhắm vào internal route (/api/v1/../internal/addresses)');
//     const resTraversal1 = await fetch(`${BASE_URL}/api/v1/../internal/addresses`, {
//       method: 'GET',
//       headers: { 'X-Forwarded-For': '10.0.96.2' },
//     });
//     const dataTraversal1 = await resTraversal1.json().catch(() => ({}));
//     console.log(`  [Response Traversal 1] HTTP Status: ${resTraversal1.status} | Body: ${JSON.stringify(dataTraversal1)}`);
//     assertCheck(
//       'Gateway chặn đứng Path Traversal vào endpoint nội bộ (/internal/addresses) bằng mã 404',
//       resTraversal1.status === 404,
//       `Status: ${resTraversal1.status}, Code: ${dataTraversal1.code}`
//     );
//
//     // 1.3: Nested internal endpoint probing via service prefix (/api/v1/shipping/../shipping/fee/internal)
//     console.log('\n  1.3. Thử nghiệm Path Traversal lồng ghép (/api/v1/shipping/../shipping/fee/internal)');
//     const resTraversal2 = await fetch(`${BASE_URL}/api/v1/shipping/../shipping/fee/internal`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-Forwarded-For': '10.0.96.3',
//       },
//       body: JSON.stringify({ weightGrams: 200 }),
//     });
//     const dataTraversal2 = await resTraversal2.json().catch(() => ({}));
//     console.log(`  [Response Traversal 2] HTTP Status: ${resTraversal2.status} | Body: ${JSON.stringify(dataTraversal2)}`);
//     assertCheck(
//       'Gateway nhận diện phân đoạn internal trong path và kích hoạt Ingress Hard Shielding (404)',
//       resTraversal2.status === 404,
//       `Status: ${resTraversal2.status}, Code: ${dataTraversal2.code}`
//     );
//
//     // 1.4: Case-insensitive API prefix (/API/V1/books)
//     console.log('\n  1.4. Thử nghiệm tiền tố viết hoa không chuẩn (/API/V1/books)');
//     const resCaseInsensitive = await fetch(`${BASE_URL}/API/V1/books`, {
//       method: 'GET',
//       headers: { 'X-Forwarded-For': '10.0.96.4' },
//     });
//     console.log(`  [Response Case Insensitive] HTTP Status: ${resCaseInsensitive.status}`);
//     assertCheck(
//       'Gateway bóc tách /API/V1 không phân biệt hoa thường và định tuyến tới route PUBLIC thành công',
//       resCaseInsensitive.status === 200,
//       `Status: ${resCaseInsensitive.status}`
//     );
//
//     // =========================================================================
//     // PHẦN 2: OVERSIZED HEADERS & HEADER POLLUTION
//     // =========================================================================
//     console.log('\n--- PHẦN 2: OVERSIZED HEADERS & HEADER POLLUTION ---');
//
//     // 2.1: Large junk header
//     console.log('\n  2.1. Gửi request kèm header rác kích thước lớn (4KB Junk Header)');
//     const largeHeaderValue = 'X'.repeat(4096);
//     const resLargeHeader = await fetch(`${BASE_URL}/api/v1/books`, {
//       method: 'GET',
//       headers: {
//         'X-Junk-Audit-Header': largeHeaderValue,
//         'X-Forwarded-For': '10.0.96.5',
//       },
//     });
//     console.log(`  [Response Large Header] HTTP Status: ${resLargeHeader.status}`);
//     assertCheck(
//       'Gateway xử lý an toàn request chứa header kích thước lớn mà không bị crash Node process',
//       resLargeHeader.status === 200 || resLargeHeader.status === 431,
//       `Status: ${resLargeHeader.status}`
//     );
//
//     // 2.2: Header Pollution (nhiều header mạo danh lặp lại)
//     console.log('\n  2.2. Gửi request chứa Header Pollution (đa header giả mạo danh tính)');
//     const resHeaderPollution = await fetch(`${BASE_URL}/api/v1/cart`, {
//       method: 'GET',
//       headers: [
//         ['x-user-id', 'attacker-01'],
//         ['x-user-id', 'attacker-02'],
//         ['x-user-role', 'PLATFORM_ADMIN'],
//         ['x-user-role', 'SUPERADMIN'],
//         ['x-internal-service-key', 'key-alpha'],
//         ['x-internal-service-key', 'key-beta'],
//         ['X-Forwarded-For', '10.0.96.6'],
//       ],
//     });
//     const dataHeaderPollution = await resHeaderPollution.json().catch(() => ({}));
//     console.log(`  [Response Header Pollution] HTTP Status: ${resHeaderPollution.status} | Code: ${dataHeaderPollution.code}`);
//     assertCheck(
//       'Gateway bóc sạch các header ô nhiễm lặp lại và từ chối 401 AUTH_TOKEN_MISSING an toàn',
//       resHeaderPollution.status === 401 && dataHeaderPollution.code === 'AUTH_TOKEN_MISSING',
//       `Status: ${resHeaderPollution.status}, Code: ${dataHeaderPollution.code}`
//     );
//
//     // 2.3: Extremely long URL / Query String (2000 chars)
//     console.log('\n  2.3. Gửi request với query parameter cực dài (2000 ký tự)');
//     const longParam = 'search_keyword=' + 'A'.repeat(2000);
//     const resLongQuery = await fetch(`${BASE_URL}/api/v1/books?${longParam}`, {
//       method: 'GET',
//       headers: { 'X-Forwarded-For': '10.0.96.7' },
//     });
//     console.log(`  [Response Long Query] HTTP Status: ${resLongQuery.status}`);
//     assertCheck(
//       'Gateway tiếp nhận query dài an toàn và không gây tràn bộ nhớ hay crash',
//       resLongQuery.status === 200 || resLongQuery.status === 400 || resLongQuery.status === 414,
//       `Status: ${resLongQuery.status}`
//     );
//
//     // =========================================================================
//     // PHẦN 3: UPSTREAM DISCONNECTION & STANDARDIZED ERROR CONTRACT
//     // =========================================================================
//     console.log('\n--- PHẦN 3: UPSTREAM DISCONNECTION & ERROR CONTRACT SIMULATION ---');
//
//     // 3.1: Route không tồn tại trong hệ thống (Unmapped Service Route)
//     console.log('\n  3.1. Gọi endpoint tới dịch vụ không tồn tại (/api/v1/ghost-service/status)');
//     const resGhost = await fetch(`${BASE_URL}/api/v1/ghost-service/status`, {
//       method: 'GET',
//       headers: { 'X-Forwarded-For': '10.0.96.8' },
//     });
//     const dataGhost = await resGhost.json().catch(() => ({}));
//     console.log(`  [Response Ghost Service] HTTP Status: ${resGhost.status} | Body: ${JSON.stringify(dataGhost)}`);
//     assertCheck(
//       'Gateway trả về 404 với chuẩn mã lỗi SYSTEM_ERROR khi service không tồn tại',
//       resGhost.status === 404 && dataGhost.code === 'SYSTEM_ERROR',
//       `Status: ${resGhost.status}, Code: ${dataGhost.code}`
//     );
//
//     // 3.2: Kiểm tra chuẩn hợp đồng lỗi P3 trên phản hồi lỗi Gateway
//     console.log('\n  3.2. Kiểm tra chuẩn hợp đồng phản hồi lỗi P3 (requestId, path, timestamp, status, statusCode, message)');
//     const hasRequiredFields =
//       dataGhost.status === 'error' &&
//       dataGhost.statusCode === 404 &&
//       Boolean(dataGhost.code) &&
//       Boolean(dataGhost.message) &&
//       Boolean(dataGhost.path) &&
//       Boolean(dataGhost.requestId) &&
//       Boolean(dataGhost.timestamp);
//
//     assertCheck(
//       'Cấu trúc JSON lỗi Gateway tuân thủ 100% chuẩn hợp đồng P3 (bao gồm requestId)',
//       hasRequiredFields,
//       `Fields: ${Object.keys(dataGhost).join(', ')}`
//     );
//
//     // 3.3: Kiểm tra Header x-correlation-id khớp với requestId trong JSON body
//     const headerCorrId = resGhost.headers.get('x-correlation-id');
//     console.log(`  [Correlation Check] Header x-correlation-id: "${headerCorrId}" vs Body requestId: "${dataGhost.requestId}"`);
//     assertCheck(
//       'Header x-correlation-id và trường requestId trong JSON body hoàn toàn đồng nhất',
//       headerCorrId === dataGhost.requestId && Boolean(headerCorrId),
//       `Matched ID: ${headerCorrId}`
//     );
//
//     // 3.4: Kiểm toán bảo mật: Stack Trace Exclusion
//     const ghostRaw = JSON.stringify(dataGhost);
//     const hasGhostStackTrace =
//       ghostRaw.includes('node_modules') ||
//       ghostRaw.includes('SyntaxError:') ||
//       (ghostRaw.includes(' at ') && !ghostRaw.includes('at position'));
//     assertCheck(
//       'Gateway tuyệt đối không để lộ Stack Trace nội bộ ra ngoài Client',
//       !hasGhostStackTrace,
//       hasGhostStackTrace ? '🚨 Lộ Stack Trace!' : 'Clean'
//     );
//
//     console.log('\n===============================================================');
//     console.log(`🎉 [KẾT QUẢ TEST 6 - NEGATIVE & RESILIENCE]: HOÀN THÀNH (${passed}/${total} assertions ghi nhận)`);
//     console.log('===============================================================');
//   } catch (error) {
//     console.error('\n❌ [TEST 6 FAILED]:', error.message || error);
//     process.exitCode = 1;
//   }
// }
//
// runTest();
