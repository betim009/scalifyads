import Header from "../components/Header.jsx";
import ActionCard from "../components/ActionCard.jsx";
import CampaignCard from "../components/CampaignCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { useNavigate } from "react-router-dom";
import { mockCampaigns } from "../data/mockCampaigns.js";
import { mockCountries } from "../data/mockCountries.js";
import useCampaignFilters from "../mocks/useCampaignFilters.js";
import {
  AddIcon,
  BarChartIcon,
  BoltIcon,
  FilterListIcon,
  LanguageIcon,
  PercentIcon,
  SortIcon,
} from "../styles/icons.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const flagByCode = Object.fromEntries(
    mockCountries.map((c) => [c.code, c.flag]),
  );
  const { campaigns, statusFilter, sortMode, cycleStatus, cycleSort } =
    useCampaignFilters(mockCampaigns);

  return (
    <>
      <Header />
      <main className="page">
        <div className="container">
          <section className="gridMetrics" aria-label="Métricas">
            <MetricCard label="Total de campanhas" value="1" />
            <MetricCard
              label="Campanhas ativas"
              value="1"
              valueTone="green"
              hint={
                <>
                  <span className="dotGreen" aria-hidden="true" />
                  Publicadas
                </>
              }
            />
            <MetricCard label="Rascunhos" value="0" />
            <MetricCard
              label="ROI (Ontem)"
              value="132%"
              valueTone="green"
              hint={
                <span style={{ fontWeight: 700 }}>
                  Baseado em faturamento vs gasto
                </span>
              }
            />
            <MetricCard label="Países configurados" value="6" />
          </section>

          <section className="gridActions" aria-label="Ações">
            <ActionCard
              title="Criar Nova Campanha"
              description="Crie campanhas globais em minutos com automação inteligente"
              items={[
                { icon: <BoltIcon fontSize="small" />, text: "Automação completa" },
                { icon: <LanguageIcon fontSize="small" />, text: "6 países simultâneos" },
              ]}
              buttonVariant="primary"
              buttonIcon={<AddIcon fontSize="small" />}
              buttonText="Nova Campanha"
              onButtonClick={() => navigate("/nova-campanha")}
            />
            <ActionCard
              title="Financeiro & Relatórios"
              description="Acompanhe gastos, performance e métricas em tempo real"
              items={[
                { icon: <BarChartIcon fontSize="small" />, text: "Dados da Meta Ads API" },
                { icon: <BarChartIcon fontSize="small" />, text: "Análises detalhadas" },
              ]}
              buttonVariant="secondary"
              buttonIcon={<BarChartIcon fontSize="small" />}
              buttonText="Ver Financeiro"
              onButtonClick={() => navigate("/financeiro")}
            />
            <ActionCard
              title="ROI - Dia Anterior"
              description="Decisões baseadas em lucro real - Escale ou desative"
              items={[
                { icon: <PercentIcon fontSize="small" />, text: "ROI por campanha" },
                { icon: <BoltIcon fontSize="small" />, text: "Otimização 1 clique" },
              ]}
              buttonVariant="secondary"
              buttonIcon={<PercentIcon fontSize="small" />}
              buttonText="Ver ROI (Ontem)"
              onButtonClick={() => navigate("/roi-ontem")}
            />
          </section>

          <div className="sectionTitleRow">
            <h2 className="sectionTitle">Suas Campanhas</h2>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" className="ghostButton" onClick={cycleStatus}>
                <FilterListIcon fontSize="small" />
                <span title={`Filtro: ${statusFilter}`}>Filtrar</span>
              </button>
              <button type="button" className="ghostButton" onClick={cycleSort}>
                <SortIcon fontSize="small" />
                <span title={`Ordenação: ${sortMode}`}>Ordenar</span>
              </button>
            </div>
          </div>

          <section aria-label="Campanhas">
            <div style={{ display: "grid", gap: 16 }}>
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  id={campaign.id}
                  name={campaign.name}
                  status={campaign.status}
                  scopeLabel={campaign.scopeLabel}
                  generatedLabel={campaign.generatedLabel}
                  createdAtLabel={campaign.createdAtLabel}
                  countryFlags={campaign.countryCodes.map((code) => flagByCode[code])}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
