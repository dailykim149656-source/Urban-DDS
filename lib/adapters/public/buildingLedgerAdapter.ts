import { BuildingFacts, BuildingLookupKey } from '../../../types/domain';
import {
  average,
  getPublicDataResponseMeta,
  isRealDataEnabled,
  listItemsFromPublicData,
  requestPublicDataJson,
  toLooseNumber,
  toYear,
} from './publicDataHttp';

const BUILDING_ENDPOINT =
  process.env.DATA_GO_KR_BUILDING_ENDPOINT ??
  'https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo';

const YEAR_KEYS = ['useAprDay', 'useAprDt', 'pmsDay', 'crtnDay'] as const;
const AREA_KEYS = ['totArea', 'totarea', 'archArea', 'platArea', 'vlRatEstmTotArea'] as const;
const FAR_KEYS = ['vlRat', 'vlrat', 'flrAreaRat', 'floorAreaRatio'] as const;

const toRecapEndpoint = (endpoint: string): string => {
  if (endpoint.includes('/getBrTitleInfo')) {
    return endpoint.replace('/getBrTitleInfo', '/getBrRecapTitleInfo');
  }
  return endpoint;
};

export type BuildingFactsMissingReason =
  | 'disabled'
  | 'missing-lookup'
  | 'no-data'
  | 'request-failed';

export interface BuildingFactsFetchResult {
  facts: BuildingFacts | null;
  reason?: BuildingFactsMissingReason;
  attempts: number;
}

const pickByKeys = (
  item: Record<string, unknown>,
  keys: readonly string[]
): unknown => {
  for (const key of keys) {
    if (key in item) {
      return item[key];
    }
  }
  return undefined;
};

const toBuildingFacts = (items: Record<string, unknown>[]): BuildingFacts | null => {
  if (!items.length) {
    return null;
  }

  const years: number[] = [];
  const grossAreas: number[] = [];
  const floorAreaRatios: number[] = [];

  for (const item of items) {
    const year = toYear(pickByKeys(item, YEAR_KEYS));
    if (typeof year === 'number') {
      years.push(year);
    }

    const area = toLooseNumber(pickByKeys(item, AREA_KEYS));
    if (typeof area === 'number') {
      grossAreas.push(area);
    }

    const far = toLooseNumber(pickByKeys(item, FAR_KEYS));
    if (typeof far === 'number') {
      floorAreaRatios.push(far);
    }
  }

  return {
    avgCompletionYear: average(years),
    avgGrossArea: average(grossAreas),
    avgFloorAreaRatio: average(floorAreaRatios),
    sampleSize: items.length,
    source: 'data-go-kr-building-ledger',
  };
};

const fetchFactsByParams = async (
  params: Record<string, string | number | undefined>,
  endpoint = BUILDING_ENDPOINT
): Promise<{
  facts: BuildingFacts | null;
  meta: ReturnType<typeof getPublicDataResponseMeta>;
}> => {
  const payload = await requestPublicDataJson(endpoint, params);
  const meta = getPublicDataResponseMeta(payload);
  const items = listItemsFromPublicData(payload);
  return {
    facts: toBuildingFacts(items),
    meta,
  };
};

export const fetchBuildingLedgerFactsWithMeta = async (
  lookup?: BuildingLookupKey
): Promise<BuildingFactsFetchResult> => {
  if (!isRealDataEnabled()) {
    return {
      facts: null,
      reason: 'disabled',
      attempts: 0,
    };
  }

  if (!lookup) {
    return {
      facts: null,
      reason: 'missing-lookup',
      attempts: 0,
    };
  }

  const sigunguCd = lookup.sigunguCd?.trim();
  if (!sigunguCd) {
    return {
      facts: null,
      reason: 'missing-lookup',
      attempts: 0,
    };
  }

  const bjdongCd = lookup.bjdongCd?.trim();
  const candidates: Array<{
    endpoint: string;
    params: Record<string, string | number | undefined>;
  }> = [];

  if (bjdongCd) {
    candidates.push({
      endpoint: BUILDING_ENDPOINT,
      params: {
        sigunguCd,
        bjdongCd,
        platGbCd: lookup.platGbCd ?? '0',
        bun: lookup.bun ?? '0000',
        ji: lookup.ji ?? '0000',
        numOfRows: 100,
        pageNo: 1,
      },
    });
    candidates.push({
      endpoint: BUILDING_ENDPOINT,
      params: {
        sigunguCd,
        bjdongCd,
        platGbCd: lookup.platGbCd ?? '0',
        numOfRows: 100,
        pageNo: 1,
      },
    });
  }

  candidates.push({
    endpoint: BUILDING_ENDPOINT,
    params: {
      sigunguCd,
      numOfRows: 100,
      pageNo: 1,
    },
  });

  candidates.push({
    endpoint: toRecapEndpoint(BUILDING_ENDPOINT),
    params: {
      sigunguCd,
      numOfRows: 100,
      pageNo: 1,
    },
  });

  let hadRequestError = false;
  let attempts = 0;
  let lastNoDataMeta: ReturnType<typeof getPublicDataResponseMeta> | undefined;

  for (const candidate of candidates) {
    attempts += 1;
    try {
      const result = await fetchFactsByParams(candidate.params, candidate.endpoint);
      if (result.facts) {
        return {
          facts: result.facts,
          attempts,
        };
      }
      lastNoDataMeta = result.meta;
    } catch (error) {
      hadRequestError = true;
      console.warn(
        `[public-data] building ledger fetch failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`
      );
    }
  }

  if (!hadRequestError) {
    console.info(
      `[public-data] building ledger no-data: code=${lastNoDataMeta?.resultCode ?? 'n/a'} msg=${
        lastNoDataMeta?.resultMsg ?? 'n/a'
      } totalCount=${typeof lastNoDataMeta?.totalCount === 'number' ? lastNoDataMeta.totalCount : 'n/a'}`
    );
  }

  return {
    facts: null,
    reason: hadRequestError ? 'request-failed' : 'no-data',
    attempts,
  };
};

export const fetchBuildingLedgerFacts = async (
  lookup?: BuildingLookupKey
): Promise<BuildingFacts | null> => {
  const result = await fetchBuildingLedgerFactsWithMeta(lookup);
  return result.facts;
};
