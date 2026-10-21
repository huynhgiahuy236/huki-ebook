/**
 * HUKI System Maintenance Service
 * Manages platform-wide maintenance mode, emergency kill-switch, and graceful drain.
 * Syncs seamlessly across tabs via realtimeSyncBus, localStorage, and HTTP cookies.
 */

import { realtimeSyncBus } from './realtimeSyncBus';
import { adminNotificationService } from './adminNotificationService';

export interface SystemMaintenanceConfig {
  isActive: boolean;
  mode: 'IMMEDIATE' | 'GRACEFUL';
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  drainDurationMinutes: number;
  drainStartedAt?: string;
  reason: string;
  affectedRoles: ('ALL' | 'CUSTOMER' | 'SELLER' | 'SHIPPER')[];
  allowOfflineDrm: boolean;
  allowShipperOfflineCod: boolean;
  supportHotline: string;
  supportEmail: string;
  masterBypassKey: string;
  whitelistIps: string[];
  updatedAt: string;
  updatedBy: string;
}

const STORAGE_KEY = 'huki_system_maintenance_config';
const BYPASS_COOKIE_NAME = 'huki_bypass_token';
const ACTIVE_COOKIE_NAME = 'huki_maintenance_active';
const MODE_COOKIE_NAME = 'huki_maintenance_mode';

export const DEFAULT_MAINTENANCE_CONFIG: SystemMaintenanceConfig = {
  isActive: false,
  mode: 'GRACEFUL',
  drainDurationMinutes: 5,
  reason: 'Hệ thống HUKI EBOOK đang thực hiện nâng cấp cơ sở dữ liệu và bảo mật cụm máy chủ thanh toán định kỳ. Chúng tôi sẽ sớm quay trở lại!',
  affectedRoles: ['ALL'],
  allowOfflineDrm: true,
  allowShipperOfflineCod: true,
  supportHotline: '1900 6868',
  supportEmail: 'hotro@huki.vn',
  masterBypassKey: 'HUKI_MASTER_ADMIN_2026',
  whitelistIps: ['127.0.0.1', '::1'],
  updatedAt: new Date().toISOString(),
  updatedBy: 'Hệ Thống HuKi',
};

class MaintenanceService {
  private config: SystemMaintenanceConfig = { ...DEFAULT_MAINTENANCE_CONFIG };
  private initialized = false;
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    // Load offline cache first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.config = { ...DEFAULT_MAINTENANCE_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      this.config = { ...DEFAULT_MAINTENANCE_CONFIG };
    }

    this.syncCookies();
    this.syncFromServer();

    // Listen to Storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          this.config = { ...DEFAULT_MAINTENANCE_CONFIG, ...JSON.parse(e.newValue) };
          this.syncCookies();
          this.dispatchLocalEvent();
        } catch {}
      }
    });

    // Listen to RealtimeSyncBus
    realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'SYSTEM_MAINTENANCE_CHANGED') {
        const payload = (msg as any).payload as SystemMaintenanceConfig;
        if (payload) {
          this.config = { ...DEFAULT_MAINTENANCE_CONFIG, ...payload };
          this.syncCookies();
          this.dispatchLocalEvent();
        }
      }
    });
  }

  public async syncFromServer(): Promise<SystemMaintenanceConfig> {
    if (typeof window === 'undefined' || this.isSyncing) return this.config;
    this.isSyncing = true;
    try {
      const res = await fetch('/api/system/maintenance', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.config = { ...DEFAULT_MAINTENANCE_CONFIG, ...json.data };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
          } catch {}
          this.syncCookies();
          this.dispatchLocalEvent();
        }
      }
    } catch {
      // offline fallback to memory config
    } finally {
      this.isSyncing = false;
    }
    return this.config;
  }

  public getConfig(): SystemMaintenanceConfig {
    if (typeof window !== 'undefined' && !this.initialized) {
      this.init();
    }
    return { ...this.config };
  }

  public isMaintenanceActive(): boolean {
    const conf = this.getConfig();
    if (!conf.isActive) return false;

    // If in graceful mode, verify whether drain timer has elapsed
    if (conf.mode === 'GRACEFUL' && conf.drainStartedAt) {
      const drainStartTime = new Date(conf.drainStartedAt).getTime();
      const drainLimitMs = (conf.drainDurationMinutes || 5) * 60 * 1000;
      const now = Date.now();
      // During drain, it's not full blackout yet, but users receive warnings
      if (now < drainStartTime + drainLimitMs) {
        return false; // Still draining!
      }
    }

    return true; // Full blackout active
  }

  public isUnderGracefulDrain(): boolean {
    const conf = this.getConfig();
    if (!conf.isActive || conf.mode !== 'GRACEFUL' || !conf.drainStartedAt) return false;

    const drainStartTime = new Date(conf.drainStartedAt).getTime();
    const drainLimitMs = (conf.drainDurationMinutes || 5) * 60 * 1000;
    const now = Date.now();
    return now < drainStartTime + drainLimitMs;
  }

  public getRemainingDrainSeconds(): number {
    const conf = this.getConfig();
    if (!conf.isActive || conf.mode !== 'GRACEFUL' || !conf.drainStartedAt) return 0;

    const drainStartTime = new Date(conf.drainStartedAt).getTime();
    const drainLimitMs = (conf.drainDurationMinutes || 5) * 60 * 1000;
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((drainStartTime + drainLimitMs - now) / 1000));
    return remaining;
  }

  public updateConfig(
    partial: Partial<SystemMaintenanceConfig>,
    updatedBy: string = 'Super Admin'
  ): SystemMaintenanceConfig {
    this.config = {
      ...this.config,
      ...partial,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } catch {}
      this.syncCookies();
      this.dispatchLocalEvent();

      fetch('/api/system/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config),
      }).catch((err) => console.warn('Failed to persist maintenance to server:', err));
    }

    realtimeSyncBus.publish({
      type: 'SYSTEM_MAINTENANCE_CHANGED',
      payload: this.config,
    } as any);

    return { ...this.config };
  }

  public activateInstantBlackout(
    params: {
      reason?: string;
      scheduledEndTime?: string;
      updatedBy?: string;
    } = {}
  ): SystemMaintenanceConfig {
    const updated = this.updateConfig(
      {
        isActive: true,
        mode: 'IMMEDIATE',
        reason: params.reason || this.config.reason,
        scheduledStartTime: new Date().toISOString(),
        scheduledEndTime: params.scheduledEndTime || new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        drainStartedAt: undefined,
      },
      params.updatedBy || 'Super Admin'
    );

    // Notify all channels
    adminNotificationService.createNotification({
      title: '🚨 THÔNG BÁO BẢO TRÌ KHẨN CẤP TOÀN HỆ THỐNG',
      summary: 'Hệ thống HuKi đang bước vào chế độ bảo trì khẩn cấp. Mọi giao dịch sẽ tạm dừng.',
      content: `Hệ thống HuKi đang bước vào chế độ bảo trì khẩn cấp. Mọi giao dịch sẽ tạm dừng. Lý do: ${updated.reason}`,
      category: 'MAINTENANCE',
      severity: 'CRITICAL',
      targetRole: 'ALL',
      targetType: 'ALL',
      channels: ['TOP_BAR', 'BELL', 'MODAL'],
      scheduleType: 'INSTANT',
      status: 'ACTIVE',
      authorName: params.updatedBy || 'Super Admin',
      isPinnedTop: true,
      isDismissible: false,
    });

    return updated;
  }

  public activateGracefulDrain(
    params: {
      drainDurationMinutes?: number;
      reason?: string;
      scheduledEndTime?: string;
      updatedBy?: string;
    } = {}
  ): SystemMaintenanceConfig {
    const minutes = params.drainDurationMinutes || this.config.drainDurationMinutes || 5;
    const updated = this.updateConfig(
      {
        isActive: true,
        mode: 'GRACEFUL',
        drainDurationMinutes: minutes,
        drainStartedAt: new Date().toISOString(),
        reason: params.reason || this.config.reason,
        scheduledStartTime: new Date().toISOString(),
        scheduledEndTime: params.scheduledEndTime || new Date(Date.now() + (minutes + 120) * 60 * 1000).toISOString(),
      },
      params.updatedBy || 'Super Admin'
    );

    // Notify all roles to wrap up in-flight work
    adminNotificationService.createNotification({
      title: `⚠️ HỆ THỐNG SẼ BẢO TRÌ SAU ${minutes} PHÚT`,
      summary: `Hệ thống HuKi sẽ tiến hành bảo trì sau ${minutes} phút.`,
      content: `Hệ thống HuKi sẽ tiến hành bảo trì sau ${minutes} phút. Quý khách và đối tác vui lòng lưu đơn hàng, hoàn tất thanh toán hoặc nộp COD trước khi hệ thống ngắt kết nối.`,
      category: 'MAINTENANCE',
      severity: 'WARNING',
      targetRole: 'ALL',
      targetType: 'ALL',
      channels: ['TOP_BAR', 'BELL'],
      scheduleType: 'INSTANT',
      status: 'ACTIVE',
      authorName: params.updatedBy || 'Super Admin',
      isPinnedTop: true,
      isDismissible: true,
    });

    return updated;
  }

  public deactivateMaintenance(updatedBy: string = 'Super Admin'): SystemMaintenanceConfig {
    const updated = this.updateConfig(
      {
        isActive: false,
        drainStartedAt: undefined,
      },
      updatedBy
    );

    // Broadcast recovery message
    adminNotificationService.createNotification({
      title: '✅ HỆ THỐNG HUKI ĐÃ HOẠT ĐỘNG BÌNH THƯỜNG',
      summary: 'Quá trình bảo trì và nâng cấp kỹ thuật đã hoàn tất thành công.',
      content: 'Quá trình bảo trì và nâng cấp kỹ thuật đã hoàn tất thành công. Mọi tính năng mua bán, thanh toán, giao vận đã mở lại 100%.',
      category: 'MAINTENANCE',
      severity: 'INFO',
      targetRole: 'ALL',
      targetType: 'ALL',
      channels: ['BELL', 'TOP_BAR'],
      scheduleType: 'INSTANT',
      status: 'ACTIVE',
      authorName: updatedBy,
      isPinnedTop: false,
      isDismissible: true,
    });

    return updated;
  }

  public async verifyAndSaveBypassKey(key: string): Promise<boolean> {
    if (!key || !key.trim()) return false;
    try {
      const res = await fetch('/api/system/maintenance/bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        return Boolean(json.success);
      }
    } catch (err) {
      console.warn('Error verifying bypass key with server:', err);
    }
    return false;
  }

  public async clearBypassKey(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(BYPASS_COOKIE_NAME);
        document.cookie = `${BYPASS_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
        await fetch('/api/system/maintenance/bypass', { method: 'DELETE' });
      } catch {}
    }
  }

  public hasBypassPermission(): boolean {
    if (typeof window === 'undefined') return false;

    // Check query param first
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenInQuery = urlParams.get('bypass_token') || urlParams.get('master_key');
      if (tokenInQuery) {
        this.verifyAndSaveBypassKey(tokenInQuery);
      }
    } catch {}

    // Check cookie set by server
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [k, v] = cookie.trim().split('=');
        if (k === BYPASS_COOKIE_NAME && v && decodeURIComponent(v).length > 0) {
          return true;
        }
      }
    } catch {}

    return false;
  }

  private syncCookies() {
    if (typeof document === 'undefined') return;
    try {
      const activeVal = this.config.isActive ? '1' : '0';
      const modeVal = this.config.mode;
      document.cookie = `${ACTIVE_COOKIE_NAME}=${activeVal}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `${MODE_COOKIE_NAME}=${modeVal}; path=/; max-age=86400; SameSite=Lax`;
    } catch {}
  }

  private dispatchLocalEvent() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('huki_system_maintenance_changed', { detail: this.config })
      );
    }
  }
}

export const maintenanceService = new MaintenanceService();
