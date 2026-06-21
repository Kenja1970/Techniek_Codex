import { getBottleneckNarrative, getSuggestions } from "../../utils/analysis.js";

export default function BottleneckPanel({ result }) {
  const suggestions = getSuggestions(result);
  return (
    <section className="studio-panel bottleneck-panel">
      <h2>Bottleneck analysis</h2>
      <p>{getBottleneckNarrative(result)}</p>
      <h3>Rule-based suggestions</h3>
      <ul className="suggestion-list">
        {suggestions.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="muted">Suggestions do not mutate the baseline scenario.</p>
    </section>
  );
}
