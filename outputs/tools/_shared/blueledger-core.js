/**
 * BlueLedger shared client core — map-first, time-aware, evidence-ledger UI.
 * Zero build step; consumed by BlueLedger Georgia and BlueLedger West.
 */
(function (global) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function formatNumber(value, digits = 0) {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);
  }

  function parseHashState() {
    const raw = global.location.hash.replace(/^#/, "");
    if (!raw) return {};
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return {};
    }
  }

  function writeHashState(state) {
    const next = encodeURIComponent(JSON.stringify(state));
    global.history.replaceState(null, "", `#${next}`);
  }

  function generateMonthlySeries(startYear, endYear, base, amplitude, noise = 0.08, recordType = "observed") {
    const rows = [];
    for (let year = startYear; year <= endYear; year += 1) {
      for (let month = 0; month < 12; month += 1) {
        const seasonal = Math.sin(((month + 3) / 12) * Math.PI * 2) * amplitude;
        const droughtCycle = Math.sin(((year - 1950) / 18) * Math.PI * 2) * amplitude * 0.35;
        const value = Math.max(0, base + seasonal + droughtCycle + (Math.random() - 0.5) * base * noise);
        const confidence =
          recordType === "reconstructed" ? 0.55 + Math.random() * 0.25 : recordType === "modeled" ? 0.75 : 1;
        rows.push({
          year,
          month: month + 1,
          label: `${year}-${String(month + 1).padStart(2, "0")}`,
          value: Number(value.toFixed(2)),
          confidence,
          recordType: year < 1900 ? "reconstructed" : recordType,
        });
      }
    }
    return rows;
  }

  function drawTimeSeries(canvas, series, options = {}) {
    const ctx = canvas.getContext("2d");
    const dpr = global.devicePixelRatio || 1;
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = { top: 18, right: 16, bottom: 32, left: 52 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const slice = series.slice(Math.max(0, series.length - (options.windowMonths || 240)));
    if (!slice.length) return;

    const values = slice.map((row) => row.value);
    const minV = Math.min(...values) * 0.92;
    const maxV = Math.max(...values) * 1.08;
    const x = (index) => pad.left + (index / Math.max(1, slice.length - 1)) * plotW;
    const y = (value) => pad.top + plotH - ((value - minV) / Math.max(1e-6, maxV - minV)) * plotH;

    ctx.strokeStyle = "#d6dee1";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const gy = pad.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(width - pad.right, gy);
      ctx.stroke();
      const val = maxV - ((maxV - minV) * i) / 4;
      ctx.fillStyle = "#526067";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(formatNumber(val, 0), 6, gy + 4);
    }

    ctx.beginPath();
    slice.forEach((row, index) => {
      const px = x(index);
      const py = y(row.value);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = options.color || "#0a6ebd";
    ctx.lineWidth = 2;
    ctx.stroke();

    const highlightIndex = options.highlightIndex ?? slice.length - 1;
    const hi = slice[highlightIndex];
    if (hi) {
      ctx.fillStyle = options.color || "#0a6ebd";
      ctx.beginPath();
      ctx.arc(x(highlightIndex), y(hi.value), 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#526067";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(slice[0]?.label || "", pad.left, height - 10);
    ctx.textAlign = "right";
    ctx.fillText(slice.at(-1)?.label || "", width - pad.right, height - 10);
    ctx.textAlign = "left";
  }

  class BlueLedgerApp {
    constructor(config) {
      this.config = config;
      this.data = config.data;
      this.state = {
        basinId: config.defaultBasinId || this.data.basins[0]?.id,
        stationId: config.defaultStationId || this.data.stations[0]?.id,
        timeIndex: null,
        metric: config.defaultMetric || "flow",
        waterYear: false,
        playing: false,
        ...parseHashState(),
      };
      this.map = null;
      this.markers = new Map();
      this.playTimer = null;
      this.els = {};
    }

    mount(root) {
      this.root = root;
      root.innerHTML = this.config.shellHtml;
      this.els = {
        map: root.querySelector("[data-bl-map]"),
        chart: root.querySelector("[data-bl-chart]"),
        timeSlider: root.querySelector("[data-bl-time]"),
        timeLabel: root.querySelector("[data-bl-time-label]"),
        basinSelect: root.querySelector("[data-bl-basin]"),
        metricSelect: root.querySelector("[data-bl-metric]"),
        stationTitle: root.querySelector("[data-bl-station-title]"),
        stationMeta: root.querySelector("[data-bl-station-meta]"),
        kpiGrid: root.querySelector("[data-bl-kpis]"),
        ledgerBody: root.querySelector("[data-bl-ledger-body]"),
        claimsBody: root.querySelector("[data-bl-claims-body]"),
        exportBtn: root.querySelector("[data-bl-export]"),
        playBtn: root.querySelector("[data-bl-play]"),
        waterYearToggle: root.querySelector("[data-bl-water-year]"),
        disclaimer: root.querySelector("[data-bl-disclaimer]"),
      };

      this.populateBasins();
      this.initMap();
      this.bindEvents();
      this.selectStation(this.state.stationId, { skipHash: true });
      this.setTimeIndex(this.state.timeIndex ?? this.currentSeries().length - 1, { skipHash: true });
      writeHashState(this.state);
    }

    currentStation() {
      return this.data.stations.find((s) => s.id === this.state.stationId) || this.data.stations[0];
    }

    currentSeries() {
      const station = this.currentStation();
      const metric = this.state.metric;
      return (station?.series?.[metric] || []).map((row) => ({
        ...row,
        value: row.value,
        recordType: row.recordType || station.recordType,
      }));
    }

    populateBasins() {
      if (!this.els.basinSelect) return;
      this.els.basinSelect.innerHTML = this.data.basins
        .map((b) => `<option value="${b.id}">${b.name}</option>`)
        .join("");
      this.els.basinSelect.value = this.state.basinId;
    }

    initMap() {
      if (!global.L || !this.els.map) return;
      this.map = global.L.map(this.els.map, { zoomControl: false }).setView(this.config.mapCenter, this.config.mapZoom);
      global.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 12,
      }).addTo(this.map);
      global.L.control.zoom({ position: "topright" }).addTo(this.map);
      this.renderMarkers();
    }

    renderMarkers() {
      if (!this.map) return;
      for (const marker of this.markers.values()) marker.remove();
      this.markers.clear();
      const stations = this.data.stations.filter(
        (s) => !this.state.basinId || s.basinId === this.state.basinId
      );
      for (const station of stations) {
        const icon = global.L.divIcon({
          className: `bl-marker bl-marker-${station.type}`,
          html: `<span>${station.shortLabel || station.name.slice(0, 3)}</span>`,
          iconSize: [28, 28],
        });
        const marker = global.L.marker([station.lat, station.lng], { icon }).addTo(this.map);
        marker.bindTooltip(station.name, { direction: "top" });
        marker.on("click", () => this.selectStation(station.id));
        this.markers.set(station.id, marker);
      }
      if (stations.length) {
        const bounds = global.L.latLngBounds(stations.map((s) => [s.lat, s.lng]));
        this.map.fitBounds(bounds.pad(0.25));
      }
    }

    bindEvents() {
      this.els.basinSelect?.addEventListener("change", () => {
        this.state.basinId = this.els.basinSelect.value;
        this.renderMarkers();
        const first = this.data.stations.find((s) => s.basinId === this.state.basinId);
        if (first) this.selectStation(first.id);
        writeHashState(this.state);
      });
      this.els.metricSelect?.addEventListener("change", () => {
        this.state.metric = this.els.metricSelect.value;
        this.setTimeIndex(this.currentSeries().length - 1);
      });
      this.els.timeSlider?.addEventListener("input", () => {
        this.setTimeIndex(Number(this.els.timeSlider.value));
      });
      this.els.playBtn?.addEventListener("click", () => this.togglePlay());
      this.els.waterYearToggle?.addEventListener("change", () => {
        this.state.waterYear = this.els.waterYearToggle.checked;
        this.refresh();
      });
      this.els.exportBtn?.addEventListener("click", () => this.exportPackage());
      global.addEventListener("resize", () => this.refresh());
    }

    selectStation(stationId, options = {}) {
      this.state.stationId = stationId;
      const station = this.currentStation();
      if (this.els.stationTitle) this.els.stationTitle.textContent = station.name;
      if (this.els.stationMeta) {
        this.els.stationMeta.innerHTML = `
          <span>${station.type}</span>
          <span>${station.source.agency}</span>
          <span>POR ${station.periodOfRecord.start}–${station.periodOfRecord.end}</span>
          <span class="qa qa-${station.qaStatus}">${station.qaStatus}</span>
        `;
      }
      this.renderLedger(station);
      this.renderClaims(station);
      this.setTimeIndex(this.currentSeries().length - 1, options);
      if (!options.skipHash) writeHashState(this.state);
    }

    setTimeIndex(index, options = {}) {
      const series = this.currentSeries();
      this.state.timeIndex = Math.max(0, Math.min(series.length - 1, index));
      if (this.els.timeSlider) {
        this.els.timeSlider.max = String(Math.max(0, series.length - 1));
        this.els.timeSlider.value = String(this.state.timeIndex);
      }
      this.refresh();
      if (!options.skipHash) writeHashState(this.state);
    }

    refresh() {
      const station = this.currentStation();
      const series = this.currentSeries();
      const row = series[this.state.timeIndex];
      if (this.els.timeLabel && row) {
        this.els.timeLabel.textContent = `${row.label} · ${this.metricLabel()} ${formatNumber(row.value, 1)} ${station.units[this.state.metric] || ""}`;
      }
      drawTimeSeries(this.els.chart, series, {
        color: this.config.accentColor,
        highlightIndex: this.state.timeIndex,
        windowMonths: 180,
      });
      this.renderKpis(station, row, series);
    }

    metricLabel() {
      const labels = { flow: "Flow", stage: "Stage", storage: "Storage", elevation: "Elevation", swe: "SWE", et: "ET" };
      return labels[this.state.metric] || this.state.metric;
    }

    renderKpis(station, row, series) {
      if (!this.els.kpiGrid || !row) return;
      const values = series.map((r) => r.value);
      const avg = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
      const rank = values.filter((v) => v <= row.value).length / values.length;
      this.els.kpiGrid.innerHTML = `
        <div class="bl-kpi"><span>Current</span><strong>${formatNumber(row.value, 1)}</strong><small>${station.units[this.state.metric]}</small></div>
        <div class="bl-kpi"><span>Long-term avg</span><strong>${formatNumber(avg, 1)}</strong><small>${station.units[this.state.metric]}</small></div>
        <div class="bl-kpi"><span>Percentile</span><strong>${formatNumber(rank * 100, 0)}%</strong><small>within POR</small></div>
        <div class="bl-kpi"><span>Record type</span><strong>${row.recordType}</strong><small>confidence ${formatNumber(row.confidence * 100, 0)}%</small></div>
      `;
    }

    renderLedger(station) {
      if (!this.els.ledgerBody) return;
      const entries = [
        {
          field: this.metricLabel(),
          value: station.latest?.[this.state.metric],
          unit: station.units[this.state.metric],
          source: station.source.url,
          agency: station.source.agency,
          retrieved: station.source.retrieved,
          qa: station.qaStatus,
          recordType: station.recordType,
        },
        ...Object.entries(station.provenance || {}).map(([field, meta]) => ({
          field,
          value: meta.value,
          unit: meta.unit || "",
          source: meta.source || station.source.url,
          agency: meta.agency || station.source.agency,
          retrieved: meta.retrieved || station.source.retrieved,
          qa: meta.qa || station.qaStatus,
          recordType: meta.recordType || station.recordType,
        })),
      ];
      this.els.ledgerBody.innerHTML = entries
        .map(
          (e) => `<tr>
            <td>${e.field}</td>
            <td>${formatNumber(e.value, 2)} ${e.unit}</td>
            <td><span class="qa qa-${e.qa}">${e.qa}</span></td>
            <td>${e.recordType}</td>
            <td><a href="${e.source}" target="_blank" rel="noopener">${e.agency}</a></td>
            <td>${e.retrieved}</td>
          </tr>`
        )
        .join("");
    }

    renderClaims(station) {
      if (!this.els.claimsBody) return;
      const claims = this.data.claims.filter(
        (c) => c.basinId === station.basinId || c.stationIds?.includes(station.id)
      );
      this.els.claimsBody.innerHTML = claims.length
        ? claims
            .map(
              (c) => `<tr>
              <td>${c.category}</td>
              <td>${c.referenceId}</td>
              <td>${c.jurisdiction}</td>
              <td><span class="claim-status">${c.status}</span></td>
              <td>${c.disclaimer}</td>
              <td><a href="${c.sourceUrl}" target="_blank" rel="noopener">source</a></td>
            </tr>`
            )
            .join("")
        : `<tr><td colspan="6">No legal/administrative placeholders linked to this station (data gap).</td></tr>`;
    }

    togglePlay() {
      this.state.playing = !this.state.playing;
      if (this.els.playBtn) this.els.playBtn.textContent = this.state.playing ? "Pause" : "Play";
      if (this.playTimer) clearInterval(this.playTimer);
      if (!this.state.playing) return;
      this.playTimer = setInterval(() => {
        const series = this.currentSeries();
        const next = this.state.timeIndex + 1;
        if (next >= series.length) {
          this.state.playing = false;
          if (this.els.playBtn) this.els.playBtn.textContent = "Play";
          clearInterval(this.playTimer);
          return;
        }
        this.setTimeIndex(next);
      }, 350);
    }

    exportPackage() {
      const station = this.currentStation();
      const payload = {
        exportedAt: new Date().toISOString(),
        product: this.config.productName,
        station,
        metric: this.state.metric,
        series: this.currentSeries(),
        claims: this.data.claims.filter((c) => c.basinId === station.basinId),
        disclaimer: this.config.legalDisclaimer,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${station.id}-${this.state.metric}-evidence.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  global.BlueLedgerCore = {
    BlueLedgerApp,
    generateMonthlySeries,
    formatNumber,
    MONTHS,
  };
})(window);
