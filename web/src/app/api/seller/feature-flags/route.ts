import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface SellerFeature {
  id: string;
  name: string;
  category: 'marketing' | 'finance' | 'inventory' | 'customer' | 'operations';
  description: string;
  isEnabledGlobally: boolean;
  maintenanceReason?: string;
  disabledBusinesses: string[];
  enabledBusinesses?: string[];
  updatedAt: string;
  updatedBy: string;
}

const DEFAULT_SELLER_FEATURES: SellerFeature[] = [
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

declare global {
  // eslint-disable-next-line no-var
  var __HUKI_SERVER_FEATURES__: SellerFeature[] | undefined;
}

const STORAGE_FILE = path.join(process.cwd(), '.huki_seller_features.json');

function getFeaturesFromStore(): SellerFeature[] {
  if (globalThis.__HUKI_SERVER_FEATURES__) {
    return globalThis.__HUKI_SERVER_FEATURES__;
  }
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalThis.__HUKI_SERVER_FEATURES__ = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read feature flags file, using defaults', err);
  }

  globalThis.__HUKI_SERVER_FEATURES__ = [...DEFAULT_SELLER_FEATURES];
  saveFeaturesToStore(globalThis.__HUKI_SERVER_FEATURES__);
  return globalThis.__HUKI_SERVER_FEATURES__;
}

function saveFeaturesToStore(list: SellerFeature[]) {
  globalThis.__HUKI_SERVER_FEATURES__ = list;
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save feature flags file', err);
  }
}

export async function GET() {
  const features = getFeaturesFromStore();
  return NextResponse.json({ success: true, data: features });
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

    const { action, featureId, isEnabled, maintenanceReason, businessId, block, businessIds, featureIds, updates } = body;
    const current = getFeaturesFromStore();
    let updated = [...current];

    if (action === 'TOGGLE_GLOBAL' && featureId) {
      updated = updated.map((f) => {
        if (f.id === featureId) {
          return {
            ...f,
            isEnabledGlobally: isEnabled,
            maintenanceReason: isEnabled ? '' : (maintenanceReason || 'Tính năng đang được nâng cấp bảo trì'),
            updatedAt: new Date().toISOString(),
            updatedBy: 'Admin HuKi',
          };
        }
        return f;
      });
    } else if (action === 'TOGGLE_BUSINESS' && featureId && businessId) {
      updated = updated.map((f) => {
        if (f.id === featureId) {
          const set = new Set(f.disabledBusinesses || []);
          if (block) set.add(businessId);
          else set.delete(businessId);
          return { ...f, disabledBusinesses: Array.from(set), updatedAt: new Date().toISOString() };
        }
        return f;
      });
    } else if (action === 'BULK_TOGGLE' && Array.isArray(businessIds) && Array.isArray(featureIds)) {
      updated = updated.map((f) => {
        if (featureIds.includes(f.id)) {
          const set = new Set(f.disabledBusinesses || []);
          businessIds.forEach((bId) => {
            if (block) set.add(bId);
            else set.delete(bId);
          });
          return { ...f, disabledBusinesses: Array.from(set), updatedAt: new Date().toISOString() };
        }
        return f;
      });
    } else if (action === 'UPDATE' && featureId && updates) {
      updated = updated.map((f) => (f.id === featureId ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f));
    }

    saveFeaturesToStore(updated);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
