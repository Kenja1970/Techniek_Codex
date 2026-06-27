(function () {
  const shellHtml = `
    <div class="bl-shell">
      <section class="bl-map-panel">
        <div class="bl-map-wrap">
          <div class="bl-map" data-bl-map role="application" aria-label="Western US water resources map"></div>
          <div class="bl-controls">
            <label>Basin
              <select data-bl-basin></select>
            </label>
            <label>Metric
              <select data-bl-metric>
                <option value="flow">Flow (cfs)</option>
                <option value="storage">Storage (acre-ft)</option>
                <option value="swe">Snow water equivalent (in)</option>
                <option value="et">ET (mm/month, modeled)</option>
              </select>
            </label>
            <button type="button" data-bl-play>Play</button>
            <button type="button" data-bl-export>Export evidence</button>
            <label><input type="checkbox" data-bl-water-year> Water year mode</label>
            <div class="bl-time-row">
              <div class="bl-time-label" data-bl-time-label>—</div>
              <input type="range" data-bl-time min="0" max="100" value="100" aria-label="Time slider">
            </div>
          </div>
        </div>
      </section>
      <aside class="bl-side">
        <article class="bl-card">
          <h2>Selected feature</h2>
          <h3 class="bl-station-title" data-bl-station-title>—</h3>
          <div class="bl-station-meta" data-bl-station-meta></div>
          <div class="bl-kpi-grid" data-bl-kpis style="margin-top:0.75rem"></div>
        </article>
        <article class="bl-card">
          <h2>Linked chart</h2>
          <canvas class="bl-chart" data-bl-chart width="640" height="220"></canvas>
        </article>
        <article class="bl-card">
          <h2>Evidence ledger</h2>
          <div class="bl-table-wrap">
            <table class="bl-table">
              <thead><tr><th>Field</th><th>Value</th><th>QA</th><th>Type</th><th>Source</th><th>Retrieved</th></tr></thead>
              <tbody data-bl-ledger-body></tbody>
            </table>
          </div>
        </article>
        <article class="bl-card">
          <h2>Compact / rights placeholders</h2>
          <div class="bl-table-wrap">
            <table class="bl-table">
              <thead><tr><th>Category</th><th>Reference</th><th>Jurisdiction</th><th>Status</th><th>Note</th><th>Link</th></tr></thead>
              <tbody data-bl-claims-body></tbody>
            </table>
          </div>
        </article>
      </aside>
    </div>`;

  const app = new BlueLedgerCore.BlueLedgerApp({
    productName: "BlueLedger West",
    data: window.BL_WEST_DATA,
    defaultBasinId: "colorado",
    defaultStationId: "usgs-09402500",
    defaultMetric: "flow",
    mapCenter: [39.5, -112],
    mapZoom: 5,
    accentColor: "#7fd4ff",
    legalDisclaimer: window.BL_WEST_DATA.legalDisclaimer,
    shellHtml,
  });

  app.mount(document.getElementById("app"));
  document.querySelector("[data-bl-disclaimer]").textContent = window.BL_WEST_DATA.legalDisclaimer;
})();
