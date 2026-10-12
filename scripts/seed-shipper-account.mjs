import { createRequire } from 'module';
const require = createRequire('e:/HuKi/platform/node_modules/');
const { Pool } = require('pg');

async function seedShipper() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_identity' });
  
  const email = 'shipper@huki.vn';
  const passwordHash = '$2b$10$oJHWVWOL0pvuuV5Btar75OR7K9ofx7yN3MuqWQAsjZeOGUfpNM7Sy'; // Password123!
  const fullName = 'Bưu Tá Nguyễn Văn Vận';
  const phone = '0988776655';
  
  const existing = await pool.query("SELECT id, email, role FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    await pool.query(
      "UPDATE users SET role = 'DELIVERY_STAFF', status = 'ACTIVE', password_hash = $1, full_name = $2, phone = $3, updated_at = NOW() WHERE email = $4",
      [passwordHash, fullName, phone, email]
    );
    console.log(`✓ Updated existing shipper account: ${email} (Role: DELIVERY_STAFF)`);
  } else {
    const insertRes = await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, phone, role, status, email_verified_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'DELIVERY_STAFF', 'ACTIVE', NOW(), NOW(), NOW())
       RETURNING id, email, role, status`,
      [email, passwordHash, fullName, phone]
    );
    console.log(`✓ Created new shipper account:`, insertRes.rows[0]);
  }

  await pool.end();
}

seedShipper().catch(err => {
  console.error('Error seeding shipper account:', err);
  process.exit(1);
});
