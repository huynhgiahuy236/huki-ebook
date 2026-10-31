import { NextResponse, NextRequest } from 'next/server';

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'http://localhost:3000';

const DEFAULT_SELLER_FEATURES = [
  {
    id: 'FLASH_SALE',
    name: 'Chương trình Flash Sale Giờ Vàng',
    category: 'marketing',
    description: 'Cho phép Người bán đăng ký sản phẩm tham gia Flash Sale theo khung giờ hệ thống.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'VOUCHERS',
    name: 'Mã giảm giá & Voucher Cửa hàng',
    category: 'marketing',
    description: 'Tạo mã voucher giảm giá, hoàn xu và mã tri ân khách hàng riêng cho từng gian hàng.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'DISCOUNTS',
    name: 'Chương trình Combo & Mua Kèm Deal Sốc',
    category: 'marketing',
    description: 'Thiết lập mua kèm deal sốc, mua nhiều giảm sâu và combo trọn bộ tác phẩm.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'AFFILIATE',
    name: 'Tiếp Thị Liên Kết (Affiliate KOC/KOL)',
    category: 'marketing',
    description: 'Kích hoạt mạng lưới tiếp thị liên kết, chia sẻ doanh thu và tự động trích hoa hồng cho người giới thiệu.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'LIVESTREAM',
    name: 'Livestream Bán Sách & Mini Game Tương Tác',
    category: 'marketing',
    description: 'Phát trực tiếp giới thiệu sách mới, giao lưu độc giả và tung voucher chớp nhoáng theo thời gian thực.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'TOP_SELLER_BADGE',
    name: 'Huy Hiệu Gian Hàng Uy Tín (HuKi Mall)',
    category: 'marketing',
    description: 'Gắn nhãn chứng nhận NXB / Tác giả chính thức, tăng độ tin cậy và ưu tiên xếp hạng hiển thị.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'DIGITAL_PUBLISHING',
    name: 'Xuất bản Sách điện tử (DRM / Ebook Bảo Vệ Vault)',
    category: 'inventory',
    description: 'Đăng tải bản đọc thử, đóng gói file EPUB/PDF có mã hóa bảo vệ bản quyền DRM HuKi an toàn tuyệt đối.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'AUDIOBOOKS',
    name: 'Phát Hành Sách Nói & Audio DRM Streaming',
    category: 'inventory',
    description: 'Tải lên các file âm thanh giọng đọc bản quyền, tạo danh sách chương và stream có kiểm soát mã hóa.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'BULK_UPLOAD',
    name: 'Nhập sách hàng loạt (Excel / CSV / ONIX)',
    category: 'inventory',
    description: 'Tải file mẫu và nhập thông tin hàng trăm đầu sách cùng lúc vào kho lưu trữ một cách tự động.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'INVENTORY_SYNC',
    name: 'Tự Động Đồng Bộ Tồn Kho Đa Chi Nhánh (API Sync)',
    category: 'inventory',
    description: 'Kết nối webhook đồng bộ tồn kho thời gian thực với phần mềm quản lý kho NXB (KiotViet, Sapo, Haravan).',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'WITHDRAWALS',
    name: 'Rút tiền & Quyết toán Escrow về Ngân hàng',
    category: 'finance',
    description: 'Yêu cầu chuyển doanh thu từ Ví Escrow bảo đảm về tài khoản ngân hàng chính chủ của doanh nghiệp.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'AUTO_PAYOUT',
    name: 'Quyết Toán Tự Động Định Kỳ (Auto Bi-weekly Payout)',
    category: 'finance',
    description: 'Hệ thống tự động giải ngân doanh thu bán sách định kỳ mỗi 2 tuần vào số tài khoản đối soát mặc định.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'VAT_INVOICE',
    name: 'Xuất Hóa Đơn Điện Tử VAT Tự Động',
    category: 'finance',
    description: 'Tự động tạo và gửi hóa đơn GTGT điện tử tới hộp thư độc giả khi đơn hàng được giao thành công.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'RETURNS_MANAGEMENT',
    name: 'Quản lý & Xử lý Trả hàng / Hoàn tiền',
    category: 'operations',
    description: 'Tiếp nhận yêu cầu khiếu nại, phản hồi bằng chứng và duyệt đổi trả từ người mua theo quy chuẩn sàn.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'EXPRESS_SHIPPING',
    name: 'Giao Hàng Hỏa Tốc 2H & Ghép Tuyến Thông Minh',
    category: 'operations',
    description: 'Bật dịch vụ giao hỏa tốc nội thành 2 giờ kết nối trực tiếp với đội ngũ bưu tá và dịch vụ đối tác.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'STAFF_MANAGEMENT',
    name: 'Phân quyền & Quản lý Nhân viên Gian hàng',
    category: 'operations',
    description: 'Thêm tài khoản nhân viên vận hành kho, thủ kho, kế toán với phân quyền theo vai trò chi tiết.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'CUSTOMER_CHAT',
    name: 'Tin nhắn CSKH & Tư vấn Trực tuyến',
    category: 'customer',
    description: 'Trò chuyện thời gian thực với độc giả, giải đáp thắc mắc và gửi ưu đãi trực tiếp trong phiên chat.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'REVIEWS_FEEDBACK',
    name: 'Quản Lý Đánh Giá & Phản Hồi Độc Giả',
    category: 'customer',
    description: 'Xem nhận xét, gửi lời cảm ơn người đọc và gửi yêu cầu kiểm duyệt đối với đánh giá vi phạm tiêu chuẩn cộng đồng.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'AI_ASSISTANT',
    name: 'Trợ Lý AI Tóm Tắt Sách & Gợi Ý Tiêu Đề SEO',
    category: 'expansion',
    description: 'Trí tuệ nhân tạo HuKi AI tự động đọc hiểu tóm tắt tác phẩm, sinh mô tả chuẩn SEO và gợi ý từ khóa bán sách.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'CUSTOM_STOREFRONT',
    name: 'Tùy Biến Giao Diện Gian Hàng (Trang Trí Shop)',
    category: 'expansion',
    description: 'Thiết kế banner thương hiệu, sắp xếp bố cục tủ sách nổi bật và video trailer giới thiệu NXB.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
];

// In-memory cache on server
declare global {
  // eslint-disable-next-line no-var
  var __huki_seller_feature_flags__: any[] | undefined;
}

function getEffectiveFeatures(): any[] {
  const current = globalThis.__huki_seller_feature_flags__ || [];
  const map = new Map<string, any>();
  DEFAULT_SELLER_FEATURES.forEach((df) => map.set(df.id, df));
  current.forEach((cf: any) => {
    const base = map.get(cf.id);
    if (base) {
      map.set(cf.id, { ...base, ...cf });
    } else {
      map.set(cf.id, cf);
    }
  });
  const merged = Array.from(map.values());
  globalThis.__huki_seller_feature_flags__ = merged;
  return merged;
}

getEffectiveFeatures();

function getForwardHeaders(req: NextRequest) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  let auth = req.headers.get('authorization');
  if (!auth) {
    const cookieToken = req.cookies.get('huki_access_token')?.value;
    if (cookieToken) {
      auth = `Bearer ${cookieToken}`;
    }
  }
  if (auth) headers['authorization'] = auth;

  const cookie = req.headers.get('cookie');
  if (cookie) headers['cookie'] = cookie;
  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : '';

    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/seller/feature-flags${query}`, {
        method: 'GET',
        headers: getForwardHeaders(req),
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && (json.status === 'success' || json.success) && Array.isArray(json.data)) {
          const localMap = new Map((getEffectiveFeatures()).map((f: any) => [f.id, f]));
          const merged = json.data.map((gatewayItem: any) => {
            const localItem = localMap.get(gatewayItem.id);
            if (localItem) {
              const localTime = new Date(localItem.updatedAt || 0).getTime();
              const gatewayTime = new Date(gatewayItem.updatedAt || 0).getTime();
              if (localTime > gatewayTime) {
                return localItem;
              }
            }
            return gatewayItem;
          });
          globalThis.__huki_seller_feature_flags__ = merged;
          return NextResponse.json({
            status: 'success',
            statusCode: 200,
            success: true,
            data: merged,
          });
        }
      }
    } catch {
      // Gateway unavailable or failed, fallback to in-memory store
    }

    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: getEffectiveFeatures(),
    });
  } catch {
    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: getEffectiveFeatures(),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const current = getEffectiveFeatures();

    // Update in-memory fallback cache
    if (body.action === 'TOGGLE_GLOBAL' && body.featureId) {
      globalThis.__huki_seller_feature_flags__ = current.map((f: any) => {
        if (f.id === body.featureId) {
          return {
            ...f,
            isEnabledGlobally: Boolean(body.isEnabled),
            isEnabled: Boolean(body.isEnabled),
            maintenanceReason: body.maintenanceReason || (body.isEnabled ? '' : 'Tính năng đang được nâng cấp bảo trì'),
            updatedAt: new Date().toISOString(),
            updatedBy: 'Admin HuKi',
          };
        }
        return f;
      });
    } else if (body.action === 'SCHEDULE_TIMER' && body.featureId) {
      globalThis.__huki_seller_feature_flags__ = current.map((f: any) => {
        if (f.id === body.featureId) {
          return {
            ...f,
            scheduledDisableAt: body.scheduledDisableAt || undefined,
            scheduledEnableAt: body.scheduledEnableAt || undefined,
            scheduledReason: body.scheduledReason || undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return f;
      });
    } else if (body.action === 'CANCEL_SCHEDULE' && body.featureId) {
      globalThis.__huki_seller_feature_flags__ = current.map((f: any) => {
        if (f.id === body.featureId) {
          return {
            ...f,
            scheduledDisableAt: undefined,
            scheduledEnableAt: undefined,
            scheduledReason: undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return f;
      });
    } else if (body.action === 'TOGGLE_BUSINESS' && body.featureId && body.businessId) {
      globalThis.__huki_seller_feature_flags__ = current.map((f: any) => {
        if (f.id === body.featureId) {
          const set = new Set(f.disabledBusinesses || []);
          if (body.block) set.add(body.businessId);
          else set.delete(body.businessId);
          return {
            ...f,
            disabledBusinesses: Array.from(set),
            updatedAt: new Date().toISOString(),
            updatedBy: 'Admin HuKi',
          };
        }
        return f;
      });
    }

    // Try forwarding to Gateway
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/seller/feature-flags`, {
        method: 'POST',
        headers: getForwardHeaders(req),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return NextResponse.json({
          status: 'success',
          statusCode: 200,
          success: true,
          data: globalThis.__huki_seller_feature_flags__,
          gatewayResponse: json,
        });
      }
    } catch {
      // Gateway unavailable, return successful in-memory update
    }

    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      message: 'Cập nhật tính năng seller thành công',
      data: globalThis.__huki_seller_feature_flags__,
    });
  } catch {
    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: getEffectiveFeatures(),
    });
  }
}
