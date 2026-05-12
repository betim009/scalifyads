import { useMemo, useState } from "react";

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
  const [statusFilter, setStatusFilter] = useState("all"); // all | ok | error
  const [query, setQuery] = useState("");

  const viewLogs = useMemo(() => {
    let list = Array.isArray(filteredOpsLogs) ? filteredOpsLogs : [];

    if (statusFilter === "ok") list = list.filter((l) => Boolean(l?.ok));
    if (statusFilter === "error") list = list.filter((l) => !l?.ok);

    const q = String(query || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((l) => {
      try {
        return JSON.stringify(l).toLowerCase().includes(q);
      } catch {
        return false;
      }
    });
  }, [filteredOpsLogs, statusFilter, query]);

  return (
    <div id="meta-test-ops-logs" className="card" style={{ padding: 0, marginTop: 16 }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Logs operacionais (básico)</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Timeline local do navegador (sem token) para auditoria rápida do lab.
          </div>
          <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
            Mostrando <b>{viewLogs.length}</b> de <b>{opsLogs.length}</b> log(s).
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
              const text = safeJson(viewLogs);
              try {
                await navigator.clipboard.writeText(text);
                setSuccess("Logs (filtro atual) copiados para a área de transferência.");
              } catch {
                setError("Não foi possível copiar os logs.");
                setErrorDetails(null);
              }
            }}
            disabled={!viewLogs.length}
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

      <div style={{ padding: "0 16px 16px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            <option value="ok">Somente OK</option>
            <option value="error">Somente erros</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, minWidth: 280, flex: 1 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Buscar
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: meta.validate, stub-, act_..."
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
            setStatusFilter("all");
            setQuery("");
          }}
          disabled={statusFilter === "all" && !query}
        >
          Limpar filtros
        </button>
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
            {viewLogs.map((l, idx) => (
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
            {!viewLogs.length ? (
              <tr>
                <td colSpan={4} className="muted" style={{ fontWeight: 800 }}>
                  {opsLogs.length ? "Vazio (filtros atuais)." : "Vazio. Execute ações acima para gerar logs."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
