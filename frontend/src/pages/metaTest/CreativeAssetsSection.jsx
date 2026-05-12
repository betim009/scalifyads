export default function CreativeAssetsSection({
  loading,
  error,
  errorDetails,
  assets,
  onRefresh,
  refreshDisabled,
  onDismissError,
  onUpload,
  uploadDisabled,
  safeJson,
}) {
  return (
    <div id="meta-test-creative-assets" className="card" style={{ padding: 0, marginTop: 16 }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Mídia (dev) — upload local</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Upload via backend + persistência no Postgres. Não cria Creative na Meta (ainda).
          </div>
          <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
            {loading ? "Carregando..." : `${assets.length} asset(s)`}
          </div>
        </div>
        <button type="button" className="pillOutline" onClick={onRefresh} disabled={refreshDisabled}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div style={{ padding: "0 16px 16px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Arquivo
          </span>
          <input type="file" onChange={(e) => onUpload(e.target.files?.[0] ?? null)} disabled={uploadDisabled} />
        </label>
        <div className="muted" style={{ fontWeight: 800 }}>
          Dica: use arquivos pequenos (dev). O backend limita em 15MB.
        </div>
      </div>

      {error ? (
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
          <div style={{ marginTop: 6, fontWeight: 700 }}>{error}</div>
          {errorDetails ? (
            <pre
              style={{
                marginTop: 12,
                background: "#0b1220",
                color: "#e5e7eb",
                padding: 12,
                borderRadius: 12,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
{safeJson(errorDetails)}
            </pre>
          ) : null}
        </div>
      ) : null}

      <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
        <table className="dataTable" style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th>Criado</th>
              <th>ID</th>
              <th>Nome</th>
              <th>MIME</th>
              <th>Tamanho</th>
              <th>URL</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {a.created_at ? String(a.created_at).slice(0, 19).replace("T", " ") : "—"}
                </td>
                <td className="muted" style={{ fontWeight: 800 }}>{a.id}</td>
                <td style={{ fontWeight: 900 }}>{a.original_name || a.stored_name || "—"}</td>
                <td className="muted" style={{ fontWeight: 800 }}>{a.mime_type || "—"}</td>
                <td className="muted" style={{ fontWeight: 800 }}>{typeof a.size_bytes === "number" ? a.size_bytes : "—"}</td>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {a.url || "—"}
                </td>
                <td>
                  <button
                    type="button"
                    className="pillOutline"
                    disabled={!a.url}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(String(a.url || ""));
                      } catch {
                        // ignore
                      }
                    }}
                    style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
                  >
                    Copiar URL
                  </button>
                </td>
              </tr>
            ))}
            {!assets.length && !loading ? (
              <tr>
                <td colSpan={7} className="muted" style={{ fontWeight: 800 }}>
                  Vazio. Faça upload acima para criar um asset.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

