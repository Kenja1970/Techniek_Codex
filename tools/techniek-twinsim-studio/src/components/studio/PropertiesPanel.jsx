import { CONNECTOR_TYPES } from "../../data/connectorTypes.js";

function NumberField({ label, value, onChange, step = 1, min = 0 }) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        value={value ?? 0}
        min={min}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function PropertiesPanel({
  scenario,
  selected,
  onUpdateObject,
  onUpdateConnector,
  onDelete,
  onDuplicate
}) {
  const object = selected?.type === "object" ? scenario.objects.find((item) => item.id === selected.id) : null;
  const connector = selected?.type === "connector" ? scenario.connectors.find((item) => item.id === selected.id) : null;

  return (
    <aside className="studio-panel properties-panel">
      <h2>Properties</h2>
      {!object && !connector && (
        <p className="muted">Select a smart object or connector to edit properties.</p>
      )}

      {object && (
        <div className="property-stack">
          <label>
            <span>Label</span>
            <input value={object.label} onChange={(event) => onUpdateObject(object.id, { label: event.target.value })} />
          </label>
          <label>
            <span>Type</span>
            <input value={object.type} readOnly />
          </label>
          <NumberField label="Capacity" value={object.properties?.capacity} onChange={(value) => onUpdateObject(object.id, { properties: { ...object.properties, capacity: value } })} />
          <NumberField label="Failure probability" value={object.properties?.failureProbability} step={0.01} max={1} onChange={(value) => onUpdateObject(object.id, { properties: { ...object.properties, failureProbability: value } })} />
          <NumberField label="Rework probability" value={object.properties?.reworkProbability} step={0.01} max={1} onChange={(value) => onUpdateObject(object.id, { properties: { ...object.properties, reworkProbability: value } })} />
          <NumberField label="Scrap probability" value={object.properties?.scrapProbability} step={0.01} max={1} onChange={(value) => onUpdateObject(object.id, { properties: { ...object.properties, scrapProbability: value } })} />
          <label className="check-row">
            <input
              type="checkbox"
              checked={Boolean(object.properties?.batchEnabled)}
              onChange={(event) => onUpdateObject(object.id, { properties: { ...object.properties, batchEnabled: event.target.checked } })}
            />
            <span>Batch enabled</span>
          </label>
          {object.properties?.batchEnabled && (
            <>
              <NumberField label="Batch size" value={object.properties.batchSize || 4} onChange={(value) => onUpdateObject(object.id, { properties: { ...object.properties, batchSize: value } })} />
              <NumberField label="Max batch wait" value={object.properties.maxBatchWait || 60} onChange={(value) => onUpdateObject(object.id, { properties: { ...object.properties, maxBatchWait: value } })} />
            </>
          )}
          <div className="button-row">
            <button onClick={onDuplicate}>Duplicate</button>
            <button className="danger" onClick={onDelete}>Delete</button>
          </div>
        </div>
      )}

      {connector && (
        <div className="property-stack">
          <label>
            <span>Label</span>
            <input value={connector.label || ""} onChange={(event) => onUpdateConnector(connector.id, { label: event.target.value })} />
          </label>
          <label>
            <span>Type</span>
            <select value={connector.type} onChange={(event) => onUpdateConnector(connector.id, { type: event.target.value })}>
              {Object.entries(CONNECTOR_TYPES).map(([id, type]) => (
                <option key={id} value={id}>{type.label}</option>
              ))}
            </select>
          </label>
          <NumberField label="Route priority" value={connector.priority || 1} onChange={(value) => onUpdateConnector(connector.id, { priority: value })} />
          <NumberField label="Probability" value={connector.probability ?? 1} step={0.05} onChange={(value) => onUpdateConnector(connector.id, { probability: value })} />
          <label>
            <span>Condition placeholder</span>
            <input value={connector.condition || "any"} onChange={(event) => onUpdateConnector(connector.id, { condition: event.target.value })} />
          </label>
          <button className="danger" onClick={onDelete}>Delete connector</button>
        </div>
      )}
    </aside>
  );
}
