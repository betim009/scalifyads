import PageShell from "../components/PageShell.jsx";
import {
  BoltIcon,
  PauseCircleOutlineIcon,
  TrendingUpIcon,
  VisibilityIcon,
} from "../styles/icons.js";

function MetricCard({ label, value, tone, hint }) {
  return (
    <div className="card" style={{ padding: 24, minHeight: 120 }}>
      <div
        style={{
          fontSize: "var(--fs-label)",
          fontWeight: 900,
          letterSpacing: "0.08em",
          color: "#6b7280",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          color: tone === "green" ? "#16a34a" : tone === "red" ? "#ef4444" : "#111827",
        }}
      >
        {value}
      </div>
      {hint ? (
        <div style={{ marginTop: 8, color: "#6b7280", fontWeight: 700, fontSize: "var(--fs-secondary)" }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function SelectLike({ label, value }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 900, color: "#374151" }}>{label}</div>
      <div
        style={{
          height: 46,
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 800,
          background: "#ffffff",
        }}
        role="button"
      >
        <span>{value}</span>
        <span aria-hidden="true" style={{ opacity: 0.6 }}>
          ▾
        </span>
      </div>
    </div>
  );
}

function ChipButton({ active, children }) {
  return (
    <button
      type="button"
      style={{
        height: 44,
        padding: "0 18px",
        borderRadius: 14,
        border: active ? "0" : "1px solid #e5e7eb",
        background: active ? "#2563eb" : "#ffffff",
        color: active ? "#ffffff" : "#111827",
        fontWeight: 900,
        boxShadow: active ? "0 10px 18px rgba(37,99,235,0.22)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function StatusChip({ tone, children }) {
  const styles =
    tone === "green"
      ? { bg: "#16a34a", text: "#ffffff", border: "transparent", dot: "#22c55e" }
      : tone === "red"
        ? { bg: "#ffffff", text: "#ef4444", border: "#fca5a5", dot: "#ef4444" }
        : tone === "yellow"
          ? { bg: "#ffffff", text: "#f59e0b", border: "#fcd34d", dot: "#f59e0b" }
          : { bg: "#ffffff", text: "#16a34a", border: "#86efac", dot: "#22c55e" };

  return (
    <span
      style={{
        height: 34,
        padding: "0 14px",
        borderRadius: 999,
        background: styles.bg,
        color: styles.text,
        fontWeight: 900,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        border: `1px solid ${styles.border}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: styles.dot,
        }}
      />
      {children}
    </span>
  );
}

function ActionPill({ tone, children }) {
  const styles =
    tone === "green"
      ? { bg: "#16a34a" }
      : tone === "red"
        ? { bg: "#dc2626" }
        : { bg: "#b45309" };

  return (
    <button
      type="button"
      style={{
        width: "100%",
        height: 48,
        borderRadius: 14,
        border: 0,
        background: styles.bg,
        color: "#ffffff",
        fontWeight: 900,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      {children}
    </button>
  );
}

export default function RoiOntem() {
  const rows = [
    {
      campanha: "DirigirBTN4 [BRASIL]",
      nicho: "Dirigir",
      conta: "Conta Global BR",
      act: "act_123456789",
      gasto: "R$ 2.500",
      receita: "R$ 7.500",
      roi: "300%",
      status: { tone: "green", label: "Alta Performance" },
      acao: { tone: "green", label: "Escalar" },
    },
    {
      campanha: "DirigirBTN4 [EUA]",
      nicho: "Dirigir",
      conta: "Conta US Primary",
      act: "act_987654321",
      gasto: "R$ 1.800",
      receita: "R$ 4.500",
      roi: "250%",
      status: { tone: "green", label: "Alta Performance" },
      acao: { tone: "green", label: "Escalar" },
    },
    {
      campanha: "PlantasBTN [EUA]",
      nicho: "Plantas",
      conta: "Conta US Secondary",
      act: "act_456789123",
      gasto: "R$ 800",
      receita: "R$ 600",
      roi: "75%",
      status: { tone: "red", label: "Negativa" },
      acao: { tone: "red", label: "Pausar" },
    },
  ];

  return (
    <PageShell
      title="ROI - Dia Anterior (D-1)"
      subtitle={
        <>
          Última atualização: <b>Hoje</b> às 09:00 • Facebook Ads + Google Analytics
        </>
      }
      backLabel="Voltar ao Dashboard"
      backFallbackTo="/mensal"
      headerRight={
        <button
          type="button"
          style={{
            height: 44,
            padding: "0 16px",
            borderRadius: 14,
            border: 0,
            background: "#0b0b0d",
            color: "#ffffff",
            fontWeight: 900,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontSize: 14,
          }}
        >
          <BoltIcon fontSize="small" /> Aplicar Otimização Geral
        </button>
      }
    >
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 22,
        }}
        aria-label="Métricas ROI"
      >
            <MetricCard label="Gasto Total" value="R$ 12.430" tone="red" />
            <MetricCard label="Receita Total" value="R$ 28.900" />
            <MetricCard label="Lucro" value="R$ 16.470" tone="green" />
            <MetricCard
              label="ROI Geral"
              value="232%"
              tone="green"
              hint="Retorno total sobre investimento"
            />
      </section>

      <section
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "1.35fr 0.75fr",
          gap: 22,
          alignItems: "start",
        }}
        aria-label="Filtros e ações"
      >
            <div className="card" style={{ padding: 22 }}>
              <div style={{ fontWeight: 900, marginBottom: 14 }}>Filtros</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                <SelectLike label="Nicho" value="Todos os nichos" />
                <SelectLike label="Conta de Anúncios" value="Todas as contas" />
                <SelectLike label="ROI" value="Todos" />
              </div>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <div style={{ fontWeight: 900, marginBottom: 14 }}>
                Ações em Massa
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <ActionPill tone="green">
                  <TrendingUpIcon fontSize="small" /> Escalar Positivos (7)
                </ActionPill>
                <ActionPill tone="red">
                  <PauseCircleOutlineIcon fontSize="small" /> Pausar Negativos (2)
                </ActionPill>
              </div>
              <div style={{ marginTop: 12, color: "#6b7280", fontWeight: 700 }}>
                Aplica ação para todos os itens filtrados
              </div>
            </div>
      </section>

      <div
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ color: "#6b7280", fontWeight: 800 }}>Agrupar por:</div>
              <div style={{ display: "flex", gap: 10 }}>
                <ChipButton active>Campanha</ChipButton>
                <ChipButton>Nicho</ChipButton>
              </div>
            </div>
            <div style={{ color: "#6b7280", fontWeight: 800 }}>12 resultados</div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 18 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="dataTable" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Nicho</th>
                <th>Conta de Anúncios</th>
                <th>Gasto</th>
                <th>Receita</th>
                <th>ROI</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.campanha}>
                  <td style={{ fontWeight: 900 }}>{r.campanha}</td>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {r.nicho}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span aria-hidden="true" style={{ color: "#2563eb", fontWeight: 900 }}>
                        ƒ
                      </span>
                      <div>
                        <div style={{ fontWeight: 900 }}>{r.conta}</div>
                        <div className="muted" style={{ fontWeight: 800, fontSize: 14 }}>
                          {r.act}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {r.gasto}
                  </td>
                  <td style={{ fontWeight: 900 }}>{r.receita}</td>
                  <td style={{ fontWeight: 900, fontSize: 22 }}>{r.roi}</td>
                  <td>
                    <StatusChip tone={r.status.tone}>{r.status.label}</StatusChip>
                  </td>
                  <td>
                    <button
                      type="button"
                      style={{
                        height: 36,
                        padding: "0 14px",
                        borderRadius: 12,
                        border: 0,
                        background:
                          r.acao.tone === "green"
                            ? "#16a34a"
                            : r.acao.tone === "red"
                              ? "#dc2626"
                              : "#b45309",
                        color: "#ffffff",
                        fontWeight: 900,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        minWidth: 110,
                        justifyContent: "center",
                      }}
                    >
                      {r.acao.tone === "green" ? (
                        <TrendingUpIcon fontSize="small" />
                      ) : r.acao.tone === "red" ? (
                        <PauseCircleOutlineIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                      {r.acao.label}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
