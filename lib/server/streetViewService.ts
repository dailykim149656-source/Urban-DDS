interface GeoPoint {
  lat: number;
  lng: number;
}

interface StreetViewQuery {
  lat: number;
  lng: number;
  size: string;
  heading: number;
  pitch: number;
  fov: number;
  mode: StreetViewMode;
}

interface NormalizedStreetViewQuery extends StreetViewQuery {
  size: `${number}x${number}`;
}

type StreetViewMode = 'current' | 'aged';

interface StreetViewOptions {
  size?: string;
  heading?: number;
  pitch?: number;
  fov?: number;
  mode?: StreetViewMode;
  apiBaseUrl?: string;
  apiKey?: string;
}

const DEFAULT_API_BASE_URL = 'https://maps.googleapis.com/maps/api/streetview';
const DEFAULT_METADATA_API_BASE_URL = 'https://maps.googleapis.com/maps/api/streetview/metadata';

export const STREET_VIEW_SIZE_DEFAULT = '960x540';
export const STREET_VIEW_MAX_PIXELS = 1280;

const parseSize = (value: string): `${number}x${number}` => {
  const match = /^(\d{1,4})x(\d{1,4})$/.exec(value.trim());
  if (!match) {
    return STREET_VIEW_SIZE_DEFAULT;
  }

  const width = Math.min(STREET_VIEW_MAX_PIXELS, Math.max(320, Number(match[1])));
  const height = Math.min(STREET_VIEW_MAX_PIXELS, Math.max(180, Number(match[2])));
  return `${width}x${height}` as `${number}x${number}`;
};

const clampNumber = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
};

const normalizeCoord = (value: number): number => clampNumber(value, -180, 180);

export const normalizeStreetViewQuery = (
  raw: {
    lat: number;
    lng: number;
    heading?: number;
    pitch?: number;
    fov?: number;
    size?: string;
    mode?: StreetViewMode;
  }
): NormalizedStreetViewQuery => {
  const normalizedMode = raw.mode === 'aged' ? 'aged' : 'current';
  const baseHeading = clampNumber(raw.heading ?? 0, 0, 360);
  const basePitch = clampNumber(raw.pitch ?? 0, -90, 90);
  const baseFov = clampNumber(raw.fov ?? 90, 10, 120);
  const agedHeading = (baseHeading + 8 + 360) % 360;
  const agedPitch = clampNumber(basePitch - 4, -90, 90);
  const agedFov = clampNumber(baseFov + 12, 10, 120);

  return {
    lat: clampNumber(raw.lat, -90, 90),
    lng: normalizeCoord(raw.lng),
    mode: normalizedMode,
    heading: normalizedMode === 'aged' ? agedHeading : baseHeading,
    pitch: normalizedMode === 'aged' ? agedPitch : basePitch,
    fov: normalizedMode === 'aged' ? agedFov : baseFov,
    size: parseSize(raw.size ?? STREET_VIEW_SIZE_DEFAULT),
  };
};

export const buildStreetViewUrl = (
  center: GeoPoint,
  options: StreetViewOptions = {}
): string => {
  const normalized = normalizeStreetViewQuery({
    lat: center.lat,
    lng: center.lng,
    heading: options.heading,
    pitch: options.pitch,
    fov: options.fov,
    mode: options.mode,
    size: options.size,
  });

  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const apiKey = options.apiKey ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  const target = new URL(apiBaseUrl);
  target.searchParams.set('size', normalized.size);
  target.searchParams.set('location', `${normalized.lat},${normalized.lng}`);
  target.searchParams.set('fov', String(normalized.fov));
  target.searchParams.set('heading', String(normalized.heading));
  target.searchParams.set('pitch', String(normalized.pitch));
  target.searchParams.set('key', apiKey);
  target.searchParams.set('source', 'outdoor');

  return target.toString();
};

export const buildStreetViewMetadataUrl = (
  center: GeoPoint,
  options: StreetViewOptions = {}
): string => {
  const normalized = normalizeStreetViewQuery({
    lat: center.lat,
    lng: center.lng,
    heading: options.heading,
    pitch: options.pitch,
    fov: options.fov,
    mode: options.mode,
    size: options.size,
  });

  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_METADATA_API_BASE_URL;
  const apiKey = options.apiKey ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  const target = new URL(apiBaseUrl);
  target.searchParams.set('location', `${normalized.lat},${normalized.lng}`);
  target.searchParams.set('key', apiKey);

  return target.toString();
};
