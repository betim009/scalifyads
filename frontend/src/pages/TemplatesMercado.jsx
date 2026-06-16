import PageShell from "../components/PageShell.jsx";
import StatusPill from "../components/StatusPill.jsx";
import AdvancedDisclosure from "../components/AdvancedDisclosure.jsx";
import MetaObjectDiagnosticPanel from "../components/MetaObjectDiagnosticPanel.jsx";
import { useEffect, useMemo, useState } from "react";
import { createFlowTemplate, deleteFlowTemplate, listFlowTemplates, updateFlowTemplate } from "../services/flowTemplates.js";
import { generateCampaignTemplateTranslationsByMarket } from "../services/campaignTemplates.js";
import { createOperationalMarketGeneration } from "../services/generatedCampaigns.js";
import { listMetaAccounts } from "../services/metaAccounts.js";
import { listCreativeAssets, uploadCreativeAsset } from "../services/creativeAssets.js";
import {
  publishOperationalAd,
  publishOperationalAdSet,
  publishOperationalCampaign,
  publishOperationalCreative,
  syncOperationalMetaStatus,
} from "../services/operationalMarketGenerations.js";
import { OPERATIONAL_MARKETS, buildMarketDestinationUrl, getOperationalMarketLanguageGroup } from "../utils/operationalMarkets.js";
import { getAuthMe } from "../services/auth.js";
import { normalizeLanguageKey } from "../utils/operationalLanguages.js";
import {
  BULK_VIDEO_GROUPS,
  OPERATIONAL_MEDIA_AD_KEYS,
  getOperationalMediaGroupInfo,
  marketsForBulkGroup,
  mediaGroupForMarket,
  parseBulkVideoFilename,
} from "../utils/operationalMediaGroups.js";
import { formatBrlFromCents, formatBrlInputFromCents, parseBrlToCents } from "../utils/brlMoney.js";

const AD_KEYS = OPERATIONAL_MEDIA_AD_KEYS;
const DEFAULT_AD_KEY = AD_KEYS[0] || "A";

function adNumber(adKey) {
  const index = AD_KEYS.indexOf(String(adKey || "").trim().toUpperCase());
  return index >= 0 ? index + 1 : 1;
}

function adLabel(adKey) {
  return `Ad ${adNumber(adKey)}`;
}

function emptyVariantState() {
  return AD_KEYS.map((key) => ({
    adNumber: adNumber(key),
    variantKey: key,
    status: "pendente",
  }));
}

const LANGUAGE_GROUP_ORDER = ["Português", "Inglês", "Árabe", "Espanhol", "Alemão", "Francês"];
const LANGUAGE_GROUP_META = {
  Português: { icon: "🇧🇷", tone: "portuguese" },
  Inglês: { icon: "🌐", tone: "english" },
  Árabe: { icon: "🌍", tone: "arabic" },
  Espanhol: { icon: "🇪🇸", tone: "spanish" },
  Alemão: { icon: "🇩🇪", tone: "german" },
  Francês: { icon: "🇫🇷", tone: "french" },
  Italiano: { icon: "🇮🇹", tone: "italian" },
  Croata: { icon: "🇭🇷", tone: "croatian" },
  Sérvio: { icon: "🇷🇸", tone: "serbian" },
  Sueco: { icon: "🇸🇪", tone: "swedish" },
  Lituano: { icon: "🇱🇹", tone: "lithuanian" },
  Ucraniano: { icon: "🇺🇦", tone: "ukrainian" },
  Vietnamita: { icon: "🇻🇳", tone: "vietnamese" },
  Turco: { icon: "🇹🇷", tone: "turkish" },
};

const EMPTY_FORM = {
  name: "",
  nicheParam: "",
  destinationUrl: "",
  domain: "",
  brazilPermalink: "",
  internationalPermalink: "",
  pixel: "",
  pageId: "",
  beneficiary: "",
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

function adMediaEntryFromEntry(entry) {
  const normalized = normalizeObject(entry);
  const creativeAssetId = normalizeNonEmptyString(normalized.creativeAssetId || normalized.assetId);
  if (!creativeAssetId) return null;
  const mimeType = normalizeNonEmptyString(normalized.mimeType || normalized.mime_type);
  const thumb = normalizeObject(normalized.thumbnail);
  const thumbnailAssetId = normalizeNonEmptyString(
    normalized.creativeThumbnailAssetId ||
      normalized.creative_thumbnail_asset_id ||
      normalized.thumbnailAssetId ||
      thumb.creativeAssetId ||
      thumb.assetId,
  );
  const thumbnailUrl = normalizeNonEmptyString(normalized.thumbnailUrl || thumb.url);
  const filename = normalizeNonEmptyString(normalized.filename || normalized.originalName || normalized.original_name);
  const type =
    normalizeNonEmptyString(normalized.type) ||
    normalizeNonEmptyString(normalized.kind) ||
    (mimeType.startsWith("image/") ? "image" : mimeType.startsWith("video/") ? "video" : "asset");
  const adEntry = {
    type,
    assetId: creativeAssetId,
    creativeAssetId,
    mimeType,
    filename,
    originalName: filename,
    url: normalizeNonEmptyString(normalized.url),
    kind: type,
    sourceGroup: normalizeNonEmptyString(normalized.sourceGroup),
    variantKey: normalizeNonEmptyString(normalized.variantKey),
    updatedAt: normalizeNonEmptyString(normalized.updatedAt) || new Date().toISOString(),
    ...(thumbnailAssetId || thumbnailUrl
      ? {
          thumbnail: {
            creativeAssetId: thumbnailAssetId,
            mimeType: normalizeNonEmptyString(thumb.mimeType || thumb.mime_type) || "image/jpeg",
            originalName: normalizeNonEmptyString(thumb.originalName || thumb.original_name || normalized.thumbnailFilename),
            url: thumbnailUrl,
            kind: "image",
            updatedAt: normalizeNonEmptyString(thumb.updatedAt) || new Date().toISOString(),
          },
        }
      : null),
  };
  return adEntry;
}

function mediaRecordFromEntry(entry, adKey = "A") {
  const adEntry = adMediaEntryFromEntry({ ...normalizeObject(entry), variantKey: normalizeNonEmptyString(entry?.variantKey) || adKey });
  if (!adEntry) return null;
  return {
    type: adEntry.type || adEntry.kind || "asset",
    assetId: adEntry.creativeAssetId,
    creativeAssetId: adEntry.creativeAssetId,
    mimeType: adEntry.mimeType,
    url: adEntry.url,
    filename: adEntry.filename,
    originalName: adEntry.originalName,
    sourceGroup: adEntry.sourceGroup,
    variantKey: adKey,
    thumbnailAssetId: adEntry.thumbnail?.creativeAssetId || "",
    creativeThumbnailAssetId: adEntry.thumbnail?.creativeAssetId || "",
    thumbnailUrl: adEntry.thumbnail?.url || "",
    ...(adEntry.thumbnail ? { thumbnail: adEntry.thumbnail } : null),
    [adKey]: adEntry,
  };
}

function getMarketMediaEntry(mediaByMarket, marketCode, adKey = "A") {
  const media = normalizeObject(mediaByMarket);
  const code = String(marketCode || "").trim().toUpperCase();
  const key = AD_KEYS.includes(String(adKey || "").trim().toUpperCase()) ? String(adKey || "").trim().toUpperCase() : "A";
  const marketRecord = normalizeObject(media?.[code]);
  const defaultRecord = normalizeObject(media?.default);
  const marketEntry = marketRecord[key] || (key === "A" ? marketRecord.A || marketRecord["1"] : null);
  const defaultEntry = defaultRecord[key] || (key === "A" ? defaultRecord.A || defaultRecord["1"] : null);
  if (marketEntry) return normalizeObject(marketEntry);
  if (defaultEntry) return normalizeObject(defaultEntry);
  const record =
    key === "A" && (marketRecord.creativeAssetId || marketRecord.assetId)
      ? marketRecord
      : key === "A" && (defaultRecord.creativeAssetId || defaultRecord.assetId)
        ? defaultRecord
        : null;
  if (!record) return {};
  return normalizeObject(mediaRecordFromEntry(record, key)?.[key]);
}

function mediaLabel(entry) {
  const media = normalizeObject(entry);
  return media.originalName || media.filename || (media.creativeAssetId ? "Mídia selecionada" : "Nenhuma mídia");
}

function mediaTypeLabel(entry) {
  const media = normalizeObject(entry);
  if (media.mimeType?.startsWith("video/") || media.kind === "video" || media.type === "video") return "vídeo";
  if (media.mimeType?.startsWith("image/") || media.kind === "image" || media.type === "image") return "imagem";
  return media.creativeAssetId ? "mídia" : "link";
}

function buildOperationalDestinationUrl(form, marketCode) {
  return buildMarketDestinationUrl({
    domain: form?.domain,
    brazilPermalink: form?.brazilPermalink,
    internationalPermalink: form?.internationalPermalink,
    marketCode,
    nicheParam: form?.nicheParam,
    destinationUrl: form?.destinationUrl,
  });
}

function getPayload(template) {
  return normalizeObject(template?.payload);
}

function getSavedTemplateMarkets(payload) {
  const op = normalizeObject(payload?.operationalMarket);
  const source = Array.isArray(op.selectedMarkets)
    ? op.selectedMarkets
    : Array.isArray(payload?.selectedMarkets)
      ? payload.selectedMarkets
      : [];
  const valid = new Set(OPERATIONAL_MARKETS.map((market) => market.code));
  return Array.from(new Set(source.map((code) => String(code || "").trim().toUpperCase()).filter((code) => valid.has(code))));
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
    domain: normalizeNonEmptyString(payload.domain) || normalizeNonEmptyString(payload.baseDomain),
    brazilPermalink: normalizeNonEmptyString(payload.brazilPermalink) || normalizeNonEmptyString(payload.brPermalink),
    internationalPermalink: normalizeNonEmptyString(payload.internationalPermalink),
    pixel: normalizeNonEmptyString(payload.pixel) || normalizeNonEmptyString(payload.pixelId),
    pageId: normalizeNonEmptyString(payload.pageId) || normalizeNonEmptyString(creative.pageId),
    beneficiary: normalizeNonEmptyString(payload.beneficiary),
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

function buildPayload(form, basePayload = {}, selectedMarkets = []) {
  const base = normalizeObject(basePayload);
  const campaign = normalizeObject(base.campaign);
  const creative = normalizeObject(base.creative);
  const nicheParam = normalizeNonEmptyString(form.nicheParam);
  const destinationUrl = normalizeNonEmptyString(form.destinationUrl);
  const domain = normalizeNonEmptyString(form.domain);
  const brazilPermalink = normalizeNonEmptyString(form.brazilPermalink);
  const internationalPermalink = normalizeNonEmptyString(form.internationalPermalink);
  const pixel = normalizeNonEmptyString(form.pixel);
  const pageId = normalizeNonEmptyString(form.pageId);
  const beneficiary = normalizeNonEmptyString(form.beneficiary);
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
    domain,
    brazilPermalink,
    internationalPermalink,
    pixel,
    pageId,
    beneficiary,
    operationalMarket: {
      ...normalizeObject(base.operationalMarket),
      nicheParam,
      niche: nicheParam,
      selectedMarkets: Array.from(new Set((selectedMarkets || []).map((code) => String(code || "").trim().toUpperCase()).filter(Boolean))),
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
      pageId: pageId || creative.pageId || "",
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

function buildTechnicalError(row, step, err, formattedMessage) {
  const body = normalizeObject(err?.body);
  const apiError = body.error ?? body;
  return {
    market: {
      code: row?.marketCode || "",
      param: row?.marketParam || "",
      name: row?.marketName || "",
      utmCampaign: row?.utmCampaign || "",
      src: row?.src || "",
    },
    step,
    payload: {
      operationalMarketGenerationId: row?.id || "",
      metaCampaignId: row?.metaCampaignId || "",
      metaAdSetId: row?.metaAdSetId || "",
      metaCreativeId: row?.metaCreativeId || "",
      metaAdId: row?.metaAdId || "",
      tracking: normalizeObject(row?.targetingPreview?.tracking),
    },
    errorOriginal: Object.keys(body).length ? apiError : { message: err?.message || formattedMessage },
    idsAlreadyCreated: {
      meta_campaign_id: row?.metaCampaignId || null,
      meta_adset_id: row?.metaAdSetId || null,
      meta_creative_id: row?.metaCreativeId || null,
      meta_ad_id: row?.metaAdId || null,
    },
  };
}

function marketInfo(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return OPERATIONAL_MARKETS.find((market) => market.code === normalized) ?? { code: normalized, name: "Mercado", language: "—" };
}

function displayMarketLanguage(market) {
  return getOperationalMarketLanguageGroup(market);
}

function regionLabelsForMarket(market) {
  const included = Array.isArray(market?.includedLocations) ? market.includedLocations : [];
  const labels = [];
  if (included.some((item) => String(item).toLowerCase() === "worldwide")) labels.push("Mundo");
  if (included.some((item) => String(item).toLowerCase() === "europa")) labels.push("Europa");
  if (included.some((item) => /estados unidos/i.test(String(item)))) labels.push("EUA");
  if (included.some((item) => /canad/i.test(String(item)))) labels.push("Canadá");
  if (included.some((item) => /austr/i.test(String(item)))) labels.push("Austrália");
  if (included.some((item) => /brasil/i.test(String(item)))) labels.push("Brasil");
  if (!labels.length && included[0]) labels.push(included[0]);
  return labels;
}

function marketDetailLabels(market) {
  const marketName = normalizeNonEmptyString(market?.name).toLowerCase();
  return regionLabelsForMarket(market).filter((label) => {
    const normalized = normalizeNonEmptyString(label).toLowerCase();
    return normalized && normalized !== marketName;
  });
}

function marketDescription(market) {
  const pieces = [...marketDetailLabels(market), `mídia ${mediaGroupForMarket(market?.code)}`]
    .map(normalizeNonEmptyString)
    .filter(Boolean);
  return pieces.join(" · ");
}

function uniqueMarketCodes(codes) {
  const valid = new Set(OPERATIONAL_MARKETS.map((market) => market.code));
  return Array.from(new Set((codes || []).map((code) => String(code || "").trim().toUpperCase()).filter((code) => valid.has(code)))).sort();
}

function buildMarketPickerGroups(activeLanguageKeys = null, selectedMarketCodes = []) {
  const activeSet = Array.isArray(activeLanguageKeys) && activeLanguageKeys.length
    ? new Set(activeLanguageKeys.map(normalizeLanguageKey).filter(Boolean))
    : null;
  const selectedLanguageKeys = new Set(
    (selectedMarketCodes || [])
      .map(marketInfo)
      .map((market) => normalizeLanguageKey(displayMarketLanguage(market)))
      .filter(Boolean)
  );
  const languages = new Map();
  for (const market of OPERATIONAL_MARKETS) {
    const language = displayMarketLanguage(market);
    const languageKey = normalizeLanguageKey(language);
    if (activeSet && !activeSet.has(languageKey) && !selectedLanguageKeys.has(languageKey)) continue;
    if (!languages.has(language)) languages.set(language, []);
    languages.get(language).push(market.code);
  }

  return Array.from(languages.entries())
    .map(([language, codes]) => ({
      key: `language-${language}`,
      type: "Idioma",
      title: language,
      description: `${codes.length === 1 ? "1 mercado" : `${codes.length} mercados`}`,
      icon: LANGUAGE_GROUP_META[language]?.icon || "🌎",
      tone: LANGUAGE_GROUP_META[language]?.tone || "other",
      codes: uniqueMarketCodes(codes),
    }))
    .sort((a, b) => {
      const indexA = LANGUAGE_GROUP_ORDER.indexOf(a.title);
      const indexB = LANGUAGE_GROUP_ORDER.indexOf(b.title);
      if (indexA !== -1 || indexB !== -1) return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      return a.title.localeCompare(b.title, "pt-BR");
    });
}

function groupSummary(group) {
  const codes = uniqueMarketCodes(group?.codes || []);
  const mediaGroups = Array.from(new Set(codes.map(mediaGroupForMarket).filter((item) => item && item !== "Outro"))).sort();
  const marketCount = codes.length === 1 ? "1 mercado" : `${codes.length} mercados`;
  const summary = [marketCount, mediaGroups.length === 1 ? `mídia ${mediaGroups[0]}` : mediaGroups.length ? `mídias ${mediaGroups.join(", ")}` : ""].filter(Boolean);
  return summary.join(" · ");
}

function buildConsolidatedPublishResult({
  form,
  selectedTemplate,
  selectedMetaAccount,
  rows,
  marketOptions,
  mediaByMarket,
  summary,
} = {}) {
  const now = new Date().toISOString();
  return {
    templateId: selectedTemplate?.id ?? null,
    templateName: form?.name || selectedTemplate?.name || null,
    metaAccountId: selectedMetaAccount?.id ?? form?.metaAccountId ?? null,
    metaAdAccountId: selectedMetaAccount?.metaAdAccountId ?? null,
    createdAt: now,
    updatedAt: now,
    summary,
    mercadosProcessados: (rows || []).map((row) => {
      const market = marketOptions.find((item) => item.code === row.marketCode) ?? marketInfo(row.marketCode);
      const finalUrl = buildOperationalDestinationUrl(form, row.marketCode);
      const media = AD_KEYS.reduce((acc, adKey) => {
        const entry = getMarketMediaEntry(mediaByMarket, row.marketCode, adKey);
        acc[adKey] = {
          detected: Boolean(entry.creativeAssetId),
          type: mediaTypeLabel(entry),
          filename: mediaLabel(entry),
          creativeAssetId: entry.creativeAssetId || null,
        };
        return acc;
      }, {});
      let utm = {};
      try {
        const parsed = new URL(finalUrl);
        utm = {
          utm_source: parsed.searchParams.get("utm_source") || null,
          utm_medium: parsed.searchParams.get("utm_medium") || null,
          utm_campaign: parsed.searchParams.get("utm_campaign") || null,
          src: parsed.searchParams.get("src") || null,
        };
      } catch {
        utm = {};
      }
      return {
        marketCode: row.marketCode,
        marketName: market.name,
        generatedName: row.marketParam || row.marketName || null,
        status: row.error ? "error" : row.step || "pending",
        campaignId: row.metaCampaignId || null,
        adSetId: row.metaAdSetId || null,
        creativeId: row.metaCreativeId || null,
        adId: row.metaAdId || null,
        creatives: Array.isArray(row.creatives) ? row.creatives : [],
        ads: Array.isArray(row.ads) ? row.ads : [],
        skippedAds: Array.isArray(row.skippedAds) ? row.skippedAds : [],
        configuredStatus: row.configuredStatus || null,
        effectiveStatus: row.effectiveStatus || null,
        finalUrl,
        utm,
        media,
        diagnostics: {
          idsAvailable: {
            campaign: Boolean(row.metaCampaignId),
            adset: Boolean(row.metaAdSetId),
            creative: Boolean(row.metaCreativeId),
            ad: Boolean(row.metaAdId),
          },
          lastResult: row.lastResult ?? null,
        },
        originalErrors: row.error ? [{ step: row.failedStep || row.step || null, message: row.error }] : [],
      };
    }),
  };
}

function mapGeneration(row) {
  return {
    id: row?.id ?? "",
    marketCode: row?.market_code ?? row?.marketCode ?? "",
    marketName: row?.market_name ?? row?.marketName ?? "",
    marketParam: row?.market_param ?? row?.marketParam ?? "",
    utmCampaign: row?.utm_campaign ?? row?.utmCampaign ?? "",
    src: row?.src ?? "",
    targetingPreview: row?.targeting_preview ?? row?.targetingPreview ?? {},
    metaCampaignId: "",
    metaAdSetId: "",
    metaCreativeId: "",
    metaAdId: "",
    creatives: emptyVariantState(),
    ads: emptyVariantState(),
    skippedAds: [],
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

  const variantKey = normalizeNonEmptyString(result?.variantKey);
  const nextCreatives = Array.isArray(row.creatives) ? [...row.creatives] : emptyVariantState();
  const nextAds = Array.isArray(row.ads) ? [...row.ads] : emptyVariantState();
  if (variantKey && result?.metaCreativeId) {
    const index = AD_KEYS.indexOf(variantKey);
    if (index >= 0) {
      nextCreatives[index] = {
        adNumber: adNumber(variantKey),
        variantKey,
        creativeId: result.metaCreativeId,
        creativeDraftId: result.creativeDraftId || null,
        status: result.status || "PAUSED",
      };
    }
  }
  if (variantKey && result?.metaAdId) {
    const index = AD_KEYS.indexOf(variantKey);
    if (index >= 0) {
      nextAds[index] = {
        adNumber: adNumber(variantKey),
        variantKey,
        adId: result.metaAdId,
        generatedAdId: result.generatedAdId || null,
        status: result.status || "PAUSED",
      };
    }
  }

  return {
    ...row,
    metaCampaignId: result?.metaCampaignId || campaignMeta.id || generatedCampaign.meta_campaign_id || row.metaCampaignId || "",
    metaAdSetId: result?.metaAdSetId || adSetMeta.id || generatedCampaign.meta_adset_id || generatedAdSet.meta_adset_id || row.metaAdSetId || "",
    metaCreativeId: variantKey && variantKey !== "A" ? row.metaCreativeId || "" : result?.metaCreativeId || meta?.creative?.id || row.metaCreativeId || "",
    metaAdId: variantKey && variantKey !== "A" ? row.metaAdId || "" : result?.metaAdId || adMeta.id || generatedCampaign.meta_ad_id || generatedAd.meta_ad_id || row.metaAdId || "",
    creatives: nextCreatives,
    ads: nextAds,
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
    failedStep: "",
    lastResult: result,
  };
}

function rowsWith(rows, predicate) {
  return (rows || []).filter(predicate).length;
}

function actionState({ rows, busyStep, runningStep, canRun, completeCount, errorCount, blockedReason, targetCount }) {
  const target = Number(targetCount) || rows.length;
  if (busyStep === runningStep) return { label: "Em execução", tone: "info", disabled: true, title: "Etapa em execução." };
  if (!canRun) return { label: "Bloqueado", tone: "muted", disabled: true, title: blockedReason };
  if (completeCount > 0 && completeCount >= target) return { label: "Concluído", tone: "good", disabled: false, title: "Etapa concluída para todos os mercados." };
  if (errorCount > 0 || completeCount > 0) {
    return {
      label: "Parcial",
      tone: "warn",
      disabled: false,
      title: errorCount > 0 ? "Alguns mercados tiveram erro. Verifique a tabela abaixo." : "Etapa concluída em parte dos mercados.",
    };
  }
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
    <div className="opsPublishCard">
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
    </div>
  );
}

function SectionBlock({ eyebrow, title, description, action, children }) {
  return (
    <section className="opsSection">
      <div className="opsSectionHead">
        <div>
          {title ? (
            <>
              {eyebrow ? <div className="templatesCardLabel" style={{ marginBottom: 6 }}>{eyebrow}</div> : null}
              <h3 className="opsSectionTitle">{title}</h3>
            </>
          ) : (
            <h3 className="opsSectionTitle">{eyebrow}</h3>
          )}
          {description ? <p className="opsSectionText">{description}</p> : null}
        </div>
        {action ? <div className="opsSectionAction">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function OpsMetric({ label, value, tone = "muted", detail }) {
  return (
    <div className="opsMetric">
      <div className="opsMetricTop">
        <span>{label}</span>
        <StatusPill tone={tone}>{value}</StatusPill>
      </div>
      {detail ? <div className="opsMetricDetail">{detail}</div> : null}
    </div>
  );
}

function OpsStep({ label, done, active }) {
  return (
    <div className={`opsStep ${done ? "opsStepDone" : ""} ${active ? "opsStepActive" : ""}`}>
      <span className="opsStepDot" />
      <span>{label}</span>
    </div>
  );
}

function MarketChipList({ markets }) {
  if (!markets.length) return <span className="muted" style={{ fontWeight: 850 }}>Nenhum mercado selecionado.</span>;
  return (
    <div className="opsChipList">
      {markets.slice(0, 18).map((market) => (
        <span key={market.code} className="templatesCountryTag" title={`${market.name} · ${market.language}`}>
          {market.code}
        </span>
      ))}
      {markets.length > 18 ? <span className="templatesCountryTag">+{markets.length - 18}</span> : null}
    </div>
  );
}

function mediaCountForMarket(mediaByMarket, marketCode) {
  return AD_KEYS.filter((key) => getMarketMediaEntry(mediaByMarket, marketCode, key).creativeAssetId).length;
}

function variantTextForMarket({ form, translationDrafts, marketCode, adKey }) {
  const index = AD_KEYS.indexOf(String(adKey || "").trim().toUpperCase());
  const translated = normalizeObject(translationDrafts?.[marketCode]);
  const translatedVariant = normalizeObject(Array.isArray(translated.adVariants) ? translated.adVariants[index] : null);
  const baseVariant = normalizeObject(Array.isArray(form?.adVariants) ? form.adVariants[index] : null);
  return {
    primaryText: normalizeNonEmptyString(translatedVariant.primaryText) || normalizeNonEmptyString(baseVariant.primaryText),
    headline: normalizeNonEmptyString(translatedVariant.headline) || normalizeNonEmptyString(baseVariant.headline),
    description: normalizeNonEmptyString(translatedVariant.description) || normalizeNonEmptyString(baseVariant.description),
  };
}

function publishableVariantsForRow({ form, translationDrafts, row }) {
  return AD_KEYS.map((adKey) => {
    const text = variantTextForMarket({ form, translationDrafts, marketCode: row?.marketCode, adKey });
    const media = getMarketMediaEntry(form?.mediaByMarket, row?.marketCode, adKey);
    const missing = [
      !text.primaryText ? "texto" : "",
      !text.headline ? "título" : "",
      !text.description ? "descrição" : "",
      !media.creativeAssetId ? "mídia" : "",
    ].filter(Boolean);
    return {
      adNumber: adNumber(adKey),
      variantKey: adKey,
      text,
      media,
      complete: missing.length === 0,
      missing,
    };
  });
}

function translationEntryStatus(entry) {
  const variants = Array.isArray(entry?.adVariants) ? entry.adVariants : [];
  const first = normalizeObject(variants[0]);
  const complete = Boolean(
    normalizeNonEmptyString(first.primaryText) &&
      normalizeNonEmptyString(first.headline) &&
      normalizeNonEmptyString(first.description),
  );
  return complete ? "revisável" : variants.length ? "incompleta" : "pendente";
}

function MarketGroupModal({
  groups,
  group,
  query,
  onQueryChange,
  draftSelection,
  onSelectCategory,
  onToggle,
  onSelectGroup,
  onClearGroup,
  onClose,
  onConfirm,
}) {
  if (!group) return null;
  const q = normalizeNonEmptyString(query).toLowerCase();
  const markets = group.codes
    .map(marketInfo)
    .filter((market) => {
      if (!q) return true;
      return [market.code, market.name, market.language, mediaGroupForMarket(market.code), ...regionLabelsForMarket(market)]
        .join(" ")
        .toLowerCase()
        .includes(q);
  });
  const selectedInGroup = group.codes.filter((code) => draftSelection.has(code)).length;
  const currentGroupSummary = groupSummary(group);

  return (
    <div className="opsModalBackdrop" role="presentation" onMouseDown={onClose}>
      <section className="opsMarketModal" role="dialog" aria-modal="true" aria-label={`Selecionar mercados: ${group.title}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="opsMarketModalHead">
          <div>
            <div className="templatesCardLabel">Mercados por idioma</div>
            <h3>Selecionar mercados</h3>
          </div>
          <button type="button" className="templatesBtnOutline" onClick={onClose}>Fechar</button>
        </div>

        <div className="opsMarketModalToolbar">
          <InputLike value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar código, nome ou idioma..." />
          <button type="button" className="templatesBtnOutline" onClick={onSelectGroup}>Selecionar todos do grupo</button>
          <button type="button" className="templatesBtnOutline" onClick={onClearGroup}>Limpar grupo</button>
        </div>

        <div className="opsMarketCategoryRail">
          {(groups || []).map((item) => {
            const selectedCount = item.codes.filter((code) => draftSelection.has(code)).length;
            return (
              <button
                key={item.key}
                type="button"
                className={`opsMarketCategoryButton opsMarketCategoryTone-${item.tone || "other"} ${item.key === group.key ? "opsMarketCategoryButtonActive" : ""}`}
                onClick={() => onSelectCategory(item)}
              >
                <span className="opsMarketCategoryIcon" aria-hidden="true">{item.icon || "🌎"}</span>
                <span className="opsMarketCategoryTitle">{item.title}</span>
                <small>{selectedCount}/{item.codes.length} selecionados</small>
              </button>
            );
          })}
        </div>

        <div className="opsMarketModalSummary">
          <StatusPill tone={selectedInGroup === group.codes.length ? "good" : selectedInGroup ? "info" : "muted"}>
            {selectedInGroup}/{group.codes.length} selecionados
          </StatusPill>
          <span><strong>{group.icon || "🌎"} {group.title}</strong> · {currentGroupSummary}</span>
        </div>

        <div className="opsMarketModalList">
          {markets.map((market) => {
            const selected = draftSelection.has(market.code);
            return (
              <label key={market.code} className={`opsMarketModalItem ${selected ? "opsMarketModalItemSelected" : ""}`}>
                <input type="checkbox" checked={selected} onChange={() => onToggle(market.code)} />
                <span className="opsMarketModalCode">{market.code}</span>
                <span className="opsMarketModalName">
                  <strong>{market.name}</strong>
                  <small>{marketDescription(market)}</small>
                </span>
              </label>
            );
          })}
          {!markets.length ? <div className="templatesHintBox">Nenhum mercado encontrado para a busca.</div> : null}
        </div>

        <div className="opsMarketModalFooter">
          <button type="button" className="templatesBtnOutline" onClick={onClose}>Cancelar</button>
          <button type="button" className="templatesBtnPrimary" onClick={onConfirm}>Confirmar seleção</button>
        </div>
      </section>
    </div>
  );
}

function JsonModal({ title, description, value, onClose, onCopy }) {
  if (!title) return null;
  function downloadJson() {
    const blob = new Blob([safeJson(value)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "json"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="opsModalBackdrop" role="presentation" onMouseDown={onClose}>
      <section className="opsJsonModal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="opsMarketModalHead">
          <div>
            <div className="templatesCardLabel">JSON técnico</div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="templatesBtnOutline" onClick={onClose}>Fechar</button>
        </div>
        <pre className="opsJsonPre">{safeJson(value)}</pre>
        <div className="opsMarketModalFooter">
          <button type="button" className="templatesBtnOutline" onClick={onClose}>Fechar</button>
          <button type="button" className="templatesBtnOutline" onClick={downloadJson}>Baixar JSON</button>
          <button type="button" className="templatesBtnPrimary" onClick={onCopy}>Copiar JSON</button>
        </div>
      </section>
    </div>
  );
}

function ConfirmDeleteModal({ templateName, onCancel, onConfirm, busy }) {
  if (!templateName) return null;
  return (
    <div className="opsModalBackdrop" role="presentation" onMouseDown={onCancel}>
      <section className="opsConfirmModal" role="dialog" aria-modal="true" aria-label="Excluir template" onMouseDown={(event) => event.stopPropagation()}>
        <div className="opsMarketModalHead">
          <div>
            <div className="templatesCardLabel">Confirmação</div>
            <h3>Excluir template</h3>
            <p>Essa ação remove apenas o template interno. Objetos Meta já criados não serão apagados.</p>
          </div>
        </div>
        <div className="opsConfirmBody">
          <span>Template</span>
          <strong>{templateName}</strong>
        </div>
        <div className="opsMarketModalFooter">
          <button type="button" className="templatesBtnOutline" disabled={busy} onClick={onCancel}>Cancelar</button>
          <button type="button" className="templatesBtnDanger" disabled={busy} onClick={onConfirm}>
            {busy ? "Excluindo..." : "Excluir template"}
          </button>
        </div>
      </section>
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
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  const [activeOperationalLanguageKeys, setActiveOperationalLanguageKeys] = useState(null);
  const [translationDrafts, setTranslationDrafts] = useState({});
  const [translationsDirty, setTranslationsDirty] = useState(false);
  const [rows, setRows] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [busyStep, setBusyStep] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [openAdKey, setOpenAdKey] = useState("A");
  const [bulkVideoRows, setBulkVideoRows] = useState([]);
  const [workspaceTab, setWorkspaceTab] = useState("create");
  const [diagnosticTarget, setDiagnosticTarget] = useState(null);
  const [marketPickerGroup, setMarketPickerGroup] = useState(null);
  const [marketPickerQuery, setMarketPickerQuery] = useState("");
  const [marketPickerDraft, setMarketPickerDraft] = useState([]);
  const [jsonModal, setJsonModal] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const selectedTemplate = useMemo(() => templates.find((template) => String(template.id) === String(selectedId)) ?? null, [templates, selectedId]);
  const selectedPayload = useMemo(() => getPayload(selectedTemplate), [selectedTemplate]);
  const selectedSet = useMemo(() => new Set(selectedMarkets), [selectedMarkets]);
  const marketOptions = useMemo(() => selectedMarkets.map(marketInfo), [selectedMarkets]);
  const marketPickerGroups = useMemo(() => buildMarketPickerGroups(activeOperationalLanguageKeys, selectedMarkets), [activeOperationalLanguageKeys, selectedMarkets]);
  const marketPickerDraftSet = useMemo(() => new Set(marketPickerDraft), [marketPickerDraft]);
  const filteredTemplates = useMemo(() => {
    const q = normalizeNonEmptyString(listQuery).toLowerCase();
    if (!q) return templates;
    return templates.filter((template) => String(template?.name || "").toLowerCase().includes(q));
  }, [templates, listQuery]);
  const mediaGroupSummary = useMemo(() => {
    return Object.entries(BULK_VIDEO_GROUPS).flatMap(([group, codes]) => {
      const selectedCodes = codes.filter((code) => selectedSet.has(code));
      if (!selectedCodes.length) return [];
      const missing = AD_KEYS.filter((adKey) =>
        selectedCodes.length > 0 && selectedCodes.some((code) => !getMarketMediaEntry(form.mediaByMarket, code, adKey).creativeAssetId),
      );
      const groupInfo = getOperationalMediaGroupInfo(group);
      return {
        group,
        language: groupInfo?.language || group,
        selectedCodes,
        missing,
        complete: selectedCodes.length > 0 && missing.length === 0,
      };
    });
  }, [form.mediaByMarket, selectedSet]);

  const selectedMetaAccount = useMemo(
    () => metaAccounts.find((account) => String(account.id) === String(form.metaAccountId)) ?? null,
    [metaAccounts, form.metaAccountId],
  );
  const metaAdAccountId = selectedMetaAccount?.metaAdAccountId || "";
  const pageId = normalizeNonEmptyString(form.pageId) || selectedMetaAccount?.metaPageId || "";
  const instagramActorId = selectedMetaAccount?.metaInstagramActorId || "";
  const hasBaseText = adVariantsWithText(form.adVariants).length > 0;
  const canUseRows = rows.length > 0;
  const campaignCount = rowsWith(rows, (row) => row.metaCampaignId);
  const adSetCount = rowsWith(rows, (row) => row.metaAdSetId);
  const publishableSlotsByMarket = useMemo(
    () =>
      rows.reduce((acc, row) => {
        acc[row.id] = publishableVariantsForRow({ form, translationDrafts, row });
        return acc;
      }, {}),
    [rows, form, translationDrafts],
  );
  const expectedAdCount = Object.values(publishableSlotsByMarket).reduce((sum, slots) => sum + slots.filter((slot) => slot.complete).length, 0);
  const creativeCount = rows.reduce(
    (sum, row) => sum + (Array.isArray(row.creatives) ? row.creatives.filter((item) => item.creativeId).length : row.metaCreativeId ? 1 : 0),
    0,
  );
  const adCount = rows.reduce(
    (sum, row) => sum + (Array.isArray(row.ads) ? row.ads.filter((item) => item.adId).length : row.metaAdId ? 1 : 0),
    0,
  );
  const anyMetaCount = rowsWith(
    rows,
    (row) =>
      row.metaCampaignId ||
      row.metaAdSetId ||
      row.metaCreativeId ||
      row.metaAdId ||
      (Array.isArray(row.creatives) && row.creatives.some((item) => item.creativeId)) ||
      (Array.isArray(row.ads) && row.ads.some((item) => item.adId)),
  );
  const campaignErrorCount = rowsWith(rows, (row) => row.error && row.failedStep === "Campaign publicada");
  const adSetErrorCount = rowsWith(rows, (row) => row.error && row.failedStep === "AdSet publicado");
  const creativeErrorCount = rowsWith(rows, (row) => row.error && row.failedStep === "Creative publicado");
  const adErrorCount = rowsWith(rows, (row) => row.error && row.failedStep === "Ad publicado");
  const actions = {
    campaign: actionState({
      rows,
      busyStep,
      runningStep: "campaign",
      canRun: canUseRows,
      completeCount: campaignCount,
      errorCount: campaignErrorCount,
      blockedReason: "Gere o operacional primeiro.",
    }),
    adset: actionState({
      rows,
      busyStep,
      runningStep: "adset",
      canRun: canUseRows && campaignCount > 0,
      completeCount: adSetCount,
      errorCount: adSetErrorCount,
      blockedReason: "Publique a Campaign primeiro.",
    }),
    creative: actionState({
      rows,
      busyStep,
      runningStep: "creative",
      canRun: canUseRows && adSetCount > 0 && expectedAdCount > 0,
      completeCount: creativeCount,
      errorCount: creativeErrorCount,
      blockedReason: "Publique o AdSet primeiro.",
      targetCount: expectedAdCount,
    }),
    ad: actionState({
      rows,
      busyStep,
      runningStep: "ad",
      canRun: canUseRows && creativeCount > 0,
      completeCount: adCount,
      errorCount: adErrorCount,
      blockedReason: "Publique o Creative primeiro.",
      targetCount: expectedAdCount,
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
  const translationCount = marketOptions.filter((market) => translationEntryStatus(translationDrafts?.[market.code]) === "revisável").length;
  const incompleteTranslationCount = marketOptions.filter((market) => translationEntryStatus(translationDrafts?.[market.code]) === "incompleta").length;
  const selectedMediaMarkets = marketOptions.filter((market) => mediaCountForMarket(form.mediaByMarket, market.code) > 0).length;
  const completeMediaGroups = mediaGroupSummary.filter((item) => item.complete).length;
  const publicationDone = rows.length > 0 && expectedAdCount > 0 && adCount >= expectedAdCount;
  const hasAutomaticUrlBase = Boolean(normalizeNonEmptyString(form.domain) && normalizeNonEmptyString(form.brazilPermalink) && normalizeNonEmptyString(form.internationalPermalink));
  const hasLegacyDestinationUrl = Boolean(normalizeNonEmptyString(form.destinationUrl));
  const baseReady = Boolean(normalizeNonEmptyString(form.name) && normalizeNonEmptyString(form.nicheParam) && (hasAutomaticUrlBase || hasLegacyDestinationUrl));
  const creativeReady = hasBaseText;
  const marketsReady = selectedMarkets.length > 0;
  const canGenerateTranslations = Boolean(selectedId) && hasBaseText && marketsReady;
  const translationsReady = selectedMarkets.length > 0 && translationCount === selectedMarkets.length;
  const mediaReady = selectedMarkets.length > 0 && selectedMediaMarkets === selectedMarkets.length;
  const operationalReady = rows.length > 0;
  const nextPrimaryAction = !selectedId
    ? { label: "Criar template", onClick: () => saveTemplate(), disabled: Boolean(busyStep) }
    : !translationsReady
      ? { label: busyStep === "translations" ? "Gerando..." : "Gerar traduções", onClick: generateTranslations, disabled: Boolean(busyStep) || !canGenerateTranslations }
      : !mediaReady
        ? { label: "Associe mídias", onClick: () => {}, disabled: true }
      : !operationalReady
        ? { label: busyStep === "operational" ? "Preparando..." : "Preparar publicação", onClick: generateOperational, disabled: Boolean(busyStep) || !selectedId }
          : campaignCount < rows.length
          ? { label: busyStep === "campaign" ? "Publicando..." : "Publicar campanha em PAUSED", onClick: publishCampaigns, disabled: actions.campaign.disabled }
          : adSetCount < rows.length
            ? { label: busyStep === "adset" ? "Publicando..." : "Publicar conjunto em PAUSED", onClick: publishAdSets, disabled: actions.adset.disabled }
            : creativeCount < expectedAdCount
              ? { label: busyStep === "creative" ? "Publicando..." : "Publicar criativo em PAUSED", onClick: publishCreatives, disabled: actions.creative.disabled }
              : adCount < expectedAdCount
                ? { label: busyStep === "ad" ? "Publicando..." : "Publicar anúncio em PAUSED", onClick: publishAds, disabled: actions.ad.disabled }
                : { label: busyStep === "sync" ? "Sincronizando..." : "Sincronizar status", onClick: syncStatus, disabled: actions.sync.disabled };
  const nextStepText = !baseReady
    ? "Preencha nome, parâmetro do nicho e URL automática."
    : !creativeReady
      ? "Crie pelo menos o texto do Ad 1."
    : !marketsReady
        ? "Selecione os mercados."
        : !translationsReady
          ? "Gere e revise as traduções."
          : !mediaReady
            ? "Associe mídia aos mercados selecionados."
            : !operationalReady
              ? "Prepare a publicação."
              : !publicationDone
                ? "Continue a publicação PAUSED pela próxima etapa."
                : "Sincronize status e diagnostique os objetos Meta.";
  const selectedMarketLanguages = Array.from(new Set(marketOptions.map((market) => market.language).filter(Boolean))).slice(0, 8);
  const selectedMediaGroups = Array.from(new Set(marketOptions.map((market) => mediaGroupForMarket(market.code)).filter(Boolean))).sort();
  const brUrlPreview = buildOperationalDestinationUrl(form, "BR");
  const internationalUrlPreview = buildOperationalDestinationUrl(form, "DE");
  const finalSummary = {
    processedMarkets: rows.length,
    campaigns: campaignCount,
    adSets: adSetCount,
    creatives: creativeCount,
    ads: adCount,
    allPaused: rows.length > 0 && rows.every((row) => !row.configuredStatus || row.configuredStatus === "PAUSED"),
    validUtm: rows.filter((row) => {
      try {
        const parsed = new URL(buildOperationalDestinationUrl(form, row.marketCode));
        return (
          parsed.searchParams.get("utm_source") === "facebook" &&
          parsed.searchParams.get("utm_medium") === "cpa" &&
          parsed.searchParams.get("utm_campaign") === row.marketCode &&
          parsed.searchParams.get("src") === `${row.marketCode}-${form.nicheParam}-FB` &&
          parsed.searchParams.get("niche") === form.nicheParam
        );
      } catch {
        return false;
      }
    }).length,
    mediaDetected: rows.filter((row) => mediaCountForMarket(form.mediaByMarket, row.marketCode) > 0).length,
    diagnosticsWithoutCriticalAlert: rows.filter((row) => !row.error).length,
  };
  const consolidatedResult = useMemo(
    () =>
      buildConsolidatedPublishResult({
        form,
        selectedTemplate,
        selectedMetaAccount,
        rows,
        marketOptions,
        mediaByMarket: form.mediaByMarket,
        summary: finalSummary,
      }),
    [form, selectedTemplate, selectedMetaAccount, rows, marketOptions, finalSummary],
  );

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    let alive = true;
    getAuthMe()
      .then((res) => {
        if (!alive) return;
        const keys = Array.isArray(res?.user?.operationalLanguageKeys) ? res.user.operationalLanguageKeys : null;
        setActiveOperationalLanguageKeys(keys);
      })
      .catch(() => {
        if (!alive) return;
        setActiveOperationalLanguageKeys(null);
      });
    return () => {
      alive = false;
    };
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

    const targetSelectedId = selectId !== undefined ? selectId : selectedId;
    const nextSelected = nextTemplates.find((template) => String(template.id) === String(targetSelectedId)) ?? null;
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
    setTranslationsDirty(false);
    const savedMarkets = getSavedTemplateMarkets(getPayload(template));
    setSelectedMarkets(savedMarkets);
  }

  function newTemplate() {
    setSelectedId("");
    setRows([]);
    setCampaignId("");
    setTranslationDrafts({});
    setTranslationsDirty(false);
    setSelectedMarkets([]);
    setForm({ ...EMPTY_FORM, metaAccountId: defaultMetaAccountId });
    setWorkspaceTab("create");
  }

  function openDiagnostic(row, type, id) {
    const normalizedId = normalizeNonEmptyString(id);
    if (!normalizedId) {
      setError(`ID Meta ausente para ${type} em ${row?.marketCode || row?.marketParam || "mercado"}.`);
      return;
    }
    setDiagnosticTarget({
      rowId: row?.id || "",
      marketCode: row?.marketCode || "",
      marketParam: row?.marketParam || "",
      type,
      id: normalizedId,
    });
  }

  function openRowDiagnostics(row) {
    const ids = {
      campaign: normalizeNonEmptyString(row?.metaCampaignId),
      adset: normalizeNonEmptyString(row?.metaAdSetId),
      creative: normalizeNonEmptyString(row?.metaCreativeId),
      ad: normalizeNonEmptyString(row?.metaAdId),
    };
    if (!Object.values(ids).some(Boolean)) {
      setError(`Nenhum ID Meta disponível para diagnosticar em ${row?.marketCode || row?.marketParam || "mercado"}.`);
      return;
    }
    setDiagnosticTarget({
      rowId: row?.id || "",
      marketCode: row?.marketCode || "",
      marketParam: row?.marketParam || "",
      type: "all",
      ids,
    });
  }

  function updateVariant(index, field, value) {
    setForm((prev) => {
      const next = Array.isArray(prev.adVariants) ? [...prev.adVariants] : [...EMPTY_FORM.adVariants];
      while (next.length < AD_KEYS.length) next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
      next[index] = { ...normalizeObject(next[index]), key: AD_KEYS[index], [field]: value };
      return { ...prev, adVariants: next };
    });
  }

  async function persistMediaByMarket(nextMediaByMarket, message) {
    const nextForm = { ...form, mediaByMarket: nextMediaByMarket };
    setForm(nextForm);
    if (!selectedId) {
      setNotice(`${message} Salve o template para persistir a mídia.`);
      return;
    }
    const payload = buildPayload(nextForm, selectedPayload, selectedMarkets);
    await updateFlowTemplate(selectedId, { name: normalizeNonEmptyString(nextForm.name), payload });
    setTemplates((prev) =>
      prev.map((template) =>
        String(template.id) === String(selectedId) ? { ...template, payload, name: normalizeNonEmptyString(nextForm.name) || template.name } : template,
      ),
    );
    setNotice(`${message} Mídia salva no template.`);
  }

  async function setMarketMedia(marketCode, adKey, entry) {
    const code = String(marketCode || "").trim().toUpperCase();
    const key = String(adKey || "A").trim().toUpperCase();
    if (!code || !AD_KEYS.includes(key)) return;
    const record = mediaRecordFromEntry(entry, key);
    if (!record) return;
    const previous = normalizeObject(form.mediaByMarket?.[code]);
    const nextMediaByMarket = {
      ...normalizeObject(form.mediaByMarket),
      [code]: {
        ...previous,
        ...record,
        [key]: record[key],
      },
    };
    await persistMediaByMarket(nextMediaByMarket, `Mídia definida para ${code} ${adLabel(key)}.`);
  }

  async function setMediaForAllMarkets(entry, adKey = "A") {
    const key = String(adKey || "A").trim().toUpperCase();
    const record = mediaRecordFromEntry(entry, key);
    if (!record) return;
    const targetMarkets = marketOptions;
    if (!targetMarkets.length) throw new Error("Selecione ao menos um mercado antes de aplicar mídia.");
    const nextMediaByMarket = { ...normalizeObject(form.mediaByMarket) };
    for (const market of targetMarkets) {
      const previous = normalizeObject(nextMediaByMarket?.[market.code]);
      nextMediaByMarket[market.code] = { ...previous, ...record, [key]: record[key] };
    }
    await persistMediaByMarket(nextMediaByMarket, `Mídia aplicada em ${targetMarkets.length} mercado(s).`);
  }

  async function removeMarketMedia(marketCode) {
    const code = String(marketCode || "").trim().toUpperCase();
    if (!code) return;
    const nextMediaByMarket = { ...normalizeObject(form.mediaByMarket) };
    delete nextMediaByMarket[code];
    await persistMediaByMarket(nextMediaByMarket, `Mídia removida de ${code}.`);
  }

  async function uploadAssetForMarket(marketCode, adKey, file) {
    if (!file) return;
    await runStep("asset", async () => {
      const res = await uploadCreativeAsset(file);
      const entry = withAutoThumbnail(normalizeAsset(res.creativeAsset), res.autoThumbnailAsset);
      if (!entry) throw new Error("Falha ao obter mídia após upload.");
      setCreativeAssets((prev) => [res.creativeAsset, ...(res.autoThumbnailAsset ? [res.autoThumbnailAsset] : []), ...prev].filter(Boolean));
      await setMarketMedia(marketCode, adKey, entry);
    });
  }

  async function uploadAssetForAllMarkets(file) {
    if (!file) return;
    await runStep("asset", async () => {
      const res = await uploadCreativeAsset(file);
      const entry = withAutoThumbnail(normalizeAsset(res.creativeAsset), res.autoThumbnailAsset);
      if (!entry) throw new Error("Falha ao obter mídia após upload.");
      setCreativeAssets((prev) => [res.creativeAsset, ...(res.autoThumbnailAsset ? [res.autoThumbnailAsset] : []), ...prev].filter(Boolean));
      await setMediaForAllMarkets(entry);
    });
  }

  async function uploadAssetForMediaGroup(group, adKey, file) {
    if (!file) return;
    const selectedCodes = mediaGroupSummary.find((item) => item.group === group)?.selectedCodes || [];
    if (!selectedCodes.length) throw new Error("Selecione mercados para este grupo antes de trocar mídia.");
    await runStep("asset", async () => {
      const res = await uploadCreativeAsset(file);
      const entry = withAutoThumbnail(normalizeAsset(res.creativeAsset), res.autoThumbnailAsset);
      if (!entry) throw new Error("Falha ao obter mídia após upload.");
      setCreativeAssets((prev) => [res.creativeAsset, ...(res.autoThumbnailAsset ? [res.autoThumbnailAsset] : []), ...prev].filter(Boolean));
      const key = String(adKey || DEFAULT_AD_KEY).trim().toUpperCase();
      const record = mediaRecordFromEntry(entry, key);
      if (!record) return;
      const nextMediaByMarket = { ...normalizeObject(form.mediaByMarket) };
      for (const marketCode of selectedCodes) {
        const previous = normalizeObject(nextMediaByMarket?.[marketCode]);
        nextMediaByMarket[marketCode] = { ...previous, ...record, [key]: record[key] };
      }
      await persistMediaByMarket(nextMediaByMarket, `Mídia definida para Grupo ${group} ${adLabel(key)}.`);
    });
  }

  async function selectExistingAsset(marketCode, adKey, assetId) {
    const asset = creativeAssets.find((item) => String(item.id) === String(assetId)) ?? null;
    const entry = normalizeAsset(asset);
    if (!entry) return;
    await runStep("asset", async () => {
      await setMarketMedia(marketCode, adKey, entry);
    });
  }

  async function selectExistingAssetForAllMarkets(assetId) {
    const asset = creativeAssets.find((item) => String(item.id) === String(assetId)) ?? null;
    const entry = normalizeAsset(asset);
    if (!entry) return;
    await runStep("asset", async () => {
      await setMediaForAllMarkets(entry);
    });
  }

  function prepareBulkVideoRows(files) {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    const nextRows = list.map((file, index) => {
      const parsed = parseBulkVideoFilename(file.name);
      const targetMarkets = parsed.recognized ? marketsForBulkGroup(parsed.group, selectedMarkets) : [];
      const groupInfo = getOperationalMediaGroupInfo(parsed.group);
      return {
        id: `${Date.now()}-${index}-${file.name}`,
        file,
        filename: file.name,
        group: parsed.group,
        alias: parsed.alias,
        language: groupInfo?.language || "",
        variantKey: parsed.variantKey,
        targetMarkets,
        recognized: parsed.recognized && targetMarkets.length > 0,
        reason: parsed.recognized && !targetMarkets.length ? "Nenhum mercado selecionado para este grupo." : parsed.reason,
        status: parsed.recognized && targetMarkets.length > 0 ? "Pronto para aplicar" : "Não reconhecido",
        asset: null,
        error: "",
      };
    });
    setBulkVideoRows(nextRows);
    setNotice(`Revisão criada para ${nextRows.length} arquivo(s). Confira antes de aplicar.`);
  }

  function updateBulkVideoRow(rowId, patch) {
    setBulkVideoRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, ...patch };
        const targetMarkets = patch.group !== undefined ? marketsForBulkGroup(next.group, selectedMarkets) : next.targetMarkets;
        const variantKey = normalizeNonEmptyString(next.variantKey);
        const groupInfo = getOperationalMediaGroupInfo(next.group);
        const recognized = Boolean(normalizeNonEmptyString(next.group) && AD_KEYS.includes(variantKey) && targetMarkets.length);
        return {
          ...next,
          group: groupInfo?.group || next.group,
          language: groupInfo?.language || "",
          targetMarkets,
          recognized,
          reason: recognized ? "" : "Selecione um grupo com mercados selecionados e um Ad 1-5.",
          status: recognized ? "Pronto para aplicar" : "Não reconhecido",
        };
      }),
    );
  }

  async function applyBulkVideoRows() {
    await runStep("bulkVideos", async () => {
      const readyRows = bulkVideoRows.filter((row) => row.recognized && row.file && AD_KEYS.includes(row.variantKey) && row.targetMarkets.length);
      if (!readyRows.length) throw new Error("Nenhum vídeo reconhecido para aplicar.");
      let nextMediaByMarket = { ...normalizeObject(form.mediaByMarket) };
      const uploadedAssets = [];
      for (const row of readyRows) {
        setBulkVideoRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, status: "Enviando...", error: "" } : item)));
        const res = await uploadCreativeAsset(row.file);
        const entry = withAutoThumbnail(
          {
            ...normalizeObject(normalizeAsset(res.creativeAsset)),
            sourceGroup: row.group,
            variantKey: row.variantKey,
            filename: row.filename,
            originalName: row.filename,
          },
          res.autoThumbnailAsset,
        );
        if (!entry) throw new Error(`Falha ao obter mídia após upload de ${row.filename}.`);
        uploadedAssets.push(res.creativeAsset, res.autoThumbnailAsset);
        const adEntry = adMediaEntryFromEntry(entry);
        for (const marketCode of row.targetMarkets) {
          const previous = normalizeObject(nextMediaByMarket?.[marketCode]);
          const record = mediaRecordFromEntry(entry, row.variantKey);
          nextMediaByMarket[marketCode] = {
            ...previous,
            ...record,
            [row.variantKey]: adEntry,
          };
        }
        setBulkVideoRows((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? { ...item, status: "Aplicado", asset: res.creativeAsset, error: "", recognized: true }
              : item,
          ),
        );
      }
      setCreativeAssets((prev) => [...uploadedAssets.filter(Boolean), ...prev].filter(Boolean));
      await persistMediaByMarket(nextMediaByMarket, `${readyRows.length} vídeo(s) aplicado(s) por mercado e Ad.`);
    });
  }

  function updateTranslation(marketCode, index, field, value) {
    const code = String(marketCode || "").trim().toUpperCase();
    if (!code) return;
    setTranslationsDirty(true);
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

  function applySavedTemplate(saved, { nextForm, nextTranslations, nextSelectedMarkets } = {}) {
    if (!saved?.id) return;
    const normalizedId = String(saved.id);
    setTemplates((prev) => {
      const exists = prev.some((template) => String(template.id) === normalizedId);
      return exists
        ? prev.map((template) => (String(template.id) === normalizedId ? saved : template))
        : [saved, ...prev];
    });
    setSelectedId(normalizedId);
    setForm(nextForm || templateToForm(saved, { defaultMetaAccountId }));
    setTranslationDrafts(nextTranslations || getTranslations(getPayload(saved)));
    setSelectedMarkets(nextSelectedMarkets || getSavedTemplateMarkets(getPayload(saved)));
  }

  async function saveTemplate({ withTranslations = false } = {}) {
    await runStep("template", async () => {
      const name = normalizeNonEmptyString(form.name);
      if (!name) throw new Error("Informe o nome do template.");
      if (!normalizeNonEmptyString(form.nicheParam)) throw new Error("Informe o parâmetro do nicho.");
      if (!hasAutomaticUrlBase && !hasLegacyDestinationUrl) throw new Error("Informe domínio e permalinks ou mantenha uma URL legada.");
      if (!hasBaseText) throw new Error("Falta texto base. Preencha pelo menos uma variação de anúncio.");

      const payload = buildPayload(form, selectedPayload, selectedMarkets);
      if (withTranslations) {
        payload.translationsByMarket = translationDrafts;
        payload.translationsByMarketReviewedAt = new Date().toISOString();
      }

      const res = selectedId
        ? await updateFlowTemplate(selectedId, { name, payload })
        : await createFlowTemplate({ name, payload });
      const saved = res.flowTemplate;
      applySavedTemplate(saved, {
        nextForm: { ...form, name },
        nextTranslations: withTranslations ? translationDrafts : getTranslations(getPayload(saved)),
        nextSelectedMarkets: selectedMarkets,
      });
      if (withTranslations) setTranslationsDirty(false);
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

  function openMarketPicker(group) {
    setMarketPickerGroup(group ?? marketPickerGroups[0] ?? null);
    setMarketPickerDraft(selectedMarkets);
    setMarketPickerQuery("");
  }

  function toggleMarketPickerDraft(code) {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) return;
    setMarketPickerDraft((prev) => {
      const next = new Set(prev || []);
      if (next.has(normalized)) next.delete(normalized);
      else next.add(normalized);
      return Array.from(next).sort();
    });
  }

  function selectMarketPickerGroup() {
    if (!marketPickerGroup) return;
    setMarketPickerDraft((prev) => uniqueMarketCodes([...(prev || []), ...marketPickerGroup.codes]));
  }

  function clearMarketPickerGroup() {
    if (!marketPickerGroup) return;
    const clearSet = new Set(marketPickerGroup.codes);
    setMarketPickerDraft((prev) => (prev || []).filter((code) => !clearSet.has(code)).sort());
  }

  function confirmMarketPicker() {
    const next = uniqueMarketCodes(marketPickerDraft);
    setSelectedMarkets(next);
    setMarketPickerGroup(null);
    setMarketPickerQuery("");
  }

  async function copyTextToClipboard(text, successMessage) {
    await runStep("copy", async () => {
      await navigator.clipboard.writeText(text);
      setNotice(successMessage);
    });
  }

  function copyGeneralResult() {
    copyTextToClipboard(safeJson(consolidatedResult), "Resultado geral copiado.");
  }

  function openJsonModal(title, value, description = "") {
    setJsonModal({ title, value, description });
  }

  function copyJsonModal() {
    if (!jsonModal) return;
    copyTextToClipboard(safeJson(jsonModal.value), "JSON copiado.");
  }

  function copyId(label, id) {
    const normalizedId = normalizeNonEmptyString(id);
    if (!normalizedId) return;
    copyTextToClipboard(normalizedId, `${label} copiado.`);
  }

  function copySimpleReport() {
    const report = [
      "Publicação concluída",
      `Template: ${form.name || selectedTemplate?.name || "—"}`,
      `Mercados processados: ${finalSummary.processedMarkets}`,
      `Campaigns: ${finalSummary.campaigns}`,
      `AdSets: ${finalSummary.adSets}`,
      `Creatives: ${finalSummary.creatives}`,
      `Ads: ${finalSummary.ads}`,
      `Status: ${finalSummary.allPaused ? "todos em PAUSED" : "verificar status"}`,
      `UTM válida: ${finalSummary.validUtm}/${finalSummary.processedMarkets}`,
      `Mídia detectada: ${finalSummary.mediaDetected}/${finalSummary.processedMarkets}`,
      `Sem erro crítico local: ${finalSummary.diagnosticsWithoutCriticalAlert}/${finalSummary.processedMarkets}`,
    ].join("\n");
    copyTextToClipboard(report, "Relatório simples copiado.");
  }

  async function deleteSelectedTemplate() {
    if (!selectedId) return;
    await runStep("deleteTemplate", async () => {
      await deleteFlowTemplate(selectedId);
      setDeleteConfirmOpen(false);
      newTemplate();
      await refreshAll({ selectId: "" });
      setNotice("Template excluído. Objetos Meta existentes não foram removidos.");
    });
  }

  async function generateTranslations() {
    await runStep("translations", async () => {
      if (!selectedId) throw new Error("Salve ou selecione um template antes de gerar traduções.");
      if (!hasBaseText) throw new Error("Falta texto base para traduzir.");
      const markets = Array.from(new Set((selectedMarkets || []).map((code) => String(code || "").trim().toUpperCase()).filter(Boolean)));
      if (!markets.length) throw new Error("Selecione ao menos um mercado.");
      const currentPayload = buildPayload(form, selectedPayload, markets);
      currentPayload.translationsByMarket = translationDrafts;
      await updateFlowTemplate(selectedId, { name: normalizeNonEmptyString(form.name), payload: currentPayload });
      const res = await generateCampaignTemplateTranslationsByMarket(selectedId, { markets, overwrite: true });
      const updatedTemplate = res.campaignTemplate;
      const updatedPayload = {
        ...getPayload(updatedTemplate),
        selectedMarkets: markets,
        operational: {
          ...normalizeObject(getPayload(updatedTemplate)?.operational),
          selectedMarkets: markets,
        },
      };
      const mergedTemplate = updatedTemplate ? { ...updatedTemplate, payload: updatedPayload } : null;
      const nextTranslations = getTranslations(updatedPayload);
      applySavedTemplate(mergedTemplate, {
        nextForm: { ...form },
        nextTranslations,
        nextSelectedMarkets: markets,
      });
      setTranslationsDirty(false);
      if (res.generated.length === 0 && res.baseMarkets.includes("BR")) {
        setNotice("BR usa o texto base em Português. Nenhuma tradução externa necessária.");
      } else {
        const baseNotice = res.baseMarkets.includes("BR") ? " BR usa o texto base." : "";
        setNotice(`Traduções atualizadas: ${res.generated.length}.${baseNotice}`);
      }
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
    const payload = buildPayload(form, selectedPayload, selectedMarkets);
    payload.translationsByMarket = translationDrafts;
    payload.translationsByMarketReviewedAt = new Date().toISOString();
    const res = await updateFlowTemplate(selectedId, { name: normalizeNonEmptyString(form.name), payload });
    applySavedTemplate(res.flowTemplate, {
      nextForm: { ...form },
      nextTranslations: translationDrafts,
      nextSelectedMarkets: selectedMarkets,
    });
    setTranslationsDirty(false);
  }

  function updateRow(id, updater) {
    setRows((prev) => prev.map((row) => (String(row.id) === String(id) ? updater(row) : row)));
  }

  async function runRows(step, handler) {
    if (!rows.length) throw new Error("Gere o operacional antes de publicar.");
    for (const row of rows) {
      updateRow(row.id, (current) => ({ ...current, step: `${step}...`, error: "", failedStep: "" }));
      try {
        const result = await handler(row);
        updateRow(row.id, (current) => mergeResult(current, result, step));
      } catch (err) {
        const formatted = formatBackendError(err);
        updateRow(row.id, (current) => ({
          ...current,
          step,
          ok: false,
          error: formatted,
          failedStep: step,
          lastResult: buildTechnicalError(current, step, err, formatted),
        }));
      }
    }
  }

  async function runOneRow(row, step, handler) {
    if (!row?.id) return;
    updateRow(row.id, (current) => ({ ...current, step: `${step}...`, error: "", failedStep: "" }));
    try {
      const result = await handler(row);
      updateRow(row.id, (current) => mergeResult(current, result, step));
    } catch (err) {
      const formatted = formatBackendError(err);
      updateRow(row.id, (current) => ({
        ...current,
        step,
        ok: false,
        error: formatted,
        failedStep: step,
        lastResult: buildTechnicalError(current, step, err, formatted),
      }));
    }
  }

  function variantEntry(row, collection, variantKey) {
    const list = Array.isArray(row?.[collection]) ? row[collection] : [];
    return list.find((item) => item.variantKey === variantKey) || {};
  }

  function setSkippedVariants(rowId, slots) {
    const skippedAds = slots
      .filter((slot) => !slot.complete)
      .map((slot) => ({
        adNumber: slot.adNumber,
        variantKey: slot.variantKey,
        status: "incompleto",
        missing: slot.missing,
      }));
    updateRow(rowId, (current) => ({ ...current, skippedAds }));
  }

  function markVariantFailure(rowId, collection, slot, step, err) {
    const formatted = formatBackendError(err);
    updateRow(rowId, (current) => {
      const next = Array.isArray(current[collection]) ? [...current[collection]] : emptyVariantState();
      const index = AD_KEYS.indexOf(slot.variantKey);
      if (index >= 0) {
        next[index] = {
          adNumber: slot.adNumber,
          variantKey: slot.variantKey,
          status: "erro",
          error: formatted,
        };
      }
      return {
        ...current,
        [collection]: next,
        step: `${step} parcial`,
        ok: true,
        lastResult: {
          ...(normalizeObject(current.lastResult)),
          partialError: {
            adNumber: slot.adNumber,
            variantKey: slot.variantKey,
            step,
            message: formatted,
          },
        },
      };
    });
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
      let queued = 0;
      for (const row of rows) {
        const slots = publishableSlotsByMarket[row.id] || publishableVariantsForRow({ form, translationDrafts, row });
        setSkippedVariants(row.id, slots);
        const completeSlots = slots.filter((slot) => slot.complete);
        queued += completeSlots.length;
        updateRow(row.id, (current) => ({ ...current, step: "Creative publicado...", error: "", failedStep: "" }));
        for (const slot of completeSlots) {
          if (variantEntry(row, "creatives", slot.variantKey).creativeId) continue;
          try {
            const result = await publishOperationalCreative(row.id, {
              pageId,
              instagramActorId,
              ctaType: form.ctaType,
              variantKey: slot.variantKey,
            });
            updateRow(row.id, (current) => mergeResult(current, result, "Creative publicado"));
          } catch (err) {
            markVariantFailure(row.id, "creatives", slot, "Creative publicado", err);
          }
        }
      }
      if (!queued) throw new Error("Nenhum Ad completo para publicar Creative.");
    });
  }

  async function publishAds() {
    await runStep("ad", async () => {
      if (creativeCount === 0) throw new Error("Publique o Creative primeiro.");
      let queued = 0;
      for (const row of rows) {
        const slots = publishableSlotsByMarket[row.id] || publishableVariantsForRow({ form, translationDrafts, row });
        setSkippedVariants(row.id, slots);
        const completeSlots = slots.filter((slot) => slot.complete);
        updateRow(row.id, (current) => ({ ...current, step: "Ad publicado...", error: "", failedStep: "" }));
        for (const slot of completeSlots) {
          const currentRow = rows.find((item) => item.id === row.id) || row;
          if (variantEntry(currentRow, "ads", slot.variantKey).adId) continue;
          if (!variantEntry(currentRow, "creatives", slot.variantKey).creativeId && !(slot.variantKey === "A" && currentRow.metaCreativeId)) continue;
          queued += 1;
          try {
            const result = await publishOperationalAd(row.id, { variantKey: slot.variantKey });
            updateRow(row.id, (current) => mergeResult(current, result, "Ad publicado"));
          } catch (err) {
            markVariantFailure(row.id, "ads", slot, "Ad publicado", err);
          }
        }
      }
      if (!queued) throw new Error("Nenhum Creative disponível para publicar Ads.");
    });
  }

  async function syncStatus() {
    await runStep("sync", async () => {
      if (anyMetaCount === 0) throw new Error("Crie pelo menos um objeto Meta primeiro.");
      await runRows("Status sincronizado", (row) => syncOperationalMetaStatus(row.id));
    });
  }

  return (
    <PageShell title="Templates por Mercado" subtitle="Crie e publique por mercado." backFallbackTo="/templates">
      <div className="opsHero">
        <div>
          <h2 className="opsHeroTitle">{form.name || "Novo template"}</h2>
          <p className="opsHeroText">{nextStepText}</p>
        </div>
        <div className="opsHeroActions">
          <StatusPill tone="warn">Meta PAUSED</StatusPill>
        </div>
      </div>

      <div className="opsMetrics">
        <OpsMetric label="Template" value={selectedId ? "salvo" : "rascunho"} tone={selectedId ? "good" : "warn"} detail={form.nicheParam || "configuração pendente"} />
        <OpsMetric label="Mercados" value={String(selectedMarkets.length)} tone={marketsReady ? "info" : "muted"} detail={selectedMarketLanguages.join(", ") || "nenhum idioma"} />
        <OpsMetric label="Traduções" value={`${translationCount}/${selectedMarkets.length || 0}`} tone={translationsReady ? "good" : incompleteTranslationCount ? "warn" : "muted"} detail={incompleteTranslationCount ? `${incompleteTranslationCount} incompletas` : "revisão por mercado"} />
        <OpsMetric label="Mídia" value={`${selectedMediaMarkets}/${selectedMarkets.length || 0}`} tone={mediaReady ? "good" : selectedMediaMarkets ? "warn" : "muted"} detail={`${completeMediaGroups}/${mediaGroupSummary.length} grupos completos`} />
        <OpsMetric label="Publicação" value={publicationDone ? "concluída" : rows.length ? `${adCount}/${rows.length} Ads` : "pendente"} tone={publicationDone ? "good" : rows.length ? "warn" : "muted"} detail="criação sempre em PAUSED" />
      </div>

      <div className="opsStepper" aria-label="Progresso do fluxo por mercado">
        <OpsStep label="Base" done={baseReady} active={!baseReady} />
        <OpsStep label="Criativos" done={creativeReady} active={baseReady && !creativeReady} />
        <OpsStep label="Mercados" done={marketsReady} active={creativeReady && !marketsReady} />
        <OpsStep label="Traduções" done={translationsReady} active={marketsReady && !translationsReady} />
        <OpsStep label="Mídias" done={mediaReady} active={translationsReady && !mediaReady} />
        <OpsStep label="Publicação" done={publicationDone} active={translationsReady && mediaReady && !publicationDone} />
        <OpsStep label="Resultados" done={publicationDone && anyMetaCount > 0} active={publicationDone} />
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

      <div className="opsTabs">
        <button
          type="button"
          className={workspaceTab === "create" ? "templatesBtnPrimary" : "templatesBtnOutline"}
          onClick={() => {
            setWorkspaceTab("create");
            newTemplate();
          }}
        >
          Criar um novo template
        </button>
        <button
          type="button"
          className={workspaceTab === "templates" ? "templatesBtnPrimary" : "templatesBtnOutline"}
          onClick={() => {
            setWorkspaceTab("templates");
            if (!selectedId && templates[0]?.id) selectTemplate(templates[0].id);
          }}
        >
          Meus templates
        </button>
      </div>

      <div className={`templatesLayout ${workspaceTab === "create" ? "templatesLayoutCreate" : ""}`} style={{ marginTop: 16 }}>
        {workspaceTab === "templates" ? (
        <div className="templatesListPanel">
          <div className="templatesListHeader">
            <h2 className="templatesListTitle">Meus templates</h2>
          </div>
          <div className="templatesSearchWrap">
            <InputLike value={listQuery} onChange={(e) => setListQuery(e.target.value)} placeholder="Buscar por nome..." />
          </div>
          <div className="templatesTplStack">
            {(filteredTemplates || []).map((template) => {
              const payload = getPayload(template);
              const translations = getTranslations(payload);
              const active = String(template.id) === String(selectedId);
              const mediaCount = Object.keys(normalizeObject(payload.mediaByMarket)).length;
              const adCountLabel = adVariantsWithText(getAdVariants(payload)).length;
              return (
                <button
                  key={template.id}
                  type="button"
                  className={`templatesTplItem ${active ? "templatesTplItemActive" : ""}`}
                  onClick={() => selectTemplate(template.id)}
                >
                  <div className="templatesTplName">{template.name}</div>
                  <div className="templatesTplNiche">{getNiche(payload) || "sem operação"}</div>
                  <div className="templatesTplMetricGrid">
                    <span><strong>{adCountLabel}</strong> anúncios</span>
                    <span><strong>{getSavedTemplateMarkets(payload).length}</strong> mercados</span>
                    <span><strong>{Object.keys(translations).length}</strong> traduções</span>
                    <span><strong>{mediaCount}</strong> mídias</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        ) : null}

        <div className="templatesDetailPanel">
          <div className="templatesDetailHead">
            <div>
              <div className="templatesDetailName">{form.name || "Template sem nome"}</div>
              <div className="templatesDetailMeta">
                <StatusPill tone={selectedId ? "good" : "warn"}>{selectedId ? "salvo" : "rascunho"}</StatusPill>
                <StatusPill tone={marketsReady ? "info" : "muted"}>{selectedMarkets.length} mercados</StatusPill>
                <StatusPill tone={translationsReady ? "good" : "muted"}>{translationCount} traduções</StatusPill>
                <StatusPill tone={publicationDone ? "good" : rows.length ? "warn" : "muted"}>{publicationDone ? "publicado" : "em preparo"}</StatusPill>
              </div>
            </div>
            <div className="templatesDetailActions">
              <button type="button" className="templatesBtnPrimary" disabled={Boolean(busyStep)} onClick={() => saveTemplate()}>
                {selectedId ? "Salvar alterações" : "Criar template"}
              </button>
              {selectedId ? (
                <button type="button" className="templatesBtnDanger" disabled={Boolean(busyStep)} onClick={() => setDeleteConfirmOpen(true)}>
                  Excluir template
                </button>
              ) : null}
            </div>
          </div>

          <div className="opsDetailBody">
            <SectionBlock
              eyebrow="1. Template base"
            >
              <div className="opsFormGrid">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <Field label="Nome da campanha">
                    <InputLike value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Futebol BTN" />
                </Field>
                <Field label="Domínio">
                  <InputLike value={form.domain} onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value }))} placeholder="https://menteinformada.com" />
                </Field>
                <Field label="Permalink Brasil">
                  <InputLike value={form.brazilPermalink} onChange={(e) => setForm((prev) => ({ ...prev, brazilPermalink: e.target.value }))} placeholder="aplicativos-para-assistir-jogos-de-futebol" />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label="Permalink Internacional">
                  <InputLike value={form.internationalPermalink} onChange={(e) => setForm((prev) => ({ ...prev, internationalPermalink: e.target.value }))} placeholder="apps-to-watch-football-games-2" />
                </Field>
                <Field label="Parâmetro do Nicho">
                  <InputLike value={form.nicheParam} onChange={(e) => setForm((prev) => ({ ...prev, nicheParam: e.target.value }))} placeholder="FutebolBTN3" />
                </Field>
                <Field label="Pixel">
                  <InputLike value={form.pixel} onChange={(e) => setForm((prev) => ({ ...prev, pixel: e.target.value }))} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label="ID da Página">
                  <InputLike value={form.pageId} onChange={(e) => setForm((prev) => ({ ...prev, pageId: e.target.value }))} />
                </Field>
                <Field label="Beneficiário">
                  <InputLike value={form.beneficiary} onChange={(e) => setForm((prev) => ({ ...prev, beneficiary: e.target.value }))} />
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
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label="Orçamento diário (R$)">
                  <InputLike
                    value={form.dailyBudgetBrl}
                    onChange={(e) => {
                      const cents = parseBrlToCents(e.target.value);
                      setForm((prev) => ({ ...prev, dailyBudgetBrl: e.target.value, dailyBudgetCents: cents ?? 0 }));
                    }}
                  />
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
                <Field label="Preview BR">
                  <InputLike value={brUrlPreview} readOnly />
                </Field>
                <Field label="Preview internacional">
                  <InputLike value={internationalUrlPreview} readOnly />
                </Field>
              </div>
              </div>
            </SectionBlock>

            <SectionBlock
              eyebrow="2. Criativos"
            >
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
                        <div className="templatesAccordionSummaryTitle">{adLabel(adKey)}</div>
                        <div className="templatesAccordionSummaryMeta">{variant.primaryText ? String(variant.primaryText).slice(0, 70) : "—"}</div>
                      </summary>
                      <div className="templatesAccordionBody">
                        <Field label="Texto principal">
                          <TextAreaLike value={variant.primaryText || ""} onChange={(e) => updateVariant(idx, "primaryText", e.target.value)} rows={3} />
                        </Field>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                          <Field label="Título">
                            <InputLike value={variant.headline || ""} onChange={(e) => updateVariant(idx, "headline", e.target.value)} />
                          </Field>
                          <Field label="Descrição">
                            <InputLike value={variant.description || ""} onChange={(e) => updateVariant(idx, "description", e.target.value)} />
                          </Field>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </SectionBlock>

            <SectionBlock
              eyebrow="3. Mercados"
              action={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="templatesBtnPrimary" onClick={() => openMarketPicker(marketPickerGroups[0])}>Selecionar mercados</button>
                  <button type="button" className="templatesBtnOutline" onClick={() => setSelectedMarkets([])}>Limpar</button>
                </div>
              }
            >
              <div className="opsMarketSummary opsMarketSummaryClean">
                <div>
                  <strong>{selectedMarkets.length} mercados selecionados</strong>
                  <div className="muted" style={{ marginTop: 4, fontWeight: 800 }}>
                    Idiomas: {selectedMarketLanguages.join(", ") || "nenhum"} · Grupos de mídia: {selectedMediaGroups.join(", ") || "nenhum"}
                  </div>
                </div>
                <MarketChipList markets={marketOptions} />
              </div>
              <div className="opsMarketChooserPreview">
                {["language-Português", "language-Inglês", "language-Árabe", "language-Espanhol", "language-Francês", "language-Alemão"].map((key) => {
                  const group = marketPickerGroups.find((item) => item.key === key);
                  if (!group) return null;
                  const selectedCount = group.codes.filter((code) => selectedSet.has(code)).length;
                  return (
                    <button key={group.key} type="button" className="opsMarketQuickChip" onClick={() => openMarketPicker(group)}>
                      {group.title}
                      <span>{selectedCount}/{group.codes.length}</span>
                    </button>
                  );
                })}
              </div>
              <AdvancedDisclosure summary="Mercados selecionados">
                <div className="opsMarketGrid">
                  {marketOptions.map((market) => (
                    <label key={market.code} className="opsMarketOption opsMarketOptionSelected">
                      <input type="checkbox" checked onChange={() => toggleMarket(market.code)} />
                      <span>
                        <strong>{market.code}</strong>
                        <small>{market.name} · {market.language} · mídia {mediaGroupForMarket(market.code)}</small>
                      </span>
                    </label>
                  ))}
                  {!marketOptions.length ? <div className="templatesHintBox">Abra um grupo acima para selecionar mercados.</div> : null}
                </div>
              </AdvancedDisclosure>
            </SectionBlock>

            <SectionBlock
              eyebrow="4. Traduções"
              action={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="templatesBtnPrimary" disabled={Boolean(busyStep) || !canGenerateTranslations} onClick={generateTranslations}>
                    {busyStep === "translations" ? "Gerando..." : "Gerar traduções"}
                  </button>
                  <button type="button" className="templatesBtnOutline" disabled={Boolean(busyStep) || !selectedId || !translationsDirty} onClick={() => saveTemplate({ withTranslations: true })}>
                    Salvar mudança
                  </button>
                </div>
              }
            >
              {!hasBaseText ? (
                <div className="templatesHintBox" style={{ borderColor: "#fecaca", color: "#991b1b" }}>
                  Falta texto base. Preencha pelo menos uma variação antes de gerar traduções.
                </div>
              ) : null}
              <div className="opsTranslationEditor" style={{ marginTop: hasBaseText ? 0 : 12 }}>
                {marketOptions.map((market) => {
                  const entry = normalizeObject(translationDrafts?.[market.code]);
                  const variants = Array.isArray(entry.adVariants) ? entry.adVariants : [];
                  const status = translationEntryStatus(entry);
                  return (
                    <details key={market.code} className="opsTranslationRow">
                      <summary className="opsTranslationSummary">
                        <span>
                          <strong>{market.code} · {market.name}</strong>
                          <small>{entry.targetLanguage || entry.language || market.language}</small>
                        </span>
                        <span className="opsTranslationSummaryActions">
                          <StatusPill tone={status === "revisável" ? "good" : status === "incompleta" ? "warn" : "muted"}>{status}</StatusPill>
                        </span>
                      </summary>
                      <div className="opsTranslationAds">
                        {AD_KEYS.map((adKey, idx) => {
                          const variant = normalizeObject(variants[idx]);
                          return (
                            <div key={adKey} className="opsTranslationAdCard">
                              <div className="opsTranslationAdHead">
                                <strong>{adLabel(adKey)}</strong>
                              </div>
                              <Field label="Texto principal">
                                <TextAreaLike value={variant.primaryText || ""} onChange={(e) => updateTranslation(market.code, idx, "primaryText", e.target.value)} rows={3} />
                              </Field>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <Field label="Título">
                                  <InputLike value={variant.headline || ""} onChange={(e) => updateTranslation(market.code, idx, "headline", e.target.value)} />
                                </Field>
                                <Field label="Descrição">
                                  <InputLike value={variant.description || ""} onChange={(e) => updateTranslation(market.code, idx, "description", e.target.value)} />
                                </Field>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
                {!marketOptions.length ? <div className="templatesHintBox">Selecione mercados para gerar traduções.</div> : null}
              </div>
            </SectionBlock>

            <SectionBlock
              eyebrow="5. Mídias"
              action={
                <div className="opsMediaActions">
                  <label className="templatesBtnPrimary" style={{ cursor: busyStep ? "not-allowed" : "pointer", opacity: busyStep ? 0.65 : 1 }}>
                    Upload em lote
                    <input
                      type="file"
                      accept="video/mp4,.mp4"
                      multiple
                      disabled={Boolean(busyStep)}
                      onChange={(e) => {
                        prepareBulkVideoRows(e.target.files);
                        e.target.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                  {bulkVideoRows.length ? (
                    <>
                      <button type="button" className="templatesBtnOutline" disabled={Boolean(busyStep)} onClick={applyBulkVideoRows}>
                        {busyStep === "bulkVideos" ? "Aplicando..." : "Aplicar reconhecidos"}
                      </button>
                      <button type="button" className="templatesBtnOutline" disabled={Boolean(busyStep)} onClick={() => setBulkVideoRows([])}>
                        Limpar
                      </button>
                    </>
                  ) : null}
                </div>
              }
            >
              <div className="opsMediaGroups">
                {mediaGroupSummary.map((item) => {
                  const affectedMarkets = item.selectedCodes.join(", ");
                  return (
                    <div key={item.group} className="opsMediaGroup">
                      <div className="opsMediaGroupTop">
                        <strong>{item.language} · Grupo {item.group}</strong>
                        <StatusPill tone={item.complete ? "good" : "warn"}>
                          {AD_KEYS.length - item.missing.length}/{AD_KEYS.length} vídeos
                        </StatusPill>
                      </div>
                      <div className="opsMediaGroupMarkets">Mercados afetados: {affectedMarkets}</div>
                      <div className="opsMediaAdList">
                        {AD_KEYS.map((adKey) => {
                          const representativeCode = item.selectedCodes[0];
                          const entry = getMarketMediaEntry(form.mediaByMarket, representativeCode, adKey);
                          const pendingRows = bulkVideoRows.filter((row) => row.group === item.group && row.variantKey === adKey);
                          const pendingRow = pendingRows[0];
                          const statusTone = entry.creativeAssetId ? "good" : pendingRow?.recognized ? "info" : "muted";
                          const statusLabel = entry.creativeAssetId ? mediaTypeLabel(entry) : pendingRow?.recognized ? "reconhecido" : "faltando";
                          return (
                            <div key={adKey} className="opsMediaAdCard">
                              <div>
                                <strong>{adLabel(adKey)}</strong>
                                <div className="opsMediaFilename">{pendingRow?.filename || mediaLabel(entry)}</div>
                                {pendingRow?.reason || pendingRow?.error ? (
                                  <div className="opsMediaGroupMissing">{pendingRow.error || pendingRow.reason}</div>
                                ) : null}
                              </div>
                              <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
                              <label className="templatesBtnOutline" style={{ cursor: busyStep ? "not-allowed" : "pointer", opacity: busyStep ? 0.65 : 1 }}>
                                Trocar
                                <input
                                  type="file"
                                  accept="video/*,image/*"
                                  disabled={Boolean(busyStep)}
                                  onChange={(e) => {
                                    uploadAssetForMediaGroup(item.group, adKey, e.target.files?.[0]);
                                    e.target.value = "";
                                  }}
                                  style={{ display: "none" }}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {!mediaGroupSummary.length ? <div className="templatesHintBox">Selecione mercados para revisar mídias.</div> : null}
              </div>
              {bulkVideoRows.some((row) => !row.recognized) ? (
                <AdvancedDisclosure summary="Arquivos não reconhecidos">
                  <div className="opsMediaAdList">
                    {bulkVideoRows.filter((row) => !row.recognized).map((row) => (
                      <div key={row.id} className="opsMediaAdCard">
                        <div>
                          <strong>{row.filename}</strong>
                          <div className="opsMediaGroupMissing">{row.reason || row.status}</div>
                        </div>
                        <select
                          value={row.group || ""}
                          disabled={Boolean(busyStep)}
                          onChange={(e) => updateBulkVideoRow(row.id, { group: e.target.value })}
                          className="templatesSelect"
                          style={{ height: 36, minWidth: 120 }}
                        >
                          <option value="">Grupo...</option>
                          {Object.keys(BULK_VIDEO_GROUPS).map((group) => (
                            <option key={group} value={group}>Grupo {group}</option>
                          ))}
                        </select>
                        <select
                          value={row.variantKey || ""}
                          disabled={Boolean(busyStep)}
                          onChange={(e) => updateBulkVideoRow(row.id, { variantKey: e.target.value })}
                          className="templatesSelect"
                          style={{ height: 36, minWidth: 100 }}
                        >
                          <option value="">Ad...</option>
                          {AD_KEYS.map((key) => (
                            <option key={key} value={key}>{adLabel(key)}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </AdvancedDisclosure>
              ) : null}
            </SectionBlock>

            <SectionBlock
              eyebrow="6. Publicação"
              action={
                <button type="button" className="templatesBtnPrimary" disabled={nextPrimaryAction.disabled} onClick={nextPrimaryAction.onClick}>
                  {nextPrimaryAction.label}
                </button>
              }
            >
              <div className="opsPublishSummary">
                <div>
                  <strong>Próximo passo</strong>
                  <div className="muted" style={{ marginTop: 4, fontWeight: 850 }}>{nextStepText}</div>
                </div>
                <button type="button" className="templatesBtnOutline" disabled={Boolean(busyStep) || !selectedId || !mediaReady} onClick={generateOperational}>
                  {busyStep === "operational" ? "Preparando..." : rows.length ? "Preparar novamente" : "Preparar publicação"}
                </button>
              </div>
              <AdvancedDisclosure summary="Publicação avançada">
                {campaignId ? <div className="monoTag" style={{ marginBottom: 10 }}>Campaign ID: {campaignId}</div> : null}
                <div className="opsPublishGrid">
                  <PublishActionButton title="Publicar Campaign" state={actions.campaign} onClick={publishCampaigns} />
                  <PublishActionButton title="Publicar AdSet" state={actions.adset} onClick={publishAdSets} />
                  <PublishActionButton title="Publicar Creative" state={actions.creative} onClick={publishCreatives} />
                  <PublishActionButton title="Publicar Ad" state={actions.ad} onClick={publishAds} />
                  <PublishActionButton title="Sincronizar Status" state={actions.sync} onClick={syncStatus} primary />
                </div>
              </AdvancedDisclosure>
              {busyStep ? <div className="muted" style={{ marginTop: 10, fontWeight: 850 }}>Executando: {busyStep}</div> : null}
            </SectionBlock>

            <SectionBlock
              eyebrow="7. Resultados"
            >
              {rows.length && !publicationDone ? (
                <div className="opsPublicationSummary">
                  <div>
                    <div className="templatesCardLabel">Resumo da publicação</div>
                    <strong>{finalSummary.processedMarkets} mercado(s) processado(s)</strong>
                    <p>
                      Campaigns {finalSummary.campaigns}, AdSets {finalSummary.adSets}, Creatives {finalSummary.creatives}, Ads {finalSummary.ads}.
                      {" "}UTM válida em {finalSummary.validUtm}/{rows.length}; mídia detectada em {finalSummary.mediaDetected}/{rows.length}; falhas {rows.filter((row) => row.error).length}.
                    </p>
                  </div>
                  <div className="opsCompletionActions">
                    <button type="button" className="templatesBtnPrimary" onClick={copyGeneralResult}>Copiar resultado</button>
                    <AdvancedDisclosure summary="Detalhes técnicos">
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="templatesBtnOutline" onClick={copySimpleReport}>Copiar relatório simples</button>
                        <button type="button" className="templatesBtnOutline" onClick={() => openJsonModal("JSON consolidado", consolidatedResult, "Resumo técnico da publicação.")}>Ver JSON consolidado</button>
                      </div>
                    </AdvancedDisclosure>
                  </div>
                </div>
              ) : null}
              {publicationDone ? (
                <div className="opsCompletionPanel">
                  <div className="opsCompletionHead">
                    <div>
                      <div className="templatesCardLabel">Processo finalizado</div>
                      <h3>Publicação concluída</h3>
                      <p>Todos os objetos criados permanecem em PAUSED.</p>
                    </div>
                    <StatusPill tone="good">PAUSED</StatusPill>
                  </div>
                  <div className="opsCompletionMetrics">
                    <OpsMetric label="Mercados" value={String(finalSummary.processedMarkets)} tone="good" detail="processados" />
                    <OpsMetric label="Campaigns" value={String(finalSummary.campaigns)} tone={finalSummary.campaigns === rows.length ? "good" : "warn"} detail="criadas" />
                    <OpsMetric label="AdSets" value={String(finalSummary.adSets)} tone={finalSummary.adSets === rows.length ? "good" : "warn"} detail="criados" />
                    <OpsMetric label="Creatives" value={String(finalSummary.creatives)} tone={finalSummary.creatives >= expectedAdCount ? "good" : "warn"} detail={`de ${expectedAdCount}`} />
                    <OpsMetric label="Ads" value={String(finalSummary.ads)} tone={finalSummary.ads >= expectedAdCount ? "good" : "warn"} detail={`de ${expectedAdCount}`} />
                    <OpsMetric label="UTM válida" value={`${finalSummary.validUtm}/${rows.length}`} tone={finalSummary.validUtm === rows.length ? "good" : "warn"} detail="por mercado" />
                    <OpsMetric label="Mídia" value={`${finalSummary.mediaDetected}/${rows.length}`} tone={finalSummary.mediaDetected === rows.length ? "good" : "warn"} detail="detectada" />
                    <OpsMetric label="Diagnóstico" value={`${finalSummary.diagnosticsWithoutCriticalAlert}/${rows.length}`} tone={finalSummary.diagnosticsWithoutCriticalAlert === rows.length ? "good" : "warn"} detail="sem erro local" />
                  </div>
                  <div className="opsCompletionActions">
                    <button type="button" className="templatesBtnPrimary" onClick={copyGeneralResult}>Copiar resultado</button>
                    <AdvancedDisclosure summary="Detalhes técnicos">
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="templatesBtnOutline" onClick={copySimpleReport}>Copiar relatório simples</button>
                        <button type="button" className="templatesBtnOutline" onClick={() => openJsonModal("JSON consolidado", consolidatedResult, "Resultado técnico da publicação.")}>
                          Ver JSON consolidado
                        </button>
                      </div>
                    </AdvancedDisclosure>
                  </div>
                </div>
              ) : null}
              <div className="opsResultCards">
                {rows.map((row) => {
                  const objects = [
                    { key: "Campaign", id: row.metaCampaignId },
                    { key: "AdSet", id: row.metaAdSetId },
                    { key: "Creatives", id: creativeCount ? `${(row.creatives || []).filter((item) => item.creativeId).length}/${(publishableSlotsByMarket[row.id] || []).filter((slot) => slot.complete).length}` : "" },
                    { key: "Ads", id: adCount ? `${(row.ads || []).filter((item) => item.adId).length}/${(publishableSlotsByMarket[row.id] || []).filter((slot) => slot.complete).length}` : "" },
                  ];
                  return (
                    <article key={row.id} className="opsResultCard">
                      <div className="opsResultCardHead">
                        <div>
                          <span className="monoTag">{row.marketCode || "—"}</span>
                          <h4>{row.marketParam || row.marketName || "Mercado operacional"}</h4>
                        </div>
                        <StatusPill tone={row.error ? "bad" : row.metaAdId ? "good" : row.ok ? "info" : "muted"}>
                          {row.error ? "falhou" : row.metaAdId ? "pronto" : row.step || "pendente"}
                        </StatusPill>
                      </div>
                      <div className="opsResultProgress">
                        {objects.map((object) => (
                          <button
                            key={object.key}
                            type="button"
                            className={`opsResultObject ${object.id ? "opsResultObjectDone" : ""}`}
                            disabled={!object.id}
                            onClick={() => copyId(object.key, object.id)}
                            title={object.id ? `Copiar ${object.key}: ${object.id}` : `${object.key} pendente`}
                          >
                            <span>{object.key}</span>
                            <strong>{object.id ? "pronto" : "pendente"}</strong>
                          </button>
                        ))}
                      </div>
                      <div className="opsResultProgress">
                        {AD_KEYS.map((adKey) => {
                          const slot = (publishableSlotsByMarket[row.id] || []).find((item) => item.variantKey === adKey);
                          const creative = variantEntry(row, "creatives", adKey);
                          const ad = variantEntry(row, "ads", adKey);
                          const skipped = (row.skippedAds || []).find((item) => item.variantKey === adKey);
                          const tone = ad?.adId ? "opsResultObjectDone" : creative?.creativeId ? "opsResultObjectPartial" : skipped ? "" : "";
                          const label = ad?.adId ? "Ad criado" : creative?.creativeId ? "Creative criado" : skipped ? `Incompleto: ${skipped.missing?.join(", ")}` : slot?.complete ? "pronto para publicar" : "pendente";
                          return (
                            <button
                              key={adKey}
                              type="button"
                              className={`opsResultObject ${tone}`}
                              disabled={!(ad?.adId || creative?.creativeId)}
                              onClick={() => copyId(ad?.adId ? `${adLabel(adKey)} Ad` : `${adLabel(adKey)} Creative`, ad?.adId || creative?.creativeId)}
                              title={ad?.adId || creative?.creativeId ? "Copiar ID" : label}
                            >
                              <span>{adLabel(adKey)}</span>
                              <strong>{label}</strong>
                            </button>
                          );
                        })}
                      </div>
                      {row.error ? (
                        <div className="opsResultError">Falhou em {row.failedStep || row.step || "etapa desconhecida"}: {row.error}</div>
                      ) : null}
                      <div className="opsResultActions">
                        <button
                          type="button"
                          className="templatesBtnOutline"
                          disabled={!(row.metaCampaignId || row.metaAdSetId || row.metaCreativeId || row.metaAdId)}
                          onClick={() => openRowDiagnostics(row)}
                        >
                          Diagnosticar objetos Meta
                        </button>
                        <AdvancedDisclosure summary="Detalhes técnicos">
                          {!row.error ? (
                            <div className="opsResultStatusLine" style={{ marginBottom: 8 }}>
                              <span>Status configurado: {row.configuredStatus || "—"}</span>
                              <span>Status efetivo: {row.effectiveStatus || "—"}</span>
                            </div>
                          ) : null}
                          <button type="button" className="templatesBtnOutline" onClick={() => openJsonModal(`JSON técnico · ${row.marketCode || row.marketParam}`, row.lastResult, "Resultado técnico preservado.")}>
                            Ver JSON técnico
                          </button>
                        </AdvancedDisclosure>
                      </div>
                    </article>
                  );
                })}
                {!rows.length ? (
                  <div className="templatesHintBox">Gere o operacional para ver os mercados e acompanhar a publicação.</div>
                ) : null}
              </div>
              {diagnosticTarget ? (
                <div className="opsDiagnosticPanel">
                  <div className="opsReviewHead" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>Diagnóstico Meta · {diagnosticTarget.marketCode || diagnosticTarget.marketParam}</div>
                    </div>
                    <button type="button" className="templatesBtnOutline" onClick={() => setDiagnosticTarget(null)}>
                      Fechar diagnóstico
                    </button>
                  </div>
                  {diagnosticTarget.type === "all" ? (
                    <div className="opsDiagnosticGrid">
                      {Object.entries(diagnosticTarget.ids).map(([type, id]) =>
                        id ? (
                          <MetaObjectDiagnosticPanel
                            key={`${type}-${id}`}
                            type={type}
                            id={id}
                            metaAccountId={form.metaAccountId}
                            autoLoad
                          />
                        ) : null,
                      )}
                    </div>
                  ) : (
                    <MetaObjectDiagnosticPanel
                      key={`${diagnosticTarget.type}-${diagnosticTarget.id}`}
                      type={diagnosticTarget.type}
                      id={diagnosticTarget.id}
                      metaAccountId={form.metaAccountId}
                      autoLoad
                    />
                  )}
                </div>
              ) : null}
            </SectionBlock>

            <AdvancedDisclosure summary="Detalhes técnicos do template">
              <div className="opsTechnicalFooter">
                <button
                  type="button"
                  className="templatesBtnOutline"
                  onClick={() => openJsonModal("JSON técnico do template", buildPayload(form, selectedPayload, selectedMarkets), "Payload salvo no template por mercado.")}
                >
                  Ver JSON técnico
                </button>
                <button
                  type="button"
                  className="templatesBtnOutline"
                  onClick={() => copyTextToClipboard(safeJson(buildPayload(form, selectedPayload, selectedMarkets)), "JSON técnico do template copiado.")}
                >
                  Copiar JSON
                </button>
              </div>
            </AdvancedDisclosure>
          </div>
        </div>
      </div>
      <MarketGroupModal
        groups={marketPickerGroups}
        group={marketPickerGroup}
        query={marketPickerQuery}
        onQueryChange={setMarketPickerQuery}
        draftSelection={marketPickerDraftSet}
        onSelectCategory={setMarketPickerGroup}
        onToggle={toggleMarketPickerDraft}
        onSelectGroup={selectMarketPickerGroup}
        onClearGroup={clearMarketPickerGroup}
        onClose={() => setMarketPickerGroup(null)}
        onConfirm={confirmMarketPicker}
      />
      <JsonModal
        title={jsonModal?.title || ""}
        description={jsonModal?.description || ""}
        value={jsonModal?.value}
        onClose={() => setJsonModal(null)}
        onCopy={copyJsonModal}
      />
      <ConfirmDeleteModal
        templateName={deleteConfirmOpen ? form.name || selectedTemplate?.name || "Template sem nome" : ""}
        busy={busyStep === "deleteTemplate"}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteSelectedTemplate}
      />
    </PageShell>
  );
}
