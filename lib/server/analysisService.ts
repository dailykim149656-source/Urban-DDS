import { AnalysisReportRequest, AnalysisReportResponse } from '../../types/contract';
import { calculatePriority, decideScenario, makeEvidence } from '../scoring';
import { generatePolicyDocument, GEMINI_MODEL } from '../services/gemini';
import { getRegionByCode, getRegionById } from '../adapters/regionDataAdapter';

const createTraceId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `trace-${timestamp}-${random}`;
};

const isRegionMetricsValid = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && value <= 100;

const validateRequestMetrics = (metrics: AnalysisReportRequest['metrics']): boolean => {
  return (
    isRegionMetricsValid(metrics.agingScore) &&
    isRegionMetricsValid(metrics.infraRisk) &&
    isRegionMetricsValid(metrics.marketScore) &&
    isRegionMetricsValid(metrics.policyFit)
  );
};

const mergeEvidence = (policyEvidence: string[], scoringEvidence: string[]): string[] => {
  const dedup = new Map<string, true>();
  const combined = [...policyEvidence, ...scoringEvidence];

  for (const item of combined) {
    const normalized = item.trim();
    if (!normalized) {
      continue;
    }
    dedup.set(normalized, true);
  }

  return [...dedup.keys()].slice(0, 8);
};

const normalizeIdentifier = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};

const resolveRegionFromRequest = async (
  payload: AnalysisReportRequest
): Promise<{ regionCode: string; regionName: string }> => {
  const requestedRegionCode = normalizeIdentifier(payload.regionCode);
  const requestedRegionId = normalizeIdentifier((payload as { regionId?: string }).regionId);

  if (!requestedRegionCode && !requestedRegionId) {
    throw new Error('regionCode is required');
  }

  if (requestedRegionCode) {
    const regionByCode = await getRegionByCode(requestedRegionCode);
    if (regionByCode) {
      return {
        regionCode: regionByCode.code,
        regionName: regionByCode.name ?? requestedRegionCode,
      };
    }
  }

  if (requestedRegionId) {
    const regionById = await getRegionById(requestedRegionId);
    if (regionById) {
      return {
        regionCode: regionById.code,
        regionName: regionById.name ?? requestedRegionId,
      };
    }
  }

  return {
    regionCode: requestedRegionCode || requestedRegionId,
    regionName: requestedRegionCode || requestedRegionId,
  };
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const createAnalysisReport = async (
  payload: unknown
): Promise<AnalysisReportResponse> => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid request body');
  }

  const body = payload as AnalysisReportRequest;
  const { regionCode, regionName: resolvedRegionName } = await resolveRegionFromRequest(body);

  if (!body.metrics || !validateRequestMetrics(body.metrics)) {
    throw new Error('metrics must be numbers between 0 and 100');
  }

  const scenario = decideScenario(body.metrics);
  const score = calculatePriority(body.metrics);
  const policyDocument = await generatePolicyDocument(resolvedRegionName, body.metrics, scenario, score.priorityScore);

  const scoringEvidence = makeEvidence(body.metrics, scenario);
  const confidence = clampPercent(
    Number.isFinite(policyDocument.confidence)
      ? policyDocument.confidence
      : score.priorityScore
  );

  return {
    regionCode,
    priorityScore: score.priorityScore,
    recommendedScenario: scenario,
    summary: policyDocument.summary,
    evidence: mergeEvidence(policyDocument.evidence, scoringEvidence),
    risks: policyDocument.risks,
    actionPlan: policyDocument.actionPlan,
    confidence,
    metrics: body.metrics,
    weightedScores: score.contributions,
    reportVersion: 2,
    model: GEMINI_MODEL,
    generatedAt: new Date().toISOString(),
    traceId: createTraceId(),
    regionName: resolvedRegionName,
    executiveSummary: policyDocument.executiveSummary,
  };
};
