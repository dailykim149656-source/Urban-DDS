import { FormEvent } from 'react';

interface QuickTarget {
  label: string;
  code: string;
  value: string;
}

interface CommandInputPanelProps {
  address: string;
  loadingSummary: boolean;
  quickTargets: readonly QuickTarget[];
  activeTarget?: string;
  onAddressChange: (value: string) => void;
  onSubmitAddress: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onQuickTargetSelect: (value: string) => Promise<void>;
}

export default function CommandInputPanel({
  address,
  loadingSummary,
  quickTargets,
  activeTarget,
  onAddressChange,
  onSubmitAddress,
  onQuickTargetSelect,
}: CommandInputPanelProps) {
  const activeAddress = (activeTarget ?? '').trim().toLowerCase();

  return (
    <section className="hud-command-area">
      <div className="hud-command-note">
        <span>TERMINAL ACCESS</span>
        <span>SECURE CONNECTION ID: 884-XJ-09</span>
      </div>

      <form className="hud-command-form" onSubmit={onSubmitAddress}>
        <label className="sr-only" htmlFor="command-input">
          지역명 또는 주소 입력
        </label>
        <div className="hud-command-field">
          <span className="hud-prompt" aria-hidden="true">
            &gt;
          </span>
          <input
            id="command-input"
            className="hud-command-input"
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="AWAITING TARGET COORDINATES..."
            aria-label="지역명 또는 주소 입력"
            autoComplete="off"
          />
          {address.length === 0 && (
            <div className="hud-command-overlay" aria-hidden="true">
              AWAITING TARGET COORDINATES...
              <span className="hud-command-cursor" />
            </div>
          )}
          <button className="hud-button hud-button-primary" type="submit" disabled={loadingSummary}>
            {loadingSummary ? '조회 중...' : '지역 조회'}
          </button>
        </div>
        <div className="hud-command-meta">
          <span>INPUT MODE: REGIONAL_SEARCH</span>
          <span>MAX RESULTS: 100</span>
        </div>
      </form>

      <div className="hud-section-divider">
        <span>Quick Access Targets</span>
      </div>
      <div className="hud-chip-grid">
        {quickTargets.map((item) => (
          <button
            key={item.code}
            type="button"
            className={`hud-chip${item.value.trim().toLowerCase() === activeAddress ? ' hud-chip-active' : ''}`}
            onClick={() => void onQuickTargetSelect(item.value)}
          >
            <span>{item.label}</span>
            <span>{item.code}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
