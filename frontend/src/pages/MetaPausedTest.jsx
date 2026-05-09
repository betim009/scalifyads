import PageShell from "../components/PageShell.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useEffect, useMemo, useState } from "react";
import { getCountries } from "../services/reference.js";
import { createMetaCampaignSimple, getMetaCampaign, listMetaAdAccountCampaigns } from "../services/metaCampaigns.js";
import { createMetaAdSet } from "../services/metaAdSets.js";
import { createMetaAd } from "../services/metaAds.js";
import { getMetaStatus, validateMetaToken } from "../services/metaStatus.js";
import { countryCodeToFlag } from "../services/fallbacks.js";
import { listGeneratedCampaigns } from "../services/generatedCampaigns.js";

const OBJECTIVE_OPTIONS = [
  { value: "OUTCOME_TRAFFIC", label: "OUTCOME_TRAFFIC" },
  { value: "OUTCOME_LEADS", label: "OUTCOME_LEADS" },
  { value: "OUTCOME_SALES", label: "OUTCOME_SALES" },
];

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed : "";
}

function normalizeMetaAdAccountId(value) {
  const raw = normalizeNonEmptyString(value);
  if (!raw) return "";
  const stripped = raw.replace(/^act_/, "");
  if (!/^\d+$/.test(stripped)) return "";
  return `act_${stripped}`;
}

function isRealMetaId(metaId) {
  const id = normalizeNonEmptyString(metaId);
  return Boolean(id) && !id.startsWith("stub-");
}

function formatNowPtBr() {
  return new Date().toLocaleString("pt-BR", { hour12: false });
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

export default function MetaPausedTest() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [errorDetails, setErrorDetails] = useState(null);

  const [countries, setCountries] = useState([]);
  const [countriesSource, setCountriesSource] = useState("api");

  const [mode, setMode] = useState("REAL");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [countryCode, setCountryCode] = useState("");

  const [created, setCreated] = useState(null);
  const [campaignCreating, setCampaignCreating] = useState(false);
  const [createdLoading, setCreatedLoading] = useState(false);

  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [metaErrorDetails, setMetaErrorDetails] = useState(null);
  const [metaCampaigns, setMetaCampaigns] = useState([]);

  const [backendStatus, setBackendStatus] = useState(null);
  const [backendStatusLoading, setBackendStatusLoading] = useState(false);
  const [backendStatusError, setBackendStatusError] = useState("");
  const [backendStatusErrorDetails, setBackendStatusErrorDetails] = useState(null);
  const [validateLoading, setValidateLoading] = useState(false);
  const [validateError, setValidateError] = useState("");
  const [validateErrorDetails, setValidateErrorDetails] = useState(null);
  const [validateMe, setValidateMe] = useState(null);

  // AdSet/Ad (fluxo mínimo incremental)
  const [adSetName, setAdSetName] = useState("");
  const [adSetDailyBudget, setAdSetDailyBudget] = useState("1000"); // cents placeholder
  const [adSetBillingEvent, setAdSetBillingEvent] = useState("IMPRESSIONS");
  const [adSetOptimizationGoal, setAdSetOptimizationGoal] = useState("LINK_CLICKS");
  const [adSetCreating, setAdSetCreating] = useState(false);
  const [adName, setAdName] = useState("");
  const [adCreativeId, setAdCreativeId] = useState("");
  const [adCreating, setAdCreating] = useState(false);

  // Batch (Campaign por país)
  const [batchMode, setBatchMode] = useState("REAL");
  const [selectedCountryCodes, setSelectedCountryCodes] = useState([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [batchErrors, setBatchErrors] = useState([]);

  // Evidência de persistência local
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [localErrorDetails, setLocalErrorDetails] = useState(null);
  const [localGenerated, setLocalGenerated] = useState([]);

  // Logs operacionais (frontend-only, sem tokens)
  const [opsLogs, setOpsLogs] = useState(() => {
    try {
      const raw = localStorage.getItem("metaTest.opsLogs.v1");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  function pushLog(entry) {
    const enriched = { at: formatNowPtBr(), ...(entry ?? {}) };
    setOpsLogs((prev) => {
      const next = [enriched, ...(Array.isArray(prev) ? prev : [])].slice(0, 100);
      try {
        localStorage.setItem("metaTest.opsLogs.v1", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function captureError(err, fallbackMessage) {
    const message = err?.message ? String(err.message) : fallbackMessage || "Erro";
    const details = err?.body?.error?.details ?? err?.body ?? null;
    setError(message);
    setErrorDetails(details);
    setSuccess("");
    return { message, details };
  }

  async function refresh() {
    setLoading(true);
    setError("");
    setErrorDetails(null);
    try {
      const res = await getCountries();
      const list = res.countries ?? [];
      setCountries(list);
      setCountriesSource(res.source ?? "api");
      setCountryCode((prev) => (normalizeNonEmptyString(prev) ? prev : (list[0]?.code ?? "")));
    } catch (err) {
      setCountries([]);
      setCountriesSource("fallback");
      captureError(err, "Falha ao carregar países.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshBackendStatus() {
    setBackendStatusError("");
    setBackendStatusErrorDetails(null);
    setBackendStatusLoading(true);
    try {
      const res = await getMetaStatus();
      setBackendStatus(res);
      pushLog({ action: "meta.status", ok: true, details: { hasAccessToken: res?.hasAccessToken } });
    } catch (err) {
      setBackendStatus(null);
      setBackendStatusError(err?.message ? String(err.message) : "Falha ao consultar /api/meta/status.");
      setBackendStatusErrorDetails(err?.body?.error?.details ?? err?.body ?? null);
      pushLog({ action: "meta.status", ok: false, error: err?.message ? String(err.message) : "error" });
    } finally {
      setBackendStatusLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    refreshBackendStatus();
    refreshLocalGenerated();
  }, []);

  const countryOptions = useMemo(() => countries ?? [], [countries]);
  const countryNameByCode = useMemo(
    () => Object.fromEntries(countryOptions.map((c) => [c.code, c.name])),
    [countryOptions],
  );

  const canCreate =
    !loading &&
    !busy &&
    !campaignCreating &&
    normalizeNonEmptyString(name) !== "" &&
    normalizeNonEmptyString(objective) !== "" &&
    normalizeNonEmptyString(normalizeMetaAdAccountId(metaAdAccountId)) !== "" &&
    normalizeNonEmptyString(countryCode) !== "";

  const adAccountNormalized = useMemo(() => normalizeMetaAdAccountId(metaAdAccountId), [metaAdAccountId]);
  const runModeLabel = mode === "STUB" ? "STUB" : "REAL";
  const dataModeLabel = loading ? "LOADING" : countriesSource === "fallback" ? "FALLBACK" : "API";
  const dbModeLabel = localLoading ? "LOADING" : localError ? "FALLBACK" : "API";
  const metaReadyLabel = backendStatusLoading ? "LOADING" : backendStatus ? (backendStatus.hasAccessToken ? "REAL" : "STUB") : "UNKNOWN";
  const syncProviderLabel = backendStatusLoading
    ? "LOADING"
    : backendStatus
    ? normalizeNonEmptyString(backendStatus?.provider) || "—"
    : "UNKNOWN";
  const flowMode = (created?.mode ?? mode) === "STUB" ? "STUB" : "REAL";
  const createdGeneratedCampaignId = normalizeNonEmptyString(created?.generatedCampaign?.id);
  const createdMetaCampaignId = normalizeNonEmptyString(created?.metaCampaign?.id);
  const createdMetaCampaignIdIsReal = isRealMetaId(createdMetaCampaignId);
  const createdMetaAdSetId = normalizeNonEmptyString(created?.generatedCampaign?.meta_adset_id);
  const createdMetaAdId = normalizeNonEmptyString(created?.generatedCampaign?.meta_ad_id);
  const createdCountryCode = normalizeNonEmptyString(created?.generatedCampaign?.country_code) || countryCode;
  const campaignEntityModeLabel = createdMetaCampaignId ? (createdMetaCampaignIdIsReal ? "REAL" : "STUB") : "—";
  const adSetEntityId = normalizeNonEmptyString(created?.metaAdSet?.id) || createdMetaAdSetId;
  const adSetEntityModeLabel = adSetEntityId ? (isRealMetaId(adSetEntityId) ? "REAL" : "STUB") : "—";
  const adEntityId = normalizeNonEmptyString(created?.metaAd?.id) || createdMetaAdId;
  const adEntityModeLabel = adEntityId ? (isRealMetaId(adEntityId) ? "REAL" : "STUB") : "—";

  const canCreateAdSet =
    !loading &&
    !busy &&
    !adSetCreating &&
    createdGeneratedCampaignId !== "" &&
    normalizeNonEmptyString(adSetName) !== "" &&
    Number.isFinite(Number(adSetDailyBudget)) &&
    Math.trunc(Number(adSetDailyBudget)) > 0 &&
    normalizeNonEmptyString(adSetBillingEvent) !== "" &&
    normalizeNonEmptyString(adSetOptimizationGoal) !== "" &&
    (flowMode === "STUB" || (Boolean(backendStatus?.hasAccessToken) && createdMetaCampaignIdIsReal));

  const canCreateAd =
    !loading &&
    !busy &&
    !adCreating &&
    createdGeneratedCampaignId !== "" &&
    createdMetaAdSetId !== "" &&
    normalizeNonEmptyString(adName) !== "" &&
    (flowMode === "STUB" || (Boolean(backendStatus?.hasAccessToken) && normalizeNonEmptyString(adCreativeId) !== ""));

  const canBatch =
    !loading &&
    !busy &&
    !batchRunning &&
    normalizeNonEmptyString(name) !== "" &&
    normalizeNonEmptyString(objective) !== "" &&
    normalizeNonEmptyString(adAccountNormalized) !== "" &&
    selectedCountryCodes.length > 0 &&
    countriesSource !== "fallback" &&
    (batchMode === "STUB" || Boolean(backendStatus?.hasAccessToken));

  async function refreshLocalGenerated() {
    setLocalLoading(true);
    setLocalError("");
    setLocalErrorDetails(null);
    try {
      const res = await listGeneratedCampaigns({ limit: 50 });
      setLocalGenerated(res.generatedCampaigns ?? []);
      pushLog({ action: "db.generated_campaigns.list", ok: true, details: { count: (res.generatedCampaigns ?? []).length } });
    } catch (err) {
      setLocalGenerated([]);
      setLocalError(
        err?.message ? String(err.message) : "Falha ao carregar `generated_campaigns` (DB/API indisponível).",
      );
      const details = err?.body?.error?.details ?? err?.body ?? null;
      setLocalErrorDetails(details);
      pushLog({
        action: "db.generated_campaigns.list",
        ok: false,
        error: err?.message ? String(err.message) : "error",
        details,
      });
    } finally {
      setLocalLoading(false);
    }
  }

  return (
    <PageShell
      title="Meta (lab): Campaign → AdSet → Ad"
      subtitle="Fluxo progressivo operacional — criação REAL sempre PAUSED"
      backFallbackTo="/configuracoes"
    >
      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 900 }}>Atalhos</div>
        <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
          Navegação rápida para as seções principais (evita scroll longo).
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="pillOutline" href="#meta-test-mode">Modo</a>
          <a className="pillOutline" href="#meta-test-backend-status">Status backend</a>
          <a className="pillOutline" href="#meta-test-db">DB (generated_campaigns)</a>
          <a className="pillOutline" href="#meta-test-ops-logs">Logs</a>
          <a className="pillOutline" href="#meta-test-step-campaign">Etapa 1 (Campaign)</a>
          <a className="pillOutline" href="#meta-test-step-adset">Etapa 2 (AdSet)</a>
          <a className="pillOutline" href="#meta-test-step-ad">Etapa 3 (Ad)</a>
        </div>
      </div>

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
              background: dataModeLabel === "LOADING" ? "#f3f4f6" : dataModeLabel === "FALLBACK" ? "#fee2e2" : "#dbeafe",
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
              background: metaReadyLabel === "LOADING" ? "#f3f4f6" : metaReadyLabel === "REAL" ? "#dcfce7" : "#fef3c7",
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
          <br />- <b>DB</b>: indica se a UI conseguiu ler `generated_campaigns` (API/DB) para evidenciar persistência.
          <br />- <b>SYNC</b>: provider configurado no backend (`META_SYNC_PROVIDER`).
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 900 }}>Regras (segurança)</div>
        <ul className="muted" style={{ marginTop: 10, fontWeight: 800, lineHeight: 1.55 }}>
          <li>Esta página NÃO envia token para o frontend.</li>
          <li>O backend deve ter token via `META_ACCESS_TOKEN` ou `POST /api/meta/tokens`.</li>
          <li>Toda criação REAL deve nascer como `PAUSED` (forçado no backend).</li>
        </ul>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontWeight: 900 }}>Modos operacionais</div>
        <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
          <div>
            <b>REAL</b>: backend chama Meta Graph/Marketing API (token válido) e persiste IDs reais.
          </div>
          <div style={{ marginTop: 6 }}>
            <b>STUB</b>: não chama Meta; cria IDs `stub-*` para testar fluxo/persistência.
          </div>
          <div style={{ marginTop: 6 }}>
            <b>FALLBACK</b>: UI usa dados locais quando API/DB não estiverem disponíveis (sempre sinalizado).
          </div>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: 18, marginTop: 16, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Erro</div>
            <button
              type="button"
              className="pillOutline"
              onClick={() => {
                setError("");
                setErrorDetails(null);
              }}
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

      {success ? (
        <div className="card" style={{ padding: 18, marginTop: 16, borderColor: "#bbf7d0", color: "#14532d" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Sucesso</div>
            <button type="button" className="pillOutline" onClick={() => setSuccess("")}>
              Fechar
            </button>
          </div>
          <div style={{ marginTop: 6, fontWeight: 800 }}>{success}</div>
        </div>
      ) : null}

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Estrutura Meta (Campaign → AdSet → Ad)</div>
        <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
          Esta tela evita “formulário gigante” e evolui progressivamente por entidade.
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                Campaign (Meta)
              </div>
              <span className="muted" style={{ fontWeight: 900 }}>
                {campaignEntityModeLabel}
              </span>
            </div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>
              {created?.metaCampaign?.id ?? "—"}
            </div>
            <div className="muted" style={{ marginTop: 8, fontWeight: 900 }}>
              {created?.metaCampaign?.status ?? "—"} / {created?.metaCampaign?.effective_status ?? "—"}
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                AdSet (Meta)
              </div>
              <span className="muted" style={{ fontWeight: 900 }}>
                {adSetEntityModeLabel}
              </span>
            </div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>
              {created?.metaAdSet?.id ?? created?.generatedCampaign?.meta_adset_id ?? "—"}
            </div>
            <div className="muted" style={{ marginTop: 8, fontWeight: 900 }}>
              {(created?.metaAdSet?.status ?? created?.generatedCampaign?.meta_adset_status ?? "—") +
                " / " +
                (created?.metaAdSet?.effective_status ?? created?.generatedCampaign?.meta_adset_effective_status ?? "—")}
            </div>
            {!created?.generatedCampaign?.meta_adset_id ? (
              <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
                Targeting (país/posicionamentos) + budget
              </div>
            ) : null}
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                Ad (Meta)
              </div>
              <span className="muted" style={{ fontWeight: 900 }}>
                {adEntityModeLabel}
              </span>
            </div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>
              {created?.metaAd?.id ?? created?.generatedCampaign?.meta_ad_id ?? "—"}
            </div>
            <div className="muted" style={{ marginTop: 8, fontWeight: 900 }}>
              {(created?.metaAd?.status ?? created?.generatedCampaign?.meta_ad_status ?? "—") +
                " / " +
                (created?.metaAd?.effective_status ?? created?.generatedCampaign?.meta_ad_effective_status ?? "—")}
            </div>
            {!created?.generatedCampaign?.meta_ad_id ? (
              <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
                Creative (sem upload complexo)
              </div>
            ) : null}
          </div>
        </div>

        <div className="muted" style={{ marginTop: 12, fontWeight: 800 }}>
          País (modelo operacional local): <b>{countryCode || "—"}</b>
          {countryCode && countryNameByCode?.[countryCode] ? ` — ${countryNameByCode[countryCode]}` : ""}
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Batch — Campaign por país</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              Gera Campaigns independentes por país (todas nascem `PAUSED`).
            </div>
          </div>
          <button
            type="button"
            className="pillOutline"
            onClick={() => setSelectedCountryCodes(countryOptions.map((c) => c.code))}
            disabled={loading || batchRunning || !countryOptions.length}
          >
            Selecionar todos
          </button>
        </div>

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

          <button
            type="button"
            className="pillOutline"
            disabled={!canBatch}
	            onClick={async () => {
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
	                    const captured = { message: err?.message ? String(err.message) : "error", details: err?.body?.error?.details ?? err?.body ?? null };
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
                setSuccess(
                  `Batch concluído: ${results.length} sucesso(s) / ${errors.length} erro(s). Todas as Campaigns permanecem PAUSED.`,
                );
                await refreshBackendStatus();
                await refreshLocalGenerated();
              } finally {
                setBatchRunning(false);
                setBatchProgress(null);
              }
            }}
          >
            {batchRunning ? "Gerando..." : "Gerar Campaigns por país (PAUSED)"}
          </button>

          {!backendStatus?.hasAccessToken && batchMode === "REAL" ? (
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
      </div>

      <div id="meta-test-backend-status" className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Status do backend (Meta)</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              Diagnóstico rápido de token/provider sem expor segredo.
            </div>
          </div>
          <button
            type="button"
            className="pillOutline"
            onClick={refreshBackendStatus}
            disabled={busy || loading || backendStatusLoading}
          >
            {backendStatusLoading ? "Atualizando..." : "Atualizar status"}
          </button>
        </div>

        {backendStatusError ? (
          <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
            <div style={{ fontWeight: 900 }}>Erro</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{backendStatusError}</div>
            {backendStatusErrorDetails ? (
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
{safeJson(backendStatusErrorDetails)}
              </pre>
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Provider
            </div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>
              {backendStatusLoading ? "LOADING" : (backendStatus?.provider ?? "—")}
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Graph version
            </div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>
              {backendStatusLoading ? "LOADING" : (backendStatus?.graphVersion ?? "—")}
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Token no backend
            </div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>
              {backendStatusLoading
                ? "LOADING"
                : backendStatus?.hasAccessToken
                ? "SIM (REAL disponível)"
                : "NÃO (somente STUB)"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="pillOutline"
            disabled={validateLoading || busy || !backendStatus?.hasAccessToken}
	            onClick={async () => {
	              setValidateLoading(true);
	              setValidateError("");
                setValidateErrorDetails(null);
	              try {
	                const res = await validateMetaToken();
	                setValidateMe(res.me ?? null);
	                pushLog({ action: "meta.validate", ok: true, details: { me: res?.me ?? null } });
	              } catch (err) {
	                setValidateMe(null);
	                setValidateError(err?.message ? String(err.message) : "Falha ao validar token.");
                  const details = err?.body?.error?.details ?? err?.body ?? null;
                  setValidateErrorDetails(details);
	                pushLog({
                    action: "meta.validate",
                    ok: false,
                    error: err?.message ? String(err.message) : "error",
                    details,
                  });
	              } finally {
	                setValidateLoading(false);
	              }
	            }}
          >
            {validateLoading ? "Validando..." : "Validar token (Graph /me)"}
          </button>
          <div className="muted" style={{ fontWeight: 800 }}>
            {backendStatus?.hasAccessToken
              ? "Recomendado antes de criar REAL."
              : "Adicione token no backend para habilitar REAL."}
          </div>
        </div>

        {validateError ? (
          <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
            <div style={{ fontWeight: 900 }}>Erro (validate)</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{validateError}</div>
            {validateErrorDetails ? (
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
{safeJson(validateErrorDetails)}
              </pre>
            ) : null}
          </div>
        ) : null}

        {validateMe ? (
          <div className="card" style={{ padding: 14, marginTop: 12 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Token OK
            </div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>
              {validateMe?.name ? `${validateMe.name} (${validateMe.id})` : validateMe?.id ?? "—"}
            </div>
          </div>
        ) : null}
      </div>

      <div id="meta-test-db" className="card" style={{ padding: 0, marginTop: 16 }}>
        <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Persistência local (DB) — generated_campaigns</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              Evidência de persistência de IDs/status Meta (Campaign/AdSet/Ad) no Postgres.
            </div>
          </div>
          <button
            type="button"
            className="pillOutline"
            onClick={refreshLocalGenerated}
            disabled={localLoading || loading || busy}
          >
            {localLoading ? "Atualizando..." : "Atualizar lista"}
          </button>
        </div>

        {localError ? (
          <div className="card" style={{ padding: 14, margin: "0 16px 16px", borderColor: "#fecaca", color: "#991b1b" }}>
            <div style={{ fontWeight: 900 }}>Erro</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{localError}</div>
            {localErrorDetails ? (
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
{safeJson(localErrorDetails)}
              </pre>
            ) : null}
          </div>
        ) : null}

        <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
          <table className="dataTable" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Criado</th>
                <th>País</th>
                <th>Nome</th>
                <th>Modo</th>
                <th>Meta Campaign ID</th>
                <th>Status Meta</th>
                <th>Effective</th>
                <th>AdSet (Meta)</th>
                <th>Ad (Meta)</th>
              </tr>
            </thead>
            <tbody>
              {localGenerated.map((gc) => {
                const metaId = gc.meta_campaign_id || "";
                const mode = metaId && String(metaId).startsWith("stub-") ? "STUB" : metaId ? "REAL" : "—";
                const isFocused = createdGeneratedCampaignId && gc.id === createdGeneratedCampaignId;
                return (
                  <tr
                    key={gc.id}
                    style={
                      isFocused
                        ? { background: "#f0fdf4", outline: "1px solid #bbf7d0", outlineOffset: -1 }
                        : undefined
                    }
                  >
                    <td className="muted" style={{ fontWeight: 800 }}>
                      {gc.created_at ? String(gc.created_at).slice(0, 19).replace("T", " ") : "—"}
                    </td>
                    <td style={{ fontWeight: 900 }}>
                      {gc.country_code ? (
                        <>
                          <span aria-hidden="true" style={{ marginRight: 10 }}>
                            {countryCodeToFlag(gc.country_code)}
                          </span>
                          {gc.country_code}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ fontWeight: 900 }}>{gc.name || "—"}</td>
                    <td className="muted" style={{ fontWeight: 900 }}>
                      {mode}
                    </td>
                    <td className="muted" style={{ fontWeight: 800 }}>
                      {gc.meta_campaign_id || "—"}
                    </td>
                    <td className="muted" style={{ fontWeight: 900 }}>
                      {gc.meta_status || "—"}
                    </td>
                    <td className="muted" style={{ fontWeight: 900 }}>
                      {gc.meta_effective_status || "—"}
                    </td>
                    <td className="muted" style={{ fontWeight: 800 }}>
                      <div>{gc.meta_adset_id || "—"}</div>
                      <div style={{ marginTop: 4, fontWeight: 900 }}>
                        {(gc.meta_adset_status || "—") + " / " + (gc.meta_adset_effective_status || "—")}
                      </div>
                    </td>
                    <td className="muted" style={{ fontWeight: 800 }}>
                      <div>{gc.meta_ad_id || "—"}</div>
                      <div style={{ marginTop: 4, fontWeight: 900 }}>
                        {(gc.meta_ad_status || "—") + " / " + (gc.meta_ad_effective_status || "—")}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!localGenerated.length ? (
                <tr>
                  <td colSpan={9} className="muted" style={{ fontWeight: 800 }}>
                    {localLoading
                      ? "Carregando..."
                      : "Vazio. Clique em “Atualizar lista” ou crie Campaigns acima para gerar registros."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="muted" style={{ padding: 16, fontWeight: 800 }}>
          Nota: país local é aplicado no targeting do AdSet (geo_locations.countries).
        </div>
      </div>

      <div id="meta-test-ops-logs" className="card" style={{ padding: 0, marginTop: 16 }}>
        <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Logs operacionais (básico)</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              Timeline local do navegador (sem token) para auditoria rápida do lab.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="pillOutline"
              onClick={() => {
                setOpsLogs([]);
                try {
                  localStorage.removeItem("metaTest.opsLogs.v1");
                } catch {
                  // ignore
                }
              }}
              disabled={!opsLogs.length}
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
                const text = safeJson(opsLogs);
                try {
                  await navigator.clipboard.writeText(text);
                  setSuccess("Logs copiados para a área de transferência.");
                } catch {
                  setError("Não foi possível copiar os logs.");
                  setErrorDetails(null);
                }
              }}
              disabled={!opsLogs.length}
            >
              Copiar JSON
            </button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
          <table className="dataTable" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Ação</th>
                <th>OK</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {opsLogs.map((l, idx) => (
                <tr key={`${l.at}-${idx}`}>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {l.at}
                  </td>
                  <td style={{ fontWeight: 900 }}>{l.action || "—"}</td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {l.ok ? "SIM" : "NÃO"}
                  </td>
                  <td className="muted" style={{ fontWeight: 800, maxWidth: 520 }}>
                    {l.ok
                      ? safeJson(l.details ?? null)
                      : `${l.error || "—"}${l.details ? `\n${safeJson(l.details)}` : ""}`}
                  </td>
                </tr>
              ))}
              {!opsLogs.length ? (
                <tr>
                  <td colSpan={4} className="muted" style={{ fontWeight: 800 }}>
                    Vazio. Execute ações acima para gerar logs.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div id="meta-test-step-campaign" className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Etapa 1 — Campaign (mínimo)</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              Nome + Objective + Ad Account + País.
            </div>
          </div>
          <button type="button" className="pillOutline" onClick={refresh} disabled={loading || busy}>
            Atualizar
          </button>
        </div>

        <div className="muted" style={{ marginTop: 10, fontWeight: 800 }}>
          Fonte países:{" "}
          <span style={{ fontWeight: 900 }}>{dataModeLabel}</span>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              {OBJECTIVE_OPTIONS.map((o) => (
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

          <button
            type="button"
            className="pillOutline"
            disabled={!canCreate}
		            onClick={async () => {
		              setBusy(true);
                  setCampaignCreating(true);
		              setError("");
		              setErrorDetails(null);
		              setSuccess("");
		              setCreated(null);
		              try {
	                const res = await createMetaCampaignSimple({
	                  name: name.trim(),
	                  objective,
	                  metaAdAccountId: adAccountNormalized,
	                  countryCode,
	                  mode,
	                });
	                setCreated(res);
	                pushLog({
	                  action: "campaign.create.simple",
	                  ok: true,
	                  details: {
	                    mode: res.mode ?? mode,
	                    countryCode,
	                    metaCampaignId: res?.metaCampaign?.id ?? null,
	                    generatedCampaignId: res?.generatedCampaign?.id ?? null,
	                  },
	                });
	                setSuccess(`Campaign criada (${res.mode || mode}) — status obrigatório: PAUSED.`);
	                await refreshBackendStatus();
	                await refreshLocalGenerated();
		              } catch (err) {
		                const captured = captureError(err, "Falha ao criar Campaign.");
		                pushLog({
		                  action: "campaign.create.simple",
		                  ok: false,
		                  error: captured.message || "error",
		                  details: { mode, countryCode, errorDetails: captured.details },
		                });
		              } finally {
	                setCampaignCreating(false);
	                setBusy(false);
	              }
	            }}
          >
            {campaignCreating ? "Criando..." : `Criar Campaign ${mode} (PAUSED)`}
          </button>

          <button
            type="button"
            className="pillOutline"
            disabled={
              normalizeNonEmptyString(metaAdAccountId) === "" || metaLoading || !backendStatus?.hasAccessToken
            }
	            onClick={async () => {
	              setMetaLoading(true);
	              setMetaError("");
                setMetaErrorDetails(null);
	              try {
	                const res = await listMetaAdAccountCampaigns({
	                  metaAdAccountId: adAccountNormalized || metaAdAccountId.trim(),
	                  limit: 100,
	                  pausedOnly: true,
	                });
	                setMetaCampaigns(res.metaCampaigns ?? []);
	                pushLog({
	                  action: "meta.adaccount.campaigns.list",
	                  ok: true,
	                  details: { count: (res.metaCampaigns ?? []).length },
	                });
	              } catch (err) {
	                setMetaError(err?.message ? String(err.message) : "Falha ao listar campanhas na Meta (PAUSED).");
                  const details = err?.body?.error?.details ?? err?.body ?? null;
                  setMetaErrorDetails(details);
	                setMetaCampaigns([]);
	                pushLog({
	                  action: "meta.adaccount.campaigns.list",
	                  ok: false,
	                  error: err?.message ? String(err.message) : "error",
                    details,
	                });
	              } finally {
	                setMetaLoading(false);
	              }
	            }}
          >
            {metaLoading ? "Listando..." : "Listar PAUSED na Meta"}
          </button>
          {!backendStatus?.hasAccessToken ? (
            <div className="muted" style={{ fontWeight: 800 }}>
              Token ausente no backend → listagem REAL indisponível (use STUB ou configure token).
            </div>
          ) : null}
        </div>

        {metaError ? (
          <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
            <div style={{ fontWeight: 900 }}>Erro (Meta)</div>
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

      {created?.metaCampaign ? (
        <div className="card" style={{ padding: 18, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Resultado</div>
            <div className="muted" style={{ fontWeight: 900 }}>
              Modo: <span style={{ fontWeight: 900 }}>{created.mode || "—"}</span>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                Meta Campaign ID
              </div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{created.metaCampaign.id || "—"}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                País
              </div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>
                {createdCountryCode ? `${countryCodeToFlag(createdCountryCode)} ${createdCountryCode}` : "—"}
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                Status
              </div>
              <div style={{ marginTop: 8 }}>
                <StatusBadge>{created.metaCampaign.status || "—"}</StatusBadge>
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                Effective Status
              </div>
              <div style={{ marginTop: 8 }}>
                <StatusBadge>{created.metaCampaign.effective_status || "—"}</StatusBadge>
              </div>
            </div>
          </div>

          <div className="muted" style={{ marginTop: 12, fontWeight: 800 }}>
            Persistência local:
            <div style={{ marginTop: 6 }}>
              `generated_campaigns.id`: <b>{created.generatedCampaign?.id || "—"}</b>
            </div>
            <div style={{ marginTop: 6 }}>
              `generated_campaigns.meta_campaign_id`:{" "}
              <b>{created.generatedCampaign?.meta_campaign_id || "—"}</b>
            </div>
            <div style={{ marginTop: 6 }}>
              `generated_campaigns.meta_adset_id`: <b>{created.generatedCampaign?.meta_adset_id || "—"}</b>
            </div>
            <div style={{ marginTop: 6 }}>
              `generated_campaigns.meta_ad_id`: <b>{created.generatedCampaign?.meta_ad_id || "—"}</b>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="pillOutline"
              disabled={
                createdLoading ||
                busy ||
                !backendStatus?.hasAccessToken ||
                !isRealMetaId(created.metaCampaign?.id)
              }
	              onClick={async () => {
	                setCreatedLoading(true);
	                setError("");
                  setErrorDetails(null);
	                try {
	                  const res = await getMetaCampaign(created.metaCampaign.id);
	                  setCreated((prev) => ({
	                    ...(prev ?? {}),
	                    metaCampaign: res.metaCampaign ?? prev?.metaCampaign ?? null,
	                  }));
	                  setSuccess("Status atualizado via Graph.");
	                  pushLog({ action: "meta.campaign.get", ok: true, details: { metaCampaignId: created.metaCampaign.id } });
	                } catch (err) {
	                  const captured = captureError(err, "Falha ao consultar Campaign no Graph.");
	                  pushLog({
                      action: "meta.campaign.get",
                      ok: false,
                      error: captured.message || "error",
                      details: { metaCampaignId: created.metaCampaign.id, errorDetails: captured.details },
                    });
	                } finally {
	                  setCreatedLoading(false);
	                }
	              }}
            >
              {createdLoading ? "Consultando..." : "Consultar status no Graph"}
            </button>
            <div className="muted" style={{ fontWeight: 800 }}>
              {isRealMetaId(created.metaCampaign?.id)
                ? "Usa `GET /api/meta/campaigns/:id` via backend."
                : "STUB não consulta Graph."}
            </div>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, marginTop: 16 }}>
        <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Campanhas PAUSED na Meta (Ads Manager)</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              {metaLoading ? "Carregando..." : `${metaCampaigns.length} item(ns)`}
            </div>
          </div>
          <div className="muted" style={{ fontWeight: 800 }}>Token continua apenas no backend.</div>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
          <table className="dataTable" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Meta Campaign ID</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Effective</th>
                <th>Objective</th>
              </tr>
            </thead>
            <tbody>
              {metaCampaigns.map((c) => (
                <tr key={c.id}>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {c.id}
                  </td>
                  <td style={{ fontWeight: 900 }}>{c.name || "—"}</td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {c.status || "—"}
                  </td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {c.effective_status || "—"}
                  </td>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {c.objective || "—"}
                  </td>
                </tr>
              ))}
              {!metaCampaigns.length ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ fontWeight: 800 }}>
                    {metaLoading
                      ? "Carregando..."
                      : "Vazio. Preencha `act_...` e clique em “Listar PAUSED na Meta”."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div id="meta-test-step-adset" className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Etapa 2 — AdSet (PAUSED)</div>
        <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
          Criação incremental via `POST /api/meta/adsets` (REAL/STUB). Sempre PAUSED.
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              Meta Campaign ID (origem)
            </span>
            <input
              value={createdMetaCampaignId}
              readOnly
              placeholder="Crie uma Campaign acima para preencher automaticamente"
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
              Nome do AdSet
            </span>
            <input
              value={adSetName}
              onChange={(e) => setAdSetName(e.target.value)}
              placeholder="Ex: AdSet BR — Broad"
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
              País (targeting)
            </span>
            <input
              value={created?.generatedCampaign?.country_code ?? countryCode}
              readOnly
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
              Daily budget (cents)
            </span>
            <input
              value={adSetDailyBudget}
              onChange={(e) => setAdSetDailyBudget(e.target.value)}
              placeholder="1000"
              inputMode="numeric"
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
              Billing event
            </span>
            <input
              value={adSetBillingEvent}
              onChange={(e) => setAdSetBillingEvent(e.target.value)}
              placeholder="Ex: IMPRESSIONS"
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
              Optimization goal
            </span>
            <input
              value={adSetOptimizationGoal}
              onChange={(e) => setAdSetOptimizationGoal(e.target.value)}
              placeholder="Ex: LINK_CLICKS"
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

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="pillOutline"
            disabled={!canCreateAdSet}
	            onClick={async () => {
	              setBusy(true);
	              setAdSetCreating(true);
	              setError("");
	              setErrorDetails(null);
	              setSuccess("");
	              try {
                const payload = {
                  generatedCampaignId: createdGeneratedCampaignId,
                  name: adSetName.trim(),
                  countryCode: created?.generatedCampaign?.country_code ?? countryCode,
                  dailyBudgetCents: Math.trunc(Number(adSetDailyBudget)),
                  billingEvent: adSetBillingEvent.trim(),
                  optimizationGoal: adSetOptimizationGoal.trim(),
                  mode: flowMode,
                };
                const res = await createMetaAdSet(payload);
                setCreated((prev) => ({
                  ...(prev ?? {}),
                  mode: res.mode ?? prev?.mode ?? flowMode,
                  metaAdSet: res.metaAdSet ?? prev?.metaAdSet ?? null,
                  generatedCampaign: res.generatedCampaign ?? prev?.generatedCampaign ?? null,
                }));
                pushLog({
                  action: "adset.create",
                  ok: true,
                  details: {
                    mode: res.mode ?? flowMode,
                    generatedCampaignId: createdGeneratedCampaignId,
                    metaAdSetId: res?.metaAdSet?.id ?? null,
                  },
                });
                setSuccess(`AdSet criado (${res.mode || flowMode}) — status obrigatório: PAUSED.`);
                await refreshLocalGenerated();
	              } catch (err) {
	                const captured = captureError(err, "Falha ao criar AdSet.");
	                pushLog({
	                  action: "adset.create",
	                  ok: false,
	                  error: captured.message || "error",
	                  details: { mode: flowMode, generatedCampaignId: createdGeneratedCampaignId, errorDetails: captured.details },
	                });
	              } finally {
                setAdSetCreating(false);
                setBusy(false);
              }
            }}
          >
            {adSetCreating ? "Criando..." : `Criar AdSet ${flowMode} (PAUSED)`}
          </button>
          <div className="muted" style={{ fontWeight: 800 }}>
            Requer Campaign criada acima. REAL exige token no backend.
          </div>
        </div>

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>Preview do payload</summary>
          <pre style={{ marginTop: 10, background: "#0b1220", color: "#e5e7eb", padding: 12, borderRadius: 12, overflowX: "auto" }}>
{JSON.stringify(
  {
    generatedCampaignId: createdGeneratedCampaignId || null,
    name: normalizeNonEmptyString(adSetName) || null,
    countryCode: created?.generatedCampaign?.country_code ?? countryCode ?? null,
    dailyBudgetCents: Number(adSetDailyBudget) ? Math.trunc(Number(adSetDailyBudget)) : null,
    billingEvent: normalizeNonEmptyString(adSetBillingEvent) || null,
    optimizationGoal: normalizeNonEmptyString(adSetOptimizationGoal) || null,
    mode: flowMode,
  },
  null,
  2,
)}
          </pre>
        </details>
      </div>

      <div id="meta-test-step-ad" className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Etapa 3 — Ad (PAUSED)</div>
        <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
          Criação incremental via `POST /api/meta/ads` (REAL/STUB). Sempre PAUSED. REAL requer `creativeId` existente.
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
          <button
            type="button"
            className="pillOutline"
            disabled={!canCreateAd}
	            onClick={async () => {
	              setBusy(true);
	              setAdCreating(true);
	              setError("");
	              setErrorDetails(null);
	              setSuccess("");
	              try {
                const payload = {
                  generatedCampaignId: createdGeneratedCampaignId,
                  name: adName.trim(),
                  ...(flowMode === "REAL" ? { creativeId: adCreativeId.trim() } : null),
                  mode: flowMode,
                };
                const res = await createMetaAd(payload);
                setCreated((prev) => ({
                  ...(prev ?? {}),
                  mode: res.mode ?? prev?.mode ?? flowMode,
                  metaAd: res.metaAd ?? prev?.metaAd ?? null,
                  generatedCampaign: res.generatedCampaign ?? prev?.generatedCampaign ?? null,
                }));
                pushLog({
                  action: "ad.create",
                  ok: true,
                  details: {
                    mode: res.mode ?? flowMode,
                    generatedCampaignId: createdGeneratedCampaignId,
                    metaAdId: res?.metaAd?.id ?? null,
                  },
                });
                setSuccess(`Ad criado (${res.mode || flowMode}) — status obrigatório: PAUSED.`);
                await refreshLocalGenerated();
	              } catch (err) {
	                const captured = captureError(err, "Falha ao criar Ad.");
	                pushLog({
	                  action: "ad.create",
	                  ok: false,
	                  error: captured.message || "error",
	                  details: { mode: flowMode, generatedCampaignId: createdGeneratedCampaignId, errorDetails: captured.details },
	                });
	              } finally {
                setAdCreating(false);
                setBusy(false);
              }
            }}
          >
            {adCreating ? "Criando..." : `Criar Ad ${flowMode} (PAUSED)`}
          </button>
          <div className="muted" style={{ fontWeight: 800 }}>
            Requer AdSet criado acima. REAL exige token no backend e `creativeId`.
          </div>
        </div>

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>Preview do payload</summary>
          <pre style={{ marginTop: 10, background: "#0b1220", color: "#e5e7eb", padding: 12, borderRadius: 12, overflowX: "auto" }}>
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
    </PageShell>
  );
}
