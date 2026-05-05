import ExportButton from "../components/ExportButton.jsx";
import FinanceMetricCard from "../components/FinanceMetricCard.jsx";
import PeriodPills from "../components/PeriodPills.jsx";
import SelectLike from "../components/SelectLike.jsx";
import SpendLineChart from "../components/SpendLineChart.jsx";
import { mockFinancial } from "../data/mockFinancial.js";
import { mockCountries } from "../data/mockCountries.js";
import PageShell from "../components/PageShell.jsx";

export default function Financeiro() {
  const { filters, metrics, spendSeries, tableRows } = mockFinancial;
  const flagByCode = Object.fromEntries(
    mockCountries.map((c) => [c.code, c.flag]),
  );

  return (
    <PageShell
      title="Financeiro"
      subtitle="Acompanhe os gastos e performance das campanhas"
      backFallbackTo="/mensal"
      titleStyle={{ fontSize: 56 }}
    >
      <div className="card filtersCard">
            <div className="filtersGrid">
              <SelectLike label="Conta de anúncio" value={filters.account} />
              <SelectLike label="Business Manager" value={filters.businessManager} />
              <PeriodPills
                label="Período"
                options={filters.periodOptions}
                active={filters.activePeriod}
              />
            </div>
      </div>

      <section className="gridFinanceMetrics" aria-label="Métricas financeiras">
            <FinanceMetricCard
              badgeBg="#dcfce7"
              badgeColor="#16a34a"
              badgeText="$"
              topRight="↗"
              value={metrics.spendTotal}
              labelIcon="💰"
              label="Gasto Total"
            />
            <FinanceMetricCard
              badgeBg="#dbeafe"
              badgeColor="#2563eb"
              badgeText="↗"
              value={metrics.cpm}
              labelIcon="📊"
              label="CPM Médio"
            />
            <FinanceMetricCard
              badgeBg="#ede9fe"
              badgeColor="#7c3aed"
              badgeText="↖"
              value={metrics.clicks}
              labelIcon="🖱"
              label="Cliques Totais"
            />
            <FinanceMetricCard
              badgeBg="#ffedd5"
              badgeColor="#f97316"
              badgeText="👁"
              value={metrics.impressions}
              labelIcon="👁"
              label="Impressões"
            />
            <FinanceMetricCard
              badgeBg="#fce7f3"
              badgeColor="#db2777"
              badgeText="↗"
              value={metrics.cpc}
              labelIcon="📉"
              label="CPC Médio"
            />
      </section>

      <section className="card chartCard" aria-label="Gráfico de Gastos">
            <div className="chartHeaderRow">
              <div>
                <div className="chartTitleRow">
                  <span aria-hidden="true" style={{ color: "#7c3aed", fontSize: 22 }}>
                    ●
                  </span>
                  <h2 className="chartTitle">Gráfico de Gastos</h2>
                </div>
                <p className="chartSubtitle">Evolução diária dos gastos</p>
              </div>
              <a className="chartLink" href="#" onClick={(e) => e.preventDefault()}>
                <span aria-hidden="true">📄</span> Ver relatório completo
              </a>
            </div>

            <SpendLineChart points={spendSeries} />

            <div className="tipBox" role="note">
              <span aria-hidden="true">💡</span>
              <span>
                <span style={{ fontWeight: 900 }}>Dica:</span> Os dados são puxados
                automaticamente da Meta Ads API em tempo real
              </span>
            </div>
      </section>

      <section className="card tableCard" aria-label="Detalhamento por Campanha">
            <div className="tableHeaderRow">
              <div>
                <div className="chartTitleRow">
                  <span aria-hidden="true" style={{ color: "#facc15", fontSize: 22 }}>
                    ●
                  </span>
                  <h2 className="chartTitle">Detalhamento por Campanha</h2>
                </div>
                <p className="chartSubtitle">Performance detalhada de cada país</p>
              </div>
              <div className="exportButtons" aria-label="Exportar">
                <ExportButton>CSV</ExportButton>
                <ExportButton>Excel</ExportButton>
                <ExportButton>PDF</ExportButton>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Campanha</th>
                    <th>País</th>
                    <th>Gasto</th>
                    <th>Impressões</th>
                    <th>Cliques</th>
                    <th>CPC</th>
                    <th>CPM</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr key={`${r.countryCode}-${r.status}`}>
                      <td style={{ fontWeight: 900 }}>{r.campaign}</td>
                      <td>
                        <span className="countryCell">
                          <span aria-hidden="true">
                            {flagByCode[r.countryCode]}
                          </span>
                          {r.country}
                        </span>
                      </td>
                      <td style={{ fontWeight: 900 }}>{r.spend}</td>
                      <td className="muted" style={{ fontWeight: 800 }}>
                        {r.impressions}
                      </td>
                      <td className="muted" style={{ fontWeight: 800 }}>
                        {r.clicks}
                      </td>
                      <td className="muted" style={{ fontWeight: 800 }}>
                        {r.cpc}
                      </td>
                      <td className="muted" style={{ fontWeight: 800 }}>
                        {r.cpm}
                      </td>
                      <td>
                        {r.status === "Ativo" ? (
                          <span className="statusPillGreen">
                            <span aria-hidden="true">●</span> Ativo
                          </span>
                        ) : (
                          <span className="statusPillYellow">
                            <span aria-hidden="true">⏸</span> Pausado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      </section>
    </PageShell>
  );
}
