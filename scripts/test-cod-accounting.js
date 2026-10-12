/**
 * HUKI EBOOK - Test COD Accounting & Shipper Debt
 * Run with: node scripts/test-cod-accounting.js
 */

const path = require('path');
require(path.resolve(__dirname, '../platform/node_modules/dotenv')).config({
  path: path.resolve(__dirname, '../platform/.env'),
});

process.env.DATABASE_URL = process.env.COMMERCE_DATABASE_URL;

const { PrismaClient } = require(path.resolve(
  __dirname,
  '../platform/apps/commerce-service/prisma/generated/client'
));
const prisma = new PrismaClient();

async function main() {
  console.log('=== KIỂM TRA BÓC TÁCH DÒNG TIỀN COD & CÔNG NỢ BƯU TÁ ===');

  const deliveredCodOrders = await prisma.sellerOrder.findMany({
    where: {
      status: { in: ['DELIVERED', 'COMPLETED'] },
      order: { paymentMethod: 'COD' },
    },
    include: { order: true },
    orderBy: { createdAt: 'desc' },
  });

  let totalCollected = 0;
  let totalShippingRetained = 0;
  let totalNetOwedToPlatform = 0;
  let unremittedDebt = 0;

  for (const so of deliveredCodOrders) {
    const totalCollectedFromCustomer = Number(so.grandTotal) || 0;
    const shippingFee = Number(so.shippingFee) || 30000;
    const netToPlatform = Math.max(0, totalCollectedFromCustomer - shippingFee);
    const isRemitted = so.order?.paymentStatus === 'SUCCEEDED';

    totalCollected += totalCollectedFromCustomer;
    totalShippingRetained += shippingFee;
    totalNetOwedToPlatform += netToPlatform;

    if (!isRemitted) {
      unremittedDebt += netToPlatform;
    }

    console.log(
      `Đơn ${so.code}: Thu khách ${totalCollectedFromCustomer.toLocaleString('vi-VN')}đ - Giữ lại ship ${shippingFee.toLocaleString('vi-VN')}đ = Nộp sàn ${netToPlatform.toLocaleString('vi-VN')}đ [${isRemitted ? 'ĐÃ NỘP' : 'CHƯA NỘP'}]`
    );
  }

  console.log('\n--- TỔNG KẾT BƯU TÁ ---');
  console.log(`- Tổng tiền mặt đã thu từ khách: ${totalCollected.toLocaleString('vi-VN')}đ`);
  console.log(`- Tổng cước ship bưu tá giữ lại làm thu nhập: ${totalShippingRetained.toLocaleString('vi-VN')}đ`);
  console.log(`- Tổng tiền hàng phải nộp về Sàn: ${totalNetOwedToPlatform.toLocaleString('vi-VN')}đ`);
  console.log(`- CÔNG NỢ COD HIỆN TẠI BƯU TÁ CÒN NỢ SÀN: ${unremittedDebt.toLocaleString('vi-VN')}đ`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
