interface HudStatusBarProps {
  tickerText: string;
  netPill: string;
  aiPill: string;
  dbPill: string;
}

export default function HudStatusBar({ tickerText, netPill, aiPill, dbPill }: HudStatusBarProps) {
  return (
    <header className="hud-header">
      <div className="hud-brand">
        <div className="hud-brand-icon" aria-hidden="true">
          ◆
        </div>
        <div>
          <h1 className="hud-brand-title">
            OPS :: CENTER <span className="hud-brand-mark">{'//'}</span> DARK
          </h1>
          <p className="hud-brand-sub">V.4.1.2 [STABLE]</p>
        </div>
      </div>

      <div className="hud-ticker">
        <span>{tickerText}</span>
      </div>

      <div className="hud-status-line" role="status">
        <div className="hud-status-pill">
          <span className="hud-status-label">NET</span>
          <strong>{netPill}</strong>
          <span className="hud-dot" />
        </div>
        <div className="hud-status-pill">
          <span className="hud-status-label">AI</span>
          <strong>{aiPill}</strong>
          <span className="hud-dot" />
        </div>
        <div className="hud-status-pill">
          <span className="hud-status-label">DB</span>
          <strong>{dbPill}</strong>
          <span className="hud-dot" />
        </div>
      </div>
    </header>
  );
}
