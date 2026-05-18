export default function LatestExecutionsCard({
  opsLogs,
  dbOpsLogs,
  dbOpsLogsLoading,
  refreshDbOpsLogs,
}) {
  const localList = Array.isArray(opsLogs) ? opsLogs : [];
  const dbList = Array.isArray(dbOpsLogs) ? dbOpsLogs : [];
  const localLatest = localList.slice(0, 8);
  const dbLatest = dbList.slice(0, 8);

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
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>Últimas execuções</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            className="pillOutline"
            href="#meta-test-ops-logs"
            onClick={() => ensureCollapsibleOpen("meta-test-ops-logs")}
          >
            Ver logs
          </a>
          <button
            type="button"
            className="pillOutline"
            onClick={refreshDbOpsLogs}
            disabled={dbOpsLogsLoading}
            title="Atualiza logs persistidos (DB) para evidência operacional."
          >
            {dbOpsLogsLoading ? "Atualizando..." : "Atualizar DB"}
          </button>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
        Resumo rápido das últimas ações (Local + DB quando disponível).
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Local
            </div>
            <div className="muted" style={{ fontWeight: 900 }}>
              {localLatest.length}/{localList.length}
            </div>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {localLatest.map((l, idx) => (
              <div key={`${l?.at ?? "at"}-${idx}`} style={{ display: "grid", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    className="pillOutline"
                    style={{
                      padding: "4px 10px",
                      background: l?.ok ? "#dcfce7" : "#fee2e2",
                      borderColor: l?.ok ? "#bbf7d0" : "#fecaca",
                      color: "#111827",
                      fontWeight: 900,
                    }}
                  >
                    {l?.ok ? "OK" : "ERRO"}
                  </span>
                  <span style={{ fontWeight: 900 }}>{l?.action || "—"}</span>
                </div>
                <div className="muted" style={{ fontWeight: 800 }}>
                  {l?.at || "—"}
                </div>
              </div>
            ))}
            {!localLatest.length ? (
              <div className="muted" style={{ fontWeight: 800 }}>
                Vazio. Execute ações no fluxo acima para gerar logs.
              </div>
            ) : null}
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              DB
            </div>
            <a
              className="muted"
              href="#meta-test-ops-logs-db"
              onClick={() => ensureCollapsibleOpen("meta-test-ops-logs-db")}
              style={{ fontWeight: 900, textDecoration: "none" }}
              title="Abre a seção de logs persistidos."
            >
              {dbLatest.length}/{dbList.length}
            </a>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {dbLatest.map((l) => (
              <div key={l?.id} style={{ display: "grid", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    className="pillOutline"
                    style={{
                      padding: "4px 10px",
                      background: l?.ok ? "#dcfce7" : "#fee2e2",
                      borderColor: l?.ok ? "#bbf7d0" : "#fecaca",
                      color: "#111827",
                      fontWeight: 900,
                    }}
                  >
                    {l?.ok ? "OK" : "ERRO"}
                  </span>
                  <span style={{ fontWeight: 900 }}>{(l?.entity || "—") + "." + (l?.action || "—")}</span>
                </div>
                <div className="muted" style={{ fontWeight: 800 }}>
                  {l?.created_at ? String(l.created_at).slice(0, 19).replace("T", " ") : "—"}
                </div>
              </div>
            ))}
            {!dbLatest.length && !dbOpsLogsLoading ? (
              <div className="muted" style={{ fontWeight: 800 }}>
                Vazio. Clique em “Atualizar DB” ou use a seção “Logs (DB)”.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

