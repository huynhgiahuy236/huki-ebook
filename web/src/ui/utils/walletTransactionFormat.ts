import { ESCROW_CONFIG } from '@/ui/constants/escrowConfig';

export interface WalletTxDisplayMeta {
  label: string;
  badgeClass: string;
  icon: string;
  sign: '+' | '-' | '';
  isPositive: boolean;
  affectsAvailable: boolean;
}

export function getWalletTransactionMeta(type: string): WalletTxDisplayMeta {
  switch (type) {
    case 'CREDIT_AVAILABLE':
      return {
        label: '+ Cộng doanh thu',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: 'add_circle',
        sign: '+',
        isPositive: true,
        affectsAvailable: true,
      };
    case 'MOVE_PENDING_TO_AVAILABLE':
      return {
        label: '+ Giải ngân vào ví',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: 'check_circle',
        sign: '+',
        isPositive: true,
        affectsAvailable: true,
      };
    case 'CREDIT_PENDING':
      return {
        label: 'Tạm giữ ký quỹ',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: 'hourglass_top',
        sign: '',
        isPositive: true,
        affectsAvailable: false,
      };
    case 'DEBIT_AVAILABLE':
      return {
        label: '- Rút tiền về STK',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: 'arrow_upward',
        sign: '-',
        isPositive: false,
        affectsAvailable: true,
      };
    case 'MOVE_AVAILABLE_TO_FROZEN':
      return {
        label: 'Phong tỏa khiếu nại',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: 'lock',
        sign: '-',
        isPositive: false,
        affectsAvailable: true,
      };
    case 'MOVE_FROZEN_TO_AVAILABLE':
      return {
        label: '+ Mở khóa khiếu nại',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: 'lock_open',
        sign: '+',
        isPositive: true,
        affectsAvailable: true,
      };
    case 'MOVE_FROZEN_TO_PENDING':
      return {
        label: 'Chuyển về ký quỹ',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: 'sync',
        sign: '',
        isPositive: true,
        affectsAvailable: false,
      };
    default:
      return {
        label: type || 'Biến động ví',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        icon: 'receipt',
        sign: '',
        isPositive: true,
        affectsAvailable: false,
      };
  }
}

export function formatWalletTransactionDescription(
  description?: string | null,
  metadata?: any,
): string {
  const raw = String(description || '').trim();
  if (!raw) return 'Giao dịch hệ thống';

  const pendingMatch = raw.match(/^Pending revenue credited from sub-order\s+(.+)$/i);
  if (pendingMatch) {
    return `Tạm giữ doanh thu đơn #${pendingMatch[1].trim()} vào ký quỹ Escrow (Chờ hạn đổi trả ${ESCROW_CONFIG.DURATION_LABEL})`;
  }

  const releasedMatch = raw.match(/^Escrow released net proceeds for sub-order\s+(.+)$/i);
  if (releasedMatch) {
    return `Giải ngân doanh thu thực nhận đơn #${releasedMatch[1].trim()} vào ví khả dụng`;
  }

  if (raw.includes('Chờ hạn đổi trả 2 phút')) {
    return raw.replace('Chờ hạn đổi trả 2 phút', `Chờ hạn đổi trả ${ESCROW_CONFIG.DURATION_LABEL}`);
  }

  if (metadata?.orderCode && !raw.includes(String(metadata.orderCode))) {
    return `${raw} (#${metadata.orderCode})`;
  }

  return raw;
}
