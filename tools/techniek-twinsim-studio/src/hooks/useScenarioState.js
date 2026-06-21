import { useCallback, useEffect, useState } from "react";
import { migrateScenario } from "../engine/scenarioMigrations.js";

export function useScenarioState(initialScenario) {
  const [record, setRecord] = useState({
    past: [],
    present: migrateScenario(initialScenario),
    future: []
  });

  useEffect(() => {
    setRecord({ past: [], present: migrateScenario(initialScenario), future: [] });
  }, [initialScenario?.id]);

  const commit = useCallback((updater) => {
    setRecord((current) => {
      const next =
        typeof updater === "function" ? updater(current.present) : updater;
      return {
        past: [...current.past, current.present],
        present: { ...next, updatedAt: new Date().toISOString() },
        future: []
      };
    });
  }, []);

  const undo = useCallback(() => {
    setRecord((current) => {
      if (!current.past.length) return current;
      const previous = current.past.at(-1);
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setRecord((current) => {
      if (!current.future.length) return current;
      const next = current.future[0];
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1)
      };
    });
  }, []);

  const loadScenario = useCallback((scenario) => {
    setRecord({ past: [record.present], present: migrateScenario(scenario), future: [] });
  }, [record.present]);

  return {
    scenario: record.present,
    setScenario: commit,
    loadScenario,
    undo,
    redo,
    canUndo: record.past.length > 0,
    canRedo: record.future.length > 0
  };
}
