import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const events = Array.isArray(body?.events) ? body.events : [];

    // Optionally forward events to recommendation/analytics service if configured
    const analyticsServiceUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006';
    if (events.length > 0) {
      fetch(`${analyticsServiceUrl}/api/v1/analytics/events/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      }).catch(() => {
        // Silently tolerate if analytics-service is not running in local dev
      });
    }

    return NextResponse.json({
      success: true,
      processed: events.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 } // return 200 to avoid client spamming retry loops
    );
  }
}
