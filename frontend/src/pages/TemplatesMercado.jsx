import PageShell from "../components/PageShell.jsx";
import StatusPill from "../components/StatusPill.jsx";
import AdvancedDisclosure from "../components/AdvancedDisclosure.jsx";
import { useEffect, useMemo, useState } from "react";
import { generateCampaignTemplateTranslationsByMarket } from "../services/campaignTemplates.js";
import { createFlowTemplate, listFlowTemplates, updateFlowTemplate } from "../services/flowTemplates.js";
import { createOperationalMarketGeneration } from "../services/generatedCampaigns.js";
import { listMetaAccounts } from "../services/metaAccounts.js";
import {
  publishOperationalAd,
  publishOperationalAdSet,
  publishOperationalCampaign,
  publishOperationalCreative,
  syncOperationalMetaStatus,
} from "../services/operationalMarketGenerations.js";
import { OPERATIONAL_MARKETS } from "../utils/operationalMarkets.js";

const DEFAULT_MARKETS = ["ARM", "AREU", "ENCA"];
const DEFAULT_TEMPLATE_FORM = {
  name: "",
  nicheParam: "",
  destinationUrl: "",
  adVariants: [{ primaryText: "", headline: "", description: "" }],
};

function normalizeNonEmptyString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeJson(value) {
  return JSON.stringify(value ?? null, null, 2);
}

function getAdVariantsCount(template) {
  const payload = template?.payload && typeof template.payload === "object" && !Array.isArray(template.payload) ? template.payload : {};
  return Array.isArray(payload?.adVariants) ? payload.adVariants.length : 0;
}

function getTemplatePayload(template) {
  return template?.payload && typeof template.payload === "object" && !Array.isArray(template.payload) ? template.payload : {};
}

function getTemplateNiche(template) {
  const payload = getTemplatePayload(template);
  const operationalMarket = payload?.operationalMarket && typeof payload.operationalMarket === "object" ? payload.operationalMarket : {};
  const campaign = payload?.campaign && typeof payload.campaign === "object" ? payload.campaign : {};
  return (
    normalizeNonEmptyString(operationalMarket?.nicheParam) ||
    normalizeNonEmptyString(operationalMarket?.niche) ||
    normalizeNonEmptyString(payload?.nicheParam) ||
    normalizeNonEmptyString(payload?.niche) ||
    normalizeNonEmptyString(payload?.slug) ||
    normalizeNonEmptyString(campaign?.nicheParam) ||
    normalizeNonEmptyString(campaign?.niche) ||
    ""
  );
}

function getTemplateDestinationUrl(template) {
  const payload = getTemplatePayload(template);
  const creative = payload?.creative && typeof payload.creative === "object" ? payload.creative : {};
  return normalizeNonEmptyString(payload?.destinationUrl) || normalizeNonEmptyString(creative?.destinationUrl) || "";
}

function normalizeAdVariants(adVariants) {
  const list = Array.isArray(adVariants) ? adVariants : [];
  return list
    .map((variant) => ({
      primaryText: normalizeNonEmptyString(variant?.primaryText),
      headline: normalizeNonEmptyString(variant?.headline),
      description: normalizeNonEmptyString(variant?.description),
    }))
    .filter((variant) => variant.primaryText || variant.headline || variant.description);
}

function formFromTemplate(template) {
  const payload = getTemplatePayload(template);
  const variants = Array.isArray(payload?.adVariants) && payload.adVariants.length
    ? payload.adVariants.map((variant) => ({
        primaryText: normalizeNonEmptyString(variant?.primaryText),
        headline: normalizeNonEmptyString(variant?.headline),
        description: normalizeNonEmptyString(variant?.description),
      }))
    : [{ primaryText: "", headline: "", description: "" }];

  return {
    name: template?.name || "",
    nicheParam: getTemplateNiche(template),
    destinationUrl: getTemplateDestinationUrl(template),
    adVariants: variants,
  };
}

function buildTemplatePayload(form, basePayload = {}) {
  const nicheParam = normalizeNonEmptyString(form?.nicheParam);
  const destinationUrl = normalizeNonEmptyString(form?.destinationUrl);
  const adVariants = normalizeAdVariants(form?.adVariants);
  const base = basePayload && typeof basePayload === "object" && !Array.isArray(basePayload) ? basePayload : {};
  const campaign = base?.campaign && typeof base.campaign === "object" && !Array.isArray(base.campaign) ? base.campaign : {};
  const creative = base?.creative && typeof base.creative === "object" && !Array.isArray(base.creative) ? base.creative : {};

  return {
    ...base,
    nicheParam,
    niche: nicheParam,
    slug: nicheParam,
    operationalMarket: {
      ...(base?.operationalMarket && typeof base.operationalMarket === "object" ? base.operationalMarket : {}),
      nicheParam,
      niche: nicheParam,
    },
    campaign: {
      ...campaign,
      name: normalizeNonEmptyString(form?.name) || campaign?.name || "",
      nicheParam,
      niche: nicheParam,
    },
    destinationUrl,
    ctaType: base?.ctaType || "LEARN_MORE",
    creative: {
      ...creative,
      destinationUrl,
      ctaType: creative?.ctaType || base?.ctaType || "LEARN_MORE",
    },
    adVariants,
  };
}

function formatBackendError(err) {
  const body = err?.body && typeof err.body === "object" ? err.body : null;
  if (!body) return err?.message ? String(err.message) : "Falha ao executar etapa.";

  const message =
    body?.error?.message ||
    body?.message ||
    err?.message ||
    "Falha ao executar etapa.";
  const details = body?.error?.details ?? body?.details ?? null;
  const errors = Array.isArray(details?.errors) ? details.errors : [];
  if (errors.length) return `${message}: ${errors.join("; ")}`;
  return `${message}\n${safeJson(body)}`;
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
    step: "operational_generated",
    ok: true,
    error: "",
    lastResult: row,
  };
}

function mergeResult(row, result, step) {
  const meta = result?.meta && typeof result.meta === "object" ? result.meta : {};
  const persisted = result?.persisted && typeof result.persisted === "object" ? result.persisted : {};
  const generatedCampaign = persisted?.generatedCampaign || result?.generatedCampaign || {};
  const generatedAdSet = persisted?.generatedAdSet || {};
  const generatedAd = persisted?.generatedAd || {};
  const adMeta = meta?.ad || {};
  const adSetMeta = meta?.adSet || {};
  const campaignMeta = meta?.campaign || {};

  return {
    ...row,
    metaCampaignId: result?.metaCampaignId || campaignMeta?.id || generatedCampaign?.meta_campaign_id || row.metaCampaignId || "",
    metaAdSetId: result?.metaAdSetId || adSetMeta?.id || generatedCampaign?.meta_adset_id || generatedAdSet?.meta_adset_id || row.metaAdSetId || "",
    metaCreativeId: result?.metaCreativeId || meta?.creative?.id || row.metaCreativeId || "",
    metaAdId: result?.metaAdId || adMeta?.id || generatedCampaign?.meta_ad_id || generatedAd?.meta_ad_id || row.metaAdId || "",
    configuredStatus:
      adMeta?.configured_status ||
      adMeta?.status ||
      generatedAd?.configured_status ||
      adSetMeta?.status ||
      generatedAdSet?.configured_status ||
      campaignMeta?.status ||
      generatedCampaign?.meta_status ||
      result?.status ||
      row.configuredStatus ||
      "",
    effectiveStatus:
      adMeta?.effective_status ||
      generatedAd?.effective_status ||
      adSetMeta?.effective_status ||
      generatedAdSet?.effective_status ||
      campaignMeta?.effective_status ||
      generatedCampaign?.meta_effective_status ||
      row.effectiveStatus ||
      "",
    step,
    ok: true,
    error: "",
    lastResult: result,
  };
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontWeight: 900 }}>{label}</span>
      {children}
      {hint ? <span className="muted" style={{ fontWeight: 750, fontSize: 12 }}>{hint}</span> : null}
    </label>
  );
}

export default function TemplatesMercado() {
  const [templates, setTemplates] = useState([]);
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState(DEFAULT_MARKETS);
  const [metaAccountId, setMetaAccountId] = useState("");
  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [pageId, setPageId] = useState("");
  const [instagramActorId, setInstagramActorId] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [dailyBudgetCents, setDailyBudgetCents] = useState(1000);
  const [billingEvent, setBillingEvent] = useState("IMPRESSIONS");
  const [optimizationGoal, setOptimizationGoal] = useState("REACH");
  const [overwriteTranslations, setOverwriteTranslations] = useState(false);
  const [rows, setRows] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [templateForm, setTemplateForm] = useState(DEFAULT_TEMPLATE_FORM);
  const [busyStep, setBusyStep] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.allSettled([listFlowTemplates({ limit: 200 }), listMetaAccounts()]).then(([templateRes, accountRes]) => {
      if (!alive) return;
      const nextTemplates = templateRes.status === "fulfilled" ? templateRes.value?.flowTemplates ?? [] : [];
      const nextAccounts = accountRes.status === "fulfilled" ? accountRes.value?.metaAccounts ?? [] : [];
      setTemplates(nextTemplates);
      setMetaAccounts(nextAccounts);
      const defaultAccount = nextAccounts.find((a) => a.isDefault) ?? nextAccounts[0] ?? null;
      if (defaultAccount) {
        setMetaAccountId(String(defaultAccount.id || ""));
        setMetaAdAccountId(defaultAccount.metaAdAccountId || "");
        setPageId(defaultAccount.metaPageId || "");
        setInstagramActorId(defaultAccount.metaInstagramActorId || "");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((t) => String(t.id) === String(templateId)) ?? null,
    [templates, templateId],
  );
  const selectedSet = useMemo(() => new Set(selectedMarkets), [selectedMarkets]);
  const canUseTemplate = Boolean(templateId);
  const canUseRows = rows.length > 0;

  async function refreshTemplates({ selectId } = {}) {
    const res = await listFlowTemplates({ limit: 200 });
    const nextTemplates = res.flowTemplates ?? [];
    setTemplates(nextTemplates);
    const nextSelected = nextTemplates.find((template) => String(template.id) === String(selectId || templateId)) ?? null;
    if (nextSelected) {
      setTemplateId(String(nextSelected.id));
      setTemplateForm(formFromTemplate(nextSelected));
    }
    return nextTemplates;
  }

  function selectTemplate(id) {
    setTemplateId(id);
    const template = templates.find((item) => String(item.id) === String(id)) ?? null;
    setTemplateForm(template ? formFromTemplate(template) : DEFAULT_TEMPLATE_FORM);
  }

  function updateVariant(index, field, value) {
    setTemplateForm((prev) => {
      const list = Array.isArray(prev.adVariants) ? [...prev.adVariants] : [];
      const current = list[index] && typeof list[index] === "object" ? list[index] : {};
      list[index] = { ...current, [field]: value };
      return { ...prev, adVariants: list };
    });
  }

  function addVariant() {
    setTemplateForm((prev) => ({
      ...prev,
      adVariants: [...(Array.isArray(prev.adVariants) ? prev.adVariants : []), { primaryText: "", headline: "", description: "" }],
    }));
  }

  function removeVariant(index) {
    setTemplateForm((prev) => {
      const list = (Array.isArray(prev.adVariants) ? prev.adVariants : []).filter((_, idx) => idx !== index);
      return { ...prev, adVariants: list.length ? list : [{ primaryText: "", headline: "", description: "" }] };
    });
  }

  async function saveTemplate() {
    await runStep("template", async () => {
      const name = normalizeNonEmptyString(templateForm.name);
      if (!name) throw new Error("Informe o nome do template.");
      if (!normalizeNonEmptyString(templateForm.nicheParam)) throw new Error("Informe o nicho / slug operacional.");
      if (!normalizeNonEmptyString(templateForm.destinationUrl)) throw new Error("Informe a Destination URL.");
      const adVariants = normalizeAdVariants(templateForm.adVariants);
      if (!adVariants.length) throw new Error("Este template ainda não possui variações de anúncio. Cadastre pelo menos uma variação para gerar traduções.");

      const basePayload = selectedTemplate ? getTemplatePayload(selectedTemplate) : {};
      const payload = buildTemplatePayload({ ...templateForm, adVariants }, basePayload);
      const res = templateId
        ? await updateFlowTemplate(templateId, { name, payload })
        : await createFlowTemplate({ name, payload });
      const saved = res.flowTemplate;
      await refreshTemplates({ selectId: saved?.id });
      setNotice(`Template salvo: ${saved?.name || name}.`);
    });
  }

  function updateRow(id, updater) {
    setRows((prev) => prev.map((row) => (String(row.id) === String(id) ? updater(row) : row)));
  }

  function markRowError(id, err, step) {
    updateRow(id, (row) => ({
      ...row,
      step,
      ok: false,
      error: formatBackendError(err),
      lastResult: err?.body ?? null,
    }));
  }

  function applyMetaAccount(id) {
    const account = metaAccounts.find((a) => String(a.id) === String(id)) ?? null;
    setMetaAccountId(id);
    if (account?.metaAdAccountId) setMetaAdAccountId(account.metaAdAccountId);
    if (account?.metaPageId) setPageId(account.metaPageId);
    if (account?.metaInstagramActorId) setInstagramActorId(account.metaInstagramActorId);
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

  async function handleGenerateTranslations() {
    await runStep("translations", async () => {
      if (!canUseTemplate) throw new Error("Selecione um template.");
      if (getAdVariantsCount(selectedTemplate) === 0) {
        throw new Error("Este template não possui variações de anúncio para traduzir.");
      }
      const markets = Array.from(
        new Set(
          (Array.isArray(selectedMarkets) ? selectedMarkets : [])
            .map((market) => String(market || "").trim().toUpperCase())
            .filter(Boolean)
        )
      );
      if (!markets.length) throw new Error("Selecione ao menos um mercado.");
      const res = await generateCampaignTemplateTranslationsByMarket(templateId, {
        markets,
        overwrite: Boolean(overwriteTranslations),
      });
      await refreshTemplates({ selectId: templateId });
      setNotice(`Traduções geradas: ${res.generated.length}. Preservadas: ${res.preserved.length}.`);
    });
  }

  async function handleGenerateOperational() {
    await runStep("operational", async () => {
      if (!canUseTemplate) throw new Error("Selecione um template.");
      const markets = Array.from(new Set((selectedMarkets || []).map((market) => String(market || "").trim().toUpperCase()).filter(Boolean)));
      if (!markets.length) throw new Error("Selecione ao menos um mercado.");
      const res = await createOperationalMarketGeneration({ templateId, markets });
      setCampaignId(res.campaign?.id ?? "");
      setRows((res.operationalMarketGenerations || []).map(mapGeneration));
      setNotice(`Operacional gerado: ${(res.operationalMarketGenerations || []).length} mercado(s).`);
    });
  }

  async function runRows(step, handler) {
    if (!rows.length) throw new Error("Gere o operacional antes de publicar.");
    for (const row of rows) {
      if (!row.id) continue;
      updateRow(row.id, (current) => ({ ...current, step: `${step}_running`, error: "" }));
      try {
        const result = await handler(row);
        updateRow(row.id, (current) => mergeResult(current, result, step));
      } catch (err) {
        markRowError(row.id, err, step);
      }
    }
  }

  async function handlePublishCampaigns() {
    await runStep("campaign", async () => {
      if (!normalizeNonEmptyString(metaAdAccountId)) throw new Error("Informe a Conta de anúncio Meta.");
      await runRows("campaign_published", (row) =>
        publishOperationalCampaign(row.id, { metaAdAccountId, objective }),
      );
    });
  }

  async function handlePublishAdSets() {
    await runStep("adset", async () => {
      await runRows("adset_published", (row) =>
        publishOperationalAdSet(row.id, {
          dailyBudgetCents: Number(dailyBudgetCents),
          billingEvent,
          optimizationGoal,
        }),
      );
    });
  }

  async function handlePublishCreatives() {
    await runStep("creative", async () => {
      await runRows("creative_published", (row) =>
        publishOperationalCreative(row.id, {
          pageId,
          instagramActorId,
          ctaType: "LEARN_MORE",
        }),
      );
    });
  }

  async function handlePublishAds() {
    await runStep("ad", async () => {
      await runRows("ad_published", (row) => publishOperationalAd(row.id));
    });
  }

  async function handleSyncStatus() {
    await runStep("sync", async () => {
      await runRows("status_synced", (row) => syncOperationalMetaStatus(row.id));
    });
  }

  return (
    <PageShell
      title="Templates por Mercado"
      subtitle="Fluxo operacional por mercado, sempre em PAUSED."
      backFallbackTo="/"
    >
      <div className="card" style={{ padding: 16, borderColor: "#fde68a", background: "#fffbeb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 950, color: "#92400e" }}>Guardrail operacional</div>
            <div style={{ marginTop: 5, fontWeight: 800, color: "#92400e", fontSize: 13 }}>
              Esta tela reutiliza endpoints existentes e publica Campaign, AdSet e Ad como PAUSED.
            </div>
          </div>
          <StatusPill tone="warn">REAL = PAUSED</StatusPill>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: 14, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ fontWeight: 900 }}>Erro</div>
          <div style={{ marginTop: 6, fontWeight: 750 }}>{error}</div>
        </div>
      ) : null}

      {notice ? (
        <div className="card" style={{ padding: 14, borderColor: "#bfdbfe", color: "#1d4ed8" }}>
          <div style={{ fontWeight: 900 }}>{notice}</div>
        </div>
      ) : null}

      <section className="card" style={{ padding: 18 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <Field label="1. Selecionar Template">
            <select value={templateId} onChange={(e) => selectTemplate(e.target.value)} disabled={Boolean(busyStep)}>
              <option value="">Selecione...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name || template.id}
                </option>
              ))}
            </select>
          </Field>

          <div className="card" style={{ padding: 14, borderColor: "#e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 950 }}>Criar / editar template operacional</div>
                <div className="muted" style={{ marginTop: 4, fontWeight: 800, fontSize: 12 }}>
                  Fonte real: os mesmos templates de /templates.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="pillOutline"
                  disabled={Boolean(busyStep)}
                  onClick={() => {
                    setTemplateId("");
                    setTemplateForm(DEFAULT_TEMPLATE_FORM);
                  }}
                >
                  Novo
                </button>
                <button type="button" className="pillPrimary" disabled={Boolean(busyStep)} onClick={saveTemplate}>
                  {busyStep === "template" ? "Salvando..." : templateId ? "Salvar alterações" : "Criar template"}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <Field label="Nome do template">
                <input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Plantas BTN"
                  disabled={Boolean(busyStep)}
                />
              </Field>
              <Field label="Nicho / slug operacional">
                <input
                  value={templateForm.nicheParam}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, nicheParam: e.target.value }))}
                  placeholder="PlantasBTN"
                  disabled={Boolean(busyStep)}
                />
              </Field>
              <Field label="Destination URL">
                <input
                  value={templateForm.destinationUrl}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, destinationUrl: e.target.value }))}
                  placeholder="https://example.com/plants"
                  disabled={Boolean(busyStep)}
                />
              </Field>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 950 }}>adVariants</div>
                <button type="button" className="pillOutline" disabled={Boolean(busyStep)} onClick={addVariant}>
                  Adicionar variação
                </button>
              </div>
              {(templateForm.adVariants || []).map((variant, index) => (
                <div key={index} className="card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 950 }}>Variação {index + 1}</div>
                    <button type="button" className="pillOutline" disabled={Boolean(busyStep)} onClick={() => removeVariant(index)}>
                      Remover
                    </button>
                  </div>
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    <Field label="primaryText">
                      <textarea
                        value={variant.primaryText || ""}
                        onChange={(e) => updateVariant(index, "primaryText", e.target.value)}
                        rows={3}
                        disabled={Boolean(busyStep)}
                      />
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                      <Field label="headline">
                        <input
                          value={variant.headline || ""}
                          onChange={(e) => updateVariant(index, "headline", e.target.value)}
                          disabled={Boolean(busyStep)}
                        />
                      </Field>
                      <Field label="description">
                        <input
                          value={variant.description || ""}
                          onChange={(e) => updateVariant(index, "description", e.target.value)}
                          disabled={Boolean(busyStep)}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedTemplate ? (
            <div className="card" style={{ padding: 12, borderColor: getAdVariantsCount(selectedTemplate) ? "#bfdbfe" : "#fecaca" }}>
              <div style={{ fontWeight: 900 }}>
                Template selecionado: {selectedTemplate.name || selectedTemplate.id} • adVariants: {getAdVariantsCount(selectedTemplate)}
              </div>
              {getAdVariantsCount(selectedTemplate) === 0 ? (
                <div style={{ marginTop: 6, color: "#991b1b", fontWeight: 850 }}>
                  Este template ainda não possui variações de anúncio. Cadastre pelo menos uma variação para gerar traduções.
                </div>
              ) : null}
            </div>
          ) : null}

          <Field label="2. Selecionar Mercados">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="pillOutline" disabled={Boolean(busyStep)} onClick={() => setSelectedMarkets(DEFAULT_MARKETS)}>
                Padrão
              </button>
              <button type="button" className="pillOutline" disabled={Boolean(busyStep)} onClick={() => setSelectedMarkets(OPERATIONAL_MARKETS.map((m) => m.code))}>
                Todos
              </button>
              <button type="button" className="pillOutline" disabled={Boolean(busyStep)} onClick={() => setSelectedMarkets([])}>
                Limpar
              </button>
            </div>
            <div style={{ marginTop: 10, maxHeight: 260, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
                {OPERATIONAL_MARKETS.map((market) => (
                  <label
                    key={market.code}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      padding: 10,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      background: selectedSet.has(market.code) ? "#eff6ff" : "#fff",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSet.has(market.code)}
                      disabled={Boolean(busyStep)}
                      onChange={() => toggleMarket(market.code)}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      <span style={{ display: "block", fontWeight: 950 }}>{market.code}</span>
                      <span className="muted" style={{ display: "block", fontWeight: 800 }}>{market.name}</span>
                      <span className="muted" style={{ display: "block", fontWeight: 750 }}>{market.language}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </Field>
        </div>
      </section>

      <section className="card" style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <Field label="Conta Meta">
            <select value={metaAccountId} onChange={(e) => applyMetaAccount(e.target.value)} disabled={Boolean(busyStep)}>
              <option value="">Manual</option>
              {metaAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name || account.metaAdAccountId || account.id}{account.isDefault ? " • padrão" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="metaAdAccountId">
            <input value={metaAdAccountId} onChange={(e) => setMetaAdAccountId(e.target.value)} placeholder="act_..." disabled={Boolean(busyStep)} />
          </Field>
          <Field label="pageId">
            <input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Página Meta" disabled={Boolean(busyStep)} />
          </Field>
          <Field label="instagramActorId">
            <input value={instagramActorId} onChange={(e) => setInstagramActorId(e.target.value)} placeholder="Opcional" disabled={Boolean(busyStep)} />
          </Field>
          <Field label="Objective">
            <select value={objective} onChange={(e) => setObjective(e.target.value)} disabled={Boolean(busyStep)}>
              <option value="OUTCOME_TRAFFIC">OUTCOME_TRAFFIC</option>
              <option value="OUTCOME_LEADS">OUTCOME_LEADS</option>
              <option value="OUTCOME_SALES">OUTCOME_SALES</option>
            </select>
          </Field>
          <Field label="Daily budget cents">
            <input type="number" min="100" value={dailyBudgetCents} onChange={(e) => setDailyBudgetCents(e.target.value)} disabled={Boolean(busyStep)} />
          </Field>
          <Field label="Billing event">
            <select value={billingEvent} onChange={(e) => setBillingEvent(e.target.value)} disabled={Boolean(busyStep)}>
              <option value="IMPRESSIONS">IMPRESSIONS</option>
              <option value="LINK_CLICKS">LINK_CLICKS</option>
            </select>
          </Field>
          <Field label="Optimization goal">
            <select value={optimizationGoal} onChange={(e) => setOptimizationGoal(e.target.value)} disabled={Boolean(busyStep)}>
              <option value="REACH">REACH</option>
              <option value="LINK_CLICKS">LINK_CLICKS</option>
              <option value="OFFSITE_CONVERSIONS">OFFSITE_CONVERSIONS</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 900 }}>
            <input
              type="checkbox"
              checked={overwriteTranslations}
              onChange={(e) => setOverwriteTranslations(e.target.checked)}
              disabled={Boolean(busyStep)}
            />
            Sobrescrever traduções
          </label>
          <button type="button" className="pillOutline" disabled={Boolean(busyStep) || !canUseTemplate} onClick={handleGenerateTranslations}>
            {busyStep === "translations" ? "Gerando..." : "3. Gerar Traduções"}
          </button>
          <button type="button" className="pillOutline" disabled={Boolean(busyStep) || !canUseTemplate} onClick={handleGenerateOperational}>
            {busyStep === "operational" ? "Gerando..." : "4. Gerar Operacional"}
          </button>
          <button type="button" className="pillOutline" disabled={Boolean(busyStep) || !canUseRows} onClick={handlePublishCampaigns}>
            5. Publicar Campaign
          </button>
          <button type="button" className="pillOutline" disabled={Boolean(busyStep) || !canUseRows} onClick={handlePublishAdSets}>
            6. Publicar AdSet
          </button>
          <button type="button" className="pillOutline" disabled={Boolean(busyStep) || !canUseRows} onClick={handlePublishCreatives}>
            7. Publicar Creative
          </button>
          <button type="button" className="pillOutline" disabled={Boolean(busyStep) || !canUseRows} onClick={handlePublishAds}>
            8. Publicar Ad
          </button>
          <button type="button" className="pillPrimary" disabled={Boolean(busyStep) || !canUseRows} onClick={handleSyncStatus}>
            9. Sincronizar Status
          </button>
        </div>
        {busyStep ? <div className="muted" style={{ marginTop: 10, fontWeight: 850 }}>Executando: {busyStep}</div> : null}
        {campaignId ? <div className="monoTag" style={{ marginTop: 12 }}>campaign_id: {campaignId}</div> : null}
      </section>

      <section className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="dataTable" style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th>Mercado</th>
              <th>market_param</th>
              <th>meta_campaign_id</th>
              <th>meta_adset_id</th>
              <th>meta_creative_id</th>
              <th>meta_ad_id</th>
              <th>configured_status</th>
              <th>effective_status</th>
              <th>Etapa</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div style={{ display: "grid", gap: 4 }}>
                    <span className="monoTag">{row.marketCode || "—"}</span>
                    <span className="muted" style={{ fontWeight: 800, fontSize: 12 }}>{row.marketName || "—"}</span>
                  </div>
                </td>
                <td><span className="monoTag">{row.marketParam || "—"}</span></td>
                <td><span className="monoTag">{row.metaCampaignId || "—"}</span></td>
                <td><span className="monoTag">{row.metaAdSetId || "—"}</span></td>
                <td><span className="monoTag">{row.metaCreativeId || "—"}</span></td>
                <td><span className="monoTag">{row.metaAdId || "—"}</span></td>
                <td>{row.configuredStatus || "—"}</td>
                <td>{row.effectiveStatus || "—"}</td>
                <td>
                  <StatusPill tone={row.ok ? "info" : "bad"}>{row.error ? "erro" : row.step || "—"}</StatusPill>
                  {row.error ? <div style={{ marginTop: 6, color: "#991b1b", fontWeight: 800 }}>{row.error}</div> : null}
                </td>
                <td>
                  <AdvancedDisclosure summary="JSON" defaultOpen={false}>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{safeJson(row.lastResult)}</pre>
                  </AdvancedDisclosure>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={10} className="muted" style={{ fontWeight: 800 }}>
                  Nenhum mercado operacional gerado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </PageShell>
  );
}
