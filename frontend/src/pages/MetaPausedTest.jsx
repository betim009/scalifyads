import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
import CollapsibleCard from "./metaTest/CollapsibleCard.jsx";
import JsonAccordion from "./metaTest/JsonAccordion.jsx";
import SectionDivider from "./metaTest/SectionDivider.jsx";
import StepAdSetSection from "./metaTest/StepAdSetSection.jsx";
import StepAdSection from "./metaTest/StepAdSection.jsx";
import StepCampaignSection from "./metaTest/StepCampaignSection.jsx";
import PausedMetaCampaignsSection from "./metaTest/PausedMetaCampaignsSection.jsx";
import MetaStructureCard from "./metaTest/MetaStructureCard.jsx";
import CampaignResultSection from "./metaTest/CampaignResultSection.jsx";
import CampaignBatchSection from "./metaTest/CampaignBatchSection.jsx";
import AdRealAcceptanceCard from "./metaTest/AdRealAcceptanceCard.jsx";
import CreativeRealAcceptanceCard from "./metaTest/CreativeRealAcceptanceCard.jsx";
import GraphRefreshSection from "./metaTest/GraphRefreshSection.jsx";
import { getCountries } from "../services/reference.js";
import { countryCodeToFlag } from "../services/fallbacks.js";
import { getGeneratedCampaignStructure, listGeneratedCampaigns } from "../services/generatedCampaigns.js";
import { listOpsLogs } from "../services/opsLogs.js";
import { listCreativeAssets, uploadCreativeAsset } from "../services/creativeAssets.js";
import { createCreativeDraft, duplicateCreativeDraft, listCreativeDrafts } from "../services/creativeDrafts.js";
import {
  fetchMetaCreative,
  fetchMetaCreativePreviews,
  publishCreativeDraftAndExtractId,
} from "./metaTest/actions/creativeActions.js";
import { createCampaignSimple, listPausedCampaigns } from "./metaTest/actions/campaignActions.js";
import { createAdSet } from "./metaTest/actions/adSetActions.js";
import { createAd, fetchMetaAdPreviews } from "./metaTest/actions/adActions.js";
import { fetchGraphAd, fetchGraphAdSet, fetchGraphCampaign } from "./metaTest/actions/graphActions.js";
import {
  fetchBackendDiagnostics,
  fetchBackendStatus,
  listPages,
  validateBackendToken,
  validatePage,
} from "./metaTest/actions/statusActions.js";
import useOpsLogs from "./metaTest/useOpsLogs.js";
import {
  copyJsonToClipboard,
  copyTextToClipboard,
  extractErrorDetails,
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
  const location = useLocation();
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
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState("");
  const [diagnosticsErrorDetails, setDiagnosticsErrorDetails] = useState(null);
  const [diagnosticsMe, setDiagnosticsMe] = useState(null);

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
  const [creativePublishForce, setCreativePublishForce] = useState(false);
  const [creativeGetLoading, setCreativeGetLoading] = useState(false);
  const [creativeGetResult, setCreativeGetResult] = useState(null);
  const [previewAdFormat, setPreviewAdFormat] = useState("DESKTOP_FEED_STANDARD");
  const [creativePreviewLoading, setCreativePreviewLoading] = useState(false);
  const [creativePreviewError, setCreativePreviewError] = useState("");
  const [creativePreviewErrorDetails, setCreativePreviewErrorDetails] = useState(null);
  const [creativePreviewResult, setCreativePreviewResult] = useState(null);
  const [adPreviewLoading, setAdPreviewLoading] = useState(false);
  const [adPreviewError, setAdPreviewError] = useState("");
  const [adPreviewErrorDetails, setAdPreviewErrorDetails] = useState(null);
  const [adPreviewResult, setAdPreviewResult] = useState(null);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState("");
  const [pagesErrorDetails, setPagesErrorDetails] = useState(null);
  const [pagesResult, setPagesResult] = useState(null);
  const [pageValidateLoading, setPageValidateLoading] = useState(false);
  const [pageValidateError, setPageValidateError] = useState("");
  const [pageValidateErrorDetails, setPageValidateErrorDetails] = useState(null);
  const [pageValidateResult, setPageValidateResult] = useState(null);

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
  const selectedCreativeDraftMetaCreativeId = normalizeNonEmptyString(selectedCreativeDraft?.meta_creative_id);
  const selectedCreativeDraftMetaCreativeIdIsReal =
    selectedCreativeDraftMetaCreativeId !== "" && isRealMetaId(selectedCreativeDraftMetaCreativeId);

  const { opsLogs, setOpsLogs, opsLogsFilter, setOpsLogsFilter, filteredOpsLogs, pushLog } = useOpsLogs();

  const isCreatingAny = campaignCreating || adSetCreating || adCreating;

  function captureError(err, fallbackMessage) {
    const details = extractErrorDetails(err);
    const metaUserMsg =
      typeof details?.error_user_msg === "string" && details.error_user_msg.trim()
        ? details.error_user_msg.trim()
        : "";
    const metaUserTitle =
      typeof details?.error_user_title === "string" && details.error_user_title.trim()
        ? details.error_user_title.trim()
        : "";
    const message = metaUserMsg || metaUserTitle || (err?.message ? String(err.message) : "") || fallbackMessage || "Erro";
    setError(message);
    setErrorDetails(details);
    setSuccess("");
    return { message, details };
  }

  function scrollToSection(sectionId) {
    try {
      const el = document.getElementById(sectionId);
      if (el) {
        const details = el.getAttribute("data-collapsible-card") ? el.querySelector("details") : null;
        if (details && !details.open) details.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
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
      const res = await fetchBackendStatus();
      setBackendStatus(res);
      pushLog({ action: "meta.status", ok: true, details: { hasAccessToken: res?.hasAccessToken } });
    } catch (err) {
      setBackendStatus(null);
      setBackendStatusError(err?.message ? String(err.message) : "Falha ao consultar /api/meta/status.");
      setBackendStatusErrorDetails(extractErrorDetails(err));
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
        if (typeof parsed.previewAdFormat === "string") setPreviewAdFormat(parsed.previewAdFormat);
      }
    } catch {
      // ignore
    }

    // Optional: deep-link prefill (ex: from `/nova-campanha`).
    // Query params are treated as an explicit override over the saved draft.
    try {
      const params = new URLSearchParams(location.search || "");
      const nameParam = normalizeNonEmptyString(params.get("name"));
      if (nameParam) setName(nameParam);

      const pageIdParam = normalizeNonEmptyString(params.get("pageId") || params.get("metaPageId"));
      if (pageIdParam) setMetaPageId(pageIdParam);

      const destinationUrlParam = normalizeNonEmptyString(params.get("destinationUrl"));
      if (destinationUrlParam) setDraftDestinationUrl(destinationUrlParam);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setCreativePublishForce(false);
  }, [adCreativeDraftId]);

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
        previewAdFormat,
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
    previewAdFormat,
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

  const hasPageIdFromEnv = Boolean(backendStatus?.hasPageId);
  const hasInstagramActorIdFromEnv = Boolean(backendStatus?.hasInstagramActorId);
  const hasPageIdFromUi = normalizeNonEmptyString(metaPageId) !== "";

  const canPublishCreative =
    !loading &&
    !isCreatingAny &&
    !creativePublishing &&
    flowMode === "REAL" &&
    Boolean(backendStatus?.hasAccessToken) &&
    normalizeNonEmptyString(adCreativeDraftId) !== "" &&
    selectedCreativeDraftHasUrl &&
    (hasPageIdFromUi || hasPageIdFromEnv) &&
    (!selectedCreativeDraftMetaCreativeIdIsReal || creativePublishForce);

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
      const details = extractErrorDetails(err);
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
      const details = extractErrorDetails(err);
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
      setDbOpsLogsErrorDetails(extractErrorDetails(err));
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
      setAssetsErrorDetails(extractErrorDetails(err));
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
      setDraftsErrorDetails(extractErrorDetails(err));
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
      await copyJsonToClipboard(payload);
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

      await copyJsonToClipboard(payload);
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

      <CollapsibleCard
        id="meta-test-recovery"
        title="Recuperação operacional"
        description="Exporta um JSON com IDs, registro selecionado, estrutura persistida e logs do DB para troubleshooting rápido."
        defaultOpen={false}
        headerRight={
          <>
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
          </>
        }
      />

      <CollapsibleCard
        id="meta-test-rules"
        title="Regras (segurança)"
        description="Guardrails do lab (token no backend + REAL sempre PAUSED)."
        defaultOpen={false}
      >
        <ul className="muted" style={{ marginTop: 0, fontWeight: 800, lineHeight: 1.55, paddingLeft: 18 }}>
          <li>Esta página NÃO envia token para o frontend.</li>
          <li>O backend deve ter token via `META_ACCESS_TOKEN` ou `POST /api/meta/tokens`.</li>
          <li>Toda criação REAL deve nascer como `PAUSED` (forçado no backend).</li>
        </ul>
      </CollapsibleCard>

      <CollapsibleCard
        id="meta-test-modes"
        title="Modos operacionais"
        description="REAL chama Meta; STUB simula IDs; FALLBACK usa dados locais quando API/DB falha."
        defaultOpen={false}
      >
        <div className="muted" style={{ fontWeight: 800, lineHeight: 1.55 }}>
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
      </CollapsibleCard>

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
                    await copyTextToClipboard(text);
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
          <JsonAccordion title="Detalhes (erro)" value={errorDetails} safeJson={safeJson} />
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

      <SectionDivider
        id="meta-test-section-flow"
        title="Operação — fluxo principal"
        subtitle="Campaign → AdSet → Ad (execute de cima para baixo)"
        tone="flow"
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
            const res = await createCampaignSimple({
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
            const res = await listPausedCampaigns({ metaAdAccountId: adAccountNormalized || metaAdAccountId.trim() });
            setMetaCampaigns(res.metaCampaigns ?? []);
            pushLog({
              action: "meta.adaccount.campaigns.list",
              ok: true,
              details: { count: (res.metaCampaigns ?? []).length },
            });
          } catch (err) {
            setMetaError(err?.message ? String(err.message) : "Falha ao listar campanhas na Meta (PAUSED).");
            const details = extractErrorDetails(err);
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
            const res = await createAdSet(payload);
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
        metaAdAccountId={metaAdAccountId}
        metaPageId={metaPageId}
        setMetaPageId={setMetaPageId}
        metaInstagramActorId={metaInstagramActorId}
        setMetaInstagramActorId={setMetaInstagramActorId}
        backendHasPageId={hasPageIdFromEnv}
        backendHasInstagramActorId={hasInstagramActorIdFromEnv}
        pageValidateLoading={pageValidateLoading}
        pageValidateError={pageValidateError}
        pageValidateErrorDetails={pageValidateErrorDetails}
        pageValidateResult={pageValidateResult}
        onValidatePage={async () => {
          const id = normalizeNonEmptyString(metaPageId);
          if (!id) {
            setPageValidateResult(null);
            setPageValidateError("Page ID ausente. Preencha o campo Page ID acima.");
            setPageValidateErrorDetails(null);
            return;
          }

          setPageValidateLoading(true);
          setPageValidateError("");
          setPageValidateErrorDetails(null);
          setPageValidateResult(null);
          try {
            const res = await validatePage({ metaPageId: id });
            setPageValidateResult(res?.metaPage ?? null);
            pushLog({ action: "meta.page.get", ok: true, details: { metaPageId: id } });
          } catch (err) {
            setPageValidateResult(null);
            setPageValidateError(err?.message ? String(err.message) : "Falha ao validar Page ID.");
            setPageValidateErrorDetails(extractErrorDetails(err));
            pushLog({ action: "meta.page.get", ok: false, error: err?.message ? String(err.message) : "error" });
          } finally {
            setPageValidateLoading(false);
          }
        }}
        creativePublishForce={creativePublishForce}
        setCreativePublishForce={setCreativePublishForce}
        selectedCreativeDraftMetaCreativeId={selectedCreativeDraftMetaCreativeId}
        selectedCreativeDraftMetaCreativeIdIsReal={selectedCreativeDraftMetaCreativeIdIsReal}
        canPublishCreative={canPublishCreative}
        creativeDraftHasUrl={selectedCreativeDraftHasUrl}
        creativePublishing={creativePublishing}
        canFetchCreative={canFetchCreative}
        creativeGetLoading={creativeGetLoading}
        creativeGetResult={creativeGetResult}
        previewAdFormat={previewAdFormat}
        setPreviewAdFormat={setPreviewAdFormat}
        creativePreviewLoading={creativePreviewLoading}
        creativePreviewError={creativePreviewError}
        creativePreviewErrorDetails={creativePreviewErrorDetails}
        creativePreviewResult={creativePreviewResult}
        onFetchCreativePreview={async (metaCreativeId) => {
          const id = normalizeNonEmptyString(metaCreativeId);
          if (!id) return;

          setCreativePreviewLoading(true);
          setCreativePreviewError("");
          setCreativePreviewErrorDetails(null);
          setCreativePreviewResult(null);
          setError("");
          setErrorDetails(null);
          setSuccess("");
          try {
            const res = await fetchMetaCreativePreviews(id, { adFormat: previewAdFormat });
            setCreativePreviewResult(res);
            pushLog({ action: "creative.previews", ok: true, details: { metaCreativeId: id, adFormat: previewAdFormat } });
            setSuccess(`Preview (Creative) consultado — id: ${id}`);
          } catch (err) {
            setCreativePreviewResult(null);
            setCreativePreviewError(err?.message ? String(err.message) : "Falha ao consultar preview do Creative.");
            setCreativePreviewErrorDetails(extractErrorDetails(err));
            pushLog({
              action: "creative.previews",
              ok: false,
              error: err?.message ? String(err.message) : "error",
              details: { metaCreativeId: id, adFormat: previewAdFormat, errorDetails: extractErrorDetails(err) },
            });
          } finally {
            setCreativePreviewLoading(false);
          }
        }}
        adPreviewLoading={adPreviewLoading}
        adPreviewError={adPreviewError}
        adPreviewErrorDetails={adPreviewErrorDetails}
        adPreviewResult={adPreviewResult}
        onFetchAdPreview={async (metaAdId) => {
          const id = normalizeNonEmptyString(metaAdId);
          if (!id) return;

          setAdPreviewLoading(true);
          setAdPreviewError("");
          setAdPreviewErrorDetails(null);
          setAdPreviewResult(null);
          setError("");
          setErrorDetails(null);
          setSuccess("");
          try {
            const res = await fetchMetaAdPreviews(id, { adFormat: previewAdFormat });
            setAdPreviewResult(res);
            pushLog({ action: "ad.previews", ok: true, details: { metaAdId: id, adFormat: previewAdFormat } });
            setSuccess(`Preview (Ad) consultado — id: ${id}`);
          } catch (err) {
            setAdPreviewResult(null);
            setAdPreviewError(err?.message ? String(err.message) : "Falha ao consultar preview do Ad.");
            setAdPreviewErrorDetails(extractErrorDetails(err));
            pushLog({
              action: "ad.previews",
              ok: false,
              error: err?.message ? String(err.message) : "error",
              details: { metaAdId: id, adFormat: previewAdFormat, errorDetails: extractErrorDetails(err) },
            });
          } finally {
            setAdPreviewLoading(false);
          }
        }}
        pagesLoading={pagesLoading}
        pagesResult={pagesResult}
        pagesError={pagesError}
        pagesErrorDetails={pagesErrorDetails}
        onListPages={async () => {
          setPagesLoading(true);
          setPagesError("");
          setPagesErrorDetails(null);
          try {
            const res = await listPages({ metaAdAccountId });
            setPagesResult({
              metaAdAccountId: res?.metaAdAccountId ?? null,
              myPages: res?.myPages ?? [],
              promotePages: res?.promotePages ?? [],
              businesses: res?.businesses ?? [],
              ownedPagesByBusiness: res?.ownedPagesByBusiness ?? [],
              adAccountBusiness: res?.adAccountBusiness ?? null,
              ownedPagesFromAdAccountBusiness: res?.ownedPagesFromAdAccountBusiness ?? [],
            });
            pushLog({ action: "meta.pages.list", ok: true, details: { metaAdAccountId: res?.metaAdAccountId ?? null } });
          } catch (err) {
            setPagesResult(null);
            setPagesError(err?.message ? String(err.message) : "Falha ao listar Pages (Graph).");
            setPagesErrorDetails(extractErrorDetails(err));
            pushLog({ action: "meta.pages.list", ok: false, error: err?.message ? String(err.message) : "error" });
          } finally {
            setPagesLoading(false);
          }
        }}
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
            const { metaId, metaCreative } = await publishCreativeDraftAndExtractId(id, {
              pageId: metaPageId,
              instagramActorId: metaInstagramActorId,
              force: creativePublishForce,
            });
            if (metaId) setAdCreativeId(metaId);
            if (metaCreative) setCreativeGetResult(metaCreative);

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
              ...(flowMode === "REAL" && normalizeNonEmptyString(adCreativeId) ? { creativeId: adCreativeId.trim() } : null),
              mode: flowMode,
            };
            const res = await createAd(payload);
            setCreated((prev) => ({
              ...(prev ?? {}),
              mode: res.mode ?? prev?.mode ?? flowMode,
              metaAdCreate: {
                ...(prev?.metaAdCreate ?? {}),
                creativeIdSource: res.creativeIdSource ?? prev?.metaAdCreate?.creativeIdSource ?? null,
              },
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
                creativeIdSource: res?.creativeIdSource ?? null,
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
        createdMetaAdId={createdMetaAdId}
        flowMode={flowMode}
        normalizeNonEmptyString={normalizeNonEmptyString}
      />

      <CreativeRealAcceptanceCard
        flowMode={flowMode}
        backendHasPageId={hasPageIdFromEnv}
        metaPageId={metaPageId}
        metaInstagramActorId={metaInstagramActorId}
        creativePublishForce={creativePublishForce}
        selectedCreativeDraft={selectedCreativeDraft}
        adCreativeId={adCreativeId}
        creativeGetResult={creativeGetResult}
        isRealMetaId={isRealMetaId}
        normalizeNonEmptyString={normalizeNonEmptyString}
        onCopyEvidence={async () => {
          setError("");
          setErrorDetails(null);
          setSuccess("");
          try {
            const payload = {
              generatedCampaignId: createdGeneratedCampaignId || null,
              flowMode,
              page: {
                pageIdUi: normalizeNonEmptyString(metaPageId) || null,
                hasPageIdEnv: Boolean(hasPageIdFromEnv),
                instagramActorIdUi: normalizeNonEmptyString(metaInstagramActorId) || null,
              },
              creativeDraft: selectedCreativeDraft
                ? {
                    id: selectedCreativeDraft?.id ?? null,
                    destination_url: selectedCreativeDraft?.destination_url ?? null,
                    cta_type: selectedCreativeDraft?.cta_type ?? null,
                    creative_asset_id: selectedCreativeDraft?.creative_asset_id ?? null,
                    meta_creative_id: selectedCreativeDraft?.meta_creative_id ?? null,
                  }
                : null,
              creative: {
                creativeIdInput: normalizeNonEmptyString(adCreativeId) || null,
                forceRepublish: creativePublishForce === true,
                graphGet: creativeGetResult ?? null,
              },
            };
            await copyJsonToClipboard(payload);
            setSuccess("Evidência P4 copiada para a área de transferência.");
            pushLog({
              action: "p4.acceptance.copy",
              ok: true,
              details: { generatedCampaignId: createdGeneratedCampaignId || null },
            });
          } catch (err) {
            setError("Não foi possível copiar a evidência P4.");
            setErrorDetails(err?.message ? String(err.message) : null);
            pushLog({
              action: "p4.acceptance.copy",
              ok: false,
              error: err?.message ? String(err.message) : "error",
            });
          }
        }}
      />

      <AdRealAcceptanceCard
        flowMode={flowMode}
        created={created}
        selectedCreativeDraft={selectedCreativeDraft}
        adCreativeId={adCreativeId}
        isRealMetaId={isRealMetaId}
        normalizeNonEmptyString={normalizeNonEmptyString}
        onCopyEvidence={async () => {
          setError("");
          setErrorDetails(null);
          setSuccess("");
	          try {
	            const effectiveCreativeId =
	              normalizeNonEmptyString(adCreativeId) ||
	              normalizeNonEmptyString(selectedCreativeDraft?.meta_creative_id) ||
	              null;
	            const payload = {
	              generatedCampaignId: createdGeneratedCampaignId || null,
	              flowMode,
	              meta: {
	                campaignId: created?.metaCampaign?.id ?? null,
	                adsetId: created?.metaAdSet?.id ?? null,
	                adId: created?.metaAd?.id ?? null,
	                adEffectiveStatus: created?.metaAd?.effective_status ?? null,
	                creativeIdSource: created?.metaAdCreate?.creativeIdSource ?? null,
	              },
	              creativeDraft: selectedCreativeDraft
	                ? {
	                    id: selectedCreativeDraft?.id ?? null,
	                    destination_url: selectedCreativeDraft?.destination_url ?? null,
	                    cta_type: selectedCreativeDraft?.cta_type ?? null,
	                    creative_asset_id: selectedCreativeDraft?.creative_asset_id ?? null,
	                    meta_creative_id: selectedCreativeDraft?.meta_creative_id ?? null,
	                  }
	                : null,
	              adCreativeIdInput: normalizeNonEmptyString(adCreativeId) || null,
	              creativeIdEffective: effectiveCreativeId,
	            };
	            await copyJsonToClipboard(payload);
	            setSuccess("Evidência P5 copiada para a área de transferência.");
	            pushLog({
	              action: "p5.acceptance.copy",
	              ok: true,
              details: { generatedCampaignId: createdGeneratedCampaignId || null },
            });
          } catch (err) {
            setError("Não foi possível copiar a evidência P5.");
            setErrorDetails(err?.message ? String(err.message) : null);
            pushLog({ action: "p5.acceptance.copy", ok: false, error: err?.message ? String(err.message) : "error" });
          }
        }}
      />

      <SectionDivider
        id="meta-test-section-ops"
        title="Operação — avançado"
        subtitle="Batch, status/token e utilitários"
        tone="default"
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
        createMetaCampaignSimple={createCampaignSimple}
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
        validateMetaToken={validateBackendToken}
        diagnosticsLoading={diagnosticsLoading}
        setDiagnosticsLoading={setDiagnosticsLoading}
        diagnosticsError={diagnosticsError}
        setDiagnosticsError={setDiagnosticsError}
        diagnosticsErrorDetails={diagnosticsErrorDetails}
        setDiagnosticsErrorDetails={setDiagnosticsErrorDetails}
        diagnosticsMe={diagnosticsMe}
        setDiagnosticsMe={setDiagnosticsMe}
        getMetaDiagnostics={fetchBackendDiagnostics}
        pushLog={pushLog}
      />

      <SectionDivider
        id="meta-test-section-db"
        title="Persistência (DB)"
        subtitle="Evidências: generated_campaigns + estrutura + creative drafts/assets"
        tone="db"
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

      <SectionDivider
        id="meta-test-section-troubleshooting"
        title="Troubleshooting"
        subtitle="Logs locais e logs persistidos (DB)"
        tone="troubleshooting"
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

      <SectionDivider
        id="meta-test-section-graph"
        title="Graph (REAL)"
        subtitle="Consultas diretas via backend (somente IDs reais)"
        tone="graph"
      />

      <PausedMetaCampaignsSection metaLoading={metaLoading} metaCampaigns={metaCampaigns} />

      <GraphRefreshSection
        createdLoading={createdLoading}
        setCreatedLoading={setCreatedLoading}
        adSetGraphLoading={adSetGraphLoading}
        setAdSetGraphLoading={setAdSetGraphLoading}
        adGraphLoading={adGraphLoading}
        setAdGraphLoading={setAdGraphLoading}
        isCreatingAny={isCreatingAny}
        backendHasAccessToken={Boolean(backendStatus?.hasAccessToken)}
        createdMetaCampaignIdIsReal={createdMetaCampaignIdIsReal}
        createdMetaCampaignId={createdMetaCampaignId}
        adSetEntityIdIsReal={adSetEntityIdIsReal}
        adSetEntityId={adSetEntityId}
        adEntityIdIsReal={adEntityIdIsReal}
        adEntityId={adEntityId}
        setError={setError}
        setErrorDetails={setErrorDetails}
        setSuccess={setSuccess}
        captureError={captureError}
        setCreated={setCreated}
        refreshLocalGenerated={refreshLocalGenerated}
        refreshStructure={refreshStructure}
        createdGeneratedCampaignId={createdGeneratedCampaignId}
        pushLog={pushLog}
        fetchGraphCampaign={fetchGraphCampaign}
        fetchGraphAdSet={fetchGraphAdSet}
        fetchGraphAd={fetchGraphAd}
      />
    </PageShell>
  );
}
