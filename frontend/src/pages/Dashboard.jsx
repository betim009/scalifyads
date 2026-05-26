import Header from "../components/Header.jsx";
import ActionCard from "../components/ActionCard.jsx";
import CampaignCard from "../components/CampaignCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { useNavigate } from "react-router-dom";
import { mockRoiOntem } from "../data/mockRoiOntem.js";
import useCampaignFilters from "../mocks/useCampaignFilters.js";
import { useEffect, useMemo, useState } from "react";
import { getCountries } from "../services/reference.js";
import { listCampaigns } from "../services/campaigns.js";
import {
  AddIcon,
  BarChartIcon,
  BoltIcon,
  FilterListIcon,
  LanguageIcon,
  PercentIcon,
  RocketLaunchIcon,
  SortIcon,
} from "../styles/icons.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [campaignsData, setCampaignsData] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.all([getCountries(), listCampaigns()])
      .then(([countriesRes, campaignsRes]) => {
        if (!alive) return;
        setCountries(countriesRes.countries ?? []);
        setCampaignsData(campaignsRes.campaigns ?? []);
      })
      .catch(() => {
        if (!alive) return;
        setCountries([]);
        setCampaignsData([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  const countriesCount = countries.length;
  const flagByCode = useMemo(
    () => Object.fromEntries(countries.map((c) => [c.code, c.flag])),
    [countries],
  );

  const { campaigns, statusFilter, sortMode, cycleStatus, cycleSort } =
    useCampaignFilters(campaignsData);

  const totals = {
    campaigns: campaignsData.length,
    published: campaignsData.filter((c) => c.status === "Publicado").length,
    drafts: campaignsData.filter((c) => c.status === "Rascunho").length,
  };

  return (
    <>
      <Header />
      <main className="page">
        <div className="container">
          <section className="gridMetrics" aria-label="Métricas">
            <MetricCard label="Total de campanhas" value={String(totals.campaigns)} />
            <MetricCard
              label="Campanhas ativas"
              value={String(totals.published)}
              valueTone="green"
              hint={
                <>
                  <span className="dotGreen" aria-hidden="true" />
                  Publicadas
                </>
              }
            />
            <MetricCard label="Rascunhos" value={String(totals.drafts)} />
            <MetricCard
              label="ROI (Ontem)"
              value={mockRoiOntem.summary.roiOverall}
              valueTone="green"
              hint={
                <span style={{ fontWeight: 700 }}>
                  Baseado em faturamento vs gasto
                </span>
              }
            />
            <MetricCard label="Países configurados" value={String(countriesCount)} />
          </section>

          <section className="gridActions" aria-label="Ações">
            <ActionCard
              title="Fluxo guiado Meta"
              description="Fluxo operacional limpo (guiado) — cria Campaign → AdSet → Creative → Ad"
              items={[
                { icon: <RocketLaunchIcon fontSize="small" />, text: "Sem payloads técnicos por padrão" },
                { icon: <BoltIcon fontSize="small" />, text: "REAL sempre PAUSED (guardrail)" },
              ]}
              buttonVariant="primary"
              buttonIcon={<RocketLaunchIcon fontSize="small" />}
              buttonText="Abrir fluxo guiado"
              onButtonClick={() => navigate("/campaign-flow")}
            />
            <ActionCard
              title="Console Meta (/meta-test)"
              description="Fluxo operacional progressivo (Campaign → AdSet → Ad) + troubleshooting sem expor token"
              items={[
                {
                  icon: <RocketLaunchIcon fontSize="small" />,
                  text: "Operação REAL/STUB (sempre PAUSED no REAL)",
                },
                { icon: <BoltIcon fontSize="small" />, text: "Graph + persistência + evidência operacional" },
              ]}
              buttonVariant="primary"
              buttonIcon={<RocketLaunchIcon fontSize="small" />}
              buttonText="Abrir /meta-test"
              onButtonClick={() => navigate("/meta-test")}
            />
            <ActionCard
              title="Criar Nova Campanha (Legado)"
              description="Fluxo legado de geração global (mantido por compatibilidade)"
              items={[
                { icon: <BoltIcon fontSize="small" />, text: "Automação completa" },
                {
                  icon: <LanguageIcon fontSize="small" />,
                  text: `${countriesCount} países simultâneos`,
                },
              ]}
              buttonVariant="secondary"
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
            <ActionCard
              title="ROI operacional (mínimo)"
              description="Gasto (Meta) + receita manual → lucro/prejuízo e ações seguras"
              items={[
                { icon: <PercentIcon fontSize="small" />, text: "Receita manual por campanha" },
                { icon: <BoltIcon fontSize="small" />, text: "Pausar negativos com confirmação" },
              ]}
              buttonVariant="secondary"
              buttonIcon={<PercentIcon fontSize="small" />}
              buttonText="Abrir ROI operacional"
              onButtonClick={() => navigate("/roi-operacional")}
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
                  generatedLabel={`${campaign.countryCodes.length} campanhas geradas`}
                  createdAtLabel={campaign.createdAtLabel}
                  countryFlags={campaign.countryCodes.map((code) => flagByCode[code] ?? code)}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
