import Header from "../components/Header.jsx";
import ActionCard from "../components/ActionCard.jsx";
import CampaignCard from "../components/CampaignCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { useNavigate } from "react-router-dom";
import useCampaignFilters from "../mocks/useCampaignFilters.js";
import { useEffect, useMemo, useState } from "react";
import { getCountries } from "../services/reference.js";
import { listCampaigns } from "../services/campaigns.js";
import {
  BoltIcon,
  DescriptionIcon,
  FilterListIcon,
  LanguageIcon,
  PercentIcon,
  PersonOutlineIcon,
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
            <MetricCard label="Países configurados" value={String(countriesCount)} />
          </section>

          <section className="gridActions" aria-label="Ações">
            <ActionCard
              title="Fluxo de campanha"
              description="Fluxo operacional guiado — cria Campaign → AdSet → Creative → Ads (sempre PAUSED no REAL)"
              items={[
                { icon: <RocketLaunchIcon fontSize="small" />, text: "Operação REAL com guardrails" },
                { icon: <BoltIcon fontSize="small" />, text: "Sem expor detalhes técnicos por padrão" },
              ]}
              buttonVariant="primary"
              buttonIcon={<RocketLaunchIcon fontSize="small" />}
              buttonText="Abrir fluxo de campanha"
              onButtonClick={() => navigate("/campaign-flow")}
            />
            <ActionCard
              title="Templates"
              description="Gerencie templates operacionais para usar no fluxo de campanha"
              items={[
                { icon: <DescriptionIcon fontSize="small" />, text: "Campos mínimos e variações A–E por país" },
                { icon: <RocketLaunchIcon fontSize="small" />, text: "Aplicar no fluxo guiado com 1 clique" },
              ]}
              buttonVariant="secondary"
              buttonIcon={<DescriptionIcon fontSize="small" />}
              buttonText="Abrir Templates"
              onButtonClick={() => navigate("/templates")}
            />
            <ActionCard
              title="Perfil e credenciais"
              description="Configure credenciais Meta e países operacionais do seu usuário"
              items={[
                { icon: <PersonOutlineIcon fontSize="small" />, text: "Credenciais por usuário (token nunca é exibido)" },
                { icon: <LanguageIcon fontSize="small" />, text: "Países e idioma primário por país" },
              ]}
              buttonVariant="secondary"
              buttonIcon={<PersonOutlineIcon fontSize="small" />}
              buttonText="Abrir Perfil"
              onButtonClick={() => navigate("/profile")}
            />
            <ActionCard
              title="ROI operacional"
              description="Gasto (Meta) + receita manual → lucro/prejuízo e ações seguras"
              items={[
                { icon: <PercentIcon fontSize="small" />, text: "Receita manual por campanha" },
                { icon: <BoltIcon fontSize="small" />, text: "Ações seguras e confirmadas" },
              ]}
              buttonVariant="secondary"
              buttonIcon={<PercentIcon fontSize="small" />}
              buttonText="Abrir ROI operacional"
              onButtonClick={() => navigate("/roi-operacional")}
            />
            <ActionCard
              title="Diagnóstico técnico"
              description="Área técnica para troubleshooting e validação (não é fluxo principal)"
              items={[
                { icon: <RocketLaunchIcon fontSize="small" />, text: "Verificar status, logs e evidências" },
                { icon: <BoltIcon fontSize="small" />, text: "Manter operação REAL sempre PAUSED" },
              ]}
              buttonVariant="secondary"
              buttonIcon={<BoltIcon fontSize="small" />}
              buttonText="Abrir diagnóstico"
              onButtonClick={() => navigate("/meta-test")}
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
