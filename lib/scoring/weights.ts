export const SCORING_WEIGHTS = {
  agingScore: 0.35,
  infraRisk: 0.25,
  marketScore: 0.25,
  policyFit: 0.15,
} as const;

export type ScoreWeightKey = keyof typeof SCORING_WEIGHTS;
