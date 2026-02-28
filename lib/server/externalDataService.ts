import { BuildingFacts, BuildingLookupKey, RegionMetrics, TradeFacts } from '../../types/domain';
import { fetchApartmentTradeFacts } from '../adapters/public/apartmentTradeAdapter';
import {
  BuildingFactsMissingReason,
  fetchBuildingLedgerFactsWithMeta,
} from '../adapters/public/buildingLedgerAdapter';
import { RegionDataRecord } from '../../types/domain';

const clamp = (value: number): number => Math.max(0, Math.min(100, value));
const round = (value: number): number => Number(value.toFixed(2));
const DEFAULT_GU_BJDONG_SEEDS = ['10100', '10200', '10300'] as const;
const GU_BJDONG_SEEDS_BY_CODE: Record<string, readonly string[]> = {
  'gangnam-gu': ['10300', '10600', '10100'],
  'gangbuk-gu': ['10300', '10100', '10200'],
  'mapo-gu': ['10100', '10200', '10300'],
  'haeundae-gu': ['10100', '10200', '10300'],
  'yeonsu-gu': ['10100', '10200', '10300'],
  'yuseong-gu': ['10100', '10200', '10300'],
};

export interface RegionExternalFacts {
  buildingFacts: BuildingFacts | null;
  tradeFacts: TradeFacts | null;
  dataSource: string[];
  buildingFactsStatus?: 'ok' | BuildingFactsMissingReason;
  buildingFactsAttempts?: number;
}

const computeAgingIndexFromBuildingFacts = (buildingFacts: BuildingFacts): number | undefined => {
  if (!buildingFacts.avgCompletionYear) {
    return undefined;
  }

  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - buildingFacts.avgCompletionYear);
  const ageIndex = clamp((age / 45) * 100);
  const farIndex =
    typeof buildingFacts.avgFloorAreaRatio === 'number'
      ? clamp(buildingFacts.avgFloorAreaRatio / 3)
      : ageIndex;

  return round(ageIndex * 0.75 + farIndex * 0.25);
};

const computeMarketIndexFromTradeFacts = (tradeFacts: TradeFacts): number | undefined => {
  if (typeof tradeFacts.avgDealAmount !== 'number' || tradeFacts.dealCount <= 0) {
    return undefined;
  }

  const priceIndex = clamp((tradeFacts.avgDealAmount / 120000) * 100);
  const volumeIndex = clamp((tradeFacts.dealCount / 30) * 100);
  const trendIndex =
    typeof tradeFacts.priceTrend3m === 'number'
      ? clamp(50 + tradeFacts.priceTrend3m * 5)
      : 50;

  return round(priceIndex * 0.5 + volumeIndex * 0.25 + trendIndex * 0.25);
};

const toSigunguCd = (lawdCode?: string): string | undefined => {
  if (!lawdCode) {
    return undefined;
  }
  const normalized = lawdCode.replace(/\D/g, '').slice(0, 5);
  return normalized || undefined;
};

const dedupeBuildingLookups = (lookups: BuildingLookupKey[]): BuildingLookupKey[] => {
  const seen = new Set<string>();
  const deduped: BuildingLookupKey[] = [];

  for (const lookup of lookups) {
    const signature = [
      lookup.sigunguCd,
      lookup.bjdongCd ?? '',
      lookup.platGbCd ?? '',
      lookup.bun ?? '',
      lookup.ji ?? '',
    ].join('|');
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(lookup);
  }

  return deduped;
};

const deriveBuildingLookupCandidates = (region: RegionDataRecord): BuildingLookupKey[] => {
  const candidates: BuildingLookupKey[] = [];

  if (region.buildingLookup?.sigunguCd) {
    candidates.push(region.buildingLookup);
  }

  const sigunguCd = toSigunguCd(region.lawdCode);
  if (!sigunguCd) {
    return dedupeBuildingLookups(candidates);
  }

  if (region.level === 'gu') {
    const normalizedRegionCode = region.code.trim().toLowerCase();
    const seeds = GU_BJDONG_SEEDS_BY_CODE[normalizedRegionCode] ?? DEFAULT_GU_BJDONG_SEEDS;
    for (const bjdongCd of seeds) {
      candidates.push({
        sigunguCd,
        bjdongCd,
      });
    }
  }

  candidates.push({
    sigunguCd,
  });

  return dedupeBuildingLookups(candidates);
};

interface BuildingFetchAggregateResult {
  facts: BuildingFacts | null;
  reason?: BuildingFactsMissingReason;
  attempts: number;
}

const collectBuildingFactsWithFallbacks = async (
  candidates: BuildingLookupKey[]
): Promise<BuildingFetchAggregateResult> => {
  if (!candidates.length) {
    return {
      facts: null,
      reason: 'missing-lookup',
      attempts: 0,
    };
  }

  let attempts = 0;
  let reason: BuildingFactsMissingReason = 'missing-lookup';

  for (const lookup of candidates) {
    const result = await fetchBuildingLedgerFactsWithMeta(lookup);
    attempts += result.attempts;

    if (result.facts) {
      return {
        facts: result.facts,
        attempts,
      };
    }

    if (result.reason === 'disabled') {
      return {
        facts: null,
        reason: 'disabled',
        attempts,
      };
    }

    if (result.reason === 'request-failed') {
      reason = 'request-failed';
      continue;
    }

    if (reason !== 'request-failed' && result.reason) {
      reason = result.reason;
    }
  }

  return {
    facts: null,
    reason,
    attempts,
  };
};

export const mergeMetricsWithExternalFacts = (
  baseMetrics: RegionMetrics,
  externalFacts: RegionExternalFacts
): RegionMetrics => {
  const agingFromBuilding = externalFacts.buildingFacts
    ? computeAgingIndexFromBuildingFacts(externalFacts.buildingFacts)
    : undefined;
  const marketFromTrade = externalFacts.tradeFacts
    ? computeMarketIndexFromTradeFacts(externalFacts.tradeFacts)
    : undefined;

  return {
    agingScore:
      typeof agingFromBuilding === 'number'
        ? round(baseMetrics.agingScore * 0.6 + agingFromBuilding * 0.4)
        : baseMetrics.agingScore,
    infraRisk: baseMetrics.infraRisk,
    marketScore:
      typeof marketFromTrade === 'number'
        ? round(baseMetrics.marketScore * 0.6 + marketFromTrade * 0.4)
        : baseMetrics.marketScore,
    policyFit: baseMetrics.policyFit,
  };
};

export const collectRegionExternalFacts = async (
  region: RegionDataRecord
): Promise<RegionExternalFacts> => {
  const buildingLookupCandidates = deriveBuildingLookupCandidates(region);
  const tradeFactsPromise = fetchApartmentTradeFacts(region.lawdCode, 3);
  const buildingResult = await collectBuildingFactsWithFallbacks(buildingLookupCandidates);
  const tradeFacts = await tradeFactsPromise;
  const buildingFacts = buildingResult.facts;

  const dataSource: string[] = [];
  if (buildingFacts) {
    dataSource.push(buildingFacts.source);
  }
  if (tradeFacts) {
    dataSource.push(tradeFacts.source);
  }

  return {
    buildingFacts,
    tradeFacts,
    dataSource,
    buildingFactsStatus: buildingFacts ? 'ok' : buildingResult.reason,
    buildingFactsAttempts: buildingResult.attempts,
  };
};
