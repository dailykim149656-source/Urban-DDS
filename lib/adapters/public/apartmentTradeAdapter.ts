import { TradeFacts } from '../../../types/domain';
import {
  average,
  isRealDataEnabled,
  listItemsFromPublicData,
  median,
  requestPublicDataJson,
  toLooseNumber,
} from './publicDataHttp';

const APT_TRADE_ENDPOINT =
  process.env.DATA_GO_KR_APT_TRADE_ENDPOINT ??
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';

const DEAL_AMOUNT_KEYS = [
  '\uac70\ub798\uae08\uc561',
  '\uac70\ub798\uae08\uc561(\ub9cc\uc6d0)',
  'dealAmount',
  'dealamount',
] as const;
const EXCLUSIVE_AREA_KEYS = [
  '\uc804\uc6a9\uba74\uc801',
  'excluUseAr',
  'excluusear',
] as const;

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

const toDealYmdList = (months: number): string[] => {
  const result: string[] = [];
  const current = new Date();
  current.setDate(1);

  for (let i = months - 1; i >= 0; i -= 1) {
    const target = new Date(current);
    target.setMonth(target.getMonth() - i);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    result.push(`${year}${month}`);
  }

  return result;
};

interface TradeSample {
  amount: number;
  area?: number;
}

export const fetchApartmentTradeFacts = async (
  lawdCode?: string,
  months = 3
): Promise<TradeFacts | null> => {
  if (!isRealDataEnabled() || !lawdCode) {
    return null;
  }

  const trimmedLawdCode = lawdCode.trim();
  if (!trimmedLawdCode) {
    return null;
  }

  const monthKeys = toDealYmdList(Math.max(1, months));
  const monthAverages: number[] = [];
  const samples: TradeSample[] = [];
  let hadRequestError = false;

  for (const dealYmd of monthKeys) {
    try {
      const payload = await requestPublicDataJson(APT_TRADE_ENDPOINT, {
        LAWD_CD: trimmedLawdCode,
        DEAL_YMD: dealYmd,
        numOfRows: 999,
        pageNo: 1,
      });

      const items = listItemsFromPublicData(payload);
      const monthAmounts: number[] = [];

      for (const item of items) {
        const amount = toLooseNumber(pickByKeys(item, DEAL_AMOUNT_KEYS));
        if (typeof amount !== 'number') {
          continue;
        }
        const area = toLooseNumber(pickByKeys(item, EXCLUSIVE_AREA_KEYS));
        samples.push({ amount, area });
        monthAmounts.push(amount);
      }

      const monthAverage = average(monthAmounts);
      if (typeof monthAverage === 'number') {
        monthAverages.push(monthAverage);
      }
    } catch (error) {
      hadRequestError = true;
      console.warn(
        `[public-data] apartment trade fetch failed (${dealYmd}): ${
          error instanceof Error ? error.message : 'unknown'
        }`
      );
    }
  }

  if (!samples.length) {
    if (hadRequestError) {
      console.warn('[public-data] apartment trade no usable samples after request errors');
    }
    return null;
  }

  const amounts = samples.map((sample) => sample.amount);
  const unitPrices = samples
    .filter((sample): sample is Required<TradeSample> => typeof sample.area === 'number' && sample.area > 0)
    .map((sample) => sample.amount / sample.area);

  let priceTrend3m: number | undefined;
  if (monthAverages.length >= 2) {
    const first = monthAverages[0];
    const last = monthAverages[monthAverages.length - 1];
    if (first > 0) {
      priceTrend3m = Number((((last - first) / first) * 100).toFixed(2));
    }
  }

  return {
    avgDealAmount: average(amounts),
    medianDealAmount: median(amounts),
    avgPricePerArea: average(unitPrices),
    dealCount: samples.length,
    priceTrend3m,
    period: `${monthKeys[0]}~${monthKeys[monthKeys.length - 1]}`,
    source: 'data-go-kr-apartment-trade',
  };
};
