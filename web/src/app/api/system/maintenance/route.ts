import { NextResponse, NextRequest } from 'next/server';

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'http://localhost:3000';

const DEFAULT_MAINTENANCE_CONFIG = {
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

declare global {
  // eslint-disable-next-line no-var
  var __huki_system_maintenance__: any | undefined;
}

if (!globalThis.__huki_system_maintenance__) {
  globalThis.__huki_system_maintenance__ = { ...DEFAULT_MAINTENANCE_CONFIG };
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
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/system/maintenance`, {
        method: 'GET',
        headers: getForwardHeaders(req),
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && (json.status === 'success' || json.success) && json.data) {
          const localTime = new Date(globalThis.__huki_system_maintenance__?.updatedAt || 0).getTime();
          const gatewayTime = new Date(json.data.updatedAt || 0).getTime();
          if (localTime <= gatewayTime) {
            globalThis.__huki_system_maintenance__ = {
              ...globalThis.__huki_system_maintenance__,
              ...json.data,
            };
          }
          const resp = NextResponse.json({
            status: 'success',
            statusCode: 200,
            success: true,
            data: globalThis.__huki_system_maintenance__,
          });
          resp.cookies.set({
            name: 'huki_maintenance_active',
            value: globalThis.__huki_system_maintenance__.isActive ? '1' : '0',
            path: '/',
            maxAge: 86400,
            sameSite: 'lax',
          });
          return resp;
        }
      }
    } catch {
      // Gateway unavailable, fallback to server in-memory config
    }

    const currentConfig = globalThis.__huki_system_maintenance__ || DEFAULT_MAINTENANCE_CONFIG;
    const resp = NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: currentConfig,
    });
    resp.cookies.set({
      name: 'huki_maintenance_active',
      value: currentConfig.isActive ? '1' : '0',
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
    });
    return resp;
  } catch (err: any) {
    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: globalThis.__huki_system_maintenance__ || DEFAULT_MAINTENANCE_CONFIG,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Update in-memory server state
    globalThis.__huki_system_maintenance__ = {
      ...(globalThis.__huki_system_maintenance__ || DEFAULT_MAINTENANCE_CONFIG),
      ...body,
      updatedAt: new Date().toISOString(),
    };

    const current = globalThis.__huki_system_maintenance__;

    // Try forwarding to Gateway
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/system/maintenance`, {
        method: 'POST',
        headers: getForwardHeaders(req),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const resp = NextResponse.json({
          status: 'success',
          statusCode: 200,
          success: true,
          data: current,
          gatewayResponse: json,
        });
        resp.cookies.set({
          name: 'huki_maintenance_active',
          value: current.isActive ? '1' : '0',
          path: '/',
          maxAge: 86400,
          sameSite: 'lax',
        });
        return resp;
      }
    } catch {
      // Gateway unavailable
    }

    const resp = NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      message: 'Cập nhật trạng thái bảo trì hệ thống thành công',
      data: current,
    });
    resp.cookies.set({
      name: 'huki_maintenance_active',
      value: current.isActive ? '1' : '0',
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
    });
    return resp;
  } catch (err: any) {
    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: globalThis.__huki_system_maintenance__ || DEFAULT_MAINTENANCE_CONFIG,
    });
  }
}
