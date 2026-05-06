export default function RoiLineChart({ points }) {
  const width = 1000;
  const height = 260;
  const paddingLeft = 54;
  const paddingRight = 14;
  const paddingTop = 18;
  const paddingBottom = 38;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const minY = 0;
  const maxY = 120;

  const xAt = (i) =>
    paddingLeft + (chartW * i) / Math.max(1, points.length - 1);
  const yAt = (v) =>
    paddingTop + chartH - (chartH * (v - minY)) / (maxY - minY);

  const pathD = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(p.value).toFixed(2)}`,
    )
    .join(" ");

  const gridYs = [120, 90, 60, 30, 0];

  return (
    <div style={{ marginTop: 14 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="320"
        role="img"
        aria-label="ROI ao longo do mês"
      >
        {gridYs.map((v) => {
          const y = yAt(v);
          return (
            <g key={v}>
              <line
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4 6"
              />
              <text
                x={0}
                y={y + 6}
                fill="#9ca3af"
                fontSize="18"
                fontWeight="700"
              >
                {v}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => (
          <line
            key={p.label}
            x1={xAt(i)}
            x2={xAt(i)}
            y1={paddingTop}
            y2={paddingTop + chartH}
            stroke="#f3f4f6"
          />
        ))}

        <path
          d={pathD}
          fill="none"
          stroke="#111827"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <circle
            key={`pt-${p.label}`}
            cx={xAt(i)}
            cy={yAt(p.value)}
            r="5"
            fill="#111827"
          />
        ))}

        <line
          x1={paddingLeft}
          x2={width - paddingRight}
          y1={paddingTop + chartH}
          y2={paddingTop + chartH}
          stroke="#9ca3af"
          strokeWidth="2"
        />

        {points.map((p, i) => {
          if (points.length > 16 && i % 2 !== 1) return null;
          return (
            <text
              key={`x-${p.label}`}
              x={xAt(i)}
              y={height - 12}
              fill="#9ca3af"
              fontSize="16"
              fontWeight="800"
              textAnchor="middle"
            >
              {p.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

