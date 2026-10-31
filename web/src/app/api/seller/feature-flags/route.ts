import { NextResponse, NextRequest } from 'next/server';

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'http://localhost:3000';

const DEFAULT_SELLER_FEATURES = [
  {
    id: 'FLASH_SALE',
    name: 'Chương trình Flash Sale',
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
    name: 'Chương trình Combo & Khuyến mãi',
    category: 'marketing',
    description: 'Thiết lập mua kèm deal sốc, mua nhiều giảm sâu và combo trọn bộ tác phẩm.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'DIGITAL_PUBLISHING',
    name: 'Xuất bản Sách điện tử (DRM / Ebook)',
    category: 'inventory',
    description: 'Đăng tải bản đọc thử, đóng gói file EPUB/PDF có mã hóa bảo vệ bản quyền DRM HuKi.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'BULK_UPLOAD',
    name: 'Nhập sách hàng loạt (Excel / CSV)',
    category: 'inventory',
    description: 'Tải file mẫu và nhập thông tin hàng trăm đầu sách cùng lúc vào kho lưu trữ.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'WITHDRAWALS',
    name: 'Rút tiền & Quyết toán Escrow',
    category: 'finance',
    description: 'Yêu cầu chuyển doanh thu từ Ví Escrow bảo đảm về tài khoản ngân hàng doanh nghiệp.',
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
    description: 'Tiếp nhận yêu cầu khiếu nại, phản hồi bằng chứng và duyệt đổi trả từ người mua.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'STAFF_MANAGEMENT',
    name: 'Phân quyền & Quản lý Nhân viên',
    category: 'operations',
    description: 'Thêm tài khoản nhân viên vận hành kho, thủ kho, kế toán với phân quyền theo vai trò.',
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
    description: 'Trò chuyện thời gian thực với độc giả, giải đáp thắc mắc và gửi ưu đãi trực tiếp.',
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

if (!globalThis.__huki_seller_feature_flags__) {
  globalThis.__huki_seller_feature_flags__ = DEFAULT_SELLER_FEATURES;
}

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
          // Merge gateway data with local overrides by updatedAt timestamp
          const localMap = new Map((globalThis.__huki_seller_feature_flags__ || []).map((f: any) => [f.id, f]));
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
      data: globalThis.__huki_seller_feature_flags__ || DEFAULT_SELLER_FEATURES,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: globalThis.__huki_seller_feature_flags__ || DEFAULT_SELLER_FEATURES,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Update in-memory fallback cache
    if (body.action === 'TOGGLE_GLOBAL' && body.featureId) {
      const current = globalThis.__huki_seller_feature_flags__ || DEFAULT_SELLER_FEATURES;
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
    } else if (body.action === 'TOGGLE_BUSINESS' && body.featureId && body.businessId) {
      const current = globalThis.__huki_seller_feature_flags__ || DEFAULT_SELLER_FEATURES;
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
  } catch (err: any) {
    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: globalThis.__huki_seller_feature_flags__,
    });
  }
}
