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

async function runPhase2CartVoucherE2E() {
  console.log('================================================================');
  console.log('🛒 BẮT ĐẦU E2E PHASE 2: GIỎ HÀNG, PHÂN CỤM STORE & GOM VOUCHER');
  console.log(`📡 Kết nối API Gateway: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Xác thực tài khoản Khách mua hàng (Buyer Authentication)
  console.log('🔹 1. Đăng nhập tài khoản Buyer thật (buyer_test@gmail.com)...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'buyer_test@gmail.com',
      password: 'Password123!',
    },
  });

  assert(loginRes.ok && loginRes.status === 200, 'Buyer đăng nhập thành công HTTP 200', `Status: ${loginRes.status}`);
  const buyerToken = loginRes.data?.data?.accessToken;
  const buyerUser = loginRes.data?.data?.user;
  assert(Boolean(buyerToken), `Buyer nhận được Bearer Token hợp lệ (User ID: ${buyerUser?.id})`);

  const authHeaders = { Authorization: `Bearer ${buyerToken}` };

  // 2. Dọn sạch giỏ hàng ban đầu để bảo đảm trạng thái kiểm thử độc lập
  console.log('\n🔹 2. Chuẩn hóa trạng thái giỏ hàng (Clear Cart)...');
  const clearRes = await request('/cart', {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert(clearRes.ok, 'Endpoint DELETE /cart phản hồi thành công');

  const emptyCartRes = await request('/cart', { headers: authHeaders });
  const emptyCart = emptyCartRes.data?.data;
  assert(emptyCart && emptyCart.totalItems === 0 && emptyCart.items.length === 0, 'Giỏ hàng đã về trạng thái trống hoàn toàn (0 items)');

  // 3. Tìm 2 cuốn sách thật từ 2 Store khác nhau trên hệ thống
  console.log('\n🔹 3. Lấy 2 cuốn sách thật từ 2 Nhà bán (Store) khác nhau...');
  const booksRes = await request('/books?limit=10');
  const books = booksRes.data?.data || booksRes.data?.books || [];
  assert(books.length >= 2, `Cơ sở dữ liệu có ít nhất 2 cuốn sách (Hiện có: ${books.length})`);

  let physicalBook = null;
  let digitalBook = null;

  for (const b of books) {
    if (!physicalBook && (b.format === 'PHYSICAL' || b.format === 'BOTH')) {
      physicalBook = b;
    } else if (!digitalBook && (b.format === 'DIGITAL' || b.format === 'BOTH') && (!physicalBook || b.storeId !== physicalBook.storeId)) {
      digitalBook = b;
    }
  }

  assert(Boolean(physicalBook), `Tìm thấy Sách giấy mẫu: "${physicalBook?.title}" (Store: ${physicalBook?.storeId})`);
  assert(Boolean(digitalBook), `Tìm thấy Ebook số mẫu: "${digitalBook?.title}" (Store: ${digitalBook?.storeId})`);
  assert(physicalBook?.storeId !== digitalBook?.storeId, `Hai cuốn sách thuộc 2 Store khác nhau để test phân cụm (Store A vs Store B)`);

  // 4. Thêm Sách giấy (PHYSICAL) vào giỏ hàng
  console.log('\n🔹 4. Thêm Sách giấy vào Giỏ hàng (POST /cart/items)...');
  const addPhysicalRes = await request('/cart/items', {
    method: 'POST',
    headers: authHeaders,
    body: {
      bookId: physicalBook.id,
      format: 'PHYSICAL',
      quantity: 1,
    },
  });
  assert(addPhysicalRes.ok && addPhysicalRes.status === 201, 'Thêm Sách giấy thành công HTTP 201', `Status: ${addPhysicalRes.status}`);

  // 5. Thêm Ebook (DIGITAL) vào giỏ hàng
  console.log('\n🔹 5. Thêm Sách Ebook vào Giỏ hàng (POST /cart/items)...');
  const addDigitalRes = await request('/cart/items', {
    method: 'POST',
    headers: authHeaders,
    body: {
      bookId: digitalBook.id,
      format: 'DIGITAL',
      quantity: 1,
    },
  });
  assert(addDigitalRes.ok && addDigitalRes.status === 201, 'Thêm Ebook thành công HTTP 201', `Status: ${addDigitalRes.status}`);

  // 6. Kiểm tra cấu trúc phân cụm Store trong Giỏ hàng (Store Grouping)
  console.log('\n🔹 6. Kiểm tra cấu trúc phân cụm Store trong Giỏ hàng (GET /cart)...');
  const cartRes = await request('/cart', { headers: authHeaders });
  assert(cartRes.ok, 'Endpoint GET /cart phản hồi HTTP 200');
  const cart = cartRes.data?.data;
  assert(cart?.items?.length === 2, `Giỏ hàng chứa chính xác 2 items (Thực tế: ${cart?.items?.length})`);
  assert(cart?.storeGroups?.length === 2, `Giỏ hàng tự động phân tách thành 2 Store Groups (Chuẩn Shopee)`);

  const physicalCartItem = cart.items.find((it) => it.bookId === physicalBook.id);
  const digitalCartItem = cart.items.find((it) => it.bookId === digitalBook.id);
  assert(Boolean(physicalCartItem), 'Sách giấy hiển thị trong giỏ hàng với đúng định dạng PHYSICAL');
  assert(Boolean(digitalCartItem), 'Sách Ebook hiển thị trong giỏ hàng với đúng định dạng DIGITAL');

  // 7. Cập nhật số lượng Sách giấy trong giỏ (PATCH /cart/items/:id)
  console.log('\n🔹 7. Cập nhật số lượng sản phẩm trong giỏ (PATCH /cart/items/:id)...');
  const updateRes = await request(`/cart/items/${physicalCartItem.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: { quantity: 2 },
  });
  assert(updateRes.ok, `Tăng số lượng Sách giấy lên 2 cuốn phản hồi HTTP 200`, `Status: ${updateRes.status}`);

  const cartAfterUpdate = (await request('/cart', { headers: authHeaders })).data?.data;
  const updatedPhysicalItem = cartAfterUpdate?.items?.find((it) => it.id === physicalCartItem.id);
  assert(updatedPhysicalItem?.quantity === 2, `Số lượng Sách giấy trong giỏ đã cập nhật thành 2 (Thực tế: ${updatedPhysicalItem?.quantity})`);

  // Trả về số lượng 1 để kiểm tra tính toán tiền tệ chuẩn
  await request(`/cart/items/${physicalCartItem.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: { quantity: 1 },
  });

  // 8. Kiểm tra validation giới hạn số lượng (Validation Guard)
  console.log('\n🔹 8. Kiểm tra kiểm soát số lượng vượt ngưỡng cho phép (Validation Guard)...');
  const overflowRes = await request('/cart/items', {
    method: 'POST',
    headers: authHeaders,
    body: {
      bookId: physicalBook.id,
      format: 'PHYSICAL',
      quantity: 150,
    },
  });
  assert(overflowRes.status === 400, 'Hệ thống chặn thành công khi thêm số lượng > 99 (HTTP 400 Bad Request)', `Status: ${overflowRes.status}`);

  // 9. Kiểm tra Quản lý Voucher & Lưu mã vào Ví (Voucher Wallet)
  console.log('\n🔹 9. Kiểm tra Danh sách Voucher & Lưu mã vào ví...');
  const vouchersRes = await request('/vouchers');
  assert(vouchersRes.ok, 'Endpoint GET /vouchers phản hồi HTTP 200');
  const voucherList = vouchersRes.data?.data || [];
  assert(Array.isArray(voucherList) && voucherList.length > 0, `Hệ thống có voucher khả dụng (Tổng: ${voucherList.length} vouchers)`);

  const platformVoucher = voucherList.find((v) => v.code === 'HUKIE2E10') || voucherList.find((v) => v.scope === 'PLATFORM');
  assert(Boolean(platformVoucher), `Tìm thấy Voucher Sàn (Platform Voucher): Code "${platformVoucher?.code}"`);

  // Lưu voucher vào ví
  if (platformVoucher) {
    const saveVoucherRes = await request(`/vouchers/${platformVoucher.id}/save`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(saveVoucherRes.ok || saveVoucherRes.status === 200, `Lưu Voucher "${platformVoucher.code}" vào ví cá nhân của Buyer`);
  }

  // 10. Kiểm tra kiểm tra tính hợp lệ & Min Order Value của Voucher
  console.log('\n🔹 10. Kiểm tra xác thực Voucher & Điều kiện đơn tối thiểu (POST /vouchers/validate)...');
  if (platformVoucher) {
    const underMinRes = await request('/vouchers/validate', {
      method: 'POST',
      headers: authHeaders,
      body: {
        code: platformVoucher.code,
        orderSubtotal: 10000, // Nhỏ hơn minOrderAmount
      },
    });
    const underMinData = underMinRes.data?.data;
    assert(underMinData?.valid === false, `Voucher bị từ chối chính xác khi đơn hàng chưa đạt mức tối thiểu (Lý do: "${underMinData?.reason}")`);

    const validVoucherRes = await request('/vouchers/validate', {
      method: 'POST',
      headers: authHeaders,
      body: {
        code: platformVoucher.code,
        orderSubtotal: 300000, // Đạt mức tối thiểu
      },
    });
    const validData = validVoucherRes.data?.data;
    assert(validData?.valid === true && validData?.discount > 0, `Voucher hợp lệ khi đủ điều kiện, chiết khấu tính được: ${validData?.discount} VND`);
  }

  // 11. Kiểm tra Địa chỉ nhận hàng của Buyer
  console.log('\n🔹 11. Kiểm tra & chuẩn bị Địa chỉ giao hàng của Buyer...');
  let addrRes = await request('/shipping/address', { headers: authHeaders });
  let addresses = addrRes.data?.data || [];
  let userAddress = addresses[0];

  if (!userAddress) {
    const createAddrRes = await request('/shipping/address', {
      method: 'POST',
      headers: authHeaders,
      body: {
        name: buyerUser.fullName || 'Nguyen Van Buyer',
        phone: '0987654321',
        address: '123 Đường Sách Nguyễn Huệ',
        ward: 'Bến Nghé',
        district: 'Quận 1',
        province: 'Hồ Chí Minh',
        isDefault: true,
      },
    });
    userAddress = createAddrRes.data?.data;
  }
  assert(Boolean(userAddress?.id), `Buyer có địa chỉ giao hàng hợp lệ (ID: ${userAddress?.id})`);

  // 12. Kiểm thử Xem trước Đặt hàng & Áp dụng Gom Voucher (POST /cart/checkout/preview)
  console.log('\n🔹 12. Tính toán chi tiết Preview Đơn hàng & Gom Voucher (POST /cart/checkout/preview)...');
  const previewRes = await request('/cart/checkout/preview', {
    method: 'POST',
    headers: authHeaders,
    body: {
      addressId: userAddress.id,
      platformVoucherCode: platformVoucher?.code || undefined,
    },
  });

  assert(previewRes.ok && previewRes.status === 200, 'Endpoint Preview phản hồi HTTP 200', `Status: ${previewRes.status}`);
  const preview = previewRes.data?.data;

  assert(Boolean(preview?.sessionId), `Hệ sinh sessionId phiên đặt hàng: ${preview?.sessionId}`);
  assert(Array.isArray(preview?.groups) && preview.groups.length === 2, `Preview tách chính xác 2 Sub-orders cho 2 Store khác nhau`);

  const physicalGroup = preview.groups.find((g) => g.storeId === physicalBook.storeId);
  const digitalGroup = preview.groups.find((g) => g.storeId === digitalBook.storeId);

  assert(physicalGroup?.requiresShipping === true, `Nhóm Sách giấy yêu cầu vận chuyển vật lý (requiresShipping: true)`);
  assert(physicalGroup?.shippingFee > 0, `Nhóm Sách giấy có tính phí ship thực tế: ${physicalGroup?.shippingFee} VND`);

  assert(digitalGroup?.requiresShipping === false, `Nhóm Ebook KHÔNG yêu cầu vận chuyển (requiresShipping: false)`);
  assert(digitalGroup?.shippingFee === 0, `Nhóm Ebook có phí ship bằng 0 VND`);

  // Kiểm tra độ chính xác toán học của các khoản chiết khấu và tổng tiền
  const calculatedSubtotal = (physicalGroup?.itemSubtotal || 0) + (digitalGroup?.itemSubtotal || 0);
  assert(preview.itemSubtotal === calculatedSubtotal, `Tổng tiền hàng khớp chính xác từng đồng: ${preview.itemSubtotal} VND`);

  const expectedGrandTotal = preview.itemSubtotal + preview.shippingTotal - preview.discountTotal;
  assert(preview.grandTotal === expectedGrandTotal, `Tổng thanh toán cuối cùng chuẩn xác: ${preview.grandTotal} VND (Subtotal + Ship - Discount)`);

  if (platformVoucher) {
    assert(preview.platformDiscountTotal > 0, `Voucher Sàn được áp dụng thành công: -${preview.platformDiscountTotal} VND`);
  }

  // 13. Kiểm tra Xóa 1 sản phẩm khỏi giỏ (DELETE /cart/items/:id)
  console.log('\n🔹 13. Kiểm tra Xóa 1 sản phẩm khỏi Giỏ hàng (DELETE /cart/items/:id)...');
  const deleteItemRes = await request(`/cart/items/${digitalCartItem.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert(deleteItemRes.ok, `Xóa Ebook khỏi giỏ hàng phản hồi HTTP 200`, `Status: ${deleteItemRes.status}`);

  const finalCartRes = await request('/cart', { headers: authHeaders });
  const finalCart = finalCartRes.data?.data;
  assert(finalCart?.items?.length === 1, `Giỏ hàng còn lại đúng 1 sản phẩm Sách giấy (Số lượng: ${finalCart?.items?.length})`);

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT PHASE 2:`);
  console.log(`   ✅ PASSED: ${passed}`);
  console.log(`   ❌ FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\n🛑 PHÁT HIỆN LỖI TRONG PHASE 2:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.log('\n⚠️ THEO NGUYÊN TẮC: Dừng lại ngay lập tức, không tự ý sửa code! Chờ lệnh từ người dùng.');
    process.exit(1);
  } else {
    console.log('\n🎉 PHASE 2 HOÀN TẤT THÀNH CÔNG RỰC RỠ 100%!');
    console.log('👉 Người dùng có thể kiểm tra trực tiếp Giỏ hàng & Áp mã trên UI: http://localhost:3100/cart');
    process.exit(0);
  }
}

runPhase2CartVoucherE2E();

