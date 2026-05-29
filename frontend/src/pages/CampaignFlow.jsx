import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCountries } from "../services/reference.js";
import { getAuthMe } from "../services/auth.js";
import { getBackendBaseUrl, HttpError } from "../services/http.js";
import { generateCreativeAssetThumbnail } from "../services/creativeAssets.js";
import { createMetaCampaignSimple } from "../services/metaCampaigns.js";
import { createMetaAdSet } from "../services/metaAdSets.js";
import { createCreativeDraft } from "../services/creativeDrafts.js";
import { publishMetaCreativeDraft } from "../services/metaCreatives.js";
import { createMetaAd } from "../services/metaAds.js";
import { listCountryTemplates } from "../services/countryTemplates.js";
import {
  createCampaignTemplateFromGenerated,
  listCampaignTemplates,
} from "../services/campaignTemplates.js";
import { listCreativeTemplates } from "../services/creativeTemplates.js";

const DEFAULTS = {
  campaign: {
    name: "",
    metaAdAccountId: "",
    objective: "OUTCOME_TRAFFIC",
    countryCode: "BR",
    mode: "REAL",
  },
  adSet: {
    name: "AdSet • BR",
    dailyBudgetCents: 1000,
    billingEvent: "IMPRESSIONS",
    optimizationGoal: "LINK_CLICKS",
  },
  creative: {
    destinationUrl: "",
    ctaType: "LEARN_MORE",
    adVariants: ["A", "B", "C", "D", "E"].map((key) => ({ key, primaryText: "", headline: "", description: "" })),
    mediaByCountry: {},
    pageId: "",
    instagramActorId: "",
  },
  ad: {
    name: "Ad • BR — 1",
  },
};

const STORAGE_LAST_EXECUTION_KEY = "campaignFlow:lastExecution:v1";
const STORAGE_PRESETS_KEY = "campaignFlow:quickPresets:v1";
const AD_KEYS = ["A", "B", "C", "D", "E"];

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeCountrySuffixName(base, countryCode, { fallbackPrefix } = {}) {
  const cc = String(countryCode || "").trim().toUpperCase();
  const raw = typeof base === "string" ? base.trim() : "";
  const cleaned = raw || (fallbackPrefix ? `${fallbackPrefix}` : "");
  const withoutSuffix = cleaned.replace(/\s*•\s*[A-Z]{2}\s*$/, "").trim();
  return `${withoutSuffix} • ${cc}`.trim();
}

function normalizeCampaignNameForCountry(baseName, countryCode) {
  const cc = String(countryCode || "").trim().toUpperCase();
  const name = typeof baseName === "string" ? baseName.trim() : "";
  if (!name) return `Campaign • ${cc}`;
  if (new RegExp(`\\b${cc}\\b`).test(name)) return name;
  return `${name} • ${cc}`.trim();
}

function safeJsonParse(raw) {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractMetaErrorDetails(err) {
  if (!(err instanceof HttpError)) return null;
  const body = err?.body && typeof err.body === "object" ? err.body : null;
  const details = body?.error?.details && typeof body.error.details === "object" ? body.error.details : null;
  if (!details) return null;
  const title = typeof details.error_user_title === "string" ? details.error_user_title : null;
  const msg = typeof details.error_user_msg === "string" ? details.error_user_msg : null;
  const subcode = typeof details.error_subcode === "number" ? details.error_subcode : null;
  const fbtraceId = typeof details.fbtrace_id === "string" ? details.fbtrace_id : null;
  const code = typeof details.code === "number" ? details.code : null;
  return { title, msg, subcode, fbtraceId, code };
}

function formatMetaErrorSuffix(err) {
  const meta = extractMetaErrorDetails(err);
  if (!meta) return "";
  const parts = [];
  if (meta.title) parts.push(meta.title);
  if (meta.msg) parts.push(meta.msg);
  const tags = [];
  if (meta.code != null) tags.push(`code:${meta.code}`);
  if (meta.subcode != null) tags.push(`subcode:${meta.subcode}`);
  if (meta.fbtraceId) tags.push(`fbtrace_id:${meta.fbtraceId}`);
  const head = parts.filter(Boolean).join(" — ");
  const tail = tags.length ? ` (${tags.join(", ")})` : "";
  return head ? `\nMeta: ${head}${tail}` : tags.length ? `\nMeta: ${tags.join(", ")}` : "";
}

function StepPill({ active, label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 30,
        padding: "0 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "#111827" : "#e5e7eb"}`,
        background: active ? "#111827" : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        fontWeight: 800,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 800, color: "#374151", fontSize: 14 }}>
          {label} {required ? <span aria-hidden="true">*</span> : null}
        </div>
        {hint ? <div style={{ color: "#6b7280", fontWeight: 700, fontSize: 12 }}>{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

function InputLike({ placeholder, value, onChange, disabled, type = "text" }) {
  return (
    <input
      type={type}
      disabled={disabled}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        height: 48,
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        padding: "0 16px",
        fontSize: 14,
        fontWeight: 650,
        outline: "none",
        background: disabled ? "#f3f4f6" : "#ffffff",
      }}
    />
  );
}

function TextAreaLike({ placeholder, value, onChange, disabled, rows = 4 }) {
  return (
    <textarea
      disabled={disabled}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        padding: "12px 16px",
        fontSize: 14,
        fontWeight: 650,
        outline: "none",
        background: disabled ? "#f3f4f6" : "#ffffff",
        resize: "vertical",
      }}
    />
  );
}

function SelectLike({ value, onChange, disabled, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        height: 48,
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        padding: "0 16px",
        fontSize: 14,
        fontWeight: 800,
        color: disabled ? "#9ca3af" : "#111827",
        background: disabled ? "#f3f4f6" : "#ffffff",
      }}
      disabled={disabled}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 13 }}>{label}</div>
      <div style={{ color: "#111827", fontWeight: 900, fontSize: 13, textAlign: "right" }}>{value}</div>
    </div>
  );
}

function mediaRejectionReasons(media) {
  const m = media && typeof media === "object" ? media : null;
  if (!m) return ["asset não encontrado"];
  const reasons = [];
  if (m.status !== "ok") reasons.push("vídeo ausente");
  if (m.kind !== "video") reasons.push("asset inválido (mimeType não é vídeo)");
  if (m.kind === "video" && !m.thumbnailOk) reasons.push("thumbnail ausente");
  return reasons.length ? reasons : ["mídia inválida"];
}

function formatMediaRejection(media) {
  return mediaRejectionReasons(media).join("; ");
}

export default function CampaignFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [countries, setCountries] = useState([]);
  const [operationalCountryCodes, setOperationalCountryCodes] = useState([]);
  const [countryLanguageByCode, setCountryLanguageByCode] = useState({});
  const [profileMetaAdAccountId, setProfileMetaAdAccountId] = useState("");
  const [profileMetaPageId, setProfileMetaPageId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [realConfirm, setRealConfirm] = useState(false);
  const [batchEnabled, setBatchEnabled] = useState(false);
  const [selectedCountryCodes, setSelectedCountryCodes] = useState(["BR"]);
  const [progress, setProgress] = useState(null);

  const [campaign, setCampaign] = useState(DEFAULTS.campaign);
  const [adSet, setAdSet] = useState(DEFAULTS.adSet);
  const [creative, setCreative] = useState(DEFAULTS.creative);
  const [ad, setAd] = useState(DEFAULTS.ad);

  const [result, setResult] = useState(null);

  const [countryTemplates, setCountryTemplates] = useState([]);
  const [campaignTemplates, setCampaignTemplates] = useState([]);
  const [creativeTemplates, setCreativeTemplates] = useState([]);
  const [templatesInfo, setTemplatesInfo] = useState("");
  const [selectedCountryTemplateId, setSelectedCountryTemplateId] = useState("");
  const [selectedCampaignTemplateId, setSelectedCampaignTemplateId] = useState("");
  const [selectedCreativeTemplateId, setSelectedCreativeTemplateId] = useState("");
  const [lastExecution, setLastExecution] = useState(null);
  const [quickPresets, setQuickPresets] = useState([]);
  const [selectedQuickPresetId, setSelectedQuickPresetId] = useState("");
  const [autoApplied, setAutoApplied] = useState(false);

  useEffect(() => {
    let alive = true;
    getCountries()
      .then((res) => {
        if (!alive) return;
        setCountries(Array.isArray(res?.countries) ? res.countries : []);
      })
      .catch(() => {
        if (!alive) return;
        setCountries([]);
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
        setOperationalCountryCodes(codes.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean));
        const list = Array.isArray(res?.user?.operationalCountries) ? res.user.operationalCountries : [];
        setCountryLanguageByCode(
          Object.fromEntries(
            list
              .filter((i) => i?.countryCode)
              .map((i) => [String(i.countryCode).toUpperCase(), i.primaryLanguage ?? null])
          )
        );
        setProfileMetaAdAccountId(res?.user?.metaAdAccountId ?? "");
        setProfileMetaPageId(res?.user?.metaPageId ?? "");

        const metaAdAccountId = normalizeNonEmptyString(res?.user?.metaAdAccountId);
        if (metaAdAccountId) {
          setCampaign((p) => (normalizeNonEmptyString(p.metaAdAccountId) ? p : { ...p, metaAdAccountId }));
        }
        const pageId = normalizeNonEmptyString(res?.user?.metaPageId);
        if (pageId) {
          setCreative((p) => (normalizeNonEmptyString(p.pageId) ? p : { ...p, pageId }));
        }
      })
      .catch(() => {
        if (!alive) return;
        setOperationalCountryCodes([]);
        setCountryLanguageByCode({});
        setProfileMetaAdAccountId("");
        setProfileMetaPageId("");
      });
    return () => {
      alive = false;
    };
  }, []);

  const operationalCountriesMissing = batchEnabled && operationalCountryCodes.length === 0;
  const countryLanguagesMissing = batchEnabled && operationalCountryCodes.length > 0 && Object.keys(countryLanguageByCode || {}).length === 0;

  useEffect(() => {
    const last = safeJsonParse(localStorage.getItem(STORAGE_LAST_EXECUTION_KEY));
    if (last && typeof last === "object") setLastExecution(last);
    const presets = safeJsonParse(localStorage.getItem(STORAGE_PRESETS_KEY));
    if (Array.isArray(presets)) setQuickPresets(presets);
  }, []);

  useEffect(() => {
    if (autoApplied) return;
    const search = location?.search ? String(location.search) : "";
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const applyLast = params.get("applyLast");
    if (applyLast !== "1") return;
    if (!lastExecution) return;
    applyExecutionSnapshot(lastExecution);
    setAutoApplied(true);
    navigate("/campaign-flow", { replace: true });
  }, [autoApplied, lastExecution, location?.search, navigate]);

  useEffect(() => {
    let alive = true;

    async function loadTemplates() {
      setTemplatesInfo("");
      try {
        const [ct, camp, creativeRes] = await Promise.allSettled([
          listCountryTemplates({ limit: 100 }),
          listCampaignTemplates({ limit: 100 }),
          listCreativeTemplates({ limit: 100 }),
        ]);

        if (!alive) return;

        if (ct.status === "fulfilled") setCountryTemplates(ct.value?.countryTemplates ?? []);
        else setCountryTemplates([]);

        if (camp.status === "fulfilled") setCampaignTemplates(camp.value?.campaignTemplates ?? []);
        else setCampaignTemplates([]);

        if (creativeRes.status === "fulfilled") setCreativeTemplates(creativeRes.value?.creativeTemplates ?? []);
        else setCreativeTemplates([]);

        const anyOk = ct.status === "fulfilled" || camp.status === "fulfilled" || creativeRes.status === "fulfilled";
        if (!anyOk) setTemplatesInfo("Templates indisponíveis agora (DB offline ou sem acesso).");
      } catch {
        if (!alive) return;
        setCountryTemplates([]);
        setCampaignTemplates([]);
        setCreativeTemplates([]);
        setTemplatesInfo("Templates indisponíveis agora (DB offline ou sem acesso).");
      }
    }

    loadTemplates();
    return () => {
      alive = false;
    };
  }, []);

  const countryOptions = useMemo(() => {
    const allowed = operationalCountryCodes.length ? new Set(operationalCountryCodes) : null;
    const opts = (countries || [])
      .filter((c) => (allowed ? allowed.has(c.code) : true))
      .map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));
    if (!opts.find((o) => o.value === "BR") && (!allowed || allowed.has("BR"))) {
      opts.unshift({ value: "BR", label: "BR — Brasil" });
    }
    return [{ value: "", label: "Selecione...", disabled: true }, ...opts];
  }, [countries, operationalCountryCodes]);

  const countryNameByCode = useMemo(() => {
    const pairs = (countries || []).map((c) => [c.code, c.name]);
    if (!pairs.find(([code]) => code === "BR")) pairs.unshift(["BR", "Brasil"]);
    return Object.fromEntries(pairs);
  }, [countries]);

  const canGoNext = useMemo(() => {
    if (submitting) return false;
    if (step === 0) {
      return (
        normalizeNonEmptyString(campaign.name) &&
        normalizeNonEmptyString(campaign.objective) &&
        (batchEnabled ? selectedCountryCodes.length > 0 : normalizeNonEmptyString(campaign.countryCode)) &&
        normalizeNonEmptyString(campaign.mode)
      );
    }
    if (step === 1) {
      return (
        normalizeNonEmptyString(adSet.name) &&
        Number.isFinite(Number(adSet.dailyBudgetCents)) &&
        Number(adSet.dailyBudgetCents) > 0 &&
        normalizeNonEmptyString(adSet.billingEvent) &&
        normalizeNonEmptyString(adSet.optimizationGoal)
      );
    }
    if (step === 2) {
      const variants = getCreativeAdVariants();
      const allHaveText = variants.every((v) => normalizeNonEmptyString(v?.primaryText));
      return (
        allHaveText &&
        normalizeNonEmptyString(creative.destinationUrl) &&
        normalizeNonEmptyString(creative.ctaType)
      );
    }
    if (step === 3) return true;
    return false;
  }, [submitting, step, campaign, adSet, creative]);

  const steps = [
    "1. Campanha",
    "2. AdSet",
    "3. Criativo",
    "4. Revisão",
    "5. Resultado",
  ];

  const progressStageLabel = useMemo(() => {
    const stage = progress?.stage ? String(progress.stage) : "";
    const map = {
      campaign: "Criando Campaign",
      adset: "Criando AdSet",
      creativeDraft: "Criando Creative Draft",
      creativePublish: "Publicando Creative (REAL)",
      ad: "Criando Ad (PAUSED)",
    };
    return map[stage] ?? stage;
  }, [progress]);

  const countryTemplateOptions = useMemo(() => {
    const opts = (countryTemplates || []).map((t) => ({
      value: t.id,
      label: `${t.name ?? "Country Template"} • ${(Array.isArray(t.codes) ? t.codes.length : 0)} países`,
    }));
    return [{ value: "", label: "Nenhum (opcional)", disabled: false }, ...opts];
  }, [countryTemplates]);

  const campaignTemplateOptions = useMemo(() => {
    const opts = (campaignTemplates || []).map((t) => ({
      value: t.id,
      label: t.name ?? "Campaign Template",
    }));
    return [{ value: "", label: "Nenhum (opcional)", disabled: false }, ...opts];
  }, [campaignTemplates]);

  const creativeTemplateOptions = useMemo(() => {
    const opts = (creativeTemplates || []).map((t) => ({
      value: t.id,
      label: t.name ?? "Creative Template",
    }));
    return [{ value: "", label: "Nenhum (opcional)", disabled: false }, ...opts];
  }, [creativeTemplates]);

  function openMetaTest({ generatedCampaignId, countryCode, mode } = {}) {
    const params = new URLSearchParams();
    if (normalizeNonEmptyString(campaign.name)) params.set("name", campaign.name);
    if (normalizeNonEmptyString(creative.destinationUrl)) params.set("destinationUrl", creative.destinationUrl);
    if (normalizeNonEmptyString(generatedCampaignId)) params.set("generatedCampaignId", generatedCampaignId);
    if (normalizeNonEmptyString(countryCode)) params.set("countryCode", String(countryCode).toUpperCase());
    const resolvedMode = normalizeNonEmptyString(mode) || campaign.mode;
    if (normalizeNonEmptyString(resolvedMode)) params.set("mode", resolvedMode);
    navigate(`/meta-test?${params.toString()}`);
  }

  function persistLastExecution(snapshot) {
    try {
      localStorage.setItem(STORAGE_LAST_EXECUTION_KEY, JSON.stringify(snapshot ?? {}));
      setLastExecution(snapshot ?? null);
    } catch {
      // best-effort
    }
  }

  function persistQuickPresets(next) {
    try {
      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(next ?? []));
    } catch {
      // best-effort
    }
    setQuickPresets(next ?? []);
  }

  function applyExecutionSnapshot(snapshot, { nameSuffix } = {}) {
    const snap = snapshot && typeof snapshot === "object" ? snapshot : null;
    if (!snap) return;
    const base = snap.base && typeof snap.base === "object" ? snap.base : {};
    const nextCampaign = base.campaign && typeof base.campaign === "object" ? base.campaign : {};
    const nextAdSet = base.adSet && typeof base.adSet === "object" ? base.adSet : {};
    const nextCreative = base.creative && typeof base.creative === "object" ? base.creative : {};
    const nextAd = base.ad && typeof base.ad === "object" ? base.ad : {};

    setCampaign((p) => ({
      ...p,
      ...nextCampaign,
      name: normalizeNonEmptyString(nextCampaign?.name)
        ? `${String(nextCampaign.name)}${nameSuffix || ""}`
        : p.name,
      metaAdAccountId:
        normalizeNonEmptyString(nextCampaign?.metaAdAccountId) ||
        normalizeNonEmptyString(p.metaAdAccountId) ||
        normalizeNonEmptyString(profileMetaAdAccountId) ||
        "",
    }));
    setAdSet((p) => ({ ...p, ...nextAdSet }));
    setCreative((p) => ({
      ...p,
      ...nextCreative,
      pageId:
        normalizeNonEmptyString(nextCreative?.pageId) ||
        normalizeNonEmptyString(p.pageId) ||
        normalizeNonEmptyString(profileMetaPageId) ||
        "",
    }));
    setAd((p) => ({ ...p, ...nextAd }));

    const snapBatchEnabled = Boolean(snap.batchEnabled);
    setBatchEnabled(snapBatchEnabled);
    setSelectedCountryCodes(Array.isArray(snap.selectedCountryCodes) ? snap.selectedCountryCodes : ["BR"]);
    if (!snapBatchEnabled) {
      const first = Array.isArray(snap.selectedCountryCodes) && snap.selectedCountryCodes.length ? snap.selectedCountryCodes[0] : "BR";
      setCampaign((p) => ({ ...p, countryCode: first || "BR" }));
    }

    setRealConfirm(false);
    setSelectedCampaignTemplateId("");
    setSelectedCountryTemplateId("");
    setSelectedCreativeTemplateId("");
    setNotice("Execução carregada. Revise antes de criar (REAL exige confirmação).");
    setStep(3);
  }

  function repeatLastExecution() {
    if (!lastExecution) return;
    applyExecutionSnapshot(lastExecution);
  }

  function duplicateLastExecution() {
    if (!lastExecution) return;
    const suffix = ` • DUP ${new Date().toISOString().slice(0, 10)}`;
    applyExecutionSnapshot(lastExecution, { nameSuffix: suffix });
  }

  function saveCurrentAsQuickPreset() {
    setNotice("");
    const name = window.prompt("Nome do preset rápido:", "");
    if (name == null) return;
    const trimmed = normalizeNonEmptyString(name);
    if (!trimmed) {
      setNotice("Nome inválido.");
      return;
    }

    const preset = {
      id: `${Date.now()}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      snapshot: {
        base: { campaign, adSet, creative, ad },
        batchEnabled,
        selectedCountryCodes,
      },
    };

    const next = [preset, ...(quickPresets || [])].slice(0, 20);
    persistQuickPresets(next);
    setNotice("Preset salvo.");
  }

  function applySelectedQuickPreset() {
    setNotice("");
    const id = normalizeNonEmptyString(selectedQuickPresetId);
    if (!id) return;
    const preset = (quickPresets || []).find((p) => String(p?.id) === id);
    if (!preset?.snapshot) return;
    applyExecutionSnapshot(preset.snapshot);
  }

  function applySelectedCountryTemplate() {
    setNotice("");
    const templateId = normalizeNonEmptyString(selectedCountryTemplateId);
    if (!templateId) return;
    const t = (countryTemplates || []).find((x) => String(x?.id) === templateId);
    const codes = Array.isArray(t?.codes) ? t.codes : [];
    const normalized = Array.from(
      new Set(
        codes
          .map((c) => String(c || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );
    if (normalized.length === 0) {
      setNotice("Country Template vazio (sem países).");
      return;
    }
    setSelectedCountryCodes(normalized);
    setNotice(`Country Template aplicado: ${normalized.length} países.`);
  }

  function applySelectedCampaignTemplate() {
    setNotice("");
    const templateId = normalizeNonEmptyString(selectedCampaignTemplateId);
    if (!templateId) return;
    const t = (campaignTemplates || []).find((x) => String(x?.id) === templateId);
    const payload = t?.payload && typeof t.payload === "object" ? t.payload : {};
    const payloadCampaign = payload?.campaign && typeof payload.campaign === "object" ? payload.campaign : {};
    const payloadStructure = payload?.structure && typeof payload.structure === "object" ? payload.structure : {};

    const templateName =
      normalizeNonEmptyString(payloadCampaign?.name) ||
      normalizeNonEmptyString(t?.name) ||
      null;
    const metaObjective =
      normalizeNonEmptyString(payloadCampaign?.metaObjective) ||
      normalizeNonEmptyString(payloadCampaign?.meta_objective) ||
      null;
    const metaAdAccountId =
      normalizeNonEmptyString(payloadCampaign?.metaAdAccountId) ||
      normalizeNonEmptyString(payloadCampaign?.meta_ad_account_id) ||
      null;

    const firstAdSetName =
      normalizeNonEmptyString(payloadStructure?.adsets?.[0]?.name) || null;
    const firstAdName = normalizeNonEmptyString(payloadStructure?.ads?.[0]?.name) || null;

    setCampaign((p) => ({
      ...p,
      name: templateName ?? p.name,
      objective: metaObjective ?? p.objective,
      metaAdAccountId: metaAdAccountId ?? p.metaAdAccountId,
    }));
    if (firstAdSetName) setAdSet((p) => ({ ...p, name: firstAdSetName }));
    if (firstAdName) setAd((p) => ({ ...p, name: firstAdName }));
    setNotice("Campaign Template aplicado (campos base preenchidos).");
  }

  function applySelectedCreativeTemplate() {
    setNotice("");
    const templateId = normalizeNonEmptyString(selectedCreativeTemplateId);
    if (!templateId) return;
    const t = (creativeTemplates || []).find((x) => String(x?.id) === templateId);
    if (!t) return;

    setCreative((p) => {
      const nextVariants = Array.isArray(p.adVariants) ? [...p.adVariants] : AD_KEYS.map((key) => ({ key, primaryText: "", headline: "", description: "" }));
      while (nextVariants.length < AD_KEYS.length) nextVariants.push({ key: AD_KEYS[nextVariants.length], primaryText: "", headline: "", description: "" });
      const curA = nextVariants[0] && typeof nextVariants[0] === "object" ? nextVariants[0] : { key: "A" };
      nextVariants[0] = {
        ...curA,
        key: "A",
        primaryText: normalizeNonEmptyString(t.primary_text) || curA.primaryText || "",
        headline: normalizeNonEmptyString(t.headline) || curA.headline || "",
        description: normalizeNonEmptyString(t.description) || curA.description || "",
      };
      return {
        ...p,
        adVariants: nextVariants,
        destinationUrl: normalizeNonEmptyString(t.destination_url) || p.destinationUrl,
        ctaType: normalizeNonEmptyString(t.cta_type) || p.ctaType,
      };
    });
    setNotice("Creative Template aplicado (Etapa 3 preenchida).");
  }

  async function saveAsCampaignTemplate(generatedCampaignId, { suggestedName } = {}) {
    setNotice("");
    const id = normalizeNonEmptyString(generatedCampaignId);
    if (!id) return;

    const name = window.prompt("Nome do Campaign Template (opcional):", suggestedName || "");
    if (name === null) return;

    try {
      await createCampaignTemplateFromGenerated(id, { name: normalizeNonEmptyString(name) || undefined });
      setNotice("Template salvo com sucesso.");
    } catch (err) {
      setNotice(err?.message ? String(err.message) : "Falha ao salvar template.");
    }
  }

  async function copySummaryToClipboard(summary) {
    const txt = JSON.stringify(summary ?? {}, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      return true;
    } catch {
      return false;
    }
  }

  async function runFlow() {
    setSubmitting(true);
    setError("");
    setNotice("");
    setResult(null);
    setProgress(null);

    try {
      const variants = getCreativeAdVariants();
      const missingVariantKeys = variants
        .filter((v) => !normalizeNonEmptyString(v?.primaryText))
        .map((v) => v?.key)
        .filter(Boolean);
      if (campaign.mode === "REAL" && missingVariantKeys.length) {
        setSubmitting(false);
        setNotice("");
        setError(`Execução REAL bloqueada: texto faltando em ${missingVariantKeys.join(", ")} (primaryText).`);
        setStep(2);
        return;
      }

      if (batchEnabled) {
        const rawCodes = Array.from(new Set((selectedCountryCodes || []).map((c) => String(c || "").trim()).filter(Boolean)));
        const codes = (() => {
          const out = [...rawCodes];
          const hasBR = out.some((c) => String(c).toUpperCase() === "BR");
          const profileHasBR = operationalCountryCodes.some((c) => String(c).toUpperCase() === "BR");
          if (profileHasBR && !hasBR) out.unshift("BR");
          return Array.from(new Set(out.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean)));
        })();
        const perCountry = [];

        const translationsRequired = creative?.translationsRequired === true;
        const translationsByCountry =
          creative?.translationsByCountry && typeof creative.translationsByCountry === "object" ? creative.translationsByCountry : null;

        if (translationsRequired) {
          const missing = [];
          for (const raw of codes) {
            const cc = String(raw || "").trim().toUpperCase();
            const lang = countryLanguageByCode?.[cc] ?? null;
            if (!lang) continue;
            const entry = translationsByCountry?.[cc] && typeof translationsByCountry[cc] === "object" ? translationsByCountry[cc] : null;
            if (!entry || (entry?.language && String(entry.language) !== String(lang))) {
              missing.push(`${cc}(${lang})`);
            }
          }
          if (missing.length) {
            const ok = window.confirm(
              `Tradução não encontrada para: ${missing.join(", ")}.\n\nContinuar usando o texto BASE para esses países?`
            );
            if (!ok) {
              setSubmitting(false);
              setNotice("Execução cancelada: traduções pendentes.");
              return;
            }
          }
        }

        const skipCountries = new Set();
        const skipCountryReasons = {};
        if (campaign.mode === "REAL") {
          const missingMedia = [];

          // Best-effort: auto-generate thumbnails for videos missing thumbnail.
          for (const raw of codes) {
            const cc = String(raw || "").trim().toUpperCase();
            for (const k of AD_KEYS) {
              const media = resolveMediaForCountryAd(cc, k);
              if (media.kind === "video" && media.status === "ok" && !media.thumbnailOk && media.creativeAssetId) {
                try {
                  const res = await generateCreativeAssetThumbnail(media.creativeAssetId);
                  const asset = res?.creativeThumbnailAsset ?? null;
                  if (asset?.id && asset?.mime_type && String(asset.mime_type).startsWith("image/")) {
                    setCreative((p) => {
                      const next = p?.mediaByCountry && typeof p.mediaByCountry === "object" ? { ...p.mediaByCountry } : {};
                      const countryEntry = next?.[cc] && typeof next[cc] === "object" ? { ...next[cc] } : {};
                      const adEntry = countryEntry?.[k] && typeof countryEntry[k] === "object" ? { ...countryEntry[k] } : {};
                      adEntry.thumbnail = {
                        creativeAssetId: String(asset.id),
                        mimeType: asset.mime_type ?? null,
                        originalName: asset.original_name ?? null,
                        url: asset.url ?? null,
                        kind: "image",
                        updatedAt: new Date().toISOString(),
                      };
                      countryEntry[k] = adEntry;
                      next[cc] = countryEntry;
                      return { ...p, mediaByCountry: next };
                    });
                  }
                } catch {
                  // keep missing; will be reported below
                }
              }
            }
          }

          for (const raw of codes) {
            const cc = String(raw || "").trim().toUpperCase();
            for (const k of AD_KEYS) {
              const media = resolveMediaForCountryAd(cc, k);
              if (media.status !== "ok" || media.kind !== "video" || !media.thumbnailOk) {
                const reason = formatMediaRejection(media);
                missingMedia.push({ cc, k, reason, media });
                skipCountryReasons[cc] = Array.isArray(skipCountryReasons[cc]) ? skipCountryReasons[cc] : [];
                skipCountryReasons[cc].push(`Ad ${k}: ${reason}`);
              }
            }
          }
          if (missingMedia.length) {
            console.info("[campaign-flow] media validation failed", {
              countries: codes,
              failures: missingMedia.map((m) => ({
                countryCode: m.cc,
                adKey: m.k,
                reason: m.reason,
                creativeAssetId: m.media?.creativeAssetId ?? null,
                mimeType: m.media?.mimeType ?? null,
                kind: m.media?.kind ?? null,
                thumbnailCreativeAssetId: m.media?.thumbnailCreativeAssetId ?? null,
                thumbnailMimeType: m.media?.thumbnailMimeType ?? null,
                thumbnailOk: m.media?.thumbnailOk ?? null,
              })),
            });
            const ok = window.confirm(
              `Mídia reprovada para: ${missingMedia.map((m) => `${m.cc}:${m.k} (${m.reason})`).join(", ")}.\n\nOK = continuar e PULAR os países afetados (não cria nada para eles).\nCancelar = voltar para revisar.`
            );
            if (!ok) {
              setSubmitting(false);
              setNotice("Execução cancelada: mídias pendentes.");
              return;
            }
            for (const item of missingMedia) {
              if (item?.cc) skipCountries.add(item.cc);
            }
          }
        }

        for (let i = 0; i < codes.length; i += 1) {
          const countryCode = codes[i];
          const label = `${countryCode} — ${countryNameByCode[countryCode] ?? ""}`.trim();

          if (skipCountries.has(String(countryCode || "").trim().toUpperCase())) {
            const cc = String(countryCode || "").trim().toUpperCase();
            const reasons = Array.isArray(skipCountryReasons?.[cc]) ? skipCountryReasons[cc] : [];
            perCountry.push({
              ok: false,
              countryCode,
              label,
              error: reasons.length
                ? `Mídia reprovada (execução REAL bloqueada para este país): ${reasons.join(" | ")}`
                : "Mídia reprovada (execução REAL bloqueada para este país).",
            });
            continue;
          }

          setProgress({ total: codes.length, currentIndex: i, currentCountryCode: countryCode, stage: "campaign" });

          try {
            const campaignRes = await createMetaCampaignSimple({
              name: normalizeCampaignNameForCountry(campaign.name, countryCode),
              objective: campaign.objective,
              metaAdAccountId: campaign.metaAdAccountId,
              countryCode,
              mode: campaign.mode,
            });

            const generatedCampaignId = campaignRes?.generatedCampaign?.id;
            if (!normalizeNonEmptyString(generatedCampaignId)) {
              throw new Error("Falha ao criar Campaign (generatedCampaignId ausente).");
            }

            setProgress({ total: codes.length, currentIndex: i, currentCountryCode: countryCode, stage: "adset" });
            const adSetRes = await createMetaAdSet({
              generatedCampaignId,
              name: normalizeCountrySuffixName(adSet.name, countryCode, { fallbackPrefix: "AdSet" }),
              dailyBudgetCents: Number(adSet.dailyBudgetCents),
              billingEvent: adSet.billingEvent,
              optimizationGoal: adSet.optimizationGoal,
              mode: campaign.mode,
            });

            const cc = String(countryCode || "").trim().toUpperCase();
            const perAds = [];
            for (const k of AD_KEYS) {
              setProgress({
                total: codes.length,
                currentIndex: i,
                currentCountryCode: countryCode,
                stage: "creativeDraft",
                adKey: k,
              });

              const copy = resolveCopyForCountryAd(cc, k);
              const media = resolveMediaForCountryAd(cc, k);

              if (!normalizeNonEmptyString(copy?.primaryText)) {
                perAds.push({ ok: false, key: k, error: "Texto faltando (primaryText)." });
                continue;
              }

              if (campaign.mode === "REAL" && (media.status !== "ok" || media.kind !== "video")) {
                perAds.push({ ok: false, key: k, error: "Vídeo faltando/indisponível para este Ad." });
                continue;
              }
              if (campaign.mode === "REAL" && media.kind === "video" && !media.thumbnailOk) {
                perAds.push({ ok: false, key: k, error: "Thumbnail faltando para o vídeo deste Ad." });
                continue;
              }

              try {
                const draftRes = await createCreativeDraft({
                  generatedCampaignId,
                  creativeAssetId: media?.supported ? media.creativeAssetId : null,
                  creativeThumbnailAssetId: media?.thumbnailCreativeAssetId ?? null,
                  primaryText: copy.primaryText,
                  headline: copy.headline || null,
                  description: copy.description || null,
                  destinationUrl: creative.destinationUrl,
                  ctaType: creative.ctaType,
                });

                const creativeDraftId = draftRes?.creativeDraft?.id;
                if (!normalizeNonEmptyString(creativeDraftId)) {
                  perAds.push({ ok: false, key: k, error: "Falha ao criar Creative Draft (id ausente)." });
                  continue;
                }

                let publishRes = null;
                if (campaign.mode === "REAL") {
                  setProgress({
                    total: codes.length,
                    currentIndex: i,
                    currentCountryCode: countryCode,
                    stage: "creativePublish",
                    adKey: k,
                  });
                  publishRes = await publishMetaCreativeDraft(creativeDraftId, {
                    pageId: normalizeNonEmptyString(creative.pageId) || null,
                    instagramActorId: normalizeNonEmptyString(creative.instagramActorId) || null,
                    force: false,
                  });
                }

                setProgress({ total: codes.length, currentIndex: i, currentCountryCode: countryCode, stage: "ad", adKey: k });
                const adRes = await createMetaAd({
                  generatedCampaignId,
                  name: `Ad • ${cc} — ${k}`,
                  creativeDraftId,
                  mode: campaign.mode,
                });

                perAds.push({
                  ok: true,
                  key: k,
                  creativeDraftId,
                  metaCreativeId: publishRes?.metaCreative?.id ?? null,
                  metaAdId: adRes?.metaAd?.id ?? null,
                  metaAdEffectiveStatus: adRes?.metaAd?.effective_status ?? null,
                });
              } catch (err) {
                perAds.push({
                  ok: false,
                  key: k,
                  error: (err?.message ? String(err.message) : "Falha no Ad.") + formatMetaErrorSuffix(err),
                });
              }
            }

            perCountry.push({
              ok: perAds.every((a) => a?.ok),
              countryCode,
              label,
              generatedCampaignId,
              metaCampaignId: campaignRes?.metaCampaign?.id ?? null,
              metaAdSetId: adSetRes?.metaAdSet?.id ?? null,
              ads: perAds,
            });
          } catch (err) {
            perCountry.push({
              ok: false,
              countryCode,
              label,
              error: (err?.message ? String(err.message) : "Falha ao executar o lote para este país.") + formatMetaErrorSuffix(err),
            });
          }
        }

        setProgress(null);
        const nextResult = {
          type: "batch",
          mode: campaign.mode,
          base: { campaign, adSet, creative, ad },
          perCountry,
          createdAt: new Date().toISOString(),
        };
        setResult(nextResult);
        persistLastExecution({ base: { campaign, adSet, creative, ad }, batchEnabled: true, selectedCountryCodes: codes });
        setStep(4);
      } else {
        if (campaign.mode === "REAL") {
          const cc = String(campaign.countryCode || "").trim().toUpperCase();
          // Best-effort: auto-generate missing thumbnails for videos.
          for (const k of AD_KEYS) {
            const media = resolveMediaForCountryAd(cc, k);
            if (media.kind === "video" && media.status === "ok" && !media.thumbnailOk && media.creativeAssetId) {
              try {
                const res = await generateCreativeAssetThumbnail(media.creativeAssetId);
                const asset = res?.creativeThumbnailAsset ?? null;
                if (asset?.id && asset?.mime_type && String(asset.mime_type).startsWith("image/")) {
                  setCreative((p) => {
                    const next = p?.mediaByCountry && typeof p.mediaByCountry === "object" ? { ...p.mediaByCountry } : {};
                    const countryEntry = next?.[cc] && typeof next[cc] === "object" ? { ...next[cc] } : {};
                    const adEntry = countryEntry?.[k] && typeof countryEntry[k] === "object" ? { ...countryEntry[k] } : {};
                    adEntry.thumbnail = {
                      creativeAssetId: String(asset.id),
                      mimeType: asset.mime_type ?? null,
                      originalName: asset.original_name ?? null,
                      url: asset.url ?? null,
                      kind: "image",
                      updatedAt: new Date().toISOString(),
                    };
                    countryEntry[k] = adEntry;
                    next[cc] = countryEntry;
                    return { ...p, mediaByCountry: next };
                  });
                }
              } catch {
                // ignore
              }
            }
          }

          const missing = [];
          for (const k of AD_KEYS) {
            const media = resolveMediaForCountryAd(cc, k);
            if (media.status !== "ok" || media.kind !== "video" || !media.thumbnailOk) missing.push(k);
          }
          if (missing.length) {
            setSubmitting(false);
            setNotice("");
            setError(`Execução REAL bloqueada: vídeo/thumbnail ausente para ${cc}: ${missing.join(", ")}.`);
            setStep(3);
            return;
          }
        }

        const campaignRes = await createMetaCampaignSimple({
          name: campaign.name,
          objective: campaign.objective,
          metaAdAccountId: campaign.metaAdAccountId,
          countryCode: campaign.countryCode,
          mode: campaign.mode,
        });

        const generatedCampaignId = campaignRes?.generatedCampaign?.id;
        if (!normalizeNonEmptyString(generatedCampaignId)) {
          throw new Error("Falha ao criar Campaign (generatedCampaignId ausente).");
        }

        const adSetRes = await createMetaAdSet({
          generatedCampaignId,
          name: adSet.name,
          dailyBudgetCents: Number(adSet.dailyBudgetCents),
          billingEvent: adSet.billingEvent,
          optimizationGoal: adSet.optimizationGoal,
          mode: campaign.mode,
        });

        const translationsRequired = creative?.translationsRequired === true;
        const translationsByCountry =
          creative?.translationsByCountry && typeof creative.translationsByCountry === "object" ? creative.translationsByCountry : null;
        const cc = String(campaign.countryCode || "").trim().toUpperCase();
        const perAds = [];
        for (const k of AD_KEYS) {
          const copy = resolveCopyForCountryAd(cc, k);
          const media = resolveMediaForCountryAd(cc, k);
          if (!normalizeNonEmptyString(copy?.primaryText)) {
            perAds.push({ ok: false, key: k, error: "Texto faltando (primaryText)." });
            continue;
          }
          if (campaign.mode === "REAL" && (media.status !== "ok" || media.kind !== "video")) {
            perAds.push({ ok: false, key: k, error: "Vídeo faltando/indisponível para este Ad." });
            continue;
          }
          if (campaign.mode === "REAL" && media.kind === "video" && !media.thumbnailOk) {
            perAds.push({ ok: false, key: k, error: "Thumbnail faltando para o vídeo deste Ad." });
            continue;
          }
          try {
            const draftRes = await createCreativeDraft({
              generatedCampaignId,
              creativeAssetId: media?.supported ? media.creativeAssetId : null,
              creativeThumbnailAssetId: media?.thumbnailCreativeAssetId ?? null,
              primaryText: copy.primaryText,
              headline: copy.headline || null,
              description: copy.description || null,
              destinationUrl: creative.destinationUrl,
              ctaType: creative.ctaType,
            });
            const creativeDraftId = draftRes?.creativeDraft?.id;
            if (!normalizeNonEmptyString(creativeDraftId)) {
              perAds.push({ ok: false, key: k, error: "Falha ao criar Creative Draft (id ausente)." });
              continue;
            }
            let publishRes = null;
            if (campaign.mode === "REAL") {
              publishRes = await publishMetaCreativeDraft(creativeDraftId, {
                pageId: normalizeNonEmptyString(creative.pageId) || null,
                instagramActorId: normalizeNonEmptyString(creative.instagramActorId) || null,
                force: false,
              });
            }
            const adRes = await createMetaAd({
              generatedCampaignId,
              name: `Ad • ${cc} — ${k}`,
              creativeDraftId,
              mode: campaign.mode,
            });
            perAds.push({
              ok: true,
              key: k,
              creativeDraftId,
              metaCreativeId: publishRes?.metaCreative?.id ?? null,
              metaAdId: adRes?.metaAd?.id ?? null,
              metaAdEffectiveStatus: adRes?.metaAd?.effective_status ?? null,
            });
          } catch (err) {
            perAds.push({
              ok: false,
              key: k,
              error: (err?.message ? String(err.message) : "Falha no Ad.") + formatMetaErrorSuffix(err),
            });
          }
        }

        const nextResult = {
          type: "single",
          mode: campaign.mode,
          countryCode: campaign.countryCode,
          generatedCampaignId,
          metaCampaignId: campaignRes?.metaCampaign?.id ?? null,
          metaAdSetId: adSetRes?.metaAdSet?.id ?? null,
          ads: perAds,
          createdAt: new Date().toISOString(),
        };
        setResult(nextResult);
        persistLastExecution({
          base: { campaign, adSet, creative, ad },
          batchEnabled: false,
          selectedCountryCodes: [campaign.countryCode || "BR"],
        });

        setStep(4);
      }
    } catch (err) {
      setError((err?.message ? String(err.message) : "Falha ao executar o fluxo.") + formatMetaErrorSuffix(err));
      setStep(4);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }

  const modeIsReal = campaign.mode === "REAL";
  const pausedWarning = "Tudo será criado como PAUSED (guardrail obrigatório).";

  function resolveCopyForCountry(countryCode) {
    // Backward-compat shim for existing UI (Ad A).
    return resolveCopyForCountryAd(countryCode, "A");
  }

  function getCreativeAdVariants() {
    const raw = creative?.adVariants;
    if (Array.isArray(raw) && raw.length) {
      return AD_KEYS.map((key, idx) => {
        const src = raw[idx] && typeof raw[idx] === "object" ? raw[idx] : {};
        return {
          key,
          primaryText: normalizeNonEmptyString(src?.primaryText) || "",
          headline: normalizeNonEmptyString(src?.headline) || "",
          description: normalizeNonEmptyString(src?.description) || "",
        };
      });
    }
    // Older snapshots may still have single creative fields.
    const legacy = {
      primaryText: normalizeNonEmptyString(creative?.primaryText) || "",
      headline: normalizeNonEmptyString(creative?.headline) || "",
      description: normalizeNonEmptyString(creative?.description) || "",
    };
    return AD_KEYS.map((key) => ({
      key,
      primaryText: key === "A" ? legacy.primaryText : "",
      headline: key === "A" ? legacy.headline : "",
      description: key === "A" ? legacy.description : "",
    }));
  }

  function resolveCopyForCountryAd(countryCode, adKey) {
    const cc = String(countryCode || "").trim().toUpperCase();
    const k = String(adKey || "").trim().toUpperCase();
    const variants = getCreativeAdVariants();
    const idx = AD_KEYS.indexOf(k);
    const baseVariant = idx >= 0 ? variants[idx] : variants[0];

    const lang = countryLanguageByCode?.[cc] ?? null;
    const translationsRequired = creative?.translationsRequired === true;
    const translationsByCountry =
      creative?.translationsByCountry && typeof creative.translationsByCountry === "object" ? creative.translationsByCountry : null;
    const entry = translationsByCountry?.[cc] && typeof translationsByCountry[cc] === "object" ? translationsByCountry[cc] : null;

    const ok = Boolean(translationsRequired && cc !== "BR" && lang && entry && (!entry.language || String(entry.language) === String(lang)));
    if (!ok) {
      return { source: "base", language: lang, ...baseVariant };
    }

    const ads = entry?.ads && typeof entry.ads === "object" ? entry.ads : null;
    if (ads && ads[k] && typeof ads[k] === "object") {
      const t = ads[k];
      return {
        source: "translation",
        language: lang,
        key: k,
        primaryText: t?.primaryText ?? baseVariant.primaryText,
        headline: t?.headline ?? baseVariant.headline,
        description: t?.description ?? baseVariant.description,
      };
    }

    // Legacy translation entry -> Ad A only.
    if (!ads && k === "A") {
      return {
        source: "translation",
        language: lang,
        key: "A",
        primaryText: entry?.primaryText ?? baseVariant.primaryText,
        headline: entry?.headline ?? baseVariant.headline,
        description: entry?.description ?? baseVariant.description,
      };
    }

    return { source: "base", language: lang, ...baseVariant };
  }

  function resolveMediaForCountryAd(countryCode, adKey) {
    const cc = String(countryCode || "").trim().toUpperCase();
    const k = String(adKey || "").trim().toUpperCase();
    if (!AD_KEYS.includes(k)) {
      return {
        countryCode: cc,
        adKey: k,
        creativeAssetId: null,
        mimeType: null,
        originalName: null,
        url: null,
        kind: "unknown",
        supported: false,
        status: "missing",
      };
    }
    const mediaByCountry =
      creative?.mediaByCountry && typeof creative.mediaByCountry === "object" ? creative.mediaByCountry : null;
    const byAd = mediaByCountry?.[cc] && typeof mediaByCountry[cc] === "object" ? mediaByCountry[cc] : null;
    const entry = byAd?.[k] && typeof byAd[k] === "object" ? byAd[k] : null;
    const thumb = entry?.thumbnail && typeof entry.thumbnail === "object" ? entry.thumbnail : null;

    const creativeAssetId = normalizeNonEmptyString(entry?.creativeAssetId) || null;
    const mimeType = normalizeNonEmptyString(entry?.mimeType) || null;
    const originalName = normalizeNonEmptyString(entry?.originalName) || null;
    const url = normalizeNonEmptyString(entry?.url) || null;

    const thumbnailCreativeAssetId = normalizeNonEmptyString(thumb?.creativeAssetId) || null;
    const thumbnailMimeType = normalizeNonEmptyString(thumb?.mimeType) || null;
    const thumbnailOriginalName = normalizeNonEmptyString(thumb?.originalName) || null;
    const thumbnailUrl = normalizeNonEmptyString(thumb?.url) || null;

    const kind = mimeType && mimeType.startsWith("image/") ? "image" : mimeType && mimeType.startsWith("video/") ? "video" : "unknown";
    const supported = kind === "image" || kind === "video";
    const thumbnailOk = kind !== "video" ? true : Boolean(thumbnailCreativeAssetId && thumbnailMimeType?.startsWith("image/"));

    return {
      countryCode: cc,
      adKey: k,
      creativeAssetId,
      mimeType,
      originalName,
      url,
      thumbnailCreativeAssetId,
      thumbnailMimeType,
      thumbnailOriginalName,
      thumbnailUrl,
      kind,
      supported,
      thumbnailOk,
      status:
        !creativeAssetId ? "missing" : supported ? "ok" : "unsupported",
    };
  }

  return (
    <PageShell
      title="Fluxo guiado Meta"
      subtitle="Crie Campaign → AdSet → Creative → Ad com guardrails de segurança (sem expor token)."
      align="center"
      backFallbackTo="/"
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div className="card" style={{ padding: 18, borderColor: "#fde68a", background: "#fffbeb" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 950, color: "#92400e" }}>{pausedWarning}</div>
            <div style={{ fontWeight: 750, color: "#92400e", fontSize: 13 }}>
              {modeIsReal
                ? "Modo REAL: requer backend com token e Page ID configurado (ou informe Page ID aqui)."
                : "Modo STUB: cria stubs no backend (sem chamadas ao Graph)."}
            </div>
            {templatesInfo ? (
              <div style={{ fontWeight: 750, color: "#92400e", fontSize: 13 }}>{templatesInfo}</div>
            ) : null}
            {operationalCountriesMissing ? (
              <div style={{ fontWeight: 800, color: "#92400e", fontSize: 13 }}>
                Aviso: nenhum “País da operação” configurado no Perfil. Configure em `/profile` para operar lote com base segura.
              </div>
            ) : null}
            {countryLanguagesMissing ? (
              <div style={{ fontWeight: 800, color: "#92400e", fontSize: 13 }}>
                Aviso: defina o idioma principal por país no `/profile` (P25) para padronizar operação. (Sem tradução automática.)
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {steps.map((label, idx) => (
            <StepPill key={label} label={label} active={idx === step} />
          ))}
        </div>

        {notice ? (
          <div className="card" style={{ marginTop: 14, padding: 14, borderColor: "#bfdbfe", color: "#1d4ed8" }}>
            <div style={{ fontWeight: 900 }}>{notice}</div>
          </div>
        ) : null}

        {step === 0 ? (
          <section className="card" style={{ marginTop: 16, padding: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>Etapa 1 — Dados da campanha</h2>
            <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
              <Field label="Atalhos e templates (opcional)" hint="Use para reduzir cliques e preenchimento manual.">
                <details style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#fff" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 950, color: "#111827" }}>
                    Atalhos (P21) — repetir/duplicar/presets
                  </summary>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="pillOutline"
                        disabled={submitting || !lastExecution}
                        onClick={repeatLastExecution}
                      >
                        Repetir última execução
                      </button>
                      <button
                        type="button"
                        className="pillOutline"
                        disabled={submitting || !lastExecution}
                        onClick={duplicateLastExecution}
                      >
                        Duplicar último lote
                      </button>
                      <button
                        type="button"
                        className="pillOutline"
                        disabled={submitting}
                        onClick={saveCurrentAsQuickPreset}
                      >
                        Salvar preset rápido
                      </button>
                    </div>
                    {(quickPresets || []).length ? (
                      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <SelectLike
                            value={selectedQuickPresetId}
                            onChange={(e) => setSelectedQuickPresetId(e.target.value)}
                            disabled={submitting}
                            options={[
                              { value: "", label: "Selecionar preset…", disabled: true },
                              ...(quickPresets || []).map((p) => ({
                                value: p.id,
                                label: p?.name ?? "Preset",
                              })),
                            ]}
                          />
                        </div>
                        <button
                          type="button"
                          className="pillOutline"
                          disabled={submitting || !normalizeNonEmptyString(selectedQuickPresetId)}
                          onClick={applySelectedQuickPreset}
                        >
                          Aplicar preset
                        </button>
                      </div>
                    ) : null}
                  </div>
                </details>

                <details style={{ marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#fff" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 950, color: "#111827" }}>
                    Templates (P11) — preencher estrutura base
                  </summary>
                  <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ fontWeight: 850, color: "#374151" }}>Campaign Template</div>
                        <div style={{ color: "#6b7280", fontWeight: 750, fontSize: 12 }}>
                          (preenche name/objective/ad account e nomes base)
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <SelectLike
                            value={selectedCampaignTemplateId}
                            onChange={(e) => setSelectedCampaignTemplateId(e.target.value)}
                            disabled={submitting}
                            options={campaignTemplateOptions}
                          />
                        </div>
                        <button
                          type="button"
                          className="pillOutline"
                          disabled={submitting || !normalizeNonEmptyString(selectedCampaignTemplateId)}
                          onClick={applySelectedCampaignTemplate}
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>

                    {batchEnabled ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ fontWeight: 850, color: "#374151" }}>Country Template</div>
                          <div style={{ color: "#6b7280", fontWeight: 750, fontSize: 12 }}>
                            (preenche países do lote)
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ flex: 1, minWidth: 260 }}>
                            <SelectLike
                              value={selectedCountryTemplateId}
                              onChange={(e) => setSelectedCountryTemplateId(e.target.value)}
                              disabled={submitting}
                              options={countryTemplateOptions}
                            />
                          </div>
                          <button
                            type="button"
                            className="pillOutline"
                            disabled={submitting || !normalizeNonEmptyString(selectedCountryTemplateId)}
                            onClick={applySelectedCountryTemplate}
                          >
                            Aplicar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </details>
              </Field>

              <Field label="Nome" required>
                <InputLike
                  placeholder="Ex: DEMO • Campaign Builder • BR • 2026-05-26"
                  value={campaign.name}
                  onChange={(e) => setCampaign((p) => ({ ...p, name: e.target.value }))}
                  disabled={submitting}
                />
              </Field>
              <Field
                label="Meta Ad Account ID"
                hint="Opcional: se vazio, o backend tenta usar o valor salvo no Perfil."
              >
                <InputLike
                  placeholder="act_259174718403969"
                  value={campaign.metaAdAccountId}
                  onChange={(e) => setCampaign((p) => ({ ...p, metaAdAccountId: e.target.value }))}
                  disabled={submitting}
                />
              </Field>
              <Field label="Objective" required>
                <SelectLike
                  value={campaign.objective}
                  onChange={(e) => setCampaign((p) => ({ ...p, objective: e.target.value }))}
                  disabled={submitting}
                  options={[
                    { value: "OUTCOME_TRAFFIC", label: "OUTCOME_TRAFFIC" },
                    { value: "OUTCOME_LEADS", label: "OUTCOME_LEADS" },
                    { value: "OUTCOME_SALES", label: "OUTCOME_SALES" },
                  ]}
                />
              </Field>
              <Field label="Criação em lote" hint="Ative para criar uma estrutura por país selecionado (P20).">
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 850, color: "#111827" }}>
                  <input
                    type="checkbox"
                    checked={batchEnabled}
                    disabled={submitting}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setBatchEnabled(next);
                      setRealConfirm(false);
                      setSelectedCountryTemplateId("");
                      if (!next) {
                        // fallback: keep current single country if possible
                        const first = selectedCountryCodes?.[0] || "BR";
                        setCampaign((p) => ({ ...p, countryCode: first }));
                      } else {
                        setSelectedCountryCodes((prev) => (Array.isArray(prev) && prev.length ? prev : ["BR"]));
                      }
                    }}
                  />
                  Criar em lote (múltiplos países)
                </label>
              </Field>

              {batchEnabled ? (
                <Field label="Países" required hint="Selecione 1 ou mais países para o lote.">
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="pillOutline"
                      disabled={submitting}
                      onClick={() =>
                        setSelectedCountryCodes(
                          (countryOptions || []).filter((o) => o.value).map((o) => o.value)
                        )
                      }
                    >
                      Selecionar todos
                    </button>
                    <button
                      type="button"
                      className="pillOutline"
                      disabled={submitting}
                      onClick={() => setSelectedCountryCodes([])}
                    >
                      Limpar
                    </button>
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                    {(countryOptions || [])
                      .filter((o) => o.value)
                      .map((opt) => {
                        const checked = selectedCountryCodes.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className="card"
                            style={{
                              padding: 12,
                              cursor: submitting ? "not-allowed" : "pointer",
                              borderColor: checked ? "#111827" : "#e5e7eb",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ fontWeight: 900, color: "#111827" }}>{opt.label}</div>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={submitting}
                                onChange={() => {
                                  setSelectedCountryCodes((prev) => {
                                    const set = new Set(prev || []);
                                    if (set.has(opt.value)) set.delete(opt.value);
                                    else set.add(opt.value);
                                    return Array.from(set);
                                  });
                                }}
                              />
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </Field>
              ) : (
                <Field label="Country" required>
                  <SelectLike
                    value={campaign.countryCode}
                    onChange={(e) => setCampaign((p) => ({ ...p, countryCode: e.target.value }))}
                    disabled={submitting}
                    options={countryOptions}
                  />
                </Field>
              )}
              <Field label="Modo de execução" required hint="REAL sempre cria PAUSED (nunca ACTIVE).">
                <SelectLike
                  value={campaign.mode}
                  onChange={(e) => setCampaign((p) => ({ ...p, mode: e.target.value }))}
                  disabled={submitting}
                  options={[
                    { value: "STUB", label: "STUB (recomendado)", disabled: false },
                    { value: "REAL", label: "REAL (sempre PAUSED)", disabled: false },
                  ]}
                />
              </Field>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="card" style={{ marginTop: 16, padding: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>Etapa 2 — Configuração do AdSet</h2>
            <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
              <Field label="Nome" required>
                <InputLike
                  placeholder="Ex: AdSet BR — ABO"
                  value={adSet.name}
                  onChange={(e) => setAdSet((p) => ({ ...p, name: e.target.value }))}
                  disabled={submitting}
                />
              </Field>
              <Field label="Daily budget (centavos)" required hint="Ex.: 1000 = R$ 10,00">
                <InputLike
                  type="number"
                  placeholder="1000"
                  value={String(adSet.dailyBudgetCents)}
                  onChange={(e) => setAdSet((p) => ({ ...p, dailyBudgetCents: Number(e.target.value || 0) }))}
                  disabled={submitting}
                />
              </Field>
              <Field label="Billing event" required>
                <SelectLike
                  value={adSet.billingEvent}
                  onChange={(e) => setAdSet((p) => ({ ...p, billingEvent: e.target.value }))}
                  disabled={submitting}
                  options={[
                    { value: "IMPRESSIONS", label: "IMPRESSIONS" },
                    { value: "LINK_CLICKS", label: "LINK_CLICKS" },
                  ]}
                />
              </Field>
              <Field label="Optimization goal" required>
                <SelectLike
                  value={adSet.optimizationGoal}
                  onChange={(e) => setAdSet((p) => ({ ...p, optimizationGoal: e.target.value }))}
                  disabled={submitting}
                  options={[
                    { value: "LINK_CLICKS", label: "LINK_CLICKS" },
                    { value: "OFFSITE_CONVERSIONS", label: "OFFSITE_CONVERSIONS" },
                  ]}
                />
              </Field>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="card" style={{ marginTop: 16, padding: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>Etapa 3 — Criativo</h2>
            <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
              <Field label="Creative Template (opcional)" hint="Preenche automaticamente textos/URL/CTA quando disponível.">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <SelectLike
                      value={selectedCreativeTemplateId}
                      onChange={(e) => setSelectedCreativeTemplateId(e.target.value)}
                      disabled={submitting}
                      options={creativeTemplateOptions}
                    />
                  </div>
                  <button
                    type="button"
                    className="pillOutline"
                    disabled={submitting || !normalizeNonEmptyString(selectedCreativeTemplateId)}
                    onClick={applySelectedCreativeTemplate}
                  >
                    Aplicar
                  </button>
                </div>
              </Field>
              <Field label="Variações (A–E) — PT-BR" required hint="Cada variação vira 1 Ad no país. BR é a origem (não traduz).">
                <div style={{ display: "grid", gap: 10 }}>
                  {(Array.isArray(creative.adVariants) ? creative.adVariants : AD_KEYS.map((key) => ({ key }))).map((ad, idx) => {
                    const key = AD_KEYS[idx] ?? ad?.key ?? `${idx + 1}`;
                    const item = ad && typeof ad === "object" ? ad : {};
                    return (
                      <div key={key} className="card" style={{ padding: 12 }}>
                        <div style={{ fontWeight: 950, marginBottom: 10 }}>{`Ad ${key}`}</div>
                        <div style={{ display: "grid", gap: 10 }}>
                          <TextAreaLike
                            placeholder="Primary text"
                            value={item.primaryText ?? ""}
                            onChange={(e) =>
                              setCreative((p) => {
                                const next = Array.isArray(p.adVariants)
                                  ? [...p.adVariants]
                                  : AD_KEYS.map((k) => ({ key: k, primaryText: "", headline: "", description: "" }));
                                while (next.length < AD_KEYS.length) next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
                                const cur = next[idx] && typeof next[idx] === "object" ? next[idx] : {};
                                next[idx] = { ...cur, key, primaryText: e.target.value };
                                return { ...p, adVariants: next };
                              })
                            }
                            disabled={submitting}
                          />
                          <InputLike
                            placeholder="Headline"
                            value={item.headline ?? ""}
                            onChange={(e) =>
                              setCreative((p) => {
                                const next = Array.isArray(p.adVariants)
                                  ? [...p.adVariants]
                                  : AD_KEYS.map((k) => ({ key: k, primaryText: "", headline: "", description: "" }));
                                while (next.length < AD_KEYS.length) next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
                                const cur = next[idx] && typeof next[idx] === "object" ? next[idx] : {};
                                next[idx] = { ...cur, key, headline: e.target.value };
                                return { ...p, adVariants: next };
                              })
                            }
                            disabled={submitting}
                          />
                          <InputLike
                            placeholder="Description"
                            value={item.description ?? ""}
                            onChange={(e) =>
                              setCreative((p) => {
                                const next = Array.isArray(p.adVariants)
                                  ? [...p.adVariants]
                                  : AD_KEYS.map((k) => ({ key: k, primaryText: "", headline: "", description: "" }));
                                while (next.length < AD_KEYS.length) next.push({ key: AD_KEYS[next.length], primaryText: "", headline: "", description: "" });
                                const cur = next[idx] && typeof next[idx] === "object" ? next[idx] : {};
                                next[idx] = { ...cur, key, description: e.target.value };
                                return { ...p, adVariants: next };
                              })
                            }
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Field>
              <Field label="Destination URL" required>
                <InputLike
                  placeholder="https://example.com/?utm_source=demo"
                  value={creative.destinationUrl}
                  onChange={(e) => setCreative((p) => ({ ...p, destinationUrl: e.target.value }))}
                  disabled={submitting}
                />
              </Field>
              <Field label="CTA Type" required>
                <SelectLike
                  value={creative.ctaType}
                  onChange={(e) => setCreative((p) => ({ ...p, ctaType: e.target.value }))}
                  disabled={submitting}
                  options={[
                    { value: "LEARN_MORE", label: "LEARN_MORE" },
                    { value: "SHOP_NOW", label: "SHOP_NOW" },
                    { value: "SIGN_UP", label: "SIGN_UP" },
                  ]}
                />
              </Field>
              {modeIsReal ? (
                <>
                  <div style={{ height: 1, background: "#f3f4f6" }} />
                  <Field
                    label="Page ID (opcional)"
                    hint="Se não informar, o backend tentará usar META_PAGE_ID. Sem Page ID o publish do Creative REAL falha."
                  >
                    <InputLike
                      placeholder="123456789012345"
                      value={creative.pageId}
                      onChange={(e) => setCreative((p) => ({ ...p, pageId: e.target.value }))}
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Instagram actor ID (opcional)">
                    <InputLike
                      placeholder="Opcional"
                      value={creative.instagramActorId}
                      onChange={(e) => setCreative((p) => ({ ...p, instagramActorId: e.target.value }))}
                      disabled={submitting}
                    />
                  </Field>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="card" style={{ marginTop: 16, padding: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>Etapa 4 — Revisão</h2>
            <p style={{ marginTop: 8, marginBottom: 0, color: "#6b7280", fontWeight: 750 }}>
              Revise os dados antes de criar. Nada aqui permite `ACTIVE`.
            </p>

            {progress ? (
              <div className="card" style={{ marginTop: 14, padding: 14 }}>
                <div style={{ fontWeight: 950 }}>Executando lote...</div>
                <div style={{ marginTop: 6, fontWeight: 800, color: "#374151" }}>
                  {progress.currentCountryCode} ({(progress.currentIndex ?? 0) + 1}/{progress.total}) —{" "}
                  {progressStageLabel}
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 950, marginBottom: 10 }}>Campaign</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <SummaryRow label="name" value={campaign.name || "—"} />
                  <SummaryRow label="metaAdAccountId" value={campaign.metaAdAccountId || "—"} />
                  <SummaryRow label="objective" value={campaign.objective || "—"} />
                  <SummaryRow
                    label="countries"
                    value={
                      batchEnabled
                        ? `${selectedCountryCodes.length} selecionados`
                        : campaign.countryCode || "—"
                    }
                  />
                  <SummaryRow label="mode" value={campaign.mode || "—"} />
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 950, marginBottom: 10 }}>AdSet</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <SummaryRow label="name" value={adSet.name || "—"} />
                  <SummaryRow label="dailyBudgetCents" value={String(adSet.dailyBudgetCents)} />
                  <SummaryRow label="billingEvent" value={adSet.billingEvent || "—"} />
                  <SummaryRow label="optimizationGoal" value={adSet.optimizationGoal || "—"} />
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 950, marginBottom: 10 }}>Creative</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <SummaryRow
                    label="ads"
                    value={(() => {
                      const variants = getCreativeAdVariants();
                      const missing = variants.filter((v) => !normalizeNonEmptyString(v?.primaryText)).length;
                      return missing ? `5 (faltando texto em ${missing})` : "5 (ok)";
                    })()}
                  />
                  <SummaryRow label="destinationUrl" value={creative.destinationUrl || "—"} />
                  <SummaryRow label="ctaType" value={creative.ctaType || "—"} />
                  <SummaryRow label="translations" value={creative?.translationsRequired ? "ativas (revisar antes)" : "—"} />
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 950, marginBottom: 10 }}>Ad</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <SummaryRow label="name" value={ad.name || "—"} />
                  <SummaryRow label="creativeDraftId" value="será criado automaticamente" />
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 950, marginBottom: 10 }}>Copy por país</div>
                <div style={{ color: "#6b7280", fontWeight: 750, fontSize: 12 }}>
                  Mostra o que será enviado no Creative Draft por país e por Ad (A–E). BR usa sempre o texto base (PT-BR).
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {(batchEnabled ? selectedCountryCodes : [campaign.countryCode || "BR"]).map((code) => {
                    const cc = String(code || "").trim().toUpperCase();
                    return (
                      <div key={cc} className="card" style={{ padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 950 }}>{cc}</div>
                          <div style={{ color: "#6b7280", fontWeight: 850, fontSize: 12 }}>Ads A–E</div>
                        </div>
                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                          {AD_KEYS.map((k) => {
                            const info = resolveCopyForCountryAd(cc, k);
                            const primaryPreview = String(info.primaryText || "").slice(0, 90);
                            const headlinePreview = String(info.headline || "").slice(0, 90);
                            const descriptionPreview = String(info.description || "").slice(0, 90);
                            return (
                              <div key={k} className="card" style={{ padding: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                  <div style={{ fontWeight: 950 }}>{`Ad ${k}`}</div>
                                  <div style={{ color: "#6b7280", fontWeight: 850, fontSize: 12 }}>
                                    idioma: {info.language || "—"} • fonte: {info.source === "translation" ? "tradução" : "base"}
                                  </div>
                                </div>
                                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12 }}>primaryText</div>
                                    <div style={{ fontWeight: 850, fontSize: 12, color: "#111827", textAlign: "right" }}>
                                      {primaryPreview ? `${primaryPreview}${String(info.primaryText || "").length > 90 ? "…" : ""}` : "—"}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12 }}>headline</div>
                                    <div style={{ fontWeight: 850, fontSize: 12, color: "#111827", textAlign: "right" }}>
                                      {headlinePreview ? `${headlinePreview}${String(info.headline || "").length > 90 ? "…" : ""}` : "—"}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12 }}>description</div>
                                    <div style={{ fontWeight: 850, fontSize: 12, color: "#111827", textAlign: "right" }}>
                                      {descriptionPreview ? `${descriptionPreview}${String(info.description || "").length > 90 ? "…" : ""}` : "—"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 950, marginBottom: 10 }}>Vídeos por país (A–E)</div>
                <div style={{ color: "#6b7280", fontWeight: 750, fontSize: 12 }}>
                  País sem vídeo (A–E) será bloqueado no REAL (ou pulado no lote, com confirmação).
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {(batchEnabled ? selectedCountryCodes : [campaign.countryCode || "BR"]).map((code) => {
                    const cc = String(code || "").trim().toUpperCase();
                    return (
                      <div key={cc} className="card" style={{ padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 950 }}>{cc}</div>
                          <div style={{ color: "#6b7280", fontWeight: 900, fontSize: 12 }}>Ads A–E</div>
                        </div>
                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                          {AD_KEYS.map((k) => {
                            const info = resolveMediaForCountryAd(cc, k);
                            const previewUrl = info?.url ? `${getBackendBaseUrl()}${info.url}` : null;
                            const ok = info.status === "ok" && info.kind === "video" && info.thumbnailOk;
                            const statusLabel = ok
                              ? "OK"
                              : info.status !== "ok"
                                ? "FAIL — vídeo ausente"
                                : info.kind !== "video"
                                  ? "FAIL — asset inválido"
                                  : !info.thumbnailOk
                                    ? "FAIL — thumbnail ausente"
                                    : "FAIL";
                            const tone = ok ? "#065f46" : "#92400e";
                            const bg = ok ? "#ecfdf5" : "#fffbeb";
                            const border = ok ? "#a7f3d0" : "#fde68a";
                            return (
                              <div key={k} className="card" style={{ padding: 12, borderColor: border, background: bg }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                  <div style={{ fontWeight: 950 }}>{`Ad ${k}`}</div>
                                  <div style={{ color: tone, fontWeight: 900, fontSize: 12 }}>{statusLabel}</div>
                                </div>
                                <div style={{ marginTop: 8, color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
                                  vídeo: {info?.originalName ? info.originalName : info?.creativeAssetId ? "Asset selecionado" : "—"}
                                </div>
                                <div style={{ marginTop: 4, color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
                                  thumbnail:{" "}
                                  {info?.thumbnailOriginalName
                                    ? info.thumbnailOriginalName
                                    : info?.thumbnailCreativeAssetId
                                      ? "Asset selecionado"
                                      : "—"}
                                </div>
                                {ok && previewUrl ? (
                                  <div style={{ marginTop: 10 }}>
                                    <video
                                      src={previewUrl}
                                      controls
                                      style={{
                                        width: "100%",
                                        maxWidth: 640,
                                        borderRadius: 12,
                                        border: "1px solid #e5e7eb",
                                        display: "block",
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div style={{ marginTop: 10, color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
                                    {info?.mimeType ? `Tipo: ${info.mimeType}` : "—"}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {modeIsReal ? (
              <div className="card" style={{ marginTop: 16, padding: 14, borderColor: "#fde68a", background: "#fffbeb" }}>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 900, color: "#92400e" }}>
                  <input
                    type="checkbox"
                    checked={realConfirm}
                    disabled={submitting}
                    onChange={(e) => setRealConfirm(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  Confirmo que vou executar em modo REAL e que tudo será criado como PAUSED.
                </label>
              </div>
            ) : null}

            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="pillPrimary"
                disabled={submitting || (modeIsReal && !realConfirm)}
                onClick={runFlow}
              >
                {submitting
                  ? "Criando..."
                  : batchEnabled
                    ? `Criar lote (PAUSED) • ${selectedCountryCodes.length} países`
                    : "Criar tudo (PAUSED)"}
              </button>
              <button type="button" className="pillOutline" disabled={submitting} onClick={() => openMetaTest()}>
                Abrir /meta-test (debug)
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="card" style={{ marginTop: 16, padding: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>Etapa 5 — Resultado</h2>

            {error ? (
              <div className="card" style={{ marginTop: 16, padding: 16, borderColor: "#fecaca", color: "#991b1b" }}>
                <div style={{ fontWeight: 950 }}>Falha</div>
                <div style={{ marginTop: 6, fontWeight: 750 }}>{error}</div>
                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" className="pillOutline" onClick={() => openMetaTest()}>
                    Abrir /meta-test (debug)
                  </button>
                  <button type="button" className="pillOutline" onClick={() => setStep(0)}>
                    Recomeçar
                  </button>
                </div>
              </div>
            ) : null}

            {result ? (
              <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                {result.type === "single" ? (
                  <>
                    <div className="card" style={{ padding: 16 }}>
                      <div style={{ fontWeight: 950, marginBottom: 10 }}>IDs criados</div>
                      <div style={{ display: "grid", gap: 10 }}>
                        <SummaryRow label="mode" value={result.mode || "—"} />
                        <SummaryRow label="countryCode" value={result.countryCode || "—"} />
                        <SummaryRow label="generatedCampaignId" value={result.generatedCampaignId ?? "—"} />
                        <SummaryRow label="metaCampaignId" value={result.metaCampaignId ?? "—"} />
                        <SummaryRow label="metaAdSetId" value={result.metaAdSetId ?? "—"} />
                        <SummaryRow label="creativeDraftId" value={result.creativeDraftId ?? "—"} />
                        <SummaryRow label="metaCreativeId" value={result.metaCreativeId ?? "—"} />
                        <SummaryRow label="metaAdId" value={result.metaAdId ?? "—"} />
                      </div>
                    </div>

                    <div className="card" style={{ padding: 16 }}>
                      <div style={{ fontWeight: 950, marginBottom: 10 }}>Status (quando disponível)</div>
                      <div style={{ display: "grid", gap: 10 }}>
                        <SummaryRow label="ad.effective_status" value={result.metaAdEffectiveStatus ?? "—"} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="pillOutline"
                        onClick={() =>
                          openMetaTest({
                            generatedCampaignId: result.generatedCampaignId,
                            countryCode: result.countryCode,
                            mode: result.mode,
                          })
                        }
                      >
                        Abrir /meta-test (debug)
                      </button>
                      <button
                        type="button"
                        className="pillOutline"
                        onClick={() =>
                          copySummaryToClipboard({
                            mode: result.mode,
                            countryCode: result.countryCode,
                            generatedCampaignId: result.generatedCampaignId ?? null,
                            metaCampaignId: result.metaCampaignId ?? null,
                            metaAdSetId: result.metaAdSetId ?? null,
                            metaCreativeId: result.metaCreativeId ?? null,
                            metaAdId: result.metaAdId ?? null,
                            metaAdEffectiveStatus: result.metaAdEffectiveStatus ?? null,
                            createdAt: result.createdAt,
                          })
                        }
                      >
                        Copiar resumo (curto)
                      </button>
                      <button type="button" className="pillOutline" onClick={() => copySummaryToClipboard(result)}>
                        Copiar JSON completo
                      </button>
                      {result.generatedCampaignId ? (
                        <button
                          type="button"
                          className="pillOutline"
                          onClick={() =>
                            saveAsCampaignTemplate(result.generatedCampaignId, {
                              suggestedName: `${campaign.name || "Template"} • ${result.countryCode || ""}`.trim(),
                            })
                          }
                        >
                          Salvar como template
                        </button>
                      ) : null}
                      <button type="button" className="pillOutline" onClick={() => setStep(0)}>
                        Criar outra
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="card" style={{ padding: 16 }}>
                      <div style={{ fontWeight: 950, marginBottom: 10 }}>Resumo do lote</div>
                      <div style={{ display: "grid", gap: 10 }}>
                        <SummaryRow label="mode" value={result.mode || "—"} />
                        <SummaryRow
                          label="success"
                          value={String((result.perCountry || []).filter((r) => r.ok).length)}
                        />
                        <SummaryRow
                          label="failed"
                          value={String((result.perCountry || []).filter((r) => !r.ok).length)}
                        />
                      </div>
                      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="pillOutline"
                          onClick={() =>
                            copySummaryToClipboard({
                              mode: result.mode,
                              success: (result.perCountry || []).filter((r) => r.ok).length,
                              failed: (result.perCountry || []).filter((r) => !r.ok).length,
                              perCountry: (result.perCountry || []).map((r) => ({
                                ok: r.ok,
                                countryCode: r.countryCode,
                                generatedCampaignId: r.generatedCampaignId ?? null,
                                metaCampaignId: r.metaCampaignId ?? null,
                                metaAdSetId: r.metaAdSetId ?? null,
                                metaCreativeId: r.metaCreativeId ?? null,
                                metaAdId: r.metaAdId ?? null,
                                error: r.ok ? null : r.error ?? "Falha",
                              })),
                              createdAt: result.createdAt,
                            })
                          }
                        >
                          Copiar resumo (curto)
                        </button>
                        <button
                          type="button"
                          className="pillOutline"
                          onClick={() => copySummaryToClipboard(result)}
                        >
                          Copiar JSON completo
                        </button>
                        <button type="button" className="pillOutline" onClick={() => setStep(0)}>
                          Novo lote
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      {(result.perCountry || []).map((r) => (
                        <div
                          key={r.countryCode}
                          className="card"
                          style={{
                            padding: 16,
                            borderColor: r.ok ? "#bbf7d0" : "#fecaca",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 950 }}>
                              {r.label || r.countryCode} — {r.ok ? "OK" : "ERRO"}
                            </div>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              {r.generatedCampaignId ? (
                                <button
                                  type="button"
                                  className="pillOutline"
                                  onClick={() =>
                                    openMetaTest({
                                      generatedCampaignId: r.generatedCampaignId,
                                      countryCode: r.countryCode,
                                      mode: result.mode,
                                    })
                                  }
                                >
                                  Abrir /meta-test
                                </button>
                              ) : null}
                              {r.ok && r.generatedCampaignId ? (
                                <button
                                  type="button"
                                  className="pillOutline"
                                  onClick={() =>
                                    saveAsCampaignTemplate(r.generatedCampaignId, {
                                      suggestedName: `${campaign.name || "Template"} • ${r.countryCode || ""}`.trim(),
                                    })
                                  }
                                >
                                  Salvar como template
                                </button>
                              ) : null}
                            </div>
                          </div>

                          {r.ok ? (
                            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                              <SummaryRow label="generatedCampaignId" value={r.generatedCampaignId ?? "—"} />
                              <SummaryRow label="metaCampaignId" value={r.metaCampaignId ?? "—"} />
                              <SummaryRow label="metaAdSetId" value={r.metaAdSetId ?? "—"} />
                              <SummaryRow label="creativeDraftId" value={r.creativeDraftId ?? "—"} />
                              <SummaryRow label="metaCreativeId" value={r.metaCreativeId ?? "—"} />
                              <SummaryRow label="metaAdId" value={r.metaAdId ?? "—"} />
                            </div>
                          ) : (
                            <div style={{ marginTop: 10, fontWeight: 850, color: "#991b1b" }}>
                              {r.error || "Falha"}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="pillOutline"
            disabled={submitting || step === 0 || step === 4}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Voltar
          </button>
          <button
            type="button"
            className="pillPrimary"
            disabled={!canGoNext || step >= 3 || step === 4}
            onClick={() => setStep((s) => Math.min(3, s + 1))}
          >
            Próximo
          </button>
        </div>
      </div>
    </PageShell>
  );
}
