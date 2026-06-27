/**
 * PrecisionFlow dosing line simulation engine (browser-only digital twin).
 */
(function (global) {
  const LIQUIDS = {
    A: { name: "Liquid A", density: 1.02, viscosity: 12, dropletUl: 50, hazard: "corrosive" },
    B: { name: "Liquid B", density: 0.98, viscosity: 8, dropletUl: 48, hazard: "flammable" },
    C: { name: "Liquid C", density: 1.08, viscosity: 22, dropletUl: 52, hazard: "toxic" },
  };

  const RECIPES = {
    standard: {
      id: "standard",
      name: "Standard 3-liquid batch",
      targets: { A: 12.5, B: 8.2, C: 4.1 },
      tolerancePct: 0.1,
      cpkTarget: 1.67,
      hazardProfileComplete: true,
    },
    highVis: {
      id: "highVis",
      name: "High-viscosity variant",
      targets: { A: 10.0, B: 9.5, C: 5.0 },
      tolerancePct: 0.15,
      cpkTarget: 1.67,
      hazardProfileComplete: true,
    },
    draft: {
      id: "draft",
      name: "Draft recipe (blocked)",
      targets: { A: 11, B: 7, C: 3 },
      tolerancePct: 0.1,
      cpkTarget: 1.67,
      hazardProfileComplete: false,
    },
  };

  const PHASES = [
    "idle",
    "carrier_detect",
    "tare",
    "dose_a",
    "verify_a",
    "dwell_ab",
    "dose_b",
    "verify_b",
    "dwell_bc",
    "dose_c",
    "verify_c",
    "mix",
    "qa_hold",
    "release",
    "complete",
  ];

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  function cpk(samples, target, tolerance) {
    if (samples.length < 3) return { cp: 0, cpk: 0, mean: 0, sigma: 0 };
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / (samples.length - 1);
    const sigma = Math.sqrt(Math.max(variance, 1e-9));
    const usl = target * (1 + tolerance / 100);
    const lsl = target * (1 - tolerance / 100);
    const cp = (usl - lsl) / (6 * sigma);
    const cpk = Math.min((usl - mean) / (3 * sigma), (mean - lsl) / (3 * sigma));
    return { cp, cpk, mean, sigma };
  }

  class PrecisionFlowEngine {
    constructor() {
      this.reset();
    }

    reset() {
      this.running = false;
      this.phaseIndex = 0;
      this.scanMs = 50;
      this.scanCount = 0;
      this.batchId = `B${Date.now().toString(36).toUpperCase()}`;
      this.recipe = RECIPES.standard;
      this.random = rng(Date.now());
      this.actual = { A: 0, B: 0, C: 0 };
      this.dripLossMg = { A: 0, B: 0, C: 0 };
      this.alarms = [];
      this.history = [];
      this.samples = { A: [], B: [], C: [] };
      this.interlocks = this.buildInterlocks();
      this.tags = this.buildTags();
      this.lastTick = performance.now();
    }

    buildInterlocks() {
      return [
        { id: "vent_ok", label: "Local exhaust ventilation OK", pass: true },
        { id: "lel", label: "LEL below action level", pass: true },
        { id: "containment", label: "Secondary containment armed", pass: true },
        { id: "esd", label: "Emergency shutdown circuit healthy", pass: true },
        { id: "hazard_profile", label: "Hazard profile complete", pass: this.recipe.hazardProfileComplete },
        { id: "door", label: "Guard door closed", pass: true },
      ];
    }

    buildTags() {
      return [
        { name: "Line.Running", value: false, type: "BOOL" },
        { name: "Line.Phase", value: "idle", type: "STRING" },
        { name: "Line.ScanMs", value: this.scanMs, type: "REAL" },
        { name: "Dose.A.Target_g", value: this.recipe.targets.A, type: "REAL" },
        { name: "Dose.A.Actual_g", value: 0, type: "REAL" },
        { name: "Dose.B.Target_g", value: this.recipe.targets.B, type: "REAL" },
        { name: "Dose.B.Actual_g", value: 0, type: "REAL" },
        { name: "Dose.C.Target_g", value: this.recipe.targets.C, type: "REAL" },
        { name: "Dose.C.Actual_g", value: 0, type: "REAL" },
        { name: "QA.Cpk_A", value: 0, type: "REAL" },
        { name: "QA.Cpk_B", value: 0, type: "REAL" },
        { name: "QA.Cpk_C", value: 0, type: "REAL" },
        { name: "Safety.ESD", value: false, type: "BOOL" },
        { name: "Safety.DripLoss_mg", value: 0, type: "REAL" },
      ];
    }

    setRecipe(id) {
      this.recipe = RECIPES[id] || RECIPES.standard;
      this.interlocks = this.buildInterlocks();
      this.syncTags();
    }

    syncTags() {
      this.tags.find((t) => t.name === "Line.Running").value = this.running;
      this.tags.find((t) => t.name === "Line.Phase").value = PHASES[this.phaseIndex];
      this.tags.find((t) => t.name === "Dose.A.Target_g").value = this.recipe.targets.A;
      this.tags.find((t) => t.name === "Dose.B.Target_g").value = this.recipe.targets.B;
      this.tags.find((t) => t.name === "Dose.C.Target_g").value = this.recipe.targets.C;
      this.tags.find((t) => t.name === "Dose.A.Actual_g").value = this.actual.A;
      this.tags.find((t) => t.name === "Dose.B.Actual_g").value = this.actual.B;
      this.tags.find((t) => t.name === "Dose.C.Actual_g").value = this.actual.C;
      const statsA = cpk(this.samples.A, this.recipe.targets.A, this.recipe.tolerancePct);
      this.tags.find((t) => t.name === "QA.Cpk_A").value = Number(statsA.cpk.toFixed(2));
      this.tags.find((t) => t.name === "QA.Cpk_B").value = Number(
        cpk(this.samples.B, this.recipe.targets.B, this.recipe.tolerancePct).cpk.toFixed(2)
      );
      this.tags.find((t) => t.name === "QA.Cpk_C").value = Number(
        cpk(this.samples.C, this.recipe.targets.C, this.recipe.tolerancePct).cpk.toFixed(2)
      );
      this.tags.find((t) => t.name === "Safety.DripLoss_mg").value =
        this.dripLossMg.A + this.dripLossMg.B + this.dripLossMg.C;
    }

    alarm(priority, message) {
      this.alarms.unshift({
        time: new Date().toISOString(),
        priority,
        message,
      });
      this.alarms = this.alarms.slice(0, 12);
    }

    start() {
      if (!this.recipe.hazardProfileComplete) {
        this.alarm("HIGH", "Recipe blocked: hazard profile incomplete.");
        return false;
      }
      if (this.running) return true;
      this.running = true;
      this.phaseIndex = 1;
      this.batchId = `B${Date.now().toString(36).toUpperCase()}`;
      this.actual = { A: 0, B: 0, C: 0 };
      this.alarm("LOW", `Batch ${this.batchId} started — ${this.recipe.name}`);
      this.syncTags();
      return true;
    }

    stop() {
      this.running = false;
      this.phaseIndex = 0;
      this.syncTags();
    }

    tick() {
      if (!this.running) return;
      this.scanCount += 1;
      const phase = PHASES[this.phaseIndex];
      const tol = this.recipe.tolerancePct / 100;

      if (phase.startsWith("dose_")) {
        const liquid = phase.split("_")[1].toUpperCase();
        const target = this.recipe.targets[liquid];
        const rate = target / 8;
        this.actual[liquid] = Math.min(target * (1 + tol * 0.3), this.actual[liquid] + rate * (0.9 + this.random() * 0.2));
        if (Math.random() < 0.02) this.dripLossMg[liquid] += 0.05 + this.random() * 0.15;
      }

      if (phase.startsWith("verify_")) {
        const liquid = phase.split("_")[1].toUpperCase();
        const target = this.recipe.targets[liquid];
        const errorPct = ((this.actual[liquid] - target) / target) * 100;
        this.samples[liquid].push(this.actual[liquid]);
        if (Math.abs(errorPct) > this.recipe.tolerancePct) {
          this.alarm("HIGH", `${liquid} dose ${errorPct.toFixed(2)}% outside ±${this.recipe.tolerancePct}%`);
          this.phaseIndex = PHASES.indexOf("qa_hold");
        }
      }

      if (phase === "mix" && this.random() < 0.01) {
        this.interlocks.find((i) => i.id === "lel").pass = false;
        this.alarm("HIGH", "LEL rising — ventilation interlock review");
      }

      if (phase === "release") {
        const stats = ["A", "B", "C"].map((L) =>
          cpk(this.samples[L], this.recipe.targets[L], this.recipe.tolerancePct)
        );
        const pass = stats.every((s) => s.cpk >= this.recipe.cpkTarget);
        const drip = this.dripLossMg.A + this.dripLossMg.B + this.dripLossMg.C;
        if (!pass) this.alarm("MED", "Cpk below target — batch held for QA review");
        if (drip > 1.5) this.alarm("MED", `Drip loss ledger ${drip.toFixed(2)} mg exceeds screening threshold`);
        if (pass && drip <= 1.5) this.alarm("LOW", `Batch ${this.batchId} released`);
      }

      this.phaseIndex += 1;
      if (this.phaseIndex >= PHASES.length) {
        this.running = false;
        this.phaseIndex = 0;
      }

      this.history.push({
        scan: this.scanCount,
        phase,
        actual: { ...this.actual },
      });
      this.history = this.history.slice(-120);
      this.syncTags();
    }

    snapshot() {
      this.syncTags();
      return {
        running: this.running,
        phase: PHASES[this.phaseIndex],
        scanCount: this.scanCount,
        scanMs: this.scanMs,
        batchId: this.batchId,
        recipe: this.recipe,
        actual: { ...this.actual },
        dripLossMg: { ...this.dripLossMg },
        tags: this.tags.map((t) => ({ ...t })),
        alarms: [...this.alarms],
        interlocks: this.interlocks.map((i) => ({ ...i })),
        samples: { A: [...this.samples.A], B: [...this.samples.B], C: [...this.samples.C] },
        liquids: LIQUIDS,
        recipes: RECIPES,
      };
    }
  }

  global.PrecisionFlowEngine = { PrecisionFlowEngine, cpk, LIQUIDS, RECIPES, PHASES };
})(window);
