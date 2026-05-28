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

const STORAGE_LAST_EXECUTION_KEY = "campaignFlow:lastExecution:v1";
const TAB_CREATE = "create";
const TAB_MINE = "mine";

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
  return payload?.translationsByCountry && typeof payload.translationsByCountry === "object" ? payload.translationsByCountry : {};
}

function computeTranslationsStatus(payload) {
  const translations = getTranslationsByCountryFromPayload(payload);
  const count = Object.keys(translations || {}).length;
  if (!count) return { label: "Sem traduções", tone: "muted" };
  const reviewed = payload?.translationsReviewStatus === "reviewed" || Boolean(payload?.translationsReviewedAt);
  return { label: reviewed ? "Revisado" : "Traduções geradas", tone: reviewed ? "good" : "info" };
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
      style={{
        height: 46,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "0 14px",
        fontSize: 14,
        fontWeight: 750,
        width: "100%",
      }}
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
      style={{
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "12px 14px",
        fontSize: 14,
        fontWeight: 750,
        resize: "vertical",
        width: "100%",
      }}
    />
  );
}

function SelectLike({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        height: 46,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "0 14px",
        fontSize: 14,
        fontWeight: 900,
        background: "#ffffff",
        width: "100%",
      }}
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
  return {
    objective: normalizeNonEmptyString(form.objective) || "OUTCOME_TRAFFIC",
    countryCodes: uniqueCountryCodes(form.countryCodes),
    dailyBudgetCents: Number(form.dailyBudgetCents) || 1000,
    billingEvent: normalizeNonEmptyString(form.billingEvent) || "IMPRESSIONS",
    optimizationGoal: normalizeNonEmptyString(form.optimizationGoal) || "LINK_CLICKS",
    primaryText: normalizeNonEmptyString(form.primaryText) || "",
    headline: normalizeNonEmptyString(form.headline) || "",
    description: normalizeNonEmptyString(form.description) || "",
    destinationUrl: normalizeNonEmptyString(form.destinationUrl) || "",
    ctaType: normalizeNonEmptyString(form.ctaType) || "LEARN_MORE",
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

  const [editingTranslationsByCountry, setEditingTranslationsByCountry] = useState({});
  const [translationsDraftByCountry, setTranslationsDraftByCountry] = useState({});
  const [showTranslationsEditor, setShowTranslationsEditor] = useState(false);

  const [form, setForm] = useState({
    name: "",
    objective: "OUTCOME_TRAFFIC",
    countryCodes: "BR",
    dailyBudgetCents: 1000,
    billingEvent: "IMPRESSIONS",
    optimizationGoal: "LINK_CLICKS",
    primaryText: "",
    headline: "",
    description: "",
    destinationUrl: "",
    ctaType: "LEARN_MORE",
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
      })
      .catch(() => {
        if (!alive) return;
        setProfileCountryCodes([]);
        setProfileCountryLanguageByCode({});
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
      primaryText: "",
      headline: "",
      description: "",
      destinationUrl: "",
      ctaType: "LEARN_MORE",
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
      primaryText: payload.primaryText ?? "",
      headline: payload.headline ?? "",
      description: payload.description ?? "",
      destinationUrl: payload.destinationUrl ?? "",
      ctaType: payload.ctaType ?? "LEARN_MORE",
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

    const ok = window.confirm("Confirmo: gerar traduções via LibreTranslate? Você poderá revisar/editar antes de usar.");
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
        primaryText: payload.primaryText ?? "",
        headline: payload.headline ?? "",
        description: payload.description ?? "",
        destinationUrl: payload.destinationUrl ?? "",
        ctaType: payload.ctaType ?? "LEARN_MORE",
        translationsByCountry: getTranslationsByCountryFromPayload(payload),
        translationsRequired: true,
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
    const nextTranslations = translationsDraftByCountry && typeof translationsDraftByCountry === "object" ? translationsDraftByCountry : {};
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
          <button type="button" className="ghostButton" onClick={() => navigate("/campaign-flow")}>
            /campaign-flow
          </button>
          <button type="button" className="ghostButton" onClick={() => navigate("/meta-test")}>
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
          <div className="tabsBar" aria-label="Tabs templates">
            <button
              type="button"
              className={`tabButton ${activeTab === TAB_CREATE ? "tabButtonActive" : ""}`}
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
              className={`tabButton ${activeTab === TAB_MINE ? "tabButtonActive" : ""}`}
              onClick={() => setActiveTab(TAB_MINE)}
            >
              Meus templates
            </button>
          </div>
          <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
            {loading ? "Carregando..." : `${templates.length} template(s)`}
          </div>
        </div>

        {activeTab === TAB_CREATE ? (
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              <div className="minimalCard" style={{ padding: 16 }}>
                <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 12 }}>Campanha</div>
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
                    <InputLike
                      value={form.countryCodes}
                      onChange={(e) => setForm((p) => ({ ...p, countryCodes: e.target.value }))}
                      placeholder="BR,AR"
                    />
                    {profileCountryCodes.length ? (
                      <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="pillOutline"
                          disabled={busy}
                          onClick={() => setForm((p) => ({ ...p, countryCodes: profileCountryCodes.join(",") }))}
                        >
                          Usar países do perfil ({profileCountryCodes.length})
                        </button>
                      </div>
                    ) : null}
                  </Field>
                </div>
              </div>

              <div className="minimalCard" style={{ padding: 16 }}>
                <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 12 }}>AdSet</div>
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

              <div className="minimalCard" style={{ padding: 16 }}>
                <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 12 }}>Criativo</div>
                <div style={{ display: "grid", gap: 12 }}>
                  <Field label="Primary text">
                    <TextAreaLike
                      value={form.primaryText}
                      onChange={(e) => setForm((p) => ({ ...p, primaryText: e.target.value }))}
                      placeholder="Ex: Teste controlado. Não ativar."
                      rows={3}
                    />
                  </Field>
                  <Field label="Headline">
                    <InputLike value={form.headline} onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))} />
                  </Field>
                  <Field label="Description">
                    <InputLike value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                  </Field>
                  <Field label="Destination URL" hint="Obrigatório (para Creative REAL).">
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
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                {editingId ? "Editando template existente" : "Novo template"}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="pillPrimary" disabled={busy} onClick={onSaveTemplate}>
                  Salvar template
                </button>
                <button type="button" className="pillOutline" disabled={busy} onClick={() => resetForm({ useProfileCountries: true })}>
                  Limpar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
            <div className="minimalCard" style={{ padding: 16, alignSelf: "start" }}>
              <div style={{ fontWeight: 950, fontSize: 14 }}>Meus templates</div>
              <div className="muted" style={{ fontWeight: 800, fontSize: 12, marginTop: 6 }}>
                Selecione um template para ver detalhes e operar traduções.
              </div>
              <div style={{ marginTop: 12 }}>
                <InputLike value={listQuery} onChange={(e) => setListQuery(e.target.value)} placeholder="Buscar por nome..." />
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="pillPrimary"
                  disabled={busy}
                  onClick={() => {
                    resetForm({ useProfileCountries: true });
                    setActiveTab(TAB_CREATE);
                  }}
                >
                  Novo template
                </button>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {(filteredTemplates || []).map((t) => {
                  const payload = t?.payload && typeof t.payload === "object" ? t.payload : {};
                  const status = computeTranslationsStatus(payload);
                  const countries = uniqueCountryCodes(payload.countryCodes);
                  const active = String(t.id) === String(selectedId);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(String(t.id));
                        setShowTranslationsEditor(false);
                        setTranslationsDraftByCountry(getTranslationsByCountryFromPayload(payload));
                      }}
                      style={{
                        textAlign: "left",
                        border: active ? "1px solid #bfdbfe" : "1px solid #eef2f7",
                        background: active ? "#eff6ff" : "#ffffff",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                        <div style={{ fontWeight: 950, fontSize: 14, color: "#111827" }}>{t.name}</div>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 11,
                            color: status.tone === "muted" ? "#6b7280" : status.tone === "good" ? "#065f46" : "#1d4ed8",
                          }}
                        >
                          {status.label}
                        </div>
                      </div>
                      <div className="muted" style={{ fontWeight: 800, fontSize: 12, marginTop: 6 }}>
                        {countries.length ? `${countries.length} país(es)` : "Sem países"}
                      </div>
                    </button>
                  );
                })}

                {!loading && !filteredTemplates.length ? (
                  <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                    Nenhum template encontrado.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="minimalCard" style={{ padding: 16, minHeight: 220 }}>
              {!selectedTemplate ? (
                <div className="muted" style={{ fontWeight: 800 }}>
                  Selecione um template na lista.
                </div>
              ) : (
                (() => {
                  const payload = selectedTemplate?.payload && typeof selectedTemplate.payload === "object" ? selectedTemplate.payload : {};
                  const countries = uniqueCountryCodes(payload.countryCodes);
                  const status = computeTranslationsStatus(payload);
                  const translations = getTranslationsByCountryFromPayload(payload);
                  const translationCount = Object.keys(translations || {}).length;
                  const primaryPreview = normalizeNonEmptyString(payload.primaryText)
                    ? `${String(payload.primaryText).slice(0, 70)}${String(payload.primaryText).length > 70 ? "…" : ""}`
                    : "—";

                  return (
                    <div style={{ display: "grid", gap: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 950, fontSize: 18 }}>{selectedTemplate.name}</div>
                          <div className="muted" style={{ fontWeight: 800, marginTop: 6, fontSize: 12 }}>
                            {countries.length ? `Países: ${countries.join(", ")}` : "Sem países definidos"} • {status.label}
                            {translationCount ? ` • ${translationCount} variação(ões)` : ""}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button type="button" className="pillPrimary" disabled={busy} onClick={useInCampaignFlowSelected}>
                            Usar no /campaign-flow
                          </button>
                          <button
                            type="button"
                            className="pillOutline"
                            disabled={busy}
                            onClick={() => {
                              fillFormFromTemplate(selectedTemplate);
                              setActiveTab(TAB_CREATE);
                            }}
                          >
                            Editar
                          </button>
                          <button type="button" className="pillOutline" disabled={busy} onClick={onDeleteSelected}>
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                        <div className="minimalCard" style={{ padding: 14 }}>
                          <div style={{ fontWeight: 950, fontSize: 13, marginBottom: 10 }}>Campaign</div>
                          <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                            objective: <span style={{ color: "#111827", fontWeight: 900 }}>{payload.objective ?? "—"}</span>
                          </div>
                        </div>
                        <div className="minimalCard" style={{ padding: 14 }}>
                          <div style={{ fontWeight: 950, fontSize: 13, marginBottom: 10 }}>AdSet</div>
                          <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                            dailyBudgetCents: <span style={{ color: "#111827", fontWeight: 900 }}>{payload.dailyBudgetCents ?? "—"}</span>
                          </div>
                          <div className="muted" style={{ fontWeight: 800, fontSize: 12, marginTop: 6 }}>
                            billingEvent: <span style={{ color: "#111827", fontWeight: 900 }}>{payload.billingEvent ?? "—"}</span>
                          </div>
                          <div className="muted" style={{ fontWeight: 800, fontSize: 12, marginTop: 6 }}>
                            optimizationGoal: <span style={{ color: "#111827", fontWeight: 900 }}>{payload.optimizationGoal ?? "—"}</span>
                          </div>
                        </div>
                        <div className="minimalCard" style={{ padding: 14 }}>
                          <div style={{ fontWeight: 950, fontSize: 13, marginBottom: 10 }}>Creative</div>
                          <div className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
                            primaryText: <span style={{ color: "#111827", fontWeight: 900 }}>{primaryPreview}</span>
                          </div>
                          <div className="muted" style={{ fontWeight: 800, fontSize: 12, marginTop: 6 }}>
                            headline: <span style={{ color: "#111827", fontWeight: 900 }}>{payload.headline || "—"}</span>
                          </div>
                          <div className="muted" style={{ fontWeight: 800, fontSize: 12, marginTop: 6 }}>
                            description: <span style={{ color: "#111827", fontWeight: 900 }}>{payload.description || "—"}</span>
                          </div>
                          <div className="muted" style={{ fontWeight: 800, fontSize: 12, marginTop: 6 }}>
                            destinationUrl:{" "}
                            <span style={{ color: "#111827", fontWeight: 900 }}>
                              {normalizeNonEmptyString(payload.destinationUrl) ? String(payload.destinationUrl) : "—"}
                            </span>
                          </div>
                          <div className="muted" style={{ fontWeight: 800, fontSize: 12, marginTop: 6 }}>
                            ctaType: <span style={{ color: "#111827", fontWeight: 900 }}>{payload.ctaType ?? "—"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="minimalCard" style={{ padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 950, fontSize: 13 }}>Traduções</div>
                            <div className="muted" style={{ fontWeight: 800, fontSize: 12, marginTop: 6 }}>
                              Gere via LibreTranslate e revise/edite por país antes de usar no lote.
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button type="button" className="pillOutline" disabled={busy} onClick={onGenerateTranslationsSelected}>
                              Gerar traduções
                            </button>
                            <button
                              type="button"
                              className="pillOutline"
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
                          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                            {countries.length ? (
                              countries.map((code) => {
                                const c = String(code || "").toUpperCase();
                                const lang = profileCountryLanguageByCode?.[c] ?? null;
                                const item =
                                  translationsDraftByCountry?.[c] && typeof translationsDraftByCountry[c] === "object"
                                    ? translationsDraftByCountry[c]
                                    : null;
                                return (
                                  <div key={c} className="minimalCard" style={{ padding: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                      <div style={{ fontWeight: 950 }}>{c}</div>
                                      <div className="muted" style={{ fontWeight: 900, fontSize: 12 }}>
                                        idioma: {lang || "— (defina no /profile)"}
                                      </div>
                                    </div>

                                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                                      <Field label="primary text">
                                        <TextAreaLike
                                          value={item?.primaryText ?? ""}
                                          onChange={(e) =>
                                            setTranslationsDraftByCountry((p) => ({
                                              ...(p && typeof p === "object" ? p : {}),
                                              [c]: { ...(item ?? {}), language: item?.language || lang, primaryText: e.target.value },
                                            }))
                                          }
                                          rows={3}
                                          placeholder="Tradução do primaryText"
                                        />
                                      </Field>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                        <Field label="headline">
                                          <InputLike
                                            value={item?.headline ?? ""}
                                            onChange={(e) =>
                                              setTranslationsDraftByCountry((p) => ({
                                                ...(p && typeof p === "object" ? p : {}),
                                                [c]: { ...(item ?? {}), language: item?.language || lang, headline: e.target.value },
                                              }))
                                            }
                                            placeholder="Tradução do headline"
                                          />
                                        </Field>
                                        <Field label="description">
                                          <InputLike
                                            value={item?.description ?? ""}
                                            onChange={(e) =>
                                              setTranslationsDraftByCountry((p) => ({
                                                ...(p && typeof p === "object" ? p : {}),
                                                [c]: { ...(item ?? {}), language: item?.language || lang, description: e.target.value },
                                              }))
                                            }
                                            placeholder="Tradução do description"
                                          />
                                        </Field>
                                      </div>
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
                                className="pillPrimary"
                                disabled={busy}
                                onClick={() => onSaveTranslationsSelected({ markReviewed: false })}
                              >
                                Salvar traduções
                              </button>
                              <button
                                type="button"
                                className="pillOutline"
                                disabled={busy}
                                onClick={() => onSaveTranslationsSelected({ markReviewed: true })}
                              >
                                Marcar como revisado
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
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
