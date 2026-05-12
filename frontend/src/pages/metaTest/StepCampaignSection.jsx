export default function StepCampaignSection({
  refresh,
  refreshDisabled,
  refreshLoading,
  dataModeLabel,
  name,
  setName,
  metaAdAccountId,
  setMetaAdAccountId,
  adAccountNormalized,
  normalizeNonEmptyString,
  countryCode,
  setCountryCode,
  countryOptions,
  objective,
  setObjective,
  objectiveOptions,
  mode,
  setMode,
  canCreate,
  campaignCreating,
  onCreateCampaign,
  canListPaused,
  metaLoading,
  onListPaused,
  stepCampaignOk,
  onScrollToAdSetStep,
  backendHasAccessToken,
  metaError,
  metaErrorDetails,
  onDismissMetaError,
  safeJson,
}) {
  return (
    <div id="meta-test-step-campaign" className="card" style={{ padding: 18, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Etapa 1 — Campaign (mínimo)</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Nome + Objective + Ad Account + País.
          </div>
        </div>
        <button type="button" className="pillOutline" onClick={refresh} disabled={refreshDisabled}>
          {refreshLoading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div className="muted" style={{ marginTop: 10, fontWeight: 800 }}>
        Fonte países: <span style={{ fontWeight: 900 }}>{dataModeLabel}</span>
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
            Nome
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Lançamento Produto X"
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
            Meta Ad Account ID (formato `act_...`)
          </span>
          <input
            value={metaAdAccountId}
            onChange={(e) => setMetaAdAccountId(e.target.value)}
            placeholder="act_259174718403969"
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
          {normalizeNonEmptyString(metaAdAccountId) && !adAccountNormalized ? (
            <span className="muted" style={{ fontWeight: 800, color: "#991b1b" }}>
              Formato inválido. Use `act_` + dígitos (ex: `act_123...`).
            </span>
          ) : null}
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            País
          </span>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
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
            {countryOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
            {!countryOptions.length ? <option value="">(sem países)</option> : null}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Objective
          </span>
          <select
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
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
            {objectiveOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Modo
          </span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
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
            <option value="REAL">REAL</option>
            <option value="STUB">STUB</option>
          </select>
        </label>

        <button type="button" className="pillOutline" disabled={!canCreate} onClick={onCreateCampaign}>
          {campaignCreating ? "Criando..." : `Criar Campaign ${mode} (PAUSED)`}
        </button>

        <button type="button" className="pillOutline" disabled={!canListPaused} onClick={onListPaused}>
          {metaLoading ? "Listando..." : "Listar PAUSED na Meta"}
        </button>

        <button
          type="button"
          className="pillOutline"
          disabled={!stepCampaignOk}
          onClick={onScrollToAdSetStep}
          title={stepCampaignOk ? "Ir para criação de AdSet" : "Crie/Selecione uma Campaign primeiro"}
        >
          Ir para Etapa 2
        </button>

        {!backendHasAccessToken ? (
          <div className="muted" style={{ fontWeight: 800 }}>
            Token ausente no backend → operações REAL indisponíveis (use STUB ou configure token).
          </div>
        ) : null}
      </div>

      {metaError ? (
        <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Erro (Meta)</div>
            <button
              type="button"
              className="pillOutline"
              onClick={onDismissMetaError}
              style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
            >
              Fechar
            </button>
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{metaError}</div>
          {metaErrorDetails ? (
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
{safeJson(metaErrorDetails)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
