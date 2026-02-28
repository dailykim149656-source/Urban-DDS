import { BuildingFacts, GeoPoint, RegionLevel, RegionMetrics, TradeFacts } from './domain';

export type AnalysisScenario =
  | 'full_redevelopment'
  | 'selective_redevelopment'
  | 'phased_redevelopment';

export interface RegionSummaryRequest {
  address: string;
}

export interface RegionSummaryResponse {
  regionId: string;
  regionCode: string;
  name: string;
  level: RegionLevel;
  center: GeoPoint;
  metrics: RegionMetrics;
  buildingFacts?: BuildingFacts;
  buildingFactsStatus?: 'ok' | 'disabled' | 'missing-lookup' | 'no-data' | 'request-failed';
  buildingFactsAttempts?: number;
  tradeFacts?: TradeFacts;
  dataSource?: string[];
  source: string;
  updatedAt: string;
  priorityScore: number;
  summary: string;
  sceneImageHint?: string;
}

export interface RegionMetricsRequest {
  regionCode: string;
}

export interface RegionMetricsResponse {
  regionId: string;
  regionCode: string;
  name: string;
  level: RegionLevel;
  metrics: RegionMetrics;
  source: string;
  updatedAt: string;
}

export interface AnalysisReportRequest {
  // regionCode is preferred identifier; regionId is accepted as backward-compatible fallback.
  regionCode?: string;
  regionId?: string;
  metrics: RegionMetrics;
}

export interface PolicyActionItem {
  phase: string;
  task: string;
  owner: string;
  timeline: string;
}

export interface AnalysisReportResponse {
  regionCode?: string;
  priorityScore: number;
  recommendedScenario: AnalysisScenario;
  summary: string;
  evidence: string[];
  risks?: string[];
  actionPlan?: PolicyActionItem[];
  confidence?: number;
  reportVersion?: number;
  model?: string;
  generatedAt?: string;
  traceId?: string;
  regionName?: string;
  executiveSummary?: string;
  aiSource?: 'gemini' | 'fallback';
  fallbackReason?: string;
  metrics: RegionMetrics;
  weightedScores: {
    agingScore: number;
    infraRisk: number;
    marketScore: number;
    policyFit: number;
  };
}

export interface AnalysisReportListItem {
  id: string;
  regionCode: string;
  regionName: string;
  recommendedScenario: AnalysisScenario;
  summary: string;
  executiveSummary?: string;
  priorityScore: number;
  confidence?: number;
  model?: string;
  reportVersion?: number;
  createdAt?: string;
}

export interface AnalysisReportsResponse {
  items: AnalysisReportListItem[];
}

export interface ErrorResponse {
  error: string;
}
