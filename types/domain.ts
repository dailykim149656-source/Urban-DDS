export type RegionLevel = 'city' | 'gu' | 'dong' | 'myeon';

export interface RegionMetrics {
  agingScore: number;
  infraRisk: number;
  marketScore: number;
  policyFit: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BuildingLookupKey {
  sigunguCd: string;
  bjdongCd?: string;
  platGbCd?: string;
  bun?: string;
  ji?: string;
}

export interface BuildingFacts {
  avgCompletionYear?: number;
  avgGrossArea?: number;
  avgFloorAreaRatio?: number;
  sampleSize: number;
  source: 'data-go-kr-building-ledger';
}

export interface TradeFacts {
  avgDealAmount?: number;
  medianDealAmount?: number;
  avgPricePerArea?: number;
  dealCount: number;
  priceTrend3m?: number;
  period: string;
  source: 'data-go-kr-apartment-trade';
}

export interface RegionDataRecord {
  id: string;
  code: string;
  name: string;
  level: RegionLevel;
  parentRegionId?: string;
  addressHint: string;
  center: GeoPoint;
  lawdCode?: string;
  buildingLookup?: BuildingLookupKey;
  metrics: RegionMetrics;
  source: 'mock' | 'juso' | 'vworld' | 'open-data';
  lastUpdated: string;
}
