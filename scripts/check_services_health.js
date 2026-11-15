const http = require('http');

const endpoints = [
  { name: 'Gateway Health', url: 'http://localhost:3000/api/v1/health' },
  { name: 'Web Next.js Front', url: 'http://localhost:3100' },
  { name: 'Identity Service', url: 'http://localhost:3001/api/v1/health' },
  { name: 'Business Service', url: 'http://localhost:3002/api/v1/health' },
  { name: 'Commerce Service', url: 'http://localhost:3003/api/v1/health' },
  { name: 'Shipping Service', url: 'http://localhost:3006/api/v1/health' },
  { name: 'Promotion Service', url: 'http://localhost:3005/api/v1/health' },
];

function check(ep) {
  return new Promise((resolve) => {
    http.get(ep.url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ name: ep.name, url: ep.url, status: res.statusCode, data: data.substring(0, 100) });
      });
    }).on('error', (err) => {
      resolve({ name: ep.name, url: ep.url, status: 'DOWN', error: err.message });
    });
  });
}

async function main() {
  console.log('=== CHECKING ALL SERVICES STATUS & HEALTH ===\n');
  for (const ep of endpoints) {
    const res = await check(ep);
    const isUp = res.status === 200 || res.status === 307 || res.status === 308;
    console.log(`[${isUp ? 'ONLINE' : 'STATUS ' + res.status}] ${ep.name.padEnd(20)} (${ep.url})`);
  }
}

main();

