function formatMoneyK(value) {
  return `R$ ${(value / 1000).toFixed(1)}k`;
}

export default function SpendLineChart({ points }) {
  const width = 1000;
  const height = 260;
  const paddingLeft = 60;
  const paddingRight = 18;
  const paddingTop = 18;
  const paddingBottom = 42;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const minY = 0;
  const maxY = 6000;

  const xAt = (i) =>
    paddingLeft + (chartW * i) / Math.max(1, points.length - 1);
  const yAt = (v) =>
    paddingTop + chartH - (chartH * (v - minY)) / (maxY - minY);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(p.value).toFixed(2)}`)
    .join(" ");

  const gridYs = [6000, 4500, 3000, 1500, 0];

  return (
    <div style={{ marginTop: 18 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="320"
        role="img"
        aria-label="Gráfico de gastos"
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
                {formatMoneyK(v)}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => {
          const x = xAt(i);
          return (
            <line
              key={p.label}
              x1={x}
              x2={x}
              y1={paddingTop}
              y2={paddingTop + chartH}
              stroke="#f3f4f6"
            />
          );
        })}

        <path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <g key={`pt-${p.label}`}>
            <circle
              cx={xAt(i)}
              cy={yAt(p.value)}
              r="10"
              fill="#3b82f6"
              opacity="0.25"
            />
            <circle cx={xAt(i)} cy={yAt(p.value)} r="7" fill="#3b82f6" />
          </g>
        ))}

        <line
          x1={paddingLeft}
          x2={width - paddingRight}
          y1={paddingTop + chartH}
          y2={paddingTop + chartH}
          stroke="#9ca3af"
          strokeWidth="2"
        />

        {points.map((p, i) => (
          <text
            key={`x-${p.label}`}
            x={xAt(i)}
            y={height - 12}
            fill="#9ca3af"
            fontSize="20"
            fontWeight="800"
            textAnchor="middle"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

