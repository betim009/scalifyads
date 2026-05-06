export default function FinanceMetricCard({
  badgeBg,
  badgeColor,
  badgeText,
  topRight,
  value,
  labelIcon,
  label,
}) {
  return (
    <div className="card financeMetricCard">
      <div className="financeMetricTop">
        <div
          className="metricIconBadge"
          style={{ background: badgeBg, color: badgeColor }}
          aria-hidden="true"
        >
          {badgeText}
        </div>
        {topRight ? (
          <span aria-hidden="true" style={{ fontWeight: 900 }}>
            {topRight}
          </span>
        ) : (
          <span />
        )}
      </div>
      <div className="financeValue">{value}</div>
      <div className="financeLabel">
        <span aria-hidden="true">{labelIcon}</span> {label}
      </div>
    </div>
  );
}

