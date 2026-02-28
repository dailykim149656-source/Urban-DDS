export type RegionLevel = 'city' | 'gu' | 'dong' | 'myeon';

export interface RegionMetrics {
  agingScore: number;
  infraRisk: number;
  marketScore: number;
  policyFit: number;
}

export interface RegionDataRecord {
  id: string;
  code: string;
  name: string;
  level: RegionLevel;
  parentRegionId?: string;
  addressHint: string;
  metrics: RegionMetrics;
  source: 'mock' | 'juso' | 'vworld' | 'open-data';
  lastUpdated: string;
}
