import JsonAccordion from "./JsonAccordion.jsx";
import { useMemo, useState } from "react";

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
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("all"); // all | REAL | STUB | none
  const totalCount = Array.isArray(localGenerated) ? localGenerated.length : 0;

  const viewRows = useMemo(() => {
    let list = Array.isArray(localGenerated) ? localGenerated : [];

    const q = String(query || "").trim().toLowerCase();
    const wantMode = String(modeFilter || "all");

    function inferMode(gc) {
      const metaId = gc?.meta_campaign_id || "";
      return (
        gc?.meta_run_mode ||
        (metaId && String(metaId).startsWith("stub-") ? "STUB" : metaId ? "REAL" : "—")
      );
    }

    if (wantMode !== "all") {
      list = list.filter((gc) => {
        const m = inferMode(gc);
        if (wantMode === "none") return m === "—";
        return m === wantMode;
      });
    }

    if (!q) return list;

    return list.filter((gc) => {
      const hay = [
        gc?.id,
        gc?.name,
        gc?.country_code,
        gc?.meta_run_mode,
        gc?.ops_last_action,
        gc?.meta_campaign_id,
        gc?.meta_status,
        gc?.meta_effective_status,
        gc?.meta_adset_id,
        gc?.meta_ad_id,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      return hay.some((v) => v.includes(q));
    });
  }, [localGenerated, query, modeFilter]);

  return (
    <div id="meta-test-db" className="card" style={{ padding: 0, marginTop: 16 }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Persistência local (DB) — generated_campaigns</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Evidência de persistência de IDs/status Meta (Campaign/AdSet/Ad) no Postgres.
          </div>
          <div className="muted" style={{ marginTop: 8, fontWeight: 900 }}>
            Mostrando <b>{viewRows.length}</b> de <b>{totalCount}</b>.
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

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              Modo
            </span>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 900,
                outline: "none",
                background: "#ffffff",
              }}
            >
              <option value="all">Todos</option>
              <option value="REAL">REAL</option>
              <option value="STUB">STUB</option>
              <option value="none">Sem meta_campaign_id</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 280, flex: 1 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              Buscar
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: nome, país, stub-, act_, meta.status..."
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 700,
                outline: "none",
                background: "#ffffff",
              }}
            />
          </label>

          <button
            type="button"
            className="pillOutline"
            onClick={() => {
              setModeFilter("all");
              setQuery("");
            }}
            disabled={modeFilter === "all" && !query}
          >
            Limpar filtros
          </button>
        </div>
      </div>

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
            {viewRows.map((gc) => {
              const metaId = gc.meta_campaign_id || "";
              const mode =
                gc.meta_run_mode ||
                (metaId && String(metaId).startsWith("stub-") ? "STUB" : metaId ? "REAL" : "—");
              const modeStyle =
                mode === "REAL"
                  ? { background: "#dcfce7", borderColor: "#bbf7d0" }
                  : mode === "STUB"
                    ? { background: "#fef3c7", borderColor: "#fde68a" }
                    : { background: "#f3f4f6", borderColor: "#e5e7eb" };
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
                    <span
                      className="pillOutline"
                      style={{
                        ...modeStyle,
                        padding: "4px 10px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontWeight: 900,
                        color: "#111827",
                      }}
                    >
                      {mode}
                    </span>
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
            {!viewRows.length ? (
              <tr>
                <td colSpan={12} className="muted" style={{ fontWeight: 800 }}>
                  {totalCount
                    ? "Vazio (filtros atuais)."
                    : localLoading
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
