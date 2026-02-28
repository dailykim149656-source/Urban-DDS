import { NextRequest, NextResponse } from 'next/server';

import { buildStreetViewMetadataUrl } from '../../../../lib/server/streetViewService';

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

const getBadRequest = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

const isLikelyJsonResponse = (rawContentType: string | null): boolean => {
  if (!rawContentType) {
    return false;
  }
  const contentType = rawContentType.toLowerCase();
  return contentType.startsWith('application/json') || contentType.startsWith('text/plain');
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number') {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return value;
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

  try {
    const apiUrl = buildStreetViewMetadataUrl(
      { lat, lng },
      { apiBaseUrl: process.env.GOOGLE_MAPS_STREET_VIEW_METADATA_URL }
    );

    const response = await fetch(apiUrl, { cache: 'no-store' });
    const contentType = response.headers.get('content-type');
    if (!response.ok) {
      const upstreamBody = await response.text();
      return NextResponse.json(
        { error: `Street View metadata API failed: ${response.status} ${response.statusText}`, detail: upstreamBody.slice(0, 300) },
        { status: 502 }
      );
    }

    if (!isLikelyJsonResponse(contentType)) {
      const upstreamBody = await response.text();
      return NextResponse.json({ error: 'Unexpected metadata response format', detail: upstreamBody.slice(0, 300) }, { status: 502 });
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const status = typeof payload.status === 'string' ? payload.status : 'UNKNOWN';
    const date = typeof payload.date === 'string' ? payload.date : undefined;
    const panoId = typeof payload.pano_id === 'string' ? payload.pano_id : undefined;
    const copyright = typeof payload.copyright === 'string' ? payload.copyright : undefined;
    const rawLocation =
      payload.location && typeof payload.location === 'object'
        ? (payload.location as Record<string, unknown>)
        : undefined;
    const resolvedLat = toFiniteNumber(rawLocation?.lat);
    const resolvedLng = toFiniteNumber(rawLocation?.lng);

    return NextResponse.json(
      {
        status,
        date,
        pano_id: panoId,
        copyright,
        requestedLocation: { lat, lng },
        resolvedLocation:
          typeof resolvedLat === 'number' && typeof resolvedLng === 'number'
            ? { lat: resolvedLat, lng: resolvedLng }
            : null,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=180' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build or fetch Street View metadata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
