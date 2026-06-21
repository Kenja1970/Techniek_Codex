import { useDroppable } from "@dnd-kit/core";
import ConnectorsLayer from "./ConnectorsLayer.jsx";
import ObjectNode from "./ObjectNode.jsx";

export default function SimulationCanvas({
  scenario,
  selected,
  onSelect,
  connectSource,
  onConnectTarget,
  canvasRef,
  activeTokens = []
}) {
  const { setNodeRef } = useDroppable({ id: "studio-canvas" });

  return (
    <section
      className="studio-canvas"
      ref={(node) => {
        setNodeRef(node);
        canvasRef.current = node;
      }}
      onClick={() => onSelect(null, null)}
    >
      <div className="canvas-grid" />
      <ConnectorsLayer
        objects={scenario.objects}
        connectors={scenario.connectors}
        selectedId={selected?.type === "connector" ? selected.id : null}
        onSelect={onSelect}
      />
      {scenario.objects.map((object) => (
        <ObjectNode
          key={object.id}
          object={object}
          selected={selected?.type === "object" && selected.id === object.id}
          connectSource={connectSource}
          onSelect={onSelect}
          onConnectTarget={onConnectTarget}
        />
      ))}
      {activeTokens.map((token) => (
        <span
          key={token.id}
          className="sim-token"
          style={{ left: token.x, top: token.y }}
          title={token.label}
        />
      ))}
    </section>
  );
}
