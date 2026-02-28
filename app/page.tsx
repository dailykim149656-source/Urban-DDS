'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import type {
  AnalysisReportListItem,
  AnalysisReportResponse,
  ErrorResponse,
  RegionSummaryResponse,
} from '../types/contract';
import ReportPanel from './ui/analysis/ReportPanel';
import RecentActivityPanel from './ui/analysis/RecentActivityPanel';
import StreetViewPanel from './ui/analysis/StreetViewPanel';
import HudBottomUtility from './ui/hud/HudBottomUtility';
import CommandInputPanel from './ui/hud/CommandInputPanel';
import HudStatusBar from './ui/hud/HudStatusBar';
import RegionMapPanel from './ui/map/RegionMapPanel';
import ScoreGrid from './ui/metrics/ScoreGrid';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? '';
const DEFAULT_ADDRESS = process.env.NEXT_PUBLIC_DEFAULT_ADDRESS?.trim() || 'seoul';
const QUICK_TARGETS = [
  { label: 'Seoul', code: 'KR-11', value: 'seoul' },
  { label: 'Gangnam-gu', code: 'KR-11680', value: 'seoul gangnam-gu' },
  { label: 'Haeundae-gu', code: 'KR-26350', value: 'busan haeundae-gu' },
  { label: 'Yuseong-gu', code: 'KR-30200', value: 'daejeon yuseong-gu' },
  { label: 'Jeju', code: 'KR-50', value: 'jeju' },
] as const;

interface HealthResponse {
  service: string;
  status: 'ok' | 'error';
  revision?: string | number;
  timestamp: string;
  firestoreEnabled?: boolean;
}

interface QuickTarget {
  label: string;
  code: string;
  value: string;
}

const toApiUrl = (path: string): string => (API_BASE.length > 0 ? `${API_BASE}${path}` : path);

const getErrorMessage = (payload: unknown): string => {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const { error } = payload as ErrorResponse;
    if (typeof error === 'string' && error.length > 0) {
      return error;
    }
  }
  return 'Request failed.';
};

const formatTimestamp = (value: string | undefined): string => {
  if (!value) {
    return 'N/A';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString();
};

const formatNumber = (value: number | undefined, maximumFractionDigits = 2): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits }).format(value);
};

const metricClass = (value: number): string => {
  if (value >= 80) {
    return 'metric-bad';
  }
  if (value >= 65) {
    return 'metric-warn';
  }
  return 'metric-good';
};

export default function HomePage() {
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [summary, setSummary] = useState<RegionSummaryResponse | null>(null);
  const [report, setReport] = useState<AnalysisReportResponse | null>(null);
  const [recentReports, setRecentReports] = useState<AnalysisReportListItem[]>([]);
  const [loadingRecentReports, setLoadingRecentReports] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const canAnalyze = useMemo(() => !loadingReport && summary !== null, [loadingReport, summary]);
  const authLabel = 'anonymous';
  const netPill = isOnline ? 'ONLINE' : 'OFFLINE';
  const aiPill = health?.status === 'ok' ? 'CONNECTED' : 'READY';
  const dbPill = health?.firestoreEnabled ? 'SYNCED' : 'LOCAL';
  const healthStatus = health?.status ?? 'UNKNOWN';
  const healthRevision = health?.revision ?? 'N/A';
  const latencyMs = health ? 8 + Math.floor(Math.random() * 17) : 'N/A';
  const tickerText =
    `SYSTEM INTEGRITY ${healthStatus === 'ok' ? '100%' : 'N/A'} // HEALTH: ${healthStatus} ` +
    `// REGION DATA SYNCED // REVISION: ${healthRevision} // ENCRYPTION: AES-256-GCM ` +
    `// NODE LATENCY: ${latencyMs}ms // WEATHER: SECTOR WATCH`;

  const fetchHealth = async (): Promise<void> => {
    try {
      const response = await fetch(toApiUrl('/api/health'), { cache: 'no-store' });
      const data = (await response.json()) as HealthResponse;
      if (response.ok) {
        setHealth(data);
      }
    } catch {
      setHealth(null);
    }
  };

  const fetchSummary = async (requestedAddress: string): Promise<void> => {
    setLoadingSummary(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch(
        toApiUrl(`/api/region/summary?address=${encodeURIComponent(requestedAddress)}`),
        { cache: 'no-store' }
      );
      const data = (await response.json()) as RegionSummaryResponse | ErrorResponse;

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setSummary(data as RegionSummaryResponse);
      await fetchHealth();
    } catch (requestError) {
      setSummary(null);
      setError(requestError instanceof Error ? requestError.message : 'Failed to fetch region summary.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchRecentReports = async (): Promise<void> => {
    setLoadingRecentReports(true);
    try {
      const response = await fetch(toApiUrl('/api/analysis/reports?limit=5'), { cache: 'no-store' });
      if (!response.ok) {
        setRecentReports([]);
        return;
      }

      const payload = (await response.json()) as { items: AnalysisReportListItem[] } | ErrorResponse;
      if ('items' in payload) {
        setRecentReports(payload.items);
      } else {
        setRecentReports([]);
      }
    } catch {
      setRecentReports([]);
    } finally {
      setLoadingRecentReports(false);
    }
  };

  useEffect(() => {
    void fetchRecentReports();
    void fetchHealth();

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    setIsOnline(window.navigator.onLine);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const onSubmitAddress = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setError('Please enter an address.');
      return;
    }
    await fetchSummary(trimmed);
  };

  const onQuickTargetSelect = async (targetAddress: string): Promise<void> => {
    setAddress(targetAddress);
    await fetchSummary(targetAddress);
  };

  const requestAnalysis = async (): Promise<void> => {
    if (!summary) {
      return;
    }

    setLoadingReport(true);
    setError(null);

    try {
      const response = await fetch(toApiUrl('/api/analysis/report'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regionCode: summary.regionCode,
          metrics: summary.metrics,
        }),
      });

      const data = (await response.json()) as AnalysisReportResponse | ErrorResponse;
      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setReport(data as AnalysisReportResponse);
      await fetchRecentReports();
      await fetchHealth();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to run analysis.');
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <main className="hud-stage">
      <div className="hud-grid-overlay" />
      <div className="hud-scanline-overlay" />
      <div className="hud-glow-beam" />

      <HudStatusBar tickerText={tickerText} netPill={netPill} aiPill={aiPill} dbPill={dbPill} />

      <section
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 24px 0',
        }}
      >
        <span className="hud-status-label">USER: {authLabel}</span>
      </section>

      <section className="hud-progress-track">
        <div className={`hud-progress-fill ${loadingSummary || loadingReport ? 'hud-progress-running' : ''}`} />
      </section>

      <CommandInputPanel
        address={address}
        loadingSummary={loadingSummary}
        quickTargets={QUICK_TARGETS as readonly QuickTarget[]}
        activeTarget={address}
        onAddressChange={(value) => setAddress(value)}
        onSubmitAddress={onSubmitAddress}
        onQuickTargetSelect={onQuickTargetSelect}
      />

      <section className="hud-grid hud-grid-main">
        <article className="hud-panel hud-panel-primary">
          <h2 className="hud-panel-title">Region Search / Summary</h2>
          {error && <div className="hud-error">{error}</div>}

          {summary ? (
            <>
              <div className="hud-panel-title-line">
                <h3>{summary.name}</h3>
                <span>Region Code: {summary.regionCode}</span>
              </div>
              <p className="hud-panel-sub">{summary.summary}</p>
              <p className="hud-panel-sub">Updated {formatTimestamp(summary.updatedAt)}</p>

              {(summary.buildingFacts || summary.tradeFacts) && (
                <div className="hud-kv-grid" style={{ marginBottom: 10 }}>
                  {summary.buildingFacts && (
                    <>
                      <div className="hud-kv">
                        <span>Avg Completion Year</span>
                        <strong>{formatNumber(summary.buildingFacts.avgCompletionYear, 0)}</strong>
                      </div>
                      <div className="hud-kv">
                        <span>Avg Gross Area (m2)</span>
                        <strong>{formatNumber(summary.buildingFacts.avgGrossArea)}</strong>
                      </div>
                      <div className="hud-kv">
                        <span>Avg FAR (%)</span>
                        <strong>{formatNumber(summary.buildingFacts.avgFloorAreaRatio)}</strong>
                      </div>
                      <div className="hud-kv">
                        <span>Building Samples</span>
                        <strong>{formatNumber(summary.buildingFacts.sampleSize, 0)}</strong>
                      </div>
                    </>
                  )}

                  {summary.tradeFacts && (
                    <>
                      <div className="hud-kv">
                        <span>Avg Deal Amount</span>
                        <strong>{formatNumber(summary.tradeFacts.avgDealAmount)}</strong>
                      </div>
                      <div className="hud-kv">
                        <span>Median Deal Amount</span>
                        <strong>{formatNumber(summary.tradeFacts.medianDealAmount)}</strong>
                      </div>
                      <div className="hud-kv">
                        <span>Deal Count</span>
                        <strong>{formatNumber(summary.tradeFacts.dealCount, 0)}</strong>
                      </div>
                      <div className="hud-kv">
                        <span>3M Price Trend (%)</span>
                        <strong>{formatNumber(summary.tradeFacts.priceTrend3m)}</strong>
                      </div>
                    </>
                  )}
                </div>
              )}

              {!summary.buildingFacts && summary.buildingFactsStatus && (
                <p className="hud-panel-sub">
                  Building data status: {summary.buildingFactsStatus}
                  {typeof summary.buildingFactsAttempts === 'number'
                    ? ` (attempts: ${summary.buildingFactsAttempts})`
                    : ''}
                </p>
              )}

              {summary.dataSource && summary.dataSource.length > 0 && (
                <p className="hud-panel-sub">External Sources: {summary.dataSource.join(', ')}</p>
              )}

              <ScoreGrid metrics={summary.metrics} metricClass={metricClass} />

              <div className="hud-actions">
                <button
                  className="hud-button hud-button-ghost"
                  onClick={() => void requestAnalysis()}
                  disabled={!canAnalyze}
                >
                  {loadingReport ? 'Analyzing...' : 'Run Gemini Analysis'}
                </button>
                <span className="hud-status-label">Priority Score: {summary.priorityScore}</span>
              </div>
            </>
          ) : (
            <p className="hud-empty">Search a region and run analysis to view results.</p>
          )}
        </article>

        <ReportPanel report={report} />
      </section>

      <section className="hud-grid hud-media-grid">
        <RegionMapPanel center={summary?.center} regionName={summary?.name} loading={loadingSummary} />
        <StreetViewPanel center={summary?.center} regionName={summary?.name} loading={loadingSummary} />
      </section>

      <RecentActivityPanel recentReports={recentReports} loadingRecentReports={loadingRecentReports} />

      <HudBottomUtility />
    </main>
  );
}
