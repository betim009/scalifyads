import JsonAccordion from "./JsonAccordion.jsx";

export default function GeneratedCampaignsSection({
  localGenerated,
  localLoading,
  localError,
  localErrorDetails,
  createdGeneratedCampaignId,
  refreshDisabled,
  onRefresh,
  onDismissError,
  selectDisabled,
  onSelect,
  onCopyIds,
  safeJson,
  countryCodeToFlag,
}) {
  return (
    <div id="meta-test-db" className="card" style={{ padding: 0, marginTop: 16 }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Persistência local (DB) — generated_campaigns</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Evidência de persistência de IDs/status Meta (Campaign/AdSet/Ad) no Postgres.
          </div>
        </div>
        <button
          type="button"
          className="pillOutline"
          onClick={onRefresh}
          disabled={refreshDisabled}
        >
          {localLoading ? "Atualizando..." : "Atualizar lista"}
        </button>
      </div>

      {localError ? (
        <div className="card" style={{ padding: 14, margin: "0 16px 16px", borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Erro</div>
            <button
              type="button"
              className="pillOutline"
              onClick={onDismissError}
              style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
            >
              Fechar
            </button>
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{localError}</div>
          <JsonAccordion title="Detalhes (erro DB)" value={localErrorDetails} safeJson={safeJson} />
        </div>
      ) : null}

      <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
        <table className="dataTable" style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th>Criado</th>
              <th>País</th>
              <th>Nome</th>
              <th>Modo</th>
              <th>Última ação</th>
              <th>OK</th>
              <th>Meta Campaign ID</th>
              <th>Status Meta</th>
              <th>Effective</th>
              <th>AdSet (Meta)</th>
              <th>Ad (Meta)</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {localGenerated.map((gc) => {
              const metaId = gc.meta_campaign_id || "";
              const mode =
                gc.meta_run_mode ||
                (metaId && String(metaId).startsWith("stub-") ? "STUB" : metaId ? "REAL" : "—");
              const isFocused = createdGeneratedCampaignId && gc.id === createdGeneratedCampaignId;
              return (
                <tr
                  key={gc.id}
                  style={
                    isFocused
                      ? { background: "#f0fdf4", outline: "1px solid #bbf7d0", outlineOffset: -1 }
                      : undefined
                  }
                >
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {gc.created_at ? String(gc.created_at).slice(0, 19).replace("T", " ") : "—"}
                  </td>
                  <td style={{ fontWeight: 900 }}>
                    {gc.country_code ? (
                      <>
                        <span aria-hidden="true" style={{ marginRight: 10 }}>
                          {countryCodeToFlag(gc.country_code)}
                        </span>
                        {gc.country_code}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ fontWeight: 900 }}>{gc.name || "—"}</td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {mode}
                  </td>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {gc.ops_last_action || "—"}
                  </td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {gc.ops_last_ok === true ? "SIM" : gc.ops_last_ok === false ? "NÃO" : "—"}
                  </td>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {gc.meta_campaign_id || "—"}
                  </td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {gc.meta_status || "—"}
                  </td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {gc.meta_effective_status || "—"}
                  </td>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    <div>{gc.meta_adset_id || "—"}</div>
                    <div style={{ marginTop: 4, fontWeight: 900 }}>
                      {(gc.meta_adset_status || "—") + " / " + (gc.meta_adset_effective_status || "—")}
                    </div>
                  </td>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    <div>{gc.meta_ad_id || "—"}</div>
                    <div style={{ marginTop: 4, fontWeight: 900 }}>
                      {(gc.meta_ad_status || "—") + " / " + (gc.meta_ad_effective_status || "—")}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="pillOutline"
                        onClick={() => onSelect(gc)}
                        disabled={selectDisabled}
                        style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
                      >
                        Selecionar
                      </button>
                      <button
                        type="button"
                        className="pillOutline"
                        onClick={() => onCopyIds(gc)}
                        disabled={!gc?.id}
                        style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
                      >
                        Copiar IDs
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!localGenerated.length ? (
              <tr>
                <td colSpan={12} className="muted" style={{ fontWeight: 800 }}>
                  {localLoading
                    ? "Carregando..."
                    : "Vazio. Clique em “Atualizar lista” ou crie Campaigns acima para gerar registros."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="muted" style={{ padding: 16, fontWeight: 800 }}>
        Nota: país local é aplicado no targeting do AdSet (geo_locations.countries).
      </div>
    </div>
  );
}
