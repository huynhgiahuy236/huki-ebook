// /**
//  * TEST 5: ĐỒNG NHẤT CẤU TRÚC LỖI KHI XẢY RA SỰ CỐ (GATEWAY ERROR RESILIENCE & MAPPING)
//  * File: scriptstest/audit/api-gateway/test_gateway_error_mapping.ts
//  * Target: api-gateway on http://localhost:3000
//  */
//
// const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
//
// async function runTest() {
//   console.log('===============================================================');
//   console.log('🚀 [TEST 5] ĐỒNG NHẤT CẤU TRÚC LỖI & KHẢ NĂNG BỀN BỈ (GATEWAY RESILIENCE)');
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
//       console.log(`  🚨 [VULNERABILITY / BEHAVIOR OBSERVED] ${desc} ${details ? '(' + details + ')' : ''}`);
//     }
//   }
//
//   try {
//     // 1. KỊCH BẢN 1: Request vào route không tồn tại (Unmapped Route)
//     console.log('--- BƯỚC 1: KIỂM TRA PHẢN HỒI LỖI 404 KHI GỌI ROUTE KHÔNG TỒN TẠI ---');
//     const res404 = await fetch(`${BASE_URL}/api/v1/nonexistent-service/endpoint`, {
//       method: 'GET',
//       headers: { 'X-Forwarded-For': '10.0.95.1' },
//     });
//     const data404 = await res404.json().catch(() => ({}));
//     console.log(`  [Response 404] HTTP Status: ${res404.status}`);
//     console.log(`                 JSON Body: ${JSON.stringify(data404)}`);
//
//     assertCheck(
//       'Gateway trả về HTTP 404 khi gọi service không tồn tại',
//       res404.status === 404,
//       `Status: ${res404.status}`
//     );
//
//     assertCheck(
//       'Cấu trúc lỗi 404 chuẩn hóa có statusCode, message, path, timestamp',
//       data404.statusCode === 404 && Boolean(data404.message) && Boolean(data404.path) && Boolean(data404.timestamp),
//       `Keys: ${Object.keys(data404).join(', ')}`
//     );
//
//     // 2. KỊCH BẢN 2: Gửi JSON hỏng cú pháp (Malformed Syntax)
//     console.log('\n--- BƯỚC 2: GỬI PAYLOAD JSON HỎNG CÚ PHÁP TỚI GATEWAY ---');
//     const resMalformed = await fetch(`${BASE_URL}/api/v1/auth/login`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-Forwarded-For': '10.0.95.2',
//       },
//       body: '{"email": "test@huki.vn", broken_json...',
//     });
//     const dataMalformed = await resMalformed.json().catch(() => ({}));
//     console.log(`  [Response Malformed JSON] HTTP Status: ${resMalformed.status}`);
//     console.log(`                            JSON Body: ${JSON.stringify(dataMalformed)}`);
//
//     assertCheck(
//       'JSON hỏng cú pháp bị bắt tại Gateway với HTTP 400 Bad Request, không sập tiến trình',
//       resMalformed.status === 400,
//       `Status: ${resMalformed.status}`
//     );
//
//     // 3. KỊCH BẢN 3: Kiểm tra việc rò rỉ Stack Trace Node.js ra phía Client
//     console.log('\n--- BƯỚC 3: KIỂM TOÁN AN TOÀN - KHÔNG ĐỂ LỘ STACK TRACE THÔ CỦA NODE.JS ---');
//     const rawBody = JSON.stringify(dataMalformed);
//     const hasStackTrace = rawBody.includes('node_modules') || rawBody.includes('SyntaxError:') || (rawBody.includes(' at ') && !rawBody.includes('at position'));
//     assertCheck(
//       'Tuyệt đối không để lộ Stack Trace thô của Node.js / NestJS ra client',
//       !hasStackTrace,
//       hasStackTrace ? '🚨 Phát hiện dấu vết Stack Trace!' : 'Clean'
//     );
//
//     // 4. KỊCH BẢN 4: Khảo sát sự hiện diện của trường requestId trong các lỗi do Gateway tự sinh (GW-OBS-01)
//     console.log('\n--- BƯỚC 4: KHẢO SÁT CHUẨN HÓA TRƯỜNG requestId / correlationId TRONG LỖI GATEWAY ---');
//     const res401Missing = await fetch(`${BASE_URL}/api/v1/cart`, {
//       method: 'GET',
//       headers: { 'X-Forwarded-For': '10.0.95.3' },
//     });
//     const data401Missing = await res401Missing.json().catch(() => ({}));
//     console.log(`  [Response 401 Body] ${JSON.stringify(data401Missing)}`);
//     console.log(`  [Response Headers]  x-correlation-id: ${res401Missing.headers.get('x-correlation-id')}`);
//
//     const hasRequestIdInBody = Boolean(data401Missing.requestId || data401Missing.correlationId);
//     if (!hasRequestIdInBody) {
//       console.log('  🚨 [XÁC NHẬN LỖ HỔNG GW-OBS-01]: Lỗi do Gateway tự sinh (401/403/404) thiếu trường requestId trong JSON body');
//     } else {
//       console.log(`  ✅ Trường requestId đã có trong JSON body: ${data401Missing.requestId || data401Missing.correlationId}`);
//     }
//
//     assertCheck(
//       'Cấu trúc lỗi Gateway tự sinh chuẩn hóa P3 có trường requestId trong JSON body',
//       hasRequestIdInBody,
//       hasRequestIdInBody ? 'Có requestId' : 'Thiếu requestId trong body (GW-OBS-01)'
//     );
//
//     console.log('\n===============================================================');
//     console.log(`🎉 [KẾT QUẢ TEST 5]: HOÀN THÀNH (${passed}/${total} assertions ghi nhận)`);
//     console.log('===============================================================');
//   } catch (error) {
//     console.error('\n❌ [TEST 5 FAILED]:', error.message || error);
//     process.exitCode = 1;
//   }
// }
//
// runTest();
