import { NextResponse, NextRequest } from 'next/server';

const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'http://localhost:3000';

declare global {
  // eslint-disable-next-line no-var
  var __huki_broadcast_notifications__: any[] | undefined;
}

if (!globalThis.__huki_broadcast_notifications__) {
  globalThis.__huki_broadcast_notifications__ = [];
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
      const res = await fetch(`${GATEWAY_URL}/api/v1/broadcast-notifications${query}`, {
        method: 'GET',
        headers: getForwardHeaders(req),
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && (json.status === 'success' || json.success) && Array.isArray(json.data)) {
          const localMap = new Map((globalThis.__huki_broadcast_notifications__ || []).map((n: any) => [n.id, n]));
          const merged = json.data.map((gatewayItem: any) => {
            const localItem = localMap.get(gatewayItem.id);
            if (localItem) {
              const localTime = new Date(localItem.updatedAt || 0).getTime();
              const gatewayTime = new Date(gatewayItem.updatedAt || 0).getTime();
              if (localTime > gatewayTime) return localItem;
            }
            return gatewayItem;
          });
          // Add any new local items created offline
          (globalThis.__huki_broadcast_notifications__ || []).forEach((item: any) => {
            if (!merged.some((m: any) => m.id === item.id)) {
              merged.unshift(item);
            }
          });
          globalThis.__huki_broadcast_notifications__ = merged;
          return NextResponse.json({
            status: 'success',
            statusCode: 200,
            success: true,
            data: merged,
          });
        }
      }
    } catch {
      // Gateway error fallback
    }

    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: globalThis.__huki_broadcast_notifications__ || [],
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: globalThis.__huki_broadcast_notifications__ || [],
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body && body.id) {
      const list = globalThis.__huki_broadcast_notifications__ || [];
      globalThis.__huki_broadcast_notifications__ = [body, ...list.filter((n: any) => n.id !== body.id)];
    }

    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/broadcast-notifications`, {
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
          data: body,
          gateway: json,
        });
      }
    } catch {
      // Gateway unavailable fallback
    }

    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      data: body,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'success',
      statusCode: 200,
      success: true,
      message: 'Created locally',
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body && body.id) {
      const list = globalThis.__huki_broadcast_notifications__ || [];
      globalThis.__huki_broadcast_notifications__ = list.map((n: any) => {
        if (n.id === body.id) {
          if (body.action === 'MARK_READ' && body.businessId) {
            const set = new Set(n.readByBusinessIds || []);
            set.add(body.businessId);
            return { ...n, readByBusinessIds: Array.from(set) };
          }
          if (body.action === 'DISMISS' && body.businessId) {
            const set = new Set(n.dismissedByBusinessIds || []);
            set.add(body.businessId);
            return { ...n, dismissedByBusinessIds: Array.from(set) };
          }
          if (body.action === 'TOGGLE_PIN') {
            return { ...n, isPinnedTop: !n.isPinnedTop };
          }
          return { ...n, ...body };
        }
        return n;
      });
    }

    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/broadcast-notifications`, {
        method: 'PUT',
        headers: getForwardHeaders(req),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return NextResponse.json(json, { status: res.status });
      }
    } catch {}

    return NextResponse.json({ status: 'success', success: true });
  } catch (err: any) {
    return NextResponse.json({ status: 'success', success: true });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const list = globalThis.__huki_broadcast_notifications__ || [];
      globalThis.__huki_broadcast_notifications__ = list.filter((n: any) => n.id !== id);
    }

    try {
      if (id) {
        await fetch(`${GATEWAY_URL}/api/v1/broadcast-notifications?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: getForwardHeaders(req),
        });
      }
    } catch {}

    return NextResponse.json({ status: 'success', success: true });
  } catch (err: any) {
    return NextResponse.json({ status: 'success', success: true });
  }
}
