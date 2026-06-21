import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { SMART_OBJECT_TABS } from "../../data/smartObjects.js";

function PaletteItem({ object }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `palette:${object.type}`,
    data: { source: "palette", objectType: object.type, label: object.label }
  });
  return (
    <button
      ref={setNodeRef}
      className="palette-item"
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      {...listeners}
      {...attributes}
    >
      <span>{object.icon}</span>
      {object.label}
    </button>
  );
}

export default function SmartObjectPalette() {
  const [activeTab, setActiveTab] = useState(SMART_OBJECT_TABS[0].id);
  const tab = SMART_OBJECT_TABS.find((item) => item.id === activeTab) || SMART_OBJECT_TABS[0];

  return (
    <aside className="studio-panel palette-panel">
      <h2>Smart objects</h2>
      <div className="segmented">
        {SMART_OBJECT_TABS.map((item) => (
          <button
            key={item.id}
            className={item.id === activeTab ? "active" : ""}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="palette-list">
        {tab.objects.map((object) => (
          <PaletteItem key={`${tab.id}-${object.type}-${object.label}`} object={object} />
        ))}
      </div>
    </aside>
  );
}
