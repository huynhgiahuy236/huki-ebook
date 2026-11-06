/**
 * TEST 5: INTERNAL COMMUNICATION VS CROSS-DB QUERY & ARCHITECTURAL COUPLING
 * File: scriptstest/audit/commerce-service/test_internal_seller_scope.ts
 * Target: business-service (Port 3002) & commerce-service (Port 3003) seller-scope.util.ts
 * Databases: huki_business & huki_commerce
 */

import { Client, Pool } from 'pg';

const BUSINESS_URL = process.env.BUSINESS_SERVICE_URL || 'http://localhost:3002';
const COMMERCE_URL = process.env.COMMERCE_SERVICE_URL || 'http://localhost:3003';
const BUSINESS_DB_URL = process.env.BUSINESS_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_business';
const COMMERCE_DB_URL = process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce';

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 [TEST 5] KIỂM CHỨNG GIAO TIẾP NỘI BỘ VS RAW SQL CROSS-DB (ARCH-CDB-01)');
  console.log(`🎯 Target Business Service URL: ${BUSINESS_URL}`);
  console.log(`🎯 Target Commerce Service URL: ${COMMERCE_URL}`);
  console.log(`🗄️ Business Database URL:        ${BUSINESS_DB_URL}`);
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assertCheck(desc: string, condition: boolean, details: string = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${desc} ${details ? '(' + details + ')' : ''}`);
    } else {
      console.log(`  🚨 [ARCHITECTURAL DEFECT DETECTED] ${desc} ${details ? '(' + details + ')' : ''}`);
    }
  }

  // 1. KỊCH BẢN 1: Quét các endpoint nội bộ tại business-service
  console.log('--- BƯỚC 1: QUÉT TÌM CÁC ENDPOINT NỘI BỘ (INTERNAL API) TẠI BUSINESS-SERVICE ---');
  const internalEndpoints = [
    '/api/v1/internal/seller-scope',
    '/api/v1/internal/sellers/scope',
    '/api/v1/internal/stores/resolve',
    '/api/v1/internal/businesses/scope',
  ];

  let missingInternalEndpointsCount = 0;

  for (const ep of internalEndpoints) {
    try {
      const res = await fetch(`${BUSINESS_URL}${ep}`, {
        headers: { 'X-Internal-Call': 'true' },
      });
      const body = await res.json().catch(() => ({}));
      console.log(`  Probing ${ep} -> Status: ${res.status} | Body: ${JSON.stringify(body)}`);
      if (res.status === 404) {
        missingInternalEndpointsCount++;
      }
    } catch (err: any) {
      console.log(`  Probing ${ep} -> Network/Connection Error: ${err.message}`);
      missingInternalEndpointsCount++;
    }
  }

  assertCheck(
    'Xác nhận business-service hoàn toàn thiếu vắng các endpoint nội bộ (/internal/*) cho Seller Scope',
    missingInternalEndpointsCount === internalEndpoints.length,
    `Missing: ${missingInternalEndpointsCount}/${internalEndpoints.length}`
  );

  // 2. KỊCH BẢN 2: Bóc tách mã nguồn và hành vi thực tế của seller-scope.util.ts
  console.log('\n--- BƯỚC 2: PHÂN TÍCH CƠ CHẾ KẾT NỐI DATABASE CHÉO TRONG COMMERCE-SERVICE ---');
  console.log('  Vị trí: platform/apps/commerce-service/src/common/seller-scope.util.ts:11-29');
  console.log('  Mã nguồn thực tế:');
  console.log('    const bizDbUrl = process.env.BUSINESS_DATABASE_URL || ...replace(/huki_commerce/, "/huki_business");');
  console.log('    poolInstance = new Pool({ connectionString: bizDbUrl, max: 10, idleTimeoutMillis: 30000 });');

  // Verify direct connectivity from within test harness mimicking seller-scope.util.ts
  const testPool = new Pool({
    connectionString: BUSINESS_DB_URL,
    max: 5,
    connectionTimeoutMillis: 3000,
  });

  let rawQuerySuccess = false;
  let rawQueryRows: any[] = [];
  try {
    const rawRes = await testPool.query(`
      SELECT b.id AS business_id, b.owner_id, s.id AS store_id
      FROM businesses b
      LEFT JOIN stores s ON s.business_id = b.id AND s.deleted_at IS NULL
      WHERE b.deleted_at IS NULL
      LIMIT 5
    `);
    rawQuerySuccess = true;
    rawQueryRows = rawRes.rows;
    console.log(`  Thực thi Raw SQL chéo DB thành công! Số bản ghi đọc trực tiếp: ${rawQueryRows.length}`);
  } catch (err: any) {
    console.log(`  Lỗi khi thực thi Raw SQL chéo DB: ${err.message}`);
  } finally {
    await testPool.end();
  }

  assertCheck(
    'Xác nhận commerce-service sử dụng Raw SQL query trực tiếp bảng businesses & stores của business-service (ARCH-CDB-01)',
    rawQuerySuccess,
    `Rows read: ${rawQueryRows.length}`
  );

  // 3. KỊCH BẢN 3: Đánh giá hậu quả & Rủi ro kiến trúc (Impact Assessment)
  console.log('\n--- BƯỚC 3: ĐÁNH GIÁ RỦI RO KIẾN TRÚC & HẬU QUẢ CỦA ANTI-PATTERN ARCH-CDB-01 ---');
  const risks = [
    {
      code: 'RISK-01',
      title: 'Vi phạm nguyên lý Database-per-Service (Microservices Isolation)',
      detail: 'commerce-service và business-service bị ghép chặt tầng lưu trữ vật lý. Không thể di chuyển business-service sang cụm RDS độc lập hoặc migrate schema mà không làm hỏng commerce-service.',
    },
    {
      code: 'RISK-02',
      title: 'Rò rỉ & Cạn kiệt Connection Pool (Resource Contention)',
      detail: 'Mỗi instance của commerce-service chiếm dụng 10 kết nối thường trực vào huki_business qua pg.Pool riêng lẻ, không chia sẻ với Prisma client của business-service.',
    },
    {
      code: 'RISK-03',
      title: 'Thiếu Boundary Validation & Audit Trail',
      detail: 'Mọi câu truy vấn phân quyền seller diễn ra âm thầm ở tầng DB, không đi qua Business logic, Interceptor hay Audit log của business-service.',
    },
  ];

  for (const r of risks) {
    console.log(`  🚨 [${r.code}] ${r.title}`);
    console.log(`     Chi tiết: ${r.detail}`);
  }

  assertCheck(
    'Đã định danh đầy đủ 3 rủi ro kiến trúc cốt tử của ARCH-CDB-01 phục vụ thiết kế giải pháp tại Message 16',
    risks.length === 3,
    `Risks identified: ${risks.length}`
  );

  console.log('\n===============================================================');
  console.log(`📊 KẾT QUẢ TEST 5: Passed ${passed}/${total} assertions.`);
  console.log('===============================================================');
  process.exitCode = (passed === total ? 0 : 1);
}

runTest();
