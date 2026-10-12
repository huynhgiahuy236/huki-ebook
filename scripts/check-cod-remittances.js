/**
 * HUKI EBOOK - Check COD Orders & Shipper Remittances Script
 * Run with: node scripts/check-cod-remittances.js
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
  console.log('=== 1. KIỂM TRA LỊCH SỬ NỘP TIỀN COD (REMITTANCES) ===');
  const remittances = await prisma.orderStatusHistory.findMany({
    where: { actorType: 'SHIPPER_COD_REMITTANCE' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Tìm thấy ${remittances.length} giao dịch nộp COD gần nhất:`);
  let totalRemitted = 0;
  for (const r of remittances) {
    const meta = r.metadata || {};
    const amount = Number(meta.amount) || 0;
    totalRemitted += amount;
    console.log(
      ` - Mã: ${meta.txCode || r.id} | Số tiền: ${amount.toLocaleString('vi-VN')}đ | Phương thức: ${meta.method || 'N/A'} | Lúc: ${r.createdAt.toISOString()}`
    );
  }

  console.log('\n=== 2. KIỂM TRA ĐƠN HÀNG COD (GẦN NHẤT) ===');
  const codOrders = await prisma.order.findMany({
    where: { paymentMethod: 'COD' },
    include: {
      sellerOrders: {
        include: { items: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Tổng số đơn COD gần nhất: ${codOrders.length}`);
  for (const o of codOrders) {
    const isPaid = o.paymentStatus === 'SUCCEEDED';
    const soList = o.sellerOrders.map((so) => ({
      code: so.code,
      status: so.status,
      grandTotal: Number(so.grandTotal),
      shippingFee: Number(so.shippingFee),
      completedAt: so.completedAt,
    }));

    console.log(
      `[Đơn ${o.code}] TT thanh toán: ${o.paymentStatus} (${isPaid ? 'ĐÃ NỘP SÀN' : 'CHƯA NỘP SÀN'}) | Sub-orders: ${JSON.stringify(soList)}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
