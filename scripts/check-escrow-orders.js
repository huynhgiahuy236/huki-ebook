/**
 * HUKI EBOOK - Check Escrow Holdings & Return Window Status
 * Run with: node scripts/check-escrow-orders.js
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
  console.log('=== KIỂM TRA TRẠNG THÁI KÝ QUỸ ESCROW & HẠN ĐỔI TRẢ 2 PHÚT ===');

  const sellerOrders = await prisma.sellerOrder.findMany({
    include: {
      order: true,
      items: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  const now = Date.now();

  for (const so of sellerOrders) {
    const order = so.order;
    const isPhysical = so.requiresShipping || so.items.some((it) => it.format === 'PHYSICAL');
    const isDelivered = so.status === 'DELIVERED' || so.status === 'COMPLETED' || !!so.completedAt;
    const isCod = order?.paymentMethod === 'COD';
    const isCodRemitted = order?.paymentStatus === 'SUCCEEDED';

    const deliveredTime = so.completedAt
      ? new Date(so.completedAt).getTime()
      : isDelivered
      ? new Date(so.updatedAt || order?.updatedAt || 0).getTime()
      : 0;

    const remainingMs = deliveredTime > 0 ? Math.max(0, 120 * 1000 - (now - deliveredTime)) : 0;
    const remainingSec = Math.ceil(remainingMs / 1000);
    const isReturnPassed = deliveredTime > 0 && (now - deliveredTime) >= 120 * 1000;

    let computedEscrowStatus = 'PENDING_PAYMENT';
    if (!isPhysical) {
      computedEscrowStatus = isCodRemitted || order?.paymentStatus === 'SUCCEEDED' ? 'RELEASED' : 'PENDING_PAYMENT';
    } else if (!isDelivered) {
      computedEscrowStatus = 'PENDING_PAYMENT';
    } else if (isCod && !isCodRemitted) {
      computedEscrowStatus = 'PENDING_PAYMENT (Chờ bưu tá nộp COD)';
    } else {
      computedEscrowStatus = isReturnPassed ? 'RELEASED (Đã qua Seller)' : `HOLDING (Sàn giữ còn ${remainingSec}s)`;
    }

    console.log(
      `[${so.code}] Phương thức: ${order?.paymentMethod} | TT Giao: ${so.status} | Đã nộp sàn: ${isCodRemitted} | Trạng thái ký quỹ: ${computedEscrowStatus}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
