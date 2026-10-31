const fs = require('fs');
const envContent = fs.readFileSync('E:/HuKi/platform/.env', 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val.trim();
  }
}
process.env.DATABASE_URL = process.env.COMMERCE_DATABASE_URL;
const { PrismaClient } = require('E:/HuKi/platform/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const o = await prisma.order.findFirst({
    where: { code: { contains: 'MVUSRGYE' } }
  });
  if (o) {
    const session = await prisma.checkoutSession.findFirst({
      where: { userId: o.userId },
      orderBy: { createdAt: 'desc' }
    });
    console.log("SESSION SNAPSHOT:", JSON.stringify(session?.snapshot, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
