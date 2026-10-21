import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const probe = req.nextUrl.searchParams.get('probe');

  if (probe === 'live' || probe === 'liveness') {
    return NextResponse.json(
      {
        status: 'ok',
        service: 'web',
        probe: 'liveness',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      { status: 200 }
    );
  }

  // Readiness check: verifies backend gateway reachability if configured
  const gatewayUrl =
    process.env.API_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_URL ||
    'http://localhost:3000';

  let gatewayStatus = 'unknown';
  try {
    const res = await fetch(`${gatewayUrl}/api/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    gatewayStatus = res.ok ? 'connected' : `status_${res.status}`;
  } catch {
    gatewayStatus = 'unreachable';
  }

  const isDegraded = gatewayStatus === 'unreachable';

  return NextResponse.json(
    {
      status: isDegraded ? 'degraded' : 'ok',
      service: 'web',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      dependencies: {
        gateway: {
          url: gatewayUrl,
          status: gatewayStatus,
        },
      },
    },
    { status: isDegraded && probe === 'ready' ? 503 : 200 }
  );
}
