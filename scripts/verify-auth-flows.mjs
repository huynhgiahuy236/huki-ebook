import { createRequire } from 'module';

const API_BASE = process.env.HUKI_API_BASE || 'http://localhost:3000/api/v1';
const WEB_BASE = process.env.HUKI_WEB_BASE || 'http://localhost:3100';

let passed = 0;
let failed = 0;

function assert(condition, message, detail) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
    return;
  }
  failed++;
  console.error(`  ❌ ${message}${detail ? ` — ${detail}` : ''}`);
}

function dataOf(response) {
  return response.data?.data ?? response.data;
}

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(options.token && { Authorization: `Bearer ${options.token}` }),
        ...(options.headers || {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

async function run() {
  console.log('='.repeat(72));
  console.log('VERIFY AUTHENTICATION & OTP VERIFICATION FLOWS');
  console.log('='.repeat(72));

  console.log('\n[Step 0] Service health check');
  const web = await fetch(`${WEB_BASE}/login`).catch(() => null);
  assert(!!web?.ok, `Web Portal live tại ${WEB_BASE}/login (Status: ${web?.status})`);

  console.log('\n[Step 1] Đăng ký tài khoản mới với thông tin chuẩn quốc tế');
  const testEmail = `user_otp_${Date.now()}@huki-test.vn`;
  const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
  const initialPassword = 'Password123!';

  const regRes = await request('/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Độc Giả Kiểm Thử OTP',
      email: testEmail,
      phone: testPhone,
      password: initialPassword,
    },
  });

  assert(regRes.ok || regRes.status === 201, `Đăng ký tài khoản mới thành công (${testEmail})`, JSON.stringify(regRes.data));

  console.log('\n[Step 2] Kiểm tra tài khoản chưa kích hoạt (status: PENDING) không thể đăng nhập');
  const unverifiedLoginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: testEmail,
      password: initialPassword,
    },
  });
  assert(
    unverifiedLoginRes.status === 401,
    `Hệ thống chặn đăng nhập khi chưa xác thực OTP (Status: ${unverifiedLoginRes.status})`,
    JSON.stringify(unverifiedLoginRes.data),
  );

  console.log('\n[Step 3] Xác thực mã OTP 6 số để kích hoạt tài khoản');
  const verifyRes = await request('/auth/verify-email', {
    method: 'POST',
    body: {
      token: '123456',
    },
  });
  assert(verifyRes.ok, 'Xác thực mã OTP thành công (Tài khoản đã ACTIVE)', JSON.stringify(verifyRes.data));

  console.log('\n[Step 4] Đăng nhập tài khoản sau khi đã kích hoạt OTP');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: testEmail,
      password: initialPassword,
    },
  });
  assert(loginRes.ok, 'Đăng nhập thành công sau khi xác thực OTP', JSON.stringify(loginRes.data));
  const userToken = dataOf(loginRes)?.tokens?.accessToken || dataOf(loginRes)?.accessToken;
  assert(!!userToken, 'Nhận Access Token hợp lệ từ Gateway');

  console.log('\n[Step 5] Yêu cầu Quên mật khẩu & Gửi mã OTP khôi phục');
  const forgotRes = await request('/auth/forgot-password', {
    method: 'POST',
    body: {
      email: testEmail,
    },
  });
  assert(forgotRes.ok, 'Gửi yêu cầu OTP quên mật khẩu thành công', JSON.stringify(forgotRes.data));

  console.log('\n[Step 6] Đặt lại mật khẩu mới với mã OTP 6 số');
  const newPassword = 'NewSecurePassword2026@!';
  const resetRes = await request('/auth/reset-password', {
    method: 'POST',
    body: {
      token: '123456',
      newPassword,
    },
  });
  assert(resetRes.ok, 'Đặt lại mật khẩu mới thành công', JSON.stringify(resetRes.data));

  console.log('\n[Step 7] Đăng nhập bằng mật khẩu mới');
  const newLoginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: testEmail,
      password: newPassword,
    },
  });
  assert(newLoginRes.ok, 'Đăng nhập thành công với mật khẩu mới vừa cập nhật', JSON.stringify(newLoginRes.data));

  console.log('\n' + '='.repeat(72));
  console.log(`KẾT QUẢ KIỂM TRA LUỒNG AUTH & OTP: ${passed} PASS / ${failed} FAIL`);
  console.log('='.repeat(72));

  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error('\n❌ Test dừng do lỗi:', err);
  process.exitCode = 1;
});
