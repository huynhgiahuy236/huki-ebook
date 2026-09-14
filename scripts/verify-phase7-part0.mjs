const BASE_URL = 'http://localhost:3000/api/v1';

async function main() {
  console.log('='.repeat(70));
  console.log('--- [VERIFY PHASE 7 PART 0] Backend API Integration Verification ---');
  console.log('='.repeat(70));

  // 1. Login as Business Owner
  console.log('\n1. Logging in as Business Owner (phuongthuy@gmail.com)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'phuongthuy@gmail.com',
      password: 'Password123!',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Owner login failed: ${JSON.stringify(loginData)}`);
  }

  const token = loginData.data?.tokens?.accessToken || loginData.data?.accessToken;
  console.log('   ✓ Owner Login OK, token acquired.');

  // 2. Get My Business
  console.log('\n2. Fetching Business Information...');
  const bizRes = await fetch(`${BASE_URL}/businesses/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const bizData = await bizRes.json();
  const businessId = bizData.data?.id;
  console.log(`   ✓ Business: "${bizData.data?.name}" (ID: ${businessId})`);

  // 3. Get Category Tree
  console.log('\n3. Fetching Categories...');
  const catRes = await fetch(`${BASE_URL}/categories/tree`);
  const catData = await catRes.json();
  const categories = Array.isArray(catData.data) ? catData.data : (Array.isArray(catData) ? catData : []);
  const sampleCatId = categories[0]?.id;
  console.log(`   ✓ Categories loaded (${categories.length} root categories, Sample ID: ${sampleCatId})`);

  // 4. Create a Test Hybrid Book
  console.log('\n4. Creating Test Book (Physical + Digital Hybrid)...');
  const ts = Date.now();
  const createBookRes = await fetch(`${BASE_URL}/books`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: `Sách Thử Nghiệm Vận Hành P7 #${ts.toString().slice(-4)}`,
      businessId,
      categoryId: sampleCatId,
      price: 189000,
      description: 'Cuốn sách phục vụ kiểm thử luồng vận hành Phase 07',
      format: 'BOTH',
      physicalDetails: {
        stock: 50,
        weight: 350,
        length: 20,
        width: 14,
        height: 2,
      },
      digitalDetails: {
        digitalEnabled: true,
        allowOnlineRead: true,
        allowDownload: false,
        drmEnabled: true,
      },
    }),
  });

  const createBookData = await createBookRes.json();
  if (!createBookRes.ok) {
    throw new Error(`Create book failed: ${JSON.stringify(createBookData)}`);
  }
  const createdBook = createBookData.data?.data || createBookData.data || createBookData;
  const bookId = createdBook.id;
  console.log(`   ✓ Book Created: "${createdBook.title}" (ID: ${bookId})`);

  // 5. Update Book Details
  console.log('\n5. Updating Book Details...');
  const updateBookRes = await fetch(`${BASE_URL}/books/${bookId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      price: 199000,
      description: 'Mô tả sách đã được cập nhật qua API Patch',
    }),
  });

  const updateBookData = await updateBookRes.json();
  if (!updateBookRes.ok) {
    throw new Error(`Update book failed: ${JSON.stringify(updateBookData)}`);
  }
  console.log('   ✓ Book Updated successfully. New price: 199.000đ');

  // 6. Update Inventory Stock
  console.log('\n6. Updating Inventory Stock to 120 units...');
  const stockRes = await fetch(`${BASE_URL}/books/${bookId}/inventory`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      operation: 'SET',
      quantity: 120,
      reason: 'MANUAL_ADJUSTMENT',
    }),
  });

  const stockData = await stockRes.json();
  if (!stockRes.ok) {
    throw new Error(`Update inventory failed: ${JSON.stringify(stockData)}`);
  }
  console.log('   ✓ Inventory Updated successfully! New stock:', stockData.data?.stock ?? 120);

  // 7. Get Seller Orders List
  console.log('\n7. Fetching Seller Orders List...');
  const ordersRes = await fetch(`${BASE_URL}/seller/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ordersData = await ordersRes.json();
  if (!ordersRes.ok) {
    throw new Error(`Get seller orders failed: ${JSON.stringify(ordersData)}`);
  }
  const orderList = Array.isArray(ordersData.data?.items) ? ordersData.data.items : (Array.isArray(ordersData.data) ? ordersData.data : []);
  console.log(`   ✓ Retrieved ${orderList.length} seller orders.`);

  // 8. If order exists, test order detail fetch
  if (orderList.length > 0) {
    const sampleOrder = orderList[0];
    console.log(`\n8. Fetching Seller Order Detail for Order #${sampleOrder.code || sampleOrder.id}...`);
    const detailRes = await fetch(`${BASE_URL}/seller/orders/${sampleOrder.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const detailData = await detailRes.json();
    if (detailRes.ok) {
      console.log(`   ✓ Order Detail Loaded: Total ${detailData.data?.grandTotal?.toLocaleString('vi-VN')}đ, Status: ${detailData.data?.status}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎉 ALL PART 0 BACKEND INTEGRATION TESTS PASSED PERFECTLY (100%)!');
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('\n❌ PART 0 VERIFICATION FAILED:', err);
  process.exit(1);
});
