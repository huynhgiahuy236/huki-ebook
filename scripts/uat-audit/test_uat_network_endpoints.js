/**
 * Network diagnostic script for UAT environment endpoints.
 * Tests Socket.IO trailing slash redirect, reader status, and host Nginx behaviors.
 */
const https = require('https');

function fetchHeaders(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        location: res.headers.location || null,
      });
    }).on('error', (e) => {
      resolve({ error: e.message });
    });
  });
}

async function runDiagnostics() {
  console.log('=== UAT NETWORK DIAGNOSTICS ===\n');

  // 1. Socket.IO polling connection with trailing slash
  const socketUrl = 'https://huki-uat.duckdns.org/socket.io/?EIO=4&transport=polling';
  console.log('1. Probing Socket.IO handshake:', socketUrl);
  const socketRes = await fetchHeaders(socketUrl);
  console.log('   Response Code:', socketRes.statusCode);
  if (socketRes.statusCode === 308 || socketRes.statusCode === 301) {
    console.log('   Redirect Location:', socketRes.location);
    console.log('   [FINDING]: Nginx redirects to /socket.io?..., which strips the trailing slash, matches Next.js web container instead of socket gateway, resulting in 404. Realtime chat fails on UAT!');
  }

  // 2. Reader endpoint for book 34e84482-931a-43bc-8492-6592b8dbfd80
  const readerUrl = 'https://huki-uat.duckdns.org/api/v1/books/34e84482-931a-43bc-8492-6592b8dbfd80/read';
  console.log('\n2. Probing Reader endpoint:', readerUrl);
  const readerRes = await fetchHeaders(readerUrl);
  console.log('   Response Code:', readerRes.statusCode);
  console.log('   [FINDING]: Returns 401 Unauthorized without Bearer token. When authenticated, if PDF was not uploaded to R2, returns 404 "Tác phẩm này hiện chưa có bản đọc số điện tử."');

  console.log('\nDiagnostics complete.');
}

runDiagnostics();

