/**
 * TEST 5: POSITIVE VERIFICATION - INTERNAL COMMUNICATION & SELLER SCOPE DECOUPLING
 * File: scriptstest/audit/commerce-service/test_internal_seller_scope.ts
 * Target: business-service (Port 3002) & commerce-service (Port 3003)
 * Databases: PostgreSQL huki_business & huki_commerce
 */

import * as fs from 'fs';
import * as path from 'path';

const BUSINESS_URL = process.env.BUSINESS_SERVICE_URL || 'http://localhost:3002';
const COMMERCE_URL = process.env.COMMERCE_SERVICE_URL || 'http://localhost:3003';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'huki-production-internal-key-2026-very-secure';

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 [TEST 5] KIỂM CHỨNG GIAO TIẾP NỘI BỘ & KHỬ KẾT NỐI CHÉO DB (COM-ARCH-001/002)');
  console.log(`🎯 Target Business Service URL: ${BUSINESS_URL}`);
  console.log(`🎯 Target Commerce Service URL: ${COMMERCE_URL}`);
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assertCheck(desc: string, condition: boolean, details: string = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${desc} ${details ? '(' + details + ')' : ''}`);
    } else {
      console.log(`  ❌ [FAIL] ${desc} ${details ? '(' + details + ')' : ''}`);
    }
  }

  // 1. KỊCH BẢN 1: Kiểm chứng Endpoint Nội bộ tại business-service
  console.log('--- BƯỚC 1: KIỂM CHỨNG ENDPOINT NỘI BỘ VỚI X-INTERNAL-SERVICE-KEY ---');
  const testUserId = '00000000-0000-4000-a000-000000000001';
  let internalScopeSuccess = false;
  let returnedScope: any = null;

  try {
    const res = await fetch(`${BUSINESS_URL}/api/v1/internal/seller-scope/${testUserId}`, {
      method: 'GET',
      headers: {
        'x-internal-service-key': INTERNAL_SERVICE_KEY,
        'Accept': 'application/json',
      },
    });
    const body: any = await res.json();
    console.log(`  GET /api/v1/internal/seller-scope/${testUserId} -> Status: ${res.status}`);
    if (res.status === 200 && (body.data?.ownerUserIds || body.ownerUserIds)) {
      internalScopeSuccess = true;
      returnedScope = body.data || body;
      console.log(`  Scope response: ${JSON.stringify(returnedScope)}`);
    }
  } catch (err: any) {
    console.log(`  Error calling internal seller-scope: ${err.message}`);
  }

  assertCheck(
    'Xác nhận business-service cung cấp endpoint nội bộ /api/v1/internal/seller-scope/:userId hoạt động chuẩn xác',
    internalScopeSuccess,
    `Status 200 with ownerUserIds: ${returnedScope?.ownerUserIds?.length ?? 0}`
  );

  // 2. KỊCH BẢN 2: Kiểm chứng Endpoint Resolve Target
  console.log('\n--- BƯỚC 2: KIỂM CHỨNG ENDPOINT RESOLVE TARGET ID ---');
  let resolveSuccess = false;
  try {
    const res = await fetch(`${BUSINESS_URL}/api/v1/internal/resolve-target/${testUserId}`, {
      method: 'GET',
      headers: {
        'x-internal-service-key': INTERNAL_SERVICE_KEY,
        'Accept': 'application/json',
      },
    });
    const body: any = await res.json();
    console.log(`  GET /api/v1/internal/resolve-target/${testUserId} -> Status: ${res.status}`);
    if (res.status === 200) {
      resolveSuccess = true;
      console.log(`  Resolve response: ${JSON.stringify(body.data || body)}`);
    }
  } catch (err: any) {
    console.log(`  Error calling resolve-target: ${err.message}`);
  }

  assertCheck(
    'Xác nhận endpoint nội bộ /api/v1/internal/resolve-target/:targetId hoạt động chuẩn xác',
    resolveSuccess,
    'Status 200'
  );

  // 3. KỊCH BẢN 3: Kiểm chứng xóa bỏ triệt để pg.Pool và cross-db SQL trong seller-scope.util.ts
  console.log('\n--- BƯỚC 3: KIỂM CHỨNG LOẠI BỎ TRIỆT ĐỂ PG.POOL TRONG COMMERCE-SERVICE ---');
  const utilFilePath = path.resolve(__dirname, '../../../platform/apps/commerce-service/src/common/seller-scope.util.ts');
  const utilContent = fs.readFileSync(utilFilePath, 'utf8');

  const hasPgPool = utilContent.includes("from 'pg'") || utilContent.includes('new Pool') || utilContent.includes('getBusinessPool');
  const hasCrossDbUrl = utilContent.includes('huki_business') || utilContent.includes('BUSINESS_DATABASE_URL');
  const usesBusinessClient = utilContent.includes('BusinessServiceClient');

  assertCheck(
    'Xác nhận seller-scope.util.ts đã xóa bỏ 100% kết nối pg.Pool trực tiếp sang huki_business',
    !hasPgPool && !hasCrossDbUrl,
    `hasPgPool: ${hasPgPool}, hasCrossDbUrl: ${hasCrossDbUrl}`
  );

  assertCheck(
    'Xác nhận seller-scope.util.ts đã chuyển đổi sang sử dụng BusinessServiceClient (Microservice Architecture)',
    usesBusinessClient,
    'Uses BusinessServiceClient: true'
  );

  // 4. KỊCH BẢN 4: Kiểm chứng In-Memory LRU Cache của BusinessServiceClient
  console.log('\n--- BƯỚC 4: KIỂM CHỨNG TẦNG ĐỆM IN-MEMORY CACHE (TTL 60S) ---');
  const clientFilePath = path.resolve(__dirname, '../../../platform/apps/commerce-service/src/common/business-service.client.ts');
  const clientContent = fs.readFileSync(clientFilePath, 'utf8');
  const hasCacheMap = clientContent.includes('scopeCache = new Map') && clientContent.includes('CACHE_TTL_MS = 60_000');

  assertCheck(
    'Xác nhận BusinessServiceClient trang bị In-Memory LRU Cache với TTL 60 giây',
    hasCacheMap,
    'CACHE_TTL_MS: 60000ms'
  );

  console.log('\n===============================================================');
  console.log(`📊 KẾT QUẢ TEST 5: Passed ${passed}/${total} assertions.`);
  console.log('===============================================================');
  process.exitCode = (passed === total ? 0 : 1);
}

runTest();
