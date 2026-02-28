import { NextRequest, NextResponse } from 'next/server';

import { ErrorResponse, AnalysisReportResponse } from '../../../../types/contract';
import { createAnalysisReport } from '../../../../lib/server/analysisService';

const formatSection = (title: string, lines: string[]): string =>
  lines.length ? `## ${title}\n${lines.map((line) => `- ${line}`).join('\n')}` : `## ${title}\n- 없음`;

const toMarkdown = (report: AnalysisReportResponse): string => {
  const actionPlan =
    report.actionPlan?.map((item) => `- ${item.phase} 단계: ${item.task} / 담당자: ${item.owner} / 일정: ${item.timeline}`).join('\n') ??
    '- 없음';

  return [
    '# Urban-DDS 분석 리포트',
    '',
    `생성 일시: ${report.generatedAt ?? new Date().toISOString()}`,
    `지역: ${report.regionName ?? '미지정'}`,
    `우선순위 점수: ${report.priorityScore}`,
    `권장 시나리오: ${report.recommendedScenario}`,
    `모델: ${report.model ?? 'unknown'}`,
    `버전: ${report.reportVersion ?? 1}`,
    `추적 ID: ${report.traceId ?? 'N/A'}`,
    '',
    `요약: ${report.summary}`,
    '',
    '## 근거 분석',
    ...(report.evidence.length ? report.evidence.map((entry) => `- ${entry}`) : ['- 없음']),
    '',
    formatSection('리스크', report.risks ?? []),
    '',
    '## 실행 로드맵',
    actionPlan,
    '',
    `신뢰도: ${report.confidence ?? 'N/A'}`,
    '',
  ].join('\n');
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<string | AnalysisReportResponse | ErrorResponse>> {
  const payload = await request.json().catch(() => null);
  const format = request.nextUrl.searchParams.get('format')?.toLowerCase();
  const outputFormat = format === 'json' ? 'json' : 'markdown';

  try {
    const report = await createAnalysisReport(payload);
    const responseHeaders = new Headers();
    if (report.aiSource) {
      responseHeaders.set('x-analysis-ai-source', report.aiSource);
    }
    if (report.fallbackReason) {
      responseHeaders.set('x-analysis-fallback-reason', report.fallbackReason);
    }

    if (outputFormat === 'json') {
      return NextResponse.json(report, { headers: responseHeaders });
    }

    responseHeaders.set('Content-Type', 'text/markdown; charset=utf-8');
    return new NextResponse(toMarkdown(report), {
      headers: responseHeaders,
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
