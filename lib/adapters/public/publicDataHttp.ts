const DEFAULT_TIMEOUT_MS = 8000;
const NON_FATAL_RESULT_CODES = new Set(['0', '00', '000', '03']);

const getTimeoutMs = (): number => {
  const raw = process.env.DATA_GO_KR_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  return Math.round(parsed);
};

const normalizeKey = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const getServiceKey = (): string => {
  return normalizeKey(process.env.DATA_GO_KR_SERVICE_KEY);
};

export const isRealDataEnabled = (): boolean =>
  (process.env.REALDATA_ENABLED ?? 'false').toLowerCase() === 'true';

const toSearchParams = (params: Record<string, string | number | undefined>): URLSearchParams => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    const asString = String(value).trim();
    if (!asString) {
      continue;
    }
    searchParams.set(key, asString);
  }
  return searchParams;
};

const OVERRIDABLE_QUERY_KEYS = new Set(
  [
    'servicekey',
    '_type',
    'numofrows',
    'pageno',
    'sigungucd',
    'bjdongcd',
    'platgbcd',
    'bun',
    'ji',
    'lawd_cd',
    'deal_ymd',
  ].map((key) => key.toLowerCase())
);

export interface PublicDataResponseMeta {
  resultCode?: string;
  resultMsg?: string;
  totalCount?: number;
}

export const getPublicDataResponseMeta = (payload: unknown): PublicDataResponseMeta => {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const root = payload as Record<string, unknown>;
  const responseNode = root.response as Record<string, unknown> | undefined;
  const header = responseNode?.header as Record<string, unknown> | undefined;
  const body =
    (responseNode?.body as Record<string, unknown> | undefined) ??
    (root.body as Record<string, unknown> | undefined);

  const resultCode = typeof header?.resultCode === 'string' ? header.resultCode.trim() : undefined;
  const resultMsg = typeof header?.resultMsg === 'string' ? header.resultMsg.trim() : undefined;
  const rawTotalCount = body?.totalCount;
  const totalCount =
    typeof rawTotalCount === 'number'
      ? rawTotalCount
      : typeof rawTotalCount === 'string'
      ? Number(rawTotalCount)
      : undefined;

  return {
    resultCode,
    resultMsg,
    totalCount: Number.isFinite(totalCount as number) ? Number(totalCount) : undefined,
  };
};

const buildPublicDataUrl = (
  endpoint: string,
  params: Record<string, string | number | undefined>
): string => {
  const dynamicQuery = toSearchParams(params);
  const cleanEndpoint = endpoint.trim();

  try {
    const parsed = new URL(cleanEndpoint);
    const merged = new URLSearchParams();

    for (const [key, value] of parsed.searchParams.entries()) {
      if (OVERRIDABLE_QUERY_KEYS.has(key.toLowerCase())) {
        continue;
      }
      merged.set(key, value);
    }

    for (const [key, value] of dynamicQuery.entries()) {
      merged.set(key, value);
    }

    parsed.search = merged.toString();
    return parsed.toString();
  } catch {
    const base = cleanEndpoint.replace(/[?&]+$/, '');
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}${dynamicQuery.toString()}`;
  }
};

export const requestPublicDataJson = async (
  endpoint: string,
  params: Record<string, string | number | undefined>
): Promise<unknown> => {
  const serviceKey = getServiceKey();
  if (!serviceKey) {
    throw new Error('DATA_GO_KR_SERVICE_KEY is missing');
  }

  const requestParams = {
    ...params,
    serviceKey,
    _type: 'json',
  };
  const requestUrl = buildPublicDataUrl(endpoint, requestParams);

  const timeoutMs = getTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(requestUrl, {
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`public-data-request-failed:${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const meta = getPublicDataResponseMeta(payload);
    if (meta.resultCode && !NON_FATAL_RESULT_CODES.has(meta.resultCode)) {
      throw new Error(`public-data-api-error:${meta.resultCode}:${meta.resultMsg || 'unknown'}`);
    }

    return payload;
  } finally {
    clearTimeout(timer);
  }
};

export const listItemsFromPublicData = (payload: unknown): Record<string, unknown>[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const maybeRoot = payload as Record<string, unknown>;
  const maybeResponse = maybeRoot.response as Record<string, unknown> | undefined;
  const maybeBody =
    (maybeResponse?.body as Record<string, unknown> | undefined) ??
    (maybeRoot.body as Record<string, unknown> | undefined);
  const maybeItems = maybeBody?.items as Record<string, unknown> | undefined;
  const maybeItem = maybeItems?.item;

  if (Array.isArray(maybeItem)) {
    return maybeItem.filter((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === 'object')
    );
  }

  if (maybeItem && typeof maybeItem === 'object') {
    return [maybeItem as Record<string, unknown>];
  }

  if (Array.isArray(maybeItems)) {
    return maybeItems.filter((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === 'object')
    );
  }

  return [];
};

export const toLooseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(/,/g, '').replace(/\s+/g, '').trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const toYear = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const asInt = Math.trunc(value);
    if (asInt >= 1900 && asInt <= 2100) {
      return asInt;
    }
    const asString = String(asInt);
    if (asString.length >= 4) {
      const year = Number(asString.slice(0, 4));
      return Number.isFinite(year) ? year : undefined;
    }
    return undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) {
    return undefined;
  }
  const year = Number(digits.slice(0, 4));
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return undefined;
  }
  return year;
};

export const average = (values: number[]): number | undefined => {
  if (!values.length) {
    return undefined;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Number((sum / values.length).toFixed(2));
};

export const median = (values: number[]): number | undefined => {
  if (!values.length) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(2));
};
