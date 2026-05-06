export default function MetricCard({ label, value, valueTone, hint }) {
  const valueClass =
    valueTone === "green" ? "metricValue metricValueGreen" : "metricValue";

  return (
    <div className="card metricCard">
      <div>
        <div className="metricLabel">{label}</div>
        <div className={valueClass}>{value}</div>
      </div>
      {hint ? <div className="metricHintRow">{hint}</div> : <div />}
    </div>
  );
}

