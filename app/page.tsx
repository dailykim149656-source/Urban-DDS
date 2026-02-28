'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

import type {
  AnalysisReportResponse,
  AnalysisReportListItem,
  ErrorResponse,
  RegionSummaryResponse,
} from '../types/contract';
import HudBottomUtility from './ui/hud/HudBottomUtility';
import CommandInputPanel from './ui/hud/CommandInputPanel';
import HudStatusBar from './ui/hud/HudStatusBar';
import ScoreGrid from './ui/metrics/ScoreGrid';
import ReportPanel from './ui/analysis/ReportPanel';
import RecentActivityPanel from './ui/analysis/RecentActivityPanel';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? '';
const DEFAULT_ADDRESS = process.env.NEXT_PUBLIC_DEFAULT_ADDRESS?.trim() || '서울';
const QUICK_TARGETS = [
  { label: '서울', code: 'KR-11', value: '서울' },
  { label: '강남구 대치동', code: 'KR-SG', value: '강남구 대치동' },
  { label: '해운대구 반여동', code: 'KR-BS', value: '해운대구 반여동' },
  { label: '부산', code: 'KR-26', value: '부산' },
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
  return '요청을 처리할 수 없습니다.';
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
  const { data: session, status: sessionStatus } = useSession();
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

  const isAuthenticated = sessionStatus === 'authenticated';
  const canAnalyze = useMemo(
    () => !loadingReport && summary !== null && isAuthenticated,
    [loadingReport, summary, isAuthenticated]
  );
  const authLabel = isAuthenticated ? session?.user?.email ?? 'signed-in' : 'not-signed-in';
  const modelMode = process.env.GEMINI_API_MODE === 'vertex' ? 'VERTEX' : 'GOOGLE_AI';
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
      setError(requestError instanceof Error ? requestError.message : '지역 조회 요청이 실패했습니다.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchRecentReports = async (): Promise<void> => {
    if (!isAuthenticated) {
      setRecentReports([]);
      return;
    }

    setLoadingRecentReports(true);

    try {
      const response = await fetch(toApiUrl('/api/analysis/reports?limit=5'), { cache: 'no-store' });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { items: AnalysisReportListItem[] } | ErrorResponse;
      if ('items' in payload) {
        setRecentReports(payload.items);
      }
    } catch {
      setRecentReports([]);
    } finally {
      setLoadingRecentReports(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void fetchRecentReports();
    } else {
      setRecentReports([]);
    }
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
  }, [isAuthenticated]);

  const onSubmitAddress = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setError('지역명을 입력해주세요.');
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
    if (!isAuthenticated) {
      setError('Google 로그인 후 분석을 실행할 수 있습니다.');
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
      setError(requestError instanceof Error ? requestError.message : '분석 요청 처리에 실패했습니다.');
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
        {isAuthenticated ? (
          <button className="hud-button hud-button-ghost" onClick={() => void signOut({ callbackUrl: '/' })}>
            로그아웃
          </button>
        ) : (
          <button className="hud-button hud-button-ghost" onClick={() => void signIn('google')}>
            Google 로그인
          </button>
        )}
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
              <ScoreGrid metrics={summary.metrics} metricClass={metricClass} />
              <div className="hud-actions">
                <button
                  className="hud-button hud-button-ghost"
                  onClick={() => void requestAnalysis()}
                  disabled={!canAnalyze}
                >
                  {loadingReport ? '분석 중...' : 'Gemini 분석 시작'}
                </button>
                <span className="hud-status-label">Priority Score: {summary.priorityScore}</span>
              </div>
            </>
          ) : (
            <p className="hud-empty">지역을 조회한 뒤 분석 버튼을 눌러 결과를 받아보세요.</p>
          )}
        </article>

        <ReportPanel report={report} />
      </section>

      <RecentActivityPanel recentReports={recentReports} loadingRecentReports={loadingRecentReports} />

      <HudBottomUtility />
    </main>
  );
}
