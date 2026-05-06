import { mockCountries } from "../data/mockCountries.js";
import PageShell from "../components/PageShell.jsx";
import { useMemo, useRef, useState } from "react";
import {
  AddIcon,
  AutoAwesomeIcon,
  CircleIcon,
  DescriptionIcon,
  AccessTimeIcon,
  EditIcon,
  FileUploadIcon,
  FolderOpenIcon,
  InfoOutlinedIcon,
  LightbulbOutlinedIcon,
  LanguageIcon,
  PushPinIcon,
  PublicIcon,
  RocketLaunchIcon,
  SaveIcon,
  TaskAltIcon,
} from "../styles/icons.js";

function StepBadge({ n }) {
  return (
    <span
      style={{
        width: 32,
        height: 32,
        borderRadius: 12,
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
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{title}</h2>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 800, color: "#374151", fontSize: 14 }}>
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
        height: 48,
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        padding: "0 16px",
        fontSize: 14,
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
        height: 48,
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        padding: "0 16px",
        fontSize: 14,
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
      <span style={{ color: tone === "muted" ? "#6b7280" : tone, fontWeight: 700, fontSize: 14 }}>
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
  const [libraryNiche, setLibraryNiche] = useState("");
  const [primaryTexts, setPrimaryTexts] = useState(() => Array.from({ length: 5 }, () => ""));
  const [titles, setTitles] = useState(() => Array.from({ length: 5 }, () => ""));
  const [descriptions, setDescriptions] = useState(() => Array.from({ length: 5 }, () => ""));
  const [dailyBudget, setDailyBudget] = useState("50");
  const [budgetType, setBudgetType] = useState("Diário");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");
  const [runContinuous, setRunContinuous] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

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

  const autoUtm = useMemo(() => {
    const clean = (nicheParam ?? "").trim();
    if (clean === "") return "";
    return `utm_campaign=${clean}&utm_source=fb&utm_medium=cpc`;
  }, [nicheParam]);

  const autoFacebookParam = useMemo(() => {
    const clean = (nicheParam ?? "").trim();
    if (clean === "") return "";
    return `fb_campaign=${clean}`;
  }, [nicheParam]);

  function updateArrayValue(setter, idx, nextValue) {
    setter((prev) => prev.map((v, i) => (i === idx ? nextValue : v)));
  }

  function addVariation(setter) {
    setter((prev) => [...prev, ""]);
  }

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
            <div style={{ display: "grid", gap: 24 }}>
              <section className="card" style={{ padding: 24 }}>
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

              <section className="card" style={{ padding: 24 }}>
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
                        height: 48,
                        borderRadius: 14,
                        border: "1px solid #bfdbfe",
                        padding: "0 16px",
                        display: "flex",
                        alignItems: "center",
                        color: "#2563eb",
                        fontWeight: 900,
                        background: "#eff6ff",
                        fontSize: 14,
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
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#166534" }}>
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
                      height: 48,
                      borderRadius: 14,
                      border: "2px solid #86efac",
                      padding: "0 16px",
                      fontSize: 14,
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

                  <div style={{ marginTop: 10, display: "grid", gap: 14 }}>
                    <div style={{ fontWeight: 900, color: "#374151", display: "flex", alignItems: "center", gap: 10 }}>
                      <span aria-hidden="true">
                        <PublicIcon fontSize="small" style={{ color: "#6b7280" }} />
                      </span>
                      UTM (Google Analytics) - Gerado automaticamente
                    </div>
                    <InputLike
                      placeholder="Preencha o parâmetro nicho acima"
                      value={autoUtm}
                      onChange={() => {}}
                      disabled
                    />

                    <div style={{ fontWeight: 900, color: "#374151", display: "flex", alignItems: "center", gap: 10 }}>
                      <span aria-hidden="true">
                        <DescriptionIcon fontSize="small" style={{ color: "#6b7280" }} />
                      </span>
                      Parâmetro Facebook - Gerado automaticamente
                    </div>
                    <InputLike
                      placeholder="Preencha o parâmetro nicho acima"
                      value={autoFacebookParam}
                      onChange={() => {}}
                      disabled
                    />

                    <div
                      style={{
                        border: "1px solid #bfdbfe",
                        background: "#eff6ff",
                        borderRadius: 14,
                        padding: "14px 16px",
                        color: "#1e40af",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 14,
                      }}
                      role="note"
                    >
                      <LightbulbOutlinedIcon fontSize="small" />
                      <span>
                        <span style={{ fontWeight: 900 }}>Dica:</span> O sistema gera automaticamente os parâmetros com base no nome do nicho
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card" style={{ padding: 24 }}>
                <SectionTitle step={3} title="Copy Base" />

                <div
                  style={{
                    marginTop: 18,
                    borderRadius: 16,
                    border: "2px solid #ddd6fe",
                    background: "linear-gradient(180deg, rgba(245,243,255,0.92) 0%, rgba(255,255,255,1) 100%)",
                    padding: 18,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900, color: "#6d28d9" }}>
                    <FolderOpenIcon fontSize="small" />
                    Biblioteca de Textos por Nicho
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14, alignItems: "end" }}>
                    <div>
                      <div style={{ fontWeight: 900, color: "#6d28d9", display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                        <CircleIcon fontSize="small" style={{ color: "#16a34a" }} />
                        Selecionar Nicho
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <SelectLike
                          value={libraryNiche}
                          onChange={(e) => setLibraryNiche(e.target.value)}
                          options={[
                            { value: "", label: "Escolha um nicho...", disabled: true },
                            { value: "dirigir", label: "Dirigir" },
                            { value: "plantas", label: "Plantas" },
                          ]}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={{
                          height: 44,
                          padding: "0 16px",
                          borderRadius: 14,
                          border: 0,
                          background: "#a78bfa",
                          color: "#ffffff",
                          fontWeight: 900,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          fontSize: 14,
                        }}
                      >
                        <FileUploadIcon fontSize="small" /> Carregar
                      </button>
                      <button
                        type="button"
                        style={{
                          height: 44,
                          padding: "0 16px",
                          borderRadius: 14,
                          border: 0,
                          background: "#16a34a",
                          color: "#ffffff",
                          fontWeight: 900,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          fontSize: 14,
                        }}
                      >
                        <SaveIcon fontSize="small" /> Salvar
                      </button>
                      <button
                        type="button"
                        style={{
                          height: 44,
                          padding: "0 16px",
                          borderRadius: 14,
                          border: 0,
                          background: "#93c5fd",
                          color: "#1e3a8a",
                          fontWeight: 900,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          fontSize: 14,
                        }}
                      >
                        <EditIcon fontSize="small" /> Atualizar
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      background: "#ffffff",
                      border: "1px solid #ddd6fe",
                      borderRadius: 14,
                      padding: "12px 14px",
                      color: "#6d28d9",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 14,
                    }}
                    role="note"
                  >
                    <LightbulbOutlinedIcon fontSize="small" />
                    <span>
                      <span style={{ fontWeight: 900 }}>Dica:</span> Cada nicho salva 5 textos principais, 5 títulos e 5 descrições que podem ser reutilizados com 1 clique
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900, fontSize: 16 }}>
                      <CircleIcon fontSize="small" style={{ color: "#16a34a" }} /> Texto Principal ({primaryTexts.length} variações)
                    </div>
                    <button
                      type="button"
                      onClick={() => addVariation(setPrimaryTexts)}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: "#2563eb",
                        fontWeight: 900,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 14,
                      }}
                    >
                      <AddIcon fontSize="small" /> Adicionar variação
                    </button>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 16 }}>
                    {primaryTexts.map((v, idx) => (
                      <div key={`primary-${idx}`} style={{ display: "grid", gap: 10 }}>
                        <div style={{ fontWeight: 800, color: "#374151", fontSize: 14 }}>
                          Texto principal {idx + 1}
                        </div>
                        <textarea
                          value={v}
                          onChange={(e) => updateArrayValue(setPrimaryTexts, idx, e.target.value)}
                          placeholder="Digite o texto do anúncio..."
                          style={{
                            borderRadius: 14,
                            border: "1px solid #e5e7eb",
                            padding: "14px 16px",
                            fontSize: 14,
                            fontWeight: 600,
                            outline: "none",
                            minHeight: 92,
                            resize: "vertical",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900, fontSize: 16 }}>
                      <CircleIcon fontSize="small" style={{ color: "#2563eb" }} /> Título ({titles.length} variações)
                    </div>
                    <button
                      type="button"
                      onClick={() => addVariation(setTitles)}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: "#2563eb",
                        fontWeight: 900,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 14,
                      }}
                    >
                      <AddIcon fontSize="small" /> Adicionar variação
                    </button>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 16 }}>
                    {titles.map((v, idx) => (
                      <Field key={`title-${idx}`} label={`Título ${idx + 1}`}>
                        <InputLike
                          placeholder="Digite o título..."
                          value={v}
                          onChange={(e) => updateArrayValue(setTitles, idx, e.target.value)}
                        />
                      </Field>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900, fontSize: 16 }}>
                      <CircleIcon fontSize="small" style={{ color: "#facc15" }} /> Descrição ({descriptions.length} variações)
                    </div>
                    <button
                      type="button"
                      onClick={() => addVariation(setDescriptions)}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: "#2563eb",
                        fontWeight: 900,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 14,
                      }}
                    >
                      <AddIcon fontSize="small" /> Adicionar variação
                    </button>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 16 }}>
                    {descriptions.map((v, idx) => (
                      <Field key={`desc-${idx}`} label={`Descrição ${idx + 1}`}>
                        <InputLike
                          placeholder="Digite a descrição..."
                          value={v}
                          onChange={(e) => updateArrayValue(setDescriptions, idx, e.target.value)}
                        />
                      </Field>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 20,
                    border: "1px solid #ddd6fe",
                    background: "#f5f3ff",
                    borderRadius: 14,
                    padding: "14px 16px",
                    color: "#4c1d95",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 14,
                  }}
                  role="note"
                >
                  <AutoAwesomeIcon fontSize="small" />
                  <span>
                    <span style={{ fontWeight: 900 }}>Automação inteligente:</span> Os textos serão traduzidos automaticamente para todos os idiomas configurados
                  </span>
                </div>
              </section>

              <section className="card" style={{ padding: 24 }}>
                <SectionTitle step={4} title="Orçamento e Programação" />

                <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <Field label="Orçamento diário (R$)">
                    <InputLike
                      type="number"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                      placeholder="50"
                    />
                  </Field>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontWeight: 800, color: "#374151", fontSize: 14 }}>Tipo de orçamento</div>
                    <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 4 }}>
                      {["Diário", "Vitalício"].map((opt) => (
                        <label key={opt} style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 700, color: "#374151", fontSize: 14 }}>
                          <input
                            type="radio"
                            name="budgetType"
                            value={opt}
                            checked={budgetType === opt}
                            onChange={(e) => setBudgetType(e.target.value)}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 18, height: 1, background: "#e5e7eb" }} aria-hidden="true" />

                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900, fontSize: 16 }}>
                    <AccessTimeIcon fontSize="small" style={{ color: "#ef4444" }} /> Programação
                  </div>

                  <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    <Field label="Data de início">
                      <InputLike placeholder="dd/mm/aaaa" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </Field>
                    <Field label="Horário de início">
                      <InputLike placeholder="00:00" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </Field>
                    <Field label="Data de término (opcional)">
                      <InputLike
                        placeholder="dd/mm/aaaa"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={runContinuous}
                      />
                    </Field>
                    <Field label="Horário de término">
                      <InputLike
                        placeholder="23:59"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        disabled={runContinuous}
                      />
                    </Field>
                  </div>

                  <label style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 700, color: "#374151", fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={runContinuous}
                      onChange={(e) => setRunContinuous(e.target.checked)}
                    />
                    ✓ Rodar campanha continuamente
                  </label>
                </div>
              </section>

              <section className="card" style={{ padding: 24 }}>
                <SectionTitle step={5} title="Upload de Vídeos" />

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                  }}
                  style={{
                    marginTop: 18,
                    borderRadius: 16,
                    border: "2px dashed #cbd5e1",
                    background: "#ffffff",
                    minHeight: 220,
                    display: "grid",
                    placeItems: "center",
                    padding: 24,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <FileUploadIcon fontSize="large" style={{ color: "#94a3b8" }} />
                    <div style={{ marginTop: 14, fontWeight: 900, fontSize: 16, color: "#374151" }}>
                      Arraste ou selecione vídeos
                    </div>
                    <div style={{ marginTop: 8, color: "#6b7280", fontWeight: 700, fontSize: 14 }}>
                      Formatos aceitos: MP4, MOV, AVI
                    </div>
                    {uploadedFiles.length ? (
                      <div style={{ marginTop: 10, color: "#111827", fontWeight: 800, fontSize: 14 }}>
                        {uploadedFiles.length} arquivo(s) selecionado(s)
                      </div>
                    ) : null}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const nextFiles = Array.from(e.target.files ?? []);
                    setUploadedFiles(nextFiles);
                  }}
                />
              </section>
            </div>

            <aside style={{ display: "grid", gap: 18 }}>
              <div
                className="card"
                style={{
                  padding: 24,
                  border: 0,
                  background:
                    "linear-gradient(180deg, rgba(59,130,246,1) 0%, rgba(124,58,237,1) 55%, rgba(147,51,234,1) 100%)",
                  color: "#ffffff",
                  boxShadow: "0 18px 40px rgba(59,130,246,0.18)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <PublicIcon fontSize="small" />
                  <div style={{ fontWeight: 900, fontSize: 18 }}>Resumo Automático</div>
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
                        <div style={{ fontWeight: 900, fontSize: 16 }}>{c.name}</div>
                        <div style={{ opacity: 0.85, fontWeight: 700, fontSize: 12 }}>
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
                  height: 56,
                  borderRadius: 18,
                  border: 0,
                  background:
                    "linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(147,51,234,1) 100%)",
                  color: "#ffffff",
                  fontWeight: 900,
                  fontSize: 14,
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

              <button
                type="button"
                style={{
                  width: "100%",
                  height: 56,
                  borderRadius: 18,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  color: "#374151",
                  fontWeight: 900,
                  fontSize: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <SaveIcon fontSize="small" /> Salvar como rascunho
              </button>

              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900, fontSize: 16 }}>
                  <AutoAwesomeIcon fontSize="small" style={{ color: "#a855f7" }} /> Diferenciais
                </div>
                <div style={{ marginTop: 14, display: "grid", gap: 12, color: "#374151", fontWeight: 700, fontSize: 14 }}>
                  {[
                    "Automação completa",
                    "Escala global instantânea",
                    "Tradução automática",
                    "Organização inteligente",
                  ].map((t) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <TaskAltIcon fontSize="small" style={{ color: "#16a34a" }} />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
      </div>
    </PageShell>
  );
}
