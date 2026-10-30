import fs from 'fs';

console.log('=== BẮT ĐẦU REFACTOR TOÀN DIỆN BƯỚC 6: XÓA SẠCH EMOJI & LÀM GỌN CÁC TRANG CÒN LẠI ===');

function cleanFile(filePath, transforms) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  const isCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  for (const [target, replacement] of transforms) {
    if (typeof target === 'string') {
      content = content.replaceAll(target, replacement);
    } else if (target instanceof RegExp) {
      content = content.replace(target, replacement);
    }
  }

  if (isCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Đã làm sạch: ${filePath}`);
}

// 1. /flash-sale/page.tsx
cleanFile('web/src/app/flash-sale/page.tsx', [
  ['🛒 Đã thêm', 'Đã thêm'],
  ['⚡ FLASH SALE GIỜ VÀNG', 'FLASH SALE GIỜ VÀNG'],
  ['Đang bán rất chạy 🔥 (', 'Đang bán rất chạy ('],
]);

// 2. /vouchers/page.tsx
cleanFile('web/src/app/vouchers/page.tsx', [
  ['🚚 Freeship Sàn', 'Freeship Sàn'],
  ['🏷️ Giảm Giá Sàn', 'Giảm Giá Sàn'],
  ['🏪 Voucher Shop', 'Voucher Shop'],
]);

// 3. /not-found.tsx
cleanFile('web/src/app/not-found.tsx', [
  ['<span>📚</span>', '<span className="material-symbols-outlined text-sm">menu_book</span>'],
  ['<span>⚡</span>', '<span className="material-symbols-outlined text-sm">bolt</span>'],
]);

// 4. /seller/escrow/page.tsx
cleanFile('web/src/app/seller/escrow/page.tsx', [
  [`{isDigital ? '📱 Ebook' : '📦 Sách Giấy'}`, `{isDigital ? 'Ebook' : 'Sách Giấy'}`],
  [`{it.paymentMethod === 'COD' ? '💵 Tiền mặt COD' : '💳 PayOS / QR'}`, `{it.paymentMethod === 'COD' ? 'Tiền mặt COD' : 'PayOS / QR'}`],
  [`? '✓ Đã hoàn tất đối soát & giải ngân vào số dư khả dụng.'`, `? 'Đã hoàn tất đối soát & giải ngân vào số dư khả dụng.'`],
  [`? '🚚 Kiện hàng đang vận chuyển, chờ thu tiền COD.'`, `? 'Kiện hàng đang vận chuyển, chờ thu tiền COD.'`],
  [`: '⚠️ Đang tạm khóa do có khiếu nại phát sinh.'}`, `: 'Đang tạm khóa do có khiếu nại phát sinh.'}`],
  [`? '✓ Đã hết hạn đổi trả 2 phút, tiền 95% đã cộng vào Số Dư Khả Dụng trong Ví của Shop.'`, `? 'Đã hết hạn đổi trả, tiền đã cộng vào Số Dư Khả Dụng trong Ví của Shop.'`],
  [`? '🚚 Đơn hàng đang được Shipper giao tận nơi, chờ thu tiền mặt COD.'`, `? 'Đơn hàng đang được Shipper giao tận nơi, chờ thu tiền mặt COD.'`],
  [`: '⚠️ Món hàng đang bị đóng băng do có khiếu nại đổi trả đang xử lý.'}`, `: 'Món hàng đang bị đóng băng do có khiếu nại đổi trả đang xử lý.'}`],
]);

// 5. /seller/inventory/page.tsx
cleanFile('web/src/app/seller/inventory/page.tsx', [
  ['⚡ Tồn kho', 'Tồn kho'],
  ['➔', '->'],
]);

// 6. /seller/products/page.tsx
cleanFile('web/src/app/seller/products/page.tsx', [
  ['⚡ Đã bật Affiliate', 'Đã bật Affiliate'],
]);

// 7. /seller/returns/page.tsx
cleanFile('web/src/app/seller/returns/page.tsx', [
  ['⚠️ Có yêu cầu đổi trả', 'Có yêu cầu đổi trả'],
  ['⚖️ Phán quyết trọng tài', 'Phán quyết trọng tài'],
]);

// 8. /seller/affiliate/page.tsx
cleanFile('web/src/app/seller/affiliate/page.tsx', [
  ['🥇', 'Top 1'],
  ['🥈', 'Top 2'],
  ['🥉', 'Top 3'],
]);

// 9. /seller/business/page.tsx
cleanFile('web/src/app/seller/business/page.tsx', [
  ['🎉 Yêu cầu cập nhật', 'Yêu cầu cập nhật'],
  ['🏪 Hộ kinh doanh cá thể', 'Hộ kinh doanh cá thể'],
  ['🏢 ', ''],
]);

// 10. SellerNotificationsView.tsx
cleanFile('web/src/ui/components/seller/SellerNotificationsView.tsx', [
  ['<span>🛡️</span>', ''],
  ['<span>🏪</span>', ''],
  ['<span>🛵</span>', ''],
  ['<span>👤</span>', ''],
  ['<span>⚙️</span>', ''],
]);

// 11. AdminDisputesView.tsx
cleanFile('web/src/ui/components/admin/AdminDisputesView.tsx', [
  ['⚖️ Hồ sơ tranh chấp', 'Hồ sơ tranh chấp'],
  ['📚 ', ''],
]);

// 12. AdminMaintenanceView.tsx
cleanFile('web/src/ui/components/admin/AdminMaintenanceView.tsx', [
  ['🚨 ĐÃ KÍCH HOẠT', 'ĐÃ KÍCH HOẠT'],
  ['⚠️ ĐÃ KÍCH HOẠT', 'ĐÃ KÍCH HOẠT'],
  ['✅ HỆ THỐNG ĐÃ', 'HỆ THỐNG ĐÃ'],
  ['title="🚨 XÁC NHẬN', 'title="XÁC NHẬN'],
  ['title="⚠️ XÁC NHẬN', 'title="XÁC NHẬN'],
  ['title="✅ XÁC NHẬN', 'title="XÁC NHẬN'],
]);

console.log('=== HOÀN TẤT REFACTOR BƯỚC 6 THÀNH CÔNG ===');
