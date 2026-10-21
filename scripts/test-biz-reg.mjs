import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { Client } = require(path.resolve(process.cwd(), 'platform/node_modules/pg'));

async function test() {
  const ts = Date.now();
  const email = `owner_${ts}@huki-test.vn`;

  console.log('1. Registering...');
  const reg = await fetch('http://localhost:3000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!', fullName: 'Owner Test', phone: '0987654321' }),
  });
  console.log('Reg status:', reg.status);

  console.log('2. Activating user in DB...');
  const client = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_identity' });
  await client.connect();
  await client.query('UPDATE users SET status = $1, email_verified_at = NOW() WHERE email = $2', ['ACTIVE', email]);
  await client.end();

  console.log('3. Logging in...');
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;
  console.log('Token extracted:', token ? token.slice(0, 20) + '...' : 'NULL');

  console.log('4. Registering business...');
  const bizRes = await fetch('http://localhost:3000/api/v1/businesses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: `Test Corp ${ts}`,
      taxCode: `TAX${ts.toString().slice(-9)}`,
      email,
      phone: '0908889999',
      address: '100 Test St',
      businessType: 'CORPORATION',
    }),
  });
  const bizJson = await bizRes.json();
  const businessId = bizJson.data?.id;
  console.log('Biz response status:', bizRes.status, 'bizId:', businessId);

  console.log('5. Creating book...');
  const bookRes = await fetch('http://localhost:3000/api/v1/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      businessId,
      title: `Test Book ${ts}`,
      description: 'Test description',
      price: 199000,
      format: 'BOTH',
      coverUrl: 'https://placehold.co/600x900/png?text=E2E',
      physicalDetails: { stock: 40, weight: 400, length: 22, width: 16, height: 2, physicalEnabled: true },
      digitalDetails: { digitalEnabled: true, allowOnlineRead: true, allowDownload: false, drmEnabled: true },
    }),
  });
  console.log('Book response status:', bookRes.status);
  console.log('Book response body:', await bookRes.json());
}

test().catch(console.error);
