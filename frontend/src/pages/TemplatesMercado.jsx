import PageShell from "../components/PageShell.jsx";
import StatusPill from "../components/StatusPill.jsx";
import AdvancedDisclosure from "../components/AdvancedDisclosure.jsx";
import CompactVideoPreview from "../components/CompactVideoPreview.jsx";
import { useEffect, useMemo, useState } from "react";
import { createFlowTemplate, listFlowTemplates, updateFlowTemplate } from "../services/flowTemplates.js";
import { generateCampaignTemplateTranslationsByMarket } from "../services/campaignTemplates.js";
import { createOperationalMarketGeneration } from "../services/generatedCampaigns.js";
import { listMetaAccounts } from "../services/metaAccounts.js";
import { listCreativeAssets, uploadCreativeAsset } from "../services/creativeAssets.js";
import { getBackendBaseUrl } from "../services/http.js";
import {
  publishOperationalAd,
  publishOperationalAdSet,
  publishOperationalCampaign,
  publishOperationalCreative,
  syncOperationalMetaStatus,
} from "../services/operationalMarketGenerations.js";
import { OPERATIONAL_MARKETS } from "../utils/operationalMarkets.js";
import { formatBrlFromCents, formatBrlInputFromCents, parseBrlToCents } from "../utils/brlMoney.js";

const AD_KEYS = ["A", "B", "C", "D", "E"];
const DEFAULT_MARKETS = ["ARM", "AREU", "ENCA", "ENAU"];

const EMPTY_FORM = {
  name: "",
  nicheParam: "",
  destinationUrl: "",
  ctaType: "LEARN_MORE",
  objective: "OUTCOME_TRAFFIC",
  dailyBudgetCents: 1000,
  dailyBudgetBrl: formatBrlInputFromCents(1000),
  billingEvent: "IMPRESSIONS",
  optimizationGoal: "REACH",
  metaAccountId: "",
  adVariants: AD_KEYS.map((key) => ({ key, primaryText: "", headline: "", description: "" })),
  mediaByMarket: {},
};

function normalizeNonEmptyString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeJson(value) {
  return JSON.stringify(value ?? null, null, 2);
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeAsset(asset) {
  const id = normalizeNonEmptyString(asset?.id);
  if (!id) return null;
  const mimeType = normalizeNonEmptyString(asset?.mime_type || asset?.mimeType);
  return {
    creativeAssetId: id,
    mimeType,
    originalName: normalizeNonEmptyString(asset?.original_name || asset?.originalName),
    url: normalizeNonEmptyString(asset?.url),
    kind: mimeType.startsWith("image/") ? "image" : mimeType.startsWith("video/") ? "video" : "unknown",
    updatedAt: new Date().toISOString(),
  };
}

function withAutoThumbnail(entry, thumbnailAsset) {
  const thumb = normalizeAsset(thumbnailAsset);
  if (!entry || !thumb || !thumb.mimeType?.startsWith("image/")) return entry;
  return { ...entry, thumbnail: thumb };
}

function getPayload(template) {
  return normalizeObject(template?.payload);
}

function getNiche(payload) {
  const op = normalizeObject(payload?.operationalMarket);
  const campaign = normalizeObject(payload?.campaign);
  return (
    normalizeNonEmptyString(op.nicheParam) ||
    normalizeNonEmptyString(op.niche) ||
    normalizeNonEmptyString(payload?.nicheParam) ||
    normalizeNonEmptyString(payload?.niche) ||
    normalizeNonEmptyString(payload?.slug) ||
    normalizeNonEmptyString(campaign.nicheParam) ||
    normalizeNonEmptyString(campaign.niche)
  );
}

function getAdVariants(payload) {
  const source = Array.isArray(payload?.adVariants) ? payload.adVariants : [];
  return AD_KEYS.map((key, idx) => {
    const src = normalizeObject(source[idx]);
    return {
      key,
      primaryText: normalizeNonEmptyString(src.primaryText),
      headline: normalizeNonEmptyString(src.headline),
      description: normalizeNonEmptyString(src.description),
    };
  });
}

function adVariantsWithText(adVariants) {
  return (Array.isArray(adVariants) ? adVariants : []).filter(
    (variant) =>
      normalizeNonEmptyString(variant?.primaryText) ||
      normalizeNonEmptyString(variant?.headline) ||
      normalizeNonEmptyString(variant?.description),
  );
}

function templateToForm(template, { defaultMetaAccountId = "" } = {}) {
  const payload = getPayload(template);
  const creative = normalizeObject(payload.creative);
  return {
    ...EMPTY_FORM,
    name: template?.name || "",
    nicheParam: getNiche(payload),
    destinationUrl: normalizeNonEmptyString(payload.destinationUrl) || normalizeNonEmptyString(creative.destinationUrl),
    ctaType: normalizeNonEmptyString(payload.ctaType) || normalizeNonEmptyString(creative.ctaType) || "LEARN_MORE",
    objective: normalizeNonEmptyString(payload.objective) || "OUTCOME_TRAFFIC",
    dailyBudgetCents: Number(payload.dailyBudgetCents) || 1000,
    dailyBudgetBrl: formatBrlInputFromCents(Number(payload.dailyBudgetCents) || 1000),
    billingEvent: normalizeNonEmptyString(payload.billingEvent) || "IMPRESSIONS",
    optimizationGoal: normalizeNonEmptyString(payload.optimizationGoal) || "REACH",
    metaAccountId: normalizeNonEmptyString(payload.metaAccountId) || defaultMetaAccountId || "",
    adVariants: getAdVariants(payload),
    mediaByMarket: normalizeObject(payload.mediaByMarket),
  };
}

function buildPayload(form, basePayload = {}) {
  const base = normalizeObject(basePayload);
  const campaign = normalizeObject(base.campaign);
  const creative = normalizeObject(base.creative);
  const nicheParam = normalizeNonEmptyString(form.nicheParam);
  const destinationUrl = normalizeNonEmptyString(form.destinationUrl);
  const adVariants = AD_KEYS.map((key, idx) => {
    const src = normalizeObject(form.adVariants?.[idx]);
    return {
      key,
      primaryText: normalizeNonEmptyString(src.primaryText),
      headline: normalizeNonEmptyString(src.headline),
      description: normalizeNonEmptyString(src.description),
    };
  });

  return {
    ...base,
    metaAccountId: normalizeNonEmptyString(form.metaAccountId) || null,
    objective: normalizeNonEmptyString(form.objective) || "OUTCOME_TRAFFIC",
    dailyBudgetCents: Number(form.dailyBudgetCents) || 1000,
    billingEvent: normalizeNonEmptyString(form.billingEvent) || "IMPRESSIONS",
    optimizationGoal: normalizeNonEmptyString(form.optimizationGoal) || "REACH",
    nicheParam,
    niche: nicheParam,
    slug: nicheParam,
    operationalMarket: {
      ...normalizeObject(base.operationalMarket),
      nicheParam,
      niche: nicheParam,
    },
    campaign: {
      ...campaign,
      name: normalizeNonEmptyString(form.name) || campaign.name || "",
      nicheParam,
      niche: nicheParam,
    },
    primaryText: adVariants[0]?.primaryText || "",
    headline: adVariants[0]?.headline || "",
    description: adVariants[0]?.description || "",
    adVariants,
    destinationUrl,
    ctaType: normalizeNonEmptyString(form.ctaType) || "LEARN_MORE",
    creative: {
      ...creative,
      destinationUrl,
      ctaType: normalizeNonEmptyString(form.ctaType) || creative.ctaType || "LEARN_MORE",
    },
    mediaByMarket: normalizeObject(form.mediaByMarket),
  };
}

function getTranslations(payload) {
  return normalizeObject(payload?.translationsByMarket);
}

function formatBackendError(err) {
  const body = normalizeObject(err?.body);
  const message = body?.error?.message || body?.message || err?.message || "Falha ao executar etapa.";
  const details = body?.error?.details ?? body?.details ?? null;
  const errors = Array.isArray(details?.errors) ? details.errors : [];
  if (errors.length) return `${message}: ${errors.join("; ")}`;
  return Object.keys(body).length ? `${message}\n${safeJson(body)}` : message;
}

function marketInfo(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return OPERATIONAL_MARKETS.find((market) => market.code === normalized) ?? { code: normalized, name: "Mercado", language: "—" };
}

function mapGeneration(row) {
  return {
    id: row?.id ?? "",
    marketCode: row?.market_code ?? row?.marketCode ?? "",
    marketName: row?.market_name ?? row?.marketName ?? "",
    marketParam: row?.market_param ?? row?.marketParam ?? "",
    metaCampaignId: "",
    metaAdSetId: "",
    metaCreativeId: "",
    metaAdId: "",
    configuredStatus: row?.configured_status ?? row?.status ?? "",
    effectiveStatus: row?.effective_status ?? "",
    step: "operacional gerado",
    ok: true,
    error: "",
    lastResult: row,
  };
}

function mergeResult(row, result, step) {
  const meta = normalizeObject(result?.meta);
  const persisted = normalizeObject(result?.persisted);
  const generatedCampaign = persisted.generatedCampaign || result?.generatedCampaign || {};
  const generatedAdSet = persisted.generatedAdSet || {};
  const generatedAd = persisted.generatedAd || {};
  const adMeta = meta.ad || {};
  const adSetMeta = meta.adSet || {};
  const campaignMeta = meta.campaign || {};

  return {
    ...row,
    metaCampaignId: result?.metaCampaignId || campaignMeta.id || generatedCampaign.meta_campaign_id || row.metaCampaignId || "",
    metaAdSetId: result?.metaAdSetId || adSetMeta.id || generatedCampaign.meta_adset_id || generatedAdSet.meta_adset_id || row.metaAdSetId || "",
    metaCreativeId: result?.metaCreativeId || meta?.creative?.id || row.metaCreativeId || "",
    metaAdId: result?.metaAdId || adMeta.id || generatedCampaign.meta_ad_id || generatedAd.meta_ad_id || row.metaAdId || "",
    configuredStatus:
      adMeta.configured_status ||
      adMeta.status ||
      generatedAd.configured_status ||
      adSetMeta.status ||
      generatedAdSet.configured_status ||
      campaignMeta.status ||
      generatedCampaign.meta_status ||
      result?.status ||
      row.configuredStatus ||
      "",
    effectiveStatus:
      adMeta.effective_status ||
      generatedAd.effective_status ||
      adSetMeta.effective_status ||
      generatedAdSet.effective_status ||
      campaignMeta.effective_status ||
      generatedCampaign.meta_effective_status ||
      row.effectiveStatus ||
      "",
    step,
    ok: true,
    error: "",
    lastResult: result,
  };
}

function rowsWith(rows, predicate) {
  return (rows || []).filter(predicate).length;
}

function actionState({ rows, busyStep, step, runningStep, canRun, completeCount, errorCount, blockedReason }) {
  if (busyStep === runningStep) return { label: "Em execução", tone: "info", disabled: true, title: "Etapa em execução." };
  if (errorCount > 0) return { label: "Erro", tone: "bad", disabled: false, title: "Há erro em pelo menos um mercado. Você pode tentar novamente." };
  if (!canRun) return { label: "Bloqueado", tone: "muted", disabled: true, title: blockedReason };
  if (completeCount > 0 && completeCount === rows.length) return { label: "Concluído", tone: "good", disabled: false, title: "Etapa concluída para todos os mercados." };
  if (completeCount > 0) return { label: "Parcial", tone: "warn", disabled: false, title: "Etapa concluída em parte dos mercados." };
  return { label: "Disponível", tone: "info", disabled: false, title: "Pronto para executar." };
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 900, color: "#374151", fontSize: 13 }}>{label}</div>
        {hint ? <div style={{ color: "#6b7280", fontWeight: 750, fontSize: 12 }}>{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

function InputLike(props) {
  return <input {...props} className="templatesInput" style={{ height: 40, ...(props.style || {}) }} />;
}

function TextAreaLike(props) {
  return <textarea {...props} className="templatesTextarea" />;
}

function SelectLike({ value, onChange, options, disabled }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled} className="templatesSelect" style={{ height: 40 }}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function PublishActionButton({ title, state, onClick, primary = false }) {
  return (
    <div className="card" style={{ padding: 12, display: "grid", gap: 8, minWidth: 210, flex: "1 1 210px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>{title}</div>
        <StatusPill tone={state.tone}>{state.label}</StatusPill>
      </div>
      <button
        type="button"
        className={primary ? "templatesBtnPrimary" : "templatesBtnOutline"}
        disabled={state.disabled}
        title={state.title}
        onClick={onClick}
      >
        {state.label === "Em execução" ? "Executando..." : title}
      </button>
      <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>{state.title}</div>
    </div>
  );
}

export default function TemplatesMercado() {
  const [templates, setTemplates] = useState([]);
  const [creativeAssets, setCreativeAssets] = useState([]);
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [defaultMetaAccountId, setDefaultMetaAccountId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedMarkets, setSelectedMarkets] = useState(DEFAULT_MARKETS);
  const [translationDrafts, setTranslationDrafts] = useState({});
  const [previewMarketCode, setPreviewMarketCode] = useState(DEFAULT_MARKETS[0]);
  const [rows, setRows] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [busyStep, setBusyStep] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [openAdKey, setOpenAdKey] = useState("A");

  const selectedTemplate = useMemo(() => templates.find((template) => String(template.id) === String(selectedId)) ?? null, [templates, selectedId]);
  const selectedPayload = useMemo(() => getPayload(selectedTemplate), [selectedTemplate]);
  const selectedSet = useMemo(() => new Set(selectedMarkets), [selectedMarkets]);
  const marketOptions = useMemo(() => selectedMarkets.map(marketInfo), [selectedMarkets]);
  const filteredTemplates = useMemo(() => {
    const q = normalizeNonEmptyString(listQuery).toLowerCase();
    if (!q) return templates;
    return templates.filter((template) => String(template?.name || "").toLowerCase().includes(q));
  }, [templates, listQuery]);

  const selectedMetaAccount = useMemo(
    () => metaAccounts.find((account) => String(account.id) === String(form.metaAccountId)) ?? null,
    [metaAccounts, form.metaAccountId],
  );
  const metaAdAccountId = selectedMetaAccount?.metaAdAccountId || "";
  const pageId = selectedMetaAccount?.metaPageId || "";
  const instagramActorId = selectedMetaAccount?.metaInstagramActorId || "";
  const previewMarket = marketInfo(previewMarketCode || selectedMarkets[0]);
  const previewTranslation = normalizeObject(translationDrafts?.[previewMarket.code]);
  const previewVariant = normalizeObject(previewTranslation?.adVariants?.[0]);
  const baseVariant = normalizeObject(form.adVariants?.[0]);
  const previewMedia = normalizeObject(form.mediaByMarket?.[previewMarket.code]?.A || form.mediaByMarket?.default?.A);
  const previewAssetType = previewMedia.creativeAssetId
    ? previewMedia.mimeType?.startsWith("video/")
      ? "vídeo"
      : previewMedia.mimeType?.startsWith("image/")
        ? "imagem"
        : "asset"
    : "link";
  const backendBase = getBackendBaseUrl();
  const hasBaseText = adVariantsWithText(form.adVariants).length > 0;
  const canUseRows = rows.length > 0;
  const campaignCount = rowsWith(rows, (row) => row.metaCampaignId);
  const adSetCount = rowsWith(rows, (row) => row.metaAdSetId);
  const creativeCount = rowsWith(rows, (row) => row.metaCreativeId);
  const adCount = rowsWith(rows, (row) => row.metaAdId);
  const anyMetaCount = rowsWith(rows, (row) => row.metaCampaignId || row.metaAdSetId || row.metaCreativeId || row.metaAdId);
  const errorCount = rowsWith(rows, (row) => row.error);
  const actions = {
    campaign: actionState({
      rows,
      busyStep,
      runningStep: "campaign",
      canRun: canUseRows,
      completeCount: campaignCount,
      errorCount,
      blockedReason: "Gere o operacional primeiro.",
    }),
    adset: actionState({
      rows,
      busyStep,
      runningStep: "adset",
      canRun: canUseRows && campaignCount > 0,
      completeCount: adSetCount,
      errorCount,
      blockedReason: "Publique a Campaign primeiro.",
    }),
    creative: actionState({
      rows,
      busyStep,
      runningStep: "creative",
      canRun: canUseRows && adSetCount > 0,
      completeCount: creativeCount,
      errorCount,
      blockedReason: "Publique o AdSet primeiro.",
    }),
    ad: actionState({
      rows,
      busyStep,
      runningStep: "ad",
      canRun: canUseRows && creativeCount > 0,
      completeCount: adCount,
      errorCount,
      blockedReason: "Publique o Creative primeiro.",
    }),
    sync: actionState({
      rows,
      busyStep,
      runningStep: "sync",
      canRun: canUseRows && anyMetaCount > 0,
      completeCount: 0,
      errorCount: 0,
      blockedReason: "Crie pelo menos um objeto Meta primeiro.",
    }),
  };

  useEffect(() => {
    refreshAll();
  }, []);

  async function refreshAll({ selectId } = {}) {
    setError("");
    const [templateRes, assetRes, accountRes] = await Promise.allSettled([
      listFlowTemplates({ limit: 200 }),
      listCreativeAssets({ limit: 200 }),
      listMetaAccounts(),
    ]);

    const nextTemplates = templateRes.status === "fulfilled" ? templateRes.value.flowTemplates ?? [] : [];
    const nextAssets = assetRes.status === "fulfilled" ? assetRes.value.creativeAssets ?? [] : [];
    const nextAccounts = accountRes.status === "fulfilled" ? accountRes.value.metaAccounts ?? [] : [];
    const defaultAccount = nextAccounts.find((account) => account.isDefault) ?? nextAccounts[0] ?? null;
    const nextDefaultMetaAccountId = defaultAccount?.id ? String(defaultAccount.id) : "";

    setTemplates(nextTemplates);
    setCreativeAssets(nextAssets);
    setMetaAccounts(nextAccounts);
    setDefaultMetaAccountId(nextDefaultMetaAccountId);

    const nextSelected = nextTemplates.find((template) => String(template.id) === String(selectId || selectedId)) ?? null;
    if (nextSelected) selectTemplate(nextSelected.id, nextTemplates, nextDefaultMetaAccountId);
    else if (!selectedId) setForm((prev) => ({ ...prev, metaAccountId: prev.metaAccountId || nextDefaultMetaAccountId }));
  }

  function selectTemplate(id, sourceTemplates = templates, defaultAccountId = defaultMetaAccountId) {
    const template = sourceTemplates.find((item) => String(item.id) === String(id)) ?? null;
    setSelectedId(template ? String(template.id) : "");
    const nextForm = template ? templateToForm(template, { defaultMetaAccountId: defaultAccountId }) : { ...EMPTY_FORM, metaAccountId: defaultAccountId };
    setForm(nextForm);
    const translations = getTranslations(getPayload(template));
    setTranslationDrafts(translations);
    const firstMarket = Object.keys(translations)[0] || selectedMarkets[0] || DEFAULT_MARKETS[0];
    setPreviewMarketCode(firstMarket);
  }

  function newTemplate() {
    setSelectedId("");
    setRows([]);
    setCampaignId("");
    setTranslationDrafts({});
    setForm({ ...EMPTY_FORM, metaAccountId: defaultMetaAccountId });
  }

  function updateVariant(index, field, value) {
    setForm((prev) => {
      const next = Array.isArray(prev.adVariants) ? [...prev.adVariants] : [...EMPTY_FORM.adVariants];
      while (next.length < AD_KEYS.length) next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
      next[index] = { ...normalizeObject(next[index]), key: AD_KEYS[index], [field]: value };
      return { ...prev, adVariants: next };
    });
  }

  function setMarketMedia(marketCode, adKey, entry) {
    const code = String(marketCode || "").trim().toUpperCase();
    if (!code) return;
    setForm((prev) => ({
      ...prev,
      mediaByMarket: {
        ...normalizeObject(prev.mediaByMarket),
        [code]: {
          ...normalizeObject(prev.mediaByMarket?.[code]),
          [adKey]: entry,
        },
      },
    }));
  }

  async function uploadAssetForMarket(marketCode, adKey, file) {
    if (!file) return;
    await runStep("asset", async () => {
      const res = await uploadCreativeAsset(file);
      const entry = withAutoThumbnail(normalizeAsset(res.creativeAsset), res.autoThumbnailAsset);
      if (!entry) throw new Error("Falha ao obter asset após upload.");
      setMarketMedia(marketCode, adKey, entry);
      setCreativeAssets((prev) => [res.creativeAsset, ...(res.autoThumbnailAsset ? [res.autoThumbnailAsset] : []), ...prev].filter(Boolean));
      setNotice(`Asset definido para ${marketCode} Ad ${adKey}.`);
    });
  }

  function selectExistingAsset(marketCode, adKey, assetId) {
    const asset = creativeAssets.find((item) => String(item.id) === String(assetId)) ?? null;
    const entry = normalizeAsset(asset);
    if (!entry) return;
    setMarketMedia(marketCode, adKey, entry);
  }

  function updateTranslation(marketCode, index, field, value) {
    const code = String(marketCode || "").trim().toUpperCase();
    if (!code) return;
    setTranslationDrafts((prev) => {
      const current = normalizeObject(prev?.[code]);
      const variants = Array.isArray(current.adVariants) ? [...current.adVariants] : [];
      while (variants.length < AD_KEYS.length) variants.push({ primaryText: "", headline: "", description: "" });
      variants[index] = { ...normalizeObject(variants[index]), [field]: value };
      return {
        ...prev,
        [code]: {
          ...current,
          adVariants: variants,
        },
      };
    });
  }

  async function saveTemplate({ withTranslations = false } = {}) {
    await runStep("template", async () => {
      const name = normalizeNonEmptyString(form.name);
      if (!name) throw new Error("Informe o nome do template.");
      if (!normalizeNonEmptyString(form.nicheParam)) throw new Error("Informe o nicheParam.");
      if (!normalizeNonEmptyString(form.destinationUrl)) throw new Error("Informe a URL de destino.");
      if (!hasBaseText) throw new Error("Falta texto base. Preencha pelo menos uma variação de anúncio.");

      const payload = buildPayload(form, selectedPayload);
      if (withTranslations) {
        payload.translationsByMarket = translationDrafts;
        payload.translationsByMarketReviewedAt = new Date().toISOString();
      }

      const res = selectedId
        ? await updateFlowTemplate(selectedId, { name, payload })
        : await createFlowTemplate({ name, payload });
      const saved = res.flowTemplate;
      await refreshAll({ selectId: saved?.id });
      setNotice(withTranslations ? "Traduções revisadas salvas." : `Template salvo: ${saved?.name || name}.`);
    });
  }

  async function runStep(step, fn) {
    setBusyStep(step);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (err) {
      setError(formatBackendError(err));
    } finally {
      setBusyStep("");
    }
  }

  function toggleMarket(code) {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) return;
    setSelectedMarkets((prev) => {
      const next = new Set(prev || []);
      if (next.has(normalized)) next.delete(normalized);
      else next.add(normalized);
      return Array.from(next).sort();
    });
  }

  async function generateTranslations() {
    await runStep("translations", async () => {
      if (!selectedId) throw new Error("Salve ou selecione um template antes de gerar traduções.");
      if (!hasBaseText) throw new Error("Falta texto base para traduzir.");
      const markets = Array.from(new Set((selectedMarkets || []).map((code) => String(code || "").trim().toUpperCase()).filter(Boolean)));
      if (!markets.length) throw new Error("Selecione ao menos um mercado.");
      const res = await generateCampaignTemplateTranslationsByMarket(selectedId, { markets, overwrite: false });
      const updatedTemplate = res.campaignTemplate;
      setTranslationDrafts(getTranslations(getPayload(updatedTemplate)));
      await refreshAll({ selectId: selectedId });
      setNotice(`Traduções geradas: ${res.generated.length}. Preservadas: ${res.preserved.length}.`);
    });
  }

  async function generateOperational() {
    await runStep("operational", async () => {
      if (!selectedId) throw new Error("Selecione um template.");
      await saveTranslationsOnly();
      const markets = Array.from(new Set((selectedMarkets || []).map((code) => String(code || "").trim().toUpperCase()).filter(Boolean)));
      if (!markets.length) throw new Error("Selecione ao menos um mercado.");
      const res = await createOperationalMarketGeneration({ templateId: selectedId, markets });
      setCampaignId(res.campaign?.id ?? "");
      setRows((res.operationalMarketGenerations || []).map(mapGeneration));
      setNotice(`Operacional gerado: ${(res.operationalMarketGenerations || []).length} mercado(s).`);
    });
  }

  async function saveTranslationsOnly() {
    if (!selectedId) return;
    const payload = buildPayload(form, selectedPayload);
    payload.translationsByMarket = translationDrafts;
    payload.translationsByMarketReviewedAt = new Date().toISOString();
    await updateFlowTemplate(selectedId, { name: normalizeNonEmptyString(form.name), payload });
    await refreshAll({ selectId: selectedId });
  }

  function updateRow(id, updater) {
    setRows((prev) => prev.map((row) => (String(row.id) === String(id) ? updater(row) : row)));
  }

  async function runRows(step, handler) {
    if (!rows.length) throw new Error("Gere o operacional antes de publicar.");
    for (const row of rows) {
      updateRow(row.id, (current) => ({ ...current, step: `${step}...`, error: "" }));
      try {
        const result = await handler(row);
        updateRow(row.id, (current) => mergeResult(current, result, step));
      } catch (err) {
        updateRow(row.id, (current) => ({ ...current, step, ok: false, error: formatBackendError(err), lastResult: err?.body ?? null }));
      }
    }
  }

  async function runOneRow(row, step, handler) {
    if (!row?.id) return;
    updateRow(row.id, (current) => ({ ...current, step: `${step}...`, error: "" }));
    try {
      const result = await handler(row);
      updateRow(row.id, (current) => mergeResult(current, result, step));
    } catch (err) {
      updateRow(row.id, (current) => ({ ...current, step, ok: false, error: formatBackendError(err), lastResult: err?.body ?? null }));
    }
  }

  async function publishCampaigns() {
    await runStep("campaign", async () => {
      if (!metaAdAccountId) throw new Error("Falta conta Meta / metaAdAccountId.");
      await runRows("Campaign publicada", (row) => publishOperationalCampaign(row.id, { metaAdAccountId, objective: form.objective }));
    });
  }

  async function publishAdSets() {
    await runStep("adset", async () => {
      if (campaignCount === 0) throw new Error("Publique a Campaign primeiro.");
      await runRows("AdSet publicado", (row) =>
        publishOperationalAdSet(row.id, {
          dailyBudgetCents: Number(form.dailyBudgetCents) || 1000,
          billingEvent: form.billingEvent,
          optimizationGoal: form.optimizationGoal,
        }),
      );
    });
  }

  async function publishCreatives() {
    await runStep("creative", async () => {
      if (adSetCount === 0) throw new Error("Publique o AdSet primeiro.");
      if (!pageId) throw new Error("Falta Page ID para publicar Creative.");
      await saveTranslationsOnly();
      await runRows("Creative publicado", (row) => publishOperationalCreative(row.id, { pageId, instagramActorId, ctaType: form.ctaType }));
    });
  }

  async function publishAds() {
    await runStep("ad", async () => {
      if (creativeCount === 0) throw new Error("Publique o Creative primeiro.");
      await runRows("Ad publicado", (row) => publishOperationalAd(row.id));
    });
  }

  async function syncStatus() {
    await runStep("sync", async () => {
      if (anyMetaCount === 0) throw new Error("Crie pelo menos um objeto Meta primeiro.");
      await runRows("Status sincronizado", (row) => syncOperationalMetaStatus(row.id));
    });
  }

  return (
    <PageShell title="Templates por Mercado" subtitle="Templates reais com fluxo operacional por mercado." backFallbackTo="/templates">
      <div className="templatesHero">
        <div>
          <h2 className="templatesHeroTitle">Fluxo por Mercados Operacionais</h2>
          <p className="templatesHeroText">
            Crie o template, gere traduções por mercado, revise textos e publique Meta apenas quando clicar em cada etapa.
          </p>
        </div>
        <div className="templatesHeroBadges">
          <StatusPill tone="warn">PAUSED</StatusPill>
          <StatusPill tone="info">flow_templates</StatusPill>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: 14, borderColor: "#fecaca", color: "#991b1b", whiteSpace: "pre-wrap" }}>
          <div style={{ fontWeight: 900 }}>Erro</div>
          <div style={{ marginTop: 6, fontWeight: 750 }}>{error}</div>
        </div>
      ) : null}
      {notice ? (
        <div className="card" style={{ padding: 14, borderColor: "#bfdbfe", color: "#1d4ed8" }}>
          <div style={{ fontWeight: 900 }}>{notice}</div>
        </div>
      ) : null}

      <div className="templatesLayout" style={{ marginTop: 16 }}>
        <div className="templatesListPanel">
          <div className="templatesListHeader">
            <h2 className="templatesListTitle">Templates reais</h2>
            <div className="templatesListHint">Mesma fonte da tela /templates.</div>
          </div>
          <InputLike value={listQuery} onChange={(e) => setListQuery(e.target.value)} placeholder="Buscar por nome..." />
          <button type="button" className="templatesNewBtn" disabled={Boolean(busyStep)} onClick={newTemplate}>
            + Novo template
          </button>
          <div>
            {(filteredTemplates || []).map((template) => {
              const payload = getPayload(template);
              const translations = getTranslations(payload);
              const active = String(template.id) === String(selectedId);
              const mediaCount = Object.keys(normalizeObject(payload.mediaByMarket)).length;
              return (
                <button
                  key={template.id}
                  type="button"
                  className={`templatesTplItem ${active ? "templatesTplItemActive" : ""}`}
                  onClick={() => selectTemplate(template.id)}
                >
                  <div className="templatesTplName">{template.name}</div>
                  <div className="templatesTplMetaRow">
                    <span>{getNiche(payload) || "sem nicheParam"}</span>
                    <span className="templatesSep">·</span>
                    <span>{adVariantsWithText(getAdVariants(payload)).length} ads</span>
                    <span className="templatesSep">·</span>
                    <span>{Object.keys(translations).length} mercados traduzidos</span>
                    <span className="templatesSep">·</span>
                    <span>{mediaCount ? `${mediaCount} assets` : "sem asset"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="templatesDetailPanel">
          <section className="templatesCard">
            <div className="templatesCardLabel">1. Template e conteúdo base</div>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label="Nome do template">
                  <InputLike value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Plantas BTN" />
                </Field>
                <Field label="nicheParam / slug operacional">
                  <InputLike value={form.nicheParam} onChange={(e) => setForm((prev) => ({ ...prev, nicheParam: e.target.value }))} placeholder="PlantasBTN" />
                </Field>
                <Field label="Conta Meta">
                  <SelectLike
                    value={form.metaAccountId}
                    onChange={(e) => setForm((prev) => ({ ...prev, metaAccountId: e.target.value }))}
                    options={[
                      { value: "", label: metaAccounts.length ? "Selecione..." : "Nenhuma conta cadastrada", disabled: true },
                      ...metaAccounts.map((account) => ({
                        value: String(account.id),
                        label: `${account.name}${account.isDefault ? " • padrão" : ""}${account.isActive ? "" : " • inativa"}`,
                      })),
                    ]}
                  />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label="Destination URL">
                  <InputLike value={form.destinationUrl} onChange={(e) => setForm((prev) => ({ ...prev, destinationUrl: e.target.value }))} />
                </Field>
                <Field label="CTA">
                  <SelectLike
                    value={form.ctaType}
                    onChange={(e) => setForm((prev) => ({ ...prev, ctaType: e.target.value }))}
                    options={[
                      { value: "LEARN_MORE", label: "Saiba mais" },
                      { value: "SHOP_NOW", label: "Comprar agora" },
                      { value: "SIGN_UP", label: "Inscrever-se" },
                    ]}
                  />
                </Field>
                <Field label="Orçamento diário (R$)">
                  <InputLike
                    value={form.dailyBudgetBrl}
                    onChange={(e) => {
                      const cents = parseBrlToCents(e.target.value);
                      setForm((prev) => ({ ...prev, dailyBudgetBrl: e.target.value, dailyBudgetCents: cents ?? 0 }));
                    }}
                  />
                </Field>
              </div>

              <Field label="Variações de anúncio (PT-BR)" hint="Ad A é usado pelo publicador operacional atual; mantenha A completo antes de publicar.">
                <div className="templatesAccordion">
                  {AD_KEYS.map((adKey, idx) => {
                    const variant = normalizeObject(form.adVariants?.[idx]);
                    return (
                      <details
                        key={adKey}
                        className="templatesAccordionItem"
                        open={openAdKey === adKey}
                        onToggle={(e) => {
                          if (e.currentTarget.open) setOpenAdKey(adKey);
                        }}
                      >
                        <summary className="templatesAccordionSummary">
                          <div className="templatesAccordionSummaryTitle">Ad {adKey}</div>
                          <div className="templatesAccordionSummaryMeta">{variant.primaryText ? String(variant.primaryText).slice(0, 70) : "—"}</div>
                        </summary>
                        <div className="templatesAccordionBody">
                          <Field label="primaryText">
                            <TextAreaLike value={variant.primaryText || ""} onChange={(e) => updateVariant(idx, "primaryText", e.target.value)} rows={3} />
                          </Field>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                            <Field label="headline">
                              <InputLike value={variant.headline || ""} onChange={(e) => updateVariant(idx, "headline", e.target.value)} />
                            </Field>
                            <Field label="description">
                              <InputLike value={variant.description || ""} onChange={(e) => updateVariant(idx, "description", e.target.value)} />
                            </Field>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </Field>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="templatesBtnPrimary" disabled={Boolean(busyStep)} onClick={() => saveTemplate()}>
                  {selectedId ? "Salvar template" : "Criar template"}
                </button>
                <button type="button" className="templatesBtnOutline" disabled={Boolean(busyStep)} onClick={newTemplate}>
                  Limpar
                </button>
              </div>
            </div>
          </section>

          <section className="templatesCard">
            <div className="templatesCardLabel">2. Mercados e assets</div>
            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="templatesBtnOutline" onClick={() => setSelectedMarkets(DEFAULT_MARKETS)}>Padrão</button>
                <button type="button" className="templatesBtnOutline" onClick={() => setSelectedMarkets(OPERATIONAL_MARKETS.map((m) => m.code))}>Todos</button>
                <button type="button" className="templatesBtnOutline" onClick={() => setSelectedMarkets([])}>Limpar</button>
              </div>
              <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                  {OPERATIONAL_MARKETS.map((market) => (
                    <label key={market.code} className="templatesHintBox" style={{ background: selectedSet.has(market.code) ? "#eff6ff" : "#fff" }}>
                      <input type="checkbox" checked={selectedSet.has(market.code)} onChange={() => toggleMarket(market.code)} style={{ marginRight: 8 }} />
                      <strong>{market.code}</strong>
                      <div className="muted" style={{ fontWeight: 800 }}>{market.name}</div>
                      <div className="muted" style={{ fontWeight: 750 }}>{market.language}</div>
                    </label>
                  ))}
                </div>
              </div>

              <AdvancedDisclosure summary="Assets por mercado">
                <div className="templatesHintBox">
                  O cadastro de assets é persistido no template e aparece no preview. O publicador operacional atual cria Creative de link; envio de vídeo/imagem para Meta ainda não está conectado nesse pipeline.
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {marketOptions.map((market) => {
                    const entry = normalizeObject(form.mediaByMarket?.[market.code]?.A);
                    return (
                      <div key={market.code} className="card" style={{ padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div>
                            <strong>{market.code}</strong>
                            <div className="muted" style={{ fontWeight: 800 }}>{entry.originalName || "Nenhum asset no Ad A"}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <input type="file" accept="video/*,image/*" onChange={(e) => uploadAssetForMarket(market.code, "A", e.target.files?.[0])} />
                            <select value="" onChange={(e) => selectExistingAsset(market.code, "A", e.target.value)}>
                              <option value="">Selecionar asset existente...</option>
                              {creativeAssets.map((asset) => (
                                <option key={asset.id} value={asset.id}>{asset.original_name || asset.id}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AdvancedDisclosure>
            </div>
          </section>

          <section className="templatesCard">
            <div className="templatesCardLabel">3. Traduções por mercado</div>
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="templatesBtnPrimary" disabled={Boolean(busyStep) || !selectedId} onClick={generateTranslations}>
                Gerar Traduções
              </button>
              <button type="button" className="templatesBtnOutline" disabled={Boolean(busyStep) || !selectedId} onClick={() => saveTemplate({ withTranslations: true })}>
                Salvar revisão
              </button>
            </div>
            {!hasBaseText ? (
              <div className="templatesHintBox" style={{ marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
                Falta texto base. Preencha pelo menos uma variação antes de gerar traduções.
              </div>
            ) : null}
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {marketOptions.map((market) => {
                const entry = normalizeObject(translationDrafts?.[market.code]);
                const variants = Array.isArray(entry.adVariants) ? entry.adVariants : [];
                const variant = normalizeObject(variants[0]);
                return (
                  <div key={market.code} className="card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <strong>{market.code} · {market.name}</strong>
                        <div className="muted" style={{ fontWeight: 800 }}>Idioma: {market.language}</div>
                      </div>
                      <button type="button" className="templatesBtnOutline" onClick={() => setPreviewMarketCode(market.code)}>
                        Pré-visualizar
                      </button>
                    </div>
                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      <Field label="primaryText traduzido">
                        <TextAreaLike value={variant.primaryText || ""} onChange={(e) => updateTranslation(market.code, 0, "primaryText", e.target.value)} rows={3} />
                      </Field>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <Field label="headline traduzido">
                          <InputLike value={variant.headline || ""} onChange={(e) => updateTranslation(market.code, 0, "headline", e.target.value)} />
                        </Field>
                        <Field label="description traduzida">
                          <InputLike value={variant.description || ""} onChange={(e) => updateTranslation(market.code, 0, "description", e.target.value)} />
                        </Field>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="templatesCard">
            <div className="templatesCardLabel">4. Preview operacional</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(180px, 260px) 1fr", gap: 14 }}>
              <Field label="Mercado">
                <SelectLike
                  value={previewMarket.code}
                  onChange={(e) => setPreviewMarketCode(e.target.value)}
                  options={marketOptions.map((market) => ({ value: market.code, label: `${market.code} — ${market.name}` }))}
                />
              </Field>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 950 }}>{previewMarket.code} · {previewMarket.name}</div>
                    <div className="muted" style={{ fontWeight: 800, marginTop: 4 }}>{previewMarket.language}</div>
                  </div>
                  <span className="monoTag">{previewMarket.code}-{form.nicheParam || "Niche"}-FB</span>
                </div>
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  <div style={{ whiteSpace: "pre-wrap", fontWeight: 800 }}>{previewVariant.primaryText || baseVariant.primaryText || "Texto principal ausente."}</div>
                  <div style={{ fontWeight: 950 }}>{previewVariant.headline || baseVariant.headline || "Headline ausente."}</div>
                  <div className="muted" style={{ fontWeight: 800 }}>{previewVariant.description || baseVariant.description || "Descrição ausente."}</div>
                  <div className="monoTag">{form.destinationUrl || "URL ausente"}</div>
                  <div className="templatesHintBox">
                    Tipo do Creative: {previewAssetType}
                    {previewAssetType === "link" ? " · Nenhum asset selecionado. Creative será criado como link." : " · Asset será enviado para o Creative Meta."}
                  </div>
                  {previewMedia.url && previewMedia.mimeType?.startsWith("video/") ? (
                    <CompactVideoPreview src={`${backendBase}${previewMedia.url}`} label={`${previewMarket.code} Ad A`} size="sm" />
                  ) : previewMedia.url && previewMedia.mimeType?.startsWith("image/") ? (
                    <img src={`${backendBase}${previewMedia.url}`} alt={`${previewMarket.code} Ad A`} style={{ maxWidth: 220, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  ) : (
                    <div className="templatesHintBox">Sem asset associado para este mercado.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="templatesCard">
            <div className="templatesCardLabel">5. Gerar operacional e publicar Meta</div>
            <div className="templatesHintBox" style={{ marginTop: 12 }}>
              Nenhuma publicação Meta acontece automaticamente. Cada botão abaixo executa uma etapa explícita e cria objetos em PAUSED.
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div className="card" style={{ padding: 12, borderColor: "#bfdbfe", background: "#eff6ff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 950, color: "#1d4ed8" }}>Gerar linhas operacionais</div>
                    <div style={{ marginTop: 4, fontWeight: 800, color: "#1d4ed8", fontSize: 12 }}>
                      Cria os registros por mercado e os nomes como ARM-{form.nicheParam || "Niche"}-FB.
                    </div>
                  </div>
                  <button type="button" className="templatesBtnPrimary" disabled={Boolean(busyStep) || !selectedId} onClick={generateOperational}>
                    {busyStep === "operational" ? "Gerando..." : rows.length ? "Gerar novamente" : "Gerar Operacional"}
                  </button>
                </div>
                {campaignId ? <div className="monoTag" style={{ marginTop: 10 }}>campaign_id: {campaignId}</div> : null}
              </div>

              <div>
                <div style={{ fontWeight: 950, marginBottom: 8 }}>Bloco A · Ações de publicação Meta</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <PublishActionButton title="Publicar Campaign" state={actions.campaign} onClick={publishCampaigns} />
                  <PublishActionButton title="Publicar AdSet" state={actions.adset} onClick={publishAdSets} />
                  <PublishActionButton title="Publicar Creative" state={actions.creative} onClick={publishCreatives} />
                  <PublishActionButton title="Publicar Ad" state={actions.ad} onClick={publishAds} />
                  <PublishActionButton title="Sincronizar Status" state={actions.sync} onClick={syncStatus} primary />
                </div>
              </div>
            </div>
            {busyStep ? <div className="muted" style={{ marginTop: 10, fontWeight: 850 }}>Executando: {busyStep}</div> : null}
          </section>

          <section className="templatesCard">
            <div className="templatesCardLabel">Bloco B · Resultados publicados por mercado</div>
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table className="dataTable" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>Mercado</th>
                    <th>Nome gerado</th>
                    <th>Objetos Meta</th>
                    <th>Status</th>
                    <th>Ações</th>
                    <th>Detalhes técnicos</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td><span className="monoTag">{row.marketCode || "—"}</span></td>
                      <td><span className="monoTag">{row.marketParam || "—"}</span></td>
                      <td>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span className="monoTag">Campaign: {row.metaCampaignId || "—"}</span>
                          <span className="monoTag">AdSet: {row.metaAdSetId || "—"}</span>
                          <span className="monoTag">Creative: {row.metaCreativeId || "—"}</span>
                          <span className="monoTag">Ad: {row.metaAdId || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "grid", gap: 6 }}>
                          <StatusPill tone={row.ok ? "info" : "bad"}>{row.error ? "erro" : row.step || "—"}</StatusPill>
                          <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                            configured: {row.configuredStatus || "—"} · effective: {row.effectiveStatus || "—"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button type="button" className="templatesBtnOutline" disabled={Boolean(busyStep) || Boolean(row.metaCampaignId)} onClick={() => runOneRow(row, "Campaign publicada", (item) => publishOperationalCampaign(item.id, { metaAdAccountId, objective: form.objective }))}>
                            Campaign
                          </button>
                          <button type="button" className="templatesBtnOutline" disabled={Boolean(busyStep) || !row.metaCampaignId || Boolean(row.metaAdSetId)} onClick={() => runOneRow(row, "AdSet publicado", (item) => publishOperationalAdSet(item.id, { dailyBudgetCents: Number(form.dailyBudgetCents) || 1000, billingEvent: form.billingEvent, optimizationGoal: form.optimizationGoal }))}>
                            AdSet
                          </button>
                          <button
                            type="button"
                            className="templatesBtnOutline"
                            disabled={Boolean(busyStep) || !row.metaAdSetId || Boolean(row.metaCreativeId)}
                            onClick={async () => {
                              await saveTranslationsOnly();
                              await runOneRow(row, "Creative publicado", (item) => publishOperationalCreative(item.id, { pageId, instagramActorId, ctaType: form.ctaType }));
                            }}
                          >
                            Creative
                          </button>
                          <button type="button" className="templatesBtnOutline" disabled={Boolean(busyStep) || !row.metaCreativeId || Boolean(row.metaAdId)} onClick={() => runOneRow(row, "Ad publicado", (item) => publishOperationalAd(item.id))}>
                            Ad
                          </button>
                        </div>
                        {row.error ? <div style={{ marginTop: 6, color: "#991b1b", fontWeight: 800 }}>{row.error}</div> : null}
                      </td>
                      <td>
                        <AdvancedDisclosure summary="Abrir JSON">
                          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{safeJson(row.lastResult)}</pre>
                        </AdvancedDisclosure>
                      </td>
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={10} className="muted" style={{ fontWeight: 800 }}>
                        Gere o operacional para ver os mercados.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <AdvancedDisclosure summary="Detalhes técnicos do template">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{safeJson(buildPayload(form, selectedPayload))}</pre>
          </AdvancedDisclosure>
        </div>
      </div>
    </PageShell>
  );
}
