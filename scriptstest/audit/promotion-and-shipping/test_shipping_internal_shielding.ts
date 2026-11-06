import { Client } from 'pg';

const SHIPPING_URL = process.env.SHIPPING_SERVICE_URL || 'http://localhost:3004';
const INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY || 'huki-production-internal-key-2026-very-secure';
const DB_URL = process.env.SHIPPING_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_shipping';

async function main() {
  console.log('================================================================');
  console.log('🧪 TEST 3: SHIPPING INTERNAL SHIELDING & TIERED FEE CALCULATION');
  console.log(`🎯 Service Target: ${SHIPPING_URL}`);
  console.log('================================================================\n');

  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();

  const testUserId = '04609db5-d34d-4f54-a640-c6e7d820777b';
  let testAddressId = '';
  let passedAssertions = 0;
  const totalAssertions = 5;

  try {
    // 0. Ensure user has a valid address in huki_shipping
    const addrRes = await pg.query(
      `INSERT INTO addresses (id, user_id, name, phone, address, province, district, ward, is_default, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'Auditor Receiver', '0987654321', '123 Nguyen Hue', 'Thành phố Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', true, NOW(), NOW())
       RETURNING id, user_id, name, address`,
      [testUserId]
    );
    testAddressId = addrRes.rows[0].id;
    console.log(`[SETUP] Seeded test address: ${testAddressId} for user ${testUserId}`);

    // -------------------------------------------------------------
    // ASSERTION 1: Call GET /api/v1/internal/addresses without key -> 403/401 Blocked
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 1: Gọi internal addresses không kèm x-internal-service-key ---');
    const resNoKey = await fetch(`${SHIPPING_URL}/api/v1/internal/addresses`, {
      headers: { 'x-user-id': testUserId },
    });
    console.log(`HTTP Status without key: ${resNoKey.status}`);
    // Prior to fix, may return 401; post fix, returns 403 Forbidden
    if (resNoKey.status === 403 || resNoKey.status === 401) {
      console.log(`✅ PASS [1/5]: Truy cập không có internal key bị chặn đứng (HTTP ${resNoKey.status}).`);
      passedAssertions++;
    } else {
      console.error(`❌ FAIL [1/5]: Endpoint nội bộ không được bảo vệ! (HTTP ${resNoKey.status})`);
    }

    // -------------------------------------------------------------
    // ASSERTION 2: Call with forged key -> 403/401 Blocked
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 2: Gọi internal addresses với key giả mạo ---');
    const resForged = await fetch(`${SHIPPING_URL}/api/v1/internal/addresses`, {
      headers: {
        'x-internal-service-key': 'attacker-forged-key-999',
        'x-user-id': testUserId,
      },
    });
    console.log(`HTTP Status with forged key: ${resForged.status}`);
    if (resForged.status === 403 || resForged.status === 401) {
      console.log(`✅ PASS [2/5]: Key giả mạo bị từ chối truy cập (HTTP ${resForged.status}).`);
      passedAssertions++;
    } else {
      console.error(`❌ FAIL [2/5]: Key giả mạo vẫn được chấp nhận! (HTTP ${resForged.status})`);
    }

    // -------------------------------------------------------------
    // ASSERTION 3: Call with valid key + valid user -> 200 OK
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 3: Gọi internal addresses với key hợp lệ ---');
    const resValid = await fetch(`${SHIPPING_URL}/api/v1/internal/addresses`, {
      headers: {
        'x-internal-service-key': INTERNAL_KEY,
        'x-user-id': testUserId,
      },
    });
    const dataValid = await resValid.json();
    console.log(`HTTP Status with valid key: ${resValid.status}, Count: ${dataValid?.data?.length}`);
    if (resValid.status === 200 && Array.isArray(dataValid?.data) && dataValid.data.length > 0) {
      console.log('✅ PASS [3/5]: Khóa nội bộ hợp lệ truy xuất danh sách địa chỉ thành công.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [3/5]: Không thể truy xuất địa chỉ với khóa hợp lệ!', dataValid);
    }

    // -------------------------------------------------------------
    // ASSERTION 4: Lookup single address by ID via internal endpoint
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 4: Tra cứu chi tiết 1 địa chỉ qua /api/v1/internal/addresses/:id ---');
    const resSingle = await fetch(`${SHIPPING_URL}/api/v1/internal/addresses/${testAddressId}`, {
      headers: {
        'x-internal-service-key': INTERNAL_KEY,
        'x-user-id': testUserId,
      },
    });
    const dataSingle = await resSingle.json();
    console.log(`HTTP Status for single address: ${resSingle.status}, Name: ${dataSingle?.data?.name}`);
    if (resSingle.status === 200 && dataSingle?.data?.id === testAddressId) {
      console.log('✅ PASS [4/5]: Tra cứu địa chỉ chính xác theo ID.');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [4/5]: Tra cứu địa chỉ theo ID thất bại!', dataSingle);
    }

    // -------------------------------------------------------------
    // ASSERTION 5: Tiered shipping fee calculation
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN 5: Tính cước vận chuyển bậc thang (Weight & Distance) ---');
    // Case 1: Same province (Ho Chi Minh), 500g -> Base fee 15,000 VND
    const resSame = await fetch(`${SHIPPING_URL}/api/v1/shipping/fee?province=Hồ+Chí+Minh&district=Quận+1&weight=500`);
    const quoteSame = await resSame.json();
    console.log(`Same province quote:`, quoteSame?.data ?? quoteSame);

    // Case 2: Inter-province (Ha Noi), 1500g -> Base 15k + 2*5k extra weight + 10k inter = 35,000 VND
    const resInter = await fetch(`${SHIPPING_URL}/api/v1/shipping/fee?province=Hà+Nội&district=Hoàn+Kiếm&weight=1500`);
    const quoteInter = await resInter.json();
    console.log(`Inter-province quote:`, quoteInter?.data ?? quoteInter);

    const feeSame = (quoteSame?.data?.shippingFee ?? quoteSame?.shippingFee);
    const feeInter = (quoteInter?.data?.shippingFee ?? quoteInter?.shippingFee);

    if (feeSame === 15000 && feeInter === 35000) {
      console.log('✅ PASS [5/5]: Tính đúng cước bậc thang nội tỉnh (15K) và liên tỉnh 1.5kg (35K).');
      passedAssertions++;
    } else {
      console.error('❌ FAIL [5/5]: Sai lệch tính cước bậc thang!', { feeSame, feeInter });
    }

    // Teardown
    await pg.query(`DELETE FROM addresses WHERE id = $1`, [testAddressId]);
    console.log('\n[TEARDOWN] Cleaned up temporary test address.');

  } finally {
    await pg.end();
  }

  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ TEST 3: ${passedAssertions}/${totalAssertions} ASSERTIONS PASS`);
  console.log('================================================================\n');

  await new Promise((resolve) => setTimeout(resolve, 200));
  if (passedAssertions === totalAssertions) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
