/**
 * Staff RBAC - Permission Service
 * Implements 13 permissions for seller staff management
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ============================================
// Permission Definitions
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

// Role → Default Permissions mapping
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
  STAFF: [
    Permission.VIEW_ORDERS,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_REVIEWS,
    Permission.VIEW_ANALYTICS,
  ],
  VIEWER: [
    Permission.VIEW_ORDERS,
    Permission.VIEW_PRODUCTS,
  ],
};

// Staff role enum (matches database)
export enum StaffRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  VIEWER = 'VIEWER',
}

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get permissions for a staff member
   */
  async getStaffPermissions(staffId: string): Promise<Permission[]> {
    const staff = await (this.prisma as any).sellerStaff.findUnique({
      where: { id: staffId },
      select: { role: true, customPermissions: true },
    });

    if (!staff) {
      return [];
    }

    // Start with role-based permissions
    const basePermissions = ROLE_PERMISSIONS[staff.role] || [];

    // Add any custom permissions
    const customPermissions = staff.customPermissions || [];

    return [...new Set([...basePermissions, ...customPermissions])];
  }

  /**
   * Check if staff has a specific permission
   */
  async hasPermission(staffId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getStaffPermissions(staffId);
    return permissions.includes(permission);
  }

  /**
   * Check multiple permissions (all must be present)
   */
  async hasAllPermissions(staffId: string, permissions: Permission[]): Promise<boolean> {
    const staffPermissions = await this.getStaffPermissions(staffId);
    return permissions.every(p => staffPermissions.includes(p));
  }

  /**
   * Check if staff has any of the permissions
   */
  async hasAnyPermission(staffId: string, permissions: Permission[]): Promise<boolean> {
    const staffPermissions = await this.getStaffPermissions(staffId);
    return permissions.some(p => staffPermissions.includes(p));
  }

  /**
   * Update staff permissions
   */
  async updatePermissions(
    ownerId: string,
    staffId: string,
    permissions: Permission[],
  ): Promise<void> {
    // Verify owner has MANAGE_STAFF permission
    const hasPermission = await this.hasPermission(ownerId, Permission.MANAGE_STAFF);
    if (!hasPermission) {
      throw new ForbiddenException('Chỉ Owner mới có quyền quản lý nhân viên');
    }

    // Cannot modify owner's own permissions
    const staff = await (this.prisma as any).sellerStaff.findUnique({ where: { id: staffId } });
    if (staff?.role === StaffRole.OWNER) {
      throw new ForbiddenException('Không thể thay đổi quyền của Owner');
    }

    // Update permissions
    await (this.prisma as any).sellerStaff.update({
      where: { id: staffId },
      data: { customPermissions: permissions },
    });
  }

  /**
   * Guard function to check permission before controller action
   */
  async checkPermission(staffId: string, permission: Permission): Promise<void> {
    const hasPermission = await this.hasPermission(staffId, permission);
    if (!hasPermission) {
      throw new ForbiddenException(
        `Bạn không có quyền "${permission}". Vui lòng liên hệ Owner để được cấp quyền.`,
      );
    }
  }

  /**
   * Get all staff for a store
   */
  async getStoreStaff(storeId: string) {
    return (this.prisma as any).sellerStaff.findMany({
      where: { storeId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        customPermissions: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  /**
   * Create a new staff member
   */
  async createStaff(
    ownerId: string,
    storeId: string,
    data: {
      email: string;
      fullName: string;
      role: StaffRole;
    },
  ) {
    await this.checkPermission(ownerId, Permission.MANAGE_STAFF);

    return (this.prisma as any).sellerStaff.create({
      data: {
        storeId,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        isActive: true,
      },
    });
  }

  /**
   * Deactivate a staff member
   */
  async deactivateStaff(ownerId: string, staffId: string) {
    await this.checkPermission(ownerId, Permission.MANAGE_STAFF);

    const staff = await (this.prisma as any).sellerStaff.findUnique({ where: { id: staffId } });
    if (staff?.role === StaffRole.OWNER) {
      throw new ForbiddenException('Không thể vô hiệu hóa Owner');
    }

    return (this.prisma as any).sellerStaff.update({
      where: { id: staffId },
      data: { isActive: false },
    });
  }

  /**
   * Get permission labels for UI display
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
