export default function OpsLogsSection({
  opsLogs,
  filteredOpsLogs,
  opsLogsFilter,
  setOpsLogs,
  setOpsLogsFilter,
  safeJson,
  setError,
  setErrorDetails,
  setSuccess,
}) {
  return (
    <div id="meta-test-ops-logs" className="card" style={{ padding: 0, marginTop: 16 }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Logs operacionais (básico)</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Timeline local do navegador (sem token) para auditoria rápida do lab.
          </div>
          <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
            Mostrando <b>{filteredOpsLogs.length}</b> de <b>{opsLogs.length}</b> log(s).
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="pillOutline"
            onClick={() => {
              setOpsLogs([]);
              try {
                localStorage.removeItem("metaTest.opsLogs.v1");
              } catch {
                // ignore
              }
            }}
            disabled={!opsLogs.length}
          >
            Limpar
          </button>
          <button
            type="button"
            className="pillOutline"
            onClick={async () => {
              setError("");
              setErrorDetails(null);
              setSuccess("");
              const text = safeJson(filteredOpsLogs);
              try {
                await navigator.clipboard.writeText(text);
                setSuccess("Logs (filtro atual) copiados para a área de transferência.");
              } catch {
                setError("Não foi possível copiar os logs.");
                setErrorDetails(null);
              }
            }}
            disabled={!filteredOpsLogs.length}
          >
            Copiar JSON
          </button>
        </div>
      </div>

      <div style={{ padding: "0 16px 16px", display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "Todos" },
          { id: "campaign", label: "Campaign" },
          { id: "adset", label: "AdSet" },
          { id: "ad", label: "Ad" },
          { id: "meta", label: "Meta" },
          { id: "db", label: "DB" },
        ].map((opt) => {
          const active = opsLogsFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className="pillOutline"
              onClick={() => setOpsLogsFilter(opt.id)}
              style={{
                borderColor: active ? "#2563eb" : undefined,
                background: active ? "#dbeafe" : undefined,
                fontWeight: 900,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
        <table className="dataTable" style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Ação</th>
              <th>OK</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {filteredOpsLogs.map((l, idx) => (
              <tr key={`${l.at}-${idx}`}>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {l.at}
                </td>
                <td style={{ fontWeight: 900 }}>{l.action || "—"}</td>
                <td className="muted" style={{ fontWeight: 900 }}>
                  {l.ok ? "SIM" : "NÃO"}
                </td>
                <td className="muted" style={{ fontWeight: 800, maxWidth: 520 }}>
                  {l.ok
                    ? safeJson(l.details ?? null)
                    : `${l.error || "—"}${l.details ? `\n${safeJson(l.details)}` : ""}`}
                </td>
              </tr>
            ))}
            {!filteredOpsLogs.length ? (
              <tr>
                <td colSpan={4} className="muted" style={{ fontWeight: 800 }}>
                  {opsLogs.length ? "Vazio (filtro atual)." : "Vazio. Execute ações acima para gerar logs."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

