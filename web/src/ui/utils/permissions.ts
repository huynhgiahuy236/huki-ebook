import type { UserSession } from '../api/types';

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',
  STORE_VIEW: 'STORE_VIEW',
  STORE_UPDATE: 'STORE_UPDATE',
  PRODUCT_VIEW: 'PRODUCT_VIEW',
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  INVENTORY_UPDATE: 'INVENTORY_UPDATE',
  ORDER_VIEW: 'ORDER_VIEW',
  ORDER_PROCESS: 'ORDER_PROCESS',
  ORDER_CANCEL: 'ORDER_CANCEL',
  MEMBER_VIEW: 'MEMBER_VIEW',
  MEMBER_MANAGE: 'MEMBER_MANAGE',
  FINANCE_VIEW: 'FINANCE_VIEW',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  icon: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'orders',
    name: 'Bán Hàng & Đơn Hàng',
    icon: 'shopping_bag',
    permissions: [
      {
        key: 'ORDER_VIEW',
        label: 'Xem danh sách đơn hàng',
        description: 'Xem tất cả các đơn hàng phát sinh trong gian hàng',
      },
      {
        key: 'ORDER_PROCESS',
        label: 'Xử lý & Cập nhật đơn hàng',
        description: 'Tiếp nhận, xác nhận, đóng gói và giao đơn cho vận chuyển',
      },
      {
        key: 'ORDER_CANCEL',
        label: 'Hủy đơn hàng',
        description: 'Hủy đơn hàng và ghi nhận lý do từ chối xử lý',
      },
    ],
  },
  {
    id: 'products',
    name: 'Sản Phẩm & Kho Hàng',
    icon: 'menu_book',
    permissions: [
      {
        key: 'PRODUCT_VIEW',
        label: 'Xem danh mục sản phẩm',
        description: 'Xem danh sách sách giấy, ebook và combo hybrid',
      },
      {
        key: 'PRODUCT_CREATE',
        label: 'Đăng bán sách mới',
        description: 'Tạo bản thảo sách mới và gửi yêu cầu phê duyệt',
      },
      {
        key: 'PRODUCT_UPDATE',
        label: 'Chỉnh sửa thông tin sách',
        description: 'Cập nhật giá bán, mô tả, ảnh bìa và chi tiết tác phẩm',
      },
      {
        key: 'INVENTORY_UPDATE',
        label: 'Cập nhật tồn kho',
        description: 'Điều chỉnh số lượng tồn kho sách thực tế',
      },
    ],
  },
  {
    id: 'finance',
    name: 'Tài Chính & Doanh Thu',
    icon: 'account_balance_wallet',
    permissions: [
      {
        key: 'FINANCE_VIEW',
        label: 'Xem báo cáo tài chính & doanh thu',
        description: 'Xem tổng kết doanh thu, đối soát thanh toán và số dư',
      },
    ],
  },
  {
    id: 'store_members',
    name: 'Cửa Hàng & Nhân Sự',
    icon: 'group',
    permissions: [
      {
        key: 'DASHBOARD_VIEW',
        label: 'Xem bảng tổng quan (Dashboard)',
        description: 'Xem các chỉ số KPI bán hàng và biểu đồ thống kê nhanh',
      },
      {
        key: 'STORE_VIEW',
        label: 'Xem hồ sơ cửa hàng',
        description: 'Xem thông tin thương hiệu, logo, banner gian hàng',
      },
      {
        key: 'STORE_UPDATE',
        label: 'Cập nhật hồ sơ cửa hàng',
        description: 'Chỉnh sửa tên, địa chỉ lấy hàng và thông tin liên hệ',
      },
      {
        key: 'MEMBER_VIEW',
        label: 'Xem danh sách nhân viên',
        description: 'Xem danh sách nhân sự nội bộ và phân quyền',
      },
      {
        key: 'MEMBER_MANAGE',
        label: 'Quản trị phân quyền nhân viên',
        description: 'Tạo tài khoản, cấp/thu hồi quyền và khóa nhân sự',
      },
    ],
  },
];

export interface RolePreset {
  id: string;
  name: string;
  role: 'ORDER_STAFF' | 'CONTENT_STAFF' | 'FINANCE_STAFF' | 'MANAGER';
  badgeColor: string;
  description: string;
  permissions: PermissionKey[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'SALES_STAFF',
    name: 'Nhân viên Bán hàng & Đơn hàng',
    role: 'ORDER_STAFF',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    description: 'Xử lý đơn hàng, theo dõi giao nhận và xem danh mục sách',
    permissions: ['DASHBOARD_VIEW', 'ORDER_VIEW', 'ORDER_PROCESS', 'ORDER_CANCEL', 'PRODUCT_VIEW'],
  },
  {
    id: 'WAREHOUSE_STAFF',
    name: 'Thủ kho & Quản lý Sản phẩm',
    role: 'CONTENT_STAFF',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    description: 'Đăng tải sách mới, chỉnh sửa thông tin và cập nhật số lượng tồn kho',
    permissions: ['DASHBOARD_VIEW', 'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'INVENTORY_UPDATE'],
  },
  {
    id: 'FINANCE_STAFF',
    name: 'Kế toán & Tài chính',
    role: 'FINANCE_STAFF',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    description: 'Theo dõi dòng tiền, đối soát COD và xem báo cáo tài chính',
    permissions: ['DASHBOARD_VIEW', 'ORDER_VIEW', 'FINANCE_VIEW'],
  },
  {
    id: 'STORE_MANAGER',
    name: 'Quản lý Cửa hàng',
    role: 'MANAGER',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    description: 'Quản lý toàn bộ vận hành sản phẩm, kho, đơn hàng, tài chính và hồ sơ',
    permissions: [
      'DASHBOARD_VIEW',
      'STORE_VIEW',
      'STORE_UPDATE',
      'PRODUCT_VIEW',
      'PRODUCT_CREATE',
      'PRODUCT_UPDATE',
      'INVENTORY_UPDATE',
      'ORDER_VIEW',
      'ORDER_PROCESS',
      'ORDER_CANCEL',
      'MEMBER_VIEW',
      'FINANCE_VIEW',
    ],
  },
];

/**
 * Kiểm tra xem user có quyền cụ thể trong một businessId hay không
 */
export function can(
  permission: string,
  businessId?: string,
  user?: UserSession | null
): boolean {
  if (!user) return false;

  // 1. Platform Admin có toàn quyền hệ thống
  if (user.role === 'PLATFORM_ADMIN') return true;

  // 2. Chủ doanh nghiệp / Đối tác (Owner) luôn có toàn quyền trong gian hàng của mình
  if (
    user.role === 'BUSINESS' ||
    user.hasApprovedBusiness ||
    user.business?.ownerId === user.id ||
    user.business?.currentMember?.role === 'OWNER' ||
    user.memberships?.some((m) => m.role === 'OWNER' && m.status === 'ACTIVE')
  ) {
    return true;
  }

  // 3. Nếu không chỉ định businessId, kiểm tra xem user có bất kỳ membership nào chứa quyền đó không
  if (!businessId) {
    return (
      user.memberships?.some(
        (m) =>
          m.status === 'ACTIVE' &&
          (m.role === 'OWNER' || m.permissions?.includes('*') || m.permissions?.includes(permission))
      ) ?? false
    );
  }

  // 4. Tìm membership trong business cụ thể đối với Nhân viên (Staff)
  const membership = user.memberships?.find(
    (m) => m.businessId === businessId && m.status === 'ACTIVE'
  );

  if (!membership) {
    if (user.business?.id === businessId) {
      if (!user.business.currentMember || user.business.currentMember.role === 'OWNER') {
        return true;
      }
      const perms = user.business.currentMember.permissions;
      return Array.isArray(perms) && (perms.includes('*') || perms.includes(permission));
    }
    return false;
  }

  // Owner luôn có toàn quyền
  if (membership.role === 'OWNER') return true;

  // Nhân viên (Staff) kiểm tra danh sách permissions
  return (
    Array.isArray(membership.permissions) &&
    (membership.permissions.includes('*') || membership.permissions.includes(permission))
  );
}
