import { CONNECTOR_TYPES } from "../../data/connectorTypes.js";

function pointFor(object) {
  return {
    x: Number(object.x || 0) + 72,
    y: Number(object.y || 0) + 34
  };
}

export default function ConnectorsLayer({ objects, connectors, selectedId, onSelect }) {
  const byId = new Map(objects.map((object) => [object.id, object]));

  return (
    <svg className="connector-layer" aria-hidden="true">
      <defs>
        {Object.entries(CONNECTOR_TYPES).map(([id, type]) => (
          <marker
            key={id}
            id={`arrow-${id}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={type.color} />
          </marker>
        ))}
      </defs>
      {connectors.map((connector) => {
        const from = byId.get(connector.from);
        const to = byId.get(connector.to);
        if (!from || !to) return null;
        const a = pointFor(from);
        const b = pointFor(to);
        const type = CONNECTOR_TYPES[connector.type] || CONNECTOR_TYPES.production;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const curve = Math.max(60, Math.abs(b.x - a.x) * 0.35);
        const d = `M ${a.x} ${a.y} C ${a.x + curve} ${a.y}, ${b.x - curve} ${b.y}, ${b.x} ${b.y}`;
        return (
          <g key={connector.id} className={selectedId === connector.id ? "selected-connector" : ""}>
            <path
              d={d}
              className={`connector-line ${type.stroke}`}
              stroke={type.color}
              markerEnd={`url(#arrow-${connector.type || "production"})`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(connector.id, "connector");
              }}
            />
            <text x={midX} y={midY - 8} className="connector-label">
              {connector.label || type.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
