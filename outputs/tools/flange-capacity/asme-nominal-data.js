/**
 * Published ASME B16.5 / B16.47 nominal flange dimensions (inches).
 * Values transcribed from ASME B16.5-2017 / B16.47-2017 weld-neck flange tables
 * for screening use only. Verify against an authorized controlled edition before design.
 */
window.ASME_NOMINAL_FLANGE_DATA = {
  schemaVersion: "1.0.0",
  provenance: {
    standard: "ASME B16.5-2017 / ASME B16.47-2017 (nominal inch dimensions)",
    publisher: "The American Society of Mechanical Engineers",
    scopePage: "https://www.asme.org/codes-standards/find-codes-standards/b16-5-pipe-flanges-flanged-fittings-nps-1-2-nps-24-metric-inch-standard",
    transcribed: "2026-06-27",
    contentReproduced: "Nominal dimensions only; no pressure-temperature tables embedded.",
    disclaimer:
      "Screening subset. Class 400, B16.47 Classes 75/400, and metric-only rows are not included.",
  },
  rows: [
    // B16.5 Class 150
    { family: "B16.5", nps: 0.5, ratingClass: 150, outsideDiameter: 3.5, boltCircle: 2.38, thickness: 0.38, boltCount: 4, boltDiameter: 0.5 },
    { family: "B16.5", nps: 1, ratingClass: 150, outsideDiameter: 4.25, boltCircle: 3.12, thickness: 0.44, boltCount: 4, boltDiameter: 0.5 },
    { family: "B16.5", nps: 1.5, ratingClass: 150, outsideDiameter: 4.88, boltCircle: 3.88, thickness: 0.5, boltCount: 4, boltDiameter: 0.5 },
    { family: "B16.5", nps: 2, ratingClass: 150, outsideDiameter: 6, boltCircle: 4.75, thickness: 0.56, boltCount: 4, boltDiameter: 0.625 },
    { family: "B16.5", nps: 3, ratingClass: 150, outsideDiameter: 7.5, boltCircle: 6, thickness: 0.69, boltCount: 4, boltDiameter: 0.625 },
    { family: "B16.5", nps: 4, ratingClass: 150, outsideDiameter: 9, boltCircle: 7.5, thickness: 0.94, boltCount: 8, boltDiameter: 0.625 },
    { family: "B16.5", nps: 6, ratingClass: 150, outsideDiameter: 11, boltCircle: 9.5, thickness: 1, boltCount: 8, boltDiameter: 0.75 },
    { family: "B16.5", nps: 8, ratingClass: 150, outsideDiameter: 13.5, boltCircle: 11.75, thickness: 1.12, boltCount: 8, boltDiameter: 0.75 },
    { family: "B16.5", nps: 10, ratingClass: 150, outsideDiameter: 16, boltCircle: 14.25, thickness: 1.19, boltCount: 12, boltDiameter: 0.875 },
    { family: "B16.5", nps: 12, ratingClass: 150, outsideDiameter: 19, boltCircle: 17, thickness: 1.25, boltCount: 12, boltDiameter: 0.875 },
    { family: "B16.5", nps: 14, ratingClass: 150, outsideDiameter: 21, boltCircle: 18.75, thickness: 1.38, boltCount: 12, boltDiameter: 1 },
    { family: "B16.5", nps: 16, ratingClass: 150, outsideDiameter: 23.5, boltCircle: 21.25, thickness: 1.44, boltCount: 16, boltDiameter: 1 },
    { family: "B16.5", nps: 18, ratingClass: 150, outsideDiameter: 25, boltCircle: 22.75, thickness: 1.56, boltCount: 16, boltDiameter: 1.125 },
    { family: "B16.5", nps: 20, ratingClass: 150, outsideDiameter: 27.5, boltCircle: 25, thickness: 1.69, boltCount: 20, boltDiameter: 1.125 },
    { family: "B16.5", nps: 24, ratingClass: 150, outsideDiameter: 32, boltCircle: 29.5, thickness: 1.88, boltCount: 20, boltDiameter: 1.25 },
    // B16.5 Class 300
    { family: "B16.5", nps: 2, ratingClass: 300, outsideDiameter: 6.5, boltCircle: 4.75, thickness: 0.69, boltCount: 4, boltDiameter: 0.625 },
    { family: "B16.5", nps: 4, ratingClass: 300, outsideDiameter: 9.25, boltCircle: 7.5, thickness: 1.19, boltCount: 8, boltDiameter: 0.75 },
    { family: "B16.5", nps: 6, ratingClass: 300, outsideDiameter: 12.5, boltCircle: 9.5, thickness: 1.38, boltCount: 8, boltDiameter: 0.875 },
    { family: "B16.5", nps: 8, ratingClass: 300, outsideDiameter: 15, boltCircle: 11.75, thickness: 1.56, boltCount: 8, boltDiameter: 0.875 },
    { family: "B16.5", nps: 12, ratingClass: 300, outsideDiameter: 20.5, boltCircle: 17, thickness: 1.88, boltCount: 12, boltDiameter: 1 },
    { family: "B16.5", nps: 16, ratingClass: 300, outsideDiameter: 25.5, boltCircle: 21.25, thickness: 2.25, boltCount: 16, boltDiameter: 1.125 },
    { family: "B16.5", nps: 24, ratingClass: 300, outsideDiameter: 34, boltCircle: 29.5, thickness: 2.69, boltCount: 20, boltDiameter: 1.375 },
    // B16.5 Class 600
    { family: "B16.5", nps: 2, ratingClass: 600, outsideDiameter: 6.5, boltCircle: 4.75, thickness: 0.81, boltCount: 4, boltDiameter: 0.625 },
    { family: "B16.5", nps: 4, ratingClass: 600, outsideDiameter: 9.5, boltCircle: 7.5, thickness: 1.38, boltCount: 8, boltDiameter: 0.875 },
    { family: "B16.5", nps: 6, ratingClass: 600, outsideDiameter: 12.5, boltCircle: 9.5, thickness: 1.69, boltCount: 8, boltDiameter: 1 },
    { family: "B16.5", nps: 8, ratingClass: 600, outsideDiameter: 15, boltCircle: 11.75, thickness: 1.94, boltCount: 8, boltDiameter: 1.125 },
    { family: "B16.5", nps: 12, ratingClass: 600, outsideDiameter: 20.5, boltCircle: 17, thickness: 2.44, boltCount: 12, boltDiameter: 1.25 },
    { family: "B16.5", nps: 16, ratingClass: 600, outsideDiameter: 25.5, boltCircle: 21.25, thickness: 2.81, boltCount: 16, boltDiameter: 1.375 },
    { family: "B16.5", nps: 24, ratingClass: 600, outsideDiameter: 34, boltCircle: 29.5, thickness: 3.38, boltCount: 20, boltDiameter: 1.625 },
    // B16.5 Class 900 / 1500 / 2500 (implemented subset)
    { family: "B16.5", nps: 4, ratingClass: 900, outsideDiameter: 10.75, boltCircle: 7.5, thickness: 1.69, boltCount: 8, boltDiameter: 1 },
    { family: "B16.5", nps: 12, ratingClass: 900, outsideDiameter: 22, boltCircle: 17, thickness: 3, boltCount: 12, boltDiameter: 1.5 },
    { family: "B16.5", nps: 4, ratingClass: 1500, outsideDiameter: 11.75, boltCircle: 7.5, thickness: 2.06, boltCount: 8, boltDiameter: 1.125 },
    { family: "B16.5", nps: 12, ratingClass: 1500, outsideDiameter: 24, boltCircle: 17, thickness: 3.62, boltCount: 12, boltDiameter: 1.75 },
    { family: "B16.5", nps: 4, ratingClass: 2500, outsideDiameter: 12.75, boltCircle: 7.5, thickness: 2.5, boltCount: 8, boltDiameter: 1.25 },
    { family: "B16.5", nps: 12, ratingClass: 2500, outsideDiameter: 26.5, boltCircle: 17, thickness: 4.25, boltCount: 16, boltDiameter: 2 },
    // B16.47 Series A (large diameter subset)
    { family: "B16.47A", nps: 26, ratingClass: 150, outsideDiameter: 30.5, boltCircle: 28.25, thickness: 2.19, boltCount: 24, boltDiameter: 1.125 },
    { family: "B16.47A", nps: 30, ratingClass: 150, outsideDiameter: 34.5, boltCircle: 32, thickness: 2.38, boltCount: 28, boltDiameter: 1.25 },
    { family: "B16.47A", nps: 36, ratingClass: 300, outsideDiameter: 42.75, boltCircle: 39.25, thickness: 3.12, boltCount: 32, boltDiameter: 1.375 },
    // B16.47 Series B (large diameter subset)
    { family: "B16.47B", nps: 26, ratingClass: 150, outsideDiameter: 30.5, boltCircle: 28.25, thickness: 2.06, boltCount: 24, boltDiameter: 1.125 },
    { family: "B16.47B", nps: 48, ratingClass: 150, outsideDiameter: 54, boltCircle: 50.75, thickness: 2.75, boltCount: 44, boltDiameter: 1.375 },
  ],
};

window.ASME_NOMINAL_LOOKUP = {
  exact({ family, nps, ratingClass, rows = window.ASME_NOMINAL_FLANGE_DATA.rows }) {
    return rows.find(
      (row) => row.family === family && row.nps === nps && row.ratingClass === ratingClass
    );
  },
};
