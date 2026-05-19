import { useState } from "react";
import JsonAccordion from "./JsonAccordion.jsx";

export default function CampaignTemplatesSection({
  generatedCampaignId,
  loading,
  error,
  errorDetails,
  templates,
  refreshDisabled,
  createFromGeneratedDisabled,
  createFromGeneratedLoading,
  deleteDisabled,
  deleteLoadingId,
  onRefresh,
  onCreateFromGenerated,
  onDelete,
  onDismissError,
  safeJson,
}) {
  const [nameOverride, setNameOverride] = useState("");

  return (
    <div id="meta-test-campaign-templates" className="card" style={{ padding: 0, marginTop: 16 }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Campaign Templates (DB)</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Salva a estrutura base (Campaign → AdSet → Ad) a partir de uma `generated_campaign`.
          </div>
        </div>
        <button type="button" className="pillOutline" onClick={onRefresh} disabled={refreshDisabled}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900 }}>Criar a partir do selecionado</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Requer DB e um registro selecionado em `generated_campaigns`.
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <input
              value={nameOverride}
              onChange={(e) => setNameOverride(e.target.value)}
              placeholder="Nome do template (opcional)"
              disabled={createFromGeneratedDisabled || createFromGeneratedLoading || !generatedCampaignId}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="pillOutline"
                disabled={createFromGeneratedDisabled || createFromGeneratedLoading || !generatedCampaignId}
                onClick={async () => {
                  await onCreateFromGenerated?.({
                    name: String(nameOverride || "").trim() || null,
                  });
                  setNameOverride("");
                }}
              >
                {createFromGeneratedLoading ? "Salvando..." : "Salvar template"}
              </button>
              <button
                type="button"
                className="pillOutline"
                disabled={createFromGeneratedDisabled || createFromGeneratedLoading || !nameOverride}
                onClick={() => setNameOverride("")}
              >
                Limpar
              </button>
            </div>
          </div>
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
          <JsonAccordion title="Detalhes" value={errorDetails} safeJson={safeJson} />
        </div>
      ) : null}

      <div style={{ padding: "0 16px 16px" }}>
        {templates?.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {templates.slice(0, 50).map((t) => (
              <div key={t.id} className="card" style={{ padding: 12 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900 }}>{t.name || "template"}</div>
                  <div className="muted" style={{ fontWeight: 800 }}>
                    {t.created_at ? String(t.created_at).slice(0, 19).replace("T", " ") : "—"}
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="pillOutline"
                    disabled={deleteDisabled || !t?.id || deleteLoadingId === t.id}
                    onClick={() => onDelete?.(t)}
                  >
                    {deleteLoadingId === t.id ? "Removendo..." : "Remover"}
                  </button>
                </div>
                <JsonAccordion title="Payload" value={t.payload} safeJson={safeJson} />
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ fontWeight: 800 }}>
            Vazio.
          </div>
        )}
      </div>
    </div>
  );
}
