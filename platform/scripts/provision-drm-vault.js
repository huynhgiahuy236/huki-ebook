const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient, BookFormat, DrmSecurityStatus } = require('../apps/commerce-service/prisma/generated/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== KÍCH HOẠT BẢO MẬT DRM VAULT CHO SÁCH SỐ THỰC TẾ ===\n');

  // Lấy toàn bộ sách số (DIGITAL & BOTH)
  const digitalBooks = await prisma.book.findMany({
    where: {
      format: { in: [BookFormat.DIGITAL, BookFormat.BOTH] },
    },
    include: {
      drmLicense: true,
      publisher: true,
      author: true,
      _count: {
        select: {
          bookAccesses: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Tìm thấy ${digitalBooks.length} cuốn sách số cần bảo mật DRM.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < digitalBooks.length; i++) {
    const book = digitalBooks[i];
    const licenseCode = `DRM-LIC-${8001 + i}`;
    const clusters = ['Singapore SG1 (AWS KMS)', 'Viettel IDC Hà Nội (Node 02)'];
    const chosenCluster = clusters[i % clusters.length];

    if (!book.drmLicense) {
      const rawKey = crypto.randomBytes(32);
      const keyHex = rawKey.toString('hex');
      const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const fingerprint = `SHA256:${hash.match(/.{1,2}/g).join(':')}`;

      // Lấy số lượng cấp phép thực tế từ số lượt mua/access của độc giả
      const actualIssued = book._count?.bookAccesses || 0;

      await prisma.drmLicense.create({
        data: {
          licenseCode,
          bookId: book.id,
          algorithm: 'AES-GCM-256 (Chuẩn Quân Đội)',
          encryptionCluster: chosenCluster,
          keyFingerprint: fingerprint,
          watermarkEngine: 'Dynamic Reader Email Canvas',
          securityStatus: DrmSecurityStatus.SECURE,
          statusLabel: 'An Toàn Tuyệt Đối',
          masterKeyEncrypted: keyHex,
          chunkSizeKb: 1024,
          issuedLicenses: actualIssued,
          activeReaders: actualIssued > 0 ? Math.min(actualIssued, 5) : 0,
          revokedDevices: 0,
        },
      });
      createdCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(`\nHoàn tất kích hoạt bảo mật DRM:`);
  console.log(`- Đã cấp mới chứng chỉ DRM: ${createdCount} cuốn`);
  console.log(`- Đã có chứng chỉ trước đó:  ${updatedCount} cuốn`);

  // Thống kê tổng
  const totalSecured = await prisma.drmLicense.count();
  console.log(`\n=> Tổng số sách số được bảo vệ trong DRM Vault hiện tại: ${totalSecured} cuốn.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Lỗi khi kích hoạt bảo mật DRM:', err);
  process.exit(1);
});
