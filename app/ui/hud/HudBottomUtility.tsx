export default function HudBottomUtility() {
  return (
    <footer className="hud-bottom">
      <div className="hud-memory">
        <div className="hud-memory-meter">
          <span className="hud-memory-fill" />
        </div>
        <p>MEMORY: 64%</p>
      </div>
      <div className="hud-bottom-coord">
        <span>
          LATITUDE: <strong>37.5665 °N</strong>
        </span>
        <span>
          LONGITUDE: <strong>126.9780 °E</strong>
        </span>
      </div>
    </footer>
  );
}
