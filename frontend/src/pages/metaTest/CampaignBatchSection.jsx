import { useEffect, useMemo, useState } from "react";
import CollapsibleCard from "./CollapsibleCard.jsx";
import { copyTextToClipboard, extractErrorDetails, safeJson } from "./metaTestUtils.js";
import { createCountryTemplate, deleteCountryTemplate, listCountryTemplates } from "../../services/countryTemplates.js";

const COUNTRY_TEMPLATES_KEY = "metaTest.countryTemplates.v1";

function loadCountryTemplates() {
  try {
    const raw = localStorage.getItem(COUNTRY_TEMPLATES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCountryTemplates(next) {
  try {
    localStorage.setItem(COUNTRY_TEMPLATES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function newTemplateId() {
  try {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `tpl-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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
  const [countryTemplates, setCountryTemplates] = useState(() => loadCountryTemplates());
  const [countryTemplatesSource, setCountryTemplatesSource] = useState("local");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
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
            details: extractErrorDetails(err),
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

  const selectedTemplate = useMemo(
    () => countryTemplates.find((t) => t?.id === selectedTemplateId) ?? null,
    [countryTemplates, selectedTemplateId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFromDb() {
      try {
        const res = await listCountryTemplates({ limit: 100 });
        const templates = (res.countryTemplates ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          codes: Array.isArray(t.codes) ? t.codes : [],
          created_at: t.created_at ?? null,
        }));
        if (cancelled) return;
        setCountryTemplates(templates);
        setCountryTemplatesSource("db");
      } catch {
        if (cancelled) return;
        setCountryTemplatesSource("local");
      }
    }

    loadFromDb();
    return () => {
      cancelled = true;
    };
  }, []);

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
          <button
            type="button"
            className="pillOutline"
            onClick={async () => {
              setError("");
              setErrorDetails(null);
              setSuccess("");
              const text = safeJson(batchResults);
              try {
                await copyTextToClipboard(text);
                setSuccess("Batch (resultados) copiado para a área de transferência.");
              } catch {
                setError("Não foi possível copiar os resultados do batch.");
                setErrorDetails(null);
              }
            }}
            disabled={!batchResults.length}
          >
            Copiar resultados
          </button>
          <button
            type="button"
            className="pillOutline"
            onClick={async () => {
              setError("");
              setErrorDetails(null);
              setSuccess("");
              const text = safeJson(batchErrors);
              try {
                await copyTextToClipboard(text);
                setSuccess("Batch (erros) copiado para a área de transferência.");
              } catch {
                setError("Não foi possível copiar os erros do batch.");
                setErrorDetails(null);
              }
            }}
            disabled={!batchErrors.length}
          >
            Copiar erros
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

      <div className="card" style={{ padding: 14, marginTop: 12 }}>
        <div className="muted" style={{ fontWeight: 900 }}>
          Templates de países <span style={{ fontWeight: 800 }}>({countryTemplatesSource === "db" ? "DB" : "local"})</span>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 260 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              Selecionar template
            </span>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={batchRunning}
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
              <option value="">(nenhum)</option>
              {countryTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {(t.name || t.id).slice(0, 80)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="pillOutline"
            disabled={batchRunning || !selectedTemplate}
            onClick={() => {
              const codes = Array.isArray(selectedTemplate?.codes) ? selectedTemplate.codes : [];
              setSelectedCountryCodes(codes);
              setSuccess(`Template aplicado: ${selectedTemplate?.name || selectedTemplate?.id}.`);
            }}
          >
            Aplicar
          </button>

          <label style={{ display: "grid", gap: 6, minWidth: 240, flex: 1 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              Nome do template
            </span>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ex: LATAM (Top)"
              disabled={batchRunning}
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
            disabled={batchRunning || !selectedCountryCodes.length || !templateName.trim()}
            onClick={async () => {
              setError("");
              setErrorDetails(null);
              setSuccess("");

              const name = templateName.trim();
              const codes = selectedCountryCodes.slice();

              if (countryTemplatesSource === "db") {
                try {
                  const res = await createCountryTemplate({ name, codes });
                  const tpl = res?.countryTemplate ?? null;
                  if (!tpl?.id) {
                    setError("Não foi possível salvar o template (resposta inválida).");
                    setErrorDetails(null);
                    return;
                  }
                  const next = [{ id: tpl.id, name: tpl.name, codes: tpl.codes ?? [], created_at: tpl.created_at ?? null }, ...countryTemplates].slice(
                    0,
                    100,
                  );
                  setCountryTemplates(next);
                  setSelectedTemplateId(tpl.id);
                  setTemplateName("");
                  setSuccess("Template de países salvo no DB.");
                  return;
                } catch (err) {
                  pushLog({
                    action: "countryTemplates.create",
                    ok: false,
                    error: err?.message ? String(err.message) : "error",
                    details: { name, codesCount: codes.length },
                  });
                  setError("Falha ao salvar no DB. Usando fallback local.");
                  setErrorDetails(extractErrorDetails(err));
                  setCountryTemplatesSource("local");
                }
              }

              const next = [{ id: newTemplateId(), name, codes }, ...countryTemplates].slice(0, 50);
              setCountryTemplates(next);
              persistCountryTemplates(next);
              setSelectedTemplateId(next[0]?.id ?? "");
              setTemplateName("");
              setSuccess("Template de países salvo localmente.");
            }}
          >
            Salvar seleção
          </button>

          <button
            type="button"
            className="pillOutline"
            disabled={batchRunning || !selectedTemplate}
            onClick={async () => {
              setError("");
              setErrorDetails(null);
              setSuccess("");

              const currentId = selectedTemplateId;

              if (countryTemplatesSource === "db") {
                try {
                  await deleteCountryTemplate(currentId);
                  const next = countryTemplates.filter((t) => t?.id !== currentId);
                  setCountryTemplates(next);
                  setSelectedTemplateId("");
                  setSuccess("Template removido do DB.");
                  return;
                } catch (err) {
                  pushLog({
                    action: "countryTemplates.delete",
                    ok: false,
                    error: err?.message ? String(err.message) : "error",
                    details: { templateId: currentId },
                  });
                  setError("Falha ao remover do DB. Usando fallback local.");
                  setErrorDetails(extractErrorDetails(err));
                  setCountryTemplatesSource("local");
                }
              }

              const next = countryTemplates.filter((t) => t?.id !== currentId);
              setCountryTemplates(next);
              persistCountryTemplates(next);
              setSelectedTemplateId("");
              setSuccess("Template removido (local).");
            }}
          >
            Remover
          </button>
        </div>
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
