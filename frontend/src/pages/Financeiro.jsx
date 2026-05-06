import ExportButton from "../components/ExportButton.jsx";
import FinanceMetricCard from "../components/FinanceMetricCard.jsx";
import PeriodPills from "../components/PeriodPills.jsx";
import SelectLike from "../components/SelectLike.jsx";
import SpendLineChart from "../components/SpendLineChart.jsx";
import { mockFinancial } from "../data/mockFinancial.js";
import { mockCountries } from "../data/mockCountries.js";
import PageShell from "../components/PageShell.jsx";
import usePeriodFilter from "../mocks/usePeriodFilter.js";
import { useState } from "react";
import {
  AdsClickIcon,
  AttachMoneyIcon,
  BarChartIcon,
  CircleIcon,
  DescriptionIcon,
  LightbulbOutlinedIcon,
  MouseIcon,
  PauseCircleOutlineIcon,
  TrendingUpIcon,
  VisibilityIcon,
} from "../styles/icons.js";

export default function Financeiro() {
  const { filters, periods } = mockFinancial;
  const [account, setAccount] = useState(filters.account);
  const [businessManager, setBusinessManager] = useState(filters.businessManager);
  const { activePeriod, setActivePeriod, options, data } = usePeriodFilter({
    options: filters.periodOptions,
    initial: filters.activePeriod,
    dataByPeriod: periods,
  });
  const metrics = data?.metrics ?? {};
  const spendSeries = data?.spendSeries ?? [];
  const tableRows = data?.tableRows ?? [];
  const flagByCode = Object.fromEntries(
    mockCountries.map((c) => [c.code, c.flag]),
  );

  return (
    <PageShell
      title="Financeiro"
      subtitle="Acompanhe os gastos e performance das campanhas"
      backFallbackTo="/mensal"
    >
      <div className="card filtersCard">
            <div className="filtersGrid">
              <SelectLike
                label="Conta de anúncio"
                value={account}
                options={filters.accountOptions}
                onChange={(e) => setAccount(e.target.value)}
              />
              <SelectLike
                label="Business Manager"
                value={businessManager}
                options={filters.businessManagerOptions}
                onChange={(e) => setBusinessManager(e.target.value)}
              />
              <PeriodPills
                label="Período"
                options={options}
                active={activePeriod}
                onChange={setActivePeriod}
              />
            </div>
      </div>

      <section className="gridFinanceMetrics" aria-label="Métricas financeiras">
            <FinanceMetricCard
              badgeBg="#dcfce7"
              badgeColor="#16a34a"
              badgeText={<AttachMoneyIcon fontSize="small" />}
              topRight={<TrendingUpIcon fontSize="small" style={{ color: "#22c55e" }} />}
              value={metrics.spendTotal}
              labelIcon={<AttachMoneyIcon fontSize="small" />}
              label="Gasto Total"
            />
            <FinanceMetricCard
              badgeBg="#dbeafe"
              badgeColor="#2563eb"
              badgeText={<TrendingUpIcon fontSize="small" />}
              value={metrics.cpm}
              labelIcon={<BarChartIcon fontSize="small" />}
              label="CPM Médio"
            />
            <FinanceMetricCard
              badgeBg="#ede9fe"
              badgeColor="#7c3aed"
              badgeText={<TrendingUpIcon fontSize="small" style={{ transform: "rotate(-45deg)" }} />}
              value={metrics.clicks}
              labelIcon={<AdsClickIcon fontSize="small" />}
              label="Cliques Totais"
            />
            <FinanceMetricCard
              badgeBg="#ffedd5"
              badgeColor="#f97316"
              badgeText={<VisibilityIcon fontSize="small" />}
              value={metrics.impressions}
              labelIcon={<VisibilityIcon fontSize="small" />}
              label="Impressões"
            />
            <FinanceMetricCard
              badgeBg="#fce7f3"
              badgeColor="#db2777"
              badgeText={<MouseIcon fontSize="small" />}
              value={metrics.cpc}
              labelIcon={<MouseIcon fontSize="small" />}
              label="CPC Médio"
            />
      </section>

      <section className="card chartCard" aria-label="Gráfico de Gastos">
            <div className="chartHeaderRow">
              <div>
                <div className="chartTitleRow">
                  <CircleIcon fontSize="small" style={{ color: "#7c3aed" }} />
                  <h2 className="chartTitle">Gráfico de Gastos</h2>
                </div>
                <p className="chartSubtitle">Evolução diária dos gastos</p>
              </div>
              <a className="chartLink" href="#" onClick={(e) => e.preventDefault()}>
                <DescriptionIcon fontSize="small" />
                Ver relatório completo
              </a>
            </div>

            <SpendLineChart points={spendSeries} />

            <div className="tipBox" role="note">
              <LightbulbOutlinedIcon fontSize="small" />
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
                  <CircleIcon fontSize="small" style={{ color: "#facc15" }} />
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
                            <CircleIcon fontSize="small" style={{ fontSize: 10 }} /> Ativo
                          </span>
                        ) : (
                          <span className="statusPillYellow">
                            <PauseCircleOutlineIcon fontSize="small" /> Pausado
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
