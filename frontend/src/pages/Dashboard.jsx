import Header from "../components/Header.jsx";
import CampaignCard from "../components/CampaignCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { useNavigate } from "react-router-dom";
import useCampaignFilters from "../mocks/useCampaignFilters.js";
import { useEffect, useMemo, useState } from "react";
import { getCountries } from "../services/reference.js";
import { listCampaigns } from "../services/campaigns.js";
import { listFlowTemplates } from "../services/flowTemplates.js";
import {
  FilterListIcon,
  RocketLaunchIcon,
  SortIcon,
} from "../styles/icons.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [campaignsData, setCampaignsData] = useState([]);
  const [templatesCount, setTemplatesCount] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getCountries(), listCampaigns(), listFlowTemplates({ limit: 500 }).catch(() => null)])
      .then(([countriesRes, campaignsRes, templatesRes]) => {
        if (!alive) return;
        setCountries(countriesRes.countries ?? []);
        setCampaignsData(campaignsRes.campaigns ?? []);
        setTemplatesCount(templatesRes?.flowTemplates ? templatesRes.flowTemplates.length : null);
      })
      .catch(() => {
        if (!alive) return;
        setCountries([]);
        setCampaignsData([]);
        setTemplatesCount(null);
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
          <section className="card" style={{ padding: 22, marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Entrada operacional</h2>
                <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontWeight: 400, color: "var(--text-secondary)" }}>
                  Próximo passo recomendado: abrir o fluxo de campanha e criar tudo como{" "}
                  <span style={{ fontWeight: 500 }}>PAUSED</span> no REAL.
                </p>
              </div>
              <button type="button" className="pillPrimary" onClick={() => navigate("/campaign-flow")}>
                <RocketLaunchIcon fontSize="small" /> Abrir fluxo de campanha
              </button>
            </div>

            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
                <div style={{ fontWeight: 500, color: "var(--text-secondary)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Fluxo recomendado
                </div>
                <ol style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--text)", fontWeight: 400 }}>
                  <li>Configurar perfil e contas Meta</li>
                  <li>Criar/gerenciar templates</li>
                  <li>Executar no fluxo de campanha</li>
                  <li>Acompanhar ROI operacional</li>
                  <li>Usar diagnóstico só se der erro</li>
                </ol>
              </div>

              <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
                <div style={{ fontWeight: 500, color: "var(--text-secondary)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Acessos rápidos
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" className="pillOutline" onClick={() => navigate("/templates")}>Templates</button>
                  <button type="button" className="pillOutline" onClick={() => navigate("/roi-operacional")}>ROI operacional</button>
                  <button type="button" className="pillOutline" onClick={() => navigate("/profile")}>Perfil</button>
                  <button
                    type="button"
                    className="pillGhost"
                    onClick={() => navigate("/meta-test")}
                    title="Área técnica/diagnóstico"
                  >
                    Diagnóstico técnico
                  </button>
                </div>
              </div>
            </div>
          </section>

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
            <MetricCard label="Templates" value={templatesCount === null ? "—" : String(templatesCount)} />
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
