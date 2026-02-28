import type { AnalysisReportResponse } from '../../../types/contract';

interface ReportPanelProps {
  report: AnalysisReportResponse | null;
}

const formatConfidence = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${value}%` : 'N/A';

function parseDate(value: string | undefined): string {
  if (!value) {
    return 'N/A';
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString();
}

export default function ReportPanel({ report }: ReportPanelProps) {
  if (!report) {
    return (
      <article className="hud-panel hud-panel-primary">
        <h2 className="hud-panel-title">AI Recommendation Report</h2>
        <p className="hud-empty">
          아직 분석 결과가 없습니다. 먼저 지역 조회를 완료한 뒤 <code>Gemini 분석</code> 버튼을 눌러주세요.
        </p>
      </article>
    );
  }

  return (
    <article className="hud-panel hud-panel-primary">
      <h2 className="hud-panel-title">AI Recommendation Report</h2>

      <div className="hud-kv-grid">
        <div className="hud-kv">
          <span>Scenario</span>
          <strong>{report.recommendedScenario}</strong>
        </div>
        <div className="hud-kv">
          <span>Priority</span>
          <strong>{report.priorityScore}</strong>
        </div>
        <div className="hud-kv">
          <span>Confidence</span>
          <strong>{formatConfidence(report.confidence)}</strong>
        </div>
        <div className="hud-kv">
          <span>Model</span>
          <strong>{report.model ?? 'unknown'}</strong>
        </div>
        <div className="hud-kv">
          <span>Version</span>
          <strong>{report.reportVersion ?? 1}</strong>
        </div>
        <div className="hud-kv">
          <span>Trace ID</span>
          <strong>{report.traceId ?? 'N/A'}</strong>
        </div>
      </div>

      <h3 className="hud-subtitle">Executive Summary</h3>
      <p className="hud-summary">{report.executiveSummary ?? report.summary}</p>
      <h3 className="hud-subtitle">Evidence</h3>
      <ul className="hud-list">
        {report.evidence.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
      {report.risks && report.risks.length > 0 && (
        <>
          <h3 className="hud-subtitle">Risk Notes</h3>
          <ul className="hud-list">
            {report.risks.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {report.actionPlan && report.actionPlan.length > 0 && (
        <>
          <h3 className="hud-subtitle">Action Plan</h3>
          <ul className="hud-list">
            {report.actionPlan.map((item, index) => (
              <li key={`${item.phase}-${item.task}-${index}`}>
                <strong>{item.phase}</strong> - {item.task}
                <br />
                Owner: {item.owner} | Timeline: {item.timeline}
              </li>
            ))}
          </ul>
        </>
      )}
      {report.generatedAt && <p className="hud-subtitle">Generated: {parseDate(report.generatedAt)}</p>}
    </article>
  );
}
