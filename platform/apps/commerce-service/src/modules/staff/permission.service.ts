/**
 * Staff RBAC - Permission Service (Commerce Service)
 * Phase 1 Correction: Canonical source of truth for store staff is business-service.Member.
 * This service provides in-memory permission resolution and checks based on canonical Member roles and token claims.
 */

import { Injectable, ForbiddenException } from '@nestjs/common';

// ============================================
// Permission Definitions (Matches Platform Matrix)
// ============================================

export enum Permission {
  // Order Permissions
  VIEW_ORDERS = 'VIEW_ORDERS',
  MANAGE_ORDERS = 'MANAGE_ORDERS',

  // Product Permissions
  VIEW_PRODUCTS = 'VIEW_PRODUCTS',
  MANAGE_PRODUCTS = 'MANAGE_PRODUCTS',

  // Inventory Permissions
  VIEW_INVENTORY = 'VIEW_INVENTORY',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',

  // Review Permissions
  VIEW_REVIEWS = 'VIEW_REVIEWS',
  MANAGE_REVIEWS = 'MANAGE_REVIEWS',

  // Analytics Permissions
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',

  // Finance Permissions (Owner only)
  VIEW_FINANCE = 'VIEW_FINANCE',
  MANAGE_FINANCE = 'MANAGE_FINANCE',

  // Staff Management (Owner only)
  MANAGE_STAFF = 'MANAGE_STAFF',

  // Settings Permissions
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
}

// Canonical Role → Default Permissions mapping aligned with business-service.MemberRole
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    Permission.VIEW_ORDERS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_PRODUCTS,
    Permission.MANAGE_PRODUCTS,
    Permission.VIEW_INVENTORY,
    Permission.MANAGE_INVENTORY,
    Permission.VIEW_REVIEWS,
    Permission.MANAGE_REVIEWS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_FINANCE,
    Permission.MANAGE_FINANCE,
    Permission.MANAGE_STAFF,
    Permission.MANAGE_SETTINGS,
  ],
  MANAGER: [
    Permission.VIEW_ORDERS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_PRODUCTS,
    Permission.MANAGE_PRODUCTS,
    Permission.VIEW_INVENTORY,
    Permission.MANAGE_INVENTORY,
    Permission.VIEW_REVIEWS,
    Permission.MANAGE_REVIEWS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_FINANCE,
  ],
  ORDER_STAFF: [
    Permission.VIEW_ORDERS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_INVENTORY,
  ],
  CONTENT_STAFF: [
    Permission.VIEW_PRODUCTS,
    Permission.MANAGE_PRODUCTS,
    Permission.VIEW_INVENTORY,
  ],
  FINANCE_STAFF: [
    Permission.VIEW_ORDERS,
    Permission.VIEW_FINANCE,
    Permission.MANAGE_FINANCE,
  ],
  BUSINESS: [
    // Standard merchant business owner has all store permissions
    Permission.VIEW_ORDERS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_PRODUCTS,
    Permission.MANAGE_PRODUCTS,
    Permission.VIEW_INVENTORY,
    Permission.MANAGE_INVENTORY,
    Permission.VIEW_REVIEWS,
    Permission.MANAGE_REVIEWS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_FINANCE,
    Permission.MANAGE_FINANCE,
    Permission.MANAGE_STAFF,
    Permission.MANAGE_SETTINGS,
  ],
  PLATFORM_ADMIN: [
    // Admin has global capabilities
    Permission.VIEW_ORDERS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_PRODUCTS,
    Permission.MANAGE_PRODUCTS,
    Permission.VIEW_INVENTORY,
    Permission.MANAGE_INVENTORY,
    Permission.VIEW_REVIEWS,
    Permission.MANAGE_REVIEWS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_FINANCE,
    Permission.MANAGE_FINANCE,
    Permission.MANAGE_STAFF,
    Permission.MANAGE_SETTINGS,
  ],
};

@Injectable()
export class PermissionService {
  /**
   * Get permissions for a role with optional custom permission overrides
   */
  getPermissionsForRole(role: string, customPermissions: string[] = []): Permission[] {
    const basePermissions = ROLE_PERMISSIONS[role] || [];
    const combined = [...basePermissions, ...(customPermissions as Permission[])];
    return [...new Set(combined)];
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: string, permission: Permission, customPermissions: string[] = []): boolean {
    const permissions = this.getPermissionsForRole(role, customPermissions);
    return permissions.includes(permission);
  }

  /**
   * Enforce permission or throw 403 Forbidden
   */
  checkPermission(role: string, permission: Permission, customPermissions: string[] = []): void {
    if (!this.hasPermission(role, permission, customPermissions)) {
      throw new ForbiddenException(
        `Bạn không có quyền "${permission}". Vui lòng liên hệ Quản trị viên gian hàng để được cấp quyền.`,
      );
    }
  }

  /**
   * Permission UI metadata dictionary
   */
  static getPermissionLabels(): Record<Permission, { label: string; description: string; category: string }> {
    return {
      [Permission.VIEW_ORDERS]: {
        label: 'Xem đơn hàng',
        description: 'Xem danh sách và chi tiết đơn hàng',
        category: 'Đơn hàng',
      },
      [Permission.MANAGE_ORDERS]: {
        label: 'Quản lý đơn hàng',
        description: 'Xác nhận, hủy, xử lý đơn hàng',
        category: 'Đơn hàng',
      },
      [Permission.VIEW_PRODUCTS]: {
        label: 'Xem sản phẩm',
        description: 'Xem danh sách sản phẩm',
        category: 'Sản phẩm',
      },
      [Permission.MANAGE_PRODUCTS]: {
        label: 'Quản lý sản phẩm',
        description: 'Thêm, sửa, xóa sản phẩm',
        category: 'Sản phẩm',
      },
      [Permission.VIEW_INVENTORY]: {
        label: 'Xem tồn kho',
        description: 'Xem số lượng tồn kho',
        category: 'Kho hàng',
      },
      [Permission.MANAGE_INVENTORY]: {
        label: 'Quản lý tồn kho',
        description: 'Điều chỉnh số lượng tồn kho',
        category: 'Kho hàng',
      },
      [Permission.VIEW_REVIEWS]: {
        label: 'Xem đánh giá',
        description: 'Xem đánh giá từ khách hàng',
        category: 'Đánh giá',
      },
      [Permission.MANAGE_REVIEWS]: {
        label: 'Quản lý đánh giá',
        description: 'Phản hồi, ẩn đánh giá',
        category: 'Đánh giá',
      },
      [Permission.VIEW_ANALYTICS]: {
        label: 'Xem thống kê',
        description: 'Xem báo cáo doanh thu, đơn hàng',
        category: 'Thống kê',
      },
      [Permission.VIEW_FINANCE]: {
        label: 'Xem tài chính',
        description: 'Xem báo cáo tài chính, số dư',
        category: 'Tài chính',
      },
      [Permission.MANAGE_FINANCE]: {
        label: 'Quản lý tài chính',
        description: 'Rút tiền, quản lý thanh toán',
        category: 'Tài chính',
      },
      [Permission.MANAGE_STAFF]: {
        label: 'Quản lý nhân viên',
        description: 'Thêm, sửa, xóa nhân viên',
        category: 'Nhân viên',
      },
      [Permission.MANAGE_SETTINGS]: {
        label: 'Cài đặt',
        description: 'Thay đổi cài đặt cửa hàng',
        category: 'Cài đặt',
      },
    };
  }
}
