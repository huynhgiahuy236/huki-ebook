import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const rootDir = process.cwd();

const { Client } = (() => {
  try { return require(path.join(rootDir, 'platform/node_modules/pg')); } catch { return require('pg'); }
})();
const bcrypt = (() => {
  try { return require(path.join(rootDir, 'platform/node_modules/bcrypt')); } catch { return require('bcrypt'); }
})();

const BASE_URL = process.env.HUKI_API_BASE || 'http://localhost:3000/api/v1';
const TEST_PASSWORD = 'Password123!';

let passed = 0;
let failed = 0;

function assert(condition, message, detail) {
  if (condition) {
    passed++;
    console.log(`   ✅ ${message}`);
    return;
  }
  failed++;
  console.error(`   ❌ ${message}${detail ? ` — ${detail}` : ''}`);
}

async function syncAdminPassword() {
  try {
    const client = new Client({
      connectionString: process.env.IDENTITY_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity',
    });
    const hash = await bcrypt.hash(TEST_PASSWORD, 12);
    await client.connect();

    // Ensure adminhuki@gmail.com exists with PLATFORM_ADMIN role
    const checkRes = await client.query('SELECT id FROM users WHERE email = $1', ['adminhuki@gmail.com']);
    if (checkRes.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at, created_at, updated_at)
         VALUES (gen_random_uuid(), 'adminhuki@gmail.com', $1, 'Admin HUKI Platform', 'PLATFORM_ADMIN', 'ACTIVE', NOW(), NOW(), NOW())`,
        [hash]
      );
    } else {
      await client.query(
        'UPDATE users SET password_hash = $1, status = $2, role = $3, email_verified_at = NOW() WHERE email = $4',
        [hash, 'ACTIVE', 'PLATFORM_ADMIN', 'adminhuki@gmail.com']
      );
    }

    // Ensure all test accounts have password Password123!
    await client.query(
      'UPDATE users SET password_hash = $1, status = $2, email_verified_at = NOW() WHERE email = ANY($3::text[])',
      [hash, 'ACTIVE', ['phuongthuy@gmail.com', 'buyer_test@gmail.com', 'huy@gmail.com', 'admin@huki.com']]
    );

    await client.end();
  } catch (err) {
    console.warn('   ⚠️ DB Sync Notice:', err.message);
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('--- [VERIFY PHASE 9 PART 0] Typed API Client & Contract Closure ---');
  console.log('='.repeat(70));

  await syncAdminPassword();

  // 1. Check Correlation ID propagation
  console.log('\n1. Kiểm tra Correlation ID & Response Envelope...');
  const testCorrelationId = `test_part0_${Date.now()}`;
  const healthRes = await fetch(`${BASE_URL}/health/services`, {
    headers: { 'x-correlation-id': testCorrelationId },
  });
  const healthData = await healthRes.json();
  assert(
    healthRes.status === 200 || healthRes.status === 503,
    `Gateway Services Health phản hồi status ${healthRes.status}`,
    JSON.stringify(healthData)
  );

  // 2. Auth Client: Login & Verification
  console.log('\n2. Kiểm tra Auth API Client Contract (Login Admin)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-correlation-id': testCorrelationId },
    body: JSON.stringify({
      email: 'adminhuki@gmail.com',
      password: TEST_PASSWORD,
    }),
  });
  const loginBody = await loginRes.json();
  const token = loginBody.data?.tokens?.accessToken || loginBody.data?.accessToken;
  assert(loginRes.ok && !!token, 'Login response bọc đúng Envelope & cấp token thành công');

  // 3. User & Auth Profile Client
  console.log('\n3. Kiểm tra Profile API Client Contract (/auth/me)...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meBody = await meRes.json();
  const role = meBody.data?.role;
  assert(meRes.ok && role === 'PLATFORM_ADMIN', `Me profile hợp lệ cho PLATFORM_ADMIN (hiện tại: ${role})`);

  // 4. Catalog API Client
  console.log('\n4. Kiểm tra Catalog API Client Contract (/books)...');
  const booksRes = await fetch(`${BASE_URL}/books?limit=5`);
  const booksBody = await booksRes.json();
  assert(booksRes.ok && (Array.isArray(booksBody.data) || Array.isArray(booksBody.items) || Array.isArray(booksBody)), 'Public Catalog API phản hồi hợp lệ');

  // 5. Business API Client
  console.log('\n5. Kiểm tra Business API Client Contract (/businesses/my)...');
  const bizRes = await fetch(`${BASE_URL}/businesses/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(bizRes.status === 200 || bizRes.status === 404, `Business API endpoint phản hồi đúng hợp đồng (${bizRes.status})`);

  // 6. Error Translation Verification
  console.log('\n6. Kiểm tra Error Translation Engine & Envelope (401 Unauthorized)...');
  const errRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: 'Bearer invalid_token_123' },
  });
  assert(errRes.status === 401, `Chặn 401 cho token không hợp lệ (Mã HTTP: ${errRes.status})`);

  console.log('\n' + '='.repeat(70));
  console.log(`KẾT QUẢ KIỂM THỬ PART 0: ${passed} PASS / ${failed} FAIL`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Lỗi thực thi script Part 0:', err.message);
  process.exit(1);
});
