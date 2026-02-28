import type { RegionMetrics } from '../../../types/domain';

interface ScoreGridProps {
  metrics: RegionMetrics;
  metricClass: (value: number) => string;
}

const DEFS: Array<{ key: keyof RegionMetrics; label: string }> = [
  { key: 'agingScore', label: 'Aging Score' },
  { key: 'infraRisk', label: 'Infra Risk' },
  { key: 'marketScore', label: 'Market Score' },
  { key: 'policyFit', label: 'Policy Fit' },
];

export default function ScoreGrid({ metrics, metricClass }: ScoreGridProps) {
  return (
    <div className="hud-metrics">
      {DEFS.map((metric) => (
        <article className="hud-metric" key={metric.key}>
          <div className="hud-metric-label">{metric.label}</div>
          <div className={`hud-metric-value ${metricClass(metrics[metric.key])}`}>{metrics[metric.key]}</div>
        </article>
      ))}
    </div>
  );
}
