import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { ErrorResponse, AnalysisReportResponse } from '../../../../types/contract';
import { createAnalysisReport } from '../../../../lib/server/analysisService';
import { persistAnalysisReport } from '../../../../lib/server/reportRepository';
import { authOptions } from '../../../../lib/server/authOptions';

const parseRegionCode = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const maybeRecord = payload as Record<string, unknown>;
  const raw = maybeRecord.regionCode ?? maybeRecord.regionId;
  if (typeof raw !== 'string') {
    return null;
  }

  const value = raw.trim();
  return value.length > 0 ? value : null;
};

export async function POST(request: NextRequest): Promise<NextResponse<AnalysisReportResponse | ErrorResponse>> {
  const session = await getServerSession(authOptions);
  const ownerUserId = session?.user?.email?.trim();

  if (!ownerUserId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  try {
    const report = await createAnalysisReport(payload);
    const regionCode = report.regionCode ?? parseRegionCode(payload);
    const persistResult = regionCode
      ? await persistAnalysisReport({
          ownerUserId,
          ownerEmail: session?.user?.email ?? undefined,
          regionCode,
          regionName: report.regionName,
          report,
        })
      : { saved: false, reason: 'regionCode-missing' };

    const response = NextResponse.json(report);
    response.headers.set('x-analysis-report-saved', persistResult.saved ? 'true' : 'false');
    if (report.reportVersion) {
      response.headers.set('x-analysis-report-version', String(report.reportVersion));
    }
    if (report.model) {
      response.headers.set('x-analysis-report-model', report.model);
    }
    if (report.traceId) {
      response.headers.set('x-analysis-report-trace-id', report.traceId);
    }

    if (persistResult.documentId) {
      response.headers.set('x-analysis-report-id', persistResult.documentId);
    }

    if (!persistResult.saved && persistResult.reason) {
      response.headers.set('x-analysis-report-save-reason', persistResult.reason);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
