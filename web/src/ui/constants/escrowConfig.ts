/**
 * HUKI EBOOK - Cấu hình thời gian ký quỹ và bảo chứng đổi trả (Escrow Window Config)
 *
 * Bằng cách tập trung vào cấu hình này, khi nào bạn muốn chuyển từ 2 phút sang 7 ngày
 * chỉ cần đổi 2 dòng dưới đây (HOLD_DURATION_SECONDS và DURATION_LABEL) là toàn bộ
 * hệ thống sẽ tự động cập nhật đồng bộ!
 */
export const ESCROW_CONFIG = {
  /** Thời gian đếm ngược (giây): 120 = 2 phút | 7 * 86400 = 7 ngày */
  HOLD_DURATION_SECONDS: 120,

  /** Nhãn hiển thị trên thẻ, tab và thông báo: '2 phút' (hoặc '7 ngày') */
  DURATION_LABEL: '2 phút',

  /** Tiêu đề chính sách */
  POLICY_TITLE: 'Bảo chứng an toàn đổi trả',
};

export type EscrowConfig = typeof ESCROW_CONFIG;
