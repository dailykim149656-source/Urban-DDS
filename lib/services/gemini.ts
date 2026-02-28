import { RegionMetrics } from '../../types/domain';
import { Scenario } from '../scoring';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_MODE = (process.env.GEMINI_API_MODE || 'googleai').toLowerCase();
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';
const VERTEX_PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.GCP_PROJECT_ID ||
  '';

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const getApiKey = (): string | undefined =>
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;

const isVertexMode = (): boolean => GEMINI_API_MODE === 'vertex';

export interface PolicyActionItem {
  phase: string;
  task: string;
  owner: string;
  timeline: string;
}

export interface PolicyDocument {
  summary: string;
  executiveSummary: string;
  evidence: string[];
  risks: string[];
  actionPlan: PolicyActionItem[];
  confidence: number;
}

const buildPrompt = (
  regionId: string,
  metrics: RegionMetrics,
  scenario: Scenario,
  score: number
): string => {
  return `
You are a Korean public policy analyst and must return JSON only.
Return a strict JSON object with keys:
- executiveSummary (string)
- risks (array of short Korean strings, 2~4 items)
- actionPlan (array of objects: phase, task, owner, timeline)
- confidence (number 0~100)

Region: ${regionId}
Aging Score: ${metrics.agingScore}
Infrastructure Risk: ${metrics.infraRisk}
Market Score: ${metrics.marketScore}
Policy Fit: ${metrics.policyFit}
Priority Score: ${score}
Recommended Scenario: ${scenario}
`;
};

const POLICY_DOCUMENT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    executiveSummary: { type: 'STRING' },
    evidence: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    risks: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    actionPlan: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          phase: { type: 'STRING' },
          task: { type: 'STRING' },
          owner: { type: 'STRING' },
          timeline: { type: 'STRING' },
        },
        required: ['phase', 'task', 'owner', 'timeline'],
      },
    },
    confidence: { type: 'INTEGER' },
  },
  required: ['summary', 'executiveSummary', 'evidence', 'risks', 'actionPlan', 'confidence'],
};

const defaultPolicyDocument = (regionId: string, scenario: Scenario): PolicyDocument => ({
  summary: `${scenario}을(를) 우선 검토 대상으로 권장합니다. ${regionId}는 추가 정밀 분석이 필요합니다.`,
  executiveSummary: `${scenario}을(를) 우선 검토 대상으로 권장합니다. ${regionId}는 추가 정밀 분석이 필요합니다.`,
  evidence: [
    `${regionId}의 우선순위 점수를 기준으로 단계적 정책 우선순위 조정이 유효합니다.`,
    '현장 조사항목과 예산 가용성 점검이 선행되어야 합니다.',
  ],
  risks: [
    '데이터 갱신 주기와 산출 근거의 검증 주기가 충분히 반영되었는지 확인이 필요합니다.',
    '사업 대상지 지정 시 주민 협의 반발과 민감도 분석이 선행되어야 합니다.',
  ],
  actionPlan: [
    { phase: '1', task: '지역 현장조사 범위 확정', owner: '정책기획', timeline: '1~2주' },
    { phase: '2', task: '예산 및 행정 영향 분석', owner: '재정지원', timeline: '2~4주' },
    { phase: '3', task: '공청회 및 타당성 확정', owner: '민원지원', timeline: '4~6주' },
  ],
  confidence: 62,
});

const normalizePolicyDocument = (raw: unknown, regionId: string, scenario: Scenario): PolicyDocument => {
  if (!raw || typeof raw !== 'object') {
    return defaultPolicyDocument(regionId, scenario);
  }

  const candidate = raw as {
    summary?: unknown;
    executiveSummary?: unknown;
    evidence?: unknown;
    risks?: unknown;
    actionPlan?: unknown;
    confidence?: unknown;
  };

  const summary = typeof candidate.summary === 'string' ? candidate.summary.trim() : '';
  const executiveSummary =
    typeof candidate.executiveSummary === 'string' ? candidate.executiveSummary.trim() : summary;
  const risks = Array.isArray(candidate.risks)
    ? candidate.risks.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const evidence = Array.isArray(candidate.evidence)
    ? candidate.evidence.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
    : [];

  const actionPlan =
    Array.isArray(candidate.actionPlan) &&
    candidate.actionPlan.every(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        typeof (entry as Record<string, unknown>).phase === 'string' &&
        typeof (entry as Record<string, unknown>).task === 'string' &&
        typeof (entry as Record<string, unknown>).owner === 'string' &&
        typeof (entry as Record<string, unknown>).timeline === 'string'
    )
      ? (candidate.actionPlan as PolicyActionItem[])
      : [];

  const confidence = clampPercent(toNumber(candidate.confidence));
  if (!summary || !executiveSummary || risks.length === 0 || actionPlan.length === 0 || evidence.length === 0) {
    return defaultPolicyDocument(regionId, scenario);
  }

  return {
    summary,
    executiveSummary,
    risks,
    evidence,
    actionPlan,
    confidence: Number.isFinite(confidence) ? confidence : 65,
  };
};

const extractPolicyDocumentJson = (text: string): string | null => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidateText = (fenced?.[1] ?? text).trim();
  const start = candidateText.indexOf('{');
  const end = candidateText.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  return candidateText.slice(start, end + 1).trim();
};

const extractGeneratedText = (data: unknown): string => {
  const payload = data as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' ? text : '';
};

const parsePolicyDocumentFromText = (text: string, regionId: string, scenario: Scenario): PolicyDocument => {
  if (!text || text.trim().length < 10) {
    return defaultPolicyDocument(regionId, scenario);
  }

  const jsonCandidate = extractPolicyDocumentJson(text);
  if (!jsonCandidate) {
    return defaultPolicyDocument(regionId, scenario);
  }

  try {
    const parsed = JSON.parse(jsonCandidate) as unknown;
    return normalizePolicyDocument(parsed, regionId, scenario);
  } catch (_error) {
    return defaultPolicyDocument(regionId, scenario);
  }
};

const requestWithGoogleApi = async (
  endpoint: string,
  payload: Record<string, unknown>
): Promise<string | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return null;
  }

  return extractGeneratedText(await response.json());
};

const requestWithVertex = async (payload: Record<string, unknown>): Promise<string | null> => {
  if (!VERTEX_PROJECT) {
    return null;
  }

  try {
    const metadataResponse = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      {
        headers: {
          'Metadata-Flavor': 'Google',
        },
      }
    );
    if (!metadataResponse.ok) {
      return null;
    }

    const metadata = (await metadataResponse.json()) as { access_token?: string };
    if (!metadata.access_token) {
      return null;
    }

    const response = await fetch(
      `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${metadata.access_token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      return null;
    }

    return extractGeneratedText(await response.json());
  } catch (_error) {
    return null;
  }
};

const buildPayload = (
  regionId: string,
  metrics: RegionMetrics,
  scenario: Scenario,
  score: number,
  useSchema = false
): Record<string, unknown> => {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    maxOutputTokens: 500,
  };

  if (useSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = POLICY_DOCUMENT_RESPONSE_SCHEMA;
  }

  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: buildPrompt(regionId, metrics, scenario, score) }],
      },
    ],
    generationConfig,
  };
};

export const generatePolicyDocument = async (
  regionId: string,
  metrics: RegionMetrics,
  scenario: Scenario,
  score: number
): Promise<PolicyDocument> => {
  const fallbackDocument = defaultPolicyDocument(regionId, scenario);
  const structuredPayload = buildPayload(regionId, metrics, scenario, score, true);
  const fallbackPayload = buildPayload(regionId, metrics, scenario, score, false);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  if (isVertexMode()) {
    const vertexText = await requestWithVertex(structuredPayload);
    if (vertexText) {
      const parsed = parsePolicyDocumentFromText(vertexText, regionId, scenario);
      if (parsed.summary !== fallbackDocument.summary) {
        return parsed;
      }
    }

    const fallbackVertexText = await requestWithVertex(fallbackPayload);
    if (fallbackVertexText) {
      const parsed = parsePolicyDocumentFromText(fallbackVertexText, regionId, scenario);
      if (parsed.summary !== fallbackDocument.summary) {
        return parsed;
      }
    }
  }

  const googleText = await requestWithGoogleApi(endpoint, structuredPayload);
  if (googleText) {
    const parsed = parsePolicyDocumentFromText(googleText, regionId, scenario);
    if (parsed.summary !== fallbackDocument.summary) {
      return parsed;
    }
  }

  const fallbackText = await requestWithGoogleApi(endpoint, fallbackPayload);
  if (fallbackText) {
    const parsed = parsePolicyDocumentFromText(fallbackText, regionId, scenario);
    if (parsed.summary !== fallbackDocument.summary) {
      return parsed;
    }
  }

  return fallbackDocument;
};

export const generatePolicySummary = async (
  regionId: string,
  metrics: RegionMetrics,
  scenario: Scenario,
  score: number
): Promise<string> => {
  const doc = await generatePolicyDocument(regionId, metrics, scenario, score);
  return doc.summary;
};

export { GEMINI_MODEL };
