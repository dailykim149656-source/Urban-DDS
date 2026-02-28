import { SCORING_WEIGHTS, ScoreWeightKey } from './weights';
import { RegionMetrics } from '../../types/domain';

export interface ScoringBreakdown {
  priorityScore: number;
  contributions: Record<ScoreWeightKey, number>;
}

const clamp = (value: number): number => Math.max(0, Math.min(100, value));

export const calculatePriority = (metrics: RegionMetrics): ScoringBreakdown => {
  const aging = clamp(metrics.agingScore);
  const infra = clamp(metrics.infraRisk);
  const market = clamp(metrics.marketScore);
  const policy = clamp(metrics.policyFit);

  const contributions = {
    agingScore: Number((aging * SCORING_WEIGHTS.agingScore).toFixed(2)),
    infraRisk: Number((infra * SCORING_WEIGHTS.infraRisk).toFixed(2)),
    marketScore: Number((market * SCORING_WEIGHTS.marketScore).toFixed(2)),
    policyFit: Number((policy * SCORING_WEIGHTS.policyFit).toFixed(2)),
  };

  const priorityScore = Number(
    (
      contributions.agingScore +
      contributions.infraRisk +
      contributions.marketScore +
      contributions.policyFit
    ).toFixed(2)
  );

  return { priorityScore, contributions };
};

export type Scenario = 'full_redevelopment' | 'selective_redevelopment' | 'phased_redevelopment';

export const decideScenario = (metrics: RegionMetrics): Scenario => {
  if (metrics.agingScore >= 80 && metrics.infraRisk >= 70 && metrics.policyFit >= 60) {
    return 'full_redevelopment';
  }

  if (metrics.marketScore >= 70 || metrics.policyFit >= 80) {
    return 'selective_redevelopment';
  }

  return 'phased_redevelopment';
};

export const makeEvidence = (metrics: RegionMetrics, scenario: Scenario): string[] => {
  const evidence: string[] = [
    `Aging score is ${metrics.agingScore} (higher value indicates more urgent renewal need).`,
    `Infrastructure risk is ${metrics.infraRisk} (higher value indicates higher aging infrastructure burden).`,
    `Market score is ${metrics.marketScore} (higher value indicates stronger redevelopment feasibility).`,
    `Policy fit is ${metrics.policyFit} (higher value indicates better regulatory alignment).`,
  ];

  if (scenario === 'full_redevelopment') {
    evidence.push('Aging and infrastructure burdens are high enough to justify full redevelopment.');
    return evidence;
  }

  if (scenario === 'selective_redevelopment') {
    evidence.push('Market and policy indicators support selective redevelopment before full-scale conversion.');
    return evidence;
  }

  evidence.push('Recommend phased redevelopment pilots to reduce budget risk and build consensus first.');
  return evidence;
};
