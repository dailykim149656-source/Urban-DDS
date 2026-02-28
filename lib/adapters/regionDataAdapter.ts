import { RegionDataRecord } from '../../types/domain';

const NOW_ISO = '2026-02-28T00:00:00.000Z';

const toCode = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '');

const toSearchToken = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '')
    .trim();

const hasMeaningfulToken = (value: string): boolean => value.length > 0;
export const hasMeaningfulAddressInput = (value: string): boolean => hasMeaningfulToken(toSearchToken(value));

interface CitySeed {
  id: string;
  code: string;
  name: string;
  addressHint: string;
  aliases: string[];
  center: { lat: number; lng: number };
  lawdCode: string;
}

interface GuSeed {
  id: string;
  code: string;
  cityId: string;
  name: string;
  addressHint: string;
  aliases: string[];
  center: { lat: number; lng: number };
  lawdCode: string;
}

const citySeeds: CitySeed[] = [
  {
    id: 'seoul',
    code: 'seoul',
    name: '서울특별시',
    addressHint: '서울',
    aliases: ['서울', '서울특별시', 'seoul'],
    center: { lat: 37.5665, lng: 126.978 },
    lawdCode: '11110',
  },
  {
    id: 'busan',
    code: 'busan',
    name: '부산광역시',
    addressHint: '부산',
    aliases: ['부산', '부산광역시', 'busan'],
    center: { lat: 35.1796, lng: 129.0756 },
    lawdCode: '26110',
  },
  {
    id: 'daegu',
    code: 'daegu',
    name: '대구광역시',
    addressHint: '대구',
    aliases: ['대구', '대구광역시', 'daegu'],
    center: { lat: 35.8714, lng: 128.6014 },
    lawdCode: '27110',
  },
  {
    id: 'incheon',
    code: 'incheon',
    name: '인천광역시',
    addressHint: '인천',
    aliases: ['인천', '인천광역시', 'incheon'],
    center: { lat: 37.4563, lng: 126.7052 },
    lawdCode: '28110',
  },
  {
    id: 'gwangju',
    code: 'gwangju',
    name: '광주광역시',
    addressHint: '광주',
    aliases: ['광주', '광주광역시', 'gwangju'],
    center: { lat: 35.1595, lng: 126.8526 },
    lawdCode: '29110',
  },
  {
    id: 'daejeon',
    code: 'daejeon',
    name: '대전광역시',
    addressHint: '대전',
    aliases: ['대전', '대전광역시', 'daejeon'],
    center: { lat: 36.3504, lng: 127.3845 },
    lawdCode: '30110',
  },
  {
    id: 'ulsan',
    code: 'ulsan',
    name: '울산광역시',
    addressHint: '울산',
    aliases: ['울산', '울산광역시', 'ulsan'],
    center: { lat: 35.5384, lng: 129.3114 },
    lawdCode: '31110',
  },
  {
    id: 'jeju',
    code: 'jeju',
    name: '제주특별자치도',
    addressHint: '제주',
    aliases: ['제주', '제주도', '제주특별자치도', 'jeju'],
    center: { lat: 33.4996, lng: 126.5312 },
    lawdCode: '50110',
  },
];

const seoulGuSeeds: GuSeed[] = [
  { id: 'seoul-jongno-gu', code: 'jongno-gu', cityId: 'seoul', name: '서울 종로구', addressHint: '종로구', aliases: ['종로구', 'jongno-gu', 'jongno'], center: { lat: 37.5735, lng: 126.979 }, lawdCode: '11110' },
  { id: 'seoul-jung-gu', code: 'jung-gu-seoul', cityId: 'seoul', name: '서울 중구', addressHint: '중구', aliases: ['서울중구', '중구서울', 'jung-gu-seoul'], center: { lat: 37.5641, lng: 126.9979 }, lawdCode: '11140' },
  { id: 'seoul-yongsan-gu', code: 'yongsan-gu', cityId: 'seoul', name: '서울 용산구', addressHint: '용산구', aliases: ['용산구', 'yongsan-gu', 'yongsan'], center: { lat: 37.5325, lng: 126.9905 }, lawdCode: '11170' },
  { id: 'seoul-seongdong-gu', code: 'seongdong-gu', cityId: 'seoul', name: '서울 성동구', addressHint: '성동구', aliases: ['성동구', 'seongdong-gu', 'seongdong'], center: { lat: 37.5633, lng: 127.0365 }, lawdCode: '11200' },
  { id: 'seoul-gwangjin-gu', code: 'gwangjin-gu', cityId: 'seoul', name: '서울 광진구', addressHint: '광진구', aliases: ['광진구', 'gwangjin-gu', 'gwangjin'], center: { lat: 37.5384, lng: 127.0822 }, lawdCode: '11215' },
  { id: 'seoul-dongdaemun-gu', code: 'dongdaemun-gu', cityId: 'seoul', name: '서울 동대문구', addressHint: '동대문구', aliases: ['동대문구', 'dongdaemun-gu', 'dongdaemun'], center: { lat: 37.5744, lng: 127.0395 }, lawdCode: '11230' },
  { id: 'seoul-jungnang-gu', code: 'jungnang-gu', cityId: 'seoul', name: '서울 중랑구', addressHint: '중랑구', aliases: ['중랑구', 'jungnang-gu', 'jungnang'], center: { lat: 37.6063, lng: 127.0927 }, lawdCode: '11260' },
  { id: 'seoul-seongbuk-gu', code: 'seongbuk-gu', cityId: 'seoul', name: '서울 성북구', addressHint: '성북구', aliases: ['성북구', 'seongbuk-gu', 'seongbuk'], center: { lat: 37.5894, lng: 127.0167 }, lawdCode: '11290' },
  { id: 'seoul-gangbuk-gu', code: 'gangbuk-gu', cityId: 'seoul', name: '서울 강북구', addressHint: '강북구', aliases: ['강북구', 'gangbuk-gu', 'gangbuk'], center: { lat: 37.6396, lng: 127.0257 }, lawdCode: '11305' },
  { id: 'seoul-dobong-gu', code: 'dobong-gu', cityId: 'seoul', name: '서울 도봉구', addressHint: '도봉구', aliases: ['도봉구', 'dobong-gu', 'dobong'], center: { lat: 37.6688, lng: 127.0471 }, lawdCode: '11320' },
  { id: 'seoul-nowon-gu', code: 'nowon-gu', cityId: 'seoul', name: '서울 노원구', addressHint: '노원구', aliases: ['노원구', 'nowon-gu', 'nowon'], center: { lat: 37.6542, lng: 127.0568 }, lawdCode: '11350' },
  { id: 'seoul-eunpyeong-gu', code: 'eunpyeong-gu', cityId: 'seoul', name: '서울 은평구', addressHint: '은평구', aliases: ['은평구', 'eunpyeong-gu', 'eunpyeong'], center: { lat: 37.6027, lng: 126.9291 }, lawdCode: '11380' },
  { id: 'seoul-seodaemun-gu', code: 'seodaemun-gu', cityId: 'seoul', name: '서울 서대문구', addressHint: '서대문구', aliases: ['서대문구', 'seodaemun-gu', 'seodaemun'], center: { lat: 37.5791, lng: 126.9368 }, lawdCode: '11410' },
  { id: 'seoul-mapo-gu', code: 'mapo-gu', cityId: 'seoul', name: '서울 마포구', addressHint: '마포구', aliases: ['마포구', 'mapo-gu', 'mapo'], center: { lat: 37.5663, lng: 126.9019 }, lawdCode: '11440' },
  { id: 'seoul-yangcheon-gu', code: 'yangcheon-gu', cityId: 'seoul', name: '서울 양천구', addressHint: '양천구', aliases: ['양천구', 'yangcheon-gu', 'yangcheon'], center: { lat: 37.517, lng: 126.8665 }, lawdCode: '11470' },
  { id: 'seoul-gangseo-gu', code: 'gangseo-gu-seoul', cityId: 'seoul', name: '서울 강서구', addressHint: '강서구', aliases: ['서울강서구', '강서구서울', 'gangseo-gu-seoul'], center: { lat: 37.5509, lng: 126.8495 }, lawdCode: '11500' },
  { id: 'seoul-guro-gu', code: 'guro-gu', cityId: 'seoul', name: '서울 구로구', addressHint: '구로구', aliases: ['구로구', 'guro-gu', 'guro'], center: { lat: 37.4955, lng: 126.8876 }, lawdCode: '11530' },
  { id: 'seoul-geumcheon-gu', code: 'geumcheon-gu', cityId: 'seoul', name: '서울 금천구', addressHint: '금천구', aliases: ['금천구', 'geumcheon-gu', 'geumcheon'], center: { lat: 37.4569, lng: 126.8955 }, lawdCode: '11545' },
  { id: 'seoul-yeongdeungpo-gu', code: 'yeongdeungpo-gu', cityId: 'seoul', name: '서울 영등포구', addressHint: '영등포구', aliases: ['영등포구', 'yeongdeungpo-gu', 'yeongdeungpo'], center: { lat: 37.5264, lng: 126.8962 }, lawdCode: '11560' },
  { id: 'seoul-dongjak-gu', code: 'dongjak-gu', cityId: 'seoul', name: '서울 동작구', addressHint: '동작구', aliases: ['동작구', 'dongjak-gu', 'dongjak'], center: { lat: 37.5124, lng: 126.9393 }, lawdCode: '11590' },
  { id: 'seoul-gwanak-gu', code: 'gwanak-gu', cityId: 'seoul', name: '서울 관악구', addressHint: '관악구', aliases: ['관악구', 'gwanak-gu', 'gwanak'], center: { lat: 37.4781, lng: 126.9515 }, lawdCode: '11620' },
  { id: 'seoul-seocho-gu', code: 'seocho-gu', cityId: 'seoul', name: '서울 서초구', addressHint: '서초구', aliases: ['서초구', 'seocho-gu', 'seocho'], center: { lat: 37.4837, lng: 127.0324 }, lawdCode: '11650' },
  { id: 'seoul-gangnam-gu', code: 'gangnam-gu', cityId: 'seoul', name: '서울 강남구', addressHint: '강남구', aliases: ['강남구', 'gangnam-gu', 'gangnam'], center: { lat: 37.5172, lng: 127.0473 }, lawdCode: '11680' },
  { id: 'seoul-songpa-gu', code: 'songpa-gu', cityId: 'seoul', name: '서울 송파구', addressHint: '송파구', aliases: ['송파구', 'songpa-gu', 'songpa'], center: { lat: 37.5145, lng: 127.1066 }, lawdCode: '11710' },
  { id: 'seoul-gangdong-gu', code: 'gangdong-gu', cityId: 'seoul', name: '서울 강동구', addressHint: '강동구', aliases: ['강동구', 'gangdong-gu', 'gangdong'], center: { lat: 37.53, lng: 127.1238 }, lawdCode: '11740' },
];

const metroGuSeeds: GuSeed[] = [
  { id: 'busan-haeundae-gu', code: 'haeundae-gu', cityId: 'busan', name: '부산 해운대구', addressHint: '해운대구', aliases: ['부산해운대구', '해운대구', 'haeundae-gu', 'haeundae'], center: { lat: 35.1632, lng: 129.1636 }, lawdCode: '26350' },
  { id: 'busan-busanjin-gu', code: 'busanjin-gu', cityId: 'busan', name: '부산 부산진구', addressHint: '부산진구', aliases: ['부산진구', 'busanjin-gu', 'busanjin'], center: { lat: 35.1628, lng: 129.0533 }, lawdCode: '26230' },
  { id: 'busan-nam-gu', code: 'nam-gu-busan', cityId: 'busan', name: '부산 남구', addressHint: '남구', aliases: ['부산남구', '남구부산', 'nam-gu-busan'], center: { lat: 35.1366, lng: 129.0846 }, lawdCode: '26290' },
  { id: 'daegu-suseong-gu', code: 'suseong-gu', cityId: 'daegu', name: '대구 수성구', addressHint: '수성구', aliases: ['수성구', 'suseong-gu', 'suseong'], center: { lat: 35.8586, lng: 128.6306 }, lawdCode: '27260' },
  { id: 'daegu-dalseo-gu', code: 'dalseo-gu', cityId: 'daegu', name: '대구 달서구', addressHint: '달서구', aliases: ['달서구', 'dalseo-gu', 'dalseo'], center: { lat: 35.8297, lng: 128.5324 }, lawdCode: '27290' },
  { id: 'incheon-yeonsu-gu', code: 'yeonsu-gu', cityId: 'incheon', name: '인천 연수구', addressHint: '연수구', aliases: ['연수구', 'yeonsu-gu', 'yeonsu'], center: { lat: 37.4102, lng: 126.6788 }, lawdCode: '28185' },
  { id: 'incheon-namdong-gu', code: 'namdong-gu', cityId: 'incheon', name: '인천 남동구', addressHint: '남동구', aliases: ['남동구', 'namdong-gu', 'namdong'], center: { lat: 37.4473, lng: 126.7315 }, lawdCode: '28200' },
  { id: 'incheon-bupyeong-gu', code: 'bupyeong-gu', cityId: 'incheon', name: '인천 부평구', addressHint: '부평구', aliases: ['부평구', 'bupyeong-gu', 'bupyeong'], center: { lat: 37.507, lng: 126.7218 }, lawdCode: '28237' },
  { id: 'gwangju-buk-gu', code: 'buk-gu-gwangju', cityId: 'gwangju', name: '광주 북구', addressHint: '북구', aliases: ['광주북구', '북구광주', 'buk-gu-gwangju'], center: { lat: 35.1742, lng: 126.9112 }, lawdCode: '29170' },
  { id: 'gwangju-gwangsan-gu', code: 'gwangsan-gu', cityId: 'gwangju', name: '광주 광산구', addressHint: '광산구', aliases: ['광산구', 'gwangsan-gu', 'gwangsan'], center: { lat: 35.139, lng: 126.793 }, lawdCode: '29200' },
  { id: 'daejeon-yuseong-gu', code: 'yuseong-gu', cityId: 'daejeon', name: '대전 유성구', addressHint: '유성구', aliases: ['유성구', 'yuseong-gu', 'yuseong'], center: { lat: 36.3623, lng: 127.3569 }, lawdCode: '30200' },
  { id: 'daejeon-seo-gu', code: 'seo-gu-daejeon', cityId: 'daejeon', name: '대전 서구', addressHint: '서구', aliases: ['대전서구', '서구대전', 'seo-gu-daejeon'], center: { lat: 36.3554, lng: 127.3838 }, lawdCode: '30170' },
  { id: 'ulsan-nam-gu', code: 'nam-gu-ulsan', cityId: 'ulsan', name: '울산 남구', addressHint: '남구', aliases: ['울산남구', '남구울산', 'nam-gu-ulsan'], center: { lat: 35.5438, lng: 129.3302 }, lawdCode: '31140' },
  { id: 'ulsan-buk-gu', code: 'buk-gu-ulsan', cityId: 'ulsan', name: '울산 북구', addressHint: '북구', aliases: ['울산북구', '북구울산', 'buk-gu-ulsan'], center: { lat: 35.5825, lng: 129.3613 }, lawdCode: '31170' },
];

const specialSubRegions: RegionDataRecord[] = [
  {
    id: 'gangnam-daechi',
    code: 'gangnam-daechi',
    name: '서울 강남구 대치동',
    level: 'dong',
    parentRegionId: 'seoul-gangnam-gu',
    addressHint: '서울 강남구 대치동',
    center: { lat: 37.4992, lng: 127.0635 },
    lawdCode: '11680',
    buildingLookup: {
      sigunguCd: '11680',
      bjdongCd: '10600',
      platGbCd: '0',
      bun: '0001',
      ji: '0000',
    },
    metrics: {
      agingScore: 82,
      infraRisk: 74,
      marketScore: 68,
      policyFit: 77,
    },
    source: 'mock',
    lastUpdated: NOW_ISO,
  },
  {
    id: 'gangbuk-target',
    code: 'gangbuk-target',
    name: '서울 강북구 미아 정비구역',
    level: 'gu',
    parentRegionId: 'seoul',
    addressHint: '서울 강북구 미아',
    center: { lat: 37.6266, lng: 127.0261 },
    lawdCode: '11305',
    buildingLookup: {
      sigunguCd: '11305',
      bjdongCd: '10300',
      platGbCd: '0',
      bun: '0001',
      ji: '0000',
    },
    metrics: {
      agingScore: 91,
      infraRisk: 88,
      marketScore: 54,
      policyFit: 95,
    },
    source: 'mock',
    lastUpdated: NOW_ISO,
  },
];

const cityRegions: RegionDataRecord[] = citySeeds.map((seed) => ({
  id: seed.id,
  code: seed.code,
  name: seed.name,
  level: 'city',
  addressHint: seed.addressHint,
  center: seed.center,
  lawdCode: seed.lawdCode,
  metrics: {
    agingScore: 68,
    infraRisk: 66,
    marketScore: 64,
    policyFit: 70,
  },
  source: 'mock',
  lastUpdated: NOW_ISO,
}));

const guRegions: RegionDataRecord[] = [...seoulGuSeeds, ...metroGuSeeds].map((seed) => ({
  id: seed.id,
  code: seed.code,
  name: seed.name,
  level: 'gu',
  parentRegionId: seed.cityId,
  addressHint: seed.addressHint,
  center: seed.center,
  lawdCode: seed.lawdCode,
  metrics: {
    agingScore: 72,
    infraRisk: 70,
    marketScore: 66,
    policyFit: 74,
  },
  source: 'mock',
  lastUpdated: NOW_ISO,
}));

const allRegions: RegionDataRecord[] = [...cityRegions, ...guRegions, ...specialSubRegions];

const aliasIndex = new Map<string, RegionDataRecord>();
for (const seed of citySeeds) {
  const region = cityRegions.find((entry) => entry.id === seed.id);
  if (!region) {
    continue;
  }
  for (const alias of seed.aliases) {
    aliasIndex.set(toSearchToken(alias), region);
  }
}
for (const seed of [...seoulGuSeeds, ...metroGuSeeds]) {
  const region = guRegions.find((entry) => entry.id === seed.id);
  if (!region) {
    continue;
  }
  for (const alias of seed.aliases) {
    aliasIndex.set(toSearchToken(alias), region);
  }
}
aliasIndex.set(toSearchToken('강남구 대치동'), specialSubRegions[0]);
aliasIndex.set(toSearchToken('대치동'), specialSubRegions[0]);
aliasIndex.set(toSearchToken('미아 정비구역'), specialSubRegions[1]);

const levelRank = (level: RegionDataRecord['level']): number => {
  if (level === 'dong' || level === 'myeon') {
    return 3;
  }
  if (level === 'gu') {
    return 2;
  }
  return 1;
};

const pickBest = (
  candidates: Array<{ region: RegionDataRecord; score: number }>
): RegionDataRecord | undefined => {
  if (candidates.length === 0) {
    return undefined;
  }

  const sorted = [...candidates].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const levelDiff = levelRank(b.region.level) - levelRank(a.region.level);
    if (levelDiff !== 0) {
      return levelDiff;
    }
    return b.region.name.length - a.region.name.length;
  });

  return sorted[0].region;
};

export const getMockRegions = (): RegionDataRecord[] => [...allRegions];

export const getRegionByCode = async (regionCode: string): Promise<RegionDataRecord | undefined> => {
  const normalized = toCode(regionCode);
  if (!hasMeaningfulToken(normalized)) {
    return undefined;
  }
  return allRegions.find((region) => toCode(region.code) === normalized);
};

export const getRegionById = async (regionId: string): Promise<RegionDataRecord | undefined> => {
  const normalized = toCode(regionId);
  if (!hasMeaningfulToken(normalized)) {
    return undefined;
  }
  return allRegions.find((region) => toCode(region.id) === normalized);
};

export const resolveRegionByAddress = async (address: string): Promise<RegionDataRecord | undefined> => {
  const normalized = toSearchToken(address);
  if (!hasMeaningfulToken(normalized)) {
    return undefined;
  }

  const aliasExact = aliasIndex.get(normalized);
  if (aliasExact) {
    return aliasExact;
  }

  const tokenized = allRegions.map((region) => ({
    region,
    nameToken: toSearchToken(region.name),
    addressToken: toSearchToken(region.addressHint),
    codeToken: toCode(region.code),
  }));

  const exactCandidates = tokenized
    .filter(
      (entry) =>
        entry.nameToken === normalized ||
        entry.addressToken === normalized ||
        entry.codeToken === normalized
    )
    .map((entry) => ({ region: entry.region, score: 200 }));
  const exactPicked = pickBest(exactCandidates);
  if (exactPicked) {
    return exactPicked;
  }

  const partialCandidates = tokenized
    .filter(
      (entry) =>
        entry.nameToken.includes(normalized) ||
        entry.addressToken.includes(normalized) ||
        normalized.includes(entry.nameToken) ||
        normalized.includes(entry.addressToken) ||
        entry.codeToken.includes(normalized)
    )
    .map((entry) => {
      let score = 100;
      if (entry.nameToken.includes(normalized) || entry.addressToken.includes(normalized)) {
        score += 20;
      }
      if (normalized.includes(entry.nameToken) || normalized.includes(entry.addressToken)) {
        score += 10;
      }
      score += Math.min(10, normalized.length);
      return { region: entry.region, score };
    });

  const partialPicked = pickBest(partialCandidates);
  if (partialPicked) {
    return partialPicked;
  }

  for (const [aliasToken, region] of aliasIndex.entries()) {
    if (normalized.includes(aliasToken)) {
      return region;
    }
  }

  return undefined;
};
