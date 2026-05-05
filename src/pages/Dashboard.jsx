import Header from "../components/Header.jsx";
import ActionCard from "../components/ActionCard.jsx";
import CampaignCard from "../components/CampaignCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { useNavigate } from "react-router-dom";
import { mockCampaigns } from "../data/mockCampaigns.js";
import { mockCountries } from "../data/mockCountries.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const flagByCode = Object.fromEntries(
    mockCountries.map((c) => [c.code, c.flag]),
  );
  const campaign = mockCampaigns[0];

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
                { icon: "⚡", text: "Automação completa" },
                { icon: "🌐", text: "6 países simultâneos" },
              ]}
              buttonVariant="primary"
              buttonIcon="+"
              buttonText="Nova Campanha"
              onButtonClick={() => navigate("/nova-campanha")}
            />
            <ActionCard
              title="Financeiro & Relatórios"
              description="Acompanhe gastos, performance e métricas em tempo real"
              items={[
                { icon: "$", text: "Dados da Meta Ads API" },
                { icon: "📈", text: "Análises detalhadas" },
              ]}
              buttonVariant="secondary"
              buttonIcon="📊"
              buttonText="Ver Financeiro"
              onButtonClick={() => navigate("/financeiro")}
            />
            <ActionCard
              title="ROI - Dia Anterior"
              description="Decisões baseadas em lucro real - Escale ou desative"
              items={[
                { icon: "◎", text: "ROI por campanha" },
                { icon: "⚡", text: "Otimização 1 clique" },
              ]}
              buttonVariant="secondary"
              buttonIcon="◎"
              buttonText="Ver ROI (Ontem)"
              onButtonClick={() => navigate("/roi-ontem")}
            />
          </section>

          <div className="sectionTitleRow">
            <h2 className="sectionTitle">Suas Campanhas</h2>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" className="ghostButton">
                Filtrar
              </button>
              <button type="button" className="ghostButton">
                Ordenar
              </button>
            </div>
          </div>

          <section aria-label="Campanhas">
            <CampaignCard
              id={campaign.id}
              name={campaign.name}
              status={campaign.status}
              scopeLabel={campaign.scopeLabel}
              generatedLabel={campaign.generatedLabel}
              createdAtLabel={campaign.createdAtLabel}
              countryFlags={campaign.countryCodes.map((code) => flagByCode[code])}
            />
          </section>
        </div>
      </main>
    </>
  );
}
