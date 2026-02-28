import { NextRequest, NextResponse } from 'next/server';

import { ErrorResponse, RegionMetricsResponse } from '../../../../types/contract';
import { getRegionMetrics } from '../../../../lib/server/regionService';

export async function GET(request: NextRequest): Promise<NextResponse<RegionMetricsResponse | ErrorResponse>> {
  const regionCode = request.nextUrl.searchParams.get('regionCode')?.trim();

  if (!regionCode) {
    return NextResponse.json({ error: 'regionCode query parameter is required' }, { status: 400 });
  }

  const metrics = await getRegionMetrics(regionCode);
  if (!metrics) {
    return NextResponse.json(
      { error: `No metrics found for regionCode: ${regionCode}` },
      { status: 404 }
    );
  }

  return NextResponse.json(metrics);
}
