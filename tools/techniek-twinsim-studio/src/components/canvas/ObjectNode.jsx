import { useDraggable } from "@dnd-kit/core";

export default function ObjectNode({ object, selected, connectSource, onSelect, onConnectTarget }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `object:${object.id}`,
    data: { source: "canvas", objectId: object.id }
  });
  const style = {
    left: object.x,
    top: object.y,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined
  };

  return (
    <button
      ref={setNodeRef}
      className={`object-node ${selected ? "selected" : ""} ${connectSource === object.id ? "connect-source" : ""}`}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        if (connectSource && connectSource !== object.id) onConnectTarget(object.id);
        else onSelect(object.id, "object");
      }}
      {...listeners}
      {...attributes}
    >
      <span className="node-kind">{object.type}</span>
      <strong>{object.label}</strong>
      <small>{object.category}</small>
    </button>
  );
}
