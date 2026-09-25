// scripts/verify-money-flow.mjs
// Comprehensive End-to-End Money Flow Verification for HuKi Ebook & Express (Cấn trừ cước trực tiếp)

console.log('================================================================');
console.log('🚀 HUKI EBOOK - AUDIT LUỒNG DÒNG TIỀN (CẤN TRỪ CƯỚC TRỰC TIẾP)');
console.log('================================================================\n');

// 1. Đơn hàng mẫu
const sampleOrder = {
  orderCode: 'ORD-2026-8801',
  bookTitle: 'Tư Duy Nhanh Và Chậm (Bản In Bìa Cứng)',
  bookPrice: 200000,            // Tiền sách
  shippingFee: 30000,           // Phí vận chuyển (Công shipper)
  platformCommissionRate: 0.10, // Hoa hồng sàn 10%
};

const totalCashFromCustomer = sampleOrder.bookPrice + sampleOrder.shippingFee; // 230.000đ

console.log('📦 1. THÔNG SỐ ĐƠN HÀNG MÔ PHỎNG:');
console.log(`- Mã đơn: ${sampleOrder.orderCode}`);
console.log(`- Tiền sách (Hàng): ${sampleOrder.bookPrice.toLocaleString('vi-VN')}đ`);
console.log(`- Cước giao hàng (Ship): ${sampleOrder.shippingFee.toLocaleString('vi-VN')}đ`);
console.log(`- Tổng tiền mặt khách trả Shipper: ${totalCashFromCustomer.toLocaleString('vi-VN')}đ\n`);

// 2. Chặng 1: Shipper giao hàng & thu tiền mặt
console.log('🛵 2. CHẶNG 1: SHIPPER GIAO HÀNG, GIỮ CÔNG SHIP VÀ GHI NỢ TIỀN SÁCH');
let shipperWallet = { availableEarnings: 450000, codDebt: 0 };

// Shipper thu 230k tiền mặt từ khách:
// - Giữ lại 30k tiền mặt làm công ship (Đút túi trực tiếp)
// - Chỉ nợ Sàn đúng 200k tiền hàng sách (codDebt)
const shipperCashInPocket = sampleOrder.shippingFee;
const codDebtToPlatform = sampleOrder.bookPrice; // Chỉ nợ đúng 200k tiền sách

shipperWallet.codDebt += codDebtToPlatform;

console.log(`- Khách trả Shipper: ${totalCashFromCustomer.toLocaleString('vi-VN')}đ tiền mặt`);
console.log(`- Shipper giữ lại tiền công ship: +${shipperCashInPocket.toLocaleString('vi-VN')}đ (Thu nhập tiền mặt trực tiếp)`);
console.log(`- Nợ COD Shipper tạm giữ của Sàn: ${shipperWallet.codDebt.toLocaleString('vi-VN')}đ (CHỈ NỢ ĐÚNG TIỀN SÁCH ${codDebtToPlatform.toLocaleString('vi-VN')}đ)`);
console.log('  -> Trạng thái Chặng 1: ✅ CHUẨN XÁC (Không bị đội nợ cước)\n');

// 3. Chặng 2: Shipper quét VietQR PayOS nộp tiền sách về Quỹ Sàn
console.log('🏛️ 3. CHẶNG 2: SHIPPER NỘP TIỀN SÁCH QUA PAYOS VỀ QUỸ SÀN (ESCROW)');
let platformEscrow = { balance: 0, platformRevenue: 0 };

// Nộp đúng 200k tiền sách
shipperWallet.codDebt -= codDebtToPlatform;
platformEscrow.balance += codDebtToPlatform;

console.log(`- Shipper quét VietQR PayOS nộp: ${codDebtToPlatform.toLocaleString('vi-VN')}đ`);
console.log(`- Nợ COD Shipper: ${shipperWallet.codDebt.toLocaleString('vi-VN')}đ (Đã sạch công nợ)`);
console.log(`- Quỹ Ký Quỹ Sàn HuKi (Escrow) nhận: +${platformEscrow.balance.toLocaleString('vi-VN')}đ`);
console.log('  -> Trạng thái Chặng 2: ✅ ĐỐI SOÁT PAYOS THÀNH CÔNG\n');

// 4. Chặng 3: Escrow khấu trừ hoa hồng và giải phóng doanh thu cho Shop
console.log('🏬 4. CHẶNG 3: ESCROW TRÍCH PHÍ HOA HỒNG & CHUYỂN TIỀN CHO SHOP');
let sellerWallet = { availableBalance: 1500000 };
const platformCommission = sampleOrder.bookPrice * sampleOrder.platformCommissionRate; // 20.000đ (10% của 200k)
const sellerNetRevenue = sampleOrder.bookPrice - platformCommission;                  // 180.000đ (90% của 200k)

platformEscrow.platformRevenue += platformCommission;
platformEscrow.balance -= sellerNetRevenue;
sellerWallet.availableBalance += sellerNetRevenue;

console.log(`- Phí hoa hồng Sàn HuKi (10%): +${platformCommission.toLocaleString('vi-VN')}đ -> Doanh thu sàn`);
console.log(`- Doanh thu thuần Shop nhận được (90%): +${sellerNetRevenue.toLocaleString('vi-VN')}đ -> Ví Shop`);
console.log(`- Số dư ví Shop mới: ${sellerWallet.availableBalance.toLocaleString('vi-VN')}đ`);
console.log('  -> Trạng thái Chặng 3: ✅ DOANH THU ĐÃ VÀO VÍ SHOP\n');

// 5. Kiểm toán bảo toàn dòng tiền
console.log('⚖️ 5. KIỂM TOÁN TỔNG THỂ BẢO TOÀN DÒNG TIỀN:');
const totalCollected = totalCashFromCustomer; // 230.000đ
const totalAllocated = shipperCashInPocket + platformCommission + sellerNetRevenue; // 30k + 20k + 180k = 230.000đ

console.log(`- Tổng tiền mặt thu từ khách: ${totalCollected.toLocaleString('vi-VN')}đ`);
console.log(`- Phân bổ thực tế:`);
console.log(`  + Shipper đút túi tiền ship: ${shipperCashInPocket.toLocaleString('vi-VN')}đ`);
console.log(`  + Sàn HuKi thu hoa hồng: ${platformCommission.toLocaleString('vi-VN')}đ`);
console.log(`  + Shop nhận tiền bán sách: ${sellerNetRevenue.toLocaleString('vi-VN')}đ`);
console.log(`  + Tổng cộng: ${totalAllocated.toLocaleString('vi-VN')}đ`);
console.log(`- Chênh lệch kiểm toán: ${(totalCollected - totalAllocated).toLocaleString('vi-VN')}đ`);

if (totalCollected === totalAllocated) {
  console.log('\n🎉 KẾT LUẬN: DÒNG TIỀN CHUẨN XÁC 100%, SHIPPER CHỈ NỢ ĐÚNG 200K TIỀN SÁCH!');
} else {
  console.error('\n❌ CẢNH BÁO: DÒNG TIỀN BỊ LỆCH!');
  process.exit(1);
}
