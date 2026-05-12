export default function ShortcutsCard({ stepCampaignOk, stepAdSetOk, stepAdOk }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 900 }}>Atalhos</div>
      <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
        Navegação rápida para as seções principais (evita scroll longo).
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a className="pillOutline" href="#meta-test-mode">
          Modo
        </a>
        <a className="pillOutline" href="#meta-test-backend-status">
          Status backend
        </a>
        <a className="pillOutline" href="#meta-test-recovery">
          Recovery
        </a>
        <a className="pillOutline" href="#meta-test-db">
          DB (generated_campaigns)
        </a>
        <a className="pillOutline" href="#meta-test-db-structure">
          DB (estrutura)
        </a>
        <a className="pillOutline" href="#meta-test-creative-assets">
          Mídia
        </a>
        <a className="pillOutline" href="#meta-test-ops-logs">
          Logs
        </a>
        <a className="pillOutline" href="#meta-test-ops-logs-db">
          Logs (DB)
        </a>
        <a className="pillOutline" href="#meta-test-graph-refresh">
          Graph refresh
        </a>
        <a
          className="pillOutline"
          href="#meta-test-step-campaign"
          title="Etapa 1 concluída quando existe meta_campaign_id."
        >
          Etapa 1 (Campaign){" "}
          <span className="muted" style={{ fontWeight: 900 }}>
            {stepCampaignOk ? "OK" : "—"}
          </span>
        </a>
        <a
          className="pillOutline"
          href="#meta-test-step-adset"
          title="Etapa 2 concluída quando existe meta_adset_id."
        >
          Etapa 2 (AdSet){" "}
          <span className="muted" style={{ fontWeight: 900 }}>
            {stepAdSetOk ? "OK" : "—"}
          </span>
        </a>
        <a
          className="pillOutline"
          href="#meta-test-step-ad"
          title="Etapa 3 concluída quando existe meta_ad_id."
        >
          Etapa 3 (Ad){" "}
          <span className="muted" style={{ fontWeight: 900 }}>
            {stepAdOk ? "OK" : "—"}
          </span>
        </a>
      </div>
    </div>
  );
}
