(function configureFlangeSelections(global) {
  const B16_5_NPS_OPTIONS = [
    0.5,
    0.75,
    1,
    1.25,
    1.5,
    2,
    2.5,
    3,
    3.5,
    4,
    5,
    6,
    8,
    10,
    12,
    14,
    16,
    18,
    20,
    22,
    24,
  ];
  const B16_47_NPS_OPTIONS = [
    26,
    28,
    30,
    32,
    34,
    36,
    38,
    40,
    42,
    44,
    46,
    48,
    50,
    52,
    54,
    56,
    58,
    60,
  ];
  const B16_5_IMPLEMENTED_CLASSES = [150, 300, 600, 900, 1500, 2500];
  const B16_47_IMPLEMENTED_CLASSES = [150, 300, 600, 900];

  function normalizeNumber(value) {
    return Number(Number(value).toFixed(3));
  }

  function uniqueSorted(values) {
    return [...new Set(values.map(normalizeNumber))].sort((a, b) => a - b);
  }

  function exactCompactRecord(rows, nps, ratingClass) {
    const normalizedNps = normalizeNumber(nps);
    const normalizedClass = Number(ratingClass);
    return (
      rows.find(
        (row) =>
          normalizeNumber(row.nps) === normalizedNps &&
          Number(row.ratingClass) === normalizedClass
      ) ?? null
    );
  }

  function npsOptionsFor({ productLine, family, compactRows = [] }) {
    if (productLine === "compact") {
      return uniqueSorted(compactRows.map((row) => row.nps));
    }
    return family === "B16.47A" || family === "B16.47B"
      ? [...B16_47_NPS_OPTIONS]
      : [...B16_5_NPS_OPTIONS];
  }

  function classOptionsFor({ productLine, family, nps, compactRows = [] }) {
    if (productLine === "compact") {
      const normalizedNps = normalizeNumber(nps);
      return uniqueSorted(
        compactRows
          .filter((row) => normalizeNumber(row.nps) === normalizedNps)
          .map((row) => row.ratingClass)
      );
    }
    if (family === "B16.47B") {
      return Number(nps) < 48
        ? [...B16_47_IMPLEMENTED_CLASSES]
        : [150];
    }
    if (family === "B16.47A") {
      return [...B16_47_IMPLEMENTED_CLASSES];
    }
    return Number(nps) <= 12
      ? [...B16_5_IMPLEMENTED_CLASSES]
      : B16_5_IMPLEMENTED_CLASSES.filter((ratingClass) => ratingClass !== 2500);
  }

  function isSupportedConfiguration({
    productLine,
    family,
    nps,
    ratingClass,
    compactRows = [],
  }) {
    return Boolean(
      npsOptionsFor({ productLine, family, compactRows }).includes(
        normalizeNumber(nps)
      ) &&
        classOptionsFor({
          productLine,
          family,
          nps,
          compactRows,
        }).includes(Number(ratingClass)) &&
        (productLine !== "compact" ||
          exactCompactRecord(compactRows, nps, ratingClass))
    );
  }

  function closestOption(options, preferred, fallback) {
    if (!options.length) return null;
    const target = Number.isFinite(Number(preferred))
      ? Number(preferred)
      : Number(fallback);
    if (options.includes(target)) return target;
    return options.reduce((best, option) =>
      Math.abs(option - target) < Math.abs(best - target) ? option : best
    );
  }

  function formatNps(value) {
    const normalized = normalizeNumber(value);
    const labels = {
      0.5: "1/2",
      0.75: "3/4",
      1.25: "1 1/4",
      1.5: "1 1/2",
      2.5: "2 1/2",
      3.5: "3 1/2",
    };
    return labels[normalized] ?? String(normalized);
  }

  function scopeStatement({ productLine, family }) {
    if (productLine === "compact") {
      return "Exact supplied catalog rows only: NPS 1-24 and Classes 600, 900, 1500, and 2500. Nearest-row substitution is prohibited.";
    }
    if (family === "B16.47A" || family === "B16.47B") {
      return family === "B16.47B"
        ? "Implemented B16.47 Series B screening subset: NPS 26-60; Classes 150, 300, 600, and 900 below NPS 48; Class 150 only at NPS 48-60. Classes 75 and 400 require a controlled rating basis."
        : "Implemented B16.47 Series A screening subset: NPS 26-60 and Classes 150, 300, 600, and 900. Classes 75 and 400 require a controlled rating basis.";
    }
    return "Implemented B16.5 screening subset: NPS 1/2-24; Class 2500 is limited to NPS 12. Class 400 requires a controlled rating basis and is not selectable.";
  }

  global.FLANGE_CONFIGURATION = Object.freeze({
    B16_5_NPS_OPTIONS,
    B16_47_NPS_OPTIONS,
    B16_5_IMPLEMENTED_CLASSES,
    B16_47_IMPLEMENTED_CLASSES,
    classOptionsFor,
    closestOption,
    exactCompactRecord,
    formatNps,
    isSupportedConfiguration,
    normalizeNumber,
    npsOptionsFor,
    scopeStatement,
  });
})(typeof window === "undefined" ? globalThis : window);
