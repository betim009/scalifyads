import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createFlowTemplate,
  deleteFlowTemplate,
  listFlowTemplates,
  updateFlowTemplate,
} from "../services/flowTemplates.js";
import { getAuthMe } from "../services/auth.js";

const STORAGE_LAST_EXECUTION_KEY = "campaignFlow:lastExecution:v1";

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

function Field({ label, hint, children }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 900, color: "#374151", fontSize: 14 }}>{label}</div>
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
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        padding: "0 14px",
        fontSize: 14,
        fontWeight: 750,
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
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        padding: "12px 14px",
        fontSize: 14,
        fontWeight: 750,
        resize: "vertical",
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
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        padding: "0 14px",
        fontSize: 14,
        fontWeight: 900,
        background: "#ffffff",
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

  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [profileCountryCodes, setProfileCountryCodes] = useState([]);

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
      })
      .catch(() => {
        if (!alive) return;
        setProfileCountryCodes([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  function fillFormFromTemplate(tpl) {
    const payload = tpl?.payload && typeof tpl.payload === "object" ? tpl.payload : {};
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

  async function refresh() {
    const res = await listFlowTemplates({ limit: 200 });
    setTemplates(res.flowTemplates ?? []);
  }

  async function onCreate() {
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
    setBusy(true);
    try {
      const res = await createFlowTemplate({ name, payload });
      setNotice("Template criado.");
      await refresh();
      if (res?.flowTemplate?.id) setSelectedId(String(res.flowTemplate.id));
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao criar template.");
    } finally {
      setBusy(false);
    }
  }

  async function onUpdate() {
    setNotice("");
    setError("");
    if (!selectedId) {
      setError("Selecione um template para editar.");
      return;
    }
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
    setBusy(true);
    try {
      await updateFlowTemplate(selectedId, { name, payload });
      setNotice("Template atualizado.");
      await refresh();
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao atualizar template.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setNotice("");
    setError("");
    if (!selectedId) return;
    const ok = window.confirm("Confirmo: excluir este template?");
    if (!ok) return;
    setBusy(true);
    try {
      await deleteFlowTemplate(selectedId);
      setSelectedId("");
      setNotice("Template removido.");
      await refresh();
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao excluir template.");
    } finally {
      setBusy(false);
    }
  }

  function useInCampaignFlow() {
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
        mode: "STUB",
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

  return (
    <PageShell
      title="Templates"
      subtitle="Gerencie templates operacionais e aplique no /campaign-flow (sem mexer no /meta-test)."
      align="center"
      backFallbackTo="/"
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="pillOutline" onClick={() => navigate("/")}>
            Voltar para Home
          </button>
          <button type="button" className="pillOutline" onClick={() => navigate("/campaign-flow")}>
            Abrir /campaign-flow
          </button>
          <button type="button" className="pillOutline" onClick={() => navigate("/meta-test")}>
            Abrir /meta-test (debug)
          </button>
        </div>

        {notice ? (
          <div className="card" style={{ marginTop: 14, padding: 14, borderColor: "#bfdbfe", color: "#1d4ed8" }}>
            <div style={{ fontWeight: 900 }}>{notice}</div>
          </div>
        ) : null}
        {error ? (
          <div className="card" style={{ marginTop: 14, padding: 14, borderColor: "#fecaca", color: "#991b1b" }}>
            <div style={{ fontWeight: 900 }}>{error}</div>
          </div>
        ) : null}

        <section className="card" style={{ marginTop: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Lista de templates</div>
              <div className="muted" style={{ fontWeight: 750, marginTop: 6 }}>
                {loading ? "Carregando..." : `${templates.length} template(s)`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="pillOutline"
                disabled={busy || loading || !selectedId}
                onClick={useInCampaignFlow}
              >
                Usar no /campaign-flow
              </button>
              <button type="button" className="pillOutline" disabled={busy || loading || !selectedId} onClick={onDelete}>
                Excluir
              </button>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: 16 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Selecionar</div>
              <SelectLike
                value={selectedId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedId(id);
                  const found = templates.find((t) => String(t.id) === String(id));
                  if (found) fillFormFromTemplate(found);
                }}
                options={[
                  { value: "", label: "Selecione...", disabled: true },
                  ...(templates || []).map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
              <div style={{ marginTop: 12, color: "#6b7280", fontWeight: 750, fontSize: 12 }}>
                Dica: crie templates aqui e aplique no `/campaign-flow` (Etapa 1/3).
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Editar / criar</div>
                <div style={{ display: "grid", gap: 12 }}>
                  <Field label="Name" hint="Nome do template (ex: Padrão LATAM • Tráfego)">
                    <InputLike value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Objective">
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
                  <Field label="Country codes" hint="Separados por vírgula (ex: BR,AR,CL)">
                    <InputLike
                      value={form.countryCodes}
                      onChange={(e) => setForm((p) => ({ ...p, countryCodes: e.target.value }))}
                      placeholder="BR,AR"
                    />
                    {profileCountryCodes.length ? (
                      <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="Daily budget (cents)">
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

                <Field label="Primary text">
                  <TextAreaLike
                    value={form.primaryText}
                    onChange={(e) => setForm((p) => ({ ...p, primaryText: e.target.value }))}
                    placeholder="Ex: Teste controlado. Não ativar."
                    rows={3}
                  />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Headline">
                    <InputLike value={form.headline} onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))} />
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

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" className="pillPrimary" disabled={busy} onClick={onCreate}>
                    Criar
                  </button>
                  <button type="button" className="pillOutline" disabled={busy || !selectedId} onClick={onUpdate}>
                    Salvar alterações
                  </button>
                  <button
                    type="button"
                    className="pillOutline"
                    disabled={busy}
                    onClick={() =>
                      setForm({
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
                      })
                    }
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
