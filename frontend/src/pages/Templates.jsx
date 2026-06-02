import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusPill from "../components/StatusPill.jsx";
import AdvancedDisclosure from "../components/AdvancedDisclosure.jsx";
import CompactVideoPreview from "../components/CompactVideoPreview.jsx";
import {
  createFlowTemplate,
  deleteFlowTemplate,
  generateFlowTemplateTranslations,
  listFlowTemplates,
  updateFlowTemplate,
} from "../services/flowTemplates.js";
import { getAuthMe } from "../services/auth.js";
import { generateCreativeAssetThumbnail, listCreativeAssets, uploadCreativeAsset } from "../services/creativeAssets.js";
import { getBackendBaseUrl } from "../services/http.js";
import { listMetaAccounts } from "../services/metaAccounts.js";
import { formatBrlFromCents, formatBrlInputFromCents, parseBrlToCents } from "../utils/brlMoney.js";

const STORAGE_LAST_EXECUTION_KEY = "campaignFlow:lastExecution:v1";
const TAB_CREATE = "create";
const TAB_MINE = "mine";
const AD_KEYS = ["A", "B", "C", "D", "E"];

const OBJECTIVE_LABEL_BY_VALUE = {
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_LEADS: "Leads",
  OUTCOME_SALES: "Vendas",
};

const BILLING_EVENT_LABEL_BY_VALUE = {
  IMPRESSIONS: "Impressões",
  LINK_CLICKS: "Cliques no link",
};

const OPTIMIZATION_GOAL_LABEL_BY_VALUE = {
  LINK_CLICKS: "Cliques no link",
  OFFSITE_CONVERSIONS: "Conversões (site)",
};

const CTA_LABEL_BY_VALUE = {
  LEARN_MORE: "Saiba mais",
  SHOP_NOW: "Comprar agora",
  SIGN_UP: "Inscrever-se",
};

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function uniqueCountryCodes(input) {
  const raw = Array.isArray(input)
    ? input
    : String(input || "")
        .split(",")
        .map((c) => c.trim());
  const out = [];
  const seen = new Set();
  for (const c of raw) {
    const code = String(c || "").trim().toUpperCase();
    if (!code) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

function getTranslationsByCountryFromPayload(payload) {
  const raw = payload?.translationsByCountry && typeof payload.translationsByCountry === "object" ? payload.translationsByCountry : {};
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const cc = String(k || "").trim().toUpperCase();
    if (!cc || cc === "BR") continue;
    out[cc] = v;
  }
  return out;
}

function getMediaByCountryFromPayload(payload) {
  return payload?.mediaByCountry && typeof payload.mediaByCountry === "object" ? payload.mediaByCountry : {};
}

function getAdVariantsFromPayload(payload) {
  const raw = payload?.adVariants;
  if (Array.isArray(raw) && raw.length) {
    const out = AD_KEYS.map((key, idx) => {
      const src = raw[idx] && typeof raw[idx] === "object" ? raw[idx] : {};
      return {
        key,
        primaryText: normalizeNonEmptyString(src?.primaryText) || "",
        headline: normalizeNonEmptyString(src?.headline) || "",
        description: normalizeNonEmptyString(src?.description) || "",
      };
    });
    return out;
  }

  // Backward-compat: legacy single creative fields -> Ad A.
  return AD_KEYS.map((key) => ({
    key,
    primaryText: key === "A" ? normalizeNonEmptyString(payload?.primaryText) || "" : "",
    headline: key === "A" ? normalizeNonEmptyString(payload?.headline) || "" : "",
    description: key === "A" ? normalizeNonEmptyString(payload?.description) || "" : "",
  }));
}

function computeTranslationsStatus(payload) {
  const translations = getTranslationsByCountryFromPayload(payload);
  const count = Object.keys(translations || {}).length;
  if (!count) return { label: "Sem traduções", tone: "muted" };
  const reviewed = payload?.translationsReviewStatus === "reviewed" || Boolean(payload?.translationsReviewedAt);
  return { label: reviewed ? "Revisado" : "Traduções geradas", tone: reviewed ? "good" : "info" };
}

function computeMediaStatus(payload) {
  const media = getMediaByCountryFromPayload(payload);
  const countries = uniqueCountryCodes(payload?.countryCodes);
  if (!countries.length) return { label: "Sem mídia", tone: "muted" };

  let withMedia = 0;
  for (const c of countries) {
    const cc = String(c || "").trim().toUpperCase();
    const entry = media?.[cc] && typeof media[cc] === "object" ? media[cc] : null;
    if (!entry) continue;
    // New model: media[CC][A..E]. Legacy: media[CC].creativeAssetId.
    if (entry?.creativeAssetId) {
      withMedia += 1;
      continue;
    }
    for (const key of AD_KEYS) {
      const adEntry = entry?.[key] && typeof entry[key] === "object" ? entry[key] : null;
      if (adEntry?.creativeAssetId) withMedia += 1;
    }
  }

  if (withMedia === 0) return { label: "Sem mídia", tone: "muted" };
  // Expect 5 media items per country (A..E). Legacy counts as 1.
  const expected = countries.length * AD_KEYS.length;
  if (withMedia < expected) return { label: "Mídia parcial", tone: "info" };
  return { label: "Mídias completas", tone: "good" };
}

function computeAdCount(payload) {
  const variants = Array.isArray(payload?.adVariants) ? payload.adVariants : null;
  if (variants && variants.length) return Math.min(variants.length, AD_KEYS.length);
  return 1;
}

function normalizeMediaEntry(asset) {
  const id = normalizeNonEmptyString(asset?.id);
  if (!id) return null;
  const mimeType = normalizeNonEmptyString(asset?.mime_type) || null;
  const originalName = normalizeNonEmptyString(asset?.original_name) || null;
  const url = normalizeNonEmptyString(asset?.url) || null;
  return {
    creativeAssetId: id,
    mimeType,
    originalName,
    url,
    kind: mimeType && mimeType.startsWith("image/") ? "image" : mimeType && mimeType.startsWith("video/") ? "video" : "unknown",
    updatedAt: new Date().toISOString(),
  };
}

function normalizeMediaByCountry(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  for (const [rawKey, rawEntry] of Object.entries(value)) {
    const cc = String(rawKey || "").trim().toUpperCase();
    if (!cc) continue;
    const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : null;
    if (!entry) continue;

    // Legacy shape: mediaByCountry[CC] = { creativeAssetId, ... }
    const legacyId = normalizeNonEmptyString(entry?.creativeAssetId);
    if (legacyId) {
      out[cc] = {
        A: {
          creativeAssetId: legacyId,
          mimeType: normalizeNonEmptyString(entry?.mimeType) || null,
          originalName: normalizeNonEmptyString(entry?.originalName) || null,
          url: normalizeNonEmptyString(entry?.url) || null,
          kind: normalizeNonEmptyString(entry?.kind) || null,
          updatedAt: normalizeNonEmptyString(entry?.updatedAt) || null,
        },
      };
      continue;
    }

    // New shape: mediaByCountry[CC][A..E] (each may contain `thumbnail`)
    const nextByAd = {};
    for (const key of AD_KEYS) {
      const adEntry = entry?.[key] && typeof entry[key] === "object" ? entry[key] : null;
      const creativeAssetId = normalizeNonEmptyString(adEntry?.creativeAssetId);
      const thumbEntry = adEntry?.thumbnail && typeof adEntry.thumbnail === "object" ? adEntry.thumbnail : null;
      const thumbId = normalizeNonEmptyString(thumbEntry?.creativeAssetId);
      if (!creativeAssetId && !thumbId) continue;

      const base = creativeAssetId
        ? {
            creativeAssetId,
            mimeType: normalizeNonEmptyString(adEntry?.mimeType) || null,
            originalName: normalizeNonEmptyString(adEntry?.originalName) || null,
            url: normalizeNonEmptyString(adEntry?.url) || null,
            kind: normalizeNonEmptyString(adEntry?.kind) || null,
            updatedAt: normalizeNonEmptyString(adEntry?.updatedAt) || null,
          }
        : {};

      nextByAd[key] = {
        ...base,
        ...(thumbId
          ? {
              thumbnail: {
                creativeAssetId: thumbId,
                mimeType: normalizeNonEmptyString(thumbEntry?.mimeType) || null,
                originalName: normalizeNonEmptyString(thumbEntry?.originalName) || null,
                url: normalizeNonEmptyString(thumbEntry?.url) || null,
                kind: normalizeNonEmptyString(thumbEntry?.kind) || null,
                updatedAt: normalizeNonEmptyString(thumbEntry?.updatedAt) || null,
              },
            }
          : null),
      };
    }
    if (Object.keys(nextByAd).length === 0) continue;
    out[cc] = nextByAd;
  }
  return out;
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

function InputLike({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="templatesInput"
      style={{ height: 40 }}
    />
  );
}

function TextAreaLike({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="templatesTextarea"
    />
  );
}

function SelectLike({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="templatesSelect"
      style={{ height: 40 }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function buildPayloadFromForm(form) {
  const adVariants = Array.isArray(form?.adVariants) ? form.adVariants : [];
  const normalizedVariants = AD_KEYS.map((key, idx) => {
    const src = adVariants[idx] && typeof adVariants[idx] === "object" ? adVariants[idx] : {};
    return {
      key,
      primaryText: normalizeNonEmptyString(src?.primaryText) || "",
      headline: normalizeNonEmptyString(src?.headline) || "",
      description: normalizeNonEmptyString(src?.description) || "",
    };
  });
  const adA = normalizedVariants[0] ?? { primaryText: "", headline: "", description: "" };
  return {
    metaAccountId: normalizeNonEmptyString(form?.metaAccountId) || null,
    objective: normalizeNonEmptyString(form.objective) || "OUTCOME_TRAFFIC",
    countryCodes: uniqueCountryCodes(form.countryCodes),
    dailyBudgetCents: Number(form.dailyBudgetCents) || 1000,
    billingEvent: normalizeNonEmptyString(form.billingEvent) || "IMPRESSIONS",
    optimizationGoal: normalizeNonEmptyString(form.optimizationGoal) || "LINK_CLICKS",
    // Backward-compat (legacy single creative fields = Ad A).
    primaryText: adA.primaryText || "",
    headline: adA.headline || "",
    description: adA.description || "",
    adVariants: normalizedVariants,
    destinationUrl: normalizeNonEmptyString(form.destinationUrl) || "",
    ctaType: normalizeNonEmptyString(form.ctaType) || "LEARN_MORE",
    mediaByCountry: normalizeMediaByCountry(form?.mediaByCountry),
  };
}

function parseVideoSlotFromFilename(filename, { allowedCountryCodes } = {}) {
  const name = normalizeNonEmptyString(String(filename || ""));
  if (!name) return null;
  const base = name.replace(/\.[a-z0-9]+$/i, "").toUpperCase();

  const allowed = Array.isArray(allowedCountryCodes) ? allowedCountryCodes.map((c) => String(c || "").toUpperCase()).filter(Boolean) : [];
  const cc =
    allowed.find((code) => new RegExp(`\\b${code}\\b`).test(base)) ??
    allowed.find((code) => base.includes(code)) ??
    null;
  if (!cc) return null;

  const m = base.match(/(?:^|[^0-9])([1-5])(?:[^0-9]|$)/);
  if (!m) return { countryCode: cc, adKey: null };
  const idx = Number(m[1]) - 1;
  const adKey = AD_KEYS[idx] ?? null;
  return { countryCode: cc, adKey };
}

export default function Templates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [activeTab, setActiveTab] = useState(TAB_CREATE);
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [listQuery, setListQuery] = useState("");

  const [profileCountryCodes, setProfileCountryCodes] = useState([]);
  const [profileCountryLanguageByCode, setProfileCountryLanguageByCode] = useState({});
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [defaultMetaAccountId, setDefaultMetaAccountId] = useState("");

  const [editingTranslationsByCountry, setEditingTranslationsByCountry] = useState({});
  const [translationsDraftByCountry, setTranslationsDraftByCountry] = useState({});
  const [showTranslationsEditor, setShowTranslationsEditor] = useState(false);

  const [creativeAssets, setCreativeAssets] = useState([]);
  const [openAdKey, setOpenAdKey] = useState("A");
  const [bulkUploadSummary, setBulkUploadSummary] = useState(null);
  const [bulkUploadUnknown, setBulkUploadUnknown] = useState([]);
  const [bulkUploadUnknownDraft, setBulkUploadUnknownDraft] = useState({});

  const [form, setForm] = useState({
    name: "",
    metaAccountId: "",
    objective: "OUTCOME_TRAFFIC",
    countryCodes: "BR",
    dailyBudgetCents: 1000,
    dailyBudgetBrl: formatBrlInputFromCents(1000),
    billingEvent: "IMPRESSIONS",
    optimizationGoal: "LINK_CLICKS",
    destinationUrl: "",
    ctaType: "LEARN_MORE",
    adVariants: AD_KEYS.map((key) => ({ key, primaryText: "", headline: "", description: "" })),
    mediaByCountry: {},
  });

  const selectedTemplate = useMemo(() => templates.find((t) => String(t.id) === String(selectedId)), [templates, selectedId]);
  const filteredTemplates = useMemo(() => {
    const q = normalizeNonEmptyString(listQuery).toLowerCase();
    if (!q) return templates;
    return (templates || []).filter((t) => String(t?.name || "").toLowerCase().includes(q));
  }, [templates, listQuery]);

  const metaAccountOptions = useMemo(() => {
    const base = [{ value: "", label: metaAccounts.length ? "Selecione..." : "Nenhuma conta cadastrada", disabled: true }];
    return base.concat(
      metaAccounts.map((a) => ({
        value: String(a.id),
        label: `${a.name}${a.isDefault ? " • padrão" : ""}${a.isActive ? "" : " • inativa"}`,
        disabled: false,
      }))
    );
  }, [metaAccounts]);

  const selectedMetaAccount = useMemo(() => {
    const id = normalizeNonEmptyString(form.metaAccountId);
    if (!id) return null;
    return metaAccounts.find((a) => String(a.id) === id) ?? null;
  }, [form.metaAccountId, metaAccounts]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    listFlowTemplates({ limit: 200 })
      .then((res) => {
        if (!alive) return;
        setTemplates(res.flowTemplates ?? []);
      })
      .catch((err) => {
        if (!alive) return;
        setTemplates([]);
        setError(err?.message ? String(err.message) : "Falha ao carregar templates.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    listCreativeAssets({ limit: 200 })
      .then((res) => {
        if (!alive) return;
        setCreativeAssets(Array.isArray(res?.creativeAssets) ? res.creativeAssets : []);
      })
      .catch(() => {
        if (!alive) return;
        setCreativeAssets([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    getAuthMe()
      .then((res) => {
        if (!alive) return;
        const codes = Array.isArray(res?.user?.operationalCountryCodes) ? res.user.operationalCountryCodes : [];
        setProfileCountryCodes(codes.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean));
        const list = Array.isArray(res?.user?.operationalCountries) ? res.user.operationalCountries : [];
        setProfileCountryLanguageByCode(
          Object.fromEntries(
            list
              .filter((i) => i?.countryCode)
              .map((i) => [String(i.countryCode).toUpperCase(), i.primaryLanguage ?? null])
          )
        );
        const def = res?.user?.defaultMetaAccount;
        setDefaultMetaAccountId(def?.id ? String(def.id) : "");
      })
      .catch(() => {
        if (!alive) return;
        setProfileCountryCodes([]);
        setProfileCountryLanguageByCode({});
        setDefaultMetaAccountId("");
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    listMetaAccounts()
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res?.metaAccounts) ? res.metaAccounts : [];
        setMetaAccounts(list);
        const preferred = list.find((a) => a?.isDefault) ?? null;
        const nextDefault = preferred?.id ? String(preferred.id) : "";
        if (nextDefault) setDefaultMetaAccountId(nextDefault);
      })
      .catch(() => {
        if (!alive) return;
        setMetaAccounts([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!defaultMetaAccountId) return;
    setForm((p) => (normalizeNonEmptyString(p.metaAccountId) ? p : { ...p, metaAccountId: defaultMetaAccountId }));
  }, [defaultMetaAccountId]);

  async function refresh() {
    const res = await listFlowTemplates({ limit: 200 });
    setTemplates(res.flowTemplates ?? []);
  }

  function resetForm({ useProfileCountries = false } = {}) {
    setEditingId("");
    setEditingTranslationsByCountry({});
    setForm({
      name: "",
      metaAccountId: defaultMetaAccountId || "",
      objective: "OUTCOME_TRAFFIC",
      countryCodes: useProfileCountries && profileCountryCodes.length ? profileCountryCodes.join(",") : "BR",
      dailyBudgetCents: 1000,
      dailyBudgetBrl: formatBrlInputFromCents(1000),
      billingEvent: "IMPRESSIONS",
      optimizationGoal: "LINK_CLICKS",
      destinationUrl: "",
      ctaType: "LEARN_MORE",
      adVariants: AD_KEYS.map((key) => ({ key, primaryText: "", headline: "", description: "" })),
      mediaByCountry: {},
    });
  }

  function fillFormFromTemplate(tpl) {
    const payload = tpl?.payload && typeof tpl.payload === "object" ? tpl.payload : {};
    const metaAccountId = normalizeNonEmptyString(payload?.metaAccountId) || normalizeNonEmptyString(payload?.meta_account_id) || "";
    const cents = Number(payload.dailyBudgetCents ?? 1000) || 1000;
    setEditingId(String(tpl?.id || ""));
    setEditingTranslationsByCountry(getTranslationsByCountryFromPayload(payload));
    setForm({
      name: tpl?.name ?? "",
      metaAccountId: metaAccountId || defaultMetaAccountId || "",
      objective: payload.objective ?? "OUTCOME_TRAFFIC",
      countryCodes: Array.isArray(payload.countryCodes) ? payload.countryCodes.join(",") : "BR",
      dailyBudgetCents: cents,
      dailyBudgetBrl: formatBrlInputFromCents(cents),
      billingEvent: payload.billingEvent ?? "IMPRESSIONS",
      optimizationGoal: payload.optimizationGoal ?? "LINK_CLICKS",
      destinationUrl: payload.destinationUrl ?? "",
      ctaType: payload.ctaType ?? "LEARN_MORE",
      adVariants: getAdVariantsFromPayload(payload),
      mediaByCountry: normalizeMediaByCountry(getMediaByCountryFromPayload(payload)),
    });
  }

  async function onUploadMediaForCountryAd(countryCode, adKey, file) {
    const cc = String(countryCode || "").trim().toUpperCase();
    const k = String(adKey || "").trim().toUpperCase();
    if (!cc) return;
    if (!AD_KEYS.includes(k)) return;
    if (!file) return;
    setNotice("");
    setError("");
    setBusy(true);
    try {
      const res = await uploadCreativeAsset(file);
      const asset = res?.creativeAsset ?? null;
      const entry = normalizeMediaEntry(asset);
      if (!entry) throw new Error("Falha ao obter asset após upload.");
      const autoThumb = normalizeMediaEntry(res?.autoThumbnailAsset ?? null);
      setForm((p) => ({
        ...p,
        mediaByCountry: {
          ...(p.mediaByCountry || {}),
          [cc]: {
            ...((p.mediaByCountry || {})[cc] || {}),
            [k]: autoThumb && autoThumb.kind === "image" ? { ...entry, thumbnail: autoThumb } : entry,
          },
        },
      }));
      setCreativeAssets((p) => [asset, ...(Array.isArray(p) ? p : [])].filter(Boolean).slice(0, 200));
      if (autoThumb && autoThumb.kind === "image") {
        setCreativeAssets((p) => [res.autoThumbnailAsset, ...(Array.isArray(p) ? p : [])].filter(Boolean).slice(0, 200));
        setNotice(`Vídeo definido para ${cc} (Ad ${k}) + thumbnail gerada automaticamente.`);
      } else {
        setNotice(`Vídeo definido para ${cc} (Ad ${k}).`);
      }
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao enviar mídia.");
    } finally {
      setBusy(false);
    }
  }

  function onSelectExistingMediaForCountryAd(countryCode, adKey, creativeAssetId) {
    const cc = String(countryCode || "").trim().toUpperCase();
    const k = String(adKey || "").trim().toUpperCase();
    const id = normalizeNonEmptyString(creativeAssetId);
    if (!cc) return;
    if (!AD_KEYS.includes(k)) return;
    if (!id) return;
    const asset = (creativeAssets || []).find((a) => String(a?.id) === id) ?? null;
    const entry = normalizeMediaEntry(asset);
    if (!entry) {
      setError("Asset inválido.");
      return;
    }
    setForm((p) => ({
      ...p,
      mediaByCountry: {
        ...(p.mediaByCountry || {}),
        [cc]: { ...((p.mediaByCountry || {})[cc] || {}), [k]: entry },
      },
    }));
  }

  async function onAutoGenerateThumbnailForCountryAd(countryCode, adKey, creativeAssetId) {
    const cc = String(countryCode || "").trim().toUpperCase();
    const k = String(adKey || "").trim().toUpperCase();
    const id = normalizeNonEmptyString(creativeAssetId);
    if (!cc || !AD_KEYS.includes(k) || !id) return;
    setNotice("");
    setError("");
    setBusy(true);
    try {
      const res = await generateCreativeAssetThumbnail(id);
      const thumb = normalizeMediaEntry(res?.creativeThumbnailAsset ?? null);
      if (!thumb || thumb.kind !== "image") throw new Error("Falha ao gerar thumbnail.");
      setForm((p) => {
        const prevCountry = p.mediaByCountry?.[cc] && typeof p.mediaByCountry[cc] === "object" ? p.mediaByCountry[cc] : {};
        const prevAd = prevCountry?.[k] && typeof prevCountry[k] === "object" ? prevCountry[k] : {};
        return {
          ...p,
          mediaByCountry: {
            ...(p.mediaByCountry || {}),
            [cc]: { ...prevCountry, [k]: { ...prevAd, thumbnail: thumb } },
          },
        };
      });
      setCreativeAssets((p) => [res?.creativeThumbnailAsset, ...(Array.isArray(p) ? p : [])].filter(Boolean).slice(0, 200));
      setNotice(`Thumbnail gerada automaticamente para ${cc} (Ad ${k}).`);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao gerar thumbnail automaticamente.");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadThumbnailForCountryAd(countryCode, adKey, file) {
    const cc = String(countryCode || "").trim().toUpperCase();
    const k = String(adKey || "").trim().toUpperCase();
    if (!cc) return;
    if (!AD_KEYS.includes(k)) return;
    if (!file) return;
    setNotice("");
    setError("");
    setBusy(true);
    try {
      const res = await uploadCreativeAsset(file);
      const asset = res?.creativeAsset ?? null;
      const entry = normalizeMediaEntry(asset);
      if (!entry) throw new Error("Falha ao obter asset após upload.");
      setForm((p) => {
        const prevCountry = p.mediaByCountry?.[cc] && typeof p.mediaByCountry[cc] === "object" ? p.mediaByCountry[cc] : {};
        const prevAd = prevCountry?.[k] && typeof prevCountry[k] === "object" ? prevCountry[k] : {};
        return {
          ...p,
          mediaByCountry: {
            ...(p.mediaByCountry || {}),
            [cc]: { ...prevCountry, [k]: { ...prevAd, thumbnail: entry } },
          },
        };
      });
      setCreativeAssets((p) => [asset, ...(Array.isArray(p) ? p : [])].filter(Boolean).slice(0, 200));
      setNotice(`Thumbnail definido para ${cc} (Ad ${k}).`);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao enviar thumbnail.");
    } finally {
      setBusy(false);
    }
  }

  function onSelectExistingThumbnailForCountryAd(countryCode, adKey, creativeAssetId) {
    const cc = String(countryCode || "").trim().toUpperCase();
    const k = String(adKey || "").trim().toUpperCase();
    const id = normalizeNonEmptyString(creativeAssetId);
    if (!cc) return;
    if (!AD_KEYS.includes(k)) return;
    if (!id) return;
    const asset = (creativeAssets || []).find((a) => String(a?.id) === id) ?? null;
    const entry = normalizeMediaEntry(asset);
    if (!entry) {
      setError("Asset inválido.");
      return;
    }
    setForm((p) => {
      const prevCountry = p.mediaByCountry?.[cc] && typeof p.mediaByCountry[cc] === "object" ? p.mediaByCountry[cc] : {};
      const prevAd = prevCountry?.[k] && typeof prevCountry[k] === "object" ? prevCountry[k] : {};
      return {
        ...p,
        mediaByCountry: {
          ...(p.mediaByCountry || {}),
          [cc]: { ...prevCountry, [k]: { ...prevAd, thumbnail: entry } },
        },
      };
    });
  }

  function onRemoveThumbnailForCountryAd(countryCode, adKey) {
    const cc = String(countryCode || "").trim().toUpperCase();
    const k = String(adKey || "").trim().toUpperCase();
    if (!cc) return;
    if (!AD_KEYS.includes(k)) return;
    setForm((p) => {
      const next = { ...(p.mediaByCountry || {}) };
      const countryEntry = next[cc] && typeof next[cc] === "object" ? { ...next[cc] } : null;
      if (!countryEntry) return p;
      const adEntry = countryEntry[k] && typeof countryEntry[k] === "object" ? { ...countryEntry[k] } : null;
      if (!adEntry) return p;
      delete adEntry.thumbnail;
      countryEntry[k] = adEntry;
      next[cc] = countryEntry;
      return { ...p, mediaByCountry: next };
    });
  }

  function onRemoveMediaForCountryAd(countryCode, adKey) {
    const cc = String(countryCode || "").trim().toUpperCase();
    const k = String(adKey || "").trim().toUpperCase();
    if (!cc) return;
    if (!AD_KEYS.includes(k)) return;
    setForm((p) => {
      const next = { ...(p.mediaByCountry || {}) };
      const countryEntry = next[cc] && typeof next[cc] === "object" ? { ...next[cc] } : null;
      if (!countryEntry) return p;
      delete countryEntry[k];
      if (Object.keys(countryEntry).length) next[cc] = countryEntry;
      else delete next[cc];
      return { ...p, mediaByCountry: next };
    });
  }

  async function onBulkUploadVideos(files) {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    setNotice("");
    setError("");
    setBulkUploadSummary(null);
    setBulkUploadUnknown([]);
    setBulkUploadUnknownDraft({});

    const allowedCountryCodes = uniqueCountryCodes(form.countryCodes);
    const identified = [];
    const unknown = [];

    for (const f of list) {
      const slot = parseVideoSlotFromFilename(f?.name, { allowedCountryCodes });
      if (!slot || !slot.countryCode || !slot.adKey) {
        unknown.push({ file: f, name: f?.name ?? "file" });
      } else {
        identified.push({ file: f, name: f?.name ?? "file", countryCode: slot.countryCode, adKey: slot.adKey });
      }
    }

    const mapped = [];
    const unmapped = unknown.map((u) => ({ name: u.name }));
    setBulkUploadSummary({ mapped: identified.map((i) => ({ name: i.name, countryCode: i.countryCode, adKey: i.adKey })), unmapped });
    setBulkUploadUnknown(
      unknown.map((u, idx) => ({
        id: `${idx}:${u.name}`,
        name: u.name,
        file: u.file,
      })),
    );

    setBusy(true);
    try {
      for (const item of identified) {
        const cc = item.countryCode;
        const k = item.adKey;
        const existing =
          form?.mediaByCountry?.[cc] && typeof form.mediaByCountry[cc] === "object"
            ? form.mediaByCountry[cc]?.[k] ?? null
            : null;
        if (existing?.creativeAssetId) {
          const ok = window.confirm(`${item.name} → ${cc} / Ad ${k}\n\nJá existe um vídeo nesse slot. Substituir?`);
          if (!ok) continue;
        }
        await onUploadMediaForCountryAd(cc, k, item.file);
        mapped.push(item);
      }
      setNotice(`Upload concluído: ${mapped.length} mapeado(s), ${unknown.length} não identificado(s).`);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha no upload múltiplo.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveTemplate() {
    setNotice("");
    setError("");
    const name = normalizeNonEmptyString(form.name);
    if (!name) {
      setError("Nome é obrigatório.");
      return;
    }
    const payload = buildPayloadFromForm(form);
    if (!normalizeNonEmptyString(payload.destinationUrl)) {
      setError("URL de destino é obrigatória (para Creative REAL).");
      return;
    }

    payload.translationsByCountry =
      editingTranslationsByCountry && typeof editingTranslationsByCountry === "object" ? editingTranslationsByCountry : {};

    setBusy(true);
    try {
      if (editingId) {
        await updateFlowTemplate(editingId, { name, payload });
        setNotice("Template salvo.");
        await refresh();
        setSelectedId(String(editingId));
      } else {
        const res = await createFlowTemplate({ name, payload });
        setNotice("Template criado.");
        await refresh();
        if (res?.flowTemplate?.id) {
          const id = String(res.flowTemplate.id);
          setSelectedId(id);
          setEditingId(id);
        }
      }
      setActiveTab(TAB_MINE);
      setShowTranslationsEditor(false);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao salvar template.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteSelected() {
    setNotice("");
    setError("");
    if (!selectedId) return;
    const ok = window.confirm("Confirmo: excluir este template?");
    if (!ok) return;
    setBusy(true);
    try {
      await deleteFlowTemplate(selectedId);
      setSelectedId("");
      setShowTranslationsEditor(false);
      setTranslationsDraftByCountry({});
      setNotice("Template removido.");
      await refresh();
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao excluir template.");
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateTranslationsSelected() {
    setNotice("");
    setError("");
    if (!selectedId) {
      setError("Selecione um template para gerar traduções.");
      return;
    }

    const currentTplPayload = selectedTemplate?.payload && typeof selectedTemplate.payload === "object" ? selectedTemplate.payload : {};
    const countryCodes = uniqueCountryCodes(currentTplPayload.countryCodes);
    if (!countryCodes.length) {
      setError("Defina países no template antes de gerar traduções.");
      return;
    }

    const missingLang = (countryCodes || [])
      .map((c) => ({ code: String(c || "").toUpperCase(), lang: profileCountryLanguageByCode?.[String(c || "").toUpperCase()] ?? null }))
      .filter((i) => !i.lang);

    if (missingLang.length) {
      setError(`Defina o idioma principal no /profile para: ${missingLang.map((i) => i.code).join(", ")}.`);
      return;
    }

    const ok = window.confirm(
      "Confirmo: gerar traduções via LibreTranslate para países diferentes de BR? (BR é a origem PT-BR). Você poderá revisar/editar antes de usar."
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await generateFlowTemplateTranslations(selectedId, { overwrite: false });
      const updated = res?.flowTemplate ?? null;
      setNotice("Traduções geradas. Revise e edite antes de usar no lote.");
      await refresh();
      if (updated?.id) {
        setSelectedId(String(updated.id));
        setTranslationsDraftByCountry(getTranslationsByCountryFromPayload(updated?.payload));
        setShowTranslationsEditor(true);
      }
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao gerar traduções.");
    } finally {
      setBusy(false);
    }
  }

  function useInCampaignFlowSelected() {
    setNotice("");
    setError("");
    const tpl = selectedTemplate;
    if (!tpl) {
      setError("Selecione um template para usar.");
      return;
    }
    const payload = tpl?.payload && typeof tpl.payload === "object" ? tpl.payload : {};
    const countryCodes = uniqueCountryCodes(payload.countryCodes);
    const metaAccountId =
      normalizeNonEmptyString(payload?.metaAccountId) ||
      normalizeNonEmptyString(payload?.meta_account_id) ||
      normalizeNonEmptyString(form.metaAccountId) ||
      normalizeNonEmptyString(defaultMetaAccountId) ||
      "";
    const base = {
      campaign: {
        name: tpl.name ?? "",
        metaAccountId,
        metaAdAccountId: "",
        objective: payload.objective ?? "OUTCOME_TRAFFIC",
        countryCode: countryCodes[0] ?? "BR",
        mode: "REAL",
      },
      adSet: {
        name: `AdSet • ${countryCodes[0] ?? "BR"}`,
        dailyBudgetCents: Number(payload.dailyBudgetCents) || 1000,
        billingEvent: payload.billingEvent ?? "IMPRESSIONS",
        optimizationGoal: payload.optimizationGoal ?? "LINK_CLICKS",
      },
      creative: {
        destinationUrl: payload.destinationUrl ?? "",
        ctaType: payload.ctaType ?? "LEARN_MORE",
        adVariants: getAdVariantsFromPayload(payload),
        translationsByCountry: getTranslationsByCountryFromPayload(payload),
        translationsRequired: true,
        mediaByCountry: normalizeMediaByCountry(getMediaByCountryFromPayload(payload)),
        pageId: "",
        instagramActorId: "",
      },
      ad: {
        name: `Ad • ${countryCodes[0] ?? "BR"} — 1`,
      },
    };

    try {
      localStorage.setItem(
        STORAGE_LAST_EXECUTION_KEY,
        JSON.stringify({
          base,
          batchEnabled: countryCodes.length > 1,
          selectedCountryCodes: countryCodes.length > 0 ? countryCodes : ["BR"],
        })
      );
    } catch {
      // best-effort
    }
    navigate("/campaign-flow?applyLast=1");
  }

  async function onSaveTranslationsSelected({ markReviewed = false } = {}) {
    setNotice("");
    setError("");
    if (!selectedId) {
      setError("Selecione um template para salvar traduções.");
      return;
    }

    const tpl = selectedTemplate;
    if (!tpl) {
      setError("Template não encontrado.");
      return;
    }

    const basePayload = tpl?.payload && typeof tpl.payload === "object" ? tpl.payload : {};
    const nextTranslationsRaw = translationsDraftByCountry && typeof translationsDraftByCountry === "object" ? translationsDraftByCountry : {};
    const nextTranslations = {};
    for (const [k, v] of Object.entries(nextTranslationsRaw || {})) {
      const cc = String(k || "").trim().toUpperCase();
      if (!cc || cc === "BR") continue;
      nextTranslations[cc] = v;
    }
    const nextPayload = {
      ...basePayload,
      translationsByCountry: nextTranslations,
      ...(markReviewed
        ? {
            translationsReviewStatus: "reviewed",
            translationsReviewedAt: new Date().toISOString(),
          }
        : {}),
    };

    setBusy(true);
    try {
      await updateFlowTemplate(selectedId, { name: tpl?.name ?? "", payload: nextPayload });
      setNotice(markReviewed ? "Traduções salvas e marcadas como revisadas." : "Traduções salvas no template.");
      await refresh();
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao salvar traduções.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Templates"
      subtitle="Crie templates operacionais, traduções e mídia por país. No modo REAL, tudo é criado como PAUSED."
      align="left"
      backFallbackTo="/"
      headerRight={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="templatesRouteChip" onClick={() => navigate("/campaign-flow")}>
            Fluxo de campanha
          </button>
          <button type="button" className="templatesRouteChip" onClick={() => navigate("/meta-test")}>
            Diagnóstico técnico
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {(notice || error) && (
          <div
            className="minimalCard"
            style={{
              marginBottom: 14,
              padding: 14,
              borderColor: error ? "#fecaca" : "#bfdbfe",
              color: error ? "#991b1b" : "#1d4ed8",
            }}
          >
            <div style={{ fontWeight: 900 }}>{error || notice}</div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div className="templatesTabs" aria-label="Tabs templates">
            <button
              type="button"
              className={`templatesTabBtn ${activeTab === TAB_CREATE ? "templatesTabBtnActive" : ""}`}
              onClick={() => {
                setActiveTab(TAB_CREATE);
                if (!editingId) return;
                resetForm({ useProfileCountries: true });
              }}
            >
              Criar template
            </button>
            <button
              type="button"
              className={`templatesTabBtn ${activeTab === TAB_MINE ? "templatesTabBtnActive" : ""}`}
              onClick={() => setActiveTab(TAB_MINE)}
            >
              Meus templates
            </button>
          </div>
          <div className="templatesCountPill">{loading ? "Carregando..." : <><strong>{templates.length}</strong> template(s)</>}</div>
        </div>

        {activeTab === TAB_CREATE ? (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="templatesCard" style={{ paddingBottom: 16 }}>
                <div className="templatesCardLabel" style={{ marginBottom: 12 }}>
                  Campanha
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <Field label="Nome do template" hint="Ex: Padrão LATAM • Tráfego">
                    <InputLike value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </Field>
                  <Field
                    label="Conta Meta"
                    hint="Esta conta será usada quando o template for aplicado no Fluxo de campanha."
                  >
                    <SelectLike
                      value={form.metaAccountId || ""}
                      onChange={(e) => setForm((p) => ({ ...p, metaAccountId: e.target.value }))}
                      options={metaAccountOptions}
                    />
                    {selectedMetaAccount && selectedMetaAccount.isActive === false ? (
                      <div className="muted" style={{ marginTop: 6, fontWeight: 850, color: "#b45309" }}>
                        Atenção: a conta vinculada está inativa. Selecione outra conta antes de usar no fluxo.
                      </div>
                    ) : null}
                  </Field>
                  <Field label="Objetivo">
                    <SelectLike
                      value={form.objective}
                      onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))}
                      options={[
                        { value: "OUTCOME_TRAFFIC", label: "Tráfego" },
                        { value: "OUTCOME_LEADS", label: "Leads" },
                        { value: "OUTCOME_SALES", label: "Vendas" },
                      ]}
                    />
                  </Field>
                  <Field label="Países do template" hint="Códigos separados por vírgula (ex: BR,AR,CL).">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <InputLike
                          value={form.countryCodes}
                          onChange={(e) => setForm((p) => ({ ...p, countryCodes: e.target.value }))}
                          placeholder="BR,AR"
                        />
                      </div>
                      {profileCountryCodes.length ? (
                        <button
                          type="button"
                          className="templatesBtnOutline"
                          disabled={busy}
                          onClick={() => setForm((p) => ({ ...p, countryCodes: profileCountryCodes.join(",") }))}
                        >
                          Usar perfil ({profileCountryCodes.length})
                        </button>
                      ) : null}
                    </div>
                    {profileCountryCodes.length ? (
                      <div className="muted" style={{ marginTop: 6, fontWeight: 750, fontSize: 12 }}>
                        Dica: idiomas por país são configurados no Perfil.
                      </div>
                    ) : null}
                    <div className="templatesHintBox">
                      Os textos base são sempre em PT-BR. O Brasil usa o texto original. Os demais países recebem tradução.
                    </div>
                  </Field>
                </div>
              </div>

              <div className="templatesCard" style={{ paddingBottom: 16 }}>
                <div className="templatesCardLabel" style={{ marginBottom: 12 }}>
                  AdSet
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <Field
                    label="Orçamento diário (R$)"
                    hint="Digite o valor em reais. Ex.: 10 para R$ 10,00."
                  >
                    <InputLike
                      inputMode="decimal"
                      value={String(form.dailyBudgetBrl ?? "")}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const cents = parseBrlToCents(raw);
                        setForm((p) => ({ ...p, dailyBudgetBrl: raw, dailyBudgetCents: cents ?? 0 }));
                      }}
                      placeholder="10"
                    />
                  </Field>
                  <Field label="Tipo de cobrança">
                    <SelectLike
                      value={form.billingEvent}
                      onChange={(e) => setForm((p) => ({ ...p, billingEvent: e.target.value }))}
                      options={[
                        { value: "IMPRESSIONS", label: "Impressões" },
                        { value: "LINK_CLICKS", label: "Cliques no link" },
                      ]}
                    />
                  </Field>
                  <Field label="Otimização">
                    <SelectLike
                      value={form.optimizationGoal}
                      onChange={(e) => setForm((p) => ({ ...p, optimizationGoal: e.target.value }))}
                      options={[
                        { value: "LINK_CLICKS", label: "Cliques no link" },
                        { value: "OFFSITE_CONVERSIONS", label: "Conversões (site)" },
                      ]}
                    />
                  </Field>
                </div>
              </div>

            </div>

            <div className="templatesCard" style={{ paddingBottom: 16 }}>
              <div className="templatesCardLabel" style={{ marginBottom: 12 }}>
                Criativo (PT-BR)
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <Field
                  label="Variações (Ads A–E)"
                  hint="PT-BR é a origem fixa. BR sempre usa o texto do template; traduções são apenas para países ≠ BR."
                >
                  <div className="templatesAccordion">
                    {AD_KEYS.map((adKey, idx) => {
                      const item =
                        Array.isArray(form.adVariants) && form.adVariants[idx] && typeof form.adVariants[idx] === "object" ? form.adVariants[idx] : {};
                      const previewPrimary = normalizeNonEmptyString(item?.primaryText) ? String(item.primaryText).slice(0, 64) : "—";
                      const isOpen = openAdKey === adKey;
                      return (
                        <details
                          key={adKey}
                          className="templatesAccordionItem"
                          open={isOpen}
                          onToggle={(e) => {
                            if (e.currentTarget.open) setOpenAdKey(adKey);
                          }}
                        >
                          <summary className="templatesAccordionSummary">
                            <div className="templatesAccordionSummaryTitle">{`Ad ${adKey}`}</div>
                            <div className="templatesAccordionSummaryMeta">{previewPrimary}</div>
                          </summary>
                          <div className="templatesAccordionBody">
                            <div style={{ display: "grid", gap: 10 }}>
                              <Field label="Texto principal">
                                <TextAreaLike
                                  value={item.primaryText ?? ""}
                                  onChange={(e) =>
                                    setForm((p) => {
                                      const next = Array.isArray(p.adVariants)
                                        ? [...p.adVariants]
                                        : AD_KEYS.map((k) => ({ key: k, primaryText: "", headline: "", description: "" }));
                                      while (next.length < AD_KEYS.length)
                                        next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
                                      const cur = next[idx] && typeof next[idx] === "object" ? next[idx] : {};
                                      next[idx] = { ...cur, key: adKey, primaryText: e.target.value };
                                      return { ...p, adVariants: next };
                                    })
                                  }
                                  placeholder="Escreva o texto principal…"
                                  rows={3}
                                />
                              </Field>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <Field label="Título">
                                  <InputLike
                                    value={item.headline ?? ""}
                                    onChange={(e) =>
                                      setForm((p) => {
                                        const next = Array.isArray(p.adVariants)
                                          ? [...p.adVariants]
                                          : AD_KEYS.map((k) => ({ key: k, primaryText: "", headline: "", description: "" }));
                                        while (next.length < AD_KEYS.length)
                                          next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
                                        const cur = next[idx] && typeof next[idx] === "object" ? next[idx] : {};
                                        next[idx] = { ...cur, key: adKey, headline: e.target.value };
                                        return { ...p, adVariants: next };
                                      })
                                    }
                                    placeholder="Título…"
                                  />
                                </Field>
                                <Field label="Descrição">
                                  <InputLike
                                    value={item.description ?? ""}
                                    onChange={(e) =>
                                      setForm((p) => {
                                        const next = Array.isArray(p.adVariants)
                                          ? [...p.adVariants]
                                          : AD_KEYS.map((k) => ({ key: k, primaryText: "", headline: "", description: "" }));
                                        while (next.length < AD_KEYS.length)
                                          next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
                                        const cur = next[idx] && typeof next[idx] === "object" ? next[idx] : {};
                                        next[idx] = { ...cur, key: adKey, description: e.target.value };
                                        return { ...p, adVariants: next };
                                      })
                                    }
                                    placeholder="Descrição…"
                                  />
                                </Field>
                              </div>
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </Field>

                <Field label="URL de destino" hint="Obrigatório para Creative REAL.">
                  <InputLike
                    value={form.destinationUrl}
                    onChange={(e) => setForm((p) => ({ ...p, destinationUrl: e.target.value }))}
                    placeholder="https://example.com/?utm_source=template"
                  />
                </Field>
                <Field label="Chamada (CTA)">
                  <SelectLike
                    value={form.ctaType}
                    onChange={(e) => setForm((p) => ({ ...p, ctaType: e.target.value }))}
                    options={[
                      { value: "LEARN_MORE", label: "Saiba mais" },
                      { value: "SHOP_NOW", label: "Comprar agora" },
                      { value: "SIGN_UP", label: "Inscrever-se" },
                    ]}
                  />
                </Field>

                </div>
              </div>

            <div className="templatesCard" style={{ paddingBottom: 16 }}>
              <div className="templatesCardLabel" style={{ marginBottom: 12 }}>
                Vídeos por país (A–E)
              </div>
              <div className="templatesMediaSection">
                <div className="templatesDropzone">
                  <div>
                    <div className="templatesDropzoneTitle">Enviar vídeos em lote</div>
                    <div className="templatesDropzoneHint">
                      Use nomes como <code>BR1.mp4</code>, <code>BR2.mp4</code>, <code>AE1.mp4</code>. O sistema associa automaticamente país e Ad.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="file" multiple accept="video/*" disabled={busy} onChange={(e) => onBulkUploadVideos(e.target.files)} />
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        onBulkUploadVideos(e.dataTransfer?.files);
                      }}
                      className="templatesHintBox"
                      style={{ minWidth: 220 }}
                    >
                      Arraste e solte aqui
                    </div>
                  </div>
                </div>

                {bulkUploadSummary ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {bulkUploadSummary.mapped?.length ? (
                      <div style={{ color: "#065f46", fontWeight: 900, fontSize: 12 }}>
                        Mapeados:{" "}
                        {bulkUploadSummary.mapped
                          .slice(0, 8)
                          .map((m) => `${m.name} → ${m.countryCode} / Ad ${m.adKey}`)
                          .join(" • ")}
                        {bulkUploadSummary.mapped.length > 8 ? " …" : ""}
                      </div>
                    ) : null}
                    {bulkUploadSummary.unmapped?.length ? (
                      <div style={{ color: "#92400e", fontWeight: 900, fontSize: 12 }}>
                        Não identificados: {bulkUploadSummary.unmapped.slice(0, 8).map((u) => u.name).join(" • ")}
                        {bulkUploadSummary.unmapped.length > 8 ? " …" : ""}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {bulkUploadUnknown.length ? (
                  <div className="templatesHintBox">
                    <div style={{ fontWeight: 950, marginBottom: 8 }}>Não identificados</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {bulkUploadUnknown.map((u) => {
                        const draft = bulkUploadUnknownDraft?.[u.id] ?? {};
                        return (
                          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 110px auto", gap: 8, alignItems: "center" }}>
                            <div style={{ fontWeight: 850, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {u.name}
                            </div>
                            <select
                              className="templatesSelect"
                              disabled={busy}
                              value={draft.countryCode || ""}
                              onChange={(e) =>
                                setBulkUploadUnknownDraft((p) => ({ ...(p || {}), [u.id]: { ...(p?.[u.id] || {}), countryCode: e.target.value } }))
                              }
                            >
                              <option value="" disabled>
                                País…
                              </option>
                              {uniqueCountryCodes(form.countryCodes).map((cc) => (
                                <option key={cc} value={cc}>
                                  {cc}
                                </option>
                              ))}
                            </select>
                            <select
                              className="templatesSelect"
                              disabled={busy}
                              value={draft.adKey || ""}
                              onChange={(e) =>
                                setBulkUploadUnknownDraft((p) => ({ ...(p || {}), [u.id]: { ...(p?.[u.id] || {}), adKey: e.target.value } }))
                              }
                            >
                              <option value="" disabled>
                                Ad…
                              </option>
                              {AD_KEYS.map((k) => (
                                <option key={k} value={k}>
                                  {`Ad ${k}`}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="templatesBtnOutline"
                              disabled={busy || !draft.countryCode || !draft.adKey}
                              onClick={() => onUploadMediaForCountryAd(draft.countryCode, draft.adKey, u.file)}
                            >
                              Enviar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {uniqueCountryCodes(form.countryCodes).length ? (
                  uniqueCountryCodes(form.countryCodes).map((code) => {
                    const cc = String(code || "").trim().toUpperCase();
                    const byAd = form?.mediaByCountry?.[cc] && typeof form.mediaByCountry[cc] === "object" ? form.mediaByCountry[cc] : {};
                    const rows = AD_KEYS.map((k) => {
                      const entry = byAd?.[k] ?? null;
                      const isVideo = entry?.mimeType ? String(entry.mimeType).startsWith("video/") : false;
                      const previewUrl = entry?.url ? `${getBackendBaseUrl()}${entry.url}` : null;
                      const hasVideo = Boolean(entry?.creativeAssetId);
                      const hasThumb = Boolean(entry?.thumbnail?.creativeAssetId);
                      let status = { tone: "muted", label: "Sem vídeo" };
                      if (hasVideo && !isVideo) status = { tone: "bad", label: "Erro" };
                      else if (hasVideo && hasThumb) status = { tone: "good", label: "Pronto" };
                      else if (hasVideo && !hasThumb) status = { tone: "warn", label: "Thumbnail pendente" };
                      return { adKey: k, entry, isVideo, previewUrl, status };
                    });
                    const readyCount = rows.filter((r) => r.entry?.creativeAssetId).length;
                    return (
                      <div key={cc} className="templatesMediaCountry">
                        <div className="templatesMediaCountryHead">
                          <div className="templatesMediaCountryCode">{cc}</div>
                          <StatusPill tone={readyCount === AD_KEYS.length ? "good" : readyCount > 0 ? "info" : "muted"}>
                            {`${readyCount}/${AD_KEYS.length} vídeos`}
                          </StatusPill>
                        </div>

                        <div className="templatesMediaRows">
                          {rows.map((r) => {
                            const filename = r.entry?.originalName || (r.entry?.creativeAssetId ? "Asset selecionado" : "—");
                            return (
                              <div key={r.adKey} className="templatesMediaRow">
                                <div className="templatesMediaRowTitle">{`Ad ${r.adKey}`}</div>
                                <div>
                                  {r.isVideo && r.previewUrl ? (
                                    <CompactVideoPreview src={r.previewUrl} label={`${cc} Ad ${r.adKey}`} size="sm" />
                                  ) : (
                                    <div className="videoThumb videoThumbSm" style={{ display: "grid", placeItems: "center", color: "#94a3b8" }}>
                                      —
                                    </div>
                                  )}
                                </div>
                                <div className="templatesMediaFilename" title={filename}>
                                  {filename}
                                </div>
                                <StatusPill tone={r.status.tone}>{r.status.label}</StatusPill>
                                <div className="templatesMediaRowActions">
                                  <AdvancedDisclosure summary="Trocar / editar">
                                    <div style={{ display: "grid", gap: 10 }}>
                                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                        <input
                                          type="file"
                                          accept="video/*"
                                          disabled={busy}
                                          onChange={(e) => onUploadMediaForCountryAd(cc, r.adKey, e.target.files?.[0] ?? null)}
                                        />
                                        <select
                                          className="templatesSelect"
                                          style={{ height: 40, minWidth: 260 }}
                                          disabled={busy}
                                          value=""
                                          onChange={(e) => {
                                            const id = e.target.value;
                                            if (!id) return;
                                            onSelectExistingMediaForCountryAd(cc, r.adKey, id);
                                          }}
                                        >
                                          <option value="" disabled>
                                            Selecionar asset existente…
                                          </option>
                                          {(creativeAssets || []).map((a) => (
                                            <option key={a.id} value={String(a.id)}>
                                              {a?.original_name ? `${a.original_name} (${String(a.id).slice(0, 8)})` : String(a.id).slice(0, 12)}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          type="button"
                                          className="templatesBtnOutline"
                                          disabled={busy || !r.entry?.creativeAssetId}
                                          onClick={() => onRemoveMediaForCountryAd(cc, r.adKey)}
                                        >
                                          Remover vídeo
                                        </button>
                                      </div>

                                      <AdvancedDisclosure summary="Editar thumbnail">
                                        <div style={{ display: "grid", gap: 10 }}>
                                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                            <button
                                              type="button"
                                              className="templatesBtnOutline"
                                              disabled={busy || !r.entry?.creativeAssetId}
                                              onClick={() => onAutoGenerateThumbnailForCountryAd(cc, r.adKey, r.entry.creativeAssetId)}
                                            >
                                              Gerar automática
                                            </button>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              disabled={busy}
                                              onChange={(e) => onUploadThumbnailForCountryAd(cc, r.adKey, e.target.files?.[0] ?? null)}
                                            />
                                            <select
                                              className="templatesSelect"
                                              style={{ height: 40, minWidth: 260 }}
                                              disabled={busy}
                                              value=""
                                              onChange={(e) => {
                                                const id = e.target.value;
                                                if (!id) return;
                                                onSelectExistingThumbnailForCountryAd(cc, r.adKey, id);
                                              }}
                                            >
                                              <option value="" disabled>
                                                Selecionar thumbnail existente…
                                              </option>
                                              {(creativeAssets || []).map((a) => (
                                                <option key={a.id} value={String(a.id)}>
                                                  {a?.original_name ? `${a.original_name} (${String(a.id).slice(0, 8)})` : String(a.id).slice(0, 12)}
                                                </option>
                                              ))}
                                            </select>
                                            <button
                                              type="button"
                                              className="templatesBtnOutline"
                                              disabled={busy || !r.entry?.thumbnail?.creativeAssetId}
                                              onClick={() => onRemoveThumbnailForCountryAd(cc, r.adKey)}
                                            >
                                              Remover thumbnail
                                            </button>
                                          </div>
                                          {r.entry?.thumbnail?.mimeType?.startsWith("image/") && r.entry?.thumbnail?.url ? (
                                            <img
                                              src={`${getBackendBaseUrl()}${r.entry.thumbnail.url}`}
                                              alt={`Thumbnail ${cc} Ad ${r.adKey}`}
                                              style={{
                                                width: "100%",
                                                maxWidth: 360,
                                                borderRadius: 12,
                                                border: "1px solid #e5e7eb",
                                                display: "block",
                                              }}
                                            />
                                          ) : null}
                                        </div>
                                      </AdvancedDisclosure>
                                    </div>
                                  </AdvancedDisclosure>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                    Defina países para adicionar vídeos.
                  </div>
                )}
              </div>
            </div>

            <div className="templatesCard" style={{ paddingBottom: 16 }}>
              <div className="templatesCardLabel" style={{ marginBottom: 12 }}>
                Revisão e salvamento
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <div className="templatesHintBox">
                  PT-BR é a origem fixa. BR usa o texto original. Para países ≠ BR, gere traduções e revise antes de usar no fluxo.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
                    <div style={{ fontWeight: 900, color: "var(--text-secondary)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Conta Meta
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 900 }}>
                      {selectedMetaAccount?.name || (defaultMetaAccountId ? "Conta padrão do usuário" : "—")}
                    </div>
                    <div className="muted" style={{ marginTop: 6, fontWeight: 800, fontSize: 12 }}>
                      {selectedMetaAccount?.metaAdAccountId ? `Ad Account: ${selectedMetaAccount.metaAdAccountId}` : "Ad Account: —"}
                      {" • "}
                      {selectedMetaAccount?.metaPageId ? `Page: ${selectedMetaAccount.metaPageId}` : "Page: —"}
                    </div>
                  </div>

                  <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
                    <div style={{ fontWeight: 900, color: "var(--text-secondary)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Escopo do template
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 900 }}>
                      {uniqueCountryCodes(form.countryCodes).length} país(es) • {AD_KEYS.length} Ads (A–E)
                    </div>
                    <div className="muted" style={{ marginTop: 6, fontWeight: 800, fontSize: 12 }}>
                      Orçamento diário: {Number(form.dailyBudgetCents) ? formatBrlFromCents(form.dailyBudgetCents) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="templatesFormFooter">
              <div className="templatesFormFooterLabel">{editingId ? "Editando template" : "Novo template"}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" className="templatesBtnClear" disabled={busy} onClick={() => resetForm({ useProfileCountries: true })}>
                  Limpar
                </button>
                <button type="button" className="templatesBtnPrimary" disabled={busy} onClick={onSaveTemplate}>
                  Salvar template
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="templatesLayout" style={{ marginTop: 16 }}>
            <div className="templatesListPanel">
              <div className="templatesListHeader">
                <h2 className="templatesListTitle">Meus templates</h2>
                <div className="templatesListHint">Selecione para ver detalhes e operar.</div>
              </div>
              <div className="templatesSearchWrap">
                <InputLike value={listQuery} onChange={(e) => setListQuery(e.target.value)} placeholder="Buscar por nome..." />
              </div>
              <button
                type="button"
                className="templatesNewBtn"
                disabled={busy}
                onClick={() => {
                  resetForm({ useProfileCountries: true });
                  setActiveTab(TAB_CREATE);
                }}
              >
                + Novo template
              </button>

              <div>
                {(filteredTemplates || []).map((t) => {
                  const payload = t?.payload && typeof t.payload === "object" ? t.payload : {};
                  const status = computeTranslationsStatus(payload);
                  const mediaStatus = computeMediaStatus(payload);
                  const adCount = computeAdCount(payload);
                  const countries = uniqueCountryCodes(payload.countryCodes);
                  const active = String(t.id) === String(selectedId);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`templatesTplItem ${active ? "templatesTplItemActive" : ""}`}
                      onClick={() => {
                        setSelectedId(String(t.id));
                        setShowTranslationsEditor(false);
                        setTranslationsDraftByCountry(getTranslationsByCountryFromPayload(payload));
                      }}
                    >
                      <div className="templatesTplName">{t.name}</div>
                      <div className="templatesTplMetaRow">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {countries.length ? `${countries.length} países` : "Sem países"}
                          </div>
                          <span className="templatesSep">·</span>
                          <div>{`${adCount} ads`}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <div className="templatesTplStatusLine">{`${status.label} · ${mediaStatus.label}`}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!loading && !filteredTemplates.length ? (
                  <div className="muted" style={{ padding: 14, fontWeight: 800, fontSize: 12 }}>
                    Nenhum template encontrado.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="templatesDetailPanel">
              {!selectedTemplate ? (
                <div className="muted" style={{ fontWeight: 800, padding: 18 }}>
                  Selecione um template na lista.
                </div>
              ) : (
                (() => {
                  const payload = selectedTemplate?.payload && typeof selectedTemplate.payload === "object" ? selectedTemplate.payload : {};
                  const metaAccId =
                    normalizeNonEmptyString(payload?.metaAccountId) || normalizeNonEmptyString(payload?.meta_account_id) || "";
                  const metaAcc = metaAccId ? metaAccounts.find((a) => String(a.id) === metaAccId) ?? null : null;
                  const metaAccLabel = metaAcc ? metaAcc.name : metaAccId ? "Conta Meta (não encontrada)" : "Conta Meta padrão";
                  const countries = uniqueCountryCodes(payload.countryCodes);
                  const status = computeTranslationsStatus(payload);
                  const mediaStatus = computeMediaStatus(payload);
                  const translations = getTranslationsByCountryFromPayload(payload);
                  const translationCount = Object.keys(translations || {}).length;
                  const mediaByCountry = normalizeMediaByCountry(getMediaByCountryFromPayload(payload));
                  const backendBase = getBackendBaseUrl();
                  const adCount = computeAdCount(payload);
                  const adVariants = getAdVariantsFromPayload(payload);
                  const primaryPreview = normalizeNonEmptyString(adVariants?.[0]?.primaryText)
                    ? `${String(adVariants[0].primaryText).slice(0, 70)}${String(adVariants[0].primaryText).length > 70 ? "…" : ""}`
                    : "—";
                  const tagTone =
                    status.tone === "good"
                      ? "templatesStatusTagGood"
                      : status.tone === "info"
                        ? "templatesStatusTagInfo"
                        : "templatesStatusTagMuted";
                  const mediaTone =
                    mediaStatus.tone === "good"
                      ? "templatesStatusTagGood"
                      : mediaStatus.tone === "info"
                        ? "templatesStatusTagInfo"
                        : "templatesStatusTagMuted";

                  return (
                    <div style={{ display: "grid", gap: 14 }}>
                      <div className="templatesDetailHead">
                        <div>
                          <div className="templatesDetailName">{selectedTemplate.name}</div>
                          <div className="templatesDetailMeta">
                            {countries.map((c) => (
                              <span key={c} className="templatesCountryTag">
                                {c}
                              </span>
                            ))}
                            <span className="templatesSep">·</span>
                            <span
                              className="templatesVarBadge"
                              title={metaAccId ? `ID: ${metaAccId}` : "Usa a conta padrão do usuário"}
                              style={{
                                background: metaAcc && metaAcc.isActive === false ? "#ffedd5" : undefined,
                                borderColor: metaAcc && metaAcc.isActive === false ? "#fed7aa" : undefined,
                              }}
                            >
                              {metaAccLabel}
                            </span>
                            <span className="templatesSep">·</span>
                            <span className="templatesVarBadge">{adCount} ad(s)</span>
                            <span className="templatesSep">·</span>
                            <span className={`templatesStatusTag ${tagTone}`}>{status.label}</span>
                            <span className="templatesSep">·</span>
                            <span className={`templatesStatusTag ${mediaTone}`}>{mediaStatus.label}</span>
                            {translationCount ? (
                              <>
                                <span className="templatesSep">·</span>
                                <span className="templatesVarBadge">{translationCount} variação(ões)</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="templatesDetailActions">
                          <button type="button" className="templatesBtnPrimary" disabled={busy} onClick={useInCampaignFlowSelected}>
                            Usar no fluxo de campanha
                          </button>
                          <button
                            type="button"
                            className="templatesBtnOutline"
                            disabled={busy}
                            onClick={() => {
                              fillFormFromTemplate(selectedTemplate);
                              setActiveTab(TAB_CREATE);
                            }}
                          >
                            Editar
                          </button>
                          <button type="button" className="templatesBtnOutline templatesBtnDanger" disabled={busy} onClick={onDeleteSelected}>
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div className="templatesDetailBody">
                        <div className="templatesDetailCol">
                          <div className="templatesColTitle">Campanha</div>
                          <div className="templatesKv">
                            <div className="templatesK">Objetivo</div>
                            <div className="templatesV">{OBJECTIVE_LABEL_BY_VALUE[payload.objective] ?? payload.objective ?? "—"}</div>
                          </div>
                        </div>
                        <div className="templatesDetailCol templatesDetailColAlt">
                          <div className="templatesColTitle">AdSet</div>
                          <div className="templatesKv">
                            <div className="templatesK">Orçamento diário (R$)</div>
                            <div className="templatesV">
                              {payload.dailyBudgetCents !== null && payload.dailyBudgetCents !== undefined
                                ? formatBrlFromCents(payload.dailyBudgetCents)
                                : "—"}
                            </div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">Cobrança</div>
                            <div className="templatesV">{BILLING_EVENT_LABEL_BY_VALUE[payload.billingEvent] ?? payload.billingEvent ?? "—"}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">Otimização</div>
                            <div className="templatesV">
                              {OPTIMIZATION_GOAL_LABEL_BY_VALUE[payload.optimizationGoal] ?? payload.optimizationGoal ?? "—"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="templatesCreativeBlock">
                        <div className="templatesColTitle">Criativo</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                          <div className="templatesKv">
                            <div className="templatesK">Texto principal (Ad A)</div>
                            <div className="templatesV">{primaryPreview}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">Título (Ad A)</div>
                            <div className="templatesV">{normalizeNonEmptyString(adVariants?.[0]?.headline) ? adVariants[0].headline : "—"}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">Descrição (Ad A)</div>
                            <div className="templatesV">{normalizeNonEmptyString(adVariants?.[0]?.description) ? adVariants[0].description : "—"}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">URL de destino</div>
                            <div className="templatesV">{normalizeNonEmptyString(payload.destinationUrl) ? String(payload.destinationUrl) : "—"}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">Chamada (CTA)</div>
                            <div className="templatesV">{CTA_LABEL_BY_VALUE[payload.ctaType] ?? payload.ctaType ?? "—"}</div>
                          </div>
                        </div>
                        <AdvancedDisclosure summary="Ver variações (Ads A–E)">
                          <div style={{ display: "grid", gap: 10 }}>
                            {(adVariants || []).slice(0, AD_KEYS.length).map((v, idx) => {
                              const k = AD_KEYS[idx] ?? String(v?.key || "");
                              const primary = normalizeNonEmptyString(v?.primaryText) ? String(v.primaryText) : "—";
                              const headline = normalizeNonEmptyString(v?.headline) ? String(v.headline) : "—";
                              const description = normalizeNonEmptyString(v?.description) ? String(v.description) : "—";
                              return (
                                <div key={k} className="templatesHintBox" style={{ background: "#ffffff" }}>
                                  <div style={{ fontWeight: 950, marginBottom: 8 }}>{`Ad ${k}`}</div>
                                  <div style={{ display: "grid", gap: 6 }}>
                                    <div style={{ fontWeight: 900, color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                      Texto principal
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: 12, whiteSpace: "pre-wrap" }}>{primary}</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                      <div>
                                        <div
                                          style={{
                                            fontWeight: 900,
                                            color: "#6b7280",
                                            fontSize: 11,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.08em",
                                          }}
                                        >
                                          Título
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: 12, whiteSpace: "pre-wrap" }}>{headline}</div>
                                      </div>
                                      <div>
                                        <div
                                          style={{
                                            fontWeight: 900,
                                            color: "#6b7280",
                                            fontSize: 11,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.08em",
                                          }}
                                        >
                                          Descrição
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: 12, whiteSpace: "pre-wrap" }}>{description}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AdvancedDisclosure>
                      </div>

                      <div className="templatesCreativeBlock" style={{ marginTop: 12 }}>
                        <div className="templatesColTitle">Vídeos por país (A–E)</div>
                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                          {countries.length ? (
                            countries.map((code) => {
                              const cc = String(code || "").trim().toUpperCase();
                              const byAd = mediaByCountry?.[cc] && typeof mediaByCountry[cc] === "object" ? mediaByCountry[cc] : {};
                              const rows = AD_KEYS.map((k) => {
                                const entry = byAd?.[k] ?? null;
                                const isVideo = entry?.mimeType ? String(entry.mimeType).startsWith("video/") : false;
                                const previewUrl = entry?.url ? `${backendBase}${entry.url}` : null;
                                const hasVideo = Boolean(entry?.creativeAssetId);
                                const hasThumb = Boolean(entry?.thumbnail?.creativeAssetId);
                                let status = { tone: "muted", label: "Sem vídeo" };
                                if (hasVideo && !isVideo) status = { tone: "bad", label: "Erro" };
                                else if (hasVideo && hasThumb) status = { tone: "good", label: "Pronto" };
                                else if (hasVideo && !hasThumb) status = { tone: "warn", label: "Thumbnail pendente" };
                                return { adKey: k, entry, isVideo, previewUrl, status };
                              });
                              const readyCount = rows.filter((r) => r.entry?.creativeAssetId).length;
                              return (
                                <div key={cc} className="templatesMediaCountry">
                                  <div className="templatesMediaCountryHead">
                                    <div className="templatesMediaCountryCode">{cc}</div>
                                    <StatusPill tone={readyCount === AD_KEYS.length ? "good" : readyCount > 0 ? "info" : "muted"}>
                                      {`${readyCount}/${AD_KEYS.length} vídeos`}
                                    </StatusPill>
                                  </div>

                                  <div className="templatesMediaRows">
                                    {rows.map((r) => {
                                      const filename = r.entry?.originalName || (r.entry?.creativeAssetId ? "Asset selecionado" : "—");
                                      return (
                                        <div key={r.adKey} className="templatesMediaRow">
                                          <div className="templatesMediaRowTitle">{`Ad ${r.adKey}`}</div>
                                          <div>
                                            {r.isVideo && r.previewUrl ? (
                                              <CompactVideoPreview src={r.previewUrl} label={`${cc} Ad ${r.adKey}`} size="sm" />
                                            ) : (
                                              <div
                                                className="videoThumb videoThumbSm"
                                                style={{ display: "grid", placeItems: "center", color: "#94a3b8" }}
                                              >
                                                —
                                              </div>
                                            )}
                                          </div>
                                          <div className="templatesMediaFilename" title={filename}>
                                            {filename}
                                          </div>
                                          <StatusPill tone={r.status.tone}>{r.status.label}</StatusPill>
                                          <div style={{ justifySelf: "end" }}>
                                            {r.previewUrl ? (
                                              <button
                                                type="button"
                                                className="templatesLinkButton"
                                                onClick={() => window.open(r.previewUrl, "_blank", "noopener,noreferrer")}
                                              >
                                                Abrir
                                              </button>
                                            ) : (
                                              <div style={{ color: "#6b7280", fontWeight: 850, fontSize: 12 }}>—</div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                              Sem países definidos no template.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="templatesCreativeBlock" style={{ marginTop: 12 }}>
                        <div className="templatesColTitle">Copy + vídeo por país (A–E)</div>
                        <div style={{ color: "#6b7280", fontWeight: 750, fontSize: 12 }}>
                          Mostra o que será usado por país: tradução quando existir (exceto BR); caso contrário, texto base (PT-BR).
                        </div>
                        <AdvancedDisclosure summary="Ver revisão por país (avançado)">
                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                          {countries.length ? (
                            countries.map((code) => {
                              const cc = String(code || "").trim().toUpperCase();
                              const t = translations?.[cc] && typeof translations[cc] === "object" ? translations[cc] : null;
                              const byAd = mediaByCountry?.[cc] && typeof mediaByCountry[cc] === "object" ? mediaByCountry[cc] : {};
                              return (
                                <div key={cc} className="card" style={{ padding: 12 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                    <div style={{ fontWeight: 950 }}>{cc}</div>
                                    <div style={{ color: "#6b7280", fontWeight: 850, fontSize: 12 }}>
                                      fonte: {cc === "BR" ? "base (PT-BR)" : t ? "tradução" : "base"} • vídeos: {Object.keys(byAd || {}).length}/5
                                    </div>
                                  </div>
                                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                                    {AD_KEYS.map((k, idx) => {
                                      const base = adVariants?.[idx] ?? {};
                                      const translatedAds = t?.ads && typeof t.ads === "object" ? t.ads : null;
                                      const translated = translatedAds?.[k] && typeof translatedAds[k] === "object" ? translatedAds[k] : null;
                                      const legacyTranslated = t && !translatedAds ? t : null;
                                      const primaryText =
                                        cc !== "BR" && translated ? translated?.primaryText ?? base.primaryText : legacyTranslated && k === "A" ? legacyTranslated?.primaryText ?? base.primaryText : base.primaryText;
                                      const headline =
                                        cc !== "BR" && translated ? translated?.headline ?? base.headline : legacyTranslated && k === "A" ? legacyTranslated?.headline ?? base.headline : base.headline;
                                      const description =
                                        cc !== "BR" && translated ? translated?.description ?? base.description : legacyTranslated && k === "A" ? legacyTranslated?.description ?? base.description : base.description;
                                      const media = byAd?.[k] ?? null;
                                      const isVideo = media?.mimeType ? String(media.mimeType).startsWith("video/") : false;
                                      const previewUrl = media?.url ? `${backendBase}${media.url}` : null;
                                      return (
                                        <div key={k} className="card" style={{ padding: 12 }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                            <div style={{ fontWeight: 950 }}>{`Ad ${k}`}</div>
                                            <div style={{ color: "#6b7280", fontWeight: 850, fontSize: 12 }}>
                                              vídeo: {media?.creativeAssetId ? "definido" : "faltando"}
                                            </div>
                                          </div>
                                          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                                            <div style={{ display: "grid", gap: 4 }}>
                                              <div style={{ color: "#6b7280", fontWeight: 900, fontSize: 12 }}>primaryText</div>
                                              <div style={{ fontWeight: 800, fontSize: 12, color: "#111827" }}>
                                                {normalizeNonEmptyString(String(primaryText)) ? String(primaryText).slice(0, 140) : "—"}
                                              </div>
                                            </div>
                                            <div style={{ display: "grid", gap: 4 }}>
                                              <div style={{ color: "#6b7280", fontWeight: 900, fontSize: 12 }}>headline</div>
                                              <div style={{ fontWeight: 800, fontSize: 12, color: "#111827" }}>
                                                {normalizeNonEmptyString(String(headline)) ? String(headline).slice(0, 120) : "—"}
                                              </div>
                                            </div>
                                            <div style={{ display: "grid", gap: 4 }}>
                                              <div style={{ color: "#6b7280", fontWeight: 900, fontSize: 12 }}>description</div>
                                              <div style={{ fontWeight: 800, fontSize: 12, color: "#111827" }}>
                                                {normalizeNonEmptyString(String(description)) ? String(description).slice(0, 120) : "—"}
                                              </div>
                                            </div>
                                            {isVideo && previewUrl ? (
                                              <video
                                                src={previewUrl}
                                                controls
                                                className="videoPreview videoPreviewSm"
                                                style={{
                                                  maxWidth: 520,
                                                }}
                                              />
                                            ) : (
                                              <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
                                                {media?.creativeAssetId ? `Tipo: ${media?.mimeType || "desconhecido"}` : "—"}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                              Sem países definidos no template.
                            </div>
                          )}
                        </div>
                        </AdvancedDisclosure>
                      </div>

                      <div className="templatesTranslationsBar">
                        <div>
                          <div className="templatesTranslationsTitle">Traduções</div>
                          <div className="templatesTranslationsHint">Gere via LibreTranslate e revise/edite por país antes de usar no lote.</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="templatesBtnAction templatesBtnActionFilled"
                            disabled={busy}
                            onClick={onGenerateTranslationsSelected}
                          >
                            Gerar traduções
                          </button>
                          <button
                            type="button"
                            className="templatesBtnAction"
                            disabled={busy}
                            onClick={() => {
                              setShowTranslationsEditor((v) => !v);
                              setTranslationsDraftByCountry(getTranslationsByCountryFromPayload(payload));
                            }}
                          >
                            {showTranslationsEditor ? "Ocultar revisão" : "Revisar traduções"}
                          </button>
                        </div>
                      </div>

                      {showTranslationsEditor ? (
                        <div style={{ padding: 18, display: "grid", gap: 12 }}>
                            {countries.length ? (
                              countries.filter((code) => String(code || "").trim().toUpperCase() !== "BR").map((code) => {
                                const c = String(code || "").toUpperCase();
                                const lang = profileCountryLanguageByCode?.[c] ?? null;
                                const item =
                                  translationsDraftByCountry?.[c] && typeof translationsDraftByCountry[c] === "object"
                                    ? translationsDraftByCountry[c]
                                    : null;
                                const existingAds = item?.ads && typeof item.ads === "object" ? item.ads : null;
                                const legacyAds = !existingAds
                                  ? {
                                      A: {
                                        primaryText: item?.primaryText ?? "",
                                        headline: item?.headline ?? "",
                                        description: item?.description ?? "",
                                      },
                                    }
                                  : null;
                                const ads = existingAds || legacyAds || {};
                                return (
                                  <div key={c} className="templatesCard" style={{ padding: 16 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                      <div style={{ fontWeight: 950 }}>{c}</div>
                                      <div className="muted" style={{ fontWeight: 900, fontSize: 12 }}>
                                        idioma: {lang || "— (defina no Perfil)"}
                                      </div>
                                    </div>

                                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                                        {AD_KEYS.map((k) => {
                                          const ad = ads?.[k] && typeof ads[k] === "object" ? ads[k] : {};
                                          return (
                                            <div key={k} className="card" style={{ padding: 12 }}>
                                              <div style={{ fontWeight: 950, marginBottom: 10 }}>{`Ad ${k}`}</div>
                                              <div style={{ display: "grid", gap: 10 }}>
                                                <Field label="Texto principal">
                                                  <TextAreaLike
                                                    value={ad?.primaryText ?? ""}
                                                    onChange={(e) =>
                                                      setTranslationsDraftByCountry((p) => {
                                                        const base = p && typeof p === "object" ? p : {};
                                                        const prev = base?.[c] && typeof base[c] === "object" ? base[c] : item ?? {};
                                                        const prevAds = prev?.ads && typeof prev.ads === "object" ? prev.ads : ads;
                                                        const nextAds = { ...(prevAds || {}) };
                                                        const prevAd = nextAds[k] && typeof nextAds[k] === "object" ? nextAds[k] : {};
                                                        nextAds[k] = { ...prevAd, primaryText: e.target.value };
                                                        return {
                                                          ...base,
                                                          [c]: { ...(prev || {}), language: prev?.language || lang, ads: nextAds },
                                                        };
                                                      })
                                                    }
                                                    rows={3}
                                                    placeholder="Tradução do texto principal…"
                                                  />
                                                </Field>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                                  <Field label="Título">
                                                    <InputLike
                                                      value={ad?.headline ?? ""}
                                                      onChange={(e) =>
                                                        setTranslationsDraftByCountry((p) => {
                                                          const base = p && typeof p === "object" ? p : {};
                                                          const prev = base?.[c] && typeof base[c] === "object" ? base[c] : item ?? {};
                                                          const prevAds = prev?.ads && typeof prev.ads === "object" ? prev.ads : ads;
                                                          const nextAds = { ...(prevAds || {}) };
                                                          const prevAd = nextAds[k] && typeof nextAds[k] === "object" ? nextAds[k] : {};
                                                          nextAds[k] = { ...prevAd, headline: e.target.value };
                                                          return {
                                                            ...base,
                                                            [c]: { ...(prev || {}), language: prev?.language || lang, ads: nextAds },
                                                          };
                                                        })
                                                      }
                                                      placeholder="Tradução do título…"
                                                    />
                                                  </Field>
                                                  <Field label="Descrição">
                                                    <InputLike
                                                      value={ad?.description ?? ""}
                                                      onChange={(e) =>
                                                        setTranslationsDraftByCountry((p) => {
                                                          const base = p && typeof p === "object" ? p : {};
                                                          const prev = base?.[c] && typeof base[c] === "object" ? base[c] : item ?? {};
                                                          const prevAds = prev?.ads && typeof prev.ads === "object" ? prev.ads : ads;
                                                          const nextAds = { ...(prevAds || {}) };
                                                          const prevAd = nextAds[k] && typeof nextAds[k] === "object" ? nextAds[k] : {};
                                                          nextAds[k] = { ...prevAd, description: e.target.value };
                                                          return {
                                                            ...base,
                                                            [c]: { ...(prev || {}), language: prev?.language || lang, ads: nextAds },
                                                          };
                                                        })
                                                      }
                                                      placeholder="Tradução da descrição…"
                                                    />
                                                  </Field>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                                Dica: edite os países do template para habilitar revisão por país.
                              </div>
                            )}

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="templatesBtnPrimary"
                                disabled={busy}
                                onClick={() => onSaveTranslationsSelected({ markReviewed: false })}
                              >
                                Salvar traduções
                              </button>
                              <button
                                type="button"
                                className="templatesBtnOutline"
                                disabled={busy}
                                onClick={() => onSaveTranslationsSelected({ markReviewed: true })}
                              >
                                Marcar como revisado
                              </button>
                            </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
