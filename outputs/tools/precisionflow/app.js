(function () {
  const engine = new PrecisionFlowEngine.PrecisionFlowEngine();
  let timer = null;

  const els = {
    kpiRow: document.getElementById("kpiRow"),
    recipeSelect: document.getElementById("recipeSelect"),
    startBtn: document.getElementById("startBtn"),
    stopBtn: document.getElementById("stopBtn"),
    resetBtn: document.getElementById("resetBtn"),
    exportBtn: document.getElementById("exportBtn"),
    tagBody: document.getElementById("tagBody"),
    alarmBody: document.getElementById("alarmBody"),
    interlockList: document.getElementById("interlockList"),
    batchRecord: document.getElementById("batchRecord"),
    plcStatus: document.getElementById("plcStatus"),
    spcCanvas: document.getElementById("spcCanvas"),
    safetyBanner: document.getElementById("safetyBanner"),
    pumpA: document.getElementById("pumpA"),
    pumpB: document.getElementById("pumpB"),
    pumpC: document.getElementById("pumpC"),
  };

  Object.values(PrecisionFlowEngine.RECIPES).forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.name;
    els.recipeSelect.appendChild(opt);
  });

  function drawSpc(snapshot) {
    const canvas = els.spcCanvas;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const liquids = ["A", "B", "C"];
    const colors = ["#4da3ff", "#3ddc84", "#ffc857"];
    const pad = 24;
    const colW = (w - pad * 2) / 3;
    liquids.forEach((L, idx) => {
      const target = snapshot.recipe.targets[L];
      const samples = snapshot.samples[L];
      const stats = PrecisionFlowEngine.cpk(samples, target, snapshot.recipe.tolerancePct);
      const x0 = pad + idx * colW;
      ctx.fillStyle = "#8b9cb0";
      ctx.font = "11px system-ui";
      ctx.fillText(`Liquid ${L} Cpk ${stats.cpk.toFixed(2)}`, x0, 16);
      ctx.strokeStyle = colors[idx];
      ctx.beginPath();
      samples.forEach((v, i) => {
        const x = x0 + (i / Math.max(1, samples.length - 1)) * (colW - 12);
        const y = 150 - ((v - target * 0.85) / (target * 0.3)) * 100;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#ff5c5c";
      const usl = 150 - ((target * 1.001 - target * 0.85) / (target * 0.3)) * 100;
      const lsl = 150 - ((target * 0.999 - target * 0.85) / (target * 0.3)) * 100;
      ctx.beginPath();
      ctx.moveTo(x0, usl);
      ctx.lineTo(x0 + colW - 12, usl);
      ctx.moveTo(x0, lsl);
      ctx.lineTo(x0 + colW - 12, lsl);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  function render() {
    const snap = engine.snapshot();
    const hazardOk = snap.recipe.hazardProfileComplete && snap.interlocks.every((i) => i.pass);
    els.safetyBanner.className = hazardOk ? "pf-banner ok" : "pf-banner";
    els.safetyBanner.textContent = hazardOk
      ? "Hazard profile complete · interlocks healthy · simulation-only digital twin"
      : "Process safety incomplete — recipe approval and batch release blocked until hazard profile is complete.";

    els.kpiRow.innerHTML = `
      <div class="pf-kpi"><span>Phase</span><strong>${snap.phase}</strong></div>
      <div class="pf-kpi"><span>Scan cycle</span><strong>${snap.scanMs} ms</strong></div>
      <div class="pf-kpi"><span>Batch</span><strong>${snap.batchId}</strong></div>
      <div class="pf-kpi"><span>Drip loss</span><strong>${(snap.dripLossMg.A + snap.dripLossMg.B + snap.dripLossMg.C).toFixed(2)} mg</strong></div>`;

    els.plcStatus.innerHTML = `
      <dt>Controller</dt><dd>PF-PLC-01 RUN ${snap.running ? "TRUE" : "FALSE"}</dd>
      <dt>Scan count</dt><dd>${snap.scanCount}</dd>
      <dt>Active phase</dt><dd>${snap.phase}</dd>
      <dt>Recipe</dt><dd>${snap.recipe.name}</dd>`;

    els.tagBody.innerHTML = snap.tags
      .map((t) => `<tr><td>${t.name}</td><td class="num">${t.value}</td><td>${t.type}</td></tr>`)
      .join("");

    els.alarmBody.innerHTML = snap.alarms.length
      ? snap.alarms
          .map(
            (a) =>
              `<tr><td>${a.time.slice(11, 19)}</td><td class="pf-alarm-${a.priority === "HIGH" ? "high" : "med"}">${a.priority}</td><td>${a.message}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="3">No active alarms</td></tr>`;

    els.interlockList.innerHTML = snap.interlocks
      .map((i) => `<li class="${i.pass ? "pass" : "fail"}">${i.label}</li>`)
      .join("");

    els.batchRecord.innerHTML = `
      <dt>Batch ID</dt><dd>${snap.batchId}</dd>
      <dt>Liquid A</dt><dd>${snap.actual.A.toFixed(3)} g (target ${snap.recipe.targets.A} g)</dd>
      <dt>Liquid B</dt><dd>${snap.actual.B.toFixed(3)} g (target ${snap.recipe.targets.B} g)</dd>
      <dt>Liquid C</dt><dd>${snap.actual.C.toFixed(3)} g (target ${snap.recipe.targets.C} g)</dd>
      <dt>Release status</dt><dd>${snap.phase === "complete" || snap.phase === "idle" ? "See QA alarms" : "In process"}</dd>`;

    ["A", "B", "C"].forEach((L, i) => {
      const el = [els.pumpA, els.pumpB, els.pumpC][i];
      const active = snap.phase.includes(`dose_${L.toLowerCase()}`) || snap.phase.includes(`verify_${L.toLowerCase()}`);
      el.classList.toggle("active", active);
    });

    drawSpc(snap);
  }

  function loop() {
    engine.tick();
    render();
  }

  els.recipeSelect.addEventListener("change", () => {
    engine.setRecipe(els.recipeSelect.value);
    render();
  });

  els.startBtn.addEventListener("click", () => {
    if (engine.start()) {
      if (timer) clearInterval(timer);
      timer = setInterval(loop, engine.scanMs);
    }
    render();
  });

  els.stopBtn.addEventListener("click", () => {
    engine.stop();
    if (timer) clearInterval(timer);
    render();
  });

  els.resetBtn.addEventListener("click", () => {
    engine.reset();
    if (timer) clearInterval(timer);
    render();
  });

  els.exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(engine.snapshot(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${engine.batchId}-batch-record.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  window.addEventListener("resize", render);
  render();
})();
