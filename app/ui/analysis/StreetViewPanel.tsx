import { useEffect, useMemo, useState } from 'react';

import type { GeoPoint } from '../../../types/domain';

interface StreetViewPanelProps {
  center?: GeoPoint;
  regionName?: string;
  loading?: boolean;
}

type StreetViewMode = 'current' | 'aged';

interface StreetViewMetadata {
  status?: string;
  date?: string;
  pano_id?: string;
  copyright?: string;
  requestedLocation?: GeoPoint;
  resolvedLocation?: GeoPoint | null;
}

const buildStreetViewImageUrl = (center: GeoPoint, mode: StreetViewMode, reloadKey: number) => {
  const params = new URLSearchParams({
    lat: center.lat.toString(),
    lng: center.lng.toString(),
    size: '960x540',
    heading: '0',
    pitch: '0',
    fov: '90',
    mode,
    cacheBuster: reloadKey.toString(),
  });
  return `/api/visual/street-view?${params.toString()}`;
};

const buildStreetViewMetaUrl = (center: GeoPoint) => {
  const params = new URLSearchParams({
    lat: center.lat.toString(),
    lng: center.lng.toString(),
  });
  return `/api/visual/street-view-meta?${params.toString()}`;
};

export default function StreetViewPanel({ center, regionName, loading = false }: StreetViewPanelProps) {
  const [mode, setMode] = useState<StreetViewMode>('current');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [metadata, setMetadata] = useState<StreetViewMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const imageUrl = useMemo(() => {
    if (!center) {
      return null;
    }
    return buildStreetViewImageUrl(center, mode, reloadKey);
  }, [center, mode, reloadKey]);

  const activeRegionName = regionName ?? 'Selected Region';
  const requestedLocation = metadata?.requestedLocation ?? center;
  const resolvedLocation = metadata?.resolvedLocation ?? null;

  const requestReload = () => {
    setLoadError(null);
    setIsImageLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const fetchMetadata = async (target: GeoPoint, activeSignal: { current: boolean }) => {
    setMetadataLoading(true);
    setMetadataError(null);
    try {
      const response = await fetch(buildStreetViewMetaUrl(target), { cache: 'no-store' });
      const payload = (await response.json()) as StreetViewMetadata | { error: string };
      if (!response.ok) {
        const payloadError = 'error' in payload ? String(payload.error) : `Metadata request failed (${response.status})`;
        throw new Error(payloadError);
      }
      if (activeSignal.current) {
        setMetadata(payload as StreetViewMetadata);
      }
    } catch (requestError) {
      if (activeSignal.current) {
        setMetadataError(requestError instanceof Error ? requestError.message : 'Unable to load Street View metadata');
        setMetadata(null);
      }
    } finally {
      if (activeSignal.current) {
        setMetadataLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!center) {
      setMetadata(null);
      setMetadataError(null);
      setMetadataLoading(false);
      return;
    }
    const signal = { current: true };
    void fetchMetadata(center, signal);
    return () => {
      signal.current = false;
    };
  }, [center]);

  useEffect(() => {
    if (imageUrl) {
      setIsImageLoading(true);
      setLoadError(null);
    }
  }, [imageUrl]);

  const isBusy = loading || metadataLoading;

  return (
    <section className="hud-panel hud-street-view">
      <div className="hud-panel-title-row">
        <h2 className="hud-panel-title">Street View Scene</h2>
        <span className="hud-subtitle-small">Aerial scene + 노후화 점검 뷰</span>
      </div>

      <div className="hud-street-view-toolbar">
        <button
          type="button"
          className={`hud-button hud-button-primary hud-mode-button${mode === 'current' ? ' hud-button-ghost' : ''}`}
          onClick={() => {
            setMode('current');
            requestReload();
          }}
        >
          Current
        </button>
        <button
          type="button"
          className={`hud-button hud-button-primary hud-mode-button${mode === 'aged' ? ' hud-button-ghost' : ''}`}
          onClick={() => {
            setMode('aged');
            requestReload();
          }}
        >
          Aged Look
        </button>
        <button type="button" className="hud-button hud-button-ghost" onClick={requestReload}>
          Reload
        </button>
      </div>

      {isBusy ? <p className="hud-empty">Preparing scene context...</p> : null}

      {!center ? (
        <div className="hud-street-view-fallback">
          <p>No scene coordinate available. Run a region search first.</p>
        </div>
      ) : loadError ? (
        <div className="hud-street-view-fallback">
          <p>{loadError}</p>
          <button
            type="button"
            className="hud-button hud-button-ghost"
            onClick={requestReload}
          >
            Retry
          </button>
        </div>
      ) : imageUrl ? (
        <div className={`hud-street-view-image-wrap ${mode === 'aged' ? 'is-aged' : ''}`}>
          {isImageLoading ? <p className="hud-street-view-loading">Loading scene image...</p> : null}
          <img
            key={`${imageUrl}-${reloadKey}`}
            src={imageUrl}
            alt={`${activeRegionName} Street View (${mode})`}
            className="hud-street-view-image"
            onError={() => {
              setIsImageLoading(false);
              setLoadError('Street View image could not be loaded for this location.');
            }}
            onLoad={() => {
              setIsImageLoading(false);
              setLoadError(null);
            }}
          />
        </div>
      ) : (
        <div className="hud-street-view-fallback">
          <p>No image url to load. Retry with the button above.</p>
        </div>
      )}

      {center && (
      <div className="hud-street-view-meta">
          <span>LATITUDE: {center.lat.toFixed(4)}</span>
          <span>LONGITUDE: {center.lng.toFixed(4)}</span>
          <span>META STATUS: {metadata?.status ?? 'UNKNOWN'}</span>
          {requestedLocation ? (
            <span>
              REQUESTED: {requestedLocation.lat.toFixed(4)}, {requestedLocation.lng.toFixed(4)}
            </span>
          ) : null}
          {resolvedLocation ? (
            <span>
              RESOLVED: {resolvedLocation.lat.toFixed(4)}, {resolvedLocation.lng.toFixed(4)}
            </span>
          ) : null}
          {metadataError ? <span>META: {metadataError}</span> : null}
          {!metadataError && metadata ? (
            <span>PHOTO DATE: {metadata.date ? metadata.date : 'Unavailable'}</span>
          ) : null}
        </div>
      )}
    </section>
  );
}

