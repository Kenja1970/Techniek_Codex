# Scenario Schema

Current schema version: `0.1.0`

## Top-Level Fields

- `schemaVersion`: scenario schema version.
- `createdAt`, `updatedAt`: ISO timestamps.
- `appVersion`: application version used to save the scenario.
- `id`: local identifier.
- `scenarioName`: display name.
- `scenarioType`: manufacturing, logistics, engineering-work, or custom.
- `assumptions`: summary and notes.
- `objects`: canvas smart objects.
- `connectors`: routed edges between objects.
- `materials`: inventory and supplier assumptions.
- `resources`: worker/equipment resource assumptions.
- `tokenTypes`: part, job, deliverable, or work-package definitions.
- `calendars`: resource and station availability definitions.
- `simulation`: run settings.

## Object Fields

- `id`, `type`, `category`, `label`
- `x`, `y`: canvas position.
- `properties`: capacity, process time, batch settings, failure probabilities, calendar, downtime, material requirements.

## Connector Fields

- `id`
- `from`, `to`
- `type`: production, material, rework, scrap, information.
- `label`
- `priority`
- `probability`
- `condition`

## Token Type Fields

- `id`, `label`, `sourceId`
- `arrivalInterval`, `firstArrival`, `maxTokens`
- `priority`, `dueIn`
- `materialRequirements`
- `processTimes`
- `failureProbability`, `reworkProbability`, `scrapProbability`
- `businessValue`

## Migration Placeholder

`src/engine/scenarioMigrations.js` currently normalizes missing arrays and schema version. Future migrations should upgrade older schema versions without mutating baseline files automatically.
