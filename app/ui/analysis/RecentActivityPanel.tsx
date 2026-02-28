import type { AnalysisReportListItem } from '../../../types/contract';

interface RecentActivityPanelProps {
  recentReports: AnalysisReportListItem[];
  loadingRecentReports: boolean;
}

const formatTimestamp = (value: string | undefined): string => {
  if (!value) {
    return 'N/A';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString();
};

export default function RecentActivityPanel({
  recentReports,
  loadingRecentReports,
}: RecentActivityPanelProps) {
  return (
    <section className="hud-panel hud-panel-log">
      <div className="hud-panel-title-row">
        <h2 className="hud-panel-title">Recent Analysis Timeline</h2>
        <span className="hud-subtitle-small">limit 5 events · last refresh first</span>
      </div>
      {loadingRecentReports ? (
        <p className="hud-empty">Recent history is loading from analysis stream.</p>
      ) : recentReports.length > 0 ? (
        <ul className="hud-timeline-log">
          {recentReports.map((item) => (
            <li key={item.id} className="hud-timeline-row">
              <div className="hud-timeline-marker" aria-hidden="true">
                <span>{item.priorityScore}</span>
              </div>
              <div className="hud-log-item">
                <div className="hud-log-title">
                  {item.regionName} ({item.regionCode}) — {item.recommendedScenario}
                </div>
                <div className="hud-log-meta">
                  Priority {item.priorityScore} | Confidence{' '}
                  {typeof item.confidence === 'number' ? `${item.confidence}%` : 'N/A'}{' '}
                  {item.model ? `| Model ${item.model}` : ''} | v{item.reportVersion ?? 1}
                </div>
                <div className="hud-log-summary">{item.executiveSummary ?? item.summary}</div>
                <div className="hud-log-time">Created: {formatTimestamp(item.createdAt)}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hud-empty">No recent analysis history to show yet.</p>
      )}
    </section>
  );
}

