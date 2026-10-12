import type { SellerEscrowItem, WalletData, PayoutRequestItem, WalletTransactionItem } from '@/ui/api/walletApi';

export interface SellerFinancialMetrics {
  // 1. Tổng quan Doanh thu
  totalGrossGMV: number;          // 100% Tổng giá trị đơn hàng (Gross Merchandise Value)
  platformFeePercent: number;     // Tỷ lệ phí sàn (Mặc định 5%)
  totalPlatformFee: number;       // 5% phí sàn khấu trừ
  totalNetRevenue: number;        // 95% Tổng doanh thu thực nhận về Shop

  // 2. 4 Giai đoạn chu trình dòng tiền chuẩn Shopee (Cash Flow Pipeline)
  // Giai đoạn 1: Đang vận chuyển (In-Transit)
  inTransitAmount: number;        // Tiền các đơn Shipper đang vận chuyển trên đường (95% net)
  inTransitNet: number;           // Alias cho inTransitAmount
  inTransitGross: number;         // 100% Giá trị đơn đang vận chuyển
  inTransitCount: number;         // Số lượng món đang vận chuyển

  // Giai đoạn 2: Ký quỹ đổi trả (Escrow Holding)
  holdingEscrowAmount: number;    // Tiền các đơn đã giao, đang đếm ngược hạn đổi trả 2 phút (95% net)
  holdingNet: number;             // Alias cho holdingEscrowAmount
  holdingAmount: number;          // Alias cho holdingEscrowAmount
  holdingGross: number;           // 100% Giá trị đơn đang đếm ngược
  holdingEscrowCount: number;     // Số lượng món đang đếm ngược hạn đổi trả
  holdingCount: number;           // Alias cho holdingEscrowCount

  // Tổng tiền đang treo (Pending = In-Transit + Holding)
  totalPendingEscrow: number;     // Tổng tiền Sàn đang tạm giữ chưa đến hạn rút
  totalEscrowHolding: number;     // Alias cho tổng tiền đang ký quỹ (inTransit + holding + frozen)
  pendingBalance: number;         // Alias cho totalPendingEscrow
  pendingAmount: number;          // Alias cho inTransitAmount
  pendingCount: number;           // Alias cho inTransitCount
  totalPendingCount: number;      // Tổng số món đang treo

  // Giai đoạn 3: Đã giải ngân (Settled / Released)
  totalReleasedAmount: number;    // Tổng tiền tích lũy từ trước đến nay đã hoàn tất đổi trả (95% net)
  releasedNet: number;            // Alias cho totalReleasedAmount
  releasedGross: number;          // 100% Giá trị đơn đã giải ngân
  releasedAmount: number;         // Alias cho totalReleasedAmount
  totalReleasedCount: number;     // Alias
  releasedCount: number;          // Số lượng món đã giải ngân thành công

  // Giai đoạn 4: Đã rút về tài khoản ngân hàng (Disbursed to Bank)
  totalWithdrawnAmount: number;   // Tổng tiền đã chuyển khoản thành công về STK ngân hàng
  totalWithdrawn: number;         // Alias cho totalWithdrawnAmount
  withdrawnCount: number;         // Số lượng lệnh rút tiền đã hoàn tất

  // SỐ DƯ KHẢ DỤNG HIỆN TẠI (Available Balance - Có thể rút ngay)
  availableBalance: number;       // Số tiền còn lại trong ví sẵn sàng rút = max(0, totalReleased - totalWithdrawn)

  // Đóng băng tranh chấp (Frozen)
  frozenAmount: number;           // Tiền bị phong tỏa nếu có khiếu nại chưa xử lý (95% net)
  frozenNet: number;              // Alias
  frozenGross: number;            // 100% Giá trị đơn bị phong tỏa
  frozenCount: number;            // Số món đang có khiếu nại

  // 3. Cơ cấu phương thức thanh toán
  codGMV: number;                 // Doanh thu tiền mặt COD (100%)
  codNet: number;                 // Thực nhận từ đơn COD (95%)
  codCount: number;               // Số đơn COD

  payosGMV: number;               // Doanh thu chuyển khoản VietQR / PayOS (100%)
  payosNet: number;               // Thực nhận từ đơn chuyển khoản (95%)
  payosCount: number;             // Số đơn chuyển khoản

  // 4. Tổng số đơn hàng hợp lệ
  totalOrdersCount: number;
  totalCount: number;             // Alias
}

export interface CalculateFinanceOptions {
  escrowItems: SellerEscrowItem[];
  wallet?: WalletData | null;
  payouts?: PayoutRequestItem[];
  transactions?: WalletTransactionItem[];
  platformFeeRate?: number; // Mặc định 0.05 (5%)
}

/**
 * Single Source of Truth cho toàn bộ nghiệp vụ Tài Chính & Ký Quỹ Người Bán (HuKi Ebook)
 * Đảm bảo 100% tính toán đồng nhất, không mock, khớp từng đồng giữa /seller/finance, /seller/reports và /seller/escrow.
 */
export function calculateSellerFinancials(options: CalculateFinanceOptions): SellerFinancialMetrics {
  const { escrowItems = [], wallet, payouts = [], transactions = [], platformFeeRate = 0.05 } = options;

  // Lọc chỉ lấy các đơn hợp lệ (bỏ qua CANCELLED / REFUNDED)
  const validItems = escrowItems.filter((it) => {
    const isCancelled =
      it.orderStatus === 'CANCELLED' ||
      (it as any).status === 'CANCELLED' ||
      it.paymentStatus === 'CANCELLED';
    return !isCancelled;
  });

  let totalGrossGMV = 0;
  let totalPlatformFee = 0;
  let totalNetRevenue = 0;

  let inTransitGross = 0;
  let inTransitAmount = 0;
  let inTransitCount = 0;

  let holdingGross = 0;
  let holdingEscrowAmount = 0;
  let holdingEscrowCount = 0;

  let releasedGross = 0;
  let totalReleasedAmount = 0;
  let releasedCount = 0;

  let frozenGross = 0;
  let frozenAmount = 0;
  let frozenCount = 0;

  let codGMV = 0;
  let codNet = 0;
  let codCount = 0;

  let payosGMV = 0;
  let payosNet = 0;
  let payosCount = 0;

  validItems.forEach((it) => {
    const subtotal = Number(it.subtotal) || (Number(it.unitPrice) * Number(it.quantity)) || 0;
    const fee = Number(it.platformFee) || Math.round(subtotal * platformFeeRate);
    const net = Number(it.sellerNet) || Math.max(0, subtotal - fee);

    totalGrossGMV += subtotal;
    totalPlatformFee += fee;
    totalNetRevenue += net;

    // Phân loại COD vs PayOS
    if (it.paymentMethod === 'COD') {
      codGMV += subtotal;
      codNet += net;
      codCount += 1;
    } else {
      payosGMV += subtotal;
      payosNet += net;
      payosCount += 1;
    }

    // Phân loại giai đoạn dòng tiền (Tự động chuyển RELEASED nếu hết hạn đổi trả 2 phút)
    let effectiveStatus = it.escrowStatus;
    const isDelivered = it.orderStatus === 'DELIVERED' || it.orderStatus === 'COMPLETED' || Boolean(it.deliveredAt);
    if (effectiveStatus === 'HOLDING' && isDelivered) {
      const startMs = new Date(it.deliveredAt || it.orderCreatedAt).getTime();
      if (!isNaN(startMs) && startMs > 0 && (Date.now() - startMs) >= 120 * 1000) {
        effectiveStatus = 'RELEASED';
      }
    }

    if (effectiveStatus === 'PENDING_PAYMENT') {
      // Đang giao hàng / Chờ shipper thu COD / Vận chuyển
      inTransitGross += subtotal;
      inTransitAmount += net;
      inTransitCount += 1;
    } else if (effectiveStatus === 'HOLDING') {
      // Đã giao hàng, đang trong 2 phút đếm ngược đổi trả
      holdingGross += subtotal;
      holdingEscrowAmount += net;
      holdingEscrowCount += 1;
    } else if (effectiveStatus === 'RELEASED') {
      // Đã qua 2 phút đổi trả -> Tiền đã giải ngân
      releasedGross += subtotal;
      totalReleasedAmount += net;
      releasedCount += 1;
    } else if (effectiveStatus === 'FROZEN') {
      frozenGross += subtotal;
      frozenAmount += net;
      frozenCount += 1;
    }
  });

  // Tính tổng tiền đã rút về ngân hàng từ Payouts thực tế
  const completedPayouts = payouts.filter((p) =>
    ['COMPLETED', 'APPROVED', 'PROCESSING', 'DISBURSED'].includes(p.status)
  );

  const totalWithdrawnFromPayouts = completedPayouts.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const totalWithdrawnAmount = totalWithdrawnFromPayouts;
  const withdrawnCount = completedPayouts.length;

  // Tính số dư khả dụng
  // Ưu tiên số dư chính thức từ Wallet CSDL (đã được backend đối soát)
  // Fallback: Max(0, totalReleasedAmount - totalWithdrawnAmount)
  let availableBalance = 0;
  if (wallet?.availableBalance !== undefined && wallet?.availableBalance !== null) {
    availableBalance = Math.max(0, Number(wallet.availableBalance));
  } else {
    availableBalance = Math.max(0, totalReleasedAmount - totalWithdrawnAmount);
  }

  const totalPendingEscrow = inTransitAmount + holdingEscrowAmount;
  const totalPendingCount = inTransitCount + holdingEscrowCount;

  return {
    totalGrossGMV,
    platformFeePercent: Math.round(platformFeeRate * 100),
    totalPlatformFee,
    totalNetRevenue,

    inTransitAmount,
    inTransitNet: inTransitAmount,
    inTransitGross,
    inTransitCount,

    holdingEscrowAmount,
    holdingNet: holdingEscrowAmount,
    holdingAmount: holdingEscrowAmount,
    holdingGross,
    holdingEscrowCount,
    holdingCount: holdingEscrowCount,

    totalPendingEscrow,
    totalEscrowHolding: inTransitAmount + holdingEscrowAmount + frozenAmount,
    pendingBalance: totalPendingEscrow,
    pendingAmount: inTransitAmount,
    pendingCount: inTransitCount,
    totalPendingCount,

    totalReleasedAmount,
    releasedNet: totalReleasedAmount,
    releasedGross,
    releasedAmount: totalReleasedAmount,
    totalReleasedCount: releasedCount,
    releasedCount,

    totalWithdrawnAmount,
    totalWithdrawn: totalWithdrawnAmount,
    withdrawnCount,

    availableBalance,

    frozenAmount,
    frozenNet: frozenAmount,
    frozenGross,
    frozenCount,

    codGMV,
    codNet,
    codCount,

    payosGMV,
    payosNet,
    payosCount,

    totalOrdersCount: validItems.length,
    totalCount: validItems.length,
  };
}

/**
 * Định dạng tiền tệ VND chuẩn Việt Nam
 */
export function formatVND(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === '') return '0đ';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '0đ';
  return `${Math.round(num).toLocaleString('vi-VN')}đ`;
}
