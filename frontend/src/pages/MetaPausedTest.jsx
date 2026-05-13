import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import ShortcutsCard from "./metaTest/ShortcutsCard.jsx";
import FlowProgressCard from "./metaTest/FlowProgressCard.jsx";
import ModeStatusCard from "./metaTest/ModeStatusCard.jsx";
import BackendStatusSection from "./metaTest/BackendStatusSection.jsx";
import OpsLogsSection from "./metaTest/OpsLogsSection.jsx";
import OpsLogsDbSection from "./metaTest/OpsLogsDbSection.jsx";
import GeneratedCampaignsSection from "./metaTest/GeneratedCampaignsSection.jsx";
import GeneratedStructureSection from "./metaTest/GeneratedStructureSection.jsx";
import CreativeAssetsSection from "./metaTest/CreativeAssetsSection.jsx";
import CreativeDraftsSection from "./metaTest/CreativeDraftsSection.jsx";
import StepAdSetSection from "./metaTest/StepAdSetSection.jsx";
import StepAdSection from "./metaTest/StepAdSection.jsx";
import StepCampaignSection from "./metaTest/StepCampaignSection.jsx";
import PausedMetaCampaignsSection from "./metaTest/PausedMetaCampaignsSection.jsx";
import MetaStructureCard from "./metaTest/MetaStructureCard.jsx";
import CampaignResultSection from "./metaTest/CampaignResultSection.jsx";
import CampaignBatchSection from "./metaTest/CampaignBatchSection.jsx";
import { getCountries } from "../services/reference.js";
import { createMetaCampaignSimple, getMetaCampaign, listMetaAdAccountCampaigns } from "../services/metaCampaigns.js";
import { createMetaAdSet, getMetaAdSet } from "../services/metaAdSets.js";
import { createMetaAd, getMetaAd } from "../services/metaAds.js";
import { getMetaStatus, validateMetaToken } from "../services/metaStatus.js";
import { countryCodeToFlag } from "../services/fallbacks.js";
import { getGeneratedCampaignStructure, listGeneratedCampaigns } from "../services/generatedCampaigns.js";
import { listOpsLogs } from "../services/opsLogs.js";
import { listCreativeAssets, uploadCreativeAsset } from "../services/creativeAssets.js";
import { createCreativeDraft, duplicateCreativeDraft, listCreativeDrafts } from "../services/creativeDrafts.js";
import { publishCreativeDraftAndExtractId, fetchMetaCreative } from "./metaTest/actions/creativeActions.js";
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
  const [adSetGraphLoading, setAdSetGraphLoading] = useState(false);
  const [adGraphLoading, setAdGraphLoading] = useState(false);

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
  const [adCreativeDraftId, setAdCreativeDraftId] = useState("");
  const [metaPageId, setMetaPageId] = useState("");
  const [metaInstagramActorId, setMetaInstagramActorId] = useState("");
  const [adCreating, setAdCreating] = useState(false);
  const [creativePublishing, setCreativePublishing] = useState(false);
  const [creativeGetLoading, setCreativeGetLoading] = useState(false);
  const [creativeGetResult, setCreativeGetResult] = useState(null);

  // Evidência de persistência local
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [localErrorDetails, setLocalErrorDetails] = useState(null);
  const [localGenerated, setLocalGenerated] = useState([]);

  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState("");
  const [structureErrorDetails, setStructureErrorDetails] = useState(null);
  const [structureAdSets, setStructureAdSets] = useState([]);
  const [structureAds, setStructureAds] = useState([]);
  const [structureForId, setStructureForId] = useState("");

  const [dbOpsLogsLoading, setDbOpsLogsLoading] = useState(false);
  const [dbOpsLogsError, setDbOpsLogsError] = useState("");
  const [dbOpsLogsErrorDetails, setDbOpsLogsErrorDetails] = useState(null);
  const [dbOpsLogs, setDbOpsLogs] = useState([]);

  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState("");
  const [assetsErrorDetails, setAssetsErrorDetails] = useState(null);
  const [creativeAssets, setCreativeAssets] = useState([]);
  const [assetUploading, setAssetUploading] = useState(false);

  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState("");
  const [draftsErrorDetails, setDraftsErrorDetails] = useState(null);
  const [creativeDrafts, setCreativeDrafts] = useState([]);
  const [draftCreating, setDraftCreating] = useState(false);
  const [draftAssetId, setDraftAssetId] = useState("");
  const [draftPrimaryText, setDraftPrimaryText] = useState("");
  const [draftHeadline, setDraftHeadline] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftCtaType, setDraftCtaType] = useState("");
  const [draftDestinationUrl, setDraftDestinationUrl] = useState("");

  const selectedCreativeDraft = useMemo(
    () => (creativeDrafts ?? []).find((d) => d?.id === adCreativeDraftId) ?? null,
    [creativeDrafts, adCreativeDraftId],
  );
  const selectedCreativeDraftHasUrl = normalizeNonEmptyString(selectedCreativeDraft?.destination_url) !== "";

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
    refreshCreativeAssets();
    refreshCreativeDrafts(createdGeneratedCampaignId);
    try {
      const raw = localStorage.getItem("metaTest.draft.v1");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.mode === "string") setMode(parsed.mode === "STUB" ? "STUB" : "REAL");
        if (typeof parsed.name === "string") setName(parsed.name);
        if (typeof parsed.objective === "string") setObjective(parsed.objective);
        if (typeof parsed.metaAdAccountId === "string") setMetaAdAccountId(parsed.metaAdAccountId);
        if (typeof parsed.countryCode === "string") setCountryCode(parsed.countryCode);
        if (typeof parsed.adSetName === "string") setAdSetName(parsed.adSetName);
        if (typeof parsed.adSetDailyBudget === "string") setAdSetDailyBudget(parsed.adSetDailyBudget);
        if (typeof parsed.adSetBillingEvent === "string") setAdSetBillingEvent(parsed.adSetBillingEvent);
        if (typeof parsed.adSetOptimizationGoal === "string") setAdSetOptimizationGoal(parsed.adSetOptimizationGoal);
        if (typeof parsed.adName === "string") setAdName(parsed.adName);
        if (typeof parsed.adCreativeId === "string") setAdCreativeId(parsed.adCreativeId);
        if (typeof parsed.adCreativeDraftId === "string") setAdCreativeDraftId(parsed.adCreativeDraftId);
        if (typeof parsed.metaPageId === "string") setMetaPageId(parsed.metaPageId);
        if (typeof parsed.metaInstagramActorId === "string") setMetaInstagramActorId(parsed.metaInstagramActorId);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const draft = {
        mode,
        name,
        objective,
        metaAdAccountId,
        countryCode,
        adSetName,
        adSetDailyBudget,
        adSetBillingEvent,
        adSetOptimizationGoal,
        adName,
        adCreativeId,
        adCreativeDraftId,
        metaPageId,
        metaInstagramActorId,
      };
      localStorage.setItem("metaTest.draft.v1", JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [
    mode,
    name,
    objective,
    metaAdAccountId,
    countryCode,
    adSetName,
    adSetDailyBudget,
    adSetBillingEvent,
    adSetOptimizationGoal,
    adName,
    adCreativeId,
    adCreativeDraftId,
    metaPageId,
    metaInstagramActorId,
  ]);

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
  const adSetEntityIdIsReal = isRealMetaId(adSetEntityId);
  const adSetEntityModeLabel = adSetEntityId ? (isRealMetaId(adSetEntityId) ? "REAL" : "STUB") : "—";
  const adEntityId = normalizeNonEmptyString(created?.metaAd?.id) || createdMetaAdId;
  const adEntityIdIsReal = isRealMetaId(adEntityId);
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

  const canPublishCreative =
    !loading &&
    !isCreatingAny &&
    !creativePublishing &&
    flowMode === "REAL" &&
    Boolean(backendStatus?.hasAccessToken) &&
    normalizeNonEmptyString(adCreativeDraftId) !== "" &&
    selectedCreativeDraftHasUrl;

  const canFetchCreative =
    !loading &&
    !isCreatingAny &&
    !creativeGetLoading &&
    flowMode === "REAL" &&
    Boolean(backendStatus?.hasAccessToken) &&
    normalizeNonEmptyString(adCreativeId) !== "";

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

  async function refreshStructure(forId) {
    const id = normalizeNonEmptyString(forId);
    if (!id) {
      setStructureForId("");
      setStructureAdSets([]);
      setStructureAds([]);
      return;
    }

    setStructureLoading(true);
    setStructureError("");
    setStructureErrorDetails(null);
    try {
      const res = await getGeneratedCampaignStructure(id);
      setStructureForId(id);
      setStructureAdSets(res.generatedAdSets ?? []);
      setStructureAds(res.generatedAds ?? []);
      pushLog({
        action: "db.generated_structure.get",
        ok: true,
        details: { generatedCampaignId: id, adsets: (res.generatedAdSets ?? []).length, ads: (res.generatedAds ?? []).length },
      });
    } catch (err) {
      setStructureForId(id);
      setStructureAdSets([]);
      setStructureAds([]);
      setStructureError(err?.message ? String(err.message) : "Falha ao carregar estrutura (generated_adsets/generated_ads).");
      const details = err?.body?.error?.details ?? err?.body ?? null;
      setStructureErrorDetails(details);
      pushLog({
        action: "db.generated_structure.get",
        ok: false,
        error: err?.message ? String(err.message) : "error",
        details,
      });
    } finally {
      setStructureLoading(false);
    }
  }

  async function refreshDbOpsLogs() {
    setDbOpsLogsLoading(true);
    setDbOpsLogsError("");
    setDbOpsLogsErrorDetails(null);
    try {
      const res = await listOpsLogs({ source: "meta-test", limit: 200 });
      setDbOpsLogs(res.opsLogs ?? []);
    } catch (err) {
      setDbOpsLogs([]);
      setDbOpsLogsError(err?.message ? String(err.message) : "Falha ao carregar ops_logs (DB/API indisponível).");
      setDbOpsLogsErrorDetails(err?.body?.error?.details ?? err?.body ?? null);
    } finally {
      setDbOpsLogsLoading(false);
    }
  }

  async function refreshCreativeAssets() {
    setAssetsLoading(true);
    setAssetsError("");
    setAssetsErrorDetails(null);
    try {
      const res = await listCreativeAssets({ limit: 50 });
      setCreativeAssets(res.creativeAssets ?? []);
    } catch (err) {
      setCreativeAssets([]);
      setAssetsError(err?.message ? String(err.message) : "Falha ao carregar assets (DB/API indisponível).");
      setAssetsErrorDetails(err?.body?.error?.details ?? err?.body ?? null);
    } finally {
      setAssetsLoading(false);
    }
  }

  async function refreshCreativeDrafts(forGeneratedCampaignId) {
    const id = normalizeNonEmptyString(forGeneratedCampaignId);
    if (!id) {
      setCreativeDrafts([]);
      return;
    }
    setDraftsLoading(true);
    setDraftsError("");
    setDraftsErrorDetails(null);
    try {
      const res = await listCreativeDrafts({ generatedCampaignId: id, limit: 50 });
      setCreativeDrafts(res.creativeDrafts ?? []);
    } catch (err) {
      setCreativeDrafts([]);
      setDraftsError(err?.message ? String(err.message) : "Falha ao carregar creative drafts.");
      setDraftsErrorDetails(err?.body?.error?.details ?? err?.body ?? null);
    } finally {
      setDraftsLoading(false);
    }
  }

  function handleSelectGeneratedCampaignRow(gc) {
    setError("");
    setErrorDetails(null);
    setSuccess("");
    selectGeneratedCampaignRow(gc);
  }

  async function handleCopyGeneratedCampaignIds(gc) {
    setError("");
    setErrorDetails(null);
    setSuccess("");
    try {
      const payload = {
        generatedCampaignId: gc?.id ?? null,
        metaCampaignId: gc?.meta_campaign_id ?? null,
        metaAdSetId: gc?.meta_adset_id ?? null,
        metaAdId: gc?.meta_ad_id ?? null,
      };
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setSuccess("IDs copiados para a área de transferência.");
      pushLog({ action: "db.generated_campaigns.copy_ids", ok: true, details: payload });
    } catch (err) {
      setError("Não foi possível copiar os IDs.");
      setErrorDetails(err?.message ? String(err.message) : null);
      pushLog({
        action: "db.generated_campaigns.copy_ids",
        ok: false,
        error: err?.message ? String(err.message) : "error",
      });
    }
  }

  async function handleCopyRecoveryBundle() {
    setError("");
    setErrorDetails(null);
    setSuccess("");
    if (!createdGeneratedCampaignId) {
      setError("Selecione um registro de `generated_campaigns` primeiro.");
      setErrorDetails(null);
      return;
    }

    try {
      const payload = {
        generatedCampaignId: createdGeneratedCampaignId,
        meta: {
          metaCampaignId: created?.metaCampaign?.id ?? created?.generatedCampaign?.meta_campaign_id ?? null,
          metaAdSetId: created?.metaAdSet?.id ?? created?.generatedCampaign?.meta_adset_id ?? null,
          metaAdId: created?.metaAd?.id ?? created?.generatedCampaign?.meta_ad_id ?? null,
          runMode: created?.mode ?? mode ?? null,
        },
        generatedCampaign: created?.generatedCampaign ?? null,
        generatedAdSets: structureForId === createdGeneratedCampaignId ? structureAdSets : [],
        generatedAds: structureForId === createdGeneratedCampaignId ? structureAds : [],
        opsLogsDb: dbOpsLogs.slice(0, 200),
      };

      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setSuccess("Bundle de recuperação copiado para a área de transferência.");
      pushLog({ action: "ops.recovery_bundle.copy", ok: true, details: { generatedCampaignId: createdGeneratedCampaignId } });
    } catch (err) {
      setError("Não foi possível copiar o bundle de recuperação.");
      setErrorDetails(err?.message ? String(err.message) : null);
      pushLog({
        action: "ops.recovery_bundle.copy",
        ok: false,
        error: err?.message ? String(err.message) : "error",
      });
    }
  }

  function selectGeneratedCampaignRow(gc) {
    const metaCampaignId = normalizeNonEmptyString(gc?.meta_campaign_id);
    const inferredMode = normalizeNonEmptyString(gc?.meta_run_mode) || (metaCampaignId ? (metaCampaignId.startsWith("stub-") ? "STUB" : "REAL") : "REAL");
    const nextCountryCode = normalizeNonEmptyString(gc?.country_code) || countryCode;
    const nextName = normalizeNonEmptyString(gc?.name) || name;

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
    if (nextCountryCode) setCountryCode(nextCountryCode);
    if (nextName) setName(nextName);
    if (normalizeNonEmptyString(gc?.meta_objective)) {
      setObjective(gc.meta_objective);
    }

    if (!normalizeNonEmptyString(adSetName)) {
      const code = nextCountryCode || "XX";
      setAdSetName(`AdSet ${code} — Broad`);
    }
    if (!normalizeNonEmptyString(adName)) {
      const code = nextCountryCode || "XX";
      setAdName(`Ad ${code} — Image 1`);
    }
    setAdCreativeDraftId("");

    pushLog({
      action: "db.generated_campaigns.select",
      ok: true,
      details: { generatedCampaignId: gc?.id ?? null, metaCampaignId: metaCampaignId || null },
    });
    setSuccess("Registro selecionado. Você pode continuar o fluxo incremental a partir do DB.");

    refreshStructure(gc?.id);
    refreshCreativeDrafts(gc?.id);
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

      <div id="meta-test-recovery" className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>Recuperação operacional</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="pillOutline"
              onClick={() => {
                try {
                  localStorage.removeItem("metaTest.draft.v1");
                } catch {
                  // ignore
                }
                setSuccess("Draft local limpo.");
                setError("");
                setErrorDetails(null);
              }}
            >
              Limpar draft
            </button>
            <button
              type="button"
              className="pillOutline"
              disabled={!createdGeneratedCampaignId}
              onClick={handleCopyRecoveryBundle}
            >
              Copiar bundle (DB + logs)
            </button>
          </div>
        </div>
        <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
          Exporta um JSON com IDs, registro selecionado, estrutura persistida e logs do DB para troubleshooting rápido.
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

      <div id="meta-test-graph-refresh" className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Graph (REAL) — atualizar status</div>
        <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
          Usa `GET /api/meta/*/:id` via backend. STUB não consulta Graph.
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="pillOutline"
            disabled={
              createdLoading || isCreatingAny || !backendStatus?.hasAccessToken || !createdMetaCampaignIdIsReal
            }
            onClick={async () => {
              setCreatedLoading(true);
              setError("");
              setErrorDetails(null);
              setSuccess("");
              try {
                const res = await getMetaCampaign(createdMetaCampaignId);
                setCreated((prev) => ({
                  ...(prev ?? {}),
                  metaCampaign: res.metaCampaign ?? prev?.metaCampaign ?? null,
                }));
                setSuccess("Campaign atualizada via Graph.");
                await refreshLocalGenerated();
                pushLog({
                  action: "meta.campaign.get",
                  ok: true,
                  details: { metaCampaignId: createdMetaCampaignId, metaCampaign: res?.metaCampaign ?? null },
                });
              } catch (err) {
                const captured = captureError(err, "Falha ao consultar Campaign no Graph.");
                pushLog({
                  action: "meta.campaign.get",
                  ok: false,
                  error: captured.message || "error",
                  details: { metaCampaignId: createdMetaCampaignId, errorDetails: captured.details },
                });
              } finally {
                setCreatedLoading(false);
              }
            }}
          >
            {createdLoading ? "Consultando Campaign..." : "Consultar Campaign no Graph"}
          </button>

          <button
            type="button"
            className="pillOutline"
            disabled={adSetGraphLoading || isCreatingAny || !backendStatus?.hasAccessToken || !adSetEntityIdIsReal}
            onClick={async () => {
              setAdSetGraphLoading(true);
              setError("");
              setErrorDetails(null);
              setSuccess("");
              try {
                const res = await getMetaAdSet(adSetEntityId);
                setCreated((prev) => ({
                  ...(prev ?? {}),
                  metaAdSet: res.metaAdSet ?? prev?.metaAdSet ?? null,
                }));
                setSuccess("AdSet atualizado via Graph.");
                await refreshLocalGenerated();
                await refreshStructure(createdGeneratedCampaignId);
                pushLog({
                  action: "meta.adset.get",
                  ok: true,
                  details: { metaAdSetId: adSetEntityId, metaAdSet: res?.metaAdSet ?? null },
                });
              } catch (err) {
                const captured = captureError(err, "Falha ao consultar AdSet no Graph.");
                pushLog({
                  action: "meta.adset.get",
                  ok: false,
                  error: captured.message || "error",
                  details: { metaAdSetId: adSetEntityId, errorDetails: captured.details },
                });
              } finally {
                setAdSetGraphLoading(false);
              }
            }}
          >
            {adSetGraphLoading ? "Consultando AdSet..." : "Consultar AdSet no Graph"}
          </button>

          <button
            type="button"
            className="pillOutline"
            disabled={adGraphLoading || isCreatingAny || !backendStatus?.hasAccessToken || !adEntityIdIsReal}
            onClick={async () => {
              setAdGraphLoading(true);
              setError("");
              setErrorDetails(null);
              setSuccess("");
              try {
                const res = await getMetaAd(adEntityId);
                setCreated((prev) => ({
                  ...(prev ?? {}),
                  metaAd: res.metaAd ?? prev?.metaAd ?? null,
                }));
                setSuccess("Ad atualizado via Graph.");
                await refreshLocalGenerated();
                await refreshStructure(createdGeneratedCampaignId);
                pushLog({
                  action: "meta.ad.get",
                  ok: true,
                  details: { metaAdId: adEntityId, metaAd: res?.metaAd ?? null },
                });
              } catch (err) {
                const captured = captureError(err, "Falha ao consultar Ad no Graph.");
                pushLog({
                  action: "meta.ad.get",
                  ok: false,
                  error: captured.message || "error",
                  details: { metaAdId: adEntityId, errorDetails: captured.details },
                });
              } finally {
                setAdGraphLoading(false);
              }
            }}
          >
            {adGraphLoading ? "Consultando Ad..." : "Consultar Ad no Graph"}
          </button>

          <div className="muted" style={{ fontWeight: 800 }}>
            Requer token no backend + IDs reais (não `stub-*`).
          </div>
        </div>
      </div>
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
        onCopyIds={handleCopyGeneratedCampaignIds}
        safeJson={safeJson}
        countryCodeToFlag={countryCodeToFlag}
      />

      <GeneratedStructureSection
        generatedCampaignId={createdGeneratedCampaignId}
        structureForId={structureForId}
        loading={structureLoading}
        error={structureError}
        errorDetails={structureErrorDetails}
        generatedAdSets={structureAdSets}
        generatedAds={structureAds}
        refreshDisabled={structureLoading || loading || isCreatingAny || !createdGeneratedCampaignId}
        onRefresh={() => refreshStructure(createdGeneratedCampaignId)}
        onDismissError={() => {
          setStructureError("");
          setStructureErrorDetails(null);
        }}
        safeJson={safeJson}
      />

      <CreativeAssetsSection
        loading={assetsLoading}
        error={assetsError}
        errorDetails={assetsErrorDetails}
        assets={creativeAssets}
        onRefresh={refreshCreativeAssets}
        refreshDisabled={assetsLoading || loading || isCreatingAny}
        onDismissError={() => {
          setAssetsError("");
          setAssetsErrorDetails(null);
        }}
        uploadDisabled={assetUploading || loading || isCreatingAny}
        onUpload={async (file) => {
          if (!file) return;
          setAssetUploading(true);
          setError("");
          setErrorDetails(null);
          setSuccess("");
          try {
            const res = await uploadCreativeAsset(file);
            pushLog({
              action: "creative.asset.upload",
              ok: true,
              details: { id: res?.creativeAsset?.id ?? null, mime: res?.creativeAsset?.mime_type ?? null, size: res?.creativeAsset?.size_bytes ?? null },
            });
            setSuccess("Asset enviado e persistido.");
            await refreshCreativeAssets();
          } catch (err) {
            const captured = captureError(err, "Falha ao enviar asset.");
            pushLog({
              action: "creative.asset.upload",
              ok: false,
              error: captured.message || "error",
              details: { errorDetails: captured.details },
            });
          } finally {
            setAssetUploading(false);
          }
        }}
        safeJson={safeJson}
      />

      <CreativeDraftsSection
        generatedCampaignId={createdGeneratedCampaignId}
        assets={creativeAssets}
        drafts={creativeDrafts}
        loading={draftsLoading}
        error={draftsError}
        errorDetails={draftsErrorDetails}
        refreshDisabled={draftsLoading || loading || isCreatingAny || !createdGeneratedCampaignId}
        onRefresh={() => refreshCreativeDrafts(createdGeneratedCampaignId)}
        createDisabled={draftCreating || loading || isCreatingAny || !createdGeneratedCampaignId}
        onCreate={async () => {
          if (!createdGeneratedCampaignId) return;
          setDraftCreating(true);
          setError("");
          setErrorDetails(null);
          setSuccess("");
          try {
            const payload = {
              generatedCampaignId: createdGeneratedCampaignId,
              creativeAssetId: normalizeNonEmptyString(draftAssetId) || null,
              primaryText: normalizeNonEmptyString(draftPrimaryText) || null,
              headline: normalizeNonEmptyString(draftHeadline) || null,
              description: normalizeNonEmptyString(draftDescription) || null,
              ctaType: normalizeNonEmptyString(draftCtaType) || null,
              destinationUrl: normalizeNonEmptyString(draftDestinationUrl) || null,
            };
            const res = await createCreativeDraft(payload);
            pushLog({
              action: "creative.draft.create",
              ok: true,
              details: { id: res?.creativeDraft?.id ?? null, generatedCampaignId: createdGeneratedCampaignId },
            });
            setSuccess("Creative draft persistido.");
            setDraftAssetId("");
            setDraftPrimaryText("");
            setDraftHeadline("");
            setDraftDescription("");
            setDraftCtaType("");
            setDraftDestinationUrl("");
            await refreshCreativeDrafts(createdGeneratedCampaignId);
          } catch (err) {
            const captured = captureError(err, "Falha ao criar draft.");
            pushLog({
              action: "creative.draft.create",
              ok: false,
              error: captured.message || "error",
              details: { errorDetails: captured.details },
            });
          } finally {
            setDraftCreating(false);
          }
        }}
        onDismissError={() => {
          setDraftsError("");
          setDraftsErrorDetails(null);
        }}
        safeJson={safeJson}
        draftAssetId={draftAssetId}
        setDraftAssetId={setDraftAssetId}
        primaryText={draftPrimaryText}
        setPrimaryText={setDraftPrimaryText}
        headline={draftHeadline}
        setHeadline={setDraftHeadline}
        description={draftDescription}
        setDescription={setDraftDescription}
        ctaType={draftCtaType}
        setCtaType={setDraftCtaType}
        destinationUrl={draftDestinationUrl}
        setDestinationUrl={setDraftDestinationUrl}
        onDuplicate={async (draftId) => {
          if (!draftId) return;
          setError("");
          setErrorDetails(null);
          setSuccess("");
          try {
            const res = await duplicateCreativeDraft(draftId);
            pushLog({
              action: "creative.draft.duplicate",
              ok: true,
              details: { sourceId: draftId, id: res?.creativeDraft?.id ?? null },
            });
            setSuccess("Draft duplicado.");
            await refreshCreativeDrafts(createdGeneratedCampaignId);
          } catch (err) {
            const captured = captureError(err, "Falha ao duplicar draft.");
            pushLog({
              action: "creative.draft.duplicate",
              ok: false,
              error: captured.message || "error",
              details: { errorDetails: captured.details },
            });
          }
        }}
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

      <OpsLogsDbSection
        loading={dbOpsLogsLoading}
        error={dbOpsLogsError}
        errorDetails={dbOpsLogsErrorDetails}
        opsLogs={dbOpsLogs}
        refreshDisabled={dbOpsLogsLoading || loading || isCreatingAny}
        onRefresh={refreshDbOpsLogs}
        onDismissError={() => {
          setDbOpsLogsError("");
          setDbOpsLogsErrorDetails(null);
        }}
        safeJson={safeJson}
      />

      <StepCampaignSection
        refresh={refresh}
        refreshDisabled={loading || isCreatingAny}
        refreshLoading={loading}
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
            if (!normalizeNonEmptyString(adSetName)) {
              const code = countryCode || "XX";
              setAdSetName(`AdSet ${code} — Broad`);
            }
            if (!normalizeNonEmptyString(adName)) {
              const code = countryCode || "XX";
              setAdName(`Ad ${code} — Image 1`);
            }
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
            await refreshCreativeDrafts(res?.generatedCampaign?.id);
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
            await refreshStructure(createdGeneratedCampaignId);
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
        creativeDraftId={adCreativeDraftId}
        setCreativeDraftId={setAdCreativeDraftId}
        creativeDraftOptions={creativeDrafts}
        metaPageId={metaPageId}
        setMetaPageId={setMetaPageId}
        metaInstagramActorId={metaInstagramActorId}
        setMetaInstagramActorId={setMetaInstagramActorId}
        canPublishCreative={canPublishCreative}
        creativeDraftHasUrl={selectedCreativeDraftHasUrl}
        creativePublishing={creativePublishing}
        canFetchCreative={canFetchCreative}
        creativeGetLoading={creativeGetLoading}
        creativeGetResult={creativeGetResult}
        onFetchCreative={async () => {
          const id = normalizeNonEmptyString(adCreativeId);
          if (!id) return;

          setCreativeGetLoading(true);
          setError("");
          setErrorDetails(null);
          setSuccess("");
          try {
            const metaCreative = await fetchMetaCreative(id);
            setCreativeGetResult(metaCreative);
            pushLog({ action: "creative.get", ok: true, details: { metaCreativeId: id } });
            setSuccess(`Creative consultado no Graph — id: ${id}`);
          } catch (err) {
            const captured = captureError(err, "Falha ao consultar Creative no Graph.");
            pushLog({
              action: "creative.get",
              ok: false,
              error: captured.message || "error",
              details: { metaCreativeId: id, errorDetails: captured.details },
            });
          } finally {
            setCreativeGetLoading(false);
          }
        }}
        onPublishCreative={async () => {
          const id = normalizeNonEmptyString(adCreativeDraftId);
          if (!id) return;

          setCreativePublishing(true);
          setError("");
          setErrorDetails(null);
          setSuccess("");
          try {
            const { metaId } = await publishCreativeDraftAndExtractId(id, {
              pageId: metaPageId,
              instagramActorId: metaInstagramActorId,
            });
            if (metaId) setAdCreativeId(metaId);

            pushLog({
              action: "creative.publish",
              ok: true,
              details: { creativeDraftId: id, metaCreativeId: metaId || null },
            });
            setSuccess(`Creative REAL publicado — meta_creative_id: ${metaId || "—"}`);
            await refreshCreativeDrafts(createdGeneratedCampaignId);
          } catch (err) {
            const captured = captureError(err, "Falha ao publicar Creative REAL.");
            pushLog({
              action: "creative.publish",
              ok: false,
              error: captured.message || "error",
              details: { creativeDraftId: id, errorDetails: captured.details },
            });
          } finally {
            setCreativePublishing(false);
          }
        }}
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
              ...(normalizeNonEmptyString(adCreativeDraftId) ? { creativeDraftId: adCreativeDraftId } : null),
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
                creativeDraftId: normalizeNonEmptyString(adCreativeDraftId) || null,
              },
            });
            setSuccess(`Ad criado (${res.mode || flowMode}) — status obrigatório: PAUSED.`);
            await refreshLocalGenerated();
            await refreshStructure(createdGeneratedCampaignId);
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
