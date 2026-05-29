import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const STORAGE_LAST_EXECUTION_KEY = "campaignFlow:lastExecution:v1";
const TAB_CREATE = "create";
const TAB_MINE = "mine";
const AD_KEYS = ["A", "B", "C", "D", "E"];

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
  const [profileMetaAdAccountId, setProfileMetaAdAccountId] = useState("");
  const [profileMetaPageId, setProfileMetaPageId] = useState("");

  const [editingTranslationsByCountry, setEditingTranslationsByCountry] = useState({});
  const [translationsDraftByCountry, setTranslationsDraftByCountry] = useState({});
  const [showTranslationsEditor, setShowTranslationsEditor] = useState(false);

  const [creativeAssets, setCreativeAssets] = useState([]);
  const [openAdKey, setOpenAdKey] = useState("A");

  const [form, setForm] = useState({
    name: "",
    objective: "OUTCOME_TRAFFIC",
    countryCodes: "BR",
    dailyBudgetCents: 1000,
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
        setProfileMetaAdAccountId(res?.user?.metaAdAccountId ?? "");
        setProfileMetaPageId(res?.user?.metaPageId ?? "");
      })
      .catch(() => {
        if (!alive) return;
        setProfileCountryCodes([]);
        setProfileCountryLanguageByCode({});
        setProfileMetaAdAccountId("");
        setProfileMetaPageId("");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    const res = await listFlowTemplates({ limit: 200 });
    setTemplates(res.flowTemplates ?? []);
  }

  function resetForm({ useProfileCountries = false } = {}) {
    setEditingId("");
    setEditingTranslationsByCountry({});
    setForm({
      name: "",
      objective: "OUTCOME_TRAFFIC",
      countryCodes: useProfileCountries && profileCountryCodes.length ? profileCountryCodes.join(",") : "BR",
      dailyBudgetCents: 1000,
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
    setEditingId(String(tpl?.id || ""));
    setEditingTranslationsByCountry(getTranslationsByCountryFromPayload(payload));
    setForm({
      name: tpl?.name ?? "",
      objective: payload.objective ?? "OUTCOME_TRAFFIC",
      countryCodes: Array.isArray(payload.countryCodes) ? payload.countryCodes.join(",") : "BR",
      dailyBudgetCents: payload.dailyBudgetCents ?? 1000,
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
      setError("Destination URL é obrigatório (para Creative REAL).");
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
    const base = {
      campaign: {
        name: tpl.name ?? "",
        metaAdAccountId: normalizeNonEmptyString(profileMetaAdAccountId) || "",
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
        pageId: normalizeNonEmptyString(profileMetaPageId) || "",
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
      subtitle="Crie templates operacionais, gere traduções e aplique no /campaign-flow (REAL sempre PAUSED)."
      align="left"
      backFallbackTo="/"
      headerRight={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="templatesRouteChip" onClick={() => navigate("/campaign-flow")}>
            /campaign-flow
          </button>
          <button type="button" className="templatesRouteChip" onClick={() => navigate("/meta-test")}>
            /meta-test
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
                  <Field label="Objetivo">
                    <SelectLike
                      value={form.objective}
                      onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))}
                      options={[
                        { value: "OUTCOME_TRAFFIC", label: "OUTCOME_TRAFFIC" },
                        { value: "OUTCOME_LEADS", label: "OUTCOME_LEADS" },
                        { value: "OUTCOME_SALES", label: "OUTCOME_SALES" },
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
                        Dica: idiomas por país são configurados em `/profile`.
                      </div>
                    ) : null}
                  </Field>
                </div>
              </div>

              <div className="templatesCard" style={{ paddingBottom: 16 }}>
                <div className="templatesCardLabel" style={{ marginBottom: 12 }}>
                  AdSet
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <Field label="Orçamento diário (centavos)">
                    <InputLike
                      type="number"
                      value={String(form.dailyBudgetCents)}
                      onChange={(e) => setForm((p) => ({ ...p, dailyBudgetCents: Number(e.target.value || 0) }))}
                      placeholder="1000"
                    />
                  </Field>
                  <Field label="Billing event">
                    <SelectLike
                      value={form.billingEvent}
                      onChange={(e) => setForm((p) => ({ ...p, billingEvent: e.target.value }))}
                      options={[
                        { value: "IMPRESSIONS", label: "IMPRESSIONS" },
                        { value: "LINK_CLICKS", label: "LINK_CLICKS" },
                      ]}
                    />
                  </Field>
                  <Field label="Optimization goal">
                    <SelectLike
                      value={form.optimizationGoal}
                      onChange={(e) => setForm((p) => ({ ...p, optimizationGoal: e.target.value }))}
                      options={[
                        { value: "LINK_CLICKS", label: "LINK_CLICKS" },
                        { value: "OFFSITE_CONVERSIONS", label: "OFFSITE_CONVERSIONS" },
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
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {AD_KEYS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={openAdKey === k ? "templatesBtnPrimary" : "templatesBtnOutline"}
                        disabled={busy}
                        onClick={() => setOpenAdKey(k)}
                        style={{ padding: "8px 12px" }}
                      >
                        {`Ad ${k}`}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, borderTop: "1px solid #eef2f7", paddingTop: 12 }}>
                    {(() => {
                      const idx = AD_KEYS.indexOf(String(openAdKey || "A"));
                      const currentIdx = idx >= 0 ? idx : 0;
                      const item =
                        Array.isArray(form.adVariants) && form.adVariants[currentIdx] && typeof form.adVariants[currentIdx] === "object"
                          ? form.adVariants[currentIdx]
                          : {};
                      const key = AD_KEYS[currentIdx] ?? "A";
                      return (
                        <div style={{ display: "grid", gap: 10 }}>
                          <TextAreaLike
                            value={item.primaryText ?? ""}
                            onChange={(e) =>
                              setForm((p) => {
                                const next = Array.isArray(p.adVariants)
                                  ? [...p.adVariants]
                                  : AD_KEYS.map((k) => ({ key: k, primaryText: "", headline: "", description: "" }));
                                while (next.length < AD_KEYS.length) next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
                                const cur = next[currentIdx] && typeof next[currentIdx] === "object" ? next[currentIdx] : {};
                                next[currentIdx] = { ...cur, key, primaryText: e.target.value };
                                return { ...p, adVariants: next };
                              })
                            }
                            placeholder="Texto principal"
                            rows={3}
                          />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <InputLike
                              value={item.headline ?? ""}
                              onChange={(e) =>
                                setForm((p) => {
                                  const next = Array.isArray(p.adVariants)
                                    ? [...p.adVariants]
                                    : AD_KEYS.map((k) => ({ key: k, primaryText: "", headline: "", description: "" }));
                                  while (next.length < AD_KEYS.length) next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
                                  const cur = next[currentIdx] && typeof next[currentIdx] === "object" ? next[currentIdx] : {};
                                  next[currentIdx] = { ...cur, key, headline: e.target.value };
                                  return { ...p, adVariants: next };
                                })
                              }
                              placeholder="Headline"
                            />
                            <InputLike
                              value={item.description ?? ""}
                              onChange={(e) =>
                                setForm((p) => {
                                  const next = Array.isArray(p.adVariants)
                                    ? [...p.adVariants]
                                    : AD_KEYS.map((k) => ({ key: k, primaryText: "", headline: "", description: "" }));
                                  while (next.length < AD_KEYS.length) next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
                                  const cur = next[currentIdx] && typeof next[currentIdx] === "object" ? next[currentIdx] : {};
                                  next[currentIdx] = { ...cur, key, description: e.target.value };
                                  return { ...p, adVariants: next };
                                })
                              }
                              placeholder="Description"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </Field>

                <Field label="Destination URL" hint="Obrigatório para Creative REAL.">
                  <InputLike
                    value={form.destinationUrl}
                    onChange={(e) => setForm((p) => ({ ...p, destinationUrl: e.target.value }))}
                    placeholder="https://example.com/?utm_source=template"
                  />
                </Field>
                <Field label="CTA type">
                  <SelectLike
                    value={form.ctaType}
                    onChange={(e) => setForm((p) => ({ ...p, ctaType: e.target.value }))}
                    options={[
                      { value: "LEARN_MORE", label: "LEARN_MORE" },
                      { value: "SHOP_NOW", label: "SHOP_NOW" },
                      { value: "SIGN_UP", label: "SIGN_UP" },
                    ]}
                  />
                </Field>

                <Field
                  label="Vídeos por país (A–E)"
                  hint="Upload/seleção de vídeo por país e por anúncio (A–E). Reaproveita `creative_assets`."
                >
                  <div style={{ display: "grid", gap: 10 }}>
                      {uniqueCountryCodes(form.countryCodes).length ? (
                        uniqueCountryCodes(form.countryCodes).map((code) => {
                          const cc = String(code || "").trim().toUpperCase();
                          const byAd = form?.mediaByCountry?.[cc] && typeof form.mediaByCountry[cc] === "object" ? form.mediaByCountry[cc] : {};
                          return (
                            <div key={cc} className="card" style={{ padding: 12 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                <div style={{ fontWeight: 950 }}>{cc}</div>
                                <div style={{ color: "#6b7280", fontWeight: 850, fontSize: 12 }}>5 vídeos (A–E)</div>
                              </div>
                              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                                {AD_KEYS.map((k) => {
                                  const entry = byAd?.[k] ?? null;
                                  const isVideo = entry?.mimeType ? String(entry.mimeType).startsWith("video/") : false;
                                  const previewUrl = entry?.url ? `${getBackendBaseUrl()}${entry.url}` : null;
                                  return (
                                    <div key={k} className="card" style={{ padding: 12 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                        <div style={{ fontWeight: 950 }}>{`Ad ${k}`}</div>
                                        <div style={{ color: "#6b7280", fontWeight: 850, fontSize: 12 }}>
                                          {entry?.originalName ? entry.originalName : entry?.creativeAssetId ? "Asset selecionado" : "Sem vídeo"}
                                        </div>
                                      </div>
                                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                          <input
                                            type="file"
                                            accept="video/*"
                                            disabled={busy}
                                            onChange={(e) => onUploadMediaForCountryAd(cc, k, e.target.files?.[0] ?? null)}
                                          />
                                          <select
                                            className="templatesSelect"
                                            style={{ height: 40, minWidth: 260 }}
                                            disabled={busy}
                                            value=""
                                            onChange={(e) => {
                                              const id = e.target.value;
                                              if (!id) return;
                                              onSelectExistingMediaForCountryAd(cc, k, id);
                                            }}
                                          >
                                            <option value="" disabled>
                                              Selecionar asset existente…
                                            </option>
                                            {(creativeAssets || []).map((a) => (
                                              <option key={a.id} value={String(a.id)}>
                                                {a?.original_name
                                                  ? `${a.original_name} (${String(a.id).slice(0, 8)})`
                                                  : String(a.id).slice(0, 12)}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            type="button"
                                            className="templatesBtnOutline"
                                            disabled={busy || !entry?.creativeAssetId}
                                            onClick={() => onRemoveMediaForCountryAd(cc, k)}
                                          >
                                            Remover
                                          </button>
                                        </div>
                                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                          <div style={{ fontWeight: 900, fontSize: 12, color: "#374151" }}>Thumbnail</div>
                                          <button
                                            type="button"
                                            className="templatesBtnOutline"
                                            disabled={busy || !entry?.creativeAssetId || Boolean(entry?.thumbnail?.creativeAssetId)}
                                            onClick={() => onAutoGenerateThumbnailForCountryAd(cc, k, entry?.creativeAssetId)}
                                          >
                                            Gerar automaticamente
                                          </button>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            disabled={busy}
                                            onChange={(e) => onUploadThumbnailForCountryAd(cc, k, e.target.files?.[0] ?? null)}
                                          />
                                          <select
                                            className="templatesSelect"
                                            style={{ height: 40, minWidth: 260 }}
                                            disabled={busy}
                                            value=""
                                            onChange={(e) => {
                                              const id = e.target.value;
                                              if (!id) return;
                                              onSelectExistingThumbnailForCountryAd(cc, k, id);
                                            }}
                                          >
                                            <option value="" disabled>
                                              Selecionar thumbnail existente…
                                            </option>
                                            {(creativeAssets || []).map((a) => (
                                              <option key={a.id} value={String(a.id)}>
                                                {a?.original_name
                                                  ? `${a.original_name} (${String(a.id).slice(0, 8)})`
                                                  : String(a.id).slice(0, 12)}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            type="button"
                                            className="templatesBtnOutline"
                                            disabled={busy || !entry?.thumbnail?.creativeAssetId}
                                            onClick={() => onRemoveThumbnailForCountryAd(cc, k)}
                                          >
                                            Remover thumbnail
                                          </button>
                                        </div>
                                        {entry?.thumbnail?.mimeType?.startsWith("image/") && entry?.thumbnail?.url ? (
                                          <img
                                            src={`${getBackendBaseUrl()}${entry.thumbnail.url}`}
                                            alt={`Thumbnail ${cc} Ad ${k}`}
                                            style={{
                                              width: "100%",
                                              maxWidth: 520,
                                              borderRadius: 12,
                                              border: "1px solid #e5e7eb",
                                              display: "block",
                                            }}
                                          />
                                        ) : entry?.thumbnail?.creativeAssetId ? (
                                          <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
                                            Thumbnail: {entry?.thumbnail?.mimeType || "desconhecido"}
                                          </div>
                                        ) : null}
                                        {isVideo && previewUrl ? (
                                          <video
                                            src={previewUrl}
                                            controls
                                            style={{
                                              width: "100%",
                                              maxWidth: 520,
                                              borderRadius: 12,
                                              border: "1px solid #e5e7eb",
                                              display: "block",
                                            }}
                                          />
                                        ) : entry?.creativeAssetId ? (
                                          <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
                                            Tipo: {entry?.mimeType || "desconhecido"}
                                          </div>
                                        ) : null}
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
                          Defina países para adicionar mídias.
                        </div>
                      )}
                  </div>
                </Field>
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
                        <div>{countries.length ? `${countries.length} país(es)` : "Sem países"}</div>
                        <div>{`${adCount} ad(s)`}</div>
                        <div className={`templatesStatusTag ${tagTone}`}>{status.label}</div>
                        <div className={`templatesStatusTag ${mediaTone}`}>{mediaStatus.label}</div>
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
                  const countries = uniqueCountryCodes(payload.countryCodes);
                  const status = computeTranslationsStatus(payload);
                  const mediaStatus = computeMediaStatus(payload);
                  const translations = getTranslationsByCountryFromPayload(payload);
                  const translationCount = Object.keys(translations || {}).length;
                  const mediaByCountry = normalizeMediaByCountry(getMediaByCountryFromPayload(payload));
                  const backendBase = getBackendBaseUrl();
                  const adCount = computeAdCount(payload);
                  const primaryPreview = normalizeNonEmptyString(payload.primaryText)
                    ? `${String(payload.primaryText).slice(0, 70)}${String(payload.primaryText).length > 70 ? "…" : ""}`
                    : "—";
                  const adVariants = getAdVariantsFromPayload(payload);
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
                            Usar no /campaign-flow
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
                          <div className="templatesColTitle">Campaign</div>
                          <div className="templatesKv">
                            <div className="templatesK">objective</div>
                            <div className="templatesV">{payload.objective ?? "—"}</div>
                          </div>
                        </div>
                        <div className="templatesDetailCol templatesDetailColAlt">
                          <div className="templatesColTitle">AdSet</div>
                          <div className="templatesKv">
                            <div className="templatesK">dailyBudgetCents</div>
                            <div className="templatesV">{payload.dailyBudgetCents ?? "—"}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">billingEvent</div>
                            <div className="templatesV">{payload.billingEvent ?? "—"}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">optimizationGoal</div>
                            <div className="templatesV">{payload.optimizationGoal ?? "—"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="templatesCreativeBlock">
                        <div className="templatesColTitle">Creative</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                          <div className="templatesKv">
                            <div className="templatesK">primaryText</div>
                            <div className="templatesV">{primaryPreview}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">headline</div>
                            <div className="templatesV">{payload.headline || "—"}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">description</div>
                            <div className="templatesV">{payload.description || "—"}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">destinationUrl</div>
                            <div className="templatesV">{normalizeNonEmptyString(payload.destinationUrl) ? String(payload.destinationUrl) : "—"}</div>
                          </div>
                          <div className="templatesKv">
                            <div className="templatesK">ctaType</div>
                            <div className="templatesV">{payload.ctaType ?? "—"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="templatesCreativeBlock" style={{ marginTop: 12 }}>
                        <div className="templatesColTitle">Vídeos por país (A–E)</div>
                        <div style={{ color: "#6b7280", fontWeight: 750, fontSize: 12 }}>
                          Cada país deve ter 5 vídeos (A–E) vinculados via `creative_assets`.
                        </div>
                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                          {countries.length ? (
                            countries.map((code) => {
                              const cc = String(code || "").trim().toUpperCase();
                              const byAd = mediaByCountry?.[cc] && typeof mediaByCountry[cc] === "object" ? mediaByCountry[cc] : {};
                              return (
                                <div key={cc} className="card" style={{ padding: 12 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                    <div style={{ fontWeight: 950 }}>{cc}</div>
                                    <div style={{ color: "#6b7280", fontWeight: 850, fontSize: 12 }}>Ads A–E</div>
                                  </div>
                                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                                    {AD_KEYS.map((k) => {
                                      const entry = byAd?.[k] ?? null;
                                      const isVideo = entry?.mimeType ? String(entry.mimeType).startsWith("video/") : false;
                                      const previewUrl = entry?.url ? `${backendBase}${entry.url}` : null;
                                      return (
                                        <div key={k} className="card" style={{ padding: 12 }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                            <div style={{ fontWeight: 950 }}>{`Ad ${k}`}</div>
                                            <div style={{ color: "#6b7280", fontWeight: 850, fontSize: 12 }}>
                                              {entry?.originalName ? entry.originalName : entry?.creativeAssetId ? "Asset selecionado" : "Sem vídeo"}
                                            </div>
                                          </div>
                                          {isVideo && previewUrl ? (
                                            <div style={{ marginTop: 10 }}>
                                              <video
                                                src={previewUrl}
                                                controls
                                                style={{
                                                  width: "100%",
                                                  maxWidth: 520,
                                                  borderRadius: 12,
                                                  border: "1px solid #e5e7eb",
                                                  display: "block",
                                                }}
                                              />
                                            </div>
                                          ) : (
                                            <div style={{ marginTop: 10, color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
                                              {entry?.creativeAssetId ? `Tipo: ${entry?.mimeType || "desconhecido"}` : "—"}
                                            </div>
                                          )}
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
                                                style={{
                                                  width: "100%",
                                                  maxWidth: 520,
                                                  borderRadius: 12,
                                                  border: "1px solid #e5e7eb",
                                                  display: "block",
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
                                        idioma: {lang || "— (defina no /profile)"}
                                      </div>
                                    </div>

                                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                                        {AD_KEYS.map((k) => {
                                          const ad = ads?.[k] && typeof ads[k] === "object" ? ads[k] : {};
                                          return (
                                            <div key={k} className="card" style={{ padding: 12 }}>
                                              <div style={{ fontWeight: 950, marginBottom: 10 }}>{`Ad ${k}`}</div>
                                              <div style={{ display: "grid", gap: 10 }}>
                                                <Field label="primary text">
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
                                                    placeholder="Tradução do primaryText"
                                                  />
                                                </Field>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                                  <Field label="headline">
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
                                                      placeholder="Tradução do headline"
                                                    />
                                                  </Field>
                                                  <Field label="description">
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
                                                      placeholder="Tradução do description"
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
