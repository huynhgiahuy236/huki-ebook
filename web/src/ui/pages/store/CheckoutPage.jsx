import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { addressApi } from '../../api/addressApi';
import { cartApi } from '../../api/cartApi';
import { checkoutApi } from '../../api/checkoutApi';
import CustomLocationSelector from '../../components/common/CustomLocationSelector';
import AddressMapPreview from '../../components/common/AddressMapPreview';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const {
    cartItems,
    checkedSubtotal,
    checkedItemsCount,
    hasPhysicalItems,
    hasEbookItems,
    clearCart,
  } = useCart();
  const { showToast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [useVatInvoice, setUseVatInvoice] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sessionId, setSessionId] = useState('');

  // Address states
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddressList, setShowAddressList] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: user?.fullName || user?.name || 'Khách Hàng',
    phone: user?.phone || '0988123456',
    province: 'Hồ Chí Minh',
    district: 'Quận Gò Vấp',
    ward: 'Phường 5',
    address: '12 Nguyễn Văn Bảo',
    isDefault: true,
  });

  const checkedItems = cartItems.filter((i) => i.checked);
  const ebookItems = checkedItems.filter((i) => i.type === 'ebook');
  const physicalItems = checkedItems.filter((i) => i.type === 'physical');

  // Load user addresses if logged in
  const loadAddresses = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await addressApi.getAddresses();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAddresses(res.data);
        const defaultAddr = res.data.find((a) => a.isDefault) || res.data[0];
        setSelectedAddressId(defaultAddr.id);
        setAddressForm({
          name: defaultAddr.name,
          phone: defaultAddr.phone,
          province: defaultAddr.province,
          district: defaultAddr.district,
          ward: defaultAddr.ward,
          address: defaultAddr.address,
          isDefault: defaultAddr.isDefault,
        });
      } else {
        // Fallback default for form
        setAddressForm({
          name: user?.fullName || user?.name || 'Khách Hàng',
          phone: user?.phone || '0988123456',
          province: 'Hồ Chí Minh',
          district: 'Quận Gò Vấp',
          ward: 'Phường 5',
          address: '12 Nguyễn Văn Bảo',
          isDefault: true,
        });
      }
    } catch {
      // ignore
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Selected address object
  const activeAddress = addresses.find((a) => a.id === selectedAddressId) || addressForm;

  // Sync / Preview checkout session with backend
  useEffect(() => {
    if (!isLoggedIn || checkedItems.length === 0) return;

    let isMounted = true;
    const fetchCheckoutSession = async () => {
      setIsLoadingSession(true);
      try {
        const res = await checkoutApi.previewCheckout({
          shippingAddress: hasPhysicalItems
            ? {
                recipientName: activeAddress.name,
                phone: activeAddress.phone,
                line1: activeAddress.address,
                ward: activeAddress.ward,
                district: activeAddress.district,
                province: activeAddress.province,
              }
            : undefined,
          note: note.trim() || undefined,
        });

        if (isMounted && res.success && res.data?.sessionId) {
          setSessionId(res.data.sessionId);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) setIsLoadingSession(false);
      }
    };

    fetchCheckoutSession();
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, checkedItems.length, hasPhysicalItems, activeAddress, note]);

  // Voucher states (Shopee style)
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null); // { code, discount, label }
  const [showVoucherDrawer, setShowVoucherDrawer] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  const AVAILABLE_VOUCHERS = [
    { code: 'HUKI30K', discount: 30000, minSpend: 150000, label: 'Giảm 30.000đ cho đơn từ 150k' },
    { code: 'FREESHIP', discount: 20000, minSpend: 100000, label: 'Giảm 20.000đ phí vận chuyển' },
    { code: 'BANMOI15K', discount: 15000, minSpend: 50000, label: 'Giảm 15.000đ cho bạn mới' },
  ];

  const handleApplyVoucher = (v) => {
    let target = v;
    if (typeof v === 'string') {
      target = AVAILABLE_VOUCHERS.find((item) => item.code.toUpperCase() === v.trim().toUpperCase());
      if (!target) {
        setVoucherError('Mã voucher không hợp lệ hoặc đã hết hạn.');
        return;
      }
    }
    if (rawSubtotal < target.minSpend) {
      setVoucherError(`Đơn hàng cần tối thiểu ${target.minSpend.toLocaleString('vi-VN')}đ để dùng mã này.`);
      return;
    }
    setAppliedVoucher(target);
    setVoucherError('');
    setShowVoucherDrawer(false);
    showToast({
      title: 'Đã áp dụng Voucher thành công!',
      message: `Mã ${target.code} đã giảm ${target.discount.toLocaleString('vi-VN')}đ cho đơn hàng.`,
    }, 'success');
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setVoucherError('');
  };

  // Calculations
  const rawSubtotal = checkedSubtotal;
  const shippingFee = hasPhysicalItems ? (shippingMethod === 'express' ? 35000 : 20000) : 0;
  const voucherDiscount = appliedVoucher ? appliedVoucher.discount : (rawSubtotal >= 300000 ? 30000 : 0);
  const grandTotal = Math.max(0, rawSubtotal - voucherDiscount + shippingFee);

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.name || !addressForm.phone || !addressForm.address) {
      showToast(
        {
          title: 'Thông tin chưa đầy đủ',
          message: 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.',
        },
        'warning'
      );
      return;
    }

    if (isLoggedIn) {
      try {
        const res = await addressApi.createAddress({
          name: addressForm.name.trim(),
          phone: addressForm.phone.trim(),
          province: addressForm.province.trim(),
          district: addressForm.district.trim(),
          ward: addressForm.ward.trim(),
          address: addressForm.address.trim(),
          isDefault: addressForm.isDefault,
        });

        if (res.success && res.data) {
          showToast(
            {
              title: 'Lưu địa chỉ thành công',
              message: 'Địa chỉ giao hàng mới đã được thêm vào sổ địa chỉ.',
            },
            'success'
          );
          await loadAddresses();
          setSelectedAddressId(res.data.id);
          setShowNewAddressForm(false);
          setShowAddressList(false);
          return;
        }
      } catch {
        // Fallback
      }
    }

    setShowNewAddressForm(false);
    setShowAddressList(false);
    showToast(
      {
        title: 'Cập nhật địa chỉ',
        message: 'Đã cập nhật thông tin nhận hàng cho đơn này.',
      },
      'success'
    );
  };

  const handlePlaceOrder = async () => {
    if (checkedItemsCount === 0) {
      showToast(
        {
          title: 'Giỏ hàng trống',
          message: 'Chưa có sản phẩm nào được chọn để thanh toán.',
        },
        'warning'
      );
      navigate('/cart');
      return;
    }

    if (hasPhysicalItems && (!activeAddress.name || !activeAddress.phone || !activeAddress.address)) {
      showToast(
        {
          title: 'Thiếu địa chỉ nhận hàng',
          message: 'Vui lòng cung cấp địa chỉ nhận sách giấy trước khi thanh toán.',
        },
        'warning'
      );
      return;
    }

    setIsSubmitting(true);

    // Call real backend confirmCheckout if logged in
    if (isLoggedIn) {
      try {
        // 1. Sync checked items to server cart if missing
        try {
          const serverCartRes = await cartApi.getCart();
          const serverItems = serverCartRes.success && serverCartRes.data?.items ? serverCartRes.data.items : [];

          for (const item of checkedItems) {
            const isUUID = typeof item.bookId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.bookId);
            if (isUUID) {
              const apiFormat = (item.type === 'physical' || item.format?.toLowerCase().includes('giấy')) ? 'PHYSICAL' : 'DIGITAL';
              const exists = serverItems.some((si) => si.bookId === item.bookId && si.format === apiFormat);
              if (!exists) {
                try {
                  await cartApi.addToCart({
                    bookId: item.bookId,
                    format: apiFormat,
                    quantity: item.quantity || 1,
                  });
                } catch {
                  // ignore
                }
              }
            }
          }
        } catch {
          // ignore
        }

        // 2. Generate or refresh checkout session
        const finalNote = useVatInvoice
          ? (note.trim() ? `${note.trim()} [VAT: Yêu cầu xuất hóa đơn điện tử]` : '[VAT: Yêu cầu xuất hóa đơn điện tử]')
          : (note.trim() || undefined);

        const previewPayload = {
          shippingAddress: hasPhysicalItems
            ? {
                recipientName: activeAddress.name || user?.fullName || 'Khách Hàng',
                phone: activeAddress.phone || user?.phone || '0988123456',
                line1: activeAddress.address || '12 Nguyễn Văn Bảo',
                ward: activeAddress.ward || 'Phường 5',
                district: activeAddress.district || 'Quận Gò Vấp',
                province: activeAddress.province || 'Hồ Chí Minh',
              }
            : undefined,
          note: finalNote,
        };

        let currentSessionId = sessionId;
        try {
          const previewRes = await checkoutApi.previewCheckout(previewPayload);
          if (previewRes.success && previewRes.data?.sessionId) {
            currentSessionId = previewRes.data.sessionId;
          }
        } catch {
          // ignore
        }

        // 3. Confirm order to backend PostgreSQL database
        if (currentSessionId) {
          const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`;
          const confirmRes = await checkoutApi.confirmCheckout(
            {
              sessionId: currentSessionId,
              paymentMethod: 'COD',
            },
            idempotencyKey
          );

          if (confirmRes.success && confirmRes.data?.order) {
            if (useVatInvoice && typeof window !== 'undefined') {
              try {
                if (confirmRes.data.order.id) localStorage.setItem(`huki_order_vat_${confirmRes.data.order.id}`, 'true');
                if (confirmRes.data.order.code) localStorage.setItem(`huki_order_vat_${confirmRes.data.order.code}`, 'true');
                if (confirmRes.data.sellerOrders && Array.isArray(confirmRes.data.sellerOrders)) {
                  confirmRes.data.sellerOrders.forEach((so) => {
                    if (so.id) localStorage.setItem(`huki_order_vat_${so.id}`, 'true');
                    if (so.code) localStorage.setItem(`huki_order_vat_${so.code}`, 'true');
                  });
                }
              } catch {
                // ignore
              }
            }
            clearCart();
            showToast(
              {
                title: 'Đặt hàng thành công!',
                message: `Đơn hàng #${confirmRes.data.order.code} đã được tạo và gửi đến các nhà sách.`,
              },
              'success'
            );
            navigate(`/order-success?orderId=${confirmRes.data.order.id}&code=${confirmRes.data.order.code}&paymentMethod=COD`);
            return;
          }
        }
      } catch (err) {
        console.error('Order creation error:', err);
      }
    }

    // Local / Guest fallback order flow
    setTimeout(() => {
      setIsSubmitting(false);
      clearCart();
      showToast(
        {
          title: 'Đặt hàng thành công!',
          message: 'Đơn hàng của bạn đã được ghi nhận thành công. Đang chuyển hướng...',
        },
        'success'
      );
      navigate('/order-success');
    }, 600);
  };

  return (
    <div className="w-full bg-[var(--theme-background,#F2FBF9)] text-[var(--theme-text,#1c1b1f)] font-body-md antialiased min-h-screen pb-16 transition-colors duration-200">
      {/* Checkout Breadcrumb Header */}
      <div className="bg-[var(--theme-surface,#ffffff)] border-b border-[var(--theme-border,#e8e5df)] py-4 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-xs text-[var(--theme-text-muted,#49454f)] mb-1">
              <Link className="hover:text-[var(--theme-primary,#003B2B)] transition-colors" to="/">
                Trang chủ
              </Link>
              <span className="material-symbols-outlined text-[13px] opacity-40">chevron_right</span>
              <Link className="hover:text-[var(--theme-primary,#003B2B)] transition-colors" to="/cart">
                Giỏ hàng
              </Link>
              <span className="material-symbols-outlined text-[13px] opacity-40">chevron_right</span>
              <span className="text-[var(--theme-primary,#003B2B)] font-bold">Thanh toán</span>
            </nav>
            <div className="flex items-baseline gap-3">
              <h1 className="font-editorial text-2xl sm:text-3xl font-black text-[var(--theme-text,#1c1b1f)] tracking-tight">
                Thanh Toán Đơn Hàng
              </h1>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[var(--theme-primary,#003B2B)] text-xs font-semibold">
              <div className="w-6 h-6 rounded-full bg-[var(--theme-primary,#003B2B)]/15 text-[var(--theme-primary,#003B2B)] flex items-center justify-center font-bold text-[11px]">
                <span className="material-symbols-outlined text-[14px]">check</span>
              </div>
              <span className="hidden md:inline">Giỏ hàng</span>
            </div>
            <div className="w-8 h-0.5 bg-[var(--theme-primary,#003B2B)]"></div>
            <div className="flex items-center gap-1.5 text-[var(--theme-primary,#003B2B)] text-xs font-bold">
              <div className="w-6 h-6 rounded-full bg-[var(--theme-primary,#003B2B)] text-white flex items-center justify-center text-[11px] shadow-xs">
                2
              </div>
              <span>Thanh toán</span>
            </div>
            <div className="w-8 h-0.5 bg-[var(--theme-border,#e8e5df)]"></div>
            <div className="flex items-center gap-1.5 text-[var(--theme-text-muted,#49454f)] text-xs opacity-50">
              <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[var(--theme-text-muted,#49454f)] flex items-center justify-center text-[11px]">
                3
              </div>
              <span className="hidden md:inline">Hoàn tất</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column (8 Cols): Fulfillment & Delivery Info */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            {/* Split Fulfillment Box */}
            <section className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-5 shadow-sm">
              <h2 className="font-editorial text-lg font-bold text-[var(--theme-text,#1c1b1f)] mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-[var(--theme-primary,#003B2B)] rounded-full"></span>
                Phương Thức Giao Nhận &amp; Kích Hoạt Tủ Sách
              </h2>

              <div className="space-y-4">
                {/* Package 1: Ebook DRM (If any) */}
                {ebookItems.length > 0 && (
                  <div className="p-4 rounded-xl bg-[var(--theme-secondary-subtle,#f0fdf4)]/50 border border-[var(--theme-primary,#003B2B)]/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[var(--theme-primary,#003B2B)] text-white flex items-center justify-center text-xs">
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                        </span>
                        <strong className="text-xs sm:text-sm text-[var(--theme-primary,#003B2B)] font-bold">
                          GÓI 1: EBOOK BẢN QUYỀN DRM ({ebookItems.length} ấn phẩm)
                        </strong>
                      </div>
                      <span className="bg-[var(--theme-primary,#003B2B)] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        MIỄN PHÍ SHIP
                      </span>
                    </div>
                    <p className="text-xs text-[var(--theme-text-muted,#49454f)] leading-relaxed pl-9">
                      Kích hoạt ngay lập tức vào <strong>Tủ Sách HUKI</strong> sau khi thanh toán thành công. Đọc trực tiếp trên Web Reader và App di động.
                    </p>
                  </div>
                )}

                {/* Package 2: Physical Books (If any) */}
                {physicalItems.length > 0 && (
                  <div className="p-4 rounded-xl bg-[var(--theme-background,#F2FBF9)]/60 border border-[var(--theme-border,#e8e5df)] flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-[var(--theme-text,#1c1b1f)] flex items-center justify-center text-xs">
                          <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                        </span>
                        <strong className="text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)] font-bold">
                          GÓI 2: SÁCH GIẤY VẬT LÝ ({physicalItems.length} ấn phẩm)
                        </strong>
                      </div>
                      <span className="text-xs text-[var(--theme-text-muted,#49454f)] font-medium">Giao bưu tá 2-3 ngày</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[var(--theme-border,#e8e5df)]/40">
                      <label
                        onClick={() => setShippingMethod('standard')}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                          shippingMethod === 'standard'
                            ? 'border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 font-bold'
                            : 'border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)]'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-[var(--theme-text,#1c1b1f)] block">Tiêu Chuẩn (2-3 ngày)</span>
                          <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">Giao bởi GHTK / SPX Express</span>
                        </div>
                        <span className="font-bold text-[var(--theme-primary,#003B2B)]">20.000đ</span>
                      </label>

                      <label
                        onClick={() => setShippingMethod('express')}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                          shippingMethod === 'express'
                            ? 'border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 font-bold'
                            : 'border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)]'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-[var(--theme-text,#1c1b1f)] block">Hỏa Tốc 2 Giờ (Nội thành)</span>
                          <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">Giao bởi GrabExpress</span>
                        </div>
                        <span className="font-bold text-[var(--theme-primary,#003B2B)]">35.000đ</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Customer & Shipping Address Section */}
            {hasPhysicalItems && (
              <section className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h2 className="font-editorial text-lg font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[var(--theme-primary,#003B2B)] rounded-full"></span>
                    Thông Tin Khách Hàng
                  </h2>
                  <div className="flex items-center gap-2">
                    {addresses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressList((prev) => !prev);
                          setShowNewAddressForm(false);
                        }}
                        className="text-xs text-[var(--theme-primary,#003B2B)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
                        {showAddressList ? 'Thu gọn' : 'Đổi địa chỉ'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAddressForm((prev) => !prev);
                        setShowAddressList(false);
                      }}
                      className="text-xs text-[var(--theme-primary,#003B2B)] hover:bg-[var(--theme-primary,#003B2B)]/15 font-bold flex items-center gap-1 cursor-pointer bg-[var(--theme-primary,#003B2B)]/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {showNewAddressForm ? 'close' : 'add'}
                      </span>
                      {showNewAddressForm ? 'Hủy' : 'Thêm địa chỉ mới'}
                    </button>
                  </div>
                </div>

                {/* Inline Address Selection List */}
                {showAddressList && addresses.length > 1 && (
                  <div className="mb-4 p-3 bg-[var(--theme-background,#F2FBF9)]/50 rounded-xl border border-[var(--theme-border,#e8e5df)] space-y-2 animate-in fade-in duration-200">
                    <span className="text-[11px] font-bold text-[var(--theme-text-muted,#49454f)] block">
                      Chọn địa chỉ từ sổ địa chỉ của bạn:
                    </span>
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => {
                            setSelectedAddressId(addr.id);
                            setShowAddressList(false);
                          }}
                          className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? 'border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 font-bold'
                              : 'border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] hover:border-[var(--theme-primary,#003B2B)]/40'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--theme-text-muted,#49454f)] font-medium">Tên khách hàng:</span>
                              <span className="font-bold text-[var(--theme-text,#1c1b1f)]">{addr.name}</span>
                              {addr.isDefault && (
                                <span className="bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] text-[9px] px-1.5 py-0.2 rounded font-bold ml-1">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[var(--theme-text-muted,#49454f)] font-medium">Số điện thoại:</span>{' '}
                              <span className="font-semibold text-[var(--theme-text,#1c1b1f)]">{addr.phone}</span>
                            </div>
                            <div className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                              <span className="font-medium text-[var(--theme-text,#1c1b1f)]">Địa chỉ:</span> {addr.address}, {addr.ward}, {addr.district}, {addr.province}
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)]">
                            {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline New Address Form */}
                {showNewAddressForm ? (
                  <form
                    onSubmit={handleSaveNewAddress}
                    className="p-5 bg-[var(--theme-background,#F2FBF9)]/60 rounded-2xl border-2 border-[var(--theme-primary,#003B2B)]/30 space-y-4 animate-in fade-in duration-200"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--theme-border,#e8e5df)]/60 pb-2">
                      <span className="text-xs sm:text-sm font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)]">add_location_alt</span>
                        Thêm địa chỉ nhận sách mới:
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
                            Họ và tên người nhận <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={addressForm.name}
                            onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                            placeholder="Ví dụ: Nguyễn Văn An"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] focus:ring-2 focus:ring-[var(--theme-primary,#003B2B)]/10"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
                            Số điện thoại <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={addressForm.phone}
                            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                            placeholder="Ví dụ: 0912345678"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] focus:ring-2 focus:ring-[var(--theme-primary,#003B2B)]/10"
                          />
                        </div>
                      </div>

                      <div>
                        <CustomLocationSelector
                          province={addressForm.province}
                          district={addressForm.district}
                          ward={addressForm.ward}
                          onChange={({ province, district, ward }) =>
                            setAddressForm((prev) => ({ ...prev, province, district, ward }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
                          Số nhà, tên đường chi tiết <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={addressForm.address}
                          onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                          placeholder="Ví dụ: 12 Nguyễn Văn Bảo"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] focus:ring-2 focus:ring-[var(--theme-primary,#003B2B)]/10"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--theme-border,#e8e5df)]/60">
                        <button
                          type="button"
                          onClick={() => setShowNewAddressForm(false)}
                          className="px-4 py-2 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        >
                          Đóng
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow-xs"
                        >
                          Lưu &amp; Sử Dụng
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* Current Active Address Card (Vertical Layout, Clean, Spacious, Explicit Labels) */
                  <div className="p-5 sm:p-6 bg-[var(--theme-background,#F2FBF9)]/60 rounded-2xl border border-[var(--theme-border,#e8e5df)] text-sm text-[var(--theme-text,#1c1b1f)] flex flex-col gap-3.5 sm:gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--theme-text-muted,#49454f)] text-xs sm:text-sm font-medium min-w-[115px]">Tên khách hàng:</span>
                      <strong className="font-bold text-sm sm:text-base text-[var(--theme-text,#1c1b1f)]">{activeAddress.name}</strong>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[var(--theme-text-muted,#49454f)] text-xs sm:text-sm font-medium min-w-[115px]">Số điện thoại:</span>
                      <span className="font-semibold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)]">({activeAddress.phone})</span>
                    </div>

                    <div className="flex items-start gap-3 pt-3 border-t border-[var(--theme-border,#e8e5df)]/60">
                      <span className="text-[var(--theme-text-muted,#49454f)] text-xs sm:text-sm font-medium min-w-[115px] flex items-center gap-1.5 shrink-0 pt-0.5">
                        <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)]">location_on</span>
                        Địa chỉ:
                      </span>
                      <span className="text-[var(--theme-text,#1c1b1f)] text-xs sm:text-sm leading-relaxed font-medium">
                        {activeAddress.address}, {activeAddress.ward}, {activeAddress.district}, {activeAddress.province}
                      </span>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Payment Methods (COD is Active & Primary) */}
            <section className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-5 shadow-sm">
              <h2 className="font-editorial text-lg font-bold text-[var(--theme-text,#1c1b1f)] mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-[var(--theme-primary,#003B2B)] rounded-full"></span>
                Phương Thức Thanh Toán
              </h2>

              <div className="space-y-2.5">
                {/* COD (Primary Active) */}
                <label
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    paymentMethod === 'COD'
                      ? 'border-2 border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 shadow-xs'
                      : 'border-[var(--theme-border,#e8e5df)] bg-[var(--theme-background,#F2FBF9)]/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xs shadow-2xs">
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)]">
                          Thanh toán khi nhận hàng (COD)
                        </span>
                        <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                          Khuyên dùng
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                        Thanh toán tiền mặt cho bưu tá khi nhận sách giấy hoặc kích hoạt tức thì
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="w-4 h-4 text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] border-[var(--theme-border,#e8e5df)] cursor-pointer"
                  />
                </label>

                {/* HukiPay Wallet (Disabled UI) */}
                <div className="relative opacity-50 pointer-events-none cursor-not-allowed select-none">
                  <div className="p-3.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-background,#F2FBF9)]/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                        H
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)]">
                            Ví HukiPay
                          </span>
                          <span className="bg-neutral-200 dark:bg-neutral-800 text-[var(--theme-text-muted,#49454f)] text-[9px] font-bold px-1.5 py-0.2 rounded border border-[var(--theme-border,#e8e5df)]">
                            Sắp hỗ trợ
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                          Thanh toán một chạm qua số dư ví số HUKI
                        </span>
                      </div>
                    </div>
                    <input type="radio" name="pay" disabled className="w-4 h-4 text-primary opacity-40" />
                  </div>
                </div>

                {/* VNPay (Disabled UI) */}
                <div className="relative opacity-50 pointer-events-none cursor-not-allowed select-none">
                  <div className="p-3.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-background,#F2FBF9)]/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        VNP
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)]">
                            Cổng VNPay QR
                          </span>
                          <span className="bg-neutral-200 dark:bg-neutral-800 text-[var(--theme-text-muted,#49454f)] text-[9px] font-bold px-1.5 py-0.2 rounded border border-[var(--theme-border,#e8e5df)]">
                            Sắp hỗ trợ
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                          Quét mã QR qua ứng dụng ngân hàng và thẻ ATM
                        </span>
                      </div>
                    </div>
                    <input type="radio" name="pay" disabled className="w-4 h-4 text-primary opacity-40" />
                  </div>
                </div>

                {/* MoMo (Disabled UI) */}
                <div className="relative opacity-50 pointer-events-none cursor-not-allowed select-none">
                  <div className="p-3.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-background,#F2FBF9)]/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center text-xs font-bold">
                        MoMo
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)]">
                            Ví MoMo
                          </span>
                          <span className="bg-neutral-200 dark:bg-neutral-800 text-[var(--theme-text-muted,#49454f)] text-[9px] font-bold px-1.5 py-0.2 rounded border border-[var(--theme-border,#e8e5df)]">
                            Sắp hỗ trợ
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                          Thanh toán qua ứng dụng Ví điện tử MoMo
                        </span>
                      </div>
                    </div>
                    <input type="radio" name="pay" disabled className="w-4 h-4 text-primary opacity-40" />
                  </div>
                </div>
              </div>
            </section>

            {/* Note & VAT Invoice */}
            <section className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-5 shadow-sm space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
                  Ghi chú đơn hàng (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giao giờ hành chính, bọc thêm bìa chống sốc..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-background,#F2FBF9)]/50 text-xs text-[var(--theme-text,#1c1b1f)] focus:outline-none focus:border-[var(--theme-primary,#003B2B)]"
                />
              </div>

              <div className="pt-2 border-t border-[var(--theme-border,#e8e5df)]/50 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--theme-text,#1c1b1f)] select-none">
                  <input
                    type="checkbox"
                    checked={useVatInvoice}
                    onChange={(e) => setUseVatInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] border-[var(--theme-border,#e8e5df)] cursor-pointer"
                  />
                  <span>Yêu cầu xuất hóa đơn điện tử VAT (e-Invoice)</span>
                </label>
                <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">Gửi qua Email</span>
              </div>
            </section>
          </div>

          {/* Right Column (4 Cols): Order Summary & Placement */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <div className="sticky top-20 bg-[var(--theme-surface,#ffffff)] border border-[var(--theme-border,#e8e5df)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <h2 className="font-editorial text-lg font-bold text-[var(--theme-text,#1c1b1f)] pb-3 border-b border-[var(--theme-border,#e8e5df)]/60 flex items-center justify-between">
                <span>Đơn Hàng ({checkedItems.length} ấn phẩm)</span>
                {isLoadingSession && (
                  <span className="text-[10px] text-[var(--theme-text-muted,#49454f)] animate-pulse">
                    Đang tính giá...
                  </span>
                )}
              </h2>

              {/* Items Mini List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {checkedItems.map((item) => (
                  <Link
                    key={item.id}
                    to={`/book/${item.bookId || item.id}`}
                    className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-xl border border-transparent hover:border-[var(--theme-border,#e8e5df)]/70 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-all duration-150 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        className="w-10 h-14 rounded object-cover shrink-0 border border-[var(--theme-border,#e8e5df)]"
                        alt={item.title}
                        src={item.cover}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-[var(--theme-text,#1c1b1f)] line-clamp-1 block group-hover:text-[var(--theme-primary,#003B2B)] transition-colors">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                          x{item.quantity} · {item.format === 'ebook' ? 'Sách điện tử DRM' : 'Sách giấy'}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[var(--theme-text,#1c1b1f)] shrink-0">
                      {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </Link>
                ))}
              </div>

              {/* Shopee-style Voucher Section */}
              <div className="pt-3 border-t border-[var(--theme-border,#e8e5df)]/60">
                <div
                  onClick={() => setShowVoucherDrawer((prev) => !prev)}
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-[20px]">confirmation_number</span>
                    <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                      HUKI Voucher
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {appliedVoucher ? (
                      <span className="font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full text-[11px]">
                        -{appliedVoucher.discount.toLocaleString('vi-VN')}đ
                      </span>
                    ) : (
                      <span className="text-[var(--theme-text-muted,#49454f)] text-[11px] font-medium flex items-center gap-0.5">
                        Chọn hoặc nhập mã <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline Voucher Selector Accordion */}
                {showVoucherDrawer && (
                  <div className="mt-2.5 p-3 rounded-xl bg-[var(--theme-background,#F2FBF9)]/70 border border-[var(--theme-border,#e8e5df)] space-y-3 animate-in fade-in duration-200 text-xs">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nhập mã voucher..."
                        value={voucherCodeInput}
                        onChange={(e) => {
                          setVoucherCodeInput(e.target.value.toUpperCase());
                          setVoucherError('');
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] text-xs uppercase font-bold focus:outline-none focus:border-[var(--theme-primary,#003B2B)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyVoucher(voucherCodeInput)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--theme-primary,#003B2B)] text-white text-xs font-bold hover:opacity-90 cursor-pointer"
                      >
                        Áp Dụng
                      </button>
                    </div>

                    {voucherError && (
                      <p className="text-red-500 text-[11px] font-medium">{voucherError}</p>
                    )}

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--theme-text-muted,#49454f)] block">Mã khuyến mãi có sẵn:</span>
                      {AVAILABLE_VOUCHERS.map((v) => {
                        const isSelected = appliedVoucher?.code === v.code;
                        const isEligible = rawSubtotal >= v.minSpend;
                        return (
                          <div
                            key={v.code}
                            onClick={() => isEligible && handleApplyVoucher(v)}
                            className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 font-bold'
                                : isEligible
                                ? 'border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003B2B)]/50 bg-[var(--theme-surface,#ffffff)]'
                                : 'opacity-40 cursor-not-allowed bg-black/5'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-[var(--theme-primary,#003B2B)]">{v.code}</span>
                                <span className="text-[10px] text-[var(--theme-text-muted,#49454f)] font-medium">({v.label})</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-600">
                              {isSelected ? 'Đang dùng' : 'Dùng ngay'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {appliedVoucher && (
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="w-full text-center text-red-500 text-[11px] font-semibold hover:underline cursor-pointer pt-1"
                      >
                        Hủy áp dụng mã giảm giá
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-[var(--theme-border,#e8e5df)]/60 space-y-2 text-xs text-[var(--theme-text-muted,#49454f)]">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-semibold text-[var(--theme-text,#1c1b1f)]">
                    {rawSubtotal.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <span>Voucher giảm giá:</span>
                      {appliedVoucher && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 px-1 rounded font-bold">
                          {appliedVoucher.code}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">-{voucherDiscount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-[var(--theme-text,#1c1b1f)]">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">MIỄN PHÍ</span>
                    ) : (
                      `${shippingFee.toLocaleString('vi-VN')}đ`
                    )}
                  </span>
                </div>
              </div>

              {/* Total & Submit Button */}
              <div className="pt-3 border-t border-[var(--theme-border,#e8e5df)]/60 flex items-baseline justify-between">
                <span className="font-bold text-sm text-[var(--theme-text,#1c1b1f)]">Tổng cộng:</span>
                <span className="text-2xl font-black text-[var(--theme-primary,#003B2B)]">
                  {grandTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || checkedItemsCount === 0}
                className="w-full h-12 bg-[var(--theme-primary,#003B2B)] hover:opacity-95 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">
                      progress_activity
                    </span>
                    Đang Xử Lý Đơn Hàng...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                    Hoàn Tất Đặt Hàng ({checkedItems.length})
                  </>
                )}
              </button>

              <p className="text-[11px] text-[var(--theme-text-muted,#49454f)] text-center leading-relaxed">
                Nhấn "Hoàn Tất Đặt Hàng" đồng nghĩa bạn đồng ý với{' '}
                <Link to="/" className="text-[var(--theme-primary,#003B2B)] underline">
                  Điều khoản sàn TMĐT HUKI
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
