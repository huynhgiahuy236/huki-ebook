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
  console.log('=== E2E TEST: BUG 4 & 5 (Store Query & Navigation Consistency) ===\n');

  // Test 1: Query Nha Nam store directly by slug/ID
  console.log('1. Checking GET /api/v1/stores/store-002-nhanam-books...');
  const storeRes = await get('http://localhost:3100/api/v1/stores/store-002-nhanam-books');
  if (storeRes.status !== 200 || !storeRes.body?.data) {
    throw new Error(`Failed to load store: HTTP ${storeRes.status}`);
  }
  const storeData = storeRes.body.data;
  console.log(`   -> Found store: "${storeData.name}" (totalProducts: ${storeData.totalProducts})`);
  if (storeData.name !== 'Nhã Nam Books Official') {
    throw new Error(`Unexpected store name: ${storeData.name}`);
  }

  // Test 2: Query books by custom store ID (Verifying BookListQueryDto relaxes @IsUUID to @IsString)
  console.log('\n2. Checking GET /api/v1/books?limit=100&business=store-002-nhanam-books...');
  const booksRes = await get('http://localhost:3100/api/v1/books?limit=100&business=store-002-nhanam-books');
  if (booksRes.status !== 200) {
    throw new Error(`Query returned status ${booksRes.status}. Expected 200! Body: ${JSON.stringify(booksRes.body || booksRes.raw)}`);
  }
  const booksList = Array.isArray(booksRes.body?.data) ? booksRes.body.data : [];
  console.log(`   -> Returned ${booksList.length} books for store-002-nhanam-books (No 400 Bad Request)`);
  if (booksList.length === 0) {
    throw new Error('Expected books for Nha Nam store, but got 0');
  }

  // Test 3: Check Kim Dong store books
  console.log('\n3. Checking Kim Dong books (store 501ece69-23b9-4126-9b5e-e3dc206d0c20)...');
  const kdRes = await get('http://localhost:3100/api/v1/books?limit=100&store=501ece69-23b9-4126-9b5e-e3dc206d0c20');
  const kdBooks = Array.isArray(kdRes.body?.data) ? kdRes.body.data : [];
  console.log(`   -> Returned ${kdBooks.length} books for Kim Dong`);
  if (kdBooks.length < 20) {
    throw new Error(`Expected at least 20 books for Kim Dong, got ${kdBooks.length}`);
  }

  // Test 4: Check NXB Tre store books
  console.log('\n4. Checking NXB Tre books (store da24d45d-b458-4859-8367-a6c862d4d3a4)...');
  const treRes = await get('http://localhost:3100/api/v1/books?limit=100&store=da24d45d-b458-4859-8367-a6c862d4d3a4');
  const treBooks = Array.isArray(treRes.body?.data) ? treRes.body.data : [];
  console.log(`   -> Returned ${treBooks.length} books for NXB Tre`);
  if (treBooks.length < 20) {
    throw new Error(`Expected at least 20 books for NXB Tre, got ${treBooks.length}`);
  }

  // Test 5: Verify Book Detail Store Resolution
  console.log('\n5. Checking Book Detail Store Resolution for a Kim Dong book...');
  const sampleKdBook = kdBooks[0];
  console.log(`   Book: "${sampleKdBook.title}" (ID: ${sampleKdBook.id})`);
  console.log(`   Linked storeId: ${sampleKdBook.storeId}`);
  if (sampleKdBook.storeId !== '501ece69-23b9-4126-9b5e-e3dc206d0c20') {
    throw new Error(`Expected storeId to be Kim Dong, got: ${sampleKdBook.storeId}`);
  }

  console.log('\n>>> SUCCESS: ALL TESTS FOR BUG 4 & 5 PASSED! <<<');
}

runTest().catch((err) => {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
});

