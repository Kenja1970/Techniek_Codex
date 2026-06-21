import { SCENARIOS } from "../../data/scenarioLibrary.js";

export default function StudioToolbar({
  scenario,
  isAnimating,
  canUndo,
  canRedo,
  onRun,
  onPause,
  onReset,
  onStep,
  onBlank,
  onLoadScenario,
  onExportScenario,
  onImportClick,
  onExportResults,
  onUndo,
  onRedo,
  onConnect
}) {
  return (
    <section className="studio-toolbar">
      <div>
        <span className="eyebrow">Active model</span>
        <strong>{scenario.scenarioName}</strong>
      </div>
      <div className="toolbar-actions">
        <select onChange={(event) => onLoadScenario(SCENARIOS.find((item) => item.id === event.target.value))} value={scenario.id || ""}>
          {SCENARIOS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.scenarioName}
            </option>
          ))}
        </select>
        <button onClick={onBlank}>Blank</button>
        <button onClick={onRun}>{isAnimating ? "Restart" : "Run"}</button>
        <button onClick={onPause}>{isAnimating ? "Pause" : "Resume"}</button>
        <button onClick={onStep}>Step</button>
        <button onClick={onReset}>Reset</button>
        <button onClick={onConnect}>Connect</button>
        <button disabled={!canUndo} onClick={onUndo}>Undo</button>
        <button disabled={!canRedo} onClick={onRedo}>Redo</button>
        <button onClick={onExportScenario}>Export JSON</button>
        <button onClick={onImportClick}>Import JSON</button>
        <button onClick={onExportResults}>Export results</button>
      </div>
    </section>
  );
}
