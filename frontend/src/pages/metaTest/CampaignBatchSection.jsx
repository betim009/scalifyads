import { useMemo, useState } from "react";
import CollapsibleCard from "./CollapsibleCard.jsx";

export default function CampaignBatchSection({
  isBusy,
  countriesSource,
  countryOptions,
  countryCodeToFlag,
  backendHasAccessToken,
  name,
  objective,
  adAccountNormalized,
  createMetaCampaignSimple,
  refreshBackendStatus,
  refreshLocalGenerated,
  pushLog,
  setError,
  setErrorDetails,
  setSuccess,
}) {
  const [batchMode, setBatchMode] = useState("REAL");
  const [selectedCountryCodes, setSelectedCountryCodes] = useState([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [batchErrors, setBatchErrors] = useState([]);

  const canBatch = useMemo(() => {
    return (
      !isBusy &&
      !batchRunning &&
      Boolean(name?.trim()) &&
      Boolean(objective?.trim()) &&
      Boolean(adAccountNormalized?.trim()) &&
      selectedCountryCodes.length > 0 &&
      countriesSource !== "fallback" &&
      (batchMode === "STUB" || Boolean(backendHasAccessToken))
    );
  }, [
    adAccountNormalized,
    backendHasAccessToken,
    batchMode,
    batchRunning,
    countriesSource,
    isBusy,
    name,
    objective,
    selectedCountryCodes.length,
  ]);

  async function runBatch() {
    pushLog({
      action: "campaign.batch.start",
      ok: true,
      details: { mode: batchMode, countries: selectedCountryCodes.slice(), total: selectedCountryCodes.length },
    });
    setBatchRunning(true);
    setBatchProgress(null);
    setBatchResults([]);
    setBatchErrors([]);
    setError("");
    setErrorDetails(null);
    setSuccess("");

    const total = selectedCountryCodes.length;
    const results = [];
    const errors = [];

    try {
      for (let i = 0; i < selectedCountryCodes.length; i += 1) {
        const code = selectedCountryCodes[i];
        setBatchProgress({ current: i + 1, total, countryCode: code });

        try {
          const res = await createMetaCampaignSimple({
            name: name.trim(),
            objective,
            metaAdAccountId: adAccountNormalized,
            countryCode: code,
            mode: batchMode,
          });
          pushLog({
            action: "campaign.create.simple",
            ok: true,
            details: {
              mode: res.mode ?? batchMode,
              countryCode: code,
              metaCampaignId: res?.metaCampaign?.id ?? null,
              generatedCampaignId: res?.generatedCampaign?.id ?? null,
            },
          });
          results.push({
            countryCode: code,
            mode: res.mode ?? batchMode,
            metaCampaignId: res?.metaCampaign?.id ?? null,
            status: res?.metaCampaign?.status ?? null,
            effectiveStatus: res?.metaCampaign?.effective_status ?? null,
            generatedCampaignId: res?.generatedCampaign?.id ?? null,
          });
        } catch (err) {
          const captured = {
            message: err?.message ? String(err.message) : "error",
            details: err?.body?.error?.details ?? err?.body ?? null,
          };
          pushLog({
            action: "campaign.create.simple",
            ok: false,
            error: captured.message,
            details: { mode: batchMode, countryCode: code, errorDetails: captured.details },
          });
          errors.push({
            countryCode: code,
            message: captured.message || "Falha ao criar Campaign.",
          });
        }
      }

      setBatchResults(results);
      setBatchErrors(errors);
      pushLog({
        action: "campaign.batch.done",
        ok: true,
        details: { okCount: results.length, errorCount: errors.length },
      });
      setSuccess(`Batch concluído: ${results.length} sucesso(s) / ${errors.length} erro(s). Todas as Campaigns permanecem PAUSED.`);
      await refreshBackendStatus();
      await refreshLocalGenerated();
    } finally {
      setBatchRunning(false);
      setBatchProgress(null);
    }
  }

  return (
    <CollapsibleCard
      id="meta-test-batch"
      title="Batch — Campaign por país"
      description="Gera Campaigns independentes por país (todas nascem `PAUSED`)."
      defaultOpen={false}
      headerRight={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="pillOutline"
            onClick={() => setSelectedCountryCodes(countryOptions.map((c) => c.code))}
            disabled={isBusy || batchRunning || !countryOptions.length}
          >
            Selecionar todos
          </button>
          <button
            type="button"
            className="pillOutline"
            onClick={() => setSelectedCountryCodes([])}
            disabled={isBusy || batchRunning || selectedCountryCodes.length === 0}
          >
            Limpar
          </button>
        </div>
      }
    >
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Modo (batch)
          </span>
          <select
            value={batchMode}
            onChange={(e) => setBatchMode(e.target.value)}
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

        <button type="button" className="pillOutline" disabled={!canBatch} onClick={runBatch}>
          {batchRunning ? "Gerando..." : "Gerar Campaigns por país (PAUSED)"}
        </button>

        {!backendHasAccessToken && batchMode === "REAL" ? (
          <div className="muted" style={{ fontWeight: 800 }}>
            Token ausente no backend → batch REAL indisponível (mude para STUB ou configure token).
          </div>
        ) : null}
        {countriesSource === "fallback" ? (
          <div className="muted" style={{ fontWeight: 800 }}>
            DATA=FALLBACK → DB/API provavelmente indisponível; batch desabilitado.
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="muted" style={{ fontWeight: 900, marginBottom: 8 }}>
          Países selecionados ({selectedCountryCodes.length})
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {countryOptions.map((c) => {
            const active = selectedCountryCodes.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                className="pillOutline"
                disabled={batchRunning}
                onClick={() => {
                  setSelectedCountryCodes((prev) => {
                    const has = prev.includes(c.code);
                    if (has) return prev.filter((x) => x !== c.code);
                    return [...prev, c.code];
                  });
                }}
                style={{
                  borderColor: active ? "#2563eb" : undefined,
                  background: active ? "#dbeafe" : undefined,
                  fontWeight: 900,
                }}
              >
                {countryCodeToFlag(c.code)} {c.code}
              </button>
            );
          })}
        </div>
      </div>

      {batchProgress ? (
        <div className="card" style={{ padding: 14, marginTop: 12 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            Progresso
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {batchProgress.current}/{batchProgress.total} — {batchProgress.countryCode}
          </div>
        </div>
      ) : null}

      {batchErrors.length ? (
        <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ fontWeight: 900 }}>Erros ({batchErrors.length})</div>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {batchErrors.slice(0, 8).map((e) => (
              <div key={e.countryCode} style={{ fontWeight: 800 }}>
                {e.countryCode}: {e.message}
              </div>
            ))}
            {batchErrors.length > 8 ? (
              <div className="muted" style={{ fontWeight: 800 }}>
                +{batchErrors.length - 8} erro(s) ocultos…
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {batchResults.length ? (
        <div className="card" style={{ padding: 0, marginTop: 12 }}>
          <div style={{ padding: 14 }}>
            <div style={{ fontWeight: 900 }}>Resultados ({batchResults.length})</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              Evidência de criação + IDs (Meta + DB).
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
            <table className="dataTable" style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th>País</th>
                  <th>Modo</th>
                  <th>Meta Campaign ID</th>
                  <th>Status</th>
                  <th>Effective</th>
                  <th>Generated ID</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.map((r) => (
                  <tr key={`${r.countryCode}-${r.generatedCampaignId}`}>
                    <td style={{ fontWeight: 900 }}>
                      {countryCodeToFlag(r.countryCode)} {r.countryCode}
                    </td>
                    <td className="muted" style={{ fontWeight: 900 }}>
                      {r.mode}
                    </td>
                    <td className="muted" style={{ fontWeight: 800 }}>
                      {r.metaCampaignId || "—"}
                    </td>
                    <td className="muted" style={{ fontWeight: 900 }}>
                      {r.status || "—"}
                    </td>
                    <td className="muted" style={{ fontWeight: 900 }}>
                      {r.effectiveStatus || "—"}
                    </td>
                    <td className="muted" style={{ fontWeight: 800 }}>
                      {r.generatedCampaignId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </CollapsibleCard>
  );
}
