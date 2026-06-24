(function configureQualificationEvidence(global) {
  const QUALIFICATION_EVIDENCE = [
    {
      id: "code_edition",
      label: "Governing Code edition and jurisdiction confirmed",
      note: "2025 BPVC is available; the implemented calculation basis stops at the supplied 2023 edition.",
      placeholder: "Code basis memo / jurisdiction record",
      appliesTo: "all",
    },
    {
      id: "controlled_geometry",
      label: "Controlled drawing and final corroded geometry attached",
      note: "Include bore, hub, flange, bolt-circle, seal, tolerances, and corrosion allowance.",
      placeholder: "Drawing number and revision",
      appliesTo: "all",
    },
    {
      id: "material_records",
      label: "Flange and bolting material records verified",
      note: "MTRs, heat treatment, specification, grade, and temperature allowables.",
      placeholder: "MTR / material register reference",
      appliesTo: "all",
    },
    {
      id: "assembly_procedure",
      label: "Bolt preload and assembly procedure approved",
      note: "Target preload, lubrication, tightening method, scatter, and inspection record.",
      placeholder: "Assembly procedure and revision",
      appliesTo: "all",
    },
    {
      id: "seal_basis",
      label: "Seal or gasket qualification basis attached",
      note: "Geometry, material, leakage criterion, seating/contact limits, and reuse restrictions.",
      placeholder: "Seal data sheet / qualification report",
      appliesTo: "all",
    },
    {
      id: "load_combinations",
      label: "Design load combinations and source calculations approved",
      note: "Pressure, sustained axial load, bending, occasional loads, and sign conventions.",
      placeholder: "Load case register / piping calculation",
      appliesTo: "all",
    },
    {
      id: "thermal_fatigue",
      label: "Thermal and cyclic/fatigue applicability resolved",
      note: "Document evaluation or a justified not-applicable determination.",
      placeholder: "Fatigue/thermal assessment or N/A memo",
      appliesTo: "all",
    },
    {
      id: "rigidity_rotation",
      label: "Flange rigidity and rotation acceptance completed",
      note: "Use the controlled Code method or qualified design-by-analysis model.",
      placeholder: "Calculation / FEA report reference",
      appliesTo: "all",
    },
    {
      id: "alternate_method",
      label: "Compact-flange alternate method evidence attached",
      note: "Validated FEA, proof testing, or other accepted qualification evidence as applicable.",
      placeholder: "FEA / proof-test / type-approval record",
      appliesTo: "compact",
    },
    {
      id: "eor_review",
      label: "Engineer-of-record review completed",
      note: "Inputs, assumptions, applicability, calculations, and drawing revision.",
      placeholder: "Review record / approval transmittal",
      appliesTo: "all",
    },
    {
      id: "certifier_plan",
      label: "Authorized inspector or certifier review plan confirmed",
      note: "Applicable conformity-assessment route, hold points, and required deliverables.",
      placeholder: "ITP / verification plan / certifier record",
      appliesTo: "all",
    },
  ];

  function normalizedEntry(value) {
    if (value === true || value === false) {
      return { asserted: value === true, evidenceReference: "" };
    }
    return {
      asserted: value?.asserted === true || value?.confirmed === true,
      evidenceReference: String(
        value?.evidenceReference ?? value?.reference ?? ""
      ).trim(),
    };
  }

  function normalizeEvidenceState(rawState = {}) {
    return Object.fromEntries(
      QUALIFICATION_EVIDENCE.map((item) => [
        item.id,
        normalizedEntry(rawState[item.id]),
      ])
    );
  }

  function requirementsFor(productLine) {
    return QUALIFICATION_EVIDENCE.filter(
      (item) => item.appliesTo === "all" || item.appliesTo === productLine
    );
  }

  function evaluateEvidenceState({
    productLine,
    rawState = {},
    numericalPass = false,
  }) {
    const state = normalizeEvidenceState(rawState);
    const items = requirementsFor(productLine).map((item) => {
      const entry = state[item.id];
      const documented = entry.asserted && entry.evidenceReference.length > 0;
      return {
        ...item,
        asserted: entry.asserted,
        evidenceReference: entry.evidenceReference,
        confirmed: documented,
        issue: documented
          ? null
          : entry.asserted
            ? "Evidence reference required"
            : "Confirmation and evidence reference required",
      };
    });
    const confirmed = items.filter((item) => item.confirmed).length;
    const asserted = items.filter((item) => item.asserted).length;
    const missing = items.filter((item) => !item.confirmed);
    const complete = missing.length === 0;

    return {
      numericalPass,
      complete,
      confirmed,
      asserted,
      required: items.length,
      percent: items.length ? (confirmed / items.length) * 100 : 0,
      items,
      missing,
      level: !numericalPass
        ? "SCREENING CHECK FAILED"
        : complete
          ? "READY FOR ENGINEER-OF-RECORD REVIEW"
          : "SCREENING ONLY",
    };
  }

  global.FLANGE_QUALIFICATION = Object.freeze({
    QUALIFICATION_EVIDENCE,
    evaluateEvidenceState,
    normalizeEvidenceState,
    requirementsFor,
  });
})(typeof window === "undefined" ? globalThis : window);
