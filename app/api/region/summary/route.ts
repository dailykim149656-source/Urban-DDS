import { NextRequest, NextResponse } from 'next/server';

import { ErrorResponse, RegionSummaryResponse } from '../../../../types/contract';
import { getRegionSummary } from '../../../../lib/server/regionService';
import { hasMeaningfulAddressInput } from '../../../../lib/adapters/regionDataAdapter';

export async function GET(request: NextRequest): Promise<NextResponse<RegionSummaryResponse | ErrorResponse>> {
  const address = request.nextUrl.searchParams.get('address')?.trim();

  if (!address) {
    return NextResponse.json({ error: 'address query parameter is required' }, { status: 400 });
  }
  if (!hasMeaningfulAddressInput(address)) {
    return NextResponse.json({ error: 'address query parameter has no meaningful value' }, { status: 400 });
  }

  const summary = await getRegionSummary(address);
  if (!summary) {
    return NextResponse.json(
      { error: `No region found for address: ${address}` },
      { status: 404 }
    );
  }

  return NextResponse.json(summary);
}
