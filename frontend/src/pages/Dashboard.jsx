import Header from "../components/Header.jsx";
import CampaignCard from "../components/CampaignCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import useCampaignFilters from "../mocks/useCampaignFilters.js";
import { useEffect, useMemo, useState } from "react";
import { getCountries } from "../services/reference.js";
import { listCampaigns } from "../services/campaigns.js";
import { listFlowTemplates } from "../services/flowTemplates.js";
import {
  FilterListIcon,
  SortIcon,
} from "../styles/icons.js";

export default function Dashboard() {
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
