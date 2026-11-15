const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log('=== E2E TEST: BUG 11 (Unique Phone Registration Constraint) ===\n');

  // Existing user phone in DB:
  const existingPhone = '0983705351';
  const newEmail = `test_phone_dup_${Date.now()}@example.com`;

  console.log(`1. Attempting to register new account with already registered phone: ${existingPhone}...`);
  const res = await post('http://localhost:3100/api/v1/auth/register', {
    fullName: 'Test Duplicate Phone User',
    email: newEmail,
    password: 'Password123!',
    phone: existingPhone,
  });

  console.log(`   -> API returned HTTP ${res.status}`);
  console.log(`   -> Response:`, res.body || res.raw);

  if (res.status === 409) {
    const isPhoneConflict = res.body?.code === 'USER_PHONE_EXISTS' || 
                            res.body?.message?.includes('Số điện thoại') || 
                            res.body?.error?.includes('PHONE');
    if (isPhoneConflict) {
      console.log('   -> Correctly rejected with USER_PHONE_EXISTS (HTTP 409 Conflict)!');
    } else {
      throw new Error(`Expected phone conflict error code, got: ${JSON.stringify(res.body)}`);
    }
  } else if (res.status === 400 && res.body?.message?.includes('phone')) {
    console.log('   -> Rejected by validation pipe (HTTP 400)');
  } else {
    throw new Error(`Expected HTTP 409 Conflict, but received: ${res.status}`);
  }

  console.log('\n>>> SUCCESS: BUG 11 TEST PASSED! <<<');
}

runTest().catch((err) => {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
});
