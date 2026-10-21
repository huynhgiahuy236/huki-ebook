import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

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
  whitelistIps: string[];
  updatedAt: string;
  updatedBy: string;
}

const DEFAULT_MAINTENANCE_CONFIG: SystemMaintenanceConfig = {
  isActive: false,
  mode: 'GRACEFUL',
  drainDurationMinutes: 5,
  reason: 'Hệ thống HUKI EBOOK đang thực hiện nâng cấp cơ sở dữ liệu và bảo mật cụm máy chủ thanh toán định kỳ. Chúng tôi sẽ sớm quay trở lại!',
  affectedRoles: ['ALL'],
  allowOfflineDrm: true,
  allowShipperOfflineCod: true,
  supportHotline: '1900 6868',
  supportEmail: 'hotro@huki.vn',
  whitelistIps: ['127.0.0.1', '::1'],
  updatedAt: new Date().toISOString(),
  updatedBy: 'Hệ Thống HuKi',
};

declare global {
  // eslint-disable-next-line no-var
  var __HUKI_SERVER_MAINTENANCE__: SystemMaintenanceConfig | undefined;
}

const STORAGE_FILE = path.join(process.cwd(), '.huki_system_maintenance.json');

function getMaintenanceFromStore(): SystemMaintenanceConfig {
  if (globalThis.__HUKI_SERVER_MAINTENANCE__) {
    return globalThis.__HUKI_SERVER_MAINTENANCE__;
  }
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.isActive === 'boolean') {
        const merged: SystemMaintenanceConfig = { ...DEFAULT_MAINTENANCE_CONFIG, ...parsed };
        globalThis.__HUKI_SERVER_MAINTENANCE__ = merged;
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not read maintenance file, using defaults', err);
  }

  const initial: SystemMaintenanceConfig = { ...DEFAULT_MAINTENANCE_CONFIG };
  globalThis.__HUKI_SERVER_MAINTENANCE__ = initial;
  saveMaintenanceToStore(initial);
  return initial;
}

function saveMaintenanceToStore(conf: SystemMaintenanceConfig) {
  globalThis.__HUKI_SERVER_MAINTENANCE__ = conf;
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(conf, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save maintenance file', err);
  }
}

export async function GET() {
  const config = getMaintenanceFromStore();
  return NextResponse.json({ success: true, data: config });
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

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    const current = getMaintenanceFromStore();
    const updated: SystemMaintenanceConfig = {
      ...current,
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy || 'Super Admin',
    };

    saveMaintenanceToStore(updated);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
