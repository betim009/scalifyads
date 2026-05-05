import { mockCountries } from "../data/mockCountries.js";
import PageShell from "../components/PageShell.jsx";

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

function InputLike({ placeholder, value, disabled }) {
  return (
    <input
      disabled={disabled}
      value={value}
      readOnly
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

function SelectLike({ placeholder, disabled }) {
  return (
    <div
      style={{
        height: 54,
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        padding: "0 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 18,
        fontWeight: 700,
        color: disabled ? "#9ca3af" : "#111827",
        background: disabled ? "#f3f4f6" : "#ffffff",
      }}
      role="button"
      aria-disabled={disabled}
    >
      <span>{placeholder}</span>
      <span aria-hidden="true" style={{ opacity: 0.6 }}>
        ▾
      </span>
    </div>
  );
}

function InfoLine({ icon, text, tone = "muted" }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span aria-hidden="true">{icon}</span>
      <span style={{ color: tone === "muted" ? "#6b7280" : tone, fontWeight: 700 }}>
        {text}
      </span>
    </div>
  );
}

export default function NovaCampanha() {
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
                    <InputLike value="DirigirBTN4" />
                  </Field>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    <Field label="Business Manager" required>
                      <SelectLike placeholder="Selecione..." />
                    </Field>
                    <Field label="Conta de anúncio" required>
                      <SelectLike placeholder="Selecione uma BM primeiro" disabled />
                      <div style={{ marginTop: 10 }}>
                        <InfoLine
                          icon="ⓘ"
                          tone="#f97316"
                          text="Selecione um Business Manager para ver as contas disponíveis"
                        />
                      </div>
                    </Field>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    <Field label="ID da Página" required>
                      <InputLike value="123456789" />
                    </Field>
                    <Field label="Pixel" required>
                      <InputLike value="PX_123456" />
                    </Field>
                  </div>

                  <Field label="Beneficiário" required>
                    <InputLike placeholder="Nome da empresa" value="Nome da empresa" />
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
                    <InputLike value="receitaspravocê.com" />
                  </Field>
                  <Field label="Slug">
                    <InputLike value="/apps-to-recover-lost-photos" />
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
                      receitaspravocê.com/apps-to-recover-lost-photos
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
                    <span aria-hidden="true" style={{ fontSize: 22 }}>
                      ✨
                    </span>
                    <div style={{ fontWeight: 900, fontSize: 20, color: "#166534" }}>
                      Tracking Automático
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <InfoLine icon="✅" text="Você preenche apenas 1 campo" tone="#166534" />
                    <InfoLine
                      icon="✅"
                      text="O sistema gera todos os parâmetros automaticamente"
                      tone="#166534"
                    />
                    <InfoLine
                      icon="✅"
                      text="Compatível com Google Analytics e Facebook Ads"
                      tone="#166534"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span aria-hidden="true">🟢</span>
                    <div style={{ fontWeight: 900 }}>Parâmetro Nicho *</div>
                  </div>
                  <div
                    style={{
                      height: 54,
                      borderRadius: 16,
                      border: "2px solid #86efac",
                      padding: "0 18px",
                      display: "flex",
                      alignItems: "center",
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#6b7280",
                    }}
                  >
                    DirigirBTN4
                  </div>
                  <InfoLine
                    icon="📌"
                    text="Nome usado para rastreamento no Google e identificação da campanha"
                    tone="#6b7280"
                  />
                  <InfoLine
                    icon="ⓘ"
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
                  <span aria-hidden="true" style={{ fontSize: 22 }}>
                    🌐
                  </span>
                  <div style={{ fontWeight: 900, fontSize: 22 }}>Resumo Automático</div>
                </div>

                <p style={{ margin: "18px 0 0", opacity: 0.9, fontWeight: 700 }}>
                  <span aria-hidden="true">🌎 </span>
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
                <span aria-hidden="true">🚀</span> Publicar Campanhas Globais
              </button>
            </aside>
      </div>
    </PageShell>
  );
}
