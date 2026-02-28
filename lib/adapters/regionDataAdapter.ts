import { RegionDataRecord } from '../../types/domain';

const toCode = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const toSearchToken = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '')
    .trim();

const hasMeaningfulToken = (value: string): boolean => value.length > 0;
export const hasMeaningfulAddressInput = (value: string): boolean => hasMeaningfulToken(toSearchToken(value));

const mockRegions: RegionDataRecord[] = [
  {
    id: 'seoul',
    code: 'seoul',
    name: '서울특별시',
    level: 'city',
    addressHint: '서울특별시',
    metrics: {
      agingScore: 72,
      infraRisk: 70,
      marketScore: 68,
      policyFit: 75,
    },
    source: 'mock',
    lastUpdated: '2026-02-28T00:00:00.000Z',
  },
  {
    id: 'gangnam-daechi',
    code: 'gangnam-daechi',
    name: '서울 강남구 대치동',
    level: 'dong',
    parentRegionId: 'seoul',
    addressHint: '서울 강남구 대치동',
    metrics: {
      agingScore: 82,
      infraRisk: 74,
      marketScore: 68,
      policyFit: 77,
    },
    source: 'mock',
    lastUpdated: '2026-02-28T00:00:00.000Z',
  },
  {
    id: 'gangbuk-target',
    code: 'gangbuk-target',
    name: '서울 강북구 미아동 정비구역',
    level: 'gu',
    parentRegionId: 'seoul',
    addressHint: '서울 강북구 미아동',
    metrics: {
      agingScore: 91,
      infraRisk: 88,
      marketScore: 54,
      policyFit: 95,
    },
    source: 'mock',
    lastUpdated: '2026-02-28T00:00:00.000Z',
  },
];

export const getMockRegions = (): RegionDataRecord[] => [...mockRegions];

export const getRegionByCode = async (regionCode: string): Promise<RegionDataRecord | undefined> => {
  const normalized = toCode(regionCode);
  if (!hasMeaningfulToken(normalized)) {
    return undefined;
  }
  return mockRegions.find((region) => toCode(region.code) === normalized);
};

export const getRegionById = async (regionId: string): Promise<RegionDataRecord | undefined> => {
  const normalized = toCode(regionId);
  if (!hasMeaningfulToken(normalized)) {
    return undefined;
  }
  return mockRegions.find((region) => toCode(region.id) === normalized);
};

export const resolveRegionByAddress = async (address: string): Promise<RegionDataRecord | undefined> => {
  const normalized = toSearchToken(address);
  if (!hasMeaningfulToken(normalized)) {
    return undefined;
  }

  const tokenized = mockRegions.map((region) => ({
    region,
    nameToken: toSearchToken(region.name),
    addressToken: toSearchToken(region.addressHint),
    codeToken: toCode(region.code),
  }));

  const exactMatch =
    tokenized.find((entry) => entry.nameToken === normalized) ??
    tokenized.find((entry) => entry.addressToken === normalized) ??
    tokenized.find((entry) => entry.codeToken === normalized);

  if (exactMatch) {
    return exactMatch.region;
  }

  return (
    tokenized.find((entry) => entry.nameToken.includes(normalized) || entry.addressToken.includes(normalized))?.region ??
    tokenized.find((entry) => entry.codeToken.includes(normalized))?.region ??
    undefined
  );
};
