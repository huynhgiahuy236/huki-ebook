const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' } } });

async function check() {
  const orderItems = await prisma.orderItem.findMany({
    include: { book: true, sellerOrder: true }
  });
  console.log('Total OrderItems in DB:', orderItems.length);
  orderItems.forEach(it => {
    console.log(`OrderItem: bookId=${it.bookId} title="${it.book?.title}" qty=${it.quantity} orderStatus=${it.sellerOrder?.status}`);
  });

  const accesses = await prisma.bookAccess.findMany({
    include: { book: true }
  });
  console.log('Total BookAccesses in DB:', accesses.length);
  accesses.forEach(a => {
    console.log(`Access: bookId=${a.bookId} title="${a.book?.title}" status=${a.status}`);
  });

  // Calculate sales per book:
  const salesMap = {};
  for (const it of orderItems) {
    salesMap[it.bookId] = (salesMap[it.bookId] || 0) + (it.quantity || 1);
  }
  for (const a of accesses) {
    salesMap[a.bookId] = Math.max(salesMap[a.bookId] || 0, 1);
  }
  console.log('Final Calculated Sales per Book:', salesMap);
}

check().then(() => prisma.$disconnect());
