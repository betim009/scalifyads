import { mockCountries } from "../data/mockCountries.js";
import PageShell from "../components/PageShell.jsx";
import { useMemo, useState } from "react";
import {
  AutoAwesomeIcon,
  CircleIcon,
  InfoOutlinedIcon,
  LanguageIcon,
  PushPinIcon,
  PublicIcon,
  RocketLaunchIcon,
  TaskAltIcon,
} from "../styles/icons.js";

function StepBadge({ n }) {
  return (
    <span
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        background: "#0b0b0d",
        color: "#ffffff",
        display: "inline-grid",
        placeItems: "center",
        fontWeight: 900,
      }}
      aria-hidden="true"
    >
      {n}
    </span>
  );
}

function SectionTitle({ step, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <StepBadge n={step} />
      <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>{title}</h2>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 900, color: "#374151" }}>
        {label} {required ? <span aria-hidden="true">*</span> : null}
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
        height: 54,
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        padding: "0 18px",
        fontSize: 18,
        fontWeight: 600,
        outline: "none",
        background: disabled ? "#f3f4f6" : "#ffffff",
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
        height: 54,
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        padding: "0 18px",
        fontSize: 18,
        fontWeight: 700,
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

function InfoLine({ icon, text, tone = "muted" }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span aria-hidden="true" style={{ marginTop: 1 }}>
        {icon}
      </span>
      <span style={{ color: tone === "muted" ? "#6b7280" : tone, fontWeight: 700 }}>
        {text}
      </span>
    </div>
  );
}

export default function NovaCampanha() {
  const [campaignName, setCampaignName] = useState("");
  const [businessManager, setBusinessManager] = useState("");
  const [adAccount, setAdAccount] = useState("");
  const [pageId, setPageId] = useState("");
  const [pixel, setPixel] = useState("");
  const [beneficiary, setBeneficiary] = useState("");

  const [domain, setDomain] = useState("");
  const [slug, setSlug] = useState("");
  const [nicheParam, setNicheParam] = useState("");

  const businessManagerOptions = useMemo(
    () => [
      { value: "", label: "Selecione...", disabled: true },
      { value: "main-bm", label: "Main BM" },
      { value: "secondary-bm", label: "Secondary BM" },
    ],
    [],
  );

  const adAccountOptionsByBm = useMemo(
    () => ({
      "main-bm": [
        { value: "", label: "Selecione...", disabled: true },
        { value: "global", label: "Global Account" },
        { value: "latam", label: "Conta LATAM" },
      ],
      "secondary-bm": [
        { value: "", label: "Selecione...", disabled: true },
        { value: "us-primary", label: "Conta US Primary" },
        { value: "us-secondary", label: "Conta US Secondary" },
      ],
    }),
    [],
  );

  const adAccountDisabled = businessManager === "";
  const adAccountOptions = adAccountDisabled
    ? [{ value: "", label: "Selecione uma BM primeiro", disabled: true }]
    : adAccountOptionsByBm[businessManager] ?? [
        { value: "", label: "Selecione...", disabled: true },
      ];

  const finalUrl = useMemo(() => {
    const cleanDomain = (domain ?? "").trim().replace(/^https?:\/\//, "");
    const cleanSlug = (slug ?? "").trim();
    const normalizedSlug =
      cleanSlug === "" ? "" : cleanSlug.startsWith("/") ? cleanSlug : `/${cleanSlug}`;
    if (!cleanDomain && !normalizedSlug) return "";
    return `${cleanDomain}${normalizedSlug}`;
  }, [domain, slug]);

  return (
    <PageShell
      title="Criar Nova Campanha"
      subtitle="Preencha as informações para gerar campanhas globais automaticamente"
      backFallbackTo="/mensal"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.55fr 0.75fr",
          gap: 24,
          alignItems: "start",
        }}
      >
            <div style={{ display: "grid", gap: 22 }}>
              <section className="card" style={{ padding: 22 }}>
                <SectionTitle step={1} title="Configuração" />

                <div
                  style={{
                    marginTop: 18,
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 18,
                  }}
                >
                  <Field label="Nome da campanha" required>
                    <InputLike
                      placeholder="Ex: DirigirBTN4"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </Field>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    <Field label="Business Manager" required>
                      <SelectLike
                        value={businessManager}
                        onChange={(e) => {
                          const nextBm = e.target.value;
                          setBusinessManager(nextBm);
                          setAdAccount("");
                        }}
                        options={businessManagerOptions}
                      />
                    </Field>
                    <Field label="Conta de anúncio" required>
                      <SelectLike
                        value={adAccount}
                        onChange={(e) => setAdAccount(e.target.value)}
                        options={adAccountOptions}
                        disabled={adAccountDisabled}
                      />
                      <div style={{ marginTop: 10 }}>
                        <InfoLine
                          icon={
                            <InfoOutlinedIcon
                              fontSize="small"
                              style={{ color: "#f97316" }}
                            />
                          }
                          tone="#f97316"
                          text="Selecione um Business Manager para ver as contas disponíveis"
                        />
                      </div>
                    </Field>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    <Field label="ID da Página" required>
                      <InputLike
                        placeholder="Ex: 123456789"
                        value={pageId}
                        onChange={(e) => setPageId(e.target.value)}
                      />
                    </Field>
                    <Field label="Pixel" required>
                      <InputLike
                        placeholder="Ex: PX_123456"
                        value={pixel}
                        onChange={(e) => setPixel(e.target.value)}
                      />
                    </Field>
                  </div>

                  <Field label="Beneficiário" required>
                    <InputLike
                      placeholder="Nome da empresa"
                      value={beneficiary}
                      onChange={(e) => setBeneficiary(e.target.value)}
                    />
                  </Field>
                </div>
              </section>

              <section className="card" style={{ padding: 22 }}>
                <SectionTitle step={2} title="Link e Parâmetros" />

                <div
                  style={{
                    marginTop: 18,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 18,
                  }}
                >
                  <Field label="Domínio">
                    <InputLike
                      placeholder="Ex: receitaspravocê.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                  </Field>
                  <Field label="Slug">
                    <InputLike
                      placeholder="/apps-to-recover-lost-photos"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </Field>
                </div>

                <div style={{ marginTop: 18 }}>
                  <Field label="URL final">
                    <div
                      style={{
                        height: 54,
                        borderRadius: 16,
                        border: "1px solid #bfdbfe",
                        padding: "0 18px",
                        display: "flex",
                        alignItems: "center",
                        color: "#2563eb",
                        fontWeight: 900,
                        background: "#eff6ff",
                      }}
                    >
                      {finalUrl || "—"}
                    </div>
                  </Field>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    padding: 18,
                    borderRadius: 16,
                    border: "2px solid #bbf7d0",
                    background: "#f0fdf4",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <AutoAwesomeIcon
                      fontSize="small"
                      style={{ color: "#166534" }}
                    />
                    <div style={{ fontWeight: 900, fontSize: 20, color: "#166534" }}>
                      Tracking Automático
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <InfoLine
                      icon={<TaskAltIcon fontSize="small" style={{ color: "#166534" }} />}
                      text="Você preenche apenas 1 campo"
                      tone="#166534"
                    />
                    <InfoLine
                      icon={<TaskAltIcon fontSize="small" style={{ color: "#166534" }} />}
                      text="O sistema gera todos os parâmetros automaticamente"
                      tone="#166534"
                    />
                    <InfoLine
                      icon={<TaskAltIcon fontSize="small" style={{ color: "#166534" }} />}
                      text="Compatível com Google Analytics e Facebook Ads"
                      tone="#166534"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CircleIcon fontSize="small" style={{ color: "#16a34a" }} />
                    <div style={{ fontWeight: 900 }}>Parâmetro Nicho *</div>
                  </div>
                  <input
                    value={nicheParam}
                    onChange={(e) => setNicheParam(e.target.value)}
                    style={{
                      height: 54,
                      borderRadius: 16,
                      border: "2px solid #86efac",
                      padding: "0 18px",
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#111827",
                      outline: "none",
                    }}
                    placeholder="Ex: DirigirBTN4"
                  />
                  <InfoLine
                    icon={<PushPinIcon fontSize="small" style={{ color: "#6b7280" }} />}
                    text="Nome usado para rastreamento no Google e identificação da campanha"
                    tone="#6b7280"
                  />
                  <InfoLine
                    icon={<InfoOutlinedIcon fontSize="small" style={{ color: "#f97316" }} />}
                    text="Apenas letras e números (sem espaços ou caracteres especiais)"
                    tone="#f97316"
                  />
                </div>
              </section>
            </div>

            <aside style={{ display: "grid", gap: 18 }}>
              <div
                className="card"
                style={{
                  padding: 22,
                  border: 0,
                  background:
                    "linear-gradient(180deg, rgba(59,130,246,1) 0%, rgba(124,58,237,1) 55%, rgba(147,51,234,1) 100%)",
                  color: "#ffffff",
                  boxShadow: "0 18px 40px rgba(59,130,246,0.18)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <PublicIcon fontSize="small" />
                  <div style={{ fontWeight: 900, fontSize: 22 }}>Resumo Automático</div>
                </div>

                <p style={{ margin: "18px 0 0", opacity: 0.9, fontWeight: 700 }}>
                  <span aria-hidden="true" style={{ display: "inline-flex", marginRight: 8 }}>
                    <LanguageIcon fontSize="small" />
                  </span>
                  Campanhas serão criadas automaticamente para:
                </p>

                <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                  {mockCountries.map((c) => (
                    <div
                      key={c.code}
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        borderRadius: 16,
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span aria-hidden="true" style={{ fontSize: 22 }}>
                        {c.flag}
                      </span>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>{c.name}</div>
                        <div style={{ opacity: 0.85, fontWeight: 700, fontSize: 14 }}>
                          Idioma: {c.lang}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 18, opacity: 0.9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900 }}>
                    <span>Total de países:</span>
                    <span>6</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 900,
                      marginTop: 10,
                    }}
                  >
                    <span>Total de vídeos:</span>
                    <span>0</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                style={{
                  width: "100%",
                  height: 60,
                  borderRadius: 18,
                  border: 0,
                  background:
                    "linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(147,51,234,1) 100%)",
                  color: "#ffffff",
                  fontWeight: 900,
                  fontSize: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  boxShadow: "0 14px 28px rgba(37,99,235,0.22)",
                }}
                >
                <RocketLaunchIcon fontSize="small" />
                Publicar Campanhas Globais
              </button>
            </aside>
      </div>
    </PageShell>
  );
}
