import path from 'path';

const BASE_URL = process.env.HUKI_API_BASE || 'http://localhost:3000/api/v1';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, testName, detail = '') {
  if (condition) {
    passed++;
    console.log(`   ✅ [PASS] ${testName}`);
    return true;
  }
  failed++;
  const msg = `❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`;
  console.error(`   ${msg}`);
  errors.push(msg);
  return false;
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return {
      status: res.status,
      ok: res.ok,
      data,
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err.message,
    };
  }
}

async function runPhase1DiscoveryE2E() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU E2E PHASE 1: KHÁM PHÁ SẢN PHẨM & TÌM KIẾM (NO MOCK)');
  console.log(`📡 Kết nối API Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Kiểm tra Danh mục đa tầng (Category Tree)
  console.log('🔹 1. Kiểm tra Danh mục cây đa tầng (/categories/tree)...');
  const catRes = await request('/categories/tree');
  assert(catRes.ok && catRes.status === 200, 'Endpoint /categories/tree phản hồi HTTP 200', `Status: ${catRes.status}`);
  const categories = catRes.data?.data || catRes.data || [];
  assert(Array.isArray(categories) && categories.length > 0, `Database có ít nhất 1 danh mục thật (Hiện có: ${categories.length} danh mục)`);
  
  const sampleCat = categories[0];
  if (sampleCat) {
    assert(sampleCat.id && sampleCat.name && sampleCat.slug, `Danh mục mẫu '${sampleCat.name}' có đầy đủ id, name, slug`, JSON.stringify(sampleCat));
  }

  // 2. Kiểm tra Danh sách Tác giả thật
  console.log('\n🔹 2. Kiểm tra Tác giả thật (/authors)...');
  const autRes = await request('/authors?limit=8');
  assert(autRes.ok && autRes.status === 200, 'Endpoint /authors phản hồi HTTP 200', `Status: ${autRes.status}`);
  const authors = autRes.data?.data || autRes.data || [];
  assert(Array.isArray(authors) && authors.length > 0, `Database có ít nhất 1 tác giả thật (Hiện có: ${authors.length} tác giả)`);

  // 3. Kiểm tra Danh sách Nhà xuất bản / Đối tác thật
  console.log('\n🔹 3. Kiểm tra Nhà xuất bản thật (/publishers)...');
  const pubRes = await request('/publishers?limit=6');
  assert(pubRes.ok && pubRes.status === 200, 'Endpoint /publishers phản hồi HTTP 200', `Status: ${pubRes.status}`);
  const publishers = pubRes.data?.data || pubRes.data || [];
  assert(Array.isArray(publishers) && publishers.length > 0, `Database có ít nhất 1 NXB thật (Hiện có: ${publishers.length} NXB)`);

  // 4. Kiểm tra Danh sách Sách thật trên Storefront (/books)
  console.log('\n🔹 4. Kiểm tra Danh sách Sách thật (/books)...');
  const booksRes = await request('/books?limit=24');
  assert(booksRes.ok && booksRes.status === 200, 'Endpoint /books phản hồi HTTP 200', `Status: ${booksRes.status}`);
  const bookList = booksRes.data?.data || booksRes.data?.books || booksRes.data || [];
  assert(Array.isArray(bookList) && bookList.length > 0, `Database có ít nhất 1 cuốn sách thật (Hiện có: ${bookList.length} cuốn)`);

  let targetBook = null;
  if (bookList.length > 0) {
    targetBook = bookList[0];
    assert(Boolean(targetBook.id), `Sách mẫu có ID hợp lệ: ${targetBook.id}`);
    assert(Boolean(targetBook.title), `Sách mẫu có Tiêu đề thật: "${targetBook.title}"`);
    assert(typeof targetBook.price === 'number' || typeof targetBook.pricePaper === 'number' || typeof targetBook.priceEbook === 'number', `Sách có trường giá hợp lệ`);
  }

  // 5. Kiểm tra Flash Sale thật đang hoạt động
  console.log('\n🔹 5. Kiểm tra Flash Sale thật (/flash-sales/active)...');
  const flashRes = await request('/flash-sales/active');
  assert(flashRes.ok && flashRes.status === 200, 'Endpoint /flash-sales/active phản hồi HTTP 200', `Status: ${flashRes.status}`);

  // 6. Kiểm tra Tìm kiếm Từ Khóa (Faceted Search)
  console.log('\n🔹 6. Kiểm tra Tìm kiếm Từ khóa thật (/books?search=...)...');
  const searchKeyword = targetBook ? targetBook.title.split(' ')[0] : 'Sách';
  const searchRes = await request(`/books?search=${encodeURIComponent(searchKeyword)}&limit=10`);
  assert(searchRes.ok, `Tìm kiếm từ khóa "${searchKeyword}" phản hồi HTTP 200`, `Status: ${searchRes.status}`);
  const searchResults = searchRes.data?.data || searchRes.data?.books || searchRes.data || [];
  assert(Array.isArray(searchResults), `Kết quả tìm kiếm trả về dạng mảng dữ liệu (Số lượng: ${searchResults.length})`);

  // 7. Kiểm tra Lọc theo Định dạng (Filter by format: physical / ebook)
  console.log('\n🔹 7. Kiểm tra Lọc Định Dạng Sách (/books?format=...)...');
  const ebookFilterRes = await request('/books?format=DIGITAL&limit=5');
  assert(ebookFilterRes.ok, 'Lọc sách định dạng Ebook phản hồi thành công', `Status: ${ebookFilterRes.status}`);
  
  const physicalFilterRes = await request('/books?format=PHYSICAL&limit=5');
  assert(physicalFilterRes.ok, 'Lọc sách định dạng Sách Giấy phản hồi thành công', `Status: ${physicalFilterRes.status}`);

  // 8. Kiểm tra Chi tiết Sách cụ thể (Product Detail Page)
  console.log('\n🔹 8. Kiểm tra Chi Tiết Sách cụ thể (/books/:id)...');
  if (targetBook && targetBook.id) {
    const detailRes = await request(`/books/${targetBook.id}`);
    assert(detailRes.ok && detailRes.status === 200, `Chi tiết sách ${targetBook.id} phản hồi HTTP 200`, `Status: ${detailRes.status}`);
    const detailData = detailRes.data?.data || detailRes.data;
    assert(detailData && detailData.title === targetBook.title, `Dữ liệu chi tiết khớp đúng tiêu đề: "${detailData?.title}"`);
  } else {
    assert(false, 'Không thể kiểm tra chi tiết sách vì danh sách sách trống');
  }

  // 9. Kiểm tra Đánh giá & Review thật của sách (/books/:id/reviews)
  console.log('\n🔹 9. Kiểm tra Đánh giá từ Độc giả (/books/:id/reviews)...');
  if (targetBook && targetBook.id) {
    const reviewRes = await request(`/books/${targetBook.id}/reviews`);
    assert(reviewRes.ok && reviewRes.status === 200, `Endpoint đánh giá phản hồi HTTP 200`, `Status: ${reviewRes.status}`);
  }

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT PHASE 1:`);
  console.log(`   ✅ PASSED: ${passed}`);
  console.log(`   ❌ FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\n🛑 PHÁT HIỆN LỖI TRONG PHASE 1:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.log('\n⚠️ THEO NGUYÊN TẮC: Dừng lại ngay lập tức, không tự ý sửa code! Chờ lệnh từ người dùng.');
    process.exit(1);
  } else {
    console.log('\n🎉 PHASE 1 HOÀN TẤT THÀNH CÔNG RỰC RỠ 100%!');
    console.log('👉 Người dùng có thể kiểm tra trực tiếp giao diện Storefront & Tìm kiếm trên: http://localhost:3100');
    process.exit(0);
  }
}

runPhase1DiscoveryE2E();
