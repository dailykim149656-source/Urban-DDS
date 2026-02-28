import { FieldValue } from 'firebase-admin/firestore';

import { AnalysisReportResponse, AnalysisScenario } from '../../types/contract';
import { getRegionByCode, getRegionById } from '../adapters/regionDataAdapter';
import { getFirestoreClient } from './firebaseAdmin';

export interface PersistAnalysisReportInput {
  ownerUserId: string;
  ownerEmail?: string;
  regionCode: string;
  regionName?: string;
  report: AnalysisReportResponse;
}

export interface PersistAnalysisReportResult {
  saved: boolean;
  documentId?: string;
  reason?: string;
}

export interface ListAnalysisReportsResult {
  items: Array<{
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
  }>;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';

const resolveCanonicalRegionMetadata = async (
  candidateRegionCode: string,
  fallbackRegionName?: string
): Promise<{ regionCode: string; regionName: string }> => {
  const trimmed = candidateRegionCode.trim();
  if (!trimmed) {
    return {
      regionCode: '',
      regionName: fallbackRegionName ?? '',
    };
  }

  const byCode = await getRegionByCode(trimmed);
  if (byCode) {
    return {
      regionCode: byCode.code,
      regionName: fallbackRegionName ?? byCode.name ?? trimmed,
    };
  }

  const byId = await getRegionById(trimmed);
  if (byId) {
    return {
      regionCode: byId.code,
      regionName: fallbackRegionName ?? byId.name ?? trimmed,
    };
  }

  return {
    regionCode: trimmed,
    regionName: fallbackRegionName ?? trimmed,
  };
};

export const persistAnalysisReport = async (
  input: PersistAnalysisReportInput
): Promise<PersistAnalysisReportResult> => {
  const firestore = getFirestoreClient();
  if (!firestore) {
    return { saved: false, reason: 'firestore-disabled-or-not-configured' };
  }

  try {
    const regionCode = input.regionCode.trim();
    const canonicalRegion = await resolveCanonicalRegionMetadata(regionCode, input.regionName);
    const document = {
      ownerUserId: input.ownerUserId,
      ownerEmail: input.ownerEmail ?? null,
      regionCode: canonicalRegion.regionCode,
      regionName: canonicalRegion.regionName,
      priorityScore: input.report.priorityScore,
      recommendedScenario: input.report.recommendedScenario,
      summary: input.report.summary,
      executiveSummary: input.report.executiveSummary,
      evidence: input.report.evidence,
      risks: input.report.risks,
      actionPlan: input.report.actionPlan,
      confidence: input.report.confidence,
      weightedScores: input.report.weightedScores,
      metrics: input.report.metrics,
      createdAt: FieldValue.serverTimestamp(),
      reportVersion: input.report.reportVersion ?? 2,
      model: input.report.model ?? 'unknown',
      generatedAt: input.report.generatedAt ?? null,
      traceId: input.report.traceId ?? null,
      source: 'api-analysis-report',
    };

    const docRef = await firestore.collection('analysis_reports').add({
      ...document,
    });

    return { saved: true, documentId: docRef.id };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`[firestore] failed to persist analysis report: ${message}`);
    return { saved: false, reason: message };
  }
};

const toIsoDate = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === 'function') {
      const date = candidate.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return undefined;
};

const toAnalysisScenario = (value: unknown): AnalysisScenario => {
  return value === 'full_redevelopment' ||
    value === 'selective_redevelopment' ||
    value === 'phased_redevelopment'
    ? value
    : 'phased_redevelopment';
};

export const listRecentAnalysisReports = async (
  limit = 20,
  ownerUserId?: string
): Promise<ListAnalysisReportsResult> => {
  const firestore = getFirestoreClient();
  if (!firestore || !ownerUserId) {
    return { items: [] };
  }

  try {
    const snapshot = await firestore
      .collection('analysis_reports')
      .where('ownerUserId', '==', ownerUserId)
      .orderBy('createdAt', 'desc')
      .limit(Math.max(1, Math.min(100, limit)))
      .get();

    const items = snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;

      return {
        id: doc.id,
        regionCode: typeof data.regionCode === 'string' ? data.regionCode : 'unknown',
        regionName: typeof data.regionName === 'string' ? data.regionName : 'unknown',
        recommendedScenario: toAnalysisScenario(data.recommendedScenario),
        summary: typeof data.summary === 'string' ? data.summary : '',
        executiveSummary:
          typeof data.executiveSummary === 'string' ? data.executiveSummary : undefined,
        priorityScore: typeof data.priorityScore === 'number' ? data.priorityScore : 0,
        confidence:
          typeof data.confidence === 'number' ? data.confidence : undefined,
        model: typeof data.model === 'string' ? data.model : undefined,
        reportVersion:
          typeof data.reportVersion === 'number' ? data.reportVersion : undefined,
        createdAt: toIsoDate(data.createdAt),
      };
    });

    return { items };
  } catch (error) {
    console.warn(
      `[firestore] failed to list analysis reports: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
    return { items: [] };
  }
};
