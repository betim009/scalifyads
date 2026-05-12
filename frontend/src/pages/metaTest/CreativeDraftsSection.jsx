export default function CreativeDraftsSection({
  generatedCampaignId,
  assets,
  drafts,
  loading,
  error,
  errorDetails,
  refreshDisabled,
  onRefresh,
  createDisabled,
  onCreate,
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
}) {
  return (
    <div id="meta-test-creative-drafts" className="card" style={{ padding: 0, marginTop: 16 }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Creative drafts (local)</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Persistência de copy/headline/description + asset vinculado (sem Meta ainda).
          </div>
          <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
            `generated_campaign_id`: <b>{generatedCampaignId || "—"}</b>
          </div>
        </div>
        <button type="button" className="pillOutline" onClick={onRefresh} disabled={refreshDisabled}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
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
              <th>Asset</th>
              <th>Headline</th>
              <th>Status</th>
              <th>Meta creative</th>
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
              </tr>
            ))}
            {!drafts.length && !loading ? (
              <tr>
                <td colSpan={6} className="muted" style={{ fontWeight: 800 }}>
                  Vazio. Crie um draft acima.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

