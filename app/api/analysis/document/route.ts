import { NextRequest, NextResponse } from 'next/server';

import { ErrorResponse, AnalysisReportResponse } from '../../../../types/contract';
import { createAnalysisReport } from '../../../../lib/server/analysisService';

const formatSection = (title: string, lines: string[]): string =>
  lines.length ? `## ${title}\n${lines.map((line) => `- ${line}`).join('\n')}` : `## ${title}\n- 없음`;

const toMarkdown = (report: AnalysisReportResponse): string => {
  const actionPlan =
    report.actionPlan?.map((item) => `- ${item.phase}단계: ${item.task} / 담당: ${item.owner} / 기간: ${item.timeline}`).join('\n') ??
    '- 없음';

  return [
    '# Urban-DDS 분석 문서',
    '',
    `생성 시각: ${report.generatedAt ?? new Date().toISOString()}`,
    `지역: ${report.regionName ?? '알 수 없음'}`,
    `우선순위 점수: ${report.priorityScore}`,
    `추천 시나리오: ${report.recommendedScenario}`,
    `모델: ${report.model ?? 'unknown'}`,
    `버전: ${report.reportVersion ?? 1}`,
    `트레이스ID: ${report.traceId ?? 'N/A'}`,
    '',
    `요약: ${report.summary}`,
    '',
    '## 핵심 근거',
    ...(report.evidence.length ? report.evidence.map((entry) => `- ${entry}`) : ['- 없음']),
    '',
    formatSection('리스크', report.risks ?? []),
    '',
    '## 실행 계획',
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

    if (outputFormat === 'json') {
      return NextResponse.json(report);
    }

    return new NextResponse(toMarkdown(report), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
