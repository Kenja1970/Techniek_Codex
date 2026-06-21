export const CURRENT_SCHEMA_VERSION = "0.1.0";

export function migrateScenario(input) {
  const scenario = structuredClone(input);
  if (!scenario.schemaVersion) {
    scenario.schemaVersion = CURRENT_SCHEMA_VERSION;
    scenario.migrationNotes = ["Added schemaVersion during import."];
  }
  scenario.objects = scenario.objects || [];
  scenario.connectors = scenario.connectors || [];
  scenario.materials = scenario.materials || [];
  scenario.resources = scenario.resources || [];
  scenario.tokenTypes = scenario.tokenTypes || [];
  scenario.simulation = scenario.simulation || {};
  scenario.updatedAt = scenario.updatedAt || new Date().toISOString();
  return scenario;
}
