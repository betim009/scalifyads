export default function StepAdSection({
  createdMetaAdSetId,
  adName,
  setAdName,
  adCreativeId,
  setAdCreativeId,
  canCreateAd,
  adCreating,
  onCreateAd,
  createdGeneratedCampaignId,
  flowMode,
  normalizeNonEmptyString,
}) {
  return (
    <div id="meta-test-step-ad" className="card" style={{ padding: 18, marginTop: 16 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>Etapa 3 — Ad (PAUSED)</div>
      <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
        Criação incremental via `POST /api/meta/ads` (REAL/STUB). Sempre PAUSED. REAL requer `creativeId` existente.
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Meta AdSet ID (origem)
          </span>
          <input
            value={createdMetaAdSetId}
            readOnly
            placeholder="Será preenchido quando AdSet existir"
            style={{
              height: 38,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 800,
              outline: "none",
              background: "#f9fafb",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Nome do Ad
          </span>
          <input
            value={adName}
            onChange={(e) => setAdName(e.target.value)}
            placeholder="Ex: Ad BR — Image 1"
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
          <span className="muted" style={{ fontWeight: 900 }}>
            Creative ID (somente REAL)
          </span>
          <input
            value={adCreativeId}
            onChange={(e) => setAdCreativeId(e.target.value)}
            placeholder="Ex: 1234567890"
            disabled={flowMode === "STUB"}
            style={{
              height: 38,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 700,
              outline: "none",
              background: flowMode === "STUB" ? "#f9fafb" : "#ffffff",
            }}
          />
        </label>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="pillOutline" disabled={!canCreateAd} onClick={onCreateAd}>
          {adCreating ? "Criando..." : `Criar Ad ${flowMode} (PAUSED)`}
        </button>
        <div className="muted" style={{ fontWeight: 800 }}>
          Requer AdSet criado acima. REAL exige token no backend e `creativeId`.
        </div>
      </div>

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 900 }}>Preview do payload</summary>
        <pre
          style={{
            marginTop: 10,
            background: "#0b1220",
            color: "#e5e7eb",
            padding: 12,
            borderRadius: 12,
            overflowX: "auto",
          }}
        >
{JSON.stringify(
  {
    generatedCampaignId: createdGeneratedCampaignId || null,
    name: normalizeNonEmptyString(adName) || null,
    creativeId: flowMode === "REAL" ? normalizeNonEmptyString(adCreativeId) || null : undefined,
    mode: flowMode,
  },
  null,
  2,
)}
        </pre>
      </details>
    </div>
  );
}

