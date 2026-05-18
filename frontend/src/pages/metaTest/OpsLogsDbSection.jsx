import CollapsibleCard from "./CollapsibleCard.jsx";
import JsonAccordion from "./JsonAccordion.jsx";
import { useMemo, useState } from "react";
import { copyTextToClipboard } from "./metaTestUtils.js";

export default function OpsLogsDbSection({
  loading,
  error,
  errorDetails,
  opsLogs,
  refreshDisabled,
  onRefresh,
  onDismissError,
  safeJson,
}) {
  const [compactMode, setCompactMode] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | ok | error
  const [query, setQuery] = useState("");

  const viewLogs = useMemo(() => {
    let list = Array.isArray(opsLogs) ? opsLogs : [];

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
  }, [opsLogs, statusFilter, query]);

  return (
    <CollapsibleCard
      id="meta-test-ops-logs-db"
      title="Logs persistidos (DB) — ops_logs"
      description={
        <>
          Evidência de persistência operacional (source: <b>meta-test</b>).
        </>
      }
      meta={
        <>
          {loading ? (
            "Carregando..."
          ) : (
            <>
              Mostrando <b>{viewLogs.length}</b> de <b>{opsLogs.length}</b> log(s).
            </>
          )}
        </>
      }
      defaultOpen={false}
      headerRight={
        <>
          <button
            type="button"
            className="pillOutline"
            onClick={() => setCompactMode((v) => !v)}
            style={{
              borderColor: compactMode ? "#2563eb" : undefined,
              background: compactMode ? "#dbeafe" : undefined,
              fontWeight: 900,
            }}
          >
            Compacto: {compactMode ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            className="pillOutline"
            onClick={async () => {
              setCopyStatus("");
              const text = safeJson(viewLogs ?? []);
              try {
                await copyTextToClipboard(text);
                setCopyStatus("Copiado.");
              } catch {
                setCopyStatus("Falha ao copiar.");
              } finally {
                window.setTimeout(() => setCopyStatus(""), 3500);
              }
            }}
            disabled={!viewLogs.length}
          >
            Copiar JSON
          </button>
          <button type="button" className="pillOutline" onClick={onRefresh} disabled={refreshDisabled}>
            {loading ? "Atualizando..." : "Atualizar do DB"}
          </button>
        </>
      }
    >

      {copyStatus ? (
        <div className="muted" style={{ marginTop: 12, fontWeight: 900 }}>
          {copyStatus}
        </div>
      ) : null}

      {error ? (
        <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
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
          <div style={{ marginTop: 6, fontWeight: 700 }}>{error}</div>
          <JsonAccordion title="Detalhes (erro DB)" value={errorDetails} safeJson={safeJson} />
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
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
            placeholder="Ex: meta.*, db.*, 1885183..."
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
        <table className="dataTable" style={{ marginTop: 0, fontSize: compactMode ? 12 : undefined }}>
          <thead>
            <tr>
              <th>Quando (DB)</th>
              <th>Entity</th>
              <th>Ação</th>
              <th>OK</th>
              <th>Erro</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {viewLogs.map((l) => (
              <tr key={l.id}>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {l.created_at ? String(l.created_at).slice(0, 19).replace("T", " ") : "—"}
                </td>
                <td className="muted" style={{ fontWeight: 900 }}>{l.entity || "—"}</td>
                <td style={{ fontWeight: 900 }}>{l.action || "—"}</td>
                <td className="muted" style={{ fontWeight: 900 }}>{l.ok ? "SIM" : "NÃO"}</td>
                <td className="muted" style={{ fontWeight: 800 }}>{l.error || "—"}</td>
                <td className="muted" style={{ fontWeight: 800, maxWidth: 520 }}>
                  {compactMode ? (
                    <details>
                      <summary style={{ cursor: "pointer", fontWeight: 900 }}>Ver detalhes</summary>
                      <pre style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{safeJson(l.details ?? null)}</pre>
                    </details>
                  ) : (
                    safeJson(l.details ?? null)
                  )}
                </td>
              </tr>
            ))}
            {!viewLogs.length && !loading ? (
              <tr>
                <td colSpan={6} className="muted" style={{ fontWeight: 800 }}>
                  {opsLogs.length ? "Vazio (filtros atuais)." : "Vazio. Execute ações no `/meta-test` e clique em “Atualizar do DB”."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </CollapsibleCard>
  );
}
