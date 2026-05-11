import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import ShortcutsCard from "./metaTest/ShortcutsCard.jsx";
import FlowProgressCard from "./metaTest/FlowProgressCard.jsx";
import ModeStatusCard from "./metaTest/ModeStatusCard.jsx";
import BackendStatusSection from "./metaTest/BackendStatusSection.jsx";
import OpsLogsSection from "./metaTest/OpsLogsSection.jsx";
import GeneratedCampaignsSection from "./metaTest/GeneratedCampaignsSection.jsx";
import StepAdSetSection from "./metaTest/StepAdSetSection.jsx";
import StepAdSection from "./metaTest/StepAdSection.jsx";
import StepCampaignSection from "./metaTest/StepCampaignSection.jsx";
import PausedMetaCampaignsSection from "./metaTest/PausedMetaCampaignsSection.jsx";
import MetaStructureCard from "./metaTest/MetaStructureCard.jsx";
import CampaignResultSection from "./metaTest/CampaignResultSection.jsx";
import CampaignBatchSection from "./metaTest/CampaignBatchSection.jsx";
import { getCountries } from "../services/reference.js";
import { createMetaCampaignSimple, getMetaCampaign, listMetaAdAccountCampaigns } from "../services/metaCampaigns.js";
import { createMetaAdSet } from "../services/metaAdSets.js";
import { createMetaAd } from "../services/metaAds.js";
import { getMetaStatus, validateMetaToken } from "../services/metaStatus.js";
import { countryCodeToFlag } from "../services/fallbacks.js";
import { listGeneratedCampaigns } from "../services/generatedCampaigns.js";
import useOpsLogs from "./metaTest/useOpsLogs.js";
import {
  isRealMetaId,
  normalizeMetaAdAccountId,
  normalizeNonEmptyString,
  safeJson,
} from "./metaTest/metaTestUtils.js";

const OBJECTIVE_OPTIONS = [
  { value: "OUTCOME_TRAFFIC", label: "OUTCOME_TRAFFIC" },
  { value: "OUTCOME_LEADS", label: "OUTCOME_LEADS" },
  { value: "OUTCOME_SALES", label: "OUTCOME_SALES" },
];

export default function MetaPausedTest() {
  const [loading, setLoading] = useState(true);
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

  // Evidência de persistência local
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [localErrorDetails, setLocalErrorDetails] = useState(null);
  const [localGenerated, setLocalGenerated] = useState([]);

  const { opsLogs, setOpsLogs, opsLogsFilter, setOpsLogsFilter, filteredOpsLogs, pushLog } = useOpsLogs();

  const isCreatingAny = campaignCreating || adSetCreating || adCreating;

  function captureError(err, fallbackMessage) {
    const message = err?.message ? String(err.message) : fallbackMessage || "Erro";
    const details = err?.body?.error?.details ?? err?.body ?? null;
    setError(message);
    setErrorDetails(details);
    setSuccess("");
    return { message, details };
  }

  function scrollToSection(sectionId) {
    try {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // ignore
    }
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
    !isCreatingAny &&
    !campaignCreating &&
    normalizeNonEmptyString(name) !== "" &&
    normalizeNonEmptyString(objective) !== "" &&
    normalizeNonEmptyString(normalizeMetaAdAccountId(metaAdAccountId)) !== "" &&
    normalizeNonEmptyString(countryCode) !== "" &&
    (mode === "STUB" || Boolean(backendStatus?.hasAccessToken));

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
  const stepCampaignOk = createdMetaCampaignId !== "";
  const stepAdSetOk = createdMetaAdSetId !== "";
  const stepAdOk = createdMetaAdId !== "";
  const campaignEntityModeLabel = createdMetaCampaignId ? (createdMetaCampaignIdIsReal ? "REAL" : "STUB") : "—";
  const adSetEntityId = normalizeNonEmptyString(created?.metaAdSet?.id) || createdMetaAdSetId;
  const adSetEntityModeLabel = adSetEntityId ? (isRealMetaId(adSetEntityId) ? "REAL" : "STUB") : "—";
  const adEntityId = normalizeNonEmptyString(created?.metaAd?.id) || createdMetaAdId;
  const adEntityModeLabel = adEntityId ? (isRealMetaId(adEntityId) ? "REAL" : "STUB") : "—";

  const canCreateAdSet =
    !loading &&
    !isCreatingAny &&
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
    !isCreatingAny &&
    !adCreating &&
    createdGeneratedCampaignId !== "" &&
    createdMetaAdSetId !== "" &&
    normalizeNonEmptyString(adName) !== "" &&
    (flowMode === "STUB" || (Boolean(backendStatus?.hasAccessToken) && normalizeNonEmptyString(adCreativeId) !== ""));

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

  function handleSelectGeneratedCampaignRow(gc) {
    setError("");
    setErrorDetails(null);
    setSuccess("");
    selectGeneratedCampaignRow(gc);
  }

  function selectGeneratedCampaignRow(gc) {
    const metaCampaignId = normalizeNonEmptyString(gc?.meta_campaign_id);
    const inferredMode = metaCampaignId ? (metaCampaignId.startsWith("stub-") ? "STUB" : "REAL") : "REAL";

    setMode(inferredMode);

    setCreated({
      ok: true,
      mode: inferredMode,
      metaCampaign: metaCampaignId
        ? {
            id: metaCampaignId,
            status: gc?.meta_status ?? null,
            effective_status: gc?.meta_effective_status ?? null,
            objective: gc?.meta_objective ?? null,
          }
        : null,
      metaAdSet: normalizeNonEmptyString(gc?.meta_adset_id)
        ? {
            id: gc?.meta_adset_id ?? null,
            status: gc?.meta_adset_status ?? null,
            effective_status: gc?.meta_adset_effective_status ?? null,
          }
        : null,
      metaAd: normalizeNonEmptyString(gc?.meta_ad_id)
        ? {
            id: gc?.meta_ad_id ?? null,
            status: gc?.meta_ad_status ?? null,
            effective_status: gc?.meta_ad_effective_status ?? null,
          }
        : null,
      generatedCampaign: gc ?? null,
    });

    if (normalizeNonEmptyString(gc?.meta_ad_account_id)) {
      setMetaAdAccountId(gc.meta_ad_account_id);
    }
    if (normalizeNonEmptyString(gc?.country_code)) {
      setCountryCode(gc.country_code);
    }
    if (normalizeNonEmptyString(gc?.name)) {
      setName(gc.name);
    }
    if (normalizeNonEmptyString(gc?.meta_objective)) {
      setObjective(gc.meta_objective);
    }

    pushLog({
      action: "db.generated_campaigns.select",
      ok: true,
      details: { generatedCampaignId: gc?.id ?? null, metaCampaignId: metaCampaignId || null },
    });
    setSuccess("Registro selecionado. Você pode continuar o fluxo incremental a partir do DB.");
  }

  return (
    <PageShell
      title="Meta (lab): Campaign → AdSet → Ad"
      subtitle="Fluxo progressivo operacional — criação REAL sempre PAUSED"
      backFallbackTo="/configuracoes"
    >
      <ShortcutsCard stepCampaignOk={stepCampaignOk} stepAdSetOk={stepAdSetOk} stepAdOk={stepAdOk} />
      <FlowProgressCard stepCampaignOk={stepCampaignOk} stepAdSetOk={stepAdSetOk} stepAdOk={stepAdOk} />
      <ModeStatusCard
        runModeLabel={runModeLabel}
        dataModeLabel={dataModeLabel}
        metaReadyLabel={metaReadyLabel}
        dbModeLabel={dbModeLabel}
        syncProviderLabel={syncProviderLabel}
      />

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
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="pillOutline"
                disabled={!error && !errorDetails}
                onClick={async () => {
                  setSuccess("");
                  try {
                    const text = errorDetails ? safeJson(errorDetails) : String(error || "");
                    await navigator.clipboard.writeText(text);
                    setSuccess("Erro copiado para a área de transferência.");
                  } catch {
                    // ignore
                  }
                }}
              >
                Copiar
              </button>
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

      <MetaStructureCard
        created={created}
        campaignEntityModeLabel={campaignEntityModeLabel}
        adSetEntityModeLabel={adSetEntityModeLabel}
        adEntityModeLabel={adEntityModeLabel}
        countryCode={countryCode}
        countryNameByCode={countryNameByCode}
      />
      <CampaignBatchSection
        isBusy={loading || isCreatingAny}
        countriesSource={countriesSource}
        countryOptions={countryOptions}
        countryCodeToFlag={countryCodeToFlag}
        backendHasAccessToken={Boolean(backendStatus?.hasAccessToken)}
        name={name}
        objective={objective}
        adAccountNormalized={adAccountNormalized}
        createMetaCampaignSimple={createMetaCampaignSimple}
        refreshBackendStatus={refreshBackendStatus}
        refreshLocalGenerated={refreshLocalGenerated}
        pushLog={pushLog}
        setError={setError}
        setErrorDetails={setErrorDetails}
        setSuccess={setSuccess}
      />

      <BackendStatusSection
        refreshBackendStatus={refreshBackendStatus}
        isCreatingAny={isCreatingAny}
        loading={loading}
        backendStatusLoading={backendStatusLoading}
        backendStatusError={backendStatusError}
        backendStatusErrorDetails={backendStatusErrorDetails}
        setBackendStatusError={setBackendStatusError}
        setBackendStatusErrorDetails={setBackendStatusErrorDetails}
        safeJson={safeJson}
        backendStatus={backendStatus}
        validateLoading={validateLoading}
        setValidateLoading={setValidateLoading}
        validateError={validateError}
        setValidateError={setValidateError}
        validateErrorDetails={validateErrorDetails}
        setValidateErrorDetails={setValidateErrorDetails}
        validateMe={validateMe}
        setValidateMe={setValidateMe}
        validateMetaToken={validateMetaToken}
        pushLog={pushLog}
      />

      <GeneratedCampaignsSection
        localGenerated={localGenerated}
        localLoading={localLoading}
        localError={localError}
        localErrorDetails={localErrorDetails}
        createdGeneratedCampaignId={createdGeneratedCampaignId}
        refreshDisabled={localLoading || loading || isCreatingAny}
        onRefresh={refreshLocalGenerated}
        onDismissError={() => {
          setLocalError("");
          setLocalErrorDetails(null);
        }}
        selectDisabled={localLoading || isCreatingAny}
        onSelect={handleSelectGeneratedCampaignRow}
        safeJson={safeJson}
        countryCodeToFlag={countryCodeToFlag}
      />

      <OpsLogsSection
        opsLogs={opsLogs}
        filteredOpsLogs={filteredOpsLogs}
        opsLogsFilter={opsLogsFilter}
        setOpsLogs={setOpsLogs}
        setOpsLogsFilter={setOpsLogsFilter}
        safeJson={safeJson}
        setError={setError}
        setErrorDetails={setErrorDetails}
        setSuccess={setSuccess}
      />

      <StepCampaignSection
        refresh={refresh}
        refreshDisabled={loading || isCreatingAny}
        dataModeLabel={dataModeLabel}
        name={name}
        setName={setName}
        metaAdAccountId={metaAdAccountId}
        setMetaAdAccountId={setMetaAdAccountId}
        adAccountNormalized={adAccountNormalized}
        normalizeNonEmptyString={normalizeNonEmptyString}
        countryCode={countryCode}
        setCountryCode={setCountryCode}
        countryOptions={countryOptions}
        objective={objective}
        setObjective={setObjective}
        objectiveOptions={OBJECTIVE_OPTIONS}
        mode={mode}
        setMode={setMode}
        canCreate={canCreate}
        campaignCreating={campaignCreating}
        onCreateCampaign={async () => {
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
          }
        }}
        canListPaused={
          normalizeNonEmptyString(metaAdAccountId) !== "" && !metaLoading && Boolean(backendStatus?.hasAccessToken)
        }
        metaLoading={metaLoading}
        onListPaused={async () => {
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
        stepCampaignOk={stepCampaignOk}
        onScrollToAdSetStep={() => scrollToSection("meta-test-step-adset")}
        backendHasAccessToken={Boolean(backendStatus?.hasAccessToken)}
        metaError={metaError}
        metaErrorDetails={metaErrorDetails}
        onDismissMetaError={() => {
          setMetaError("");
          setMetaErrorDetails(null);
        }}
        safeJson={safeJson}
      />

      {created?.metaCampaign ? (
        <CampaignResultSection
          created={created}
          createdCountryCode={createdCountryCode}
          countryCodeToFlag={countryCodeToFlag}
          createdLoading={createdLoading}
          refreshDisabled={createdLoading || isCreatingAny || !backendStatus?.hasAccessToken || !isRealMetaId(created.metaCampaign?.id)}
          onRefreshGraph={async () => {
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
          graphInfoText={
            isRealMetaId(created.metaCampaign?.id)
              ? "Usa `GET /api/meta/campaigns/:id` via backend."
              : "STUB não consulta Graph."
          }
        />
      ) : null}

      <PausedMetaCampaignsSection metaLoading={metaLoading} metaCampaigns={metaCampaigns} />

      <StepAdSetSection
        createdMetaCampaignId={createdMetaCampaignId}
        adSetName={adSetName}
        setAdSetName={setAdSetName}
        countryCodeValue={created?.generatedCampaign?.country_code ?? countryCode}
        adSetDailyBudget={adSetDailyBudget}
        setAdSetDailyBudget={setAdSetDailyBudget}
        adSetBillingEvent={adSetBillingEvent}
        setAdSetBillingEvent={setAdSetBillingEvent}
        adSetOptimizationGoal={adSetOptimizationGoal}
        setAdSetOptimizationGoal={setAdSetOptimizationGoal}
        canCreateAdSet={canCreateAdSet}
        adSetCreating={adSetCreating}
        onCreateAdSet={async () => {
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
          }
        }}
        stepAdSetOk={stepAdSetOk}
        onScrollToAdStep={() => scrollToSection("meta-test-step-ad")}
        createdGeneratedCampaignId={createdGeneratedCampaignId}
        countryCodeForPayload={created?.generatedCampaign?.country_code ?? countryCode ?? null}
        flowMode={flowMode}
        normalizeNonEmptyString={normalizeNonEmptyString}
      />

      <StepAdSection
        createdMetaAdSetId={createdMetaAdSetId}
        adName={adName}
        setAdName={setAdName}
        adCreativeId={adCreativeId}
        setAdCreativeId={setAdCreativeId}
        canCreateAd={canCreateAd}
        adCreating={adCreating}
        onCreateAd={async () => {
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
          }
        }}
        createdGeneratedCampaignId={createdGeneratedCampaignId}
        flowMode={flowMode}
        normalizeNonEmptyString={normalizeNonEmptyString}
      />
    </PageShell>
  );
}
