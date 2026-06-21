export default function InventoryPanel({ result }) {
  const materials = result?.metrics?.materials || [];
  return (
    <section className="studio-panel inventory-panel">
      <h2>Inventory</h2>
      {!materials.length && <p className="muted">Run a simulation to see current inventory and stockout pressure.</p>}
      {materials.map((material) => {
        const percent = Math.min(100, Math.round((material.inventory / Math.max(1, material.reorderQuantity)) * 100));
        return (
          <div className="inventory-row" key={material.id}>
            <div>
              <strong>{material.name}</strong>
              <span>{material.inventory.toFixed(1)} on hand</span>
            </div>
            <div className="meter">
              <span style={{ width: `${percent}%` }} />
            </div>
            <small>ROP {material.reorderPoint} · ROQ {material.reorderQuantity} · stockouts {material.stockouts}</small>
          </div>
        );
      })}
    </section>
  );
}
