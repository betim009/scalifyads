export default function ShortcutsCard({ stepCampaignOk, stepAdSetOk, stepAdOk }) {
  function ensureCollapsibleOpen(id) {
    try {
      const el = document.getElementById(id);
      const details = el?.getAttribute("data-collapsible-card") ? el.querySelector("details") : null;
      if (details && !details.open) details.open = true;
    } catch {
      // ignore
    }
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 900 }}>Atalhos</div>
      <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
        Navegação rápida para as seções principais (evita scroll longo).
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a className="pillOutline" href="#meta-test-mode" onClick={() => ensureCollapsibleOpen("meta-test-mode")}>
          Modo
        </a>
        <a
          className="pillOutline"
          href="#meta-test-backend-status"
          onClick={() => ensureCollapsibleOpen("meta-test-backend-status")}
        >
          Status backend
        </a>
        <a className="pillOutline" href="#meta-test-recovery" onClick={() => ensureCollapsibleOpen("meta-test-recovery")}>
          Recovery
        </a>
        <a className="pillOutline" href="#meta-test-db" onClick={() => ensureCollapsibleOpen("meta-test-db")}>
          DB (generated_campaigns)
        </a>
        <a
          className="pillOutline"
          href="#meta-test-db-structure"
          onClick={() => ensureCollapsibleOpen("meta-test-db-structure")}
        >
          DB (estrutura)
        </a>
        <a
          className="pillOutline"
          href="#meta-test-campaign-templates"
          onClick={() => ensureCollapsibleOpen("meta-test-campaign-templates")}
        >
          Templates (Campaign)
        </a>
        <a
          className="pillOutline"
          href="#meta-test-creative-assets"
          onClick={() => ensureCollapsibleOpen("meta-test-creative-assets")}
        >
          Mídia
        </a>
        <a
          className="pillOutline"
          href="#meta-test-creative-drafts"
          onClick={() => ensureCollapsibleOpen("meta-test-creative-drafts")}
        >
          Creative
        </a>
        <a className="pillOutline" href="#meta-test-ops-logs" onClick={() => ensureCollapsibleOpen("meta-test-ops-logs")}>
          Logs
        </a>
        <a
          className="pillOutline"
          href="#meta-test-ops-logs-db"
          onClick={() => ensureCollapsibleOpen("meta-test-ops-logs-db")}
        >
          Logs (DB)
        </a>
        <a
          className="pillOutline"
          href="#meta-test-graph-refresh"
          onClick={() => ensureCollapsibleOpen("meta-test-graph-refresh")}
        >
          Graph refresh
        </a>
        <a className="pillOutline" href="#meta-test-batch" onClick={() => ensureCollapsibleOpen("meta-test-batch")}>
          Batch
        </a>
        <a
          className="pillOutline"
          href="#meta-test-paused-meta-campaigns"
          onClick={() => ensureCollapsibleOpen("meta-test-paused-meta-campaigns")}
        >
          Meta PAUSED
        </a>
        <a
          className="pillOutline"
          href="#meta-test-step-campaign"
          title="Etapa 1 concluída quando existe meta_campaign_id."
          onClick={() => ensureCollapsibleOpen("meta-test-step-campaign")}
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
          onClick={() => ensureCollapsibleOpen("meta-test-step-adset")}
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
          onClick={() => ensureCollapsibleOpen("meta-test-step-ad")}
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
