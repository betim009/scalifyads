import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCountries } from "../services/reference.js";
import { createMetaCampaignSimple } from "../services/metaCampaigns.js";
import { createMetaAdSet } from "../services/metaAdSets.js";
import { createCreativeDraft } from "../services/creativeDrafts.js";
import { publishMetaCreativeDraft } from "../services/metaCreatives.js";
import { createMetaAd } from "../services/metaAds.js";

const DEFAULTS = {
  campaign: {
    name: "",
    metaAdAccountId: "",
    objective: "OUTCOME_TRAFFIC",
    countryCode: "BR",
    mode: "STUB",
  },
  adSet: {
    name: "AdSet • BR",
    dailyBudgetCents: 1000,
    billingEvent: "IMPRESSIONS",
    optimizationGoal: "LINK_CLICKS",
  },
  creative: {
    primaryText: "",
    headline: "",
    description: "",
    destinationUrl: "",
    ctaType: "LEARN_MORE",
    pageId: "",
    instagramActorId: "",
  },
  ad: {
    name: "Ad • BR — 1",
  },
};

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
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

export default function CampaignFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [countries, setCountries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [campaign, setCampaign] = useState(DEFAULTS.campaign);
  const [adSet, setAdSet] = useState(DEFAULTS.adSet);
  const [creative, setCreative] = useState(DEFAULTS.creative);
  const [ad, setAd] = useState(DEFAULTS.ad);

  const [result, setResult] = useState(null);

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

  const countryOptions = useMemo(() => {
    const opts = (countries || []).map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));
    if (!opts.find((o) => o.value === "BR")) opts.unshift({ value: "BR", label: "BR — Brasil" });
    return [{ value: "", label: "Selecione...", disabled: true }, ...opts];
  }, [countries]);

  const canGoNext = useMemo(() => {
    if (submitting) return false;
    if (step === 0) {
      return (
        normalizeNonEmptyString(campaign.name) &&
        normalizeNonEmptyString(campaign.metaAdAccountId) &&
        normalizeNonEmptyString(campaign.objective) &&
        normalizeNonEmptyString(campaign.countryCode) &&
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
      return (
        normalizeNonEmptyString(creative.primaryText) &&
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

  function openMetaTest() {
    const params = new URLSearchParams();
    if (normalizeNonEmptyString(campaign.name)) params.set("name", campaign.name);
    if (normalizeNonEmptyString(creative.destinationUrl)) params.set("destinationUrl", creative.destinationUrl);
    if (normalizeNonEmptyString(result?.generatedCampaign?.id)) params.set("generatedCampaignId", result.generatedCampaign.id);
    navigate(`/meta-test?${params.toString()}`);
  }

  async function runFlow() {
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
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

      const draftRes = await createCreativeDraft({
        generatedCampaignId,
        primaryText: creative.primaryText,
        headline: creative.headline || null,
        description: creative.description || null,
        destinationUrl: creative.destinationUrl,
        ctaType: creative.ctaType,
      });

      const creativeDraftId = draftRes?.creativeDraft?.id;
      if (!normalizeNonEmptyString(creativeDraftId)) {
        throw new Error("Falha ao criar Creative Draft (id ausente).");
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
        name: ad.name,
        creativeDraftId,
        mode: campaign.mode,
      });

      setResult({
        mode: campaign.mode,
        generatedCampaign: campaignRes?.generatedCampaign ?? null,
        metaCampaign: campaignRes?.metaCampaign ?? null,
        metaAdSet: adSetRes?.metaAdSet ?? null,
        creativeDraft: draftRes?.creativeDraft ?? null,
        metaCreative: publishRes?.metaCreative ?? null,
        metaAd: adRes?.metaAd ?? null,
      });

      setStep(4);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao executar o fluxo.");
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  }

  const modeIsReal = campaign.mode === "REAL";
  const pausedWarning = "Tudo será criado como PAUSED (guardrail obrigatório).";

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
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {steps.map((label, idx) => (
            <StepPill key={label} label={label} active={idx === step} />
          ))}
        </div>

        {step === 0 ? (
          <section className="card" style={{ marginTop: 16, padding: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>Etapa 1 — Dados da campanha</h2>
            <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
              <Field label="Nome" required>
                <InputLike
                  placeholder="Ex: DEMO • Campaign Builder • BR • 2026-05-26"
                  value={campaign.name}
                  onChange={(e) => setCampaign((p) => ({ ...p, name: e.target.value }))}
                  disabled={submitting}
                />
              </Field>
              <Field label="Meta Ad Account ID" required hint="Formato: act_<id>">
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
              <Field label="Country" required>
                <SelectLike
                  value={campaign.countryCode}
                  onChange={(e) => setCampaign((p) => ({ ...p, countryCode: e.target.value }))}
                  disabled={submitting}
                  options={countryOptions}
                />
              </Field>
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
              <Field label="Primary text" required>
                <TextAreaLike
                  placeholder="Ex: Teste controlado do Campaign Builder. Não ativar."
                  value={creative.primaryText}
                  onChange={(e) => setCreative((p) => ({ ...p, primaryText: e.target.value }))}
                  disabled={submitting}
                />
              </Field>
              <Field label="Headline">
                <InputLike
                  placeholder="Ex: Demo — Anúncio PAUSED"
                  value={creative.headline}
                  onChange={(e) => setCreative((p) => ({ ...p, headline: e.target.value }))}
                  disabled={submitting}
                />
              </Field>
              <Field label="Description">
                <InputLike
                  placeholder="Opcional"
                  value={creative.description}
                  onChange={(e) => setCreative((p) => ({ ...p, description: e.target.value }))}
                  disabled={submitting}
                />
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

            <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 950, marginBottom: 10 }}>Campaign</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <SummaryRow label="name" value={campaign.name || "—"} />
                  <SummaryRow label="metaAdAccountId" value={campaign.metaAdAccountId || "—"} />
                  <SummaryRow label="objective" value={campaign.objective || "—"} />
                  <SummaryRow label="countryCode" value={campaign.countryCode || "—"} />
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
                  <SummaryRow label="primaryText" value={creative.primaryText ? "ok" : "—"} />
                  <SummaryRow label="headline" value={creative.headline || "—"} />
                  <SummaryRow label="description" value={creative.description || "—"} />
                  <SummaryRow label="destinationUrl" value={creative.destinationUrl || "—"} />
                  <SummaryRow label="ctaType" value={creative.ctaType || "—"} />
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 950, marginBottom: 10 }}>Ad</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <SummaryRow label="name" value={ad.name || "—"} />
                  <SummaryRow label="creativeDraftId" value="será criado automaticamente" />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="pillPrimary" disabled={submitting} onClick={runFlow}>
                {submitting ? "Criando..." : "Criar tudo (PAUSED)"}
              </button>
              <button type="button" className="pillOutline" disabled={submitting} onClick={openMetaTest}>
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
                  <button type="button" className="pillOutline" onClick={openMetaTest}>
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
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 950, marginBottom: 10 }}>IDs criados</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <SummaryRow label="mode" value={result.mode || "—"} />
                    <SummaryRow label="generatedCampaignId" value={result?.generatedCampaign?.id ?? "—"} />
                    <SummaryRow label="metaCampaignId" value={result?.metaCampaign?.id ?? "—"} />
                    <SummaryRow label="metaAdSetId" value={result?.metaAdSet?.id ?? "—"} />
                    <SummaryRow label="creativeDraftId" value={result?.creativeDraft?.id ?? "—"} />
                    <SummaryRow label="metaCreativeId" value={result?.metaCreative?.id ?? "—"} />
                    <SummaryRow label="metaAdId" value={result?.metaAd?.id ?? "—"} />
                  </div>
                </div>

                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 950, marginBottom: 10 }}>Status (quando disponível)</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <SummaryRow label="campaign.status" value={result?.metaCampaign?.status ?? "—"} />
                    <SummaryRow label="adset.status" value={result?.metaAdSet?.status ?? "—"} />
                    <SummaryRow label="ad.status" value={result?.metaAd?.status ?? "—"} />
                    <SummaryRow label="ad.effective_status" value={result?.metaAd?.effective_status ?? "—"} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" className="pillOutline" onClick={openMetaTest}>
                    Abrir /meta-test (debug)
                  </button>
                  <button type="button" className="pillOutline" onClick={() => setStep(0)}>
                    Criar outra
                  </button>
                </div>
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
