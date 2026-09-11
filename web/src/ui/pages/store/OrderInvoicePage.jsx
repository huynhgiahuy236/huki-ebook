import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function OrderInvoicePage() {
  const { id } = useParams();
  const { showToast } = useToast();

  const orderId = id || 'HUKI-8892401';

  const invoice = {
    invoiceNumber: '0049281',
    symbol: '1C26THK',
    date: '08/09/2026',
    customer: {
      name: 'Nguyễn Văn An',
      company: 'Công ty TNHH Công Nghệ & Sáng Tạo Alpha',
      taxCode: '0108928491',
      address: 'Số 18 Hoàng Cầu, Đống Đa, Hà Nội',
      email: 'nguyenvanan@huki.vn'
    },
    seller: {
      company: 'CÔNG TY CỔ PHẦN PHÁT HÀNH SÁCH VÀ CÔNG NGHỆ SỐ HUKI VIỆT NAM',
      taxCode: '0109923841',
      address: 'Tầng 8, Tòa nhà Tri Thức, Số 1 Phố Sách, Quận Hoàn Kiếm, TP. Hà Nội',
      phone: '1900 8866',
      bankAccount: '19038291038102 - Techcombank Chi nhánh Hà Nội'
    },
    items: [
      { id: 1, name: 'Combo Hybrid: Atomic Habits (Sách In + Ebook DRM)', unit: 'Bộ', qty: 1, price: 199000, vat: '5%' },
      { id: 2, name: 'Ebook Bản Quyền: Tâm Lý Học Về Tiền (The Psychology of Money)', unit: 'Bản quyền số', qty: 1, price: 79000, vat: '5%' },
    ],
    shippingFee: 25000,
    voucherDiscount: 50000,
    vatAmount: 13900,
    total: 267900
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    showToast('Đang tạo và tải file Hóa Đơn Điện Tử PDF có chữ ký số...', 'success');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#17201F]">
      <div className="max-w-4xl mx-auto">
        {/* Top Floating Navigation (Hidden during Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-xs">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-[#003B2B] flex items-center justify-center text-white shadow-xs">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              </div>
              <span className="font-editorial text-base font-bold text-[#003B2B]">HUKI E-Invoice</span>
            </Link>
            <div className="h-4 w-px bg-[#E8E5DF]"></div>
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <Link to="/orders" className="hover:text-[#003B2B] font-medium transition-colors">Đơn Hàng</Link>
              <span>/</span>
              <Link to={`/orders/${orderId}`} className="hover:text-[#003B2B] font-medium transition-colors">#{orderId}</Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-theme-surface border border-theme-border text-on-surface text-xs font-bold hover:bg-theme-bg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>In Hóa Đơn</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Tải File PDF (.pdf)</span>
            </button>
          </div>
        </div>

        {/* Invoice Paper Document */}
        <div className="bg-theme-surface rounded-3xl border border-theme-border p-8 sm:p-12 shadow-md print:shadow-none print:border-none print:p-0">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-theme-primary mb-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-theme-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-2xl text-[var(--theme-header-top-accent,#94f5d6)]">menu_book</span>
              </div>
              <div>
                <div className="font-editorial text-2xl font-bold text-theme-primary">HUKI EBOOK VIETNAM</div>
                <div className="text-[11px] text-[#4b5563] max-w-sm mt-0.5">{invoice.seller.company}</div>
                <div className="text-[11px] text-[#4b5563]">Mã số thuế: <span className="font-mono font-bold text-on-surface">{invoice.seller.taxCode}</span></div>
                <div className="text-[11px] text-[#6b7280]">{invoice.seller.address}</div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ac2c19] bg-[#ac2c19]/10 px-3 py-1 rounded-full">
                Hóa Đơn Giá Trị Gia Tăng Điện Tử
              </span>
              <div className="font-editorial text-xl font-bold text-on-surface mt-2">
                Số: {invoice.invoiceNumber}
              </div>
              <div className="text-xs text-[#6b7280]">Ký hiệu: <span className="font-mono font-semibold">{invoice.symbol}</span></div>
              <div className="text-xs text-[#6b7280]">Ngày lập: {invoice.date}</div>
            </div>
          </div>

          {/* Customer Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-theme-secondary-subtle border border-theme-border mb-6 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#6b7280] mb-1">Đơn vị mua hàng:</div>
              <div className="font-bold text-on-surface text-sm">{invoice.customer.name}</div>
              <div className="text-[#4b5563] mt-0.5">{invoice.customer.company}</div>
              <div className="text-[#4b5563] mt-0.5">Mã số thuế: <span className="font-mono font-bold">{invoice.customer.taxCode}</span></div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#6b7280] mb-1">Thông tin đơn hàng:</div>
              <div>Mã đơn sàn: <span className="font-mono font-bold text-theme-primary">#{orderId}</span></div>
              <div>Địa chỉ: {invoice.customer.address}</div>
              <div>Email nhận hóa đơn: {invoice.customer.email}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-theme-secondary-subtle border-b border-theme-border text-theme-primary font-bold">
                  <th className="py-3 px-3">STT</th>
                  <th className="py-3 px-3">Tên Hàng Hóa / Bản Quyền Số</th>
                  <th className="py-3 px-3 text-center">ĐVT</th>
                  <th className="py-3 px-3 text-center">SL</th>
                  <th className="py-3 px-3 text-right">Đơn Giá</th>
                  <th className="py-3 px-3 text-right">Thuế GTGT</th>
                  <th className="py-3 px-3 text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {invoice.items.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="py-3 px-3 font-medium text-center">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-on-surface">{it.name}</td>
                    <td className="py-3 px-3 text-center text-[#6b7280]">{it.unit}</td>
                    <td className="py-3 px-3 text-center font-bold">{it.qty}</td>
                    <td className="py-3 px-3 text-right font-mono">{it.price.toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-3 text-right text-[#6b7280]">{it.vat}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-on-surface">
                      {(it.price * it.qty).toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-4 border-t border-theme-border">
            <div className="text-xs text-[#6b7280] space-y-1">
              <div>Hình thức thanh toán: <span className="font-semibold text-on-surface">Chuyển khoản / Cổng VNPAY-QR</span></div>
              <div>Tình trạng: <span className="text-theme-secondary font-bold">Đã thanh toán đủ (PAID)</span></div>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-[#6b7280]">
                <span>Cước vận chuyển:</span>
                <span className="font-mono">{invoice.shippingFee.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-[#ac2c19] font-semibold">
                <span>Voucher giảm giá:</span>
                <span className="font-mono">-{invoice.voucherDiscount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-[#6b7280]">
                <span>Tiền thuế GTGT:</span>
                <span className="font-mono">{invoice.vatAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-base font-bold text-theme-primary pt-2 border-t border-theme-border">
                <span>Tổng Tiền Thanh Toán:</span>
                <span className="font-mono text-lg">{invoice.total.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>

          {/* Digital Signature Footer */}
          <div className="grid grid-cols-2 gap-8 pt-10 mt-8 border-t border-dashed border-theme-border text-center text-xs">
            <div>
              <div className="font-bold text-on-surface mb-1">NGƯỜI MUA HÀNG</div>
              <div className="text-[11px] text-[#6b7280]">(Ký, ghi rõ họ tên)</div>
            </div>

            <div>
              <div className="font-bold text-on-surface mb-1">NGƯỜI BÁN HÀNG</div>
              <div className="text-[11px] text-[#6b7280] mb-4">(Ký số điện tử hợp lệ)</div>
              <div className="inline-block p-3 rounded-xl bg-theme-secondary-subtle border border-theme-border text-on-surface text-[10px] text-left">
                <div className="font-bold flex items-center gap-1 text-theme-secondary">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  ĐÃ KÝ ĐIỆN TỬ BỞI HUKI EBOOK
                </div>
                <div>Ngày ký: {invoice.date} 14:28:10</div>
                <div>Chứng thư số: VNPT-CA / Viettel-CA</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
