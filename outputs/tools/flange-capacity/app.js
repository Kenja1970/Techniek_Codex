const APP_VERSION = "0.6.0-evidence-traceability";
const MATERIALS = window.MATERIAL_STRESS_DATA ?? [];
const BOLT_MATERIALS = window.BOLT_STRESS_DATA ?? [];
const COMPACT_FLANGES = window.COMPACT_FLANGE_DATA ?? [];
const {
  classOptionsFor,
  closestOption,
  exactCompactRecord,
  formatNps,
  isSupportedConfiguration,
  npsOptionsFor,
  scopeStatement,
} = window.FLANGE_CONFIGURATION;
const {
  evaluateEvidenceState,
  normalizeEvidenceState,
} = window.FLANGE_QUALIFICATION;
let activeProductLine = "asme";
const DEFAULT_MATERIAL_ID =
  MATERIALS.find(
    (mat) => mat.specNo === "SA-516" && String(mat.typeGrade) === "70"
  )?.id ??
  MATERIALS[0]?.id ??
  "";
const DEFAULT_BOLT_MATERIAL_ID =
  BOLT_MATERIALS.find(
    (mat) => mat.specNo === "SA-193" && String(mat.typeGrade).includes("B7")
  )?.id ??
  BOLT_MATERIALS[0]?.id ??
  "";

const PRESSURE_RATING_100F = {
  150: 285,
  300: 740,
  600: 1480,
  900: 2220,
  1500: 3705,
  2500: 6170,
};

const PIPE_OD = {
  0.5: 0.84,
  0.75: 1.05,
  1: 1.315,
  1.25: 1.66,
  1.5: 1.9,
  2: 2.375,
  2.5: 2.875,
  3: 3.5,
  3.5: 4,
  4: 4.5,
  5: 5.563,
  6: 6.625,
  8: 8.625,
  10: 10.75,
  12: 12.75,
  14: 14,
  16: 16,
  18: 18,
  20: 20,
  22: 22,
  24: 24,
};

const GASKET_DIAMETER_ADD = {
  150: 1.35,
  300: 1.55,
  600: 1.75,
  900: 2.05,
  1500: 2.35,
  2500: 2.8,
};

const EDITION_NOTES = {
  2019: {
    title: "2019 basis",
    note:
      "The 2019 text frames 4.16 around pressure end load, gasket seating, external tensile axial force, net-section bending moment, stress acceptance, and flange rigidity.",
    bullets: [
      "Standard flanges are accepted by pressure-temperature rating when used inside the referenced standard limits.",
      "The supplied 2019 text includes fuller hub material fabrication wording in 4.16.4 than the later extracted text.",
      "No separate numerical standard-flange external-load allowance is provided by rating alone.",
    ],
  },
  2021: {
    title: "2021 basis",
    note:
      "The 2021 extraction keeps the same core 4.16 calculation path for this screening use case, with mostly editorial cleanup and reorganized material wording.",
    bullets: [
      "The pressure, gasket, axial-load, bending-moment, stress, and rigidity workflow remains aligned with 2019.",
      "The comparison did not show a capacity-changing standard-flange rule in 4.16 for this prototype model.",
      "Use the exact controlled edition for any purchased or fabricated flange design record.",
    ],
  },
  2023: {
    title: "2023 basis",
    note:
      "The 2023 text retains the same core standard-flange screening concept, while clarifying selected definitions and references.",
    bullets: [
      "Bolt area is clarified as total area based on the smaller of thread-root diameter or least unthreaded diameter.",
      "ASME PCC-1 Appendix H is referenced as a source for common bolt root areas.",
      "Step references and nomenclature were cleaned up; this prototype therefore does not apply an edition capacity multiplier.",
    ],
  },
};

const FAMILY_LABELS = {
  "B16.5": "ASME B16.5",
  "B16.47A": "ASME B16.47 Series A",
  "B16.47B": "ASME B16.47 Series B",
};

const PRODUCT_LINES = {
  asme: {
    label: "Standard Rated Flange Line",
    controlTitle: "Standard Flange",
    description:
      "Standard rated-flange screening using ASME B16.5/B16.47 references, material derating, and external-load interaction.",
    reportTitle: "Standard Flange External Load Calculation Set",
  },
  compact: {
    label: "FlangeTec® Compact Line",
    controlTitle: "FlangeTec® Compact Flange",
    description:
      "Compact CF catalog geometry and weights from supplied LTS Energy FlangeTec® data, checked with an alternate proof-style load path.",
    reportTitle: "FlangeTec® Compact Flange Qualification Calculation Set",
  },
};

const COMPACT_REFERENCE_CLAIM = {
  nps: 8,
  ratingClass: 2500,
  compactWeightLb: 363,
  asmeWeightLb: 1359,
  savingsPercent: 73,
  source:
    "LTS Energy FlangeTec® compact-flange catalog page 1; weights stated accurate to +/-2%.",
};

const INTELLECTUAL_PROPERTY_NOTICE = {
  flangetec:
    "FlangeTec® is a registered trademark of LTS Energy. Use identifies the referenced product line only and does not imply sponsorship, approval, or certification by LTS Energy.",
  asme:
    "ASME is a registered trademark of The American Society of Mechanical Engineers. Publication titles and designations are referenced nominatively only. No ASME logo, certification mark, or Code Symbol Stamp is used.",
  publicationUse:
    "Controlled standards are not reproduced. Users must obtain authorized publications and determine the governing edition, jurisdiction, and conformity-assessment requirements.",
};

const EVIDENCE_STORAGE_KEY = "flangeQualificationEvidence.v2";
const LEGACY_EVIDENCE_STORAGE_KEY = "flangeQualificationEvidence.v1";

const controls = {
  nps: document.getElementById("nps"),
  ratingClass: document.getElementById("ratingClass"),
  pressurePct: document.getElementById("pressurePct"),
  temperature: document.getElementById("temperature"),
  temperatureUnit: document.getElementById("temperatureUnit"),
  materialFilter: document.getElementById("materialFilter"),
  material: document.getElementById("material"),
  boltMaterialFilter: document.getElementById("boltMaterialFilter"),
  boltMaterial: document.getElementById("boltMaterial"),
  axial: document.getElementById("axial"),
  moment: document.getElementById("moment"),
  edition: document.getElementById("edition"),
  family: document.getElementById("family"),
  projectName: document.getElementById("projectName"),
  calcId: document.getElementById("calcId"),
  preparedBy: document.getElementById("preparedBy"),
  reviewer: document.getElementById("reviewer"),
  downloadCalcSet: document.getElementById("downloadCalcSet"),
  openCalcSet: document.getElementById("openCalcSet"),
  downloadEvidence: document.getElementById("downloadEvidence"),
  downloadAgentSnapshot: document.getElementById("downloadAgentSnapshot"),
  lineAsme: document.getElementById("lineAsme"),
  lineCompact: document.getElementById("lineCompact"),
};

const els = {
  selectedFlange: document.getElementById("selectedFlange"),
  npsOut: document.getElementById("npsOut"),
  classOut: document.getElementById("classOut"),
  pressureOut: document.getElementById("pressureOut"),
  temperatureOut: document.getElementById("temperatureOut"),
  axialOut: document.getElementById("axialOut"),
  momentOut: document.getElementById("momentOut"),
  scopeStatus: document.getElementById("scopeStatus"),
  utilizationLabel: document.getElementById("utilizationLabel"),
  meterFill: document.getElementById("meterFill"),
  ratingPsi: document.getElementById("ratingPsi"),
  operatingPsi: document.getElementById("operatingPsi"),
  materialAllowable: document.getElementById("materialAllowable"),
  boltAllowable: document.getElementById("boltAllowable"),
  pressureCapacity: document.getElementById("pressureCapacity"),
  axialCapacity: document.getElementById("axialCapacity"),
  momentCapacity: document.getElementById("momentCapacity"),
  stressStatus: document.getElementById("stressStatus"),
  stressState: document.getElementById("stressState"),
  dimensionsSummary: document.getElementById("dimensionsSummary"),
  diagramA: document.getElementById("diagramA"),
  diagramC: document.getElementById("diagramC"),
  classChart: document.getElementById("classChart"),
  chartCaption: document.getElementById("chartCaption"),
  editionTitle: document.getElementById("editionTitle"),
  editionNote: document.getElementById("editionNote"),
  editionBullets: document.getElementById("editionBullets"),
  lineControlTitle: document.getElementById("lineControlTitle"),
  lineDescription: document.getElementById("lineDescription"),
  familyControl: document.getElementById("familyControl"),
  configurationScopeNote: document.getElementById("configurationScopeNote"),
  qualificationStatus: document.getElementById("qualificationStatus"),
  qualificationSummary: document.getElementById("qualificationSummary"),
  readinessStatus: document.getElementById("readinessStatus"),
  readinessBar: document.getElementById("readinessBar"),
  readinessCount: document.getElementById("readinessCount"),
  evidenceChecklist: document.getElementById("evidenceChecklist"),
  agentCalculationState: document.getElementById("agentCalculationState"),
  canvas: document.getElementById("interactionCanvas"),
};

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function psiToBar(value) {
  return value * 0.0689476;
}

function psiToPa(value) {
  return value * 6894.757293;
}

function kipToKn(value) {
  return value * 4.4482216;
}

function kipFtToKnM(value) {
  return value * 1.35581795;
}

function ksiToMpa(value) {
  return value * 6.89475729;
}

function fToC(value) {
  return ((value - 32) * 5) / 9;
}

function formatPressure(valuePsi, digits = 0) {
  return `${formatNumber(valuePsi, digits)} psi / ${formatNumber(
    psiToBar(valuePsi),
    2
  )} bar / ${formatNumber(psiToPa(valuePsi), 0)} Pa`;
}

function formatAxial(valueKip) {
  return `${formatNumber(valueKip)} kip / ${formatNumber(kipToKn(valueKip))} kN`;
}

function formatMoment(valueKipFt) {
  return `${formatNumber(valueKipFt)} kip-ft / ${formatNumber(
    kipFtToKnM(valueKipFt)
  )} kN-m`;
}

function formatAllowable(valueKsi) {
  if (!Number.isFinite(valueKsi)) return "n/a";
  return `${formatNumber(valueKsi, 1)} ksi / ${formatNumber(
    ksiToMpa(valueKsi),
    0
  )} MPa`;
}

function selectedMaterial(id) {
  return MATERIALS.find((mat) => mat.id === id) ?? MATERIALS[0] ?? null;
}

function selectedBoltMaterial(id) {
  return BOLT_MATERIALS.find((mat) => mat.id === id) ?? BOLT_MATERIALS[0] ?? null;
}

function interpolateCurve(curve, temperatureF) {
  if (!curve?.length) return null;
  const sorted = curve
    .map(([temp, stress]) => [Number(temp), Number(stress)])
    .filter(([temp, stress]) => Number.isFinite(temp) && Number.isFinite(stress))
    .sort((a, b) => a[0] - b[0]);
  if (!sorted.length) return null;
  if (temperatureF <= sorted[0][0]) return sorted[0][1];
  for (let i = 1; i < sorted.length; i += 1) {
    const [t1, s1] = sorted[i - 1];
    const [t2, s2] = sorted[i];
    if (temperatureF <= t2) {
      const ratio = (temperatureF - t1) / (t2 - t1);
      return s1 + (s2 - s1) * ratio;
    }
  }
  return null;
}

function materialDerate(material, temperatureF) {
  const baseline = interpolateCurve(material?.curveKsi, 100);
  const atTemperature = interpolateCurve(material?.curveKsi, temperatureF);
  if (!baseline || !atTemperature) {
    return {
      baselineKsi: baseline,
      allowableKsi: atTemperature,
      derate: 0,
      withinTemperatureTable: false,
    };
  }
  return {
    baselineKsi: baseline,
    allowableKsi: atTemperature,
    derate: Math.max(0, Math.min(1, atTemperature / baseline)),
    withinTemperatureTable: true,
  };
}

function materialSearchText(mat) {
  return [
    mat.label,
    mat.specNo,
    mat.typeGrade,
    mat.uns,
    mat.composition,
    mat.productForm,
    mat.condition,
    mat.table,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function populateMaterialSelect({
  data,
  select,
  filter,
  defaultId,
  maxOptions = 180,
}) {
  if (!select || !data.length) return;
  const previous = select.value || defaultId;
  const query = filter?.value?.trim().toLowerCase() ?? "";
  const matches = query
    ? data.filter((mat) => materialSearchText(mat).includes(query))
    : data;
  const shown = matches.slice(0, maxOptions);
  const options = shown.map((mat) => {
    const option = document.createElement("option");
    option.value = mat.id;
    option.textContent = `${mat.label} | ${mat.table}`;
    return option;
  });
  if (!options.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No matching materials";
    options.push(option);
  }
  select.replaceChildren(...options);
  select.value = shown.some((mat) => mat.id === previous)
    ? previous
    : shown[0]?.id ?? "";
  select.title = `${matches.length} matching material rows; showing ${shown.length}`;
}

function replaceNumericOptions(select, options, preferred, fallback, labelFor) {
  const selected = closestOption(options, preferred, fallback);
  select.replaceChildren(
    ...options.map((value) => {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = labelFor(value);
      return option;
    })
  );
  if (selected !== null) select.value = String(selected);
  return selected;
}

function configurationOptions(state = {}) {
  const productLine = state.productLine ?? activeProductLine;
  const family = state.family ?? controls.family.value;
  const npsOptions = npsOptionsFor({
    productLine,
    family,
    compactRows: COMPACT_FLANGES,
  });
  const nps = closestOption(
    npsOptions,
    state.nps ?? Number(controls.nps.value),
    productLine === "compact" ? 4 : family === "B16.5" ? 4 : 26
  );
  const classOptions = classOptionsFor({
    productLine,
    family,
    nps,
    compactRows: COMPACT_FLANGES,
  });
  return {
    productLine,
    family,
    nps,
    npsOptions,
    ratingClass: closestOption(
      classOptions,
      state.ratingClass ?? Number(controls.ratingClass.value),
      productLine === "compact" ? 600 : 300
    ),
    classOptions,
    scope: scopeStatement({ productLine, family }),
  };
}

function syncConfigurationControls() {
  const options = configurationOptions();
  const nps = replaceNumericOptions(
    controls.nps,
    options.npsOptions,
    options.nps,
    options.productLine === "compact" ? 4 : 26,
    (value) => `NPS ${formatNps(value)}`
  );
  const classValues = classOptionsFor({
    productLine: options.productLine,
    family: options.family,
    nps,
    compactRows: COMPACT_FLANGES,
  });
  replaceNumericOptions(
    controls.ratingClass,
    classValues,
    options.ratingClass,
    options.productLine === "compact" ? 600 : 300,
    (value) => `Class ${value}`
  );
  controls.family.disabled = options.productLine === "compact";
  els.familyControl.hidden = options.productLine === "compact";
  els.configurationScopeNote.textContent = options.scope;
}

function currentState(overrides = {}) {
  const nps = overrides.nps ?? Number(controls.nps.value);
  const ratingClass = overrides.ratingClass ?? Number(controls.ratingClass.value);
  return {
    nps,
    ratingClass,
    pressurePct: overrides.pressurePct ?? Number(controls.pressurePct.value),
    temperatureF: overrides.temperatureF ?? Number(controls.temperature.value),
    temperatureUnit: overrides.temperatureUnit ?? controls.temperatureUnit.value,
    materialId: overrides.materialId ?? controls.material.value,
    boltMaterialId: overrides.boltMaterialId ?? controls.boltMaterial.value,
    axialKip: overrides.axialKip ?? Number(controls.axial.value),
    momentKipFt: overrides.momentKipFt ?? Number(controls.moment.value),
    edition: overrides.edition ?? controls.edition.value,
    family: overrides.family ?? controls.family.value,
    projectName: overrides.projectName ?? controls.projectName.value,
    calcId: overrides.calcId ?? controls.calcId.value,
    preparedBy: overrides.preparedBy ?? controls.preparedBy.value,
    reviewer: overrides.reviewer ?? controls.reviewer.value,
    productLine: overrides.productLine ?? activeProductLine,
  };
}

function momentFactor({ family, nps, ratingClass }) {
  if (family === "B16.5") {
    if (nps <= 12) {
      return [150, 300, 600, 900, 1500, 2500].includes(ratingClass)
        ? ratingClass === 150
          ? 1.2
          : 0.5
        : null;
    }
    if (nps <= 24) {
      if (ratingClass === 150) return 1.2;
      if (ratingClass === 300 || ratingClass === 600) return 0.5;
      if (ratingClass === 900 || ratingClass === 1500) return 0.3;
      return null;
    }
    return null;
  }

  if (family === "B16.47A") {
    if (ratingClass === 150) return 0.6;
    if ([300, 600, 900].includes(ratingClass)) return 0.1;
    return null;
  }

  if (family === "B16.47B") {
    if (nps < 48 && (ratingClass === 150 || ratingClass === 300)) {
      return 0.1 + (48 - nps) / 56;
    }
    if (nps < 48 && (ratingClass === 600 || ratingClass === 900)) return 0.13;
    if (nps >= 48 && ratingClass === 150) return 0.1;
    return null;
  }

  return null;
}

function gasketReactionDiameter(nps, ratingClass) {
  const pipeOd = PIPE_OD[nps] ?? nps;
  const add = GASKET_DIAMETER_ADD[ratingClass] ?? 1.5;
  return Math.max(pipeOd + add, pipeOd * 1.12);
}

function roundToEighth(value) {
  return Math.max(0.375, Math.round(value * 8) / 8);
}

function flangeDimensions({ nps, ratingClass, family }) {
  const bore = (PIPE_OD[nps] ?? nps) + 0.18;
  const classScale = Math.sqrt(ratingClass / 150);
  const familyScale = family === "B16.47A" ? 1.12 : family === "B16.47B" ? 1.06 : 1;
  const outsideDiameter = Math.max(
    bore + 3.8,
    (bore + 2.8 + 1.72 * classScale + 0.18 * nps) * familyScale
  );
  const boltCircle = outsideDiameter - Math.max(1.15, 0.7 + 0.05 * nps);
  const thickness = Math.max(0.72, 0.5 + 0.12 * nps + 1.08 * classScale);
  const hubLength = Math.max(0.95, 0.42 * nps + 0.52 * classScale);
  const hubDiameter = Math.min(outsideDiameter * 0.74, bore + 1.25 + 0.88 * classScale);
  const baseBoltCount =
    nps <= 3 ? 4 : nps <= 8 ? 8 : nps <= 12 ? 12 : nps <= 18 ? 16 : 20;
  const classBoltBonus = ratingClass >= 1500 ? 8 : ratingClass >= 900 ? 4 : 0;
  const boltCount = baseBoltCount + classBoltBonus;
  const boltDiameter = roundToEighth(0.45 + 0.035 * nps + 0.08 * classScale);
  const boltLength = Math.max(2.25, 2 * thickness + 2.5 * boltDiameter + 0.5);
  const annulusVolume =
    (Math.PI / 4) * (outsideDiameter ** 2 - bore ** 2) * thickness;
  const hubVolume =
    (Math.PI / 4) * Math.max(0, hubDiameter ** 2 - bore ** 2) * hubLength * 0.62;
  const flangeWeightEach = (annulusVolume + hubVolume) * 0.283;
  const boltSteelVolume = (Math.PI / 4) * boltDiameter ** 2 * boltLength;
  const nutWasherVolume = 0.92 * boltDiameter ** 3;
  const boltWeightEach = (boltSteelVolume + nutWasherVolume) * 0.283;
  const boltSetWeight = boltWeightEach * boltCount;

  return {
    bore,
    outsideDiameter,
    boltCircle,
    thickness,
    hubLength,
    hubDiameter,
    boltCount,
    boltDiameter,
    boltLength,
    flangeWeightEach,
    boltWeightEach,
    boltSetWeight,
    assemblyWeight: flangeWeightEach * 2 + boltSetWeight,
    source: "Generated ASME-style screening dimensions; verify against controlled B16.5/B16.47 tables.",
  };
}

function compactDimensions({ nps, ratingClass }) {
  const catalog = exactCompactRecord(COMPACT_FLANGES, nps, ratingClass);
  if (!catalog) {
    throw new RangeError(
      `No exact compact catalog row exists for NPS ${nps} / Class ${ratingClass}.`
    );
  }
  const bore = catalog.pipeId || catalog.pipeOd || catalog.sealId || catalog.nps;
  const sealMeanDiameter = (catalog.sealId || bore) + (catalog.sealWidth || 0);
  return {
    catalog,
    bore,
    outsideDiameter: catalog.outsideDiameter,
    boltCircle: catalog.boltCircle,
    thickness: catalog.flangeThickness,
    blindThickness: catalog.blindThickness,
    hubLength: catalog.flangeLength,
    hubDiameter: catalog.hubDiameter,
    boltCount: catalog.boltCount,
    boltDiameter: catalog.boltDiameter,
    boltLength: catalog.boltLength,
    boltSize: catalog.boltSize,
    sealId: catalog.sealId,
    sealWidth: catalog.sealWidth,
    sealMeanDiameter,
    flangeWeightEach: catalog.wnFlangeWeight,
    blindWeight: catalog.blindWeight,
    sealRingWeight: catalog.sealRingWeight,
    boltSetWeight: catalog.boltSetWeight,
    assemblyWeight: catalog.assemblyWeight,
    line: PRODUCT_LINES.compact.label,
    source:
      "Supplied LTS Energy FlangeTec® workbook catalog dimensions and weights; all dimensions in inches and weights in pounds.",
    substituted: false,
  };
}

function compactMomentFactor() {
  return 1;
}

function qualificationBasis(result) {
  if (result.productLine !== "compact") {
    return {
      status: result.fm ? "Table 4.16.12 screening" : "outside FM map",
      method: "Standard flange pressure-reserve method",
      geometrySource: result.dimensions.source,
      catalogRow: "not applicable",
      sealCompressionPercent: null,
      preloadReservePercent: null,
      substitution: "none",
      referenceClaim: "not applicable",
    };
  }

  const d = result.dimensions;
  const catalog = d.catalog;
  const sealCompressionPercent = Math.max(
    0,
    Math.min(100, (result.sealContactForce / Math.max(result.targetSealPreload, 1)) * 100)
  );
  const preloadReservePercent = Math.max(
    0,
    Math.min(100, (result.sealReserveForce / Math.max(result.targetSealPreload, 1)) * 100)
  );
  return {
    status: "exact catalog row",
    method: "Alternate proof path: class pressure rating, bolt stress, residual seal contact, and compact-section stress checks.",
    geometrySource: d.source,
    catalogRow: `${catalog.catalogSize}, ${catalog.sourceSheet}`,
    sealCompressionPercent,
    preloadReservePercent,
    substitution: "none; exact NPS and class match required",
    referenceClaim: `${COMPACT_REFERENCE_CLAIM.nps} in Class ${COMPACT_REFERENCE_CLAIM.ratingClass}: ${COMPACT_REFERENCE_CLAIM.savingsPercent}% catalog weight saving (${COMPACT_REFERENCE_CLAIM.compactWeightLb} lb vs ${COMPACT_REFERENCE_CLAIM.asmeWeightLb} lb).`,
  };
}

function tensileStressAreaApprox(diameter) {
  return 0.78 * (Math.PI / 4) * diameter ** 2;
}

function stressState(result) {
  const d = result.dimensions;
  const area = Math.max(1, (Math.PI / 4) * (d.outsideDiameter ** 2 - d.bore ** 2));
  const sectionModulus = Math.max(
    1,
    (Math.PI / 32) *
      (d.outsideDiameter ** 4 - d.bore ** 4) /
      Math.max(d.outsideDiameter / 2, 1)
  );
  const pressureKsi = result.pressureUsedForce / area / 1000;
  const axialKsi = result.axialForce / area / 1000;
  const bendingKsi = result.momentInLb / sectionModulus / 1000;
  const combinedKsi = pressureKsi + axialKsi + bendingKsi;
  const flangeUtilization = result.materialStress.allowableKsi
    ? combinedKsi / result.materialStress.allowableKsi
    : Infinity;
  const boltArea = d.boltCount * tensileStressAreaApprox(d.boltDiameter);
  const boltStressKsi =
    (result.pressureUsedForce + result.axialForce + result.momentEquivalentForce) /
    Math.max(boltArea, 1) /
    1000;
  const boltUtilization = result.boltStress.allowableKsi
    ? boltStressKsi / result.boltStress.allowableKsi
    : Infinity;

  return {
    effectiveAreaIn2: area,
    sectionModulusIn3: sectionModulus,
    pressureKsi,
    axialKsi,
    bendingKsi,
    combinedKsi,
    flangeUtilization,
    boltAreaIn2: boltArea,
    boltStressKsi,
    boltUtilization,
  };
}

function calculate(state) {
  const productLine = state.productLine ?? "asme";
  const supportedConfiguration = isSupportedConfiguration({
    productLine,
    family: state.family,
    nps: state.nps,
    ratingClass: state.ratingClass,
    compactRows: COMPACT_FLANGES,
  });
  if (!supportedConfiguration) {
    throw new RangeError(
      `Unsupported flange configuration: ${productLine}, ${state.family}, NPS ${state.nps}, Class ${state.ratingClass}.`
    );
  }
  const material = selectedMaterial(state.materialId);
  const boltMaterial = selectedBoltMaterial(state.boltMaterialId);
  const materialStress = materialDerate(material, state.temperatureF);
  const boltStress = materialDerate(boltMaterial, state.temperatureF);
  const dimensions =
    productLine === "compact" ? compactDimensions(state) : flangeDimensions(state);
  const effectiveRatingClass =
    productLine === "compact"
      ? dimensions?.catalog?.ratingClass ?? state.ratingClass
      : state.ratingClass;
  const fm =
    productLine === "compact"
      ? compactMomentFactor(state, dimensions)
      : momentFactor({ ...state, ratingClass: effectiveRatingClass });
  const ratingPsi = PRESSURE_RATING_100F[effectiveRatingClass] * materialStress.derate;
  const pressurePsi = ratingPsi * (state.pressurePct / 100);
  const gDiameter =
    productLine === "compact"
      ? dimensions?.sealMeanDiameter ?? gasketReactionDiameter(state.nps, effectiveRatingClass)
      : gasketReactionDiameter(state.nps, effectiveRatingClass);
  const gasketArea = (Math.PI / 4) * gDiameter ** 2;
  const classPressureLimitForce = ratingPsi * gasketArea;
  const boltAreaForPreload = dimensions
    ? dimensions.boltCount * tensileStressAreaApprox(dimensions.boltDiameter)
    : 0;
  const targetSealPreload =
    productLine === "compact" && boltStress.allowableKsi
      ? 0.7 * boltStress.allowableKsi * 1000 * boltAreaForPreload
      : null;
  const compactSeparatingLimit =
    productLine === "compact" && targetSealPreload
      ? 0.85 * targetSealPreload
      : classPressureLimitForce;
  const pressureLimitForce =
    productLine === "compact"
      ? Math.min(classPressureLimitForce, compactSeparatingLimit)
      : classPressureLimitForce;
  const pressureUsedForce = pressurePsi * gasketArea;
  const axialForce = state.axialKip * 1000;
  const momentInLb = state.momentKipFt * 12000;
  const momentEquivalentForce = fm ? (4 * momentInLb * fm) / gDiameter : Infinity;
  const externalEquivalentForce = axialForce + momentEquivalentForce;
  const reserveForce = Math.max(0, pressureLimitForce - pressureUsedForce);
  const sealContactForce =
    productLine === "compact" && targetSealPreload
      ? targetSealPreload - pressureUsedForce - externalEquivalentForce
      : null;
  const minimumResidualSealForce =
    productLine === "compact" && targetSealPreload ? 0.15 * targetSealPreload : null;
  const sealReserveForce =
    productLine === "compact" && targetSealPreload
      ? sealContactForce - minimumResidualSealForce
      : null;
  const axialOnlyCapacityKip = Math.max(0, reserveForce - momentEquivalentForce) / 1000;
  const momentOnlyCapacityKipFt = fm
    ? (Math.max(0, reserveForce - axialForce) * gDiameter) / (4 * fm) / 12000
    : 0;
  const pressureCapacityPsi = Math.max(
    0,
    (pressureLimitForce - axialForce - momentEquivalentForce) / gasketArea
  );
  const pressureCapacityPercent = ratingPsi > 0 ? (pressureCapacityPsi / ratingPsi) * 100 : 0;
  const utilization =
    pressureLimitForce > 0
      ? (pressureUsedForce + externalEquivalentForce) / pressureLimitForce
      : Infinity;
  const baseResult = {
    ...state,
    material,
    boltMaterial,
    materialStress,
    boltStress,
    derate: materialStress.derate,
    fm,
    ratingPsi,
    productLine,
    effectiveRatingClass,
    pressurePsi,
    gDiameter,
    gasketArea,
    dimensions,
    reserveForce,
    classPressureLimitForce,
    targetSealPreload,
    compactSeparatingLimit,
    sealContactForce,
    minimumResidualSealForce,
    sealReserveForce,
    pressureLimitForce,
    pressureUsedForce,
    axialForce,
    momentInLb,
    momentEquivalentForce,
    externalEquivalentForce,
    axialOnlyCapacityKip,
    momentOnlyCapacityKipFt,
    pressureCapacityPsi,
    pressureCapacityPercent,
    utilization,
    selectionBasis: {
      matchType: "exact",
      implementedConfiguration: true,
      scope: scopeStatement({ productLine, family: state.family }),
      standardEditionScope:
        productLine === "compact"
          ? "ISO 27509:2020 reviewed for compact-flange context; vendor-product conformity is not established."
          : `${FAMILY_LABELS[state.family]} 2025 publication scope; controlled pressure-temperature tables remain required.`,
    },
    pressureShare: pressureUsedForce / pressureLimitForce,
    axialShare: axialForce / pressureLimitForce,
    momentShare: momentEquivalentForce / pressureLimitForce,
    inScope:
      Boolean(fm) &&
      state.pressurePct <= 100 &&
      supportedConfiguration,
  };
  const stress = stressState(baseResult);
  const result = {
    ...baseResult,
    stress,
  };
  return {
    ...result,
    qualification: qualificationBasis(result),
  };
}

function rawNumber(value, digits = 6) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function loadEvidenceState() {
  try {
    const current = localStorage.getItem(EVIDENCE_STORAGE_KEY);
    if (current) return normalizeEvidenceState(JSON.parse(current));
    const legacy = localStorage.getItem(LEGACY_EVIDENCE_STORAGE_KEY);
    return normalizeEvidenceState(legacy ? JSON.parse(legacy) : {});
  } catch {
    return normalizeEvidenceState({});
  }
}

function saveEvidenceState(state) {
  try {
    localStorage.setItem(
      EVIDENCE_STORAGE_KEY,
      JSON.stringify(normalizeEvidenceState(state))
    );
  } catch {
    // The calculator still works when local storage is unavailable.
  }
}

function numericalScreeningPasses(result) {
  return Boolean(
    result.selectionBasis.implementedConfiguration &&
      result.selectionBasis.matchType === "exact" &&
      result.materialStress.withinTemperatureTable &&
      result.boltStress.withinTemperatureTable &&
      result.fm &&
      result.pressurePct <= 100 &&
      result.utilization <= 1 &&
      result.stress.flangeUtilization <= 1 &&
      result.stress.boltUtilization <= 1 &&
      (result.productLine !== "compact" ||
        (result.dimensions.catalog && result.sealReserveForce >= 0))
  );
}

function evidenceReadiness(result) {
  return evaluateEvidenceState({
    productLine: result.productLine,
    rawState: loadEvidenceState(),
    numericalPass: numericalScreeningPasses(result),
  });
}

function agentSnapshot(result) {
  const readiness = evidenceReadiness(result);
  const status = statusFor(result, readiness);
  const isCompact = result.productLine === "compact";
  return {
    schema: "./calculation-schema.json",
    schemaVersion: "1.2.0",
    recordType: "flange-capacity-screening-snapshot",
    generatedAt: new Date().toISOString(),
    application: {
      name: "Flange Capacity Explorer",
      version: APP_VERSION,
      interfaceManifest: "./agent-manifest.json",
    },
    interpretation: {
      classification: readiness.numericalPass
        ? readiness.complete
          ? "READY_FOR_ENGINEER_OF_RECORD_REVIEW"
          : "SCREENING_ONLY"
        : "SCREENING_CHECK_FAILED",
      certificationClaim: false,
      screeningPass: readiness.numericalPass,
      humanReadableStatus: status.text,
      qualificationEvidence: {
        documented: readiness.confirmed,
        asserted: readiness.asserted,
        required: readiness.required,
        missingIds: readiness.missing.map((item) => item.id),
        records: readiness.items.map((item) => ({
          id: item.id,
          asserted: item.asserted,
          documented: item.confirmed,
          evidenceReference: item.evidenceReference || null,
          issue: item.issue,
        })),
      },
    },
    configuration: {
      productLine: isCompact ? "compact_catalog_line" : "standard_rated_line",
      nominalPipeSizeIn: result.nps,
      pressureClass: result.ratingClass,
      effectivePressureClass: result.effectiveRatingClass,
      standardFamilyReference: isCompact ? null : result.family,
      sourceEditionBasis: Number(result.edition),
      selectionBasis: {
        matchType: result.selectionBasis.matchType,
        implementedConfiguration: result.selectionBasis.implementedConfiguration,
        scope: result.selectionBasis.scope,
        publicationScope: result.selectionBasis.standardEditionScope,
      },
      designTemperature: {
        fahrenheit: rawNumber(result.temperatureF, 3),
        celsius: rawNumber(fToC(result.temperatureF), 3),
      },
    },
    materials: {
      flange: {
        sourceRecordId: result.material?.id ?? null,
        specification: result.material?.specNo ?? null,
        grade: result.material?.typeGrade ?? null,
        uns: result.material?.uns ?? null,
        allowableStress: {
          ksi: rawNumber(result.materialStress.allowableKsi, 6),
          mpa: rawNumber(ksiToMpa(result.materialStress.allowableKsi), 6),
        },
      },
      bolting: {
        sourceRecordId: result.boltMaterial?.id ?? null,
        specification: result.boltMaterial?.specNo ?? null,
        grade: result.boltMaterial?.typeGrade ?? null,
        uns: result.boltMaterial?.uns ?? null,
        allowableStress: {
          ksi: rawNumber(result.boltStress.allowableKsi, 6),
          mpa: rawNumber(ksiToMpa(result.boltStress.allowableKsi), 6),
        },
      },
    },
    appliedLoads: {
      pressure: {
        psi: rawNumber(result.pressurePsi, 6),
        bar: rawNumber(psiToBar(result.pressurePsi), 6),
        pascal: rawNumber(psiToPa(result.pressurePsi), 3),
        percentOfAdjustedRating: result.pressurePct,
      },
      tensileAxial: {
        kip: rawNumber(result.axialKip, 6),
        kilonewton: rawNumber(kipToKn(result.axialKip), 6),
      },
      bendingMoment: {
        kipFoot: rawNumber(result.momentKipFt, 6),
        kilonewtonMeter: rawNumber(kipFtToKnM(result.momentKipFt), 6),
      },
    },
    capacitiesAtCurrentOtherLoads: {
      pressure: {
        psi: rawNumber(result.pressureCapacityPsi, 6),
        bar: rawNumber(psiToBar(result.pressureCapacityPsi), 6),
      },
      tensileAxial: {
        kip: rawNumber(result.axialOnlyCapacityKip, 6),
        kilonewton: rawNumber(kipToKn(result.axialOnlyCapacityKip), 6),
      },
      bendingMoment: {
        kipFoot: rawNumber(result.momentOnlyCapacityKipFt, 6),
        kilonewtonMeter: rawNumber(kipFtToKnM(result.momentOnlyCapacityKipFt), 6),
      },
    },
    utilization: {
      combinedLoadRatio: rawNumber(result.utilization, 6),
      flangeStressRatio: rawNumber(result.stress.flangeUtilization, 6),
      boltStressRatio: rawNumber(result.stress.boltUtilization, 6),
      residualSealContactMarginLbf: rawNumber(result.sealReserveForce, 3),
    },
    geometry: {
      provenance: isCompact ? "supplied_vendor_catalog" : "generated_screening_estimate",
      catalogRecordId: result.dimensions.catalog?.id ?? null,
      outsideDiameterIn: rawNumber(result.dimensions.outsideDiameter, 6),
      boreReferenceIn: rawNumber(result.dimensions.bore, 6),
      boltCircleIn: rawNumber(result.dimensions.boltCircle, 6),
      flangeThicknessIn: rawNumber(result.dimensions.thickness, 6),
      boltCount: result.dimensions.boltCount,
      boltDiameterIn: rawNumber(result.dimensions.boltDiameter, 6),
      assemblyWeightLb: rawNumber(result.dimensions.assemblyWeight, 6),
    },
    provenance: {
      sourceRegister: "./references.json",
      calculationMethod: isCompact
        ? "compact_alternate_proof_screening"
        : "standard_rated_pressure_reserve_screening",
      controlledPublicationContentEmbedded: false,
      finalDesignRequiresControlledSources: true,
    },
    notices: {
      productTrademark:
        "See the visible legal notice and ./references.json for product-mark ownership and usage limits.",
      standardsPublication:
        "See the visible legal notice and ./references.json for standards-publisher attribution and usage limits.",
      publicationUse: INTELLECTUAL_PROPERTY_NOTICE.publicationUse,
    },
  };
}

function publishAgentSnapshot(result) {
  const snapshot = agentSnapshot(result);
  if (els.agentCalculationState) {
    els.agentCalculationState.textContent = JSON.stringify(snapshot);
  }
  document.documentElement.dataset.agentRecordType = snapshot.recordType;
  document.documentElement.dataset.agentClassification =
    snapshot.interpretation.classification;
  document.documentElement.dataset.certificationClaim = "false";
  return snapshot;
}

function renderEvidenceChecklist(result) {
  const readiness = evidenceReadiness(result);
  els.readinessStatus.textContent = readiness.level;
  els.readinessStatus.dataset.state = !readiness.numericalPass
    ? "danger"
    : readiness.complete
      ? "ready"
      : "warn";
  els.readinessBar.style.width = `${readiness.percent}%`;
  els.readinessBar.dataset.state = readiness.complete ? "ready" : "warn";
  els.readinessCount.textContent = `${readiness.confirmed} of ${readiness.required} evidence items documented · ${readiness.asserted} asserted`;
  els.evidenceChecklist.innerHTML = readiness.items
    .map(
      (item) => `
        <article class="evidence-item${item.asserted && !item.confirmed ? " needs-reference" : ""}">
          <label class="evidence-check">
            <input type="checkbox" data-evidence-id="${escapeHtml(item.id)}" ${
              item.asserted ? "checked" : ""
            } />
            <span>
              ${escapeHtml(item.label)}
              <small>${escapeHtml(item.note)}</small>
            </span>
          </label>
          <label class="evidence-reference">
            <span>Evidence reference</span>
            <input
              type="text"
              data-evidence-reference-id="${escapeHtml(item.id)}"
              value="${escapeHtml(item.evidenceReference)}"
              placeholder="${escapeHtml(item.placeholder)}"
              ${item.asserted && !item.confirmed ? 'aria-invalid="true"' : ""}
            />
          </label>
          <small class="evidence-state">${escapeHtml(
            item.confirmed ? `Documented: ${item.evidenceReference}` : item.issue
          )}</small>
        </article>
      `
    )
    .join("");

  els.evidenceChecklist
    .querySelectorAll("input[data-evidence-id]")
    .forEach((input) => {
      input.addEventListener("change", () => {
        const state = loadEvidenceState();
        state[input.dataset.evidenceId].asserted = input.checked;
        saveEvidenceState(state);
        update();
      });
    });
  els.evidenceChecklist
    .querySelectorAll("input[data-evidence-reference-id]")
    .forEach((input) => {
      input.addEventListener("change", () => {
        const state = loadEvidenceState();
        state[input.dataset.evidenceReferenceId].evidenceReference =
          input.value.trim();
        saveEvidenceState(state);
        update();
      });
    });
  return readiness;
}

function evidenceRecord(result) {
  const readiness = evidenceReadiness(result);
  const status = statusFor(result, readiness);
  const generatedAt = new Date().toISOString();
  const isCompact = result.productLine === "compact";
  const lineInfo = PRODUCT_LINES[result.productLine] ?? PRODUCT_LINES.asme;
  const controlledInputsRequired = [
    "Controlled ASME BPVC Section VIII Division 2 edition and paragraph 4.16",
    "Applicable ASME B16.5 or ASME B16.47 pressure-temperature rating table",
    "Project material specification and allowable stress basis",
    "Selected gasket geometry, gasket factors, and seating stress basis",
    "Selected bolt material, quantity, size, and root-area basis",
    "Corrosion allowance, uncorroded and corroded dimensions, and design temperature",
    "Owner/user requirements for external loads, sustained load treatment, and leakage class",
  ];

  return {
    metadata: {
      projectName: result.projectName,
      calculationId: result.calcId,
      preparedBy: result.preparedBy,
      reviewer: result.reviewer,
      generatedAt,
      appVersion: APP_VERSION,
      productLine: lineInfo.label,
      method: isCompact
        ? "FlangeTec® compact-flange alternate qualification screening using supplied catalog geometry, class pressure rating, residual seal-contact reserve, and stress checks"
        : "Standard flange external-load screening using pressure reserve and Table 4.16.12 moment factor",
    },
    sourceBasis: {
      suppliedFiles: [
        "ASME BPVC Section VIII Div2 - 2019.pdf",
        "ASME BPVC Section VIII Div2 - 2021.pdf",
        "ASME BPVC Section VIII Div2 - 2023.pdf",
        "Table 5A - Section VIII, Division 2 - Maximum Allowable Stress Values Sm for Ferrous Materials.xls",
        "Table 5B - Section VIII, Division 2 - Maximum Allowable Stress Values Sm for Nonferrous Materials.xls",
        "Table 3 - Maximum Allowable Stress Values S for Bolting Materials.xls",
        "FLANGETEC ASME SERIES COMPACT FLANGE.pdf (supplied LTS Energy catalog reference)",
        "FLANGETEC MASTER_old.xls (supplied LTS Energy catalog workbook)",
      ],
      selectedEdition: result.edition,
      latestPublisherEditionObserved: "ASME BPVC 2025",
      implementedEditionBoundary:
        "The calculator implements the supplied 2019, 2021, and 2023 source basis only. No 2025 equation changes are implemented.",
      officialPublisherSources: [
        "ASME 2025 Boiler and Pressure Vessel Code: https://www.asme.org/codes-standards/bpvc-standards/bpvc-2025",
        "ASME B16.5-2025 scope: https://www.asme.org/codes-standards/find-codes-standards/b16-5-pipe-flanges-flanged-fittings-nps-1-2-nps-24-metric-inch-standard",
        "ASME B16.47-2025 scope: https://www.asme.org/codes-standards/find-codes-standards/b16-47-large-diameter-steel-flanges-nps-26-nps-60-metric-inch-standard",
        "ASME PCC-1-2022 assembly guidance: https://www.asme.org/codes-standards/find-codes-standards/pressure-boundary-bolted-flange-joint-assembly",
        "ISO 27509:2020 compact-flange scope: https://www.iso.org/standard/78201.html",
        "ASME Certification and Accreditation: https://www.asme.org/certification-accreditation",
      ],
      paragraphsUsed: [
        "4.16.1 scope for circular flanged joints under pressure, gasket seating, external axial force, and net-section bending moment",
        "4.16.6 design bolt-load workflow",
        "4.16.7 operating and gasket seating flange moment workflow",
        isCompact
          ? "Alternate qualification evidence path for custom flanged joints: pressure rating, bolt-load, residual seal contact, stress, rigidity/rotation, and optional FEA or prototype test records"
          : "4.16.12 moment factor for standard flanges",
      ],
      copyrightNote:
        "This report records independently implemented screening equations and traceability. It does not reproduce controlled ASME equation tables or substitute for authorized controlled publications.",
      intellectualPropertyNotice: INTELLECTUAL_PROPERTY_NOTICE,
      compactCatalogNotes: isCompact
        ? [
            "The supplied LTS Energy FlangeTec® catalog states that the CF Series is available for ASME/ANSI-equivalent Classes 600 through 2500.",
            "Catalog notes state dimensions are in inches, flanges are streamline bore, corrosion allowance is 0.063 in, and designs are in accordance with ASME VIII Div. 1 and/or Div. 2 as applicable.",
            "Blind thickness verification remains project-specific by material and seal-size combination.",
          ]
        : [],
    },
    qualificationReadiness: {
      level: readiness.level,
      numericalScreeningPass: readiness.numericalPass,
      assertedProjectEvidenceItems: readiness.asserted,
      documentedProjectEvidenceItems: readiness.confirmed,
      requiredProjectEvidenceItems: readiness.required,
      completionPercent: rawNumber(readiness.percent, 1),
      documented: readiness.items
        .filter((item) => item.confirmed)
        .map((item) => ({
          item: item.label,
          evidenceReference: item.evidenceReference,
        })),
      missing: readiness.missing.map((item) => ({
        item: item.label,
        requiredEvidence: item.note,
        issue: item.issue,
      })),
      certificationStatement:
        "Each readiness assertion requires a supporting document or record reference. Completion prepares a package for engineer-of-record review; it does not grant Code certification or third-party acceptance.",
    },
    inputs: {
      productLine: lineInfo.label,
      nps: result.nps,
      family: isCompact ? "LTS Energy FlangeTec® CF compact-flange catalog line" : FAMILY_LABELS[result.family],
      pressureClass: result.ratingClass,
      effectiveCatalogPressureClass: result.effectiveRatingClass,
      configurationMatchType: result.selectionBasis.matchType,
      implementedConfiguration: result.selectionBasis.implementedConfiguration,
      configurationScope: result.selectionBasis.scope,
      pressureFractionOfRating: result.pressurePct / 100,
      designTemperatureF: rawNumber(result.temperatureF, 3),
      designTemperatureC: rawNumber(fToC(result.temperatureF), 3),
      materialAllowableStressRatio: rawNumber(result.derate, 6),
      boltAllowableStressRatio: rawNumber(result.boltStress.derate, 6),
      tensileAxialLoadKip: result.axialKip,
      tensileAxialLoadKn: rawNumber(kipToKn(result.axialKip), 6),
      bendingMomentKipFt: result.momentKipFt,
      bendingMomentKnM: rawNumber(kipFtToKnM(result.momentKipFt), 6),
    },
    selectedMaterial: result.material
      ? {
          id: result.material.id,
          label: result.material.label,
          table: result.material.tableLabel,
          nominalComposition: result.material.composition,
          productForm: result.material.productForm,
          specification: result.material.specNo,
          typeGrade: result.material.typeGrade,
          uns: result.material.uns,
          pNo: result.material.pNo,
          groupNo: result.material.groupNo,
          minimumTensileStrengthKsi: result.material.minTensileKsi,
          minimumYieldStrengthKsi: result.material.minYieldKsi,
          maximumUseTemperatureF: result.material.maxUseTempF,
          notes: result.material.notes,
        }
      : null,
    selectedBoltMaterial: result.boltMaterial
      ? {
          id: result.boltMaterial.id,
          label: result.boltMaterial.label,
          table: result.boltMaterial.tableLabel,
          nominalComposition: result.boltMaterial.composition,
          productForm: result.boltMaterial.productForm,
          specification: result.boltMaterial.specNo,
          typeGrade: result.boltMaterial.typeGrade,
          uns: result.boltMaterial.uns,
          limitsVIII2: result.boltMaterial.limitsVIII2,
          minimumTensileStrengthKsi: result.boltMaterial.minTensileKsi,
          minimumYieldStrengthKsi: result.boltMaterial.minYieldKsi,
          notes: result.boltMaterial.notes,
        }
      : null,
    dimensionsAndWeights: {
      outsideDiameterIn: rawNumber(result.dimensions.outsideDiameter, 6),
      boreIn: rawNumber(result.dimensions.bore, 6),
      boltCircleIn: rawNumber(result.dimensions.boltCircle, 6),
      flangeThicknessIn: rawNumber(result.dimensions.thickness, 6),
      hubLengthIn: rawNumber(result.dimensions.hubLength, 6),
      boltCount: result.dimensions.boltCount,
      boltDiameterIn: rawNumber(result.dimensions.boltDiameter, 6),
      boltLengthIn: rawNumber(result.dimensions.boltLength, 6),
      compactCatalogSize: result.dimensions.catalog?.catalogSize,
      compactCatalogSheet: result.dimensions.catalog?.sourceSheet,
      sealIdIn: rawNumber(result.dimensions.sealId, 6),
      sealWidthIn: rawNumber(result.dimensions.sealWidth, 6),
      sealMeanDiameterIn: rawNumber(result.dimensions.sealMeanDiameter, 6),
      blindThicknessIn: rawNumber(result.dimensions.blindThickness, 6),
      weightPerFlangeLb: rawNumber(result.dimensions.flangeWeightEach, 6),
      blindWeightLb: rawNumber(result.dimensions.blindWeight, 6),
      sealRingWeightLb: rawNumber(result.dimensions.sealRingWeight, 6),
      boltSetWeightLb: rawNumber(result.dimensions.boltSetWeight, 6),
      assemblyWeightLb: rawNumber(result.dimensions.assemblyWeight, 6),
      basis: result.dimensions.source,
    },
    constants: {
      tabulatedRoomTemperaturePressureRatingPsi:
        PRESSURE_RATING_100F[result.effectiveRatingClass],
      deratedPressureRatingPsi: rawNumber(result.ratingPsi, 3),
      deratedPressureRatingBar: rawNumber(psiToBar(result.ratingPsi), 6),
      deratedPressureRatingPa: rawNumber(psiToPa(result.ratingPsi), 3),
      baselineAllowableStressKsi: rawNumber(result.materialStress.baselineKsi, 6),
      designTemperatureAllowableStressKsi: rawNumber(
        result.materialStress.allowableKsi,
        6
      ),
      designTemperatureAllowableStressMpa: rawNumber(
        ksiToMpa(result.materialStress.allowableKsi),
        6
      ),
      boltAllowableStressKsi: rawNumber(result.boltStress.allowableKsi, 6),
      boltAllowableStressMpa: rawNumber(
        ksiToMpa(result.boltStress.allowableKsi),
        6
      ),
      assumedPipeOutsideDiameterIn: rawNumber(PIPE_OD[result.nps] ?? result.nps, 3),
      assumedGasketReactionDiameterIn: rawNumber(result.gDiameter, 6),
      momentFactorFm: rawNumber(result.fm, 6),
      compactTargetSealPreloadLbf: rawNumber(result.targetSealPreload, 3),
      compactMinimumResidualSealForceLbf: rawNumber(result.minimumResidualSealForce, 3),
    },
    equations: [
      {
        id: "rating",
        tex: "P_r = P_{class} \\left(\\frac{S_m(T)}{S_m(100^\\circ F)}\\right)",
        description:
          "Material-adjusted pressure rating used for the screening check. The stress ratio is interpolated from the selected Div. 2 allowable stress table row.",
      },
      {
        id: "operating_pressure",
        tex: "P_o = P_r f_P",
        description: "Operating pressure expressed as a fraction of the derated class rating.",
      },
      {
        id: "gasket_area",
        tex: "A_G = \\frac{\\pi}{4}G^2",
        description: "Area associated with the assumed gasket reaction diameter.",
      },
      {
        id: "reserve_force",
        tex: "F_R = (P_r - P_o)A_G",
        description: "Remaining pressure-end-load reserve available for external separating load.",
      },
      {
        id: "moment_force",
        tex: isCompact ? "F_M = \\frac{4M}{G_s}" : "F_M = \\frac{4M_EF_M}{G}",
        description: isCompact
          ? "Bending moment converted to equivalent compact seal separating load using the seal mean diameter."
          : "Bending moment converted to equivalent separating load using the standard-flange moment factor.",
      },
      {
        id: "utilization",
        tex: "U = \\frac{P_oA_G + F_A + F_M}{P_rA_G}",
        description: "Combined screening utilization. A value not greater than 1.00 passes this prototype check.",
      },
      ...(isCompact
        ? [
            {
              id: "compact_bolt_preload",
              tex: "W_{bo} = 0.70\\,S_b\\,A_b",
              description:
                "Target compact-flange proof preload based on selected bolt allowable stress and approximate total tensile stress area.",
            },
            {
              id: "compact_residual_contact",
              tex: "W_c = W_{bo} - P_oA_s - F_A - \\frac{4M}{G_s}",
              description:
                "Residual contact force at the pressure-energized metal seal after pressure, axial load, and bending moment.",
            },
            {
              id: "compact_contact_margin",
              tex: "M_c = W_c - 0.15W_{bo}",
              description:
                "Prototype residual seal-contact margin. The formal design file should replace this with project gasket/seal acceptance criteria.",
            },
          ]
        : []),
    ],
    intermediateValues: {
      gasketAreaIn2: rawNumber(result.gasketArea, 6),
      pressureLimitForceLbf: rawNumber(result.pressureLimitForce, 3),
      pressureUsedForceLbf: rawNumber(result.pressureUsedForce, 3),
      pressureUsedPsi: rawNumber(result.pressurePsi, 6),
      pressureUsedBar: rawNumber(psiToBar(result.pressurePsi), 6),
      pressureUsedPa: rawNumber(psiToPa(result.pressurePsi), 3),
      allowablePressureAtCurrentExternalLoadsPsi: rawNumber(
        result.pressureCapacityPsi,
        6
      ),
      reserveForceLbf: rawNumber(result.reserveForce, 3),
      axialForceLbf: rawNumber(result.axialForce, 3),
      axialForceKn: rawNumber(kipToKn(result.axialKip), 6),
      bendingMomentInLbf: rawNumber(result.momentInLb, 3),
      bendingMomentKnM: rawNumber(kipFtToKnM(result.momentKipFt), 6),
      bendingEquivalentForceLbf: rawNumber(result.momentEquivalentForce, 3),
      externalEquivalentForceLbf: rawNumber(result.externalEquivalentForce, 3),
      compactClassPressureLimitForceLbf: rawNumber(result.classPressureLimitForce, 3),
      compactSeparatingLimitForceLbf: rawNumber(result.compactSeparatingLimit, 3),
      compactSealContactForceLbf: rawNumber(result.sealContactForce, 3),
      compactSealReserveForceLbf: rawNumber(result.sealReserveForce, 3),
    },
    stressState: {
      effectiveFlangeAreaIn2: rawNumber(result.stress.effectiveAreaIn2, 6),
      flangeSectionModulusIn3: rawNumber(result.stress.sectionModulusIn3, 6),
      pressureStressKsi: rawNumber(result.stress.pressureKsi, 6),
      axialStressKsi: rawNumber(result.stress.axialKsi, 6),
      bendingStressKsi: rawNumber(result.stress.bendingKsi, 6),
      combinedFlangeStressKsi: rawNumber(result.stress.combinedKsi, 6),
      flangeStressRatio: rawNumber(result.stress.flangeUtilization, 6),
      boltAreaIn2: rawNumber(result.stress.boltAreaIn2, 6),
      boltOperatingStressKsi: rawNumber(result.stress.boltStressKsi, 6),
      boltStressRatio: rawNumber(result.stress.boltUtilization, 6),
    },
    results: {
      utilization: rawNumber(result.utilization, 6),
      status: status.text,
      remainingAxialCapacityKip: rawNumber(result.axialOnlyCapacityKip, 6),
      remainingAxialCapacityKn: rawNumber(kipToKn(result.axialOnlyCapacityKip), 6),
      remainingBendingCapacityKipFt: rawNumber(result.momentOnlyCapacityKipFt, 6),
      remainingBendingCapacityKnM: rawNumber(
        kipFtToKnM(result.momentOnlyCapacityKipFt),
        6
      ),
      allowablePressureAtCurrentExternalLoadsPsi: rawNumber(
        result.pressureCapacityPsi,
        6
      ),
      allowablePressureAtCurrentExternalLoadsBar: rawNumber(
        psiToBar(result.pressureCapacityPsi),
        6
      ),
      marginToUtilizationOne: rawNumber(1 - result.utilization, 6),
    },
    complianceChecks: [
      {
        item: "Selected family, NPS, and pressure class are an exact implemented configuration.",
        result:
          result.selectionBasis.implementedConfiguration &&
          result.selectionBasis.matchType === "exact"
            ? "PASS"
            : "FAIL",
        evidence: result.selectionBasis.scope,
      },
      {
        item: "Selected flange material has an allowable stress value at the design temperature.",
        result: result.materialStress.withinTemperatureTable ? "PASS" : "FAIL",
        evidence: result.materialStress.withinTemperatureTable
          ? `${formatAllowable(result.materialStress.allowableKsi)} at ${formatNumber(
              result.temperatureF
            )} °F`
          : "No allowable stress value available for the selected temperature.",
      },
      {
        item: "Selected bolt material has an allowable stress value at the design temperature.",
        result: result.boltStress.withinTemperatureTable ? "PASS" : "FAIL",
        evidence: result.boltStress.withinTemperatureTable
          ? `${formatAllowable(result.boltStress.allowableKsi)} at ${formatNumber(
              result.temperatureF
            )} °F`
          : "No bolting allowable stress value available for the selected temperature.",
      },
      {
        item: "Approximate combined flange stress is less than the selected flange material allowable stress.",
        result: result.stress.flangeUtilization <= 1 ? "PASS" : "FAIL",
        evidence: `Ratio = ${formatNumber(result.stress.flangeUtilization, 3)}`,
      },
      {
        item: "Approximate bolt operating stress is less than the selected bolt material allowable stress.",
        result: result.stress.boltUtilization <= 1 ? "PASS" : "FAIL",
        evidence: `Ratio = ${formatNumber(result.stress.boltUtilization, 3)}`,
      },
      ...(isCompact
        ? [
            {
              item: "Selected compact flange has a supplied LTS Energy FlangeTec® catalog geometry and weight row.",
              result: result.dimensions.catalog ? "PASS" : "FAIL",
              evidence: result.dimensions.catalog
                ? `${result.dimensions.catalog.catalogSize} from ${result.dimensions.catalog.sourceSheet}`
                : "No compact catalog row available.",
            },
            {
              item: "Residual compact seal contact remains above the prototype minimum after pressure and external loads.",
              result: result.sealReserveForce >= 0 ? "PASS" : "FAIL",
              evidence: `Residual margin = ${formatNumber((result.sealReserveForce ?? 0) / 1000, 2)} kip`,
            },
            {
              item: "Compact configuration is an exact supplied catalog row with no nearest-row substitution.",
              result: "PASS",
              evidence: result.qualification.substitution,
            },
          ]
        : []),
      {
        item: "Standard flange family, NPS, and class have a moment-factor value in the implemented Table 4.16.12 screening map.",
        result: isCompact ? "INFO" : result.fm ? "PASS" : "FAIL",
        evidence: isCompact
          ? "Compact line uses the alternate proof-style load path with F_M = 4M/G_s."
          : result.fm
            ? `FM = ${result.fm}`
            : "No FM value implemented for this combination.",
      },
      {
        item: "Operating pressure does not exceed derated class pressure rating.",
        result: result.pressurePct <= 100 ? "PASS" : "FAIL",
        evidence: `${formatNumber(result.pressurePsi)} psi <= ${formatNumber(result.ratingPsi)} psi`,
      },
      {
        item: "Combined external-load utilization does not exceed 1.00 for this screening method.",
        result: result.utilization <= 1 ? "PASS" : "FAIL",
        evidence: `U = ${formatNumber(result.utilization, 3)}`,
      },
      ...readiness.items.map((item) => ({
        item: item.label,
        result: item.confirmed
          ? "DOCUMENTED"
          : item.asserted
            ? "REFERENCE REQUIRED"
            : "PENDING",
        evidence: item.confirmed
          ? item.evidenceReference
          : `${item.issue}. ${item.note}`,
      })),
      {
        item: "Qualification package status accurately distinguishes screening from certification.",
        result: "PASS",
        evidence: readiness.level,
      },
    ],
    requiredAttachments: [
      ...controlledInputsRequired,
      ...readiness.missing.map((item) => `${item.label} — ${item.issue}`),
    ],
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tableRows(data) {
  return Object.entries(data)
    .map(
      ([key, value]) =>
        `<tr><th>${escapeHtml(labelize(key))}</th><td>${formatReportValue(value)}</td></tr>`
    )
    .join("");
}

function formatReportValue(value) {
  if (value == null) return "not applicable";
  if (Array.isArray(value)) {
    return `<ul>${value
      .map((item) => {
        if (item && typeof item === "object") {
          const fields = Object.entries(item)
            .map(
              ([key, fieldValue]) =>
                `<strong>${escapeHtml(labelize(key))}:</strong> ${formatReportValue(fieldValue)}`
            )
            .join("<br>");
          return `<li>${fields}</li>`;
        }
        return `<li>${formatReportValue(item)}</li>`;
      })
      .join("")}</ul>`;
  }
  if (typeof value === "object") {
    return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
  }
  return escapeHtml(value);
}

function labelize(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/\bNps\b/, "NPS")
    .replace(/\bPsi\b/, "psi")
    .replace(/\bKip\b/, "kip")
    .replace(/\bLbf\b/, "lbf")
    .replace(/\bIn2\b/, "in^2")
    .replace(/\bFm\b/, "FM");
}

function buildCalculationHtml(evidence) {
  const json = JSON.stringify(evidence, null, 2);
  const equations = evidence.equations
    .map(
      (eq) => `
        <article class="equation">
          <h3>${escapeHtml(eq.id)}</h3>
          <div class="math">\\[${eq.tex}\\]</div>
          <p>${escapeHtml(eq.description)}</p>
        </article>`
    )
    .join("");
  const checks = evidence.complianceChecks
    .map(
      (check) => `
        <tr class="${check.result.toLowerCase()}">
          <td>${escapeHtml(check.item)}</td>
          <td>${escapeHtml(check.result)}</td>
          <td>${escapeHtml(check.evidence)}</td>
        </tr>`
    )
    .join("");
  const attachments = evidence.requiredAttachments
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(evidence.metadata.calculationId)} Calculation Set</title>
  <script>
    window.MathJax = {
      tex: { inlineMath: [['\\\\(', '\\\\)']], displayMath: [['\\\\[', '\\\\]']] },
      startup: { typeset: true }
    };
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <style>
    :root { --ink:#17252c; --muted:#607077; --line:#cfd8dc; --paper:#f8f7f2; --ok:#276a73; --warn:#ad7825; --bad:#b02f35; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: var(--ink); background: var(--paper); line-height: 1.45; }
    header { padding: 34px 42px; color: white; background: #20343c; }
    h1 { margin: 0; font-size: 34px; letter-spacing: 0; }
    h2 { margin: 30px 0 12px; font-size: 22px; border-bottom: 2px solid var(--line); padding-bottom: 6px; }
    h3 { margin: 0 0 8px; font-size: 15px; text-transform: uppercase; color: var(--muted); }
    main { max-width: 1120px; margin: 0 auto; padding: 28px 32px 48px; background: white; }
    .meta { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; margin-top: 20px; }
    .meta div, .callout, .equation, .signature { border: 1px solid var(--line); border-radius: 6px; padding: 12px; background: #fbfcfc; }
    .meta span { display: block; color: var(--muted); font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .meta strong { display: block; margin-top: 4px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 14px; }
    th, td { border: 1px solid var(--line); padding: 8px 10px; vertical-align: top; text-align: left; }
    th { width: 36%; background: #eef3f4; }
    .check-table th { width: auto; }
    .pass td:nth-child(2) { color: var(--ok); font-weight: bold; }
    .confirmed td:nth-child(2) { color: var(--ok); font-weight: bold; }
    .fail td:nth-child(2) { color: var(--bad); font-weight: bold; }
    .pending td:nth-child(2) { color: var(--warn); font-weight: bold; }
    .info td:nth-child(2) { color: var(--muted); font-weight: bold; }
    .equations { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 14px; }
    .math { overflow-x: auto; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 22px; }
    .line { height: 34px; border-bottom: 1px solid var(--ink); margin-bottom: 8px; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid var(--line); padding: 12px; background: #f4f6f7; font-size: 12px; }
    button { margin: 18px 0 0; border: 0; border-radius: 5px; padding: 10px 14px; color: white; background: var(--ok); font-weight: bold; cursor: pointer; }
    @media print { body { background: white; } main { padding: 0; } button { display: none; } .equations { grid-template-columns: 1fr; } header { color: var(--ink); background: white; border-bottom: 3px solid var(--ink); } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(evidence.metadata.productLine ?? "Flange")} Calculation Set</h1>
    <p>Generated ${escapeHtml(evidence.metadata.generatedAt)} by ${escapeHtml(APP_VERSION)}.</p>
    <button onclick="window.print()">Print / Save to PDF</button>
  </header>
  <main>
    <section class="meta">
      <div><span>Project</span><strong>${escapeHtml(evidence.metadata.projectName)}</strong></div>
      <div><span>Calculation ID</span><strong>${escapeHtml(evidence.metadata.calculationId)}</strong></div>
      <div><span>Prepared by</span><strong>${escapeHtml(evidence.metadata.preparedBy)}</strong></div>
      <div><span>Reviewer</span><strong>${escapeHtml(evidence.metadata.reviewer)}</strong></div>
    </section>

    <section class="callout">
      <strong>Certification boundary:</strong>
      This package contains objective evidence for the implemented screening method and current inputs.
      It must be supplemented with controlled ASME Code calculations, project-specific flange dimensions,
      material allowables, gasket data, bolting data, and signoff by the engineer of record before third-party certification.
    </section>

    <section class="callout">
      <strong>Reference and intellectual-property boundary:</strong>
      ${escapeHtml(INTELLECTUAL_PROPERTY_NOTICE.flangetec)}
      ${escapeHtml(INTELLECTUAL_PROPERTY_NOTICE.asme)}
      ${escapeHtml(INTELLECTUAL_PROPERTY_NOTICE.publicationUse)}
    </section>

    <h2>Source Basis</h2>
    <table>${tableRows(evidence.sourceBasis)}</table>

    <h2>Qualification Readiness</h2>
    <table>${tableRows(evidence.qualificationReadiness ?? {})}</table>

    <h2>Inputs</h2>
    <table>${tableRows(evidence.inputs)}</table>

    <h2>Selected Material</h2>
    <table>${tableRows(evidence.selectedMaterial ?? {})}</table>

    <h2>Selected Bolt Material</h2>
    <table>${tableRows(evidence.selectedBoltMaterial ?? {})}</table>

    <h2>General Dimensions and Weights</h2>
    <table>${tableRows(evidence.dimensionsAndWeights ?? {})}</table>

    <h2>Constants and Assumptions</h2>
    <table>${tableRows(evidence.constants)}</table>

    <h2>Annotated Math</h2>
    <div class="equations">${equations}</div>

    <h2>Intermediate Values</h2>
    <table>${tableRows(evidence.intermediateValues)}</table>

    <h2>Stress State</h2>
    <table>${tableRows(evidence.stressState)}</table>

    <h2>Results</h2>
    <table>${tableRows(evidence.results)}</table>

    <h2>Compliance Evidence Checklist</h2>
    <table class="check-table">
      <thead><tr><th>Check</th><th>Result</th><th>Objective evidence</th></tr></thead>
      <tbody>${checks}</tbody>
    </table>

    <h2>Required Attachments for Final Certification</h2>
    <ol>${attachments}</ol>

    <h2>Review Signatures</h2>
    <section class="signatures">
      <div class="signature"><div class="line"></div>Engineer of record / date</div>
      <div class="signature"><div class="line"></div>Third-party certifier / date</div>
    </section>

    <h2>Embedded Machine-Readable Evidence</h2>
    <pre>${escapeHtml(json)}</pre>
    <script type="application/json" id="calculation-evidence">${escapeHtml(json)}</script>
  </main>
</body>
</html>`;
}

function downloadBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(value) {
  return String(value || "calculation")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function downloadCalculationSet() {
  const result = calculate(currentState());
  const evidence = evidenceRecord(result);
  const filename = `${safeFilename(evidence.metadata.calculationId)}-calculation-set.html`;
  downloadBlob(filename, buildCalculationHtml(evidence), "text/html;charset=utf-8");
}

function openCalculationSet() {
  const result = calculate(currentState());
  const evidence = evidenceRecord(result);
  const blob = new Blob([buildCalculationHtml(evidence)], {
    type: "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

function downloadEvidenceJson() {
  const result = calculate(currentState());
  const evidence = evidenceRecord(result);
  const filename = `${safeFilename(evidence.metadata.calculationId)}-evidence.json`;
  downloadBlob(filename, JSON.stringify(evidence, null, 2), "application/json;charset=utf-8");
}

function downloadAgentSnapshot() {
  const result = calculate(currentState());
  const snapshot = agentSnapshot(result);
  const filename = `${safeFilename(result.calcId)}-agent-snapshot.json`;
  downloadBlob(
    filename,
    JSON.stringify(snapshot, null, 2),
    "application/json;charset=utf-8"
  );
}

function formatInMm(valueIn) {
  return `${formatNumber(valueIn, 2)} in / ${formatNumber(valueIn * 25.4, 1)} mm`;
}

function formatLbKg(valueLb) {
  return `${formatNumber(valueLb, 1)} lb / ${formatNumber(valueLb * 0.453592, 1)} kg`;
}

function dataList(items) {
  return items
    .map(
      ([label, value]) =>
        `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
    )
    .join("");
}

function updateOutputs(result) {
  const lineInfo = PRODUCT_LINES[result.productLine] ?? PRODUCT_LINES.asme;
  els.lineControlTitle.textContent = lineInfo.controlTitle;
  els.lineDescription.textContent = lineInfo.description;
  els.selectedFlange.textContent =
    result.productLine === "compact"
      ? `${result.dimensions.catalog.catalogSize} / exact catalog row`
      : `NPS ${formatNps(result.nps)} / Class ${result.ratingClass}`;
  els.npsOut.textContent = `NPS ${formatNps(result.nps)}`;
  els.classOut.textContent = `Class ${result.ratingClass}`;
  els.pressureOut.innerHTML = `${formatPressure(result.pressurePsi)} <small>${result.pressurePct}% of material-adjusted class rating</small>`;
  const tempPrimary =
    result.temperatureUnit === "C"
      ? `${formatNumber(fToC(result.temperatureF), 0)} °C`
      : `${formatNumber(result.temperatureF, 0)} °F`;
  const tempSecondary =
    result.temperatureUnit === "C"
      ? `${formatNumber(result.temperatureF, 0)} °F`
      : `${formatNumber(fToC(result.temperatureF), 0)} °C`;
  els.temperatureOut.innerHTML = `${tempPrimary} / ${tempSecondary} <small>${formatNumber(
    result.derate * 100,
    1
  )}% allowable stress ratio</small>`;
  els.axialOut.innerHTML = formatAxial(result.axialKip);
  els.momentOut.innerHTML = formatMoment(result.momentKipFt);

  els.ratingPsi.textContent = formatPressure(result.ratingPsi);
  els.operatingPsi.textContent = formatPressure(result.pressurePsi);
  els.materialAllowable.textContent = formatAllowable(result.materialStress.allowableKsi);
  els.boltAllowable.textContent = formatAllowable(result.boltStress.allowableKsi);
  els.pressureCapacity.textContent = `${formatPressure(result.pressureCapacityPsi)} (${formatNumber(
    result.pressureCapacityPercent,
    1
  )}%)`;
  els.axialCapacity.textContent = formatAxial(result.axialOnlyCapacityKip);
  els.momentCapacity.textContent = formatMoment(result.momentOnlyCapacityKipFt);

  els.stressStatus.textContent =
    result.stress.flangeUtilization <= 1 && result.stress.boltUtilization <= 1
      ? "below allowable"
      : "check required";
  els.stressState.innerHTML = dataList([
    ["Flange pressure stress", formatAllowable(result.stress.pressureKsi)],
    ["Flange axial stress", formatAllowable(result.stress.axialKsi)],
    ["Flange bending stress", formatAllowable(result.stress.bendingKsi)],
    ["Combined flange stress", formatAllowable(result.stress.combinedKsi)],
    ["Flange stress ratio", formatNumber(result.stress.flangeUtilization, 3)],
    ["Bolt operating stress", formatAllowable(result.stress.boltStressKsi)],
    ["Bolt stress ratio", formatNumber(result.stress.boltUtilization, 3)],
  ]);
  els.dimensionsSummary.innerHTML = dataList([
    ["Outside diameter, A", formatInMm(result.dimensions.outsideDiameter)],
    [
      result.productLine === "compact" ? "Hub/bore reference, B" : "Bore, B",
      formatInMm(result.dimensions.bore),
    ],
    ["Bolt circle, H", formatInMm(result.dimensions.boltCircle)],
    ["Flange thickness, D", formatInMm(result.dimensions.thickness)],
    ...(result.productLine === "compact"
      ? [
          ["Blind thickness, E", formatInMm(result.dimensions.blindThickness)],
          ["Seal ID, J", formatInMm(result.dimensions.sealId)],
          ["Seal width, K", formatInMm(result.dimensions.sealWidth)],
        ]
      : []),
    ["Bolts", `${result.dimensions.boltCount} x ${formatInMm(result.dimensions.boltDiameter)}`],
    ["Bolt length", formatInMm(result.dimensions.boltLength)],
    ["Weight per flange", formatLbKg(result.dimensions.flangeWeightEach)],
    ...(result.productLine === "compact"
      ? [
          ["Blind weight", formatLbKg(result.dimensions.blindWeight)],
          ["Seal ring weight", formatLbKg(result.dimensions.sealRingWeight)],
        ]
      : []),
    ["Bolt set weight", formatLbKg(result.dimensions.boltSetWeight)],
    [
      result.productLine === "compact" ? "Catalog assembly weight" : "Approx. assembly weight",
      formatLbKg(result.dimensions.assemblyWeight),
    ],
  ]);
  els.qualificationStatus.textContent = result.qualification.status;
  els.qualificationSummary.innerHTML = dataList([
    ["Method", result.qualification.method],
    ["Configuration scope", result.selectionBasis.scope],
    ["Selection match", "exact implemented configuration"],
    ["Geometry source", result.qualification.geometrySource],
    ["Catalog row", result.qualification.catalogRow],
    ["Input mapping", result.qualification.substitution],
    ...(result.productLine === "compact"
      ? [
          [
            "Residual seal contact",
            `${formatNumber(result.qualification.sealCompressionPercent, 1)}% of target preload`,
          ],
          [
            "Seal preload reserve",
            `${formatNumber(result.qualification.preloadReservePercent, 1)}% after minimum residual`,
          ],
          ["Catalog weight claim", result.qualification.referenceClaim],
        ]
      : [["Standard basis", "FM table screening with generated ASME-style dimensions"]]),
  ]);
  if (els.diagramA) els.diagramA.textContent = `A ${formatNumber(result.dimensions.outsideDiameter, 1)} in`;
  if (els.diagramC) els.diagramC.textContent = `C ${formatNumber(result.dimensions.boltCircle, 1)} in`;

  const utilizationPct = Math.min(result.utilization * 100, 150);
  els.meterFill.style.width = `${Math.max(0, utilizationPct)}%`;
  els.utilizationLabel.textContent = `${formatNumber(result.utilization, 2)} utilization`;

  const readiness = renderEvidenceChecklist(result);
  const status = statusFor(result, readiness);
  els.scopeStatus.textContent = status.text;
  els.scopeStatus.dataset.state = status.state;
  els.meterFill.dataset.state = status.state;
  publishAgentSnapshot(result);
}

function statusFor(result, readiness = evidenceReadiness(result)) {
  if (!result.materialStress.withinTemperatureTable) {
    return { text: "Flange material temperature outside table", state: "danger" };
  }
  if (!result.boltStress.withinTemperatureTable) {
    return { text: "Bolt material temperature outside table", state: "danger" };
  }
  if (!result.fm) {
    return { text: "Outside table scope", state: "danger" };
  }
  if (result.productLine === "compact" && !result.dimensions.catalog) {
    return { text: "Compact catalog row unavailable", state: "danger" };
  }
  if (result.pressurePct > 100) {
    return { text: "Pressure above rating", state: "danger" };
  }
  if (result.productLine === "compact" && result.sealReserveForce < 0) {
    return { text: "Seal contact reserve below proof target", state: "danger" };
  }
  if (result.utilization > 1) {
    return { text: "External load exceeds reserve", state: "danger" };
  }
  if (result.stress.flangeUtilization > 1 || result.stress.boltUtilization > 1) {
    return { text: "Stress exceeds selected material allowable", state: "danger" };
  }
  if (result.utilization > 0.85) {
    return { text: "Tight margin", state: "warn" };
  }
  if (result.stress.flangeUtilization > 0.85 || result.stress.boltUtilization > 0.85) {
    return { text: "Stress margin is tight", state: "warn" };
  }
  if (!readiness.complete) {
    return {
      text: `Screening passes · ${readiness.missing.length} evidence items missing`,
      state: "warn",
    };
  }
  return { text: "Ready for engineer-of-record review", state: "ok" };
}

function updateEditionNotes(edition) {
  const notes = EDITION_NOTES[edition];
  els.editionTitle.textContent = notes.title;
  els.editionNote.textContent = notes.note;
  els.editionBullets.innerHTML = notes.bullets
    .map((item) => `<li>${item}</li>`)
    .join("");
}

function updateChart(state) {
  const chartClasses = classOptionsFor({
    productLine: state.productLine,
    family: state.family,
    nps: state.nps,
    compactRows: COMPACT_FLANGES,
  });
  const rows = chartClasses.map((ratingClass) =>
    calculate({ ...state, ratingClass, momentKipFt: 0, axialKip: 0 })
  );
  const maxMoment = Math.max(...rows.map((row) => row.momentOnlyCapacityKipFt));
  const maxAxial = Math.max(...rows.map((row) => row.axialOnlyCapacityKip));

  els.chartCaption.textContent =
    state.productLine === "compact"
      ? `FlangeTec® CF catalog, NPS ${formatNps(state.nps)}, exact rows, ${state.pressurePct}% of material-adjusted class rating`
      : `${FAMILY_LABELS[state.family]}, NPS ${formatNps(state.nps)}, implemented classes, ${state.pressurePct}% of material-adjusted class rating`;
  els.classChart.innerHTML = rows
    .map((row) => {
      const inScope = row.fm ? "" : " out";
      const momentWidth = maxMoment ? (row.momentOnlyCapacityKipFt / maxMoment) * 100 : 0;
      const axialWidth = maxAxial ? (row.axialOnlyCapacityKip / maxAxial) * 100 : 0;
      return `
        <div class="chart-row${inScope}">
          <div class="chart-label">Class ${row.ratingClass}</div>
          <div class="bar-stack">
            <div class="bar pressure" style="width:${Math.min(100, row.pressurePct)}%"></div>
            <div class="bar axial" style="width:${axialWidth}%"></div>
            <div class="bar moment" style="width:${momentWidth}%"></div>
          </div>
          <div class="chart-value">
            ${row.fm ? `${formatAxial(row.axialOnlyCapacityKip)} / ${formatMoment(row.momentOnlyCapacityKipFt)}` : "not in FM table"}
          </div>
        </div>
      `;
    })
    .join("");
}

function drawInteraction(result) {
  const canvas = els.canvas;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, cssWidth, cssHeight);
  const pad = { left: 58, right: 24, top: 28, bottom: 48 };
  const w = cssWidth - pad.left - pad.right;
  const h = cssHeight - pad.top - pad.bottom;
  const maxAxial = Math.max(result.axialOnlyCapacityKip * 1.15, result.axialKip * 1.2, 10);
  const maxMoment = Math.max(result.momentOnlyCapacityKipFt * 1.15, result.momentKipFt * 1.2, 10);

  const x = (kip) => pad.left + (kip / maxAxial) * w;
  const y = (kipFt) => pad.top + h - (kipFt / maxMoment) * h;

  ctx.strokeStyle = "#c8d1d4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + h);
  ctx.lineTo(pad.left + w, pad.top + h);
  ctx.stroke();

  ctx.fillStyle = "#53646c";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("Axial load, kip", pad.left + w - 92, pad.top + h + 32);
  ctx.save();
  ctx.translate(17, pad.top + 118);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Bending moment, kip-ft", 0, 0);
  ctx.restore();

  ctx.fillStyle = "rgba(39, 106, 115, 0.12)";
  ctx.strokeStyle = "#276a73";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x(0), y(0));
  ctx.lineTo(x(result.axialOnlyCapacityKip), y(0));
  ctx.lineTo(x(0), y(result.momentOnlyCapacityKipFt));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = "#9aa8ad";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x(result.axialKip), pad.top + h);
  ctx.lineTo(x(result.axialKip), y(result.momentKipFt));
  ctx.lineTo(pad.left, y(result.momentKipFt));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = result.utilization <= 1 ? "#b75d3a" : "#b02f35";
  ctx.beginPath();
  ctx.arc(x(result.axialKip), y(result.momentKipFt), 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#18262d";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText("screening envelope", x(result.axialOnlyCapacityKip * 0.32), y(result.momentOnlyCapacityKipFt * 0.42));
  ctx.fillText("current load", Math.min(x(result.axialKip) + 10, cssWidth - 105), Math.max(y(result.momentKipFt) - 10, 22));
}

function update() {
  syncConfigurationControls();
  const state = currentState();
  const result = calculate(state);
  controls.lineAsme.classList.toggle("is-active", state.productLine === "asme");
  controls.lineCompact.classList.toggle("is-active", state.productLine === "compact");
  controls.lineAsme.setAttribute("aria-pressed", state.productLine === "asme" ? "true" : "false");
  controls.lineCompact.setAttribute(
    "aria-pressed",
    state.productLine === "compact" ? "true" : "false"
  );
  updateOutputs(result);
  updateChart(state);
  updateEditionNotes(state.edition);
  drawInteraction(result);
}

function setProductLine(productLine) {
  activeProductLine = productLine;
  update();
}

function populateMaterialControls() {
  populateMaterialSelect({
    data: MATERIALS,
    select: controls.material,
    filter: controls.materialFilter,
    defaultId: DEFAULT_MATERIAL_ID,
  });
  populateMaterialSelect({
    data: BOLT_MATERIALS,
    select: controls.boltMaterial,
    filter: controls.boltMaterialFilter,
    defaultId: DEFAULT_BOLT_MATERIAL_ID,
  });
}

Object.values(controls).forEach((control) => {
  if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
    control.addEventListener("input", update);
    control.addEventListener("change", update);
  }
});

controls.downloadCalcSet.addEventListener("click", downloadCalculationSet);
controls.openCalcSet.addEventListener("click", openCalculationSet);
controls.downloadEvidence.addEventListener("click", downloadEvidenceJson);
controls.downloadAgentSnapshot.addEventListener("click", downloadAgentSnapshot);
controls.lineAsme.addEventListener("click", () => setProductLine("asme"));
controls.lineCompact.addEventListener("click", () => setProductLine("compact"));
controls.materialFilter.addEventListener("input", () => {
  populateMaterialSelect({
    data: MATERIALS,
    select: controls.material,
    filter: controls.materialFilter,
    defaultId: DEFAULT_MATERIAL_ID,
  });
  update();
});
controls.boltMaterialFilter.addEventListener("input", () => {
  populateMaterialSelect({
    data: BOLT_MATERIALS,
    select: controls.boltMaterial,
    filter: controls.boltMaterialFilter,
    defaultId: DEFAULT_BOLT_MATERIAL_ID,
  });
  update();
});

window.flangeApp = {
  version: APP_VERSION,
  calculate,
  configurationOptions,
  currentState,
  evidenceRecord,
  agentSnapshot,
  buildCalculationHtml,
};

populateMaterialControls();
window.addEventListener("resize", update);
update();
