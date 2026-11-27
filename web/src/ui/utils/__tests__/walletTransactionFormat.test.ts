import { describe, it, expect } from 'vitest';
import {
  getWalletTransactionMeta,
  formatWalletTransactionDescription,
} from '../walletTransactionFormat';

describe('walletTransactionFormat (BUG-32)', () => {
  it('maps transaction types to clear Shopee-standard Vietnamese labels and affectsAvailable flag', () => {
    const creditAvail = getWalletTransactionMeta('CREDIT_AVAILABLE');
    expect(creditAvail.label).toBe('+ Cộng doanh thu');
    expect(creditAvail.affectsAvailable).toBe(true);
    expect(creditAvail.sign).toBe('+');

    const release = getWalletTransactionMeta('MOVE_PENDING_TO_AVAILABLE');
    expect(release.label).toBe('+ Giải ngân vào ví');
    expect(release.affectsAvailable).toBe(true);
    expect(release.sign).toBe('+');

    const pending = getWalletTransactionMeta('CREDIT_PENDING');
    expect(pending.label).toBe('Tạm giữ ký quỹ');
    expect(pending.affectsAvailable).toBe(false);
    expect(pending.sign).toBe('');

    const debit = getWalletTransactionMeta('DEBIT_AVAILABLE');
    expect(debit.label).toBe('- Rút tiền về STK');
    expect(debit.affectsAvailable).toBe(true);
    expect(debit.isPositive).toBe(false);

    const frozen = getWalletTransactionMeta('MOVE_AVAILABLE_TO_FROZEN');
    expect(frozen.label).toBe('Phong tỏa khiếu nại');
    expect(frozen.affectsAvailable).toBe(true);
    expect(frozen.isPositive).toBe(false);
  });

  it('normalizes legacy English descriptions and 2-minute escrow text into Vietnamese 3-minute text', () => {
    expect(
      formatWalletTransactionDescription(
        'Pending revenue credited from sub-order ORD-MWXEYP1K-63E05600-S1',
      ),
    ).toBe(
      'Tạm giữ doanh thu đơn #ORD-MWXEYP1K-63E05600-S1 vào ký quỹ Escrow (Chờ hạn đổi trả 3 phút)',
    );

    expect(
      formatWalletTransactionDescription(
        'Escrow released net proceeds for sub-order ORD-MWXAFD9G-7FAF7FB5-S1',
      ),
    ).toBe(
      'Giải ngân doanh thu thực nhận đơn #ORD-MWXAFD9G-7FAF7FB5-S1 vào ví khả dụng',
    );

    expect(
      formatWalletTransactionDescription(
        'Tạm giữ doanh thu bán sách [Nhà Giả Kim] - Đơn hàng #ORD-123 (Chờ hạn đổi trả 2 phút)',
      ),
    ).toBe(
      'Tạm giữ doanh thu bán sách [Nhà Giả Kim] - Đơn hàng #ORD-123 (Chờ hạn đổi trả 3 phút)',
    );

    expect(
      formatWalletTransactionDescription('Rút tiền về ngân hàng', { orderCode: 'PO-999' }),
    ).toBe('Rút tiền về ngân hàng (#PO-999)');
  });
});
