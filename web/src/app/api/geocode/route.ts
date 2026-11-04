import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const cache = new Map<string, { lat: number; lng: number; displayName: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || !q.trim()) {
    return NextResponse.json({ success: false, error: 'Query parameter q is required' }, { status: 400 });
  }

  const query = q.trim();
  const cacheKey = query.toLowerCase();

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      success: true,
      data: { lat: cached.lat, lng: cached.lng, displayName: cached.displayName },
      source: 'cache',
    });
  }

  // 1. Try Photon Geocoding API (Fast, Free, OpenStreetMap data)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(photonUrl, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.features && data.features.length > 0) {
        const feat = data.features[0];
        const [lng, lat] = feat.geometry.coordinates;
        const displayName = feat.properties?.name || feat.properties?.street || query;

        cache.set(cacheKey, { lat, lng, displayName, timestamp: Date.now() });

        return NextResponse.json({
          success: true,
          data: { lat, lng, displayName },
          source: 'photon',
        });
      }
    }
  } catch (err) {
    // Continue to next provider
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'HuKiEbookApp/1.0 (contact@huki.vn)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        const item = items[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const displayName = item.display_name;

        cache.set(cacheKey, { lat, lng, displayName, timestamp: Date.now() });

        return NextResponse.json({
          success: true,
          data: { lat, lng, displayName },
          source: 'nominatim',
        });
      }
    }
  } catch (err) {
    // Both failed
  }

  return NextResponse.json({
    success: false,
    error: 'Location not found in public geocoding providers',
  });
}

