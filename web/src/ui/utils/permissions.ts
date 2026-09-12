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

/**
 * Kiểm tra xem user có quyền cụ thể trong một businessId hay không
 */
export function can(
  permission: string,
  businessId?: string,
  user?: UserSession | null
): boolean {
  if (!user) return false;

  // Platform Admin có toàn quyền hệ thống
  if (user.role === 'PLATFORM_ADMIN') return true;

  // Nếu không chỉ định businessId, kiểm tra xem user có bất kỳ membership nào chứa quyền đó không
  if (!businessId) {
    return (
      user.memberships?.some(
        (m) =>
          m.status === 'ACTIVE' &&
          (m.role === 'OWNER' || m.permissions?.includes(permission))
      ) ?? false
    );
  }

  // Tìm membership trong business cụ thể
  const membership = user.memberships?.find(
    (m) => m.businessId === businessId && m.status === 'ACTIVE'
  );

  if (!membership) return false;

  // Owner luôn có toàn quyền trong business của mình
  if (membership.role === 'OWNER') return true;

  // Admin con (Member) kiểm tra danh sách permissions
  return Array.isArray(membership.permissions) && membership.permissions.includes(permission);
}
