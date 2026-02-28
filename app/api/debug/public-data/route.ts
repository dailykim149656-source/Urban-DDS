import { NextRequest, NextResponse } from 'next/server';

import {
  getPublicDataResponseMeta,
  isRealDataEnabled,
  listItemsFromPublicData,
} from '../../../../lib/adapters/public/publicDataHttp';

export const dynamic = 'force-dynamic';

type ProbeMode = 'all' | 'trade' | 'building-title' | 'building-recap';

interface ProbeDefinition {
  name: string;
  endpoint: string;
  params: Record<string, string>;
}

interface ProbeResult {
  name: string;
  endpoint: string;
  requestUrl: string;
  ok: boolean;
  httpStatus?: number;
  contentType?: string | null;
  bodyLength?: number;
  bodyPreview?: string;
  resultCode?: string;
  resultMsg?: string;
  totalCount?: number;
  parsedItems?: number;
  jsonParseError?: string;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

const TRADE_ENDPOINT =
  process.env.DATA_GO_KR_APT_TRADE_ENDPOINT ??
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';
const BUILDING_ENDPOINT =
  process.env.DATA_GO_KR_BUILDING_ENDPOINT ??
  'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo';
const NON_FATAL_RESULT_CODES = new Set(['0', '00', '000', '03']);

const normalize = (value: string | null, fallback = ''): string => {
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed || fallback;
};

const toDealYmdNow = (): string => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
};

const toRecapEndpoint = (endpoint: string): string => {
  if (endpoint.includes('/getBrTitleInfo')) {
    return endpoint.replace('/getBrTitleInfo', '/getBrRecapTitleInfo');
  }
  return endpoint;
};

const buildUrl = (endpoint: string, params: Record<string, string>): URL => {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) {
    if (!value) {
      continue;
    }
    url.searchParams.set(key, value);
  }
  return url;
};

const redactServiceKey = (url: URL): string => {
  const safe = new URL(url.toString());
  if (safe.searchParams.has('serviceKey')) {
    safe.searchParams.set('serviceKey', '***');
  }
  return safe.toString();
};

const runProbe = async (definition: ProbeDefinition): Promise<ProbeResult> => {
  const startedAt = new Date().toISOString();

  try {
    const requestUrl = buildUrl(definition.endpoint, definition.params);
    const safeUrl = redactServiceKey(requestUrl);
    const response = await fetch(requestUrl.toString(), {
      cache: 'no-store',
    });

    const bodyText = await response.text();
    let payload: unknown;
    let jsonParseError: string | undefined;

    if (bodyText.length > 0) {
      try {
        payload = JSON.parse(bodyText) as unknown;
      } catch (error) {
        jsonParseError = error instanceof Error ? error.message : 'json-parse-failed';
      }
    } else {
      jsonParseError = 'empty-body';
    }

    const meta = payload ? getPublicDataResponseMeta(payload) : {};
    const parsedItems = payload ? listItemsFromPublicData(payload).length : 0;
    const resultCode = meta.resultCode ?? undefined;
    const nonFatalCode = !resultCode || NON_FATAL_RESULT_CODES.has(resultCode);

    return {
      name: definition.name,
      endpoint: definition.endpoint,
      requestUrl: safeUrl,
      ok: response.ok && nonFatalCode && !jsonParseError,
      httpStatus: response.status,
      contentType: response.headers.get('content-type'),
      bodyLength: bodyText.length,
      bodyPreview: bodyText.slice(0, 240),
      resultCode,
      resultMsg: meta.resultMsg ?? undefined,
      totalCount: meta.totalCount ?? undefined,
      parsedItems,
      jsonParseError,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: definition.name,
      endpoint: definition.endpoint,
      requestUrl: definition.endpoint,
      ok: false,
      error: error instanceof Error ? error.message : 'probe-failed',
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  }
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const serviceKey = normalize(process.env.DATA_GO_KR_SERVICE_KEY ?? null);
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'DATA_GO_KR_SERVICE_KEY is missing' },
      { status: 400 }
    );
  }

  const mode = normalize(request.nextUrl.searchParams.get('mode'), 'all').toLowerCase() as ProbeMode;
  if (!['all', 'trade', 'building-title', 'building-recap'].includes(mode)) {
    return NextResponse.json(
      {
        error: 'invalid mode',
        acceptedModes: ['all', 'trade', 'building-title', 'building-recap'],
      },
      { status: 400 }
    );
  }

  const sigunguCd = normalize(request.nextUrl.searchParams.get('sigunguCd'), '11680');
  const bjdongCd = normalize(request.nextUrl.searchParams.get('bjdongCd'));
  const bun = normalize(request.nextUrl.searchParams.get('bun'));
  const ji = normalize(request.nextUrl.searchParams.get('ji'));
  const lawdCd = normalize(request.nextUrl.searchParams.get('lawdCd'), sigunguCd);
  const dealYmd = normalize(request.nextUrl.searchParams.get('dealYmd'), toDealYmdNow());
  const numOfRows = normalize(request.nextUrl.searchParams.get('numOfRows'), '10');
  const pageNo = normalize(request.nextUrl.searchParams.get('pageNo'), '1');

  const buildingBaseParams: Record<string, string> = {
    serviceKey,
    _type: 'json',
    sigunguCd,
    numOfRows,
    pageNo,
  };
  if (bjdongCd) {
    buildingBaseParams.bjdongCd = bjdongCd;
  }
  if (bun) {
    buildingBaseParams.bun = bun;
  }
  if (ji) {
    buildingBaseParams.ji = ji;
  }

  const definitions: ProbeDefinition[] = [];
  if (mode === 'all' || mode === 'trade') {
    definitions.push({
      name: 'apartment-trade',
      endpoint: TRADE_ENDPOINT,
      params: {
        serviceKey,
        _type: 'json',
        LAWD_CD: lawdCd,
        DEAL_YMD: dealYmd,
        numOfRows,
        pageNo,
      },
    });
  }
  if (mode === 'all' || mode === 'building-title') {
    definitions.push({
      name: 'building-title',
      endpoint: BUILDING_ENDPOINT,
      params: buildingBaseParams,
    });
  }
  if (mode === 'all' || mode === 'building-recap') {
    definitions.push({
      name: 'building-recap',
      endpoint: toRecapEndpoint(BUILDING_ENDPOINT),
      params: buildingBaseParams,
    });
  }

  const probes = await Promise.all(definitions.map((definition) => runProbe(definition)));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    mode,
    realDataEnabled: isRealDataEnabled(),
    inputs: {
      sigunguCd,
      bjdongCd: bjdongCd || null,
      bun: bun || null,
      ji: ji || null,
      lawdCd,
      dealYmd,
      numOfRows,
      pageNo,
    },
    probes,
  });
}

