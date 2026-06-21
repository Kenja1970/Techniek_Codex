import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState } from "react";
import SimulationCanvas from "../components/canvas/SimulationCanvas.jsx";
import BottleneckPanel from "../components/studio/BottleneckPanel.jsx";
import InventoryPanel from "../components/studio/InventoryPanel.jsx";
import PropertiesPanel from "../components/studio/PropertiesPanel.jsx";
import SmartObjectPalette from "../components/studio/SmartObjectPalette.jsx";
import StudioToolbar from "../components/studio/StudioToolbar.jsx";
import TimelineView from "../components/studio/TimelineView.jsx";
import StudioWalkthrough from "../components/walkthrough/StudioWalkthrough.jsx";
import { SCENARIOS } from "../data/scenarioLibrary.js";
import { createSmartObject } from "../data/smartObjects.js";
import { CURRENT_SCHEMA_VERSION, migrateScenario } from "../engine/scenarioMigrations.js";
import { formatSimTime } from "../engine/time.js";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts.js";
import { useScenarioState } from "../hooks/useScenarioState.js";
import { downloadJson, downloadResultsCsv, slugify } from "../utils/export.js";

function createBlankScenario() {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    appVersion: "0.1.0",
    id: "blank-canvas",
    scenarioName: "Blank Canvas",
    scenarioType: "custom",
    assumptions: { summary: "Blank local Studio model." },
    objects: [],
    connectors: [],
    materials: [],
    resources: [],
    tokenTypes: [],
    calendars: [
      { id: "standard", label: "Two-shift weekday", shiftLength: 480, shiftsPerDay: 2, workingDays: [1, 2, 3, 4, 5] }
    ],
    simulation: {
      timeUnit: "minutes",
      shiftLength: 480,
      shiftsPerDay: 2,
      runDuration: 960,
      reportingPeriod: 60,
      seed: 12345,
      priorityRule: "FIFO"
    }
  };
}

export default function StudioPage({
  activeScenario,
  setActiveScenario,
  lastResults,
  setLastResults,
  runScenario
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const { scenario, setScenario, loadScenario, undo, redo, canUndo, canRedo } = useScenarioState(activeScenario);
  const [selected, setSelected] = useState(null);
  const [connectSource, setConnectSource] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  const activeTokens = useMemo(() => {
    const rows = lastResults?.metrics?.timeline || [];
    const byObject = new Map(scenario.objects.map((object) => [object.id, object]));
    return rows
      .filter((item) => item.start <= animationTime && item.end >= animationTime && item.type === "process")
      .slice(0, 18)
      .map((item, index) => {
        const object = byObject.get(item.objectId);
        return {
          id: `${item.tokenId}-${index}`,
          label: item.tokenLabel,
          x: Number(object?.x || 0) + 52 + (index % 3) * 12,
          y: Number(object?.y || 0) + 48 + (index % 2) * 8
        };
      });
  }, [animationTime, lastResults, scenario.objects]);

  function commit(next) {
    setScenario(next);
    const resolved = typeof next === "function" ? next(scenario) : next;
    setActiveScenario(resolved);
  }

  function handleSelect(id, type) {
    setSelected(id && type ? { id, type } : null);
  }

  function handleDragEnd(event) {
    const source = event.active.data.current?.source;
    if (source === "palette" && event.over?.id === "studio-canvas") {
      const rect = canvasRef.current?.getBoundingClientRect();
      const translated = event.active.rect.current.translated || event.active.rect.current.initial;
      const x = Math.max(12, Math.round((translated?.left || 180) - (rect?.left || 0)));
      const y = Math.max(12, Math.round((translated?.top || 180) - (rect?.top || 0)));
      const object = createSmartObject(
        event.active.data.current.objectType,
        event.active.data.current.label,
        x,
        y
      );
      commit((current) => ({ ...current, objects: [...current.objects, object] }));
      setSelected({ id: object.id, type: "object" });
    }
    if (source === "canvas") {
      const objectId = event.active.data.current.objectId;
      commit((current) => ({
        ...current,
        objects: current.objects.map((object) =>
          object.id === objectId
            ? {
                ...object,
                x: Math.max(0, Math.round(Number(object.x || 0) + event.delta.x)),
                y: Math.max(0, Math.round(Number(object.y || 0) + event.delta.y))
              }
            : object
        )
      }));
    }
  }

  function updateObject(id, patch) {
    commit((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === id
          ? { ...object, ...patch, properties: patch.properties || object.properties }
          : object
      )
    }));
  }

  function updateConnector(id, patch) {
    commit((current) => ({
      ...current,
      connectors: current.connectors.map((connector) =>
        connector.id === id ? { ...connector, ...patch } : connector
      )
    }));
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.type === "object") {
      commit((current) => ({
        ...current,
        objects: current.objects.filter((object) => object.id !== selected.id),
        connectors: current.connectors.filter((connector) => connector.from !== selected.id && connector.to !== selected.id)
      }));
    }
    if (selected.type === "connector") {
      commit((current) => ({
        ...current,
        connectors: current.connectors.filter((connector) => connector.id !== selected.id)
      }));
    }
    setSelected(null);
  }

  function duplicateSelected() {
    if (selected?.type !== "object") return;
    const object = scenario.objects.find((item) => item.id === selected.id);
    if (!object) return;
    const copy = {
      ...structuredClone(object),
      id: `${object.type}-${Date.now().toString(36)}`,
      label: `${object.label} copy`,
      x: Number(object.x || 0) + 32,
      y: Number(object.y || 0) + 32
    };
    commit((current) => ({ ...current, objects: [...current.objects, copy] }));
    setSelected({ id: copy.id, type: "object" });
  }

  function startConnector() {
    if (selected?.type === "object") setConnectSource(selected.id);
  }

  function finishConnector(targetId) {
    if (!connectSource || connectSource === targetId) return;
    const connector = {
      id: `connector-${Date.now().toString(36)}`,
      from: connectSource,
      to: targetId,
      type: "production",
      label: "flow",
      priority: 1,
      probability: 1,
      condition: "any"
    };
    commit((current) => ({ ...current, connectors: [...current.connectors, connector] }));
    setConnectSource(null);
    setSelected({ id: connector.id, type: "connector" });
  }

  function runCurrent(options) {
    const results = runScenario(scenario, options);
    setLastResults(results);
    setAnimationTime(0);
    setIsAnimating(true);
  }

  function exportScenario() {
    downloadJson(`${slugify(scenario.scenarioName)}.json`, scenario);
  }

  function exportResults() {
    if (!lastResults) return;
    downloadJson(`${slugify(lastResults.scenarioName)}-results.json`, lastResults);
    downloadResultsCsv(lastResults);
  }

  function importScenario(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = migrateScenario(JSON.parse(reader.result));
      loadScenario(imported);
      setActiveScenario(imported);
      setSelected(null);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  useKeyboardShortcuts({
    toggleRun: () => (isAnimating ? setIsAnimating(false) : runCurrent()),
    reset: () => {
      setAnimationTime(0);
      setIsAnimating(false);
    },
    exportScenario,
    importScenario: () => fileInputRef.current?.click(),
    deleteSelected,
    duplicateSelected,
    undo,
    redo,
    exportResults,
    escape: () => {
      setSelected(null);
      setConnectSource(null);
    }
  });

  useEffect(() => {
    if (!isAnimating || !lastResults?.runDuration) return undefined;
    let frame = 0;
    const tick = () => {
      setAnimationTime((time) => {
        const next = Math.min(lastResults.runDuration, time + 6);
        if (next >= lastResults.runDuration) setIsAnimating(false);
        return next;
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isAnimating, lastResults?.runDuration]);

  return (
    <div className="studio-page">
      <StudioToolbar
        scenario={scenario}
        isAnimating={isAnimating}
        canUndo={canUndo}
        canRedo={canRedo}
        onRun={() => runCurrent()}
        onPause={() => setIsAnimating((value) => !value)}
        onReset={() => {
          setAnimationTime(0);
          setIsAnimating(false);
        }}
        onStep={() => runCurrent({ durationOverride: Math.min((lastResults?.clock || 0) + 60, scenario.simulation.runDuration || 960) })}
        onBlank={() => {
          const blank = createBlankScenario();
          loadScenario(blank);
          setActiveScenario(blank);
          setLastResults(null);
        }}
        onLoadScenario={(next) => {
          if (!next) return;
          loadScenario(next);
          setActiveScenario(next);
          setLastResults(runScenario(next));
        }}
        onExportScenario={exportScenario}
        onImportClick={() => fileInputRef.current?.click()}
        onExportResults={exportResults}
        onUndo={undo}
        onRedo={redo}
        onConnect={startConnector}
      />

      <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json" onChange={importScenario} />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="studio-layout">
          <SmartObjectPalette />
          <div className="canvas-column">
            <div className="sim-status">
              <span>{formatSimTime(animationTime, scenario.simulation)}</span>
              <span>Seed {scenario.simulation?.seed || "none"}</span>
              <span>{connectSource ? "Select target object to connect" : "Canvas ready"}</span>
            </div>
            <SimulationCanvas
              scenario={scenario}
              selected={selected}
              onSelect={handleSelect}
              connectSource={connectSource}
              onConnectTarget={finishConnector}
              canvasRef={canvasRef}
              activeTokens={activeTokens}
            />
          </div>
          <PropertiesPanel
            scenario={scenario}
            selected={selected}
            onUpdateObject={updateObject}
            onUpdateConnector={updateConnector}
            onDelete={deleteSelected}
            onDuplicate={duplicateSelected}
          />
        </div>
      </DndContext>

      <div className="studio-bottom-grid">
        <InventoryPanel result={lastResults} />
        <BottleneckPanel result={lastResults} />
        <TimelineView result={lastResults} />
      </div>
      <StudioWalkthrough />
    </div>
  );
}
