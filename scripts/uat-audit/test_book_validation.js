const http = require('http');
const crypto = require('crypto');

// Minimal HS256 jwt generator
function createToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

const secret = '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0';
const token = createToken({
  sub: 'mock-seller-id',
  email: 'seller@test.com',
  role: 'BUSINESS',
  roles: ['BUSINESS', 'SELLER'],
  businessId: 'mock-biz-id',
  exp: Math.floor(Date.now() / 1000) + 3600,
}, secret);

const payload = JSON.stringify({
  title: 'Test Sách Update',
  description: 'Mô tả test hợp lệ',
  price: 99000,
  format: 'PHYSICAL',
  status: 'PUBLISHED', // Non-whitelisted field sent by SellerEditProductView
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 3003, // commerce-service
  path: '/api/v1/books/c9b106bb-9ea5-4377-87e1-ba2c641e4738',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Authorization': `Bearer ${token}`,
  },
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Response body:', data);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(payload);
req.end();
