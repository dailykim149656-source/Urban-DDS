import { NextRequest, NextResponse } from 'next/server';

import { buildStreetViewUrl } from '../../../../lib/server/streetViewService';

const sanitizeNumberQuery = (raw: string | null): number | null => {
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
};

const parseSizeQuery = (raw: string | null): string => {
  if (!raw) {
    return '960x540';
  }
  const trimmed = raw.trim();
  if (/^(\d{1,4})x(\d{1,4})$/.test(trimmed)) {
    return trimmed;
  }
  return '960x540';
};

const parseAngle = (raw: string | null, defaultValue: number): number => {
  if (!raw) {
    return defaultValue;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  return parsed;
};

const parseModeQuery = (raw: string | null): 'current' | 'aged' => {
  if (raw === 'aged') {
    return 'aged';
  }
  return 'current';
};

const getBadRequest = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

const isLikelyImageResponse = (rawContentType: string | null): boolean => {
  if (!rawContentType) {
    return false;
  }
  const contentType = rawContentType.toLowerCase();
  return contentType.startsWith('image/');
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  const lat = sanitizeNumberQuery(searchParams.get('lat'));
  const lng = sanitizeNumberQuery(searchParams.get('lng'));
  if (lat === null || lng === null) {
    return getBadRequest('lat and lng are required');
  }
  if (lat < -90 || lat > 90) {
    return getBadRequest('lat must be between -90 and 90');
  }
  if (lng < -180 || lng > 180) {
    return getBadRequest('lng must be between -180 and 180');
  }

  const heading = parseAngle(searchParams.get('heading'), 0);
  const pitch = parseAngle(searchParams.get('pitch'), 0);
  const fov = parseAngle(searchParams.get('fov'), 90);
  const size = parseSizeQuery(searchParams.get('size'));
  const mode = parseModeQuery(searchParams.get('mode'));

  try {
    const apiUrl = buildStreetViewUrl(
      { lat, lng },
      {
        size,
        heading,
        pitch,
        fov,
        mode,
        apiBaseUrl: process.env.GOOGLE_MAPS_STREET_VIEW_URL,
      }
    );

    const response = await fetch(apiUrl, { cache: 'no-store' });
    if (!response.ok) {
      const upstreamBody = await response.text();
      return NextResponse.json(
        { error: `Street View API failed: ${response.status} ${response.statusText}`, detail: upstreamBody.slice(0, 300) },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    if (!isLikelyImageResponse(contentType)) {
      const upstreamBody = await response.text();
      return NextResponse.json(
        { error: 'Street View API did not return an image response', detail: upstreamBody.slice(0, 300) },
        { status: 502 }
      );
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build or fetch Street View image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
