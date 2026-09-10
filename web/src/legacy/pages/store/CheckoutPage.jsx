import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, storeGroups, checkedSubtotal, checkedItemsCount, hasPhysicalItems, hasEbookItems, clearCart } = useCart();
  const { showToast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState('cod'); // COD-only happy path; online payments are deferred.
  const [shippingMethod, setShippingMethod] = useState('standard'); // 'standard' | 'express'
  const [useVatInvoice, setUseVatInvoice] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address state
  const [address, setAddress] = useState({
    name: 'Lê Đức Kiên',
    phone: '0988 123 456',
    street: '12 Nguyễn Văn Bảo, Phường Hạnh Thông, Quận Gò Vấp',
    city: 'TP. Hồ Chí Minh'
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  const checkedItems = cartItems.filter(i => i.checked);
  const ebookItems = checkedItems.filter(i => i.type === 'ebook');
  const physicalItems = checkedItems.filter(i => i.type === 'physical');

  const rawSubtotal = checkedSubtotal;
  const shippingFee = hasPhysicalItems ? (shippingMethod === 'express' ? 35000 : 20000) : 0;
  const voucherDiscount = 0;
  const grandTotal = Math.max(0, rawSubtotal - voucherDiscount + shippingFee);

  const handlePlaceOrder = () => {
    if (checkedItemsCount === 0) {
      showToast('Giỏ hàng chưa có sản phẩm được chọn.', 'error');
      navigate('/cart');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      clearCart();
      showToast('Đặt hàng thành công! Đang chuyển hướng...', 'success');
      navigate('/order-success');
    }, 800);
  };

  return (
    <div className="w-full bg-surface font-body-md text-on-surface antialiased min-h-screen pb-16">
      {/* Checkout Breadcrumb Header */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/30 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
              <Link className="hover:text-primary transition-colors" to="/">Trang chủ</Link>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <Link className="hover:text-primary transition-colors" to="/cart">Giỏ hàng</Link>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <span className="text-primary font-semibold">Thanh toán</span>
            </nav>
            <div className="flex items-baseline gap-3">
              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                Thanh Toán Đơn Hàng
              </h1>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
                <span className="material-symbols-outlined text-[14px]">check</span>
              </div>
              <span className="hidden md:inline">Giỏ hàng</span>
            </div>
            <div className="w-8 h-0.5 bg-primary"></div>
            <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[11px] shadow-xs">
                2
              </div>
              <span>Thanh toán</span>
            </div>
            <div className="w-8 h-0.5 bg-outline-variant/50"></div>
            <div className="flex items-center gap-1.5 text-on-surface-variant text-xs opacity-50">
              <div className="w-6 h-6 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center text-[11px]">
                3
              </div>
              <span className="hidden md:inline">Hoàn tất</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* Left Column: Form & Fulfillment */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

            {/* Split Fulfillment Box */}
            <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
              <h2 className="font-editorial text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                Phương Thức Giao Nhận &amp; Kích Hoạt Tủ Sách
              </h2>

              <div className="space-y-4">
                {/* Package 1: Ebook DRM (If any) */}
                {ebookItems.length > 0 && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs">
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                        </span>
                        <strong className="text-xs sm:text-sm text-primary font-bold">
                          GÓI 1: EBOOK BẢN QUYỀN DRM ({ebookItems.length} ấn phẩm)
                        </strong>
                      </div>
                      <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        MIỄN PHÍ SHIP
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed pl-9">
                      Kích hoạt ngay lập tức vào <strong>Tủ Sách HUKI</strong> sau khi thanh toán thành công. Đọc trực tiếp trên Web Reader và App di động.
                    </p>
                  </div>
                )}

                {/* Package 2: Physical Books (If any) */}
                {physicalItems.length > 0 && (
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-surface-container-highest text-on-surface flex items-center justify-center text-xs">
                          <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                        </span>
                        <strong className="text-xs sm:text-sm text-on-surface font-bold">
                          GÓI 2: SÁCH GIẤY VẬT LÝ ({physicalItems.length} ấn phẩm)
                        </strong>
                      </div>
                      <span className="text-xs text-on-surface-variant font-medium">Giao bưu tá 2-3 ngày</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-outline-variant/20">
                      <label
                        onClick={() => setShippingMethod('standard')}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs ${
                          shippingMethod === 'standard' ? 'border-primary bg-primary/5' : 'border-outline-variant/50 bg-surface-container-lowest'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-on-surface block">Tiêu Chuẩn (2-3 ngày)</span>
                          <span className="text-[11px] text-on-surface-variant">Phí giao hàng tạm tính · Chưa kết nối hãng vận chuyển</span>
                        </div>
                        <span className="font-bold text-primary">20.000đ</span>
                      </label>

                      <label
                        onClick={() => setShippingMethod('express')}
                        aria-disabled="true"
                        className={`pointer-events-none opacity-35 grayscale p-3 rounded-xl border flex items-center justify-between text-xs ${
                          shippingMethod === 'express' ? 'border-primary bg-primary/5' : 'border-outline-variant/50 bg-surface-container-lowest'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-on-surface block">Hỏa Tốc 2 Giờ (Nội thành)</span>
                          <span className="text-[11px] text-on-surface-variant">Tạm khóa trong happy path hiện tại</span>
                        </div>
                        <span className="font-bold text-primary">35.000đ</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Shipping Address Section (for physical books) */}
            {hasPhysicalItems && (
              <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-editorial text-lg font-bold text-on-surface flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                    Địa Chỉ Nhận Sách Giấy
                  </h2>
                  <button
                    onClick={() => setIsEditingAddress(!isEditingAddress)}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    {isEditingAddress ? 'Xong' : 'Thay đổi'}
                  </button>
                </div>

                {isEditingAddress ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Họ và tên người nhận</label>
                      <input
                        type="text"
                        value={address.name}
                        onChange={(e) => setAddress({ ...address, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 bg-surface-container-low text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Số điện thoại</label>
                      <input
                        type="tel"
                        value={address.phone}
                        onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 bg-surface-container-low text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Địa chỉ chi tiết</label>
                      <input
                        type="text"
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 bg-surface-container-low text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs text-on-surface flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <strong className="font-bold">{address.name}</strong>
                      <span className="text-on-surface-variant">({address.phone})</span>
                      <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded font-bold">Mặc định</span>
                    </div>
                    <span className="text-on-surface-variant">{address.street}, {address.city}</span>
                  </div>
                )}
              </section>
            )}

            {/* Payment Methods */}
            <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
              <h2 className="font-editorial text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                Phương Thức Thanh Toán
              </h2>

              <div className="space-y-2.5">
                {/* HukiPay Wallet */}
                <label
                  onClick={() => setPaymentMethod('hukipay')}
                  aria-disabled="true"
                  className={`pointer-events-none opacity-35 grayscale p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    paymentMethod === 'hukipay' ? 'border-2 border-primary bg-primary/5 shadow-xs' : 'border-outline-variant/40 bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-theme-primary to-theme-secondary text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      H
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-on-surface">Ví HukiPay (Khuyên Dùng)</span>
                        <span className="bg-[#FEA619] text-white text-[9px] font-bold px-1.5 py-0.2 rounded">TẶNG 5% XU</span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant">Số dư ví: <strong>1.450.000đ</strong> (Thanh toán 1-chạm không mã OTP)</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="pay"
                    disabled
                    checked={paymentMethod === 'hukipay'}
                    onChange={() => setPaymentMethod('hukipay')}
                    className="w-4 h-4 text-primary focus:ring-primary border-outline-variant"
                  />
                </label>

                {/* VNPay */}
                <label
                  onClick={() => setPaymentMethod('vnpay')}
                  aria-disabled="true"
                  className={`pointer-events-none opacity-35 grayscale p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    paymentMethod === 'vnpay' ? 'border-2 border-primary bg-primary/5 shadow-xs' : 'border-outline-variant/40 bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      VNP
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-on-surface block">Cổng VNPay QR</span>
                      <span className="text-[11px] text-on-surface-variant">Quét mã QR qua tất cả app ngân hàng &amp; VNPAY</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="pay"
                    disabled
                    checked={paymentMethod === 'vnpay'}
                    onChange={() => setPaymentMethod('vnpay')}
                    className="w-4 h-4 text-primary focus:ring-primary border-outline-variant"
                  />
                </label>

                {/* MoMo */}
                <label
                  onClick={() => setPaymentMethod('momo')}
                  aria-disabled="true"
                  className={`pointer-events-none opacity-35 grayscale p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    paymentMethod === 'momo' ? 'border-2 border-primary bg-primary/5 shadow-xs' : 'border-outline-variant/40 bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center text-xs font-bold">
                      MoMo
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-on-surface block">Ví MoMo</span>
                      <span className="text-[11px] text-on-surface-variant">Thanh toán qua ứng dụng Ví MoMo</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="pay"
                    disabled
                    checked={paymentMethod === 'momo'}
                    onChange={() => setPaymentMethod('momo')}
                    className="w-4 h-4 text-primary focus:ring-primary border-outline-variant"
                  />
                </label>

                {/* COD (Only for Physical) */}
                {hasPhysicalItems && (
                  <label
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      paymentMethod === 'cod' ? 'border-2 border-primary bg-primary/5 shadow-xs' : 'border-outline-variant/40 bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xs">
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                      </span>
                      <div>
                        <span className="font-bold text-xs sm:text-sm text-on-surface block">Thanh toán khi nhận hàng (COD)</span>
                        <span className="text-[11px] text-on-surface-variant">Thanh toán tiền mặt cho bưu tá khi nhận sách giấy</span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="pay"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="w-4 h-4 text-primary focus:ring-primary border-outline-variant"
                    />
                  </label>
                )}
              </div>
            </section>

            {/* Note & VAT Invoice */}
            <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">Ghi chú đơn hàng (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giao giờ hành chính, bọc thêm bìa chống sốc..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-on-surface">
                  <input
                    type="checkbox"
                    checked={useVatInvoice}
                    onChange={(e) => setUseVatInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                  />
                  <span>Yêu cầu xuất hóa đơn điện tử VAT (e-Invoice)</span>
                </label>
                <span className="text-[11px] text-on-surface-variant">Gửi qua Email</span>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary & Placement */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <div className="sticky top-20 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <h2 className="font-editorial text-lg font-bold text-on-surface pb-3 border-b border-outline-variant/20">
                Đơn Hàng ({checkedItems.length} ấn phẩm)
              </h2>

              {/* Items List in Mini Scroll */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {checkedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img className="w-9 h-13 rounded object-cover flex-shrink-0 border border-outline-variant/30" alt={item.title} src={item.cover} />
                      <div className="min-w-0">
                        <span className="font-bold text-on-surface line-clamp-1 block">{item.title}</span>
                        <span className="text-[11px] text-on-surface-variant">x{item.quantity} · {item.format}</span>
                      </div>
                    </div>
                    <span className="font-bold text-on-surface flex-shrink-0">
                      {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-outline-variant/20 space-y-2 text-xs text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-semibold text-on-surface">{rawSubtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Voucher Huki:</span>
                    <span className="font-semibold">-{voucherDiscount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-on-surface">
                    {shippingFee === 0 ? <span className="text-primary font-bold">0đ</span> : `${shippingFee.toLocaleString('vi-VN')}đ`}
                  </span>
                </div>
              </div>

              {/* Total & Submit Button */}
              <div className="pt-3 border-t border-outline-variant/20 flex items-baseline justify-between">
                <span className="font-bold text-sm text-on-surface">Tổng cộng:</span>
                <span className="text-2xl font-bold text-primary">
                  {grandTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || checkedItemsCount === 0}
                className="w-full h-12 bg-primary hover:bg-[#00523c] text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    Đang Xử Lý Đơn Hàng...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                    Hoàn Tất Đặt Hàng ({checkedItems.length})
                  </>
                )}
              </button>

              <p className="text-[11px] text-on-surface-variant text-center leading-relaxed">
                Nhấn "Hoàn Tất Đặt Hàng" đồng nghĩa bạn đồng ý với <Link to="/" className="text-primary underline">Điều khoản sàn TMĐT HUKI</Link>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
