'use client';

import dynamic from 'next/dynamic';

import type { GeoPoint } from '../../../types/domain';

const MapContainer = dynamic(
  () => import('react-leaflet').then((module) => module.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((module) => module.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((module) => module.CircleMarker),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((module) => module.Circle),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((module) => module.Popup),
  { ssr: false }
);

const DEFAULT_CENTER: GeoPoint = {
  lat: 37.5665,
  lng: 126.978,
};

interface RegionMapPanelProps {
  center?: GeoPoint;
  regionName?: string;
  loading?: boolean;
}

const formatCoord = (value: number): string => value.toFixed(4);
const isGuLevelName = (name: string): boolean => {
  const normalized = name.toLowerCase();
  return normalized.includes('구') || normalized.includes('gu');
};

export default function RegionMapPanel({ center, regionName, loading }: RegionMapPanelProps) {
  const activeCenter = center ?? DEFAULT_CENTER;
  const activeRegionName = regionName ?? '선택한 지역';
  const guLevel = isGuLevelName(activeRegionName);
  const zoomLevel = center ? (guLevel ? 14 : 12) : 11;
  const areaRadius = guLevel ? 1200 : 2500;

  return (
    <article className="hud-panel hud-map-panel">
      <div className="hud-panel-title-row">
        <h2 className="hud-panel-title">GIS Map Overview</h2>
        <span className="hud-status-label">
          {loading ? 'SYNCING MAP...' : 'MAP READY'}
        </span>
      </div>

      <p className="hud-panel-sub">
        {center
          ? `${activeRegionName}의 지도를 표시하고 있습니다.`
          : '지역 조회가 완료되면 지도가 표시됩니다.'}
      </p>

      <div className="hud-map-canvas">
        <MapContainer
          key={`${activeCenter.lat}-${activeCenter.lng}-${activeRegionName}`}
          center={[activeCenter.lat, activeCenter.lng]}
          zoom={zoomLevel}
          scrollWheelZoom
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Circle
            center={[activeCenter.lat, activeCenter.lng]}
            radius={areaRadius}
            pathOptions={{
              color: '#06e8f9',
              fillColor: '#06e8f9',
              fillOpacity: 0.08,
              weight: 1,
            }}
          />
          <CircleMarker
            center={[activeCenter.lat, activeCenter.lng]}
            radius={10}
            pathOptions={{
              color: '#06e8f9',
              fillColor: '#06e8f9',
              fillOpacity: 0.35,
            }}
          >
            <Popup>
              {activeRegionName}
              <br />
              LAT {formatCoord(activeCenter.lat)}, LNG {formatCoord(activeCenter.lng)}
            </Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      <div className="hud-map-meta">
        <span>REGION UNIT: {guLevel ? 'GU' : 'CITY'}</span>
        <span>LATITUDE: {formatCoord(activeCenter.lat)}</span>
        <span>LONGITUDE: {formatCoord(activeCenter.lng)}</span>
      </div>
    </article>
  );
}
