const fs = require('fs');
const path = require('path');

// Read platform/.env manually
const envPath = path.resolve(__dirname, '../../platform/.env');
let jwtSecret = 'your-super-secret-jwt-key';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('JWT_SECRET=')) {
      jwtSecret = line.split('=')[1].trim();
      break;
    }
  }
}

console.log('Using JWT secret:', jwtSecret ? jwtSecret.slice(0, 5) + '***' : 'not found');

// Generate an admin token using jwt from platform/node_modules/jsonwebtoken
const jwt = require(path.resolve(__dirname, '../../platform/node_modules/jsonwebtoken'));

const adminToken = jwt.sign(
  {
    sub: '20eb20a3-1058-4e2e-a043-a208fe6f84ba',
    id: '20eb20a3-1058-4e2e-a043-a208fe6f84ba',
    email: 'adminhuki@gmail.com',
    fullName: 'HuKi Super Admin',
    role: 'PLATFORM_ADMIN',
  },
  jwtSecret,
  { expiresIn: '1h' }
);

async function testFlashSaleValidation() {
  console.log('\n--- 1. Testing with payload from AdminFlashSaleView.tsx ---');
  // What the form sends when creating a platform flash sale
  const payload1 = {
    name: 'Khung giờ Sale 12.12',
    description: '',
    bannerUrl: '',
    scope: 'PLATFORM',
    registrationStartsAt: new Date().toISOString(),
    registrationEndsAt: new Date(Date.now() + 3600000 * 2).toISOString(),
    startsAt: new Date(Date.now() + 3600000 * 2 + 120000).toISOString(),
    endsAt: new Date(Date.now() + 3600000 * 6).toISOString(),
    minStores: 1,
    maxStores: 10,
    discountPercent: 30,
    maxPerUser: 1,
  };

  try {
    const res = await fetch('http://localhost:3000/api/v1/flash-sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + adminToken,
      },
      body: JSON.stringify(payload1),
    });
    const data = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testFlashSaleValidation();

