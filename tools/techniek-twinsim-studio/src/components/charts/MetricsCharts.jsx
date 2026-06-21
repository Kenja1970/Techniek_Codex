import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function ChartShell({ title, children }) {
  return (
    <section className="chart-card">
      <h3>{title}</h3>
      <div className="chart-box">{children}</div>
    </section>
  );
}

export function MetricsCharts({ result }) {
  if (!result?.metrics) return null;
  const stationMetrics = result.metrics.stationMetrics || [];
  const queueKeys = Object.keys(result.metrics.queueTrend?.[0] || {}).filter((key) => key !== "time");
  const inventoryKeys = Object.keys(result.metrics.inventoryTrend?.[0] || {}).filter((key) => key !== "time");

  return (
    <div className="chart-grid">
      <ChartShell title="Utilization by station">
        <ResponsiveContainer>
          <BarChart data={stationMetrics}>
            <CartesianGrid stroke="#17324a" />
            <XAxis dataKey="label" tick={{ fill: "#9fb9c8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9fb9c8", fontSize: 11 }} domain={[0, 1]} />
            <Tooltip contentStyle={{ background: "#0b1f31", border: "1px solid #24506c" }} />
            <Bar dataKey="utilization" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Throughput over simulated time">
        <ResponsiveContainer>
          <LineChart data={result.metrics.throughputTrend}>
            <CartesianGrid stroke="#17324a" />
            <XAxis dataKey="time" tick={{ fill: "#9fb9c8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9fb9c8", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0b1f31", border: "1px solid #24506c" }} />
            <Line type="monotone" dataKey="throughput" stroke="#38bdf8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Queue length trend">
        <ResponsiveContainer>
          <LineChart data={result.metrics.queueTrend}>
            <CartesianGrid stroke="#17324a" />
            <XAxis dataKey="time" tick={{ fill: "#9fb9c8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9fb9c8", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0b1f31", border: "1px solid #24506c" }} />
            {queueKeys.slice(0, 5).map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={["#2dd4bf", "#38bdf8", "#f8c14a", "#f87171", "#a78bfa"][index]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="WIP trend">
        <ResponsiveContainer>
          <AreaChart data={result.metrics.wipTrend}>
            <CartesianGrid stroke="#17324a" />
            <XAxis dataKey="time" tick={{ fill: "#9fb9c8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9fb9c8", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0b1f31", border: "1px solid #24506c" }} />
            <Area type="monotone" dataKey="wip" stroke="#f8c14a" fill="#f8c14a33" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Raw material inventory levels">
        <ResponsiveContainer>
          <LineChart data={result.metrics.inventoryTrend}>
            <CartesianGrid stroke="#17324a" />
            <XAxis dataKey="time" tick={{ fill: "#9fb9c8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9fb9c8", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0b1f31", border: "1px solid #24506c" }} />
            {inventoryKeys.slice(0, 4).map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={["#2dd4bf", "#38bdf8", "#f8c14a", "#f87171"][index]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}
