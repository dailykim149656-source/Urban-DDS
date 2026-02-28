import { RegionSummaryResponse, RegionMetricsResponse } from '../../types/contract';
import { calculatePriority } from '../scoring';
import { getRegionByCode, resolveRegionByAddress } from '../adapters/regionDataAdapter';
import {
  collectRegionExternalFacts,
  mergeMetricsWithExternalFacts,
} from './externalDataService';

export const getRegionSummary = async (address: string): Promise<RegionSummaryResponse | null> => {
  const region = await resolveRegionByAddress(address);
  if (!region) {
    return null;
  }

  const externalFacts = await collectRegionExternalFacts(region);
  const mergedMetrics = mergeMetricsWithExternalFacts(region.metrics, externalFacts);
  const score = calculatePriority(mergedMetrics);

  return {
    regionId: region.id,
    regionCode: region.code,
    name: region.name,
    level: region.level,
    center: region.center,
    metrics: mergedMetrics,
    buildingFacts: externalFacts.buildingFacts ?? undefined,
    buildingFactsStatus: externalFacts.buildingFactsStatus,
    buildingFactsAttempts: externalFacts.buildingFactsAttempts,
    tradeFacts: externalFacts.tradeFacts ?? undefined,
    dataSource: externalFacts.dataSource.length > 0 ? externalFacts.dataSource : undefined,
    priorityScore: score.priorityScore,
    summary: `Derived from address match for "${address}".`,
    source: region.source,
    updatedAt: region.lastUpdated,
  };
};

export const getRegionMetrics = async (regionCode: string): Promise<RegionMetricsResponse | null> => {
  const region = await getRegionByCode(regionCode);
  if (!region) {
    return null;
  }

  return {
    regionId: region.id,
    regionCode: region.code,
    name: region.name,
    level: region.level,
    metrics: region.metrics,
    source: region.source,
    updatedAt: region.lastUpdated,
  };
};
