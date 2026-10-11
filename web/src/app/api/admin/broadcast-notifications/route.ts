import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface BroadcastNotification {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'MAINTENANCE' | 'POLICY' | 'ORDER' | 'FINANCE' | 'MARKETING' | 'SECURITY';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  targetType: 'ALL' | 'SEGMENT' | 'DIRECT';
  targetSegment?: 'ALL' | 'DIGITAL_SELLERS' | 'PHYSICAL_SELLERS' | 'NEW_SELLERS' | 'AT_RISK_SELLERS';
  targetBusinessIds?: string[];
  targetBusinessNames?: string[];
  channels: ('TOP_BAR' | 'BELL' | 'MODAL')[];
  isPinnedTop?: boolean;
  isDismissible?: boolean;
  scheduleType: 'INSTANT' | 'SCHEDULED' | 'RECURRING';
  scheduledAt?: string;
  recurringRule?: 'BI_MONTHLY' | 'WEEKLY_MONDAY' | 'MONTHLY_FIRST';
  status: 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  authorName: string;
  readByBusinessIds: string[];
  dismissedByBusinessIds: string[];
  actionUrl?: string;
  actionLabel?: string;
}

const DEFAULT_NOTIFICATIONS: BroadcastNotification[] = [
  {
    id: 'notif-escrow-recon',
    title: 'Kỳ đối soát & Quyết toán Escrow định kỳ (Kỳ 15 hàng tháng)',
    summary: 'Hệ thống tự động kết chuyển doanh thu các đơn hàng hoàn tất vào Ví Khả Dụng trước 24:00.',
    content: 'Kính gửi Quý Nhà Xuất Bản và Đối Tác Bán Hàng,\n\nTheo quy chế vận hành sàn HUKI, hôm nay là kỳ đối soát doanh thu tự động định kỳ giữa tháng. Toàn bộ tiền giữ ký quỹ (Escrow) của các đơn hàng giao thành công và hết thời hạn đổi trả (sau 7 ngày) sẽ được giải ngân vào Ví Khả Dụng của gian hàng.\n\nQuý đối tác vui lòng kiểm tra mục [Tài chính & Doanh thu > Lịch sử Giao dịch Ví] để đối chiếu chi tiết.',
    category: 'FINANCE',
    severity: 'INFO',
    targetType: 'ALL',
    channels: ['TOP_BAR', 'BELL'],
    isPinnedTop: true,
    isDismissible: true,
    scheduleType: 'RECURRING',
    recurringRule: 'BI_MONTHLY',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    authorName: 'Ban Quản Trị HUKI',
    readByBusinessIds: [],
    dismissedByBusinessIds: [],
    actionUrl: '/seller/finance',
    actionLabel: 'Xem Ví Escrow',
  },
  {
    id: 'notif-maintenance-system',
    title: 'Thông báo kế hoạch bảo trì cổng thanh toán trực tuyến & DRMVault',
    summary: 'Hệ thống bảo trì máy chủ mã hóa DRM từ 01:00 đến 03:00 sáng mai. Tính năng xuất bản tạm ngắt trong khung giờ này.',
    content: 'Ban Quản Trị HUKI xin thông báo kế hoạch nâng cấp hạ tầng mã hóa chống sao chép DRM và hạ tầng cụm thanh toán VietQR:\n\n- Thời gian dự kiến: 01:00 - 03:00 (Sáng mai)\n- Ảnh hưởng: Trong khoảng thời gian này, tính năng tải file EPUB/PDF mới lên sàn và đối soát sẽ tạm ngắt kết nối. Các tính năng bán hàng và đọc sách của độc giả vẫn hoạt động bình thường.\n\nTrân trọng cảm ơn sự hợp tác của Quý Đối Tác!',
    category: 'MAINTENANCE',
    severity: 'WARNING',
    targetType: 'ALL',
    channels: ['TOP_BAR', 'BELL'],
    isPinnedTop: true,
    isDismissible: true,
    scheduleType: 'INSTANT',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    authorName: 'Bộ Phận Kỹ Thuật HUKI',
    readByBusinessIds: [],
    dismissedByBusinessIds: [],
    actionUrl: '/seller/notifications',
    actionLabel: 'Xem Lịch Bảo Trì',
  },
  {
    id: 'notif-policy-copyright',
    title: 'Cập nhật quy định kiểm duyệt bản quyền tác phẩm Ebook & Giấy phép NXB',
    summary: 'Mọi ấn bản số phát hành từ tháng này phải đính kèm hợp đồng chuyển nhượng quyền tác giả hợp lệ.',
    content: 'Nhằm đảm bảo tuân thủ nghiêm ngặt Luật Xuất Bản và bảo vệ quyền tác giả trong thời đại AI, Ban Quản Trị HUKI cập nhật biểu mẫu cam kết quyền sở hữu trí tuệ khi đăng tải tác phẩm sách số.\n\nCác ấn bản chưa bổ sung đủ tài liệu hợp lệ trước ngày 30 hàng tháng sẽ tạm chuyển về trạng thái Lưu Nháp.',
    category: 'POLICY',
    severity: 'CRITICAL',
    targetType: 'SEGMENT',
    targetSegment: 'DIGITAL_SELLERS',
    channels: ['BELL', 'MODAL'],
    isPinnedTop: false,
    isDismissible: true,
    scheduleType: 'INSTANT',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    authorName: 'Phòng Pháp Lý HUKI',
    readByBusinessIds: [],
    dismissedByBusinessIds: [],
    actionUrl: '/seller/product/correction',
    actionLabel: 'Kiểm Tra Danh Mục',
  },
];

declare global {
  // eslint-disable-next-line no-var
  var __HUKI_SERVER_NOTIFICATIONS__: BroadcastNotification[] | undefined;
}

const STORAGE_FILE = path.join(process.cwd(), '.huki_broadcast_notifications.json');

function getNotificationsFromStore(): BroadcastNotification[] {
  if (globalThis.__HUKI_SERVER_NOTIFICATIONS__) {
    return globalThis.__HUKI_SERVER_NOTIFICATIONS__;
  }
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalThis.__HUKI_SERVER_NOTIFICATIONS__ = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read notifications file, using defaults', err);
  }

  globalThis.__HUKI_SERVER_NOTIFICATIONS__ = [...DEFAULT_NOTIFICATIONS];
  saveNotificationsToStore(globalThis.__HUKI_SERVER_NOTIFICATIONS__);
  return globalThis.__HUKI_SERVER_NOTIFICATIONS__;
}

function saveNotificationsToStore(list: BroadcastNotification[]) {
  globalThis.__HUKI_SERVER_NOTIFICATIONS__ = list;
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save notifications file', err);
  }
}

export async function GET() {
  const notifs = getNotificationsFromStore();
  return NextResponse.json({ success: true, data: notifs });
}

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ success: false, message: 'Empty body' }, { status: 400 });
    }

    const current = getNotificationsFromStore();
    const id = body.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: BroadcastNotification = {
      ...body,
      id,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readByBusinessIds: body.readByBusinessIds || [],
      dismissedByBusinessIds: body.dismissedByBusinessIds || [],
    };
    const filtered = current.filter((n) => n.id !== id);
    const updated = [newNotif, ...filtered];
    saveNotificationsToStore(updated);
    return NextResponse.json({ success: true, data: newNotif, list: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }

    const { action, id, businessId } = body;
    const current = getNotificationsFromStore();
    let updated = [...current];

    if (action === 'MARK_READ' && id) {
      const effBiz = businessId || 'default_seller';
      updated = updated.map((n) => {
        if (n.id === id) {
          const set = new Set(n.readByBusinessIds || []);
          set.add(effBiz);
          return { ...n, readByBusinessIds: Array.from(set) };
        }
        return n;
      });
    } else if (action === 'MARK_ALL_READ') {
      const effBiz = businessId || 'default_seller';
      updated = updated.map((n) => {
        const set = new Set(n.readByBusinessIds || []);
        set.add(effBiz);
        return { ...n, readByBusinessIds: Array.from(set) };
      });
    } else if (action === 'TOGGLE_PIN' && id) {
      updated = updated.map((n) => {
        if (n.id === id) {
          const nextPinned = !n.isPinnedTop;
          const nextChannels = nextPinned
            ? Array.from(new Set([...n.channels, 'TOP_BAR' as const]))
            : n.channels.filter((c) => c !== 'TOP_BAR');
          return { ...n, isPinnedTop: nextPinned, channels: nextChannels, updatedAt: new Date().toISOString() };
        }
        return n;
      });
    } else if (action === 'DISMISS' && id) {
      const effBiz = businessId || 'default_seller';
      updated = updated.map((n) => {
        if (n.id === id) {
          const set = new Set(n.dismissedByBusinessIds || []);
          set.add(effBiz);
          return { ...n, dismissedByBusinessIds: Array.from(set) };
        }
        return n;
      });
    }

    saveNotificationsToStore(updated);
    return NextResponse.json({ success: true, list: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing id' }, { status: 400 });
    }
    const current = getNotificationsFromStore();
    const updated = current.filter((n) => n.id !== id);
    saveNotificationsToStore(updated);
    return NextResponse.json({ success: true, list: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
