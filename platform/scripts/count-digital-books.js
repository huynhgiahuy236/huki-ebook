const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient, BookFormat } = require('../apps/commerce-service/prisma/generated/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== THỐNG KÊ SÁCH SỐ & BẢN QUYỀN HUKI EBOOK ===\n');

  const allBooks = await prisma.book.count();
  const digitalOnly = await prisma.book.count({ where: { format: BookFormat.DIGITAL } });
  const bothFormat = await prisma.book.count({ where: { format: BookFormat.BOTH } });
  const physicalOnly = await prisma.book.count({ where: { format: BookFormat.PHYSICAL } });
  const totalDigital = digitalOnly + bothFormat;

  const booksWithFile = await prisma.book.findMany({
    where: {
      digitalDetails: {
        OR: [
          { pdfKey: { not: null } },
          { epubKey: { not: null } },
        ],
      },
    },
    select: {
      id: true,
      title: true,
      format: true,
      isbn: true,
      digitalDetails: {
        select: {
          pdfKey: true,
          epubKey: true,
          previewPdfKey: true,
        },
      },
    },
  });

  const booksWithoutFile = await prisma.book.count({
    where: {
      format: { in: [BookFormat.DIGITAL, BookFormat.BOTH] },
      OR: [
        { digitalDetails: null },
        {
          digitalDetails: {
            pdfKey: null,
            epubKey: null,
          },
        },
      ],
    },
  });

  console.log(`- Tổng số sách trong CSDL:       ${allBooks} cuốn`);
  console.log(`- Sách giấy thuần (PHYSICAL):     ${physicalOnly} cuốn`);
  console.log(`- Sách số thuần (DIGITAL):        ${digitalOnly} cuốn`);
  console.log(`- Phát hành song song (BOTH):     ${bothFormat} cuốn`);
  console.log(`-------------------------------------------------`);
  console.log(`=> Tổng sách số (DIGITAL + BOTH): ${totalDigital} cuốn`);
  console.log(`   + Có file PDF/EPUB trên R2:    ${booksWithFile.length} cuốn`);
  console.log(`   + Chưa gắn file Ebook:         ${booksWithoutFile} cuốn\n`);

  console.log(`--- Danh sách ${booksWithFile.length} sách số có file nội dung thực tế ---`);
  booksWithFile.slice(0, 10).forEach((b, idx) => {
    console.log(`${idx + 1}. [${b.format}] ${b.title}`);
    console.log(`   File PDF:  ${b.digitalDetails?.pdfKey || 'N/A'}`);
    console.log(`   File EPUB: ${b.digitalDetails?.epubKey || 'N/A'}`);
  });
  if (booksWithFile.length > 10) {
    console.log(`... và ${booksWithFile.length - 10} cuốn khác.\n`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Lỗi khi thống kê sách số:', err);
  process.exit(1);
});
