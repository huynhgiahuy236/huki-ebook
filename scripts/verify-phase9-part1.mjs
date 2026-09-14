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

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return {
      status: res.status,
      ok: res.ok,
      data,
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err.message,
    };
  }
}

function extractToken(res) {
  const d = res.data?.data || res.data;
  return d?.tokens?.accessToken || d?.accessToken;
}

function extractUser(res) {
  const d = res.data?.data || res.data;
  return d?.user;
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

    await client.end();
  } catch (err) {
    console.warn('   ⚠️ DB Sync Notice:', err.message);
  }
}

async function activateUserInDb(email) {
  try {
    const client = new Client({
      connectionString: process.env.IDENTITY_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_identity',
    });
    await client.connect();
    await client.query(
      'UPDATE users SET status = $1, email_verified_at = NOW() WHERE email = $2',
      ['ACTIVE', email]
    );
    await client.end();
  } catch (err) {
    console.warn('   ⚠️ DB Activate Notice:', err.message);
  }
}

async function main() {
  console.log('='.repeat(72));
  console.log('--- [VERIFY PHASE 9 PART 1] Identity, Business Approval, Provisioning & Login ---');
  console.log('='.repeat(72));

  await syncAdminPassword();

  const ts = Date.now();

  // -------------------------------------------------------------
  // LUỒNG 1: Guest Đăng Ký Tài Khoản & Gửi Hồ Sơ Doanh Nghiệp
  // -------------------------------------------------------------
  console.log('\n[Luồng 1] Guest đăng ký tài khoản & nộp hồ sơ Doanh nghiệp...');
  const newOwnerEmail = `p9_owner_${ts}@huki-test.vn`;
  const regUserRes = await request('/auth/register', {
    method: 'POST',
    body: {
      email: newOwnerEmail,
      password: TEST_PASSWORD,
      fullName: `Chủ Doanh Nghiệp P9 ${ts.toString().slice(-4)}`,
      phone: `098${Math.floor(1000000 + Math.random() * 9000000)}`,
    },
  });

  // Activate email for test in DB
  await activateUserInDb(newOwnerEmail);

  // Login to acquire token
  const ownerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: newOwnerEmail, password: TEST_PASSWORD },
  });
  const newOwnerToken = extractToken(ownerLogin);
  assert(ownerLogin.ok && !!newOwnerToken, `Guest đăng ký & đăng nhập tài khoản thành công (${newOwnerEmail})`);

  // Nộp hồ sơ Doanh nghiệp
  const bizTaxCode = `TAX${Math.floor(100000000 + Math.random() * 900000000)}`;
  const regBizRes = await request('/businesses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${newOwnerToken}` },
    body: {
      name: `Công Ty Cổ Phần Sách P9 ${ts.toString().slice(-4)}`,
      taxCode: bizTaxCode,
      email: newOwnerEmail,
      phone: '0987654321',
      address: '99 Đường Sách, Quận 1, TP.HCM',
      businessType: 'CORPORATION',
    },
  });

  const createdBiz = regBizRes.data?.data || regBizRes.data;
  assert(regBizRes.ok && !!createdBiz?.id, `Nộp hồ sơ Doanh nghiệp thành công (ID: ${createdBiz?.id}, Status: ${createdBiz?.status || 'PENDING_APPROVAL'})`);
  const businessId = createdBiz?.id;

  // -------------------------------------------------------------
  // LUỒNG 2: Admin HUKI Phê Duyệt Doanh Nghiệp
  // -------------------------------------------------------------
  console.log('\n[Luồng 2] Admin HUKI phê duyệt Doanh nghiệp...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'adminhuki@gmail.com', password: TEST_PASSWORD },
  });
  const adminToken = extractToken(adminLogin);
  assert(adminLogin.ok && !!adminToken, 'Admin HUKI đăng nhập thành công');

  const approveBizRes = await request(`/businesses/${businessId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(approveBizRes.ok, `Admin HUKI duyệt Doanh nghiệp thành công (Status: APPROVED)`);

  // -------------------------------------------------------------
  // LUỒNG 3: Owner Direct Provisioning Tạo Tài Khoản Admin Con
  // -------------------------------------------------------------
  console.log('\n[Luồng 3] Owner cấp tài khoản trực tiếp (Direct Provisioning) cho Admin con...');
  // Owner đăng nhập lại để cập nhật role và business context
  const ownerReLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: newOwnerEmail, password: TEST_PASSWORD },
  });
  const activeOwnerToken = extractToken(ownerReLogin);

  const staffEmail = `staff_p9_${ts}@huki.vn`;
  const staffTempPassword = 'InitStaffPassword123!';
  const staffPermissions = ['ORDER_VIEW', 'ORDER_PROCESS'];

  const provStaffRes = await request(`/businesses/${businessId}/members/provision`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${activeOwnerToken}` },
    body: {
      fullName: `Nhân Viên Xử Lý Đơn P9 ${ts.toString().slice(-4)}`,
      email: staffEmail,
      phone: `097${Math.floor(1000000 + Math.random() * 9000000)}`,
      initialPassword: staffTempPassword,
      role: 'ORDER_STAFF',
      permissions: staffPermissions,
    },
  });

  const staffMember = provStaffRes.data?.data || provStaffRes.data;
  assert(provStaffRes.ok && !!staffMember?.id, `Owner provision thành công Admin con (${staffEmail}, Member ID: ${staffMember?.id})`);

  // -------------------------------------------------------------
  // LUỒNG 4: Admin Con Đăng Nhập Lần Đầu & Bắt Buộc Đổi Mật Khẩu
  // -------------------------------------------------------------
  console.log('\n[Luồng 4] Admin con đăng nhập lần đầu & đổi mật khẩu...');
  const staffFirstLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: staffEmail, password: staffTempPassword },
  });

  const staffUser = extractUser(staffFirstLogin);
  const staffTempToken = extractToken(staffFirstLogin);
  assert(staffFirstLogin.ok && staffUser?.mustChangePassword === true, 'Admin con đăng nhập lần đầu nhận diện mustChangePassword = true');

  const staffNewPassword = 'SecureStaffPassword123!';
  const changePwdRes = await request('/auth/change-password', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${staffTempToken}` },
    body: {
      currentPassword: staffTempPassword,
      newPassword: staffNewPassword,
    },
  });
  assert(changePwdRes.ok, 'Admin con đổi mật khẩu khởi tạo thành công');

  // Đăng nhập lại bằng mật khẩu mới
  const staffFinalLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: staffEmail, password: staffNewPassword },
  });
  const staffFinalUser = extractUser(staffFinalLogin);
  const staffFinalToken = extractToken(staffFinalLogin);
  assert(staffFinalLogin.ok && staffFinalUser?.mustChangePassword === false, 'Admin con đăng nhập với mật khẩu mới (mustChangePassword = false)');

  // -------------------------------------------------------------
  // LUỒNG 5: Kiểm Tra Quyền Hạn & Quyền Truy Cập Business Của Staff
  // -------------------------------------------------------------
  console.log('\n[Luồng 5] Kiểm tra quyền hạn và Business context của Admin con...');
  const staffBizRes = await request('/businesses/my', {
    headers: { Authorization: `Bearer ${staffFinalToken}` },
  });
  const staffBizData = staffBizRes.data?.data || staffBizRes.data;
  const currentMember = staffBizData?.currentMember;

  assert(staffBizRes.ok && currentMember?.role === 'ORDER_STAFF', 'Admin con liên kết đúng Doanh nghiệp với role ORDER_STAFF');
  assert(
    JSON.stringify(currentMember?.permissions?.sort()) === JSON.stringify(staffPermissions.sort()),
    `Quyền hạn của Admin con khớp chính xác với phân quyền được cấp: [${staffPermissions.join(', ')}]`
  );

  console.log('\n' + '='.repeat(72));
  console.log(`KẾT QUẢ KIỂM THỬ PART 1: ${passed} PASS / ${failed} FAIL`);
  console.log('='.repeat(72));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Lỗi thực thi script Part 1:', err.message);
  process.exit(1);
});
