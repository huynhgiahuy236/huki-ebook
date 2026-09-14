const bcrypt = require('../platform/node_modules/bcrypt');
const { Client } = require('../platform/node_modules/pg');

async function main() {
  const hash = await bcrypt.hash('Password123!', 12);
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_identity',
  });
  await client.connect();
  const res = await client.query(
    'UPDATE users SET password_hash = $1, status = $2, email_verified_at = NOW(), failed_login_attempts = 0, locked_until = NULL RETURNING id, email, role, status',
    [hash, 'ACTIVE']
  );
  console.log('✅ Đã cập nhật mật khẩu "Password123!" cho tất cả tài khoản:');
  console.table(res.rows);
  await client.end();
}

main().catch(console.error);
