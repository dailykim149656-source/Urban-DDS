import { NextRequest, NextResponse } from 'next/server';

import { AnalysisReportsResponse, ErrorResponse } from '../../../../types/contract';
import { listRecentAnalysisReports } from '../../../../lib/server/reportRepository';

const normalizeLimit = (value: string | null): number => {
  if (!value) {
    return 20;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(100, Math.round(parsed));
};

export async function GET(request: NextRequest): Promise<NextResponse<AnalysisReportsResponse | ErrorResponse>> {
  const ownerUserId = 'anonymous';

  const limit = normalizeLimit(request.nextUrl.searchParams.get('limit'));

  try {
    const result = await listRecentAnalysisReports(limit, ownerUserId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
