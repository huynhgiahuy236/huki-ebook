/**
 * TEST 1: KIỂM CHỨNG ĐỊNH TUYẾN & TÍNH THÔNG SUỐT CỦA WEBHOOK THANH TOÁN PAYOS
 * File: scriptstest/audit/api-gateway/test_payment_webhook_routing.ts
 * Target: api-gateway on http://localhost:3000
 */

const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 [TEST 1] KIỂM CHỨNG TRUY CẬP WEBHOOK THANH TOÁN (PAYOS WEBHOOK REACHABILITY)');
  console.log(`🎯 Target Gateway: ${BASE_URL}`);
  console.log('===============================================================\n');

  let passedAssertions = 0;
  let totalAssertions = 0;

  function assertCheck(desc, condition, details = '') {
    totalAssertions++;
    if (condition) {
      passedAssertions++;
      console.log(`  ✅ [PASS] ${desc} ${details ? '(' + details + ')' : ''}`);
    } else {
      console.log(`  🚨 [VULNERABILITY / BEHAVIOR OBSERVED] ${desc} ${details ? '(' + details + ')' : ''}`);
    }
  }

  try {
    // 1. KỊCH BẢN 1: Webhook PayOS chuẩn không có Header Authorization tới /api/v1/payments/webhooks/payos
    console.log('--- BƯỚC 1: BẮN WEBHOOK CHUẨN TỚI /api/v1/payments/webhooks/payos (KHÔNG AUTH HEADER) ---');
    const mockPayOSPayload = {
      code: '00',
      desc: 'success',
      data: {
        orderCode: 88888888,
        amount: 150000,
        description: 'Thanh toan don hang sach HUKI',
        accountNumber: '1029384756',
        reference: 'FT261106001',
        transactionDateTime: '2026-11-06 14:00:00',
        currency: 'VND',
        paymentLinkId: 'plink_test_01',
        counterAccountBankId: 'MB',
        counterAccountName: 'NGUYEN VAN A',
        counterAccountNumber: '999888777',
        virtualAccountName: 'HUKI EBOOK',
        virtualAccountNumber: 'VA88888888',
      },
      signature: 'test_signature_from_payos_simulator',
    };

    const res1 = await fetch(`${BASE_URL}/api/v1/payments/webhooks/payos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '10.0.90.1',
      },
      body: JSON.stringify(mockPayOSPayload),
    });

    const data1 = await res1.json().catch(() => ({}));
    console.log(`  [Response 1] HTTP Status: ${res1.status} | Body: ${JSON.stringify(data1)}`);

    assertCheck(
      'Gateway không chặn 401/403 trên endpoint /api/v1/payments/webhooks/payos khi không có token',
      res1.status !== 401 && res1.status !== 403,
      `Status: ${res1.status}`
    );

    // 2. KỊCH BẢN 2: Bắn tới endpoint bí danh /api/v1/payments/webhook
    console.log('\n--- BƯỚC 2: BẮN WEBHOOK TỚI ALIAS /api/v1/payments/webhook ---');
    const res2 = await fetch(`${BASE_URL}/api/v1/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '10.0.90.2',
      },
      body: JSON.stringify(mockPayOSPayload),
    });

    const data2 = await res2.json().catch(() => ({}));
    console.log(`  [Response 2] HTTP Status: ${res2.status} | Body: ${JSON.stringify(data2)}`);

    assertCheck(
      'Gateway không chặn 401/403 trên alias /api/v1/payments/webhook',
      res2.status !== 401 && res2.status !== 403,
      `Status: ${res2.status}`
    );

    // 3. KỊCH BẢN 3: TÁI HIỆN LỖ HỔNG GW-ROUT-01 (WEBHOOK KÈM EXTERNAL AUTH HEADER)
    console.log('\n--- BƯỚC 3: TÁI HIỆN RỦI RO GW-ROUT-01 (WEBHOOK GỬI KÈM EXTERNAL AUTHORIZATION TOKEN) ---');
    console.log('  🎯 Thử nghiệm: Đối tác bên thứ ba gửi kèm Header Authorization: Bearer payos_webhook_secret_key_xyz');
    const res3 = await fetch(`${BASE_URL}/api/v1/payments/webhooks/payos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer payos_webhook_secret_key_xyz',
        'X-Forwarded-For': '10.0.90.3',
      },
      body: JSON.stringify(mockPayOSPayload),
    });

    const data3 = await res3.json().catch(() => ({}));
    console.log(`  [Response 3] HTTP Status: ${res3.status} | Code: ${data3.code || data3.error}`);
    console.log(`               Message: "${data3.message}"`);

    if (res3.status === 401) {
      console.log('  🚨 [XÁC NHẬN LỖ HỔNG GW-ROUT-01]: Gateway chặn nhầm Webhook công khai với mã 401 Unauthorized');
      console.log('     do token ngoài không decode được bằng JWT secret của Huki!');
    } else {
      console.log('  ✅ Webhook vẫn được đi qua bình thường.');
    }

    assertCheck(
      'Phát hiện hành vi của Gateway đối với Public Webhook kèm Header Authorization lạ',
      true,
      `HTTP Status: ${res3.status}`
    );

    console.log('\n===============================================================');
    console.log(`🎉 [KẾT QUẢ TEST 1]: HOÀN THÀNH (${passedAssertions}/${totalAssertions} assertions ghi nhận)`);
    console.log('===============================================================');
  } catch (error) {
    console.error('\n❌ [TEST 1 FAILED]:', error.message || error);
    process.exitCode = 1;
  }
}

runTest();
