/**
 * Book Moderation & User Reporting Service
 * Quản lý vòng đời kiểm duyệt sách hậu kiểm (Post-moderation) dựa trên Báo cáo từ cộng đồng Độc giả.
 * - Độc giả báo cáo sách vi phạm (Bản quyền lậu, Đồi trụy/Bạo lực, Giấy phép sai lệch, Sách giả, Giá ảo/Spam).
 * - Realtime push sự kiện 'BOOK_REPORTED' qua realtimeSyncBus tới Admin Portal.
 * - Admin xem xét hồ sơ bằng chứng: Khóa / Chặn sách (ẩn khỏi sàn) + Bắn thông báo trực tiếp đến Shop.
 * - Admin có thể bác bỏ báo cáo (xác nhận sách hợp lệ) hoặc mở khóa lại sách sau khi shop giải trình.
 */

import { realtimeSyncBus } from './realtimeSyncBus';
import { adminNotificationService } from './adminNotificationService';
import { catalogApi } from '../api/catalogApi';
import { moderationApi } from '../api/moderationApi';

export type BookReportReason =
  | 'COPYRIGHT'       // Vi phạm bản quyền / Sách lậu / Chưa cấp phép
  | 'INAPPROPRIATE'   // Nội dung đồi trụy / Phản cảm / Bạo lực
  | 'FAKE_BOOK'       // Sách giả / In ấn sai lệch / Thông tin NXB giả
  | 'MISINFORMATION'  // Thông tin sai lệch / Xuyên tạc lịch sử
  | 'SCAM_PRICE'      // Lừa đảo / Giá ảo / Sai định dạng (ghi giấy giao pdf)
  | 'OTHER';          // Lý do khác

export const BOOK_REPORT_REASON_LABELS: Record<BookReportReason, { label: string; desc: string; color: string }> = {
  COPYRIGHT: {
    label: 'Bản quyền & Sách lậu',
    desc: 'Tác phẩm chưa được chuyển nhượng bản quyền, scan lậu hoặc sao chép trái phép.',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  INAPPROPRIATE: {
    label: 'Nội dung phản cảm / Đồi trụy',
    desc: 'Chứa nội dung khiêu dâm, bạo lực cực đoan hoặc kích động hành vi nguy hiểm.',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  FAKE_BOOK: {
    label: 'Sách giả / Sai giấy phép NXB',
    desc: 'In ấn kém chất lượng, số Quyết định xuất bản / ISBN giả mạo hoặc sai sự thật.',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  MISINFORMATION: {
    label: 'Thông tin sai lệch / Xuyên tạc',
    desc: 'Nội dung xuyên tạc lịch sử, thông tin y tế sai lệch hoặc gây tổn hại công cộng.',
    color: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  SCAM_PRICE: {
    label: 'Lừa đảo / Gian lận mô tả',
    desc: 'Giá ảo bất thường, bán combo sách in nhưng chỉ gửi bản photocopy hoặc ebook lậu.',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  OTHER: {
    label: 'Lý do vi phạm khác',
    desc: 'Các hành vi vi phạm tiêu chuẩn cộng đồng hoặc pháp luật khác.',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export type BookModerationStatus = 'PENDING_REVIEW' | 'BLOCKED' | 'DISMISSED';

export interface SingleBookReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  reason: BookReportReason;
  description: string;
  evidenceUrl?: string;
  createdAt: string;
}

export interface ReportedBook {
  bookId: string;
  title: string;
  author: string;
  publisher: string;
  cover: string;
  isbn: string;
  format: string;
  formatLabel: string;
  price: number;
  ebookPrice?: number | null;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  totalReports: number;
  reasons: { reason: BookReportReason; count: number }[];
  reports: SingleBookReport[];
  status: BookModerationStatus;
  actionTaken?: 'BLOCK' | 'DISMISS' | 'UNBLOCK' | 'NONE';
  actionNote?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  lastReportedAt: string;
  createdAt: string;
}

const STORAGE_KEY = 'huki_reported_books_v1';

// Không mock dữ liệu, hàng đợi bắt đầu hoàn toàn sạch để độc giả báo cáo thực tế
const INITIAL_SEEDS: ReportedBook[] = [];

class BookModerationService {
  private memoryCache: ReportedBook[] | null = null;

  public invalidateCache(): void {
    this.memoryCache = null;
  }

  private loadStorage(): ReportedBook[] {
    if (typeof window === 'undefined') {
      return this.memoryCache || [];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Lọc bỏ toàn bộ dữ liệu mock mẫu trước đó
          const realReports = parsed.filter((b: any) => b && !String(b.bookId).startsWith('book-rep-'));
          this.memoryCache = realReports;
          return this.memoryCache;
        }
      }
    } catch (e) {
      console.warn('[BookModerationService] Không thể đọc localStorage:', e);
    }

    this.memoryCache = [];
    return this.memoryCache;
  }

  private saveStorage(data: ReportedBook[]) {
    this.memoryCache = data;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('[BookModerationService] Lỗi khi lưu localStorage:', e);
      }
    }
  }

  /**
   * Lấy danh sách sách bị báo cáo có phân loại và thống kê
   */
  async getReportedBooks(query?: {
    status?: string;
    searchQuery?: string;
    reason?: string;
  }): Promise<{
    items: ReportedBook[];
    stats: { total: number; pending: number; blocked: number; dismissed: number };
  }> {
    // 1. Thử gọi API Backend thật
    try {
      const apiRes = await moderationApi.listBookReports(query);
      if (apiRes.success && apiRes.data && Array.isArray(apiRes.data.items)) {
        this.saveStorage(apiRes.data.items);
        return apiRes.data;
      }
    } catch (e) {
      // Backend offline hoặc fallback
    }

    const all = this.loadStorage();

    // Thống kê nhanh
    const stats = {
      total: all.length,
      pending: all.filter((b) => b.status === 'PENDING_REVIEW').length,
      blocked: all.filter((b) => b.status === 'BLOCKED').length,
      dismissed: all.filter((b) => b.status === 'DISMISSED').length,
    };

    let filtered = [...all];

    // Lọc theo trạng thái
    if (query?.status && query.status !== 'all') {
      filtered = filtered.filter((b) => b.status === query.status);
    }

    // Lọc theo lý do
    if (query?.reason && query.reason !== 'all') {
      filtered = filtered.filter((b) => b.reasons.some((r) => r.reason === query.reason));
    }

    // Lọc theo tìm kiếm
    if (query?.searchQuery?.trim()) {
      const q = query.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.sellerName.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q)
      );
    }

    // Sắp xếp: Pending lên đầu, mới báo cáo lên đầu
    filtered.sort((a, b) => {
      if (a.status === 'PENDING_REVIEW' && b.status !== 'PENDING_REVIEW') return -1;
      if (b.status === 'PENDING_REVIEW' && a.status !== 'PENDING_REVIEW') return 1;
      return new Date(b.lastReportedAt).getTime() - new Date(a.lastReportedAt).getTime();
    });

    return { items: filtered, stats };
  }

  /**
   * Tìm sách bị báo cáo theo Book ID
   */
  getReportedBookById(bookId: string): ReportedBook | null {
    const all = this.loadStorage();
    return all.find((b) => b.bookId === bookId) || null;
  }

  /**
   * Độc giả gửi báo cáo vi phạm một cuốn sách từ trang chi tiết sách (/book/[id])
   */
  async submitReport(payload: {
    bookId: string;
    bookTitle: string;
    bookCover?: string;
    author?: string;
    publisher?: string;
    sellerId?: string;
    sellerName?: string;
    isbn?: string;
    format?: string;
    price?: number;
    reporterId: string;
    reporterName: string;
    reporterEmail?: string;
    reason: BookReportReason;
    description: string;
    evidenceUrl?: string;
  }): Promise<{ success: boolean; reportId: string; totalReports: number }> {
    // 1. Gửi lên Backend API thật
    try {
      await moderationApi.reportBook(payload.bookId, {
        reason: payload.reason,
        description: payload.description,
        evidenceUrl: payload.evidenceUrl,
        bookTitle: payload.bookTitle,
        bookCover: payload.bookCover,
        author: payload.author,
        publisher: payload.publisher,
        sellerId: payload.sellerId,
        sellerName: payload.sellerName,
        isbn: payload.isbn,
        format: payload.format,
        price: payload.price,
        reporterName: payload.reporterName,
        reporterEmail: payload.reporterEmail,
      });
    } catch (e) {
      // Backend offline hoặc fallback
    }

    this.invalidateCache();
    const all = this.loadStorage();
    const nowIso = new Date().toISOString();
    const reportId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newSingleReport: SingleBookReport = {
      id: reportId,
      reporterId: payload.reporterId,
      reporterName: payload.reporterName,
      reporterEmail: payload.reporterEmail,
      reason: payload.reason,
      description: payload.description.trim(),
      evidenceUrl: payload.evidenceUrl,
      createdAt: nowIso,
    };

    const existingIndex = all.findIndex((b) => b.bookId === payload.bookId);

    if (existingIndex >= 0) {
      // Đã có hồ sơ sách này -> Bổ sung báo cáo
      const existing = all[existingIndex];
      const updatedReports = [newSingleReport, ...existing.reports];
      
      // Tính lại phân bố lý do
      const reasonMap: Record<string, number> = {};
      updatedReports.forEach((r) => {
        reasonMap[r.reason] = (reasonMap[r.reason] || 0) + 1;
      });
      const updatedReasons = Object.entries(reasonMap).map(([reason, count]) => ({
        reason: reason as BookReportReason,
        count,
      }));

      const updatedBook: ReportedBook = {
        ...existing,
        totalReports: updatedReports.length,
        reports: updatedReports,
        reasons: updatedReasons,
        lastReportedAt: nowIso,
        // Nếu sách đã bị bác bỏ trước đây nhưng có báo cáo mới -> mở lại trạng thái PENDING_REVIEW
        status: existing.status === 'BLOCKED' ? 'BLOCKED' : 'PENDING_REVIEW',
      };

      all[existingIndex] = updatedBook;
      this.saveStorage(all);

      // Bắn sự kiện realtime tới Admin Portal
      realtimeSyncBus.publish(
        'BOOK_REPORTED',
        {
          bookId: payload.bookId,
          bookTitle: payload.bookTitle,
          reportId,
          reason: payload.reason,
          reporterName: payload.reporterName,
          totalReports: updatedReports.length,
          timestamp: nowIso,
        },
        { roles: ['ADMIN', 'ADMIN_CON', 'ALL'] }
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('huki_book_reported', { detail: { bookId: payload.bookId, reportId } }));
      }

      return { success: true, reportId, totalReports: updatedReports.length };
    } else {
      // Sách lần đầu bị báo cáo -> Tạo hồ sơ mới
      const newBook: ReportedBook = {
        bookId: payload.bookId,
        title: payload.bookTitle,
        author: payload.author || 'Tác giả',
        publisher: payload.publisher || 'Nhà xuất bản đối tác',
        cover: payload.bookCover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
        isbn: payload.isbn || 'Chưa cập nhật',
        format: payload.format || 'hybrid',
        formatLabel: payload.format === 'physical' ? 'Sách Giấy' : payload.format === 'ebook' ? 'Ebook DRM' : 'Combo Sách + Ebook',
        price: payload.price || 0,
        sellerId: payload.sellerId || 'unknown-seller',
        sellerName: payload.sellerName || 'Gian hàng sách',
        sellerEmail: 'shop@huki.vn',
        totalReports: 1,
        reasons: [{ reason: payload.reason, count: 1 }],
        reports: [newSingleReport],
        status: 'PENDING_REVIEW',
        actionTaken: 'NONE',
        lastReportedAt: nowIso,
        createdAt: nowIso,
      };

      const updatedAll = [newBook, ...all];
      this.saveStorage(updatedAll);

      // Bắn sự kiện realtime tới Admin Portal
      realtimeSyncBus.publish(
        'BOOK_REPORTED',
        {
          bookId: payload.bookId,
          bookTitle: payload.bookTitle,
          reportId,
          reason: payload.reason,
          reporterName: payload.reporterName,
          totalReports: 1,
          timestamp: nowIso,
        },
        { roles: ['ADMIN', 'ADMIN_CON', 'ALL'] }
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('huki_book_reported', { detail: { bookId: payload.bookId, reportId } }));
      }

      return { success: true, reportId, totalReports: 1 };
    }
  }

  /**
   * Admin thao tác xử lý kiểm duyệt: Khóa sách, Bác bỏ báo cáo hoặc Mở khóa lại sách
   */
  async moderateBook(payload: {
    bookId: string;
    action: 'BLOCK' | 'DISMISS' | 'UNBLOCK';
    reasonText?: string;
    note?: string;
    adminName?: string;
    notifySeller?: boolean;
  }): Promise<{ success: boolean; book: ReportedBook }> {
    // 1. Gửi lên Backend API thật
    try {
      await moderationApi.moderateBook(payload.bookId, {
        action: payload.action,
        note: payload.note,
        notifySeller: payload.notifySeller,
      });
    } catch (e) {
      // Backend offline hoặc fallback
    }

    const all = this.loadStorage();
    const idx = all.findIndex((b) => b.bookId === payload.bookId);

    if (idx < 0) {
      throw new Error(`Không tìm thấy hồ sơ sách bị báo cáo có mã ${payload.bookId}`);
    }

    const current = all[idx];
    const nowIso = new Date().toISOString();
    let updatedStatus: BookModerationStatus = current.status;
    let actionTaken: 'BLOCK' | 'DISMISS' | 'UNBLOCK' = payload.action;

    if (payload.action === 'BLOCK') {
      updatedStatus = 'BLOCKED';

      // 1. Đồng bộ trạng thái sách sang SUSPENDED trên Catalog
      try {
        await catalogApi.updateBook(current.bookId, { status: 'SUSPENDED' });
      } catch (err) {
        console.warn('[BookModerationService] Không thể gọi catalogApi để khóa sách:', err);
      }

      // 2. Tự động bắn thông báo vi phạm về cho Shop (Seller)
      if (payload.notifySeller !== false) {
        try {
          const reasonTitle = payload.reasonText || 'Vi phạm tiêu chuẩn cộng đồng & bản quyền sách';
          await adminNotificationService.createNotification({
            title: `[CẢNH BÁO VI PHẠM] Sách "${current.title}" đã bị khóa trên sàn`,
            summary: `Sách "${current.title}" nhận được phản ánh từ độc giả và đã bị Ban Quản Trị tạm khóa do: ${reasonTitle}.`,
            content: `Kính gửi gian hàng ${current.sellerName},\n\nTác phẩm "${current.title}" (ISBN: ${current.isbn}) của quý đối tác đã bị tạm khóa phát hành và ẩn khỏi sàn HuKi kể từ ${new Date().toLocaleString('vi-VN')}.\n\nLý do xử lý: ${reasonTitle}\nGhi chú từ Ban Quản Trị: ${payload.note || 'Không có ghi chú thêm.'}\n\nĐể khiếu nại hoặc bổ sung giấy phép bản quyền hợp lệ, vui lòng truy cập mục Hỗ trợ & Khiếu nại hoặc phản hồi lại thông báo này.`,
            category: 'POLICY',
            severity: 'CRITICAL',
            targetRole: 'SELLER',
            targetType: 'DIRECT',
            targetBusinessIds: [current.sellerId],
            targetBusinessNames: [current.sellerName],
            channels: ['TOP_BAR', 'BELL', 'MODAL'],
            scheduleType: 'INSTANT',
            status: 'ACTIVE',
            authorName: 'Ban Quản Trị HUKI',
            actionUrl: `/seller/products?tab=SUSPENDED&search=${encodeURIComponent(current.title || current.isbn || '')}`,
            actionLabel: 'Kiểm Tra Gian Hàng',
          });
        } catch (err) {
          console.warn('[BookModerationService] Lỗi khi bắn thông báo cho Seller:', err);
        }
      }
    } else if (payload.action === 'DISMISS') {
      updatedStatus = 'DISMISSED';
      actionTaken = 'DISMISS';
    } else if (payload.action === 'UNBLOCK') {
      updatedStatus = 'DISMISSED';
      actionTaken = 'UNBLOCK';

      // Khôi phục trạng thái PUBLISHED cho sách
      try {
        await catalogApi.updateBook(current.bookId, { status: 'PUBLISHED' });
      } catch (err) {
        console.warn('[BookModerationService] Lỗi khi khôi phục sách:', err);
      }

      // Bắn thông báo khôi phục cho Shop
      if (payload.notifySeller !== false) {
        try {
          await adminNotificationService.createNotification({
            title: `[THÔNG BÁO] Sách "${current.title}" đã được mở khóa hoạt động lại`,
            summary: `Ban Quản Trị đã rà soát và kích hoạt lại sách "${current.title}" của gian hàng.`,
            content: `Kính gửi gian hàng ${current.sellerName},\n\nTác phẩm "${current.title}" đã được xác minh hồ sơ và mở khóa lưu hành bình thường trên sàn HuKi. Quý đối tác có thể tiếp tục kinh doanh.`,
            category: 'POLICY',
            severity: 'INFO',
            targetRole: 'SELLER',
            targetType: 'DIRECT',
            targetBusinessIds: [current.sellerId],
            targetBusinessNames: [current.sellerName],
            channels: ['BELL'],
            scheduleType: 'INSTANT',
            status: 'ACTIVE',
            authorName: 'Ban Quản Trị HUKI',
            actionUrl: `/book/${current.bookId}`,
            actionLabel: 'Xem Sách Trên Sàn',
          });
        } catch (err) {
          console.warn('[BookModerationService] Lỗi khi gửi thông báo mở khóa:', err);
        }
      }
    }

    const updatedBook: ReportedBook = {
      ...current,
      status: updatedStatus,
      actionTaken,
      actionNote: payload.note || (payload.action === 'DISMISS' ? 'Bác bỏ báo cáo - Sách hợp lệ' : 'Đã khóa do vi phạm'),
      moderatedBy: payload.adminName || 'Huki Super Admin',
      moderatedAt: nowIso,
    };

    all[idx] = updatedBook;
    this.saveStorage(all);

    // Bắn sự kiện realtime
    realtimeSyncBus.publish(
      'BOOK_MODERATED',
      {
        bookId: payload.bookId,
        action: payload.action,
        status: updatedStatus,
        sellerId: current.sellerId,
        timestamp: nowIso,
      },
      { roles: ['ADMIN', 'SELLER', 'BUYER', 'ALL'] }
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('huki_book_moderated', { detail: { bookId: payload.bookId, action: payload.action } }));
    }

    return { success: true, book: updatedBook };
  }

  /**
   * Thao tác xử lý hàng loạt nhiều sách bị báo cáo
   */
  async moderateBooksBulk(
    bookIds: string[],
    action: 'BLOCK' | 'DISMISS' | 'UNBLOCK',
    note?: string
  ): Promise<{ success: boolean; affectedCount: number }> {
    let affectedCount = 0;
    for (const id of bookIds) {
      try {
        await this.moderateBook({
          bookId: id,
          action,
          note: note || `Thao tác hàng loạt: ${action}`,
          adminName: 'Huki Super Admin',
          notifySeller: true,
        });
        affectedCount++;
      } catch (e) {
        console.warn(`[BookModerationService] Lỗi khi xử lý hàng loạt sách ${id}:`, e);
      }
    }
    return { success: true, affectedCount };
  }
}

export const bookModerationService = new BookModerationService();
