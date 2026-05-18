export default function ModeStatusCard({
  runModeLabel,
  dataModeLabel,
  metaReadyLabel,
  dbModeLabel,
  syncProviderLabel,
  backendStatusLoading,
  hasPageId,
  hasInstagramActorId,
}) {
  const pageIdLabel = backendStatusLoading ? "LOADING" : hasPageId ? "OK" : "MISSING";
  const instagramActorLabel = backendStatusLoading ? "LOADING" : hasInstagramActorId ? "OK" : "—";

  return (
    <div id="meta-test-mode" className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 900 }}>Modo atual</div>
      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 900,
            border: "1px solid #e5e7eb",
            background: runModeLabel === "REAL" ? "#dcfce7" : "#fef3c7",
            color: "#111827",
          }}
        >
          RUN MODE: {runModeLabel}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 900,
            border: "1px solid #e5e7eb",
            background:
              dataModeLabel === "LOADING" ? "#f3f4f6" : dataModeLabel === "FALLBACK" ? "#fee2e2" : "#dbeafe",
            color: "#111827",
          }}
        >
          DATA: {dataModeLabel}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 900,
            border: "1px solid #e5e7eb",
            background:
              metaReadyLabel === "LOADING" ? "#f3f4f6" : metaReadyLabel === "REAL" ? "#dcfce7" : "#fef3c7",
            color: "#111827",
          }}
        >
          META READY: {metaReadyLabel}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 900,
            border: "1px solid #e5e7eb",
            background:
              pageIdLabel === "LOADING" ? "#f3f4f6" : pageIdLabel === "OK" ? "#dcfce7" : "#fee2e2",
            color: "#111827",
          }}
          title={
            pageIdLabel === "LOADING"
              ? "Carregando status do backend..."
              : pageIdLabel === "OK"
              ? "META_PAGE_ID presente no backend (ou pode ser enviado no UI)."
              : "META_PAGE_ID ausente: publish de Creative REAL exige pageId."
          }
        >
          PAGE ID: {pageIdLabel}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 900,
            border: "1px solid #e5e7eb",
            background: instagramActorLabel === "LOADING" ? "#f3f4f6" : instagramActorLabel === "OK" ? "#dcfce7" : "#f3f4f6",
            color: "#111827",
          }}
          title={
            instagramActorLabel === "LOADING"
              ? "Carregando status do backend..."
              : instagramActorLabel === "OK"
              ? "META_INSTAGRAM_ACTOR_ID presente no backend."
              : "Opcional: pode ser enviado no UI quando necessário."
          }
        >
          IG ACTOR: {instagramActorLabel}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 900,
            border: "1px solid #e5e7eb",
            background: dbModeLabel === "LOADING" ? "#f3f4f6" : dbModeLabel === "FALLBACK" ? "#fee2e2" : "#dbeafe",
            color: "#111827",
          }}
          title={
            dbModeLabel === "LOADING"
              ? "Carregando lista de generated_campaigns..."
              : dbModeLabel === "FALLBACK"
              ? "DB/API indisponível (lista de generated_campaigns falhou)."
              : "DB/API OK (lista de generated_campaigns carregou)."
          }
        >
          DB: {dbModeLabel}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 900,
            border: "1px solid #e5e7eb",
            background:
              syncProviderLabel === "LOADING" ? "#f3f4f6" : syncProviderLabel === "meta" ? "#dcfce7" : "#fef3c7",
            color: "#111827",
          }}
          title="Valor reportado pelo backend em /api/meta/status (META_SYNC_PROVIDER)."
        >
          SYNC: {syncProviderLabel}
        </span>
      </div>
      <div className="muted" style={{ marginTop: 10, fontWeight: 800, lineHeight: 1.55 }}>
        - <b>RUN MODE</b>: define se a criação chama Meta (REAL) ou cria `stub-*` (STUB).<br />
        - <b>DATA</b>: indica se a UI está usando API ou FALLBACK.<br />
        - <b>META READY</b>: depende de token presente no backend.
        <br />- <b>PAGE ID</b>: indica se `META_PAGE_ID` está configurado no backend (ou será informado no UI).
        <br />- <b>IG ACTOR</b>: indica se `META_INSTAGRAM_ACTOR_ID` está configurado (opcional).
        <br />- <b>DB</b>: indica se a UI conseguiu ler `generated_campaigns` (API/DB) para evidenciar persistência.
        <br />- <b>SYNC</b>: provider configurado no backend (`META_SYNC_PROVIDER`).
      </div>
    </div>
  );
}
