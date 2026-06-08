import { getBackendBaseUrl } from "../../services/http.js";
import CollapsibleCard from "./CollapsibleCard.jsx";
import JsonAccordion from "./JsonAccordion.jsx";
import { useState } from "react";

export default function CreativeDraftsSection({
  generatedCampaignId,
  assets,
  drafts,
  templates,
  templatesLoading,
  templatesError,
  templatesErrorDetails,
  loading,
  error,
  errorDetails,
  refreshDisabled,
  onRefresh,
  refreshTemplatesDisabled,
  onRefreshTemplates,
  createDisabled,
  onCreate,
  templateBusy,
  onSaveTemplateFromDraft,
  onApplyTemplate,
  onDeleteTemplate,
  onDismissError,
  safeJson,
  draftAssetId,
  setDraftAssetId,
  primaryText,
  setPrimaryText,
  headline,
  setHeadline,
  description,
  setDescription,
  ctaType,
  setCtaType,
  destinationUrl,
  setDestinationUrl,
  onDuplicate,
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const baseUrl = getBackendBaseUrl();
  const selectedAsset = (assets ?? []).find((a) => a.id === draftAssetId) ?? null;
  const selectedAssetUrl = selectedAsset?.url ? `${baseUrl}${selectedAsset.url}` : null;
  const templateList = Array.isArray(templates) ? templates : [];

  return (
    <CollapsibleCard
      id="meta-test-creative-drafts"
      title="Creative drafts (local)"
      description="Persistência de copy/headline/description + asset vinculado (publicação Meta opcional na Etapa 3)."
      meta={
        <>
          `generated_campaign_id`: <b>{generatedCampaignId || "—"}</b>
        </>
      }
      defaultOpen={false}
      headerRight={
        <button type="button" className="pillOutline" onClick={onRefresh} disabled={refreshDisabled}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      }
    >
      <div>
        <div className="muted" style={{ fontWeight: 800 }}>
          Crie um draft depois de selecionar um registro em `generated_campaigns`.
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>Asset (opcional)</span>
            <select
              value={draftAssetId || ""}
              onChange={(e) => setDraftAssetId(e.target.value || "")}
              disabled={createDisabled}
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 800,
                outline: "none",
                background: "#ffffff",
              }}
            >
              <option value="">(sem asset)</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.original_name || a.stored_name || a.id).slice(0, 80)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>Headline (opcional)</span>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Ex: Oferta por tempo limitado"
              disabled={createDisabled}
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

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>Descrição (opcional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Frete grátis hoje"
              disabled={createDisabled}
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

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>CTA type (opcional)</span>
            <input
              value={ctaType}
              onChange={(e) => setCtaType(e.target.value)}
              placeholder="Ex: SHOP_NOW"
              disabled={createDisabled}
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

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>Destination URL (opcional)</span>
            <input
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://..."
              disabled={createDisabled}
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
        </div>

        <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
          <span className="muted" style={{ fontWeight: 900 }}>Primary text (opcional)</span>
          <textarea
            value={primaryText}
            onChange={(e) => setPrimaryText(e.target.value)}
            rows={3}
            placeholder="Texto principal do anúncio..."
            disabled={createDisabled}
            style={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: 12,
              fontSize: 13,
              fontWeight: 700,
              outline: "none",
              background: "#ffffff",
              resize: "vertical",
            }}
          />
        </label>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="pillOutline" disabled={createDisabled} onClick={onCreate}>
            Criar draft
          </button>
          <div className="muted" style={{ fontWeight: 800 }}>
            Requer seleção de `generated_campaigns`.
          </div>
        </div>

        <div className="card" style={{ padding: 14, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Templates (copy/creative)
            </div>
            <button
              type="button"
              className="pillOutline"
              onClick={onRefreshTemplates}
              disabled={refreshTemplatesDisabled}
              style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
            >
              {templatesLoading ? "Atualizando..." : "Atualizar templates"}
            </button>
          </div>

          {templatesError ? (
            <div className="card" style={{ padding: 12, marginTop: 10, borderColor: "#fecaca", color: "#991b1b" }}>
              <div style={{ fontWeight: 900 }}>Erro</div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>{templatesError}</div>
              <JsonAccordion title="Detalhes (erro templates)" value={templatesErrorDetails} safeJson={safeJson} />
            </div>
          ) : null}

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 260 }}>
              <span className="muted" style={{ fontWeight: 900 }}>
                Selecionar template
              </span>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={refreshTemplatesDisabled}
                style={{
                  height: 38,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 12px",
                  fontSize: 13,
                  fontWeight: 800,
                  outline: "none",
                  background: "#ffffff",
                }}
              >
                <option value="">(selecione)</option>
                {templateList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {(t.name || t.id).slice(0, 80)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="pillOutline"
              onClick={() => onApplyTemplate(selectedTemplateId)}
              disabled={!selectedTemplateId || createDisabled || templateBusy}
            >
              Aplicar (criar draft)
            </button>

            <button
              type="button"
              className="pillOutline"
              onClick={() => {
                if (!selectedTemplateId) return;
                onDeleteTemplate?.(selectedTemplateId);
                setSelectedTemplateId("");
              }}
              disabled={!selectedTemplateId || createDisabled || templateBusy}
            >
              Remover template
            </button>

            <div className="muted" style={{ fontWeight: 800 }}>
              Dica: use “Salvar template” na tabela de drafts abaixo.
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 14, marginTop: 12 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            Preview (operacional)
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <div className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ fontWeight: 900 }}>Mídia</div>
              <div style={{ marginTop: 10 }}>
                {selectedAssetUrl ? (
                  <img
                    src={selectedAssetUrl}
                    alt={selectedAsset?.original_name || selectedAsset?.stored_name || "asset"}
                    style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                ) : (
                  <div className="muted" style={{ fontWeight: 800 }}>—</div>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ fontWeight: 900 }}>Texto</div>
              <div style={{ marginTop: 8, fontWeight: 900 }}>{headline || "—"}</div>
              <div className="muted" style={{ marginTop: 8, fontWeight: 800, whiteSpace: "pre-wrap" }}>
                {primaryText || "—"}
              </div>
              <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
                {description ? `Descrição: ${description}` : "Descrição: —"}
              </div>
              <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
                {ctaType ? `CTA: ${ctaType}` : "CTA: —"}
              </div>
              <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
                {destinationUrl ? `URL: ${destinationUrl}` : "URL: —"}
              </div>
            </div>
          </div>
        </div>
      </div>

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
          <JsonAccordion title="Detalhes (erro drafts)" value={errorDetails} safeJson={safeJson} />
        </div>
      ) : null}

      <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
        <table className="dataTable" style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th>Criado</th>
              <th>ID</th>
              <th>Asset</th>
              <th>Headline</th>
              <th>Status local</th>
              <th>Meta creative</th>
              <th>Meta status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d.id}>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {d.created_at ? String(d.created_at).slice(0, 19).replace("T", " ") : "—"}
                </td>
                <td className="muted" style={{ fontWeight: 800 }}>{d.id}</td>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {d.asset_original_name || d.asset_stored_name || d.creative_asset_id || "—"}
                </td>
                <td style={{ fontWeight: 900 }}>{d.headline || "—"}</td>
                <td className="muted" style={{ fontWeight: 900 }}>{d.status || "—"}</td>
                <td className="muted" style={{ fontWeight: 800 }}>{d.meta_creative_id || "—"}</td>
                <td className="muted" style={{ fontWeight: 900 }}>{d.meta_status || "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="pillOutline"
                      onClick={() => onDuplicate(d.id)}
                      disabled={templateBusy}
                      style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="pillOutline"
                      onClick={() => onSaveTemplateFromDraft(d.id)}
                      disabled={templateBusy}
                      style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
                    >
                      Salvar template
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!drafts.length && !loading ? (
              <tr>
                <td colSpan={8} className="muted" style={{ fontWeight: 800 }}>
                  Vazio. Crie um draft acima.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </CollapsibleCard>
  );
}
