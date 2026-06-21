import { useEffect, useState } from "react";

export default function StudioWalkthrough() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem("twinsimWalkthroughHidden") !== "true");
  }, []);

  if (!visible) return null;

  return (
    <div className="walkthrough">
      <div>
        <span className="eyebrow">3-minute path</span>
        <h2>Build, run, inspect, adjust.</h2>
        <p>Drag a smart object onto the canvas, connect the flow, run the model, then read bottlenecks, inventory, and timeline loss.</p>
        <div className="button-row">
          <button onClick={() => setVisible(false)}>Skip</button>
          <button
            onClick={() => {
              localStorage.setItem("twinsimWalkthroughHidden", "true");
              setVisible(false);
            }}
          >
            Do not show again
          </button>
        </div>
      </div>
    </div>
  );
}
