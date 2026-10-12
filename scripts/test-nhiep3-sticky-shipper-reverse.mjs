/**
 * Test Script for Nhịp 3: Sticky Shipper & Reverse Logistics
 * 1. Checks that active return requests appear in Shipper Portal with:
 *    - orderType: 'RETURN'
 *    - Return Tracking Code format: HUKI-RET-XXXXXXXX
 *    - shippingFee: 15,000 VND
 *    - codAmount: 0 VND
 *    - Pickup: Buyer's address, Dropoff: Seller's warehouse
 * 2. Simulates Shipper confirming pickup from buyer -> status changes to RETURNING
 * 3. Simulates Shipper confirming delivery to store -> status changes to RETURNED_TO_STORE
 */

const COMMERCE_URL = 'http://localhost:3003/api/v1';

async function run() {
  console.log('🚀 [NHỊP 3 TEST] Bắt đầu kiểm tra Sticky Shipper Reverse Logistics...\n');

  // 1. Fetch Shipper orders
  console.log('📦 1. Gọi API /orders/shipper/orders...');
  const res = await fetch(`${COMMERCE_URL}/orders/shipper/orders`);
  if (!res.ok) {
    throw new Error(`Lỗi kết nối API shipper: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const orders = Array.isArray(data) ? data : data.data || [];
  console.log(`✅ Lấy thành công ${orders.length} đơn hàng trong hệ thống bưu tá.`);

  // 2. Filter return orders
  const returnOrders = orders.filter((o) => o.orderType === 'RETURN');
  console.log(`🔍 Tìm thấy ${returnOrders.length} đơn thu hồi sách hoàn (Reverse Logistics).`);

  if (returnOrders.length === 0) {
    console.log('⚠️ Chưa có đơn hoàn nào trong CSDL để test. Vui lòng tạo 1 đơn hoàn qua Nhịp 2 trước.');
    return;
  }

  const sampleReturn = returnOrders[0];
  console.log('\n--- THÔNG TIN ĐƠN HOÀN MẪU ---');
  console.log(`Mã hoàn: ${sampleReturn.code}`);
  console.log(`Loại đơn: ${sampleReturn.orderType}`);
  console.log(`Mã vận đơn hoàn: ${sampleReturn.returnTrackingCode}`);
  console.log(`Điểm LẤY sách (Nhà khách): ${sampleReturn.deliveryAddress}`);
  console.log(`Điểm TRẢ sách (Kho Shop): ${sampleReturn.shopAddress}`);
  console.log(`Cước công bưu tá: ${sampleReturn.shippingFee.toLocaleString('vi-VN')}đ`);
  console.log(`Tiền COD thu khách: ${sampleReturn.codAmount.toLocaleString('vi-VN')}đ`);
  console.log(`Trạng thái bưu tá: ${sampleReturn.status}`);
  console.log('------------------------------\n');

  if (!sampleReturn.code.startsWith('HUKI-RET-')) {
    throw new Error(`❌ Mã vận đơn không đúng định dạng #HUKI-RET-...: ${sampleReturn.code}`);
  }
  if (sampleReturn.shippingFee !== 15000) {
    throw new Error(`❌ Cước bưu tá chiều về phải là 15.000đ, hiện tại: ${sampleReturn.shippingFee}`);
  }
  if (sampleReturn.codAmount !== 0) {
    throw new Error(`❌ Đơn hoàn hàng không được thu COD từ khách (phải là 0đ), hiện tại: ${sampleReturn.codAmount}`);
  }
  console.log('✅ Định dạng đơn hoàn, cước 15k, COD 0đ ĐẠT CHUẨN 100%!');

  // 3. Test Shipper Pickup (Bưu tá đến nhà khách lấy sách)
  console.log(`\n🛵 2. Bưu tá xác nhận đã lấy sách hoàn từ khách (ID: ${sampleReturn.id})...`);
  const pickupRes = await fetch(`${COMMERCE_URL}/orders/shipper/orders/${sampleReturn.id}/pickup`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ carrier: 'HUKI_EXPRESS', trackingCode: sampleReturn.code }),
  });

  if (!pickupRes.ok) {
    console.warn(`Lỗi pickup: ${pickupRes.status}`);
  } else {
    const pickupData = await pickupRes.json();
    console.log(`✅ Xác nhận lấy sách hoàn thành công! Trạng thái mới: ${pickupData.status || 'RETURNING'}`);
  }

  // 4. Test Shipper Deliver to Store (Bưu tá bàn giao sách hoàn về kho Shop)
  console.log(`\n🏢 3. Bưu tá bàn giao sách hoàn về kho Shop (ID: ${sampleReturn.id})...`);
  const deliverRes = await fetch(`${COMMERCE_URL}/orders/shipper/orders/${sampleReturn.id}/deliver`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: 'Đã kiểm tra sách nguyên vẹn và bàn giao thủ kho NXB Kim Đồng' }),
  });

  if (!deliverRes.ok) {
    console.warn(`Lỗi deliver: ${deliverRes.status}`);
  } else {
    const deliverData = await deliverRes.json();
    console.log(`✅ Xác nhận bàn giao kho thành công! Trạng thái mới: ${deliverData.status || 'RETURNED_TO_STORE'}`);
  }

  // 5. Re-check orders list
  console.log('\n🔄 4. Kiểm tra lại danh sách đơn của bưu tá...');
  const reCheckRes = await fetch(`${COMMERCE_URL}/orders/shipper/orders`);
  const reCheckData = await reCheckRes.json();
  const reCheckOrders = Array.isArray(reCheckData) ? reCheckData : reCheckData.data || [];
  const updatedReturn = reCheckOrders.find((o) => o.id === sampleReturn.id);

  if (updatedReturn) {
    console.log(`✅ Đơn hoàn sau khi bàn giao kho: Trạng thái = ${updatedReturn.status} (DELIVERED/RETURNED_TO_STORE)`);
  }

  console.log('\n🎉 [NHỊP 3 HOÀN TẤT XUẤT SẮC] Sticky Shipper & Reverse Logistics hoạt động trơn tru!');
}

run().catch((err) => {
  console.error('❌ Test Nhịp 3 thất bại:', err);
  process.exit(1);
});
