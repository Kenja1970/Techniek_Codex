import { formatDuration } from "../../engine/time.js";

export default function TimelineView({ result }) {
  const rows = (result?.metrics?.timeline || []).slice(0, 28);
  const duration = Math.max(1, result?.runDuration || 1);
  return (
    <section className="studio-panel timeline-panel">
      <h2>Timeline / Gantt</h2>
      {!rows.length && <p className="muted">Run a simulation to see token activity over simulated time.</p>}
      <div className="timeline-rows">
        {rows.map((item, index) => {
          const left = Math.min(100, (item.start / duration) * 100);
          const width = Math.max(2, ((item.end - item.start) / duration) * 100);
          return (
            <div className="timeline-row" key={`${item.tokenId}-${item.objectId}-${index}`}>
              <span>{item.tokenId}</span>
              <div className="timeline-track">
                <i className={`timeline-bar ${item.type}`} style={{ left: `${left}%`, width: `${width}%` }} />
              </div>
              <small>{item.objectLabel} · {formatDuration(item.end - item.start)}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
