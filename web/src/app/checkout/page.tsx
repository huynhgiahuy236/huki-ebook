"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/ui/context/CartContext";
import { useAuth } from "@/ui/context/AuthContext";
import { useToast } from "@/ui/context/ToastContext";
import { addressApi } from "@/ui/api/addressApi";
import { cartApi } from "@/ui/api/cartApi";
import { checkoutApi } from "@/ui/api/checkoutApi";
import { paymentApi } from "@/ui/api/paymentApi";
import { voucherApi } from "@/ui/api/voucherApi";
import { tokenStorage } from "@/ui/api/tokenStorage";
import CustomLocationSelector from "@/ui/components/common/CustomLocationSelector";
import AddressMapPreview from "@/ui/components/common/AddressMapPreview";
import PaymentCountdownModal from "@/ui/components/checkout/PaymentCountdownModal";

/**
 * CheckoutPage - Migrated to Next.js App Router
 * Full checkout flow supporting COD & PayOS QR payment, Platform/Store/Shipping Vouchers,
 * Address selector with map preview, VAT invoice options.
 */

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoggedIn } = (useAuth() || {}) as any;
  const {
    cartItems = [],
    checkedSubtotal = 0,
    checkedItemsCount = 0,
    hasPhysicalItems = false,
    clearCart = () => {},
  } = (useCart() || {}) as any;
  const { showToast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<string>("COD");
  const [shippingMethod, setShippingMethod] = useState<string>("standard");
  const [useVatInvoice, setUseVatInvoice] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
  const [, setSessionId] = useState<string>("");
  const [checkoutPreview, setCheckoutPreview] = useState<any>(null);

  // Payment modal states for PayOS
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [activePaymentData, setActivePaymentData] = useState<any>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentOrderCode, setCurrentOrderCode] = useState<string | null>(null);
  const [currentOrderGrandTotal, setCurrentOrderGrandTotal] = useState<number>(0);

  // Address states
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressList, setShowAddressList] = useState<boolean>(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(false);
  const [addressForm, setAddressForm] = useState<{
    name: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    address: string;
    isDefault: boolean;
  }>({
    name: user?.fullName || user?.name || "",
    phone: user?.phone || "",
    province: "",
    district: "",
    ward: "",
    address: "",
    isDefault: true,
  });

  const checkedItems = (cartItems || []).filter((i: any) => i.checked);
  const ebookItems = checkedItems.filter((i: any) => i.type === "ebook");
  const physicalItems = checkedItems.filter((i: any) => i.type === "physical");

  const rawSubtotal =
    checkedSubtotal ||
    checkedItems.reduce(
      (sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
      0
    );
  const shippingFee = hasPhysicalItems ? 30000 : 0;
  const grandTotal = rawSubtotal + shippingFee;

  // Load user addresses if logged in
  const loadAddresses = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await addressApi.getAddresses();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAddresses(res.data);
        const defaultAddr = res.data.find((a: any) => a.isDefault) || res.data[0];
        setSelectedAddressId(defaultAddr.id);
        setAddressForm({
          name: defaultAddr.name || user?.fullName || user?.name || "",
          phone: defaultAddr.phone || user?.phone || "",
          province: defaultAddr.province || "",
          district: defaultAddr.district || "",
          ward: defaultAddr.ward || "",
          address: defaultAddr.address || "",
          isDefault: defaultAddr.isDefault ?? true,
        });
        setShowNewAddressForm(false);
      } else {
        setAddresses([]);
        setSelectedAddressId("");
        setAddressForm({
          name: user?.fullName || user?.name || "",
          phone: user?.phone || "",
          province: "",
          district: "",
          ward: "",
          address: "",
          isDefault: true,
        });
        setShowNewAddressForm(true);
      }
    } catch {
      // ignore
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Selected address object (null if user has not configured any address)
  const activeAddress = useMemo(() => {
    if (selectedAddressId && addresses.length > 0) {
      const found = addresses.find((a: any) => a.id === selectedAddressId);
      if (found) return found;
    }
    if (addresses.length > 0) return addresses[0];
    if (addressForm.name || addressForm.phone || addressForm.address || addressForm.province) {
      return addressForm;
    }
    return null;
  }, [addresses, selectedAddressId, addressForm]);

  const hasValidAddress = Boolean(
    activeAddress &&
      activeAddress.name?.trim() &&
      activeAddress.phone?.trim() &&
      activeAddress.address?.trim() &&
      activeAddress.province?.trim()
  );

  // Voucher states (Shopee style) - from backend API
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>("");
  const [appliedPlatformVoucher, setAppliedPlatformVoucher] = useState<any>(null);
  const [appliedStoreVouchers, setAppliedStoreVouchers] = useState<Record<string, any>>({}); // { storeId: { code, discount } }
  const [appliedShippingVoucher, setAppliedShippingVoucher] = useState<any>(null);
  const [showVoucherDrawer, setShowVoucherDrawer] = useState<boolean>(false);
  const [voucherError, setVoucherError] = useState<string>("");
  const [availableVouchers, setAvailableVouchers] = useState<{
    platform: any[];
    stores: Record<string, any>;
    shipping: any[];
  }>({
    platform: [],
    stores: {},
    shipping: [],
  });
  const [, setIsLoadingVouchers] = useState<boolean>(false);

  // Load available vouchers from backend
  useEffect(() => {
    const loadVouchers = async () => {
      if (!isLoggedIn) return;
      setIsLoadingVouchers(true);
      try {
        const res = await voucherApi.getAvailableVouchers();
        if (res.success && Array.isArray(res.data)) {
          const platform = res.data.filter(
            (v: any) => v.scope === "PLATFORM" && v.type !== "FREE_SHIPPING"
          );
          const shipping = res.data.filter((v: any) => v.type === "FREE_SHIPPING");
          setAvailableVouchers({
            platform,
            stores: {},
            shipping,
          });
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingVouchers(false);
      }
    };
    loadVouchers();
  }, [isLoggedIn]);

  // Apply platform voucher
  const handleApplyPlatformVoucher = async (voucher: any) => {
    try {
      const res = await voucherApi.validateVoucher({
        code: voucher.code,
        orderSubtotal: rawSubtotal,
      });
      if (res.success && res.data?.valid) {
        setAppliedPlatformVoucher({
          code: voucher.code,
          discount: res.data.discount,
          label: `${voucher.name} - Giảm ${res.data.discount?.toLocaleString("vi-VN")}đ`,
        });
        setVoucherError("");
        showToast(
          {
            title: "Đã áp dụng Voucher!",
            message: `Giảm ${res.data.discount?.toLocaleString("vi-VN")}đ`,
          },
          "success"
        );
      } else {
        setVoucherError(res.data?.reason || "Voucher không hợp lệ");
      }
    } catch {
      setVoucherError("Không thể áp dụng voucher");
    }
  };

  // Apply shipping voucher
  const handleApplyShippingVoucher = async (voucher: any) => {
    try {
      const res = await voucherApi.validateVoucher({
        code: voucher.code,
        orderSubtotal: shippingFee,
      });
      if (res.success && res.data?.valid) {
        setAppliedShippingVoucher({
          code: voucher.code,
          discount: res.data.discount,
          label: `${voucher.name} - Giảm ${res.data.discount?.toLocaleString("vi-VN")}đ phí vận chuyển`,
        });
        setVoucherError("");
        showToast(
          {
            title: "Đã áp dụng Freeship!",
            message: `Giảm ${res.data.discount?.toLocaleString("vi-VN")}đ phí vận chuyển`,
          },
          "success"
        );
      } else {
        setVoucherError(res.data?.reason || "Voucher không hợp lệ");
      }
    } catch {
      setVoucherError("Không thể áp dụng voucher");
    }
  };

  // Remove platform voucher
  const handleRemovePlatformVoucher = () => {
    setAppliedPlatformVoucher(null);
    setVoucherError("");
  };

  // Trigger checkout preview with vouchers
  useEffect(() => {
    if (!isLoggedIn || checkedItems.length === 0) return;

    let isMounted = true;
    const fetchCheckoutSession = async () => {
      setIsLoadingSession(true);
      try {
        const platformVoucherCode = appliedPlatformVoucher?.code;
        const storeVoucherCodes = Object.keys(appliedStoreVouchers).reduce(
          (acc: Record<string, string>, storeId: string) => {
            if (appliedStoreVouchers[storeId]?.code) {
              acc[storeId] = appliedStoreVouchers[storeId].code;
            }
            return acc;
          },
          {}
        );
        const shippingVoucherCode = appliedShippingVoucher?.code;

        const res = await checkoutApi.previewCheckout({
          addressId: selectedAddressId || undefined,
          shippingAddress:
            !selectedAddressId && hasPhysicalItems && activeAddress
              ? {
                  recipientName: activeAddress.name || user?.fullName || "Khách Hàng",
                  phone: activeAddress.phone || user?.phone || "0988123456",
                  line1: activeAddress.address || "",
                  ward: activeAddress.ward || "",
                  district: activeAddress.district || "",
                  province: activeAddress.province || "",
                }
              : undefined,
          note: note.trim() || undefined,
          platformVoucherCode,
          storeVoucherCodes:
            Object.keys(storeVoucherCodes).length > 0 ? storeVoucherCodes : undefined,
          shippingVoucherCode,
        });

        if (isMounted && res.success && res.data?.sessionId) {
          setSessionId(res.data.sessionId);
          setCheckoutPreview(res.data);
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
  }, [
    isLoggedIn,
    checkedItems.length,
    hasPhysicalItems,
    activeAddress,
    selectedAddressId,
    note,
    user,
    appliedPlatformVoucher,
    appliedStoreVouchers,
    appliedShippingVoucher,
  ]);

  const serverUnitPrices = useMemo(() => {
    const prices = new Map();
    for (const group of checkoutPreview?.groups || []) {
      for (const item of group.items || []) prices.set(item.bookId, item);
    }
    return prices;
  }, [checkoutPreview]);

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.name || !addressForm.phone || !addressForm.address) {
      showToast(
        {
          title: "Thông tin chưa đầy đủ",
          message: "Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.",
        },
        "warning"
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
              title: "Lưu địa chỉ thành công",
              message: "Địa chỉ giao hàng mới đã được thêm vào sổ địa chỉ.",
            },
            "success"
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
        title: "Cập nhật địa chỉ",
        message: "Đã cập nhật thông tin nhận hàng cho đơn này.",
      },
      "success"
    );
  };

  const handlePlaceOrder = async () => {
    if (checkedItemsCount === 0) {
      showToast(
        {
          title: "Giỏ hàng trống",
          message: "Chưa có sản phẩm nào được chọn để thanh toán.",
        },
        "warning"
      );
      router.push("/cart");
      return;
    }

    if (hasPhysicalItems && !hasValidAddress) {
      showToast(
        {
          title: "Thiếu địa chỉ nhận hàng",
          message:
            "Bạn đang mua sách giấy vật lý. Vui lòng thêm/chọn địa chỉ nhận hàng hợp lệ trước khi đặt hàng.",
        },
        "warning"
      );
      setShowNewAddressForm(true);
      return;
    }

    setIsSubmitting(true);

    const hasToken = Boolean(tokenStorage.getAccessToken());

    if (isLoggedIn || hasToken) {
      try {
        // 1. Sync checked items to server cart if missing
        try {
          const serverCartRes = await cartApi.getCart();
          const serverItems =
            serverCartRes.success && serverCartRes.data?.items
              ? serverCartRes.data.items
              : [];

          for (const item of checkedItems) {
            const isUUID =
              typeof item.bookId === "string" &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                item.bookId
              );
            if (isUUID) {
              const apiFormat =
                item.type === "physical" ||
                item.format?.toLowerCase().includes("giấy")
                  ? "PHYSICAL"
                  : "DIGITAL";
              const exists = serverItems.some(
                (si: any) => si.bookId === item.bookId && si.format === apiFormat
              );
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
          ? note.trim()
            ? `${note.trim()} [VAT: Yêu cầu xuất hóa đơn điện tử]`
            : "[VAT: Yêu cầu xuất hóa đơn điện tử]"
          : note.trim() || undefined;

        const storeVoucherCodes = Object.keys(appliedStoreVouchers).reduce(
          (acc: Record<string, string>, storeId: string) => {
            if (appliedStoreVouchers[storeId]?.code) {
              acc[storeId] = appliedStoreVouchers[storeId].code;
            }
            return acc;
          },
          {}
        );

        const shippingAddressPayload = {
          recipientName: activeAddress?.name || user?.fullName || "Khách Hàng",
          phone:
            activeAddress?.phone && activeAddress.phone.length >= 9
              ? activeAddress.phone
              : "0988123456",
          line1: activeAddress?.address || "12 Nguyễn Văn Bảo",
          ward: activeAddress?.ward || "Phường 5",
          district: activeAddress?.district || "Quận Gò Vấp",
          province: activeAddress?.province || "Hồ Chí Minh",
        };

        const previewPayload = {
          addressId: selectedAddressId || undefined,
          shippingAddress: !selectedAddressId && hasPhysicalItems ? shippingAddressPayload : undefined,
          note: finalNote,
          platformVoucherCode: appliedPlatformVoucher?.code,
          storeVoucherCodes:
            Object.keys(storeVoucherCodes).length > 0 ? storeVoucherCodes : undefined,
          shippingVoucherCode: appliedShippingVoucher?.code,
        };

        const previewRes = await checkoutApi.previewCheckout(previewPayload);
        if (!previewRes.success || !previewRes.data?.sessionId) {
          setIsSubmitting(false);
          showToast(
            {
              title: "Không thể khởi tạo đơn hàng",
              message:
                previewRes.error?.message ||
                "Vui lòng kiểm tra lại địa chỉ nhận hàng và giỏ hàng.",
            },
            "error"
          );
          return;
        }

        const currentSessionId = previewRes.data.sessionId;

        // 3. Confirm order to backend PostgreSQL database
        const idempotencyKey =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `idemp-${Date.now()}`;
        const isOnline = paymentMethod === "ONLINE_PAYMENT";
        const confirmRes = await checkoutApi.confirmCheckout(
          {
            sessionId: currentSessionId,
            addressId: selectedAddressId || undefined,
            paymentMethod: isOnline ? "ONLINE_PAYMENT" : "COD",
            paymentProvider: isOnline ? "PAYOS" : undefined,
            platformVoucherCode: appliedPlatformVoucher?.code,
            storeVoucherCodes:
              Object.keys(storeVoucherCodes).length > 0 ? storeVoucherCodes : undefined,
            shippingVoucherCode: appliedShippingVoucher?.code,
          },
          idempotencyKey
        );

        if (confirmRes.success && confirmRes.data?.order) {
          const orderData = confirmRes.data.order;
          if (useVatInvoice && typeof window !== "undefined") {
            try {
              if (orderData.id)
                localStorage.setItem(`huki_order_vat_${orderData.id}`, "true");
              if (orderData.code)
                localStorage.setItem(`huki_order_vat_${orderData.code}`, "true");
              if (
                confirmRes.data.sellerOrders &&
                Array.isArray(confirmRes.data.sellerOrders)
              ) {
                confirmRes.data.sellerOrders.forEach((so: any) => {
                  if (so.id)
                    localStorage.setItem(`huki_order_vat_${so.id}`, "true");
                  if (so.code)
                    localStorage.setItem(`huki_order_vat_${so.code}`, "true");
                });
              }
            } catch {
              // ignore
            }
          }

          if (isOnline) {
            setIsSubmitting(false);
            let payData = null;
            try {
              const initRes = await paymentApi.initiatePayment(orderData.id, {
                returnUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/order-success?orderId=${orderData.id}&code=${orderData.code}&paymentMethod=ONLINE_PAYMENT`,
                cancelUrl:
                  typeof window !== "undefined" ? window.location.href : "",
              });
              if (initRes.success && initRes.data) {
                payData = initRes.data;
              } else if (initRes.error) {
                showToast(
                  {
                    title: "Lưu ý thanh toán PayOS",
                    message:
                      initRes.error.message || "Không thể tạo liên kết PayOS.",
                  },
                  "warning"
                );
              }
            } catch (payErr) {
              console.error("Failed to initiate PayOS link:", payErr);
            }

            setCurrentOrderId(orderData.id);
            setCurrentOrderCode(orderData.code);
            setCurrentOrderGrandTotal(
              Number(orderData.grandTotal) || grandTotal
            );
            setActivePaymentData(payData);
            setShowPaymentModal(true);
            showToast(
              {
                title: "Đã tạo đơn hàng thành công!",
                message:
                  "Vui lòng quét mã VietQR để hoàn tất thanh toán trong vòng 2 phút (120s).",
              },
              "info"
            );
            return;
          }

          clearCart();
          showToast(
            {
              title: "Đặt hàng thành công!",
              message: `Đơn hàng #${orderData.code} đã được tạo và gửi đến các nhà sách.`,
            },
            "success"
          );
          router.push(
            `/order-success?orderId=${orderData.id}&code=${orderData.code}&paymentMethod=COD`
          );
          return;
        } else {
          setIsSubmitting(false);
          showToast(
            {
              title: "Đặt hàng không thành công",
              message:
                confirmRes.error?.message ||
                "Có lỗi khi xác nhận đơn hàng từ máy chủ.",
            },
            "error"
          );
          return;
        }
      } catch (err) {
        console.error("Order creation error:", err);
        setIsSubmitting(false);
        showToast(
          {
            title: "Lỗi xử lý đơn hàng",
            message:
              err instanceof Error
                ? err.message
                : "Không thể kết nối đến máy chủ.",
          },
          "error"
        );
        return;
      }
    }

    // Local / Guest fallback order flow
    setTimeout(() => {
      setIsSubmitting(false);
      const isOnline = paymentMethod === "ONLINE_PAYMENT";
      const fallbackCode = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const fallbackId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `ord-${Date.now()}`;

      if (isOnline) {
        setCurrentOrderId(fallbackId);
        setCurrentOrderCode(fallbackCode);
        setCurrentOrderGrandTotal(grandTotal);
        setShowPaymentModal(true);
        clearCart();
        showToast(
          {
            title: "Đã tạo đơn hàng thành công!",
            message:
              "Vui lòng quét mã VietQR để hoàn tất thanh toán trong vòng 2 phút (120s).",
          },
          "info"
        );
        return;
      }

      clearCart();
      showToast(
        {
          title: "Đặt hàng thành công!",
          message:
            "Đơn hàng của bạn đã được ghi nhận thành công. Đang chuyển hướng...",
        },
        "success"
      );
      router.push(
        `/order-success?orderId=${fallbackId}&code=${fallbackCode}&paymentMethod=COD`
      );
    }, 400);
  };

  return (
    <div className="w-full bg-[var(--theme-background,#F2FBF9)] text-[var(--theme-text,#1c1b1f)] font-body-md antialiased min-h-screen pb-16 transition-colors duration-200">
      {/* Checkout Minimalist Header */}
      <header className="sticky top-0 z-40 bg-[var(--theme-surface,#ffffff)]/95 backdrop-blur-md border-b border-[var(--theme-border,#e8e5df)] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--theme-primary,#003B2B)] to-[var(--theme-secondary,#006d4e)] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[22px]">menu_book</span>
              </div>
              <div className="flex flex-col">
                <span className="font-editorial text-lg sm:text-xl font-bold tracking-tight text-[var(--theme-primary,#003B2B)] leading-none">
                  HUKI EBOOK
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--theme-text-muted,#49454f)]">
                  Sàn Sách Số & Sách Giấy
                </span>
              </div>
            </Link>

            <div className="h-5 w-px bg-[var(--theme-border,#e8e5df)] mx-1 hidden sm:block"></div>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--theme-secondary-subtle,#f0fdf4)] border border-[var(--theme-border,#e8e5df)]/60 text-[var(--theme-secondary,#006d4e)] text-xs font-semibold">
              <span className="material-symbols-outlined text-[15px]">lock</span>
              <span>Thanh toán an toàn 256-bit SSL</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link
              href="/cart"
              className="inline-flex items-center gap-1 text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-primary,#003B2B)] transition-colors py-1 px-2.5 rounded-xl hover:bg-black/5"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              <span className="hidden sm:inline">Quay lại giỏ hàng</span>
            </Link>

            <a
              href="tel:19008866"
              className="inline-flex items-center gap-1.5 text-[var(--theme-secondary,#006d4e)] bg-[var(--theme-secondary-subtle,#f0fdf4)] hover:opacity-90 px-3 py-1.5 rounded-xl border border-[var(--theme-border,#e8e5df)]/60 transition-all font-bold"
            >
              <span className="material-symbols-outlined text-[16px]">support_agent</span>
              <span>1900 8866</span>
            </a>
          </div>
        </div>
      </header>

      {/* Checkout Breadcrumb Bar */}
      <div className="bg-[var(--theme-surface,#ffffff)] border-b border-[var(--theme-border,#e8e5df)] py-4 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-xs text-[var(--theme-text-muted,#49454f)] mb-1">
              <Link
                className="hover:text-[var(--theme-primary,#003B2B)] transition-colors"
                href="/"
              >
                Trang chủ
              </Link>
              <span className="material-symbols-outlined text-[13px] opacity-40">
                chevron_right
              </span>
              <Link
                className="hover:text-[var(--theme-primary,#003B2B)] transition-colors"
                href="/cart"
              >
                Giỏ hàng
              </Link>
              <span className="material-symbols-outlined text-[13px] opacity-40">
                chevron_right
              </span>
              <span className="text-[var(--theme-primary,#003B2B)] font-bold">
                Thanh toán
              </span>
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
                <span className="material-symbols-outlined text-[14px]">
                  check
                </span>
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
                          <span className="material-symbols-outlined text-[16px]">
                            bolt
                          </span>
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
                          <span className="material-symbols-outlined text-[16px]">
                            local_shipping
                          </span>
                        </span>
                        <strong className="text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)] font-bold">
                          GÓI 2: SÁCH GIẤY VẬT LÝ ({physicalItems.length} ấn phẩm)
                        </strong>
                      </div>
                      <span className="text-xs text-[var(--theme-text-muted,#49454f)] font-medium">
                        Giao bưu tá 2-3 ngày
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[var(--theme-border,#e8e5df)]/40">
                      <label
                        onClick={() => setShippingMethod("standard")}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                          shippingMethod === "standard"
                            ? "border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 font-bold"
                            : "border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)]"
                        }`}
                      >
                        <div>
                          <span className="font-bold text-[var(--theme-text,#1c1b1f)] block">
                            Tiêu Chuẩn (2-3 ngày)
                          </span>
                          <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                            Giao bởi GHTK / SPX Express
                          </span>
                        </div>
                        <span className="font-bold text-[var(--theme-primary,#003B2B)]">
                          20.000đ
                        </span>
                      </label>

                      <label
                        onClick={() => setShippingMethod("express")}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                          shippingMethod === "express"
                            ? "border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 font-bold"
                            : "border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)]"
                        }`}
                      >
                        <div>
                          <span className="font-bold text-[var(--theme-text,#1c1b1f)] block">
                            Hỏa Tốc 2 Giờ (Nội thành)
                          </span>
                          <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                            Giao bởi GrabExpress
                          </span>
                        </div>
                        <span className="font-bold text-[var(--theme-primary,#003B2B)]">
                          35.000đ
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Customer & Shipping Address Section */}
            {hasPhysicalItems && (
              <section className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-5 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="font-editorial text-lg font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[var(--theme-primary,#003B2B)] rounded-full"></span>
                    Thông Tin &amp; Địa Chỉ Nhận Hàng
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
                        <span className="material-symbols-outlined text-[15px]">
                          swap_horiz
                        </span>
                        {showAddressList ? "Thu gọn" : "Đổi địa chỉ"}
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
                        {showNewAddressForm ? "close" : "add"}
                      </span>
                      {showNewAddressForm ? "Hủy" : "Thêm địa chỉ mới"}
                    </button>
                  </div>
                </div>

                {/* Inline Address Selection List */}
                {showAddressList && addresses.length > 1 && (
                  <div className="mb-4 p-3 bg-[var(--theme-background,#F2FBF9)]/50 rounded-xl border border-[var(--theme-border,#e8e5df)] space-y-2 animate-in fade-in duration-200">
                    <span className="text-[11px] font-bold text-[var(--theme-text-muted,#49454f)] block">
                      Chọn địa chỉ từ sổ địa chỉ của bạn:
                    </span>
                    {addresses.map((addr: any) => {
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
                              ? "border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 font-bold"
                              : "border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] hover:border-[var(--theme-primary,#003B2B)]/40"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--theme-text-muted,#49454f)] font-medium">
                                Tên khách hàng:
                              </span>
                              <span className="font-bold text-[var(--theme-text,#1c1b1f)]">
                                {addr.name}
                              </span>
                              {addr.isDefault && (
                                <span className="bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] text-[9px] px-1.5 py-0.2 rounded font-bold ml-1">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[var(--theme-text-muted,#49454f)] font-medium">
                                Số điện thoại:
                              </span>{" "}
                              <span className="font-semibold text-[var(--theme-text,#1c1b1f)]">
                                {addr.phone}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                              <span className="font-medium text-[var(--theme-text,#1c1b1f)]">
                                Địa chỉ:
                              </span>{" "}
                              {addr.address}, {addr.ward}, {addr.district},{" "}
                              {addr.province}
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)]">
                            {isSelected
                              ? "check_circle"
                              : "radio_button_unchecked"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty Address Alert State */}
                {!hasValidAddress && !showNewAddressForm && (
                  <div className="p-6 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/40 text-center flex flex-col items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px]">location_off</span>
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[var(--theme-text,#1c1b1f)]">
                        Bạn chưa có địa chỉ nhận hàng
                      </h3>
                      <p className="text-xs text-[var(--theme-text-muted,#49454f)] mt-1 max-w-md">
                        Đơn hàng có chứa sách giấy vật lý cần giao bưu tá tận nơi. Vui lòng nhập địa chỉ nhận hàng trước khi thanh toán.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(true)}
                      className="mt-1 px-5 py-2.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs sm:text-sm font-bold shadow-md hover:opacity-95 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
                      <span>Thêm Địa Chỉ Nhận Hàng Ngay</span>
                    </button>
                  </div>
                )}

                {/* Inline New Address Form */}
                {showNewAddressForm && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <form
                      onSubmit={handleSaveNewAddress}
                      className="p-5 bg-[var(--theme-background,#F2FBF9)]/60 rounded-2xl border-2 border-[var(--theme-primary,#003B2B)]/30 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--theme-border,#e8e5df)]/60 pb-2">
                        <span className="text-xs sm:text-sm font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)]">
                            add_location_alt
                          </span>
                          Thêm địa chỉ nhận sách mới:
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
                              Họ và tên người nhận{" "}
                              <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={addressForm.name}
                              onChange={(e) =>
                                setAddressForm({
                                  ...addressForm,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Ví dụ: Nguyễn Văn An"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] focus:ring-2 focus:ring-[var(--theme-primary,#003B2B)]/10"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
                              Số điện thoại{" "}
                              <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              value={addressForm.phone}
                              onChange={(e) =>
                                setAddressForm({
                                  ...addressForm,
                                  phone: e.target.value,
                                })
                              }
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
                            onChange={({ province, district, ward }: any) =>
                              setAddressForm((prev) => ({
                                ...prev,
                                province,
                                district,
                                ward,
                              }))
                            }
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
                            Số nhà, tên đường chi tiết{" "}
                            <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={addressForm.address}
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                address: e.target.value,
                              })
                            }
                            placeholder="Ví dụ: 12 Nguyễn Văn Bảo"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] focus:ring-2 focus:ring-[var(--theme-primary,#003B2B)]/10"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--theme-border,#e8e5df)]/60">
                          {addresses.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowNewAddressForm(false)}
                              className="px-4 py-2 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                            >
                              Đóng
                            </button>
                          )}
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow-xs"
                          >
                            Lưu &amp; Sử Dụng
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Live Map Preview while typing / selecting */}
                    <div className="w-full">
                      <AddressMapPreview
                        province={addressForm.province}
                        district={addressForm.district}
                        ward={addressForm.ward}
                        address={addressForm.address}
                        minHeight="min-h-[380px]"
                      />
                    </div>
                  </div>
                )}

                {/* Current Active Address Card & Enlarged Map Preview */}
                {hasValidAddress && !showNewAddressForm && (
                  <div className="space-y-4">
                    <div className="p-5 sm:p-6 bg-[var(--theme-background,#F2FBF9)]/60 rounded-2xl border border-[var(--theme-border,#e8e5df)] text-sm text-[var(--theme-text,#1c1b1f)] flex flex-col gap-3.5 sm:gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--theme-text-muted,#49454f)] text-xs sm:text-sm font-medium min-w-[115px]">
                          Tên khách hàng:
                        </span>
                        <strong className="font-bold text-sm sm:text-base text-[var(--theme-text,#1c1b1f)]">
                          {activeAddress.name}
                        </strong>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[var(--theme-text-muted,#49454f)] text-xs sm:text-sm font-medium min-w-[115px]">
                          Số điện thoại:
                        </span>
                        <span className="font-semibold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)]">
                          ({activeAddress.phone})
                        </span>
                      </div>

                      <div className="flex items-start gap-3 pt-3 border-t border-[var(--theme-border,#e8e5df)]/60">
                        <span className="text-[var(--theme-text-muted,#49454f)] text-xs sm:text-sm font-medium min-w-[115px] flex items-center gap-1.5 shrink-0 pt-0.5">
                          <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)]">
                            location_on
                          </span>
                          Địa chỉ:
                        </span>
                        <span className="text-[var(--theme-text,#1c1b1f)] text-xs sm:text-sm leading-relaxed font-medium">
                          {activeAddress.address}, {activeAddress.ward},{" "}
                          {activeAddress.district}, {activeAddress.province}
                        </span>
                      </div>
                    </div>

                    {/* Large Live Interactive Map for active destination */}
                    <div className="w-full">
                      <AddressMapPreview
                        province={activeAddress.province}
                        district={activeAddress.district}
                        ward={activeAddress.ward}
                        address={activeAddress.address}
                        minHeight="min-h-[420px]"
                      />
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
                {/* PayOS VietQR (Active Online Payment) */}
                <label
                  onClick={() => setPaymentMethod("ONLINE_PAYMENT")}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    paymentMethod === "ONLINE_PAYMENT"
                      ? "border-2 border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 shadow-xs"
                      : "border-[var(--theme-border,#e8e5df)] bg-[var(--theme-background,#F2FBF9)]/40 hover:border-[var(--theme-primary,#003B2B)]/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center text-xs shadow-2xs">
                      <span className="material-symbols-outlined text-[18px]">
                        qr_code_2
                      </span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)]">
                          Thanh toán trực tuyến PayOS (VietQR)
                        </span>
                        <span className="bg-teal-500/15 text-teal-800 dark:text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/20">
                          Tức thì 24/7 · Giữ kho 2 phút
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                        Quét mã QR qua tất cả App Ngân hàng hoặc Ví điện tử (Tự động xác nhận)
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentMethod === "ONLINE_PAYMENT"}
                    onChange={() => setPaymentMethod("ONLINE_PAYMENT")}
                    className="w-4 h-4 text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] border-[var(--theme-border,#e8e5df)] cursor-pointer"
                  />
                </label>

                {/* COD (Active) */}
                <label
                  onClick={() => setPaymentMethod("COD")}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    paymentMethod === "COD"
                      ? "border-2 border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 shadow-xs"
                      : "border-[var(--theme-border,#e8e5df)] bg-[var(--theme-background,#F2FBF9)]/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xs shadow-2xs">
                      <span className="material-symbols-outlined text-[18px]">
                        payments
                      </span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)]">
                          Thanh toán khi nhận hàng (COD)
                        </span>
                        <span className="bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20">
                          Tiền mặt
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
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
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
                    <input
                      type="radio"
                      name="pay"
                      disabled
                      className="w-4 h-4 text-primary opacity-40"
                    />
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
                    <input
                      type="radio"
                      name="pay"
                      disabled
                      className="w-4 h-4 text-primary opacity-40"
                    />
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
                    <input
                      type="radio"
                      name="pay"
                      disabled
                      className="w-4 h-4 text-primary opacity-40"
                    />
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
                <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                  Gửi qua Email
                </span>
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
                {checkedItems.map((item: any) => (
                  <Link
                    key={item.id}
                    href={`/book/${item.bookId || item.id}`}
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
                          x{item.quantity} · {item.format}
                        </span>
                        {serverUnitPrices.get(item.bookId)?.isFlashSale && (
                          <span className="ml-1.5 text-[10px] font-bold text-rose-600">
                            ⚡ Flash Sale
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-[var(--theme-text,#1c1b1f)] shrink-0">
                      {(
                        (serverUnitPrices.get(item.bookId)?.unitPrice ||
                          item.price) * item.quantity
                      ).toLocaleString("vi-VN")}
                      đ
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
                    <span className="material-symbols-outlined text-amber-600 text-[20px]">
                      confirmation_number
                    </span>
                    <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                      HUKI Voucher
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {appliedPlatformVoucher ? (
                      <span className="font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full text-[11px]">
                        -{appliedPlatformVoucher?.discount?.toLocaleString("vi-VN")}đ
                      </span>
                    ) : (
                      <span className="text-[var(--theme-text-muted,#49454f)] text-[11px] font-medium flex items-center gap-0.5">
                        Chọn hoặc nhập mã{" "}
                        <span className="material-symbols-outlined text-[14px]">
                          chevron_right
                        </span>
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
                          setVoucherError("");
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] text-xs uppercase font-bold focus:outline-none focus:border-[var(--theme-primary,#003B2B)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPlatformVoucher({ code: voucherCodeInput })}
                        className="px-3 py-1.5 rounded-lg bg-[var(--theme-primary,#003B2B)] text-white text-xs font-bold hover:opacity-90 cursor-pointer"
                      >
                        Áp Dụng
                      </button>
                    </div>

                    {voucherError && (
                      <p className="text-red-500 text-[11px] font-medium">
                        {voucherError}
                      </p>
                    )}

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--theme-text-muted,#49454f)] block">
                        Mã khuyến mãi có sẵn:
                      </span>
                      {availableVouchers.platform.length > 0 ? (
                        availableVouchers.platform.map((v: any) => {
                          const isSelected = appliedPlatformVoucher?.code === v.code;
                          const isEligible = rawSubtotal >= (v.minOrderAmount || 0);
                          return (
                            <div
                              key={v.code}
                              onClick={() => isEligible && handleApplyPlatformVoucher(v)}
                              className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                isSelected
                                  ? "border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 font-bold"
                                  : isEligible
                                    ? "border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003B2B)]/50 bg-[var(--theme-surface,#ffffff)]"
                                    : "opacity-40 cursor-not-allowed bg-black/5"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-[var(--theme-primary,#003B2B)]">
                                    {v.code}
                                  </span>
                                  <span className="text-[10px] text-[var(--theme-text-muted,#49454f)] font-medium">
                                    ({v.type === "PERCENTAGE" ? `Giảm ${v.value}%` : `Giảm ${v.value?.toLocaleString("vi-VN")}đ`})
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-600">
                                {isSelected ? "Đang dùng" : "Dùng ngay"}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-[var(--theme-text-muted,#49454f)] italic">
                          Không có voucher nào khả dụng
                        </p>
                      )}

                      {/* Shipping/Freeship Vouchers */}
                      {availableVouchers.shipping?.length > 0 && (
                        <>
                          <span className="text-[11px] font-bold text-[var(--theme-text-muted,#49454f)] block mt-2">
                            Freeship:
                          </span>
                          {availableVouchers.shipping.map((v: any) => {
                            const isSelected = appliedShippingVoucher?.code === v.code;
                            return (
                              <div
                                key={v.code}
                                onClick={() => handleApplyShippingVoucher(v)}
                                className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 font-bold"
                                    : "border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003B2B)]/50 bg-[var(--theme-surface,#ffffff)]"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-[var(--theme-primary,#003B2B)]">
                                      {v.code}
                                    </span>
                                    <span className="text-[10px] text-[var(--theme-text-muted,#49454f)] font-medium">
                                      Miễn phí vận chuyển
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[11px] font-bold text-emerald-600">
                                  {isSelected ? "Đang dùng" : "Dùng ngay"}
                                </span>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>

                    {appliedPlatformVoucher && (
                      <button
                        type="button"
                        onClick={handleRemovePlatformVoucher}
                        className="w-full text-center text-red-500 text-[11px] font-semibold hover:underline cursor-pointer pt-1"
                      >
                        Hủy áp dụng mã giảm giá
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Price Breakdown - Uses backend-calculated values */}
              <div className="pt-3 border-t border-[var(--theme-border,#e8e5df)]/60 space-y-2 text-xs text-[var(--theme-text-muted,#49454f)]">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-semibold text-[var(--theme-text,#1c1b1f)]">
                    {(checkoutPreview?.itemSubtotal ?? rawSubtotal).toLocaleString("vi-VN")}đ
                  </span>
                </div>
                {(checkoutPreview?.storeDiscountTotal > 0 || checkoutPreview?.platformDiscountTotal > 0) && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <span>Giảm giá voucher:</span>
                      {appliedPlatformVoucher && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 px-1 rounded font-bold">
                          {appliedPlatformVoucher.code}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">
                      -{((checkoutPreview?.storeDiscountTotal ?? 0) + (checkoutPreview?.platformDiscountTotal ?? 0)).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-[var(--theme-text,#1c1b1f)]">
                    {(checkoutPreview?.shippingDiscountTotal ?? 0) > 0 ? (
                      <>
                        <span className="line-through opacity-50 mr-1">
                          {(checkoutPreview?.shippingTotal ?? shippingFee).toLocaleString("vi-VN")}đ
                        </span>
                        <span className="text-emerald-600 font-bold">
                          {Math.max(0, (checkoutPreview?.shippingTotal ?? shippingFee) - (checkoutPreview?.shippingDiscountTotal ?? 0)).toLocaleString("vi-VN")}đ
                        </span>
                      </>
                    ) : (
                      checkoutPreview?.shippingTotal === 0 && hasPhysicalItems ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          MIỄN PHÍ
                        </span>
                      ) : (
                        `${(checkoutPreview?.shippingTotal ?? shippingFee).toLocaleString("vi-VN")}đ`
                      )
                    )}
                  </span>
                </div>
                {appliedShippingVoucher && checkoutPreview?.shippingDiscountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <span>Freeship:</span>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 px-1 rounded font-bold">
                        {appliedShippingVoucher.code}
                      </span>
                    </span>
                    <span className="font-semibold">
                      -{checkoutPreview?.shippingDiscountTotal?.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                )}
              </div>

              {/* Total & Submit Button */}
              <div className="pt-3 border-t border-[var(--theme-border,#e8e5df)]/60 flex items-baseline justify-between">
                <span className="font-bold text-sm text-[var(--theme-text,#1c1b1f)]">
                  Tổng cộng:
                </span>
                <span className="text-2xl font-black text-[var(--theme-primary,#003B2B)]">
                  {(checkoutPreview?.grandTotal ?? grandTotal).toLocaleString("vi-VN")}đ
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
                    <span className="material-symbols-outlined text-[20px]">
                      lock
                    </span>
                    Hoàn Tất Đặt Hàng ({checkedItems.length})
                  </>
                )}
              </button>

              <p className="text-[11px] text-[var(--theme-text-muted,#49454f)] text-center leading-relaxed">
                Nhấn &quot;Hoàn Tất Đặt Hàng&quot; đồng nghĩa bạn đồng ý với{" "}
                <Link
                  href="/"
                  className="text-[var(--theme-primary,#003B2B)] underline"
                >
                  Điều khoản sàn TMĐT HUKI
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Distraction-Free Minimalist Trust Footer */}
      <footer className="bg-[var(--theme-surface,#ffffff)] border-t border-[var(--theme-border,#e8e5df)] py-6 px-4 text-xs text-[var(--theme-text-muted,#49454f)] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 font-medium text-[var(--theme-text,#1c1b1f)]">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[var(--theme-secondary,#006d4e)] text-[18px]">verified_user</span>
              Bảo mật PCI-DSS Level 1
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[var(--theme-secondary,#006d4e)] text-[18px]">auto_stories</span>
              Bản quyền tác giả 100%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[var(--theme-secondary,#006d4e)] text-[18px]">cached</span>
              Đổi trả sách in 7 ngày
            </span>
          </div>

          <div className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
            © 2026 HUKI Ebook Platform. Mọi quyền được bảo lưu.
          </div>
        </div>
      </footer>

      {/* Payment Countdown Modal for PayOS */}
      <PaymentCountdownModal
        isOpen={showPaymentModal}
        onClose={() => {
          clearCart();
          setShowPaymentModal(false);
          if (currentOrderId && !String(currentOrderId).startsWith("ord-")) {
            router.push(`/orders/${currentOrderId}`);
          }
        }}
        orderId={currentOrderId || undefined}
        orderCode={currentOrderCode || undefined}
        grandTotal={currentOrderGrandTotal}
        paymentData={activePaymentData}
        onSuccess={(completedOrder: any) => {
          clearCart();
          setShowPaymentModal(false);
          router.push(
            `/order-success?orderId=${completedOrder.id}&code=${completedOrder.code}&paymentMethod=ONLINE_PAYMENT`
          );
        }}
      />
    </div>
  );
}
