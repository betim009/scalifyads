import BackLink from "../components/BackLink.jsx";
import RoiLineChart from "../components/RoiLineChart.jsx";
import { mockMonthly } from "../data/mockMonthly.js";

function CalendarIcon(props) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M7 3v3M17 3v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 9h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function Mensal() {
  const { monthLabel, metrics, daily, summaryRow, bestDay, worstDay, roiSeries } =
    mockMonthly;

  return (
    <>
      <main style={{ background: "#ffffff" }}>
        <div className="container" style={{ paddingTop: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <BackLink fallbackTo="/" />

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                type="button"
                style={{
                  height: 44,
                  padding: "0 18px",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <CalendarIcon />
                {monthLabel}
                <span aria-hidden="true" style={{ opacity: 0.6, marginLeft: 6 }}>
                  ▾
                </span>
              </button>

              <button type="button" className="pillButton pillButtonActive">
                <span aria-hidden="true" className="pillButtonIcon">
                  +
                </span>
                Novo mês
              </button>
            </div>
          </div>
        </div>
      </main>

      <section className="page" style={{ marginTop: 22 }}>
        <div className="container">
          <section className="gridMetrics" aria-label="Resumo mensal">
            <div className="card metricCard">
              <div>
                <div className="metricLabel">Gasto total</div>
                <div className="metricValue" style={{ color: "#ef4444" }}>
                  {metrics.spendTotal}
                </div>
              </div>
              <div />
            </div>

            <div className="card metricCard">
              <div>
                <div className="metricLabel">Faturamento total</div>
                <div className="metricValue">{metrics.revenueTotal}</div>
              </div>
              <div />
            </div>

            <div className="card metricCard">
              <div>
                <div className="metricLabel">Lucro total</div>
                <div className="metricValue metricValueGreen">{metrics.profitTotal}</div>
              </div>
              <div />
            </div>

            <div className="card metricCard">
              <div>
                <div className="metricLabel">ROI médio</div>
                <div className="metricValue metricValueGreen">{metrics.roiAvg}</div>
                <div className="metricHintRow" style={{ marginTop: 10 }}>
                  <span style={{ fontWeight: 700 }}>Retorno sobre investimento</span>
                </div>
              </div>
              <div />
            </div>

            <div className="card metricCard">
              <div>
                <div className="metricLabel">Dólar hoje</div>
                <div className="metricValue">{metrics.dollarToday}</div>
              </div>
              <div />
            </div>
          </section>

          <section className="card" style={{ marginTop: 22, padding: 0 }}>
            <div style={{ padding: 22 }}>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>
                Desempenho diário do mês
              </h2>
              <div className="muted" style={{ marginTop: 6, fontWeight: 700 }}>
                30 dias registrados
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
              <table className="dataTable" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>DATA</th>
                    <th>GASTO</th>
                    <th>FATURAMENTO</th>
                    <th>LUCRO</th>
                    <th>ROI (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d) => (
                    <tr key={d.date}>
                      <td style={{ fontWeight: 900 }}>{d.date.replace("/04", "/04")}</td>
                      <td style={{ color: "#ef4444", fontWeight: 900 }}>
                        R$ {d.spend.toLocaleString("pt-BR")}
                      </td>
                      <td style={{ fontWeight: 900 }}>
                        R$ {d.revenue.toLocaleString("pt-BR")}
                      </td>
                      <td style={{ color: "#16a34a", fontWeight: 900 }}>
                        R$ {d.profit.toLocaleString("pt-BR")}
                      </td>
                      <td
                        style={{
                          fontWeight: 900,
                          color: d.roi >= 100 ? "#16a34a" : "#f59e0b",
                        }}
                      >
                        {d.roi.toFixed(2)}%
                      </td>
                    </tr>
                  ))}

                  <tr style={{ background: "#f9fafb" }}>
                    <td style={{ fontWeight: 900 }}>{summaryRow.label}</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>
                      {summaryRow.spendTotal}
                    </td>
                    <td style={{ fontWeight: 900 }}>{summaryRow.revenueTotal}</td>
                    <td style={{ fontWeight: 900, color: "#16a34a" }}>
                      {summaryRow.profitTotal}
                    </td>
                    <td style={{ fontWeight: 900, color: "#16a34a" }}>
                      {summaryRow.roiAvg}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section
            style={{
              marginTop: 22,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 22,
            }}
            aria-label="Melhor e pior dia"
          >
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span aria-hidden="true" style={{ color: "#16a34a", fontWeight: 900 }}>
                  ↗
                </span>
                <div className="metricLabel">Melhor dia</div>
              </div>
              <div style={{ marginTop: 10, fontSize: 34, fontWeight: 900 }}>
                {bestDay.date}
              </div>
              <div className="muted" style={{ marginTop: 10, fontWeight: 800 }}>
                ROI: <span style={{ color: "#16a34a" }}>{bestDay.roi}</span>
              </div>
              <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
                Lucro: <span style={{ color: "#16a34a" }}>{bestDay.profit}</span>
              </div>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span aria-hidden="true" style={{ color: "#ef4444", fontWeight: 900 }}>
                  ↘
                </span>
                <div className="metricLabel">Pior dia</div>
              </div>
              <div style={{ marginTop: 10, fontSize: 34, fontWeight: 900 }}>
                {worstDay.date}
              </div>
              <div className="muted" style={{ marginTop: 10, fontWeight: 800 }}>
                ROI: <span style={{ color: "#ef4444" }}>{worstDay.roi}</span>
              </div>
              <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
                Lucro: <span style={{ fontWeight: 900 }}>{worstDay.profit}</span>
              </div>
            </div>
          </section>

          <section className="card" style={{ marginTop: 22, padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
              ROI ao longo do mês
            </h2>
            <RoiLineChart points={roiSeries} />
          </section>
        </div>
      </section>
    </>
  );
}
