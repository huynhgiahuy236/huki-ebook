import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Client } = (() => {
  try { return require('pg'); } catch { return require('../platform/node_modules/pg'); }
})();
const bcrypt = (() => {
  try { return require('bcrypt'); } catch { return require('../platform/node_modules/bcrypt'); }
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
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, 'adminhuki@gmail.com'],
    );
    await client.end();
  } catch (err) {
    console.warn('   ⚠️ Không thể sync database password trực tiếp, dùng mật khẩu hiện tại:', err.message);
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('--- [VERIFY PHASE 8 PART 0] Admin HUKI API Integration Verification ---');
  console.log('='.repeat(70));

  await syncAdminPassword();

  // 1. Đăng nhập với tài khoản Platform Admin
  console.log('\n1. Đăng nhập Admin HUKI (adminhuki@gmail.com)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'adminhuki@gmail.com',
      password: TEST_PASSWORD,
    }),
  });

  const loginData = await loginRes.json();
  const token = loginData.data?.tokens?.accessToken || loginData.data?.accessToken;
  assert(loginRes.ok && !!token, 'Đăng nhập Admin HUKI thành công', JSON.stringify(loginData));

  // 2. Xác thực Role PLATFORM_ADMIN qua /auth/me
  console.log('\n2. Kiểm tra Role và Quyền Admin qua /auth/me...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  const role = meData.data?.role;
  assert(meRes.ok && role === 'PLATFORM_ADMIN', `Xác thực đúng Role PLATFORM_ADMIN (hiện tại: ${role})`);

  // 3. Kiểm tra Giám sát Sức khỏe Gateway & 6 Microservices
  console.log('\n3. Gọi Endpoint Giám sát Sức khỏe (/health/services)...');
  const healthRes = await fetch(`${BASE_URL}/health/services`);
  const healthData = await healthRes.json();
  assert(
    healthRes.ok || healthRes.status === 200 || healthRes.status === 503,
    `Health check endpoint phản hồi (Status: ${healthRes.status})`,
    JSON.stringify(healthData)
  );

  // 4. Lấy danh sách Doanh nghiệp cho Admin (/businesses/admin/all)
  console.log('\n4. Gọi API Admin Doanh Nghiệp (/businesses/admin/all)...');
  const bizRes = await fetch(`${BASE_URL}/businesses/admin/all?limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const bizData = await bizRes.json();
  const businesses = bizData.data || bizData.items || (Array.isArray(bizData) ? bizData : []);
  assert(bizRes.ok && Array.isArray(businesses), `Lấy danh sách Doanh nghiệp thành công (${businesses.length} DN)`);

  // 5. Lấy danh sách Cửa hàng cho Admin (/stores/admin/all)
  console.log('\n5. Gọi API Admin Cửa Hàng (/stores/admin/all)...');
  const storeRes = await fetch(`${BASE_URL}/stores/admin/all?limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const storeData = await storeRes.json();
  const stores = storeData.data || storeData.items || (Array.isArray(storeData) ? storeData : []);
  assert(storeRes.ok && Array.isArray(stores), `Lấy danh sách Cửa hàng thành công (${stores.length} stores)`);

  // 6. Lấy danh sách Sách toàn sàn (/books)
  console.log('\n6. Gọi API Catalog Sách Toàn Sàn (/books)...');
  const bookRes = await fetch(`${BASE_URL}/books?limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const bookData = await bookRes.json();
  const books = bookData.data || bookData.items || (Array.isArray(bookData) ? bookData : []);
  assert(bookRes.ok && Array.isArray(books), `Lấy danh sách Sách thành công (${books.length} sách)`);

  // 7. Kiểm tra Bảo vệ RBAC Guard: Người dùng vãng lai/Guest bị từ chối
  console.log('\n7. Kiểm tra RBAC: Request không Token bị chặn 401...');
  const unauthorizedRes = await fetch(`${BASE_URL}/businesses/admin/all`);
  assert(unauthorizedRes.status === 401, `Guest bị chặn 401 đúng chuẩn (${unauthorizedRes.status})`);

  console.log('\n' + '='.repeat(70));
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed} PASS / ${failed} FAIL`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Lỗi thực thi script Part 0:', err.message);
  process.exit(1);
});
