import type { PlatformGmvResponse } from '../api/analyticsApi';

/**
 * Helper to escape CSV cell content
 */
function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports platform GMV analytics data to a structured CSV file
 */
export function exportGmvAnalyticsToCsv(
  data: PlatformGmvResponse,
  filename: string = `huki-gmv-report-${new Date().toISOString().split('T')[0]}.csv`
): void {
  if (typeof window === 'undefined') return;

  const lines: string[] = [];

  // 1. Report Header
  lines.push(['BÁO CÁO TỔNG QUAN GMV HUKI EBOOK'].map(escapeCsvCell).join(','));
  lines.push(['Thời gian xuất báo cáo', new Date().toLocaleString('vi-VN')].map(escapeCsvCell).join(','));
  lines.push(['Khoảng thời gian', `${data.from || 'Khởi tạo'} đến ${data.to || 'Hiện tại'}`].map(escapeCsvCell).join(','));
  lines.push(['Phân độ thời gian (Interval)', data.interval].map(escapeCsvCell).join(','));
  lines.push('');

  // 2. Platform Executive Summary
  lines.push(['CHỈ SỐ TỔNG QUAN TOÀN SÀN'].map(escapeCsvCell).join(','));
  lines.push(['Chỉ số', 'Giá trị'].map(escapeCsvCell).join(','));
  lines.push(['Tổng GMV (VND)', data.totalGmv].map(escapeCsvCell).join(','));
  lines.push(['Tổng đơn hàng hoàn tất', data.completedOrders].map(escapeCsvCell).join(','));
  const aov = data.completedOrders > 0 ? (Number(data.totalGmv) / data.completedOrders).toFixed(2) : '0.00';
  lines.push(['Giá trị trung bình đơn (AOV)', aov].map(escapeCsvCell).join(','));
  lines.push('');

  // 3. Timeline Breakdown
  lines.push(['DIỄN BIẾN GMV THEO THỜI GIAN'].map(escapeCsvCell).join(','));
  lines.push(['Mốc thời gian (Period)', 'GMV (VND)', 'Số đơn hàng hoàn tất'].map(escapeCsvCell).join(','));
  if (data.timeline && data.timeline.length > 0) {
    for (const row of data.timeline) {
      lines.push([row.period, row.gmv, row.orders].map(escapeCsvCell).join(','));
    }
  } else {
    lines.push(['Không có dữ liệu trong khoảng thời gian này', '0.00', '0'].map(escapeCsvCell).join(','));
  }
  lines.push('');

  // 4. Store Distribution
  lines.push(['PHÂN BỔ GMV THEO GIAN HÀNG (STORE BREAKDOWN)'].map(escapeCsvCell).join(','));
  lines.push(['Hạng (Rank)', 'Mã Gian Hàng (Store ID)', 'GMV (VND)', 'Tỷ trọng (%)'].map(escapeCsvCell).join(','));
  if (data.byStore && data.byStore.length > 0) {
    const totalNum = Number(data.totalGmv) || 0;
    data.byStore.forEach((st, idx) => {
      const share = totalNum > 0 ? ((Number(st.gmv) / totalNum) * 100).toFixed(2) : '0.00';
      lines.push([`#${idx + 1}`, st.storeId, st.gmv, `${share}%`].map(escapeCsvCell).join(','));
    });
  } else {
    lines.push(['-', 'Không có gian hàng phát sinh GMV', '0.00', '0%'].map(escapeCsvCell).join(','));
  }

  // BOM for Excel UTF-8 display compatibility
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
