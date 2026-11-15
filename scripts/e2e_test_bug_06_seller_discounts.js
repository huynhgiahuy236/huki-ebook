const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('=== E2E TEST: BUG 6 (Seller Discounts Books Loading) ===\n');

  // Test 1: Seller Tri Tue Viet books query
  console.log('1. Checking books for Seller Tri Tue Viet (store 3094e54e-2549-42cc-92fb-14a8f8589277)...');
  const ttvRes = await get('http://localhost:3100/api/v1/books?limit=100&business=3094e54e-2549-42cc-92fb-14a8f8589277');
  if (ttvRes.status !== 200) {
    throw new Error(`Failed to load books: HTTP ${ttvRes.status}`);
  }
  const ttvBooks = Array.isArray(ttvRes.body?.data) ? ttvRes.body.data : [];
  console.log(`   -> Found ${ttvBooks.length} books for Tri Tue Viet`);
  if (ttvBooks.length === 0) {
    throw new Error('Expected books for Tri Tue Viet, but got 0');
  }

  // Test 2: Seller Alpha Books
  console.log('\n2. Checking books for Seller Alpha Books (store 51c48059-37be-46a2-b4a6-04a8365f8cbd)...');
  const alphaRes = await get('http://localhost:3100/api/v1/books?limit=100&business=51c48059-37be-46a2-b4a6-04a8365f8cbd');
  const alphaBooks = Array.isArray(alphaRes.body?.data) ? alphaRes.body.data : [];
  console.log(`   -> Found ${alphaBooks.length} books for Alpha Books`);
  if (alphaBooks.length === 0) {
    throw new Error('Expected books for Alpha Books, but got 0');
  }

  // Test 3: Seller Nha Nam Books
  console.log('\n3. Checking books for Seller Nha Nam Books (store store-002-nhanam-books)...');
  const nnRes = await get('http://localhost:3100/api/v1/books?limit=100&business=store-002-nhanam-books');
  const nnBooks = Array.isArray(nnRes.body?.data) ? nnRes.body.data : [];
  console.log(`   -> Found ${nnBooks.length} books for Nha Nam Books`);
  if (nnBooks.length === 0) {
    throw new Error('Expected books for Nha Nam Books, but got 0');
  }

  console.log('\n>>> SUCCESS: ALL TESTS FOR BUG 6 PASSED! <<<');
}

runTest().catch((err) => {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
});

