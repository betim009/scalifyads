import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFinanceRoiOperational, setFinanceRevenue } from "../services/finance.js";
import { pauseMetaCampaign } from "../services/metaCampaigns.js";
import { updateMetaAdSetBudget } from "../services/metaAdSets.js";
import { createOpsLogs } from "../services/opsLogs.js";

function formatCurrencyBRLFromCents(cents) {
  const value = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercentOrDash(value, { digits = 0 } = {}) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

function todayUtcYyyyMmDd() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysUtc(yyyyMmDd, days) {
  const [y, m, d] = String(yyyyMmDd).split("-").map((v) => Number(v));
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseBrlToCents(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

function Metric({ label, value, tone }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 900, color: "#6b7280", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          fontWeight: 950,
          fontSize: 20,
          color: tone === "red" ? "#dc2626" : tone === "green" ? "#16a34a" : "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function RoiOperacional() {
  const navigate = useNavigate();
  const defaultDate = useMemo(() => addDaysUtc(todayUtcYyyyMmDd(), -1), []);
  const [date, setDate] = useState(defaultDate);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [revenueInputs, setRevenueInputs] = useState({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setNotice("");

    getFinanceRoiOperational({ date, limit: 300 })
      .then((res) => {
        if (!alive) return;
        setData(res);
        const next = {};
        const rows = Array.isArray(res?.rows) ? res.rows : [];
        for (const r of rows) {
          const cents = r.revenue_cents;
          next[r.generated_campaign_id] =
            cents === null || cents === undefined ? "" : String((Number(cents) || 0) / 100).replace(".", ",");
        }
        setRevenueInputs(next);
      })
      .catch((err) => {
        if (!alive) return;
        setData(null);
        setError(err?.message ? String(err.message) : "Falha ao carregar ROI operacional.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [date]);

  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const summary = data?.summary ?? {};

  const negativeRows = useMemo(() => {
    return rows.filter((r) => typeof r?.profit_cents === "number" && r.profit_cents < 0 && r?.meta_campaign_id);
  }, [rows]);

  function openMetaTest({ generatedCampaignId } = {}) {
    const params = new URLSearchParams();
    if (generatedCampaignId) params.set("generatedCampaignId", String(generatedCampaignId));
    navigate(`/meta-test?${params.toString()}`);
  }

  async function logOps(entry) {
    try {
      await createOpsLogs({
        source: "roi-operational",
        entries: [
          {
            entity: entry?.entity ?? "roi",
            action: entry?.action ?? "roi.unknown",
            ok: Boolean(entry?.ok),
            error: entry?.error ?? null,
            details: entry?.details ?? {},
            clientAt: new Date().toISOString(),
          },
        ],
      });
    } catch {
      // best-effort
    }
  }

  async function saveRevenue(generatedCampaignId) {
    setNotice("");
    const raw = revenueInputs[generatedCampaignId] ?? "";
    const cents = parseBrlToCents(raw);
    if (cents === null) {
      setNotice("Receita inválida. Use um valor >= 0 (ex: 123,45).");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await setFinanceRevenue({ generatedCampaignId, date, revenueCents: cents });
      await logOps({
        entity: "generated_campaign",
        action: "finance.revenue.set",
        ok: true,
        details: { generatedCampaignId, date, revenueCents: cents },
      });
      const refreshed = await getFinanceRoiOperational({ date, limit: 300 });
      setData(refreshed);
      setNotice("Receita salva.");
    } catch (err) {
      await logOps({
        entity: "generated_campaign",
        action: "finance.revenue.set",
        ok: false,
        error: err?.message ? String(err.message) : "Falha",
        details: { generatedCampaignId, date },
      });
      setError(err?.message ? String(err.message) : "Falha ao salvar receita.");
    } finally {
      setBusy(false);
    }
  }

  async function pauseOne(metaCampaignId, { generatedCampaignId } = {}) {
    if (!metaCampaignId) return;
    const ok = window.confirm("Confirmo: pausar esta campanha na Meta? (Nunca ACTIVE)");
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await pauseMetaCampaign(metaCampaignId);
      await logOps({
        entity: "meta_campaign",
        action: "meta.campaign.pause.request",
        ok: true,
        details: { metaCampaignId, generatedCampaignId, date },
      });
      setNotice("Campanha pausada (Meta).");
    } catch (err) {
      await logOps({
        entity: "meta_campaign",
        action: "meta.campaign.pause.request",
        ok: false,
        error: err?.message ? String(err.message) : "Falha",
        details: { metaCampaignId, generatedCampaignId, date },
      });
      setError(err?.message ? String(err.message) : "Falha ao pausar campanha.");
    } finally {
      setBusy(false);
    }
  }

  async function pauseAllNegatives() {
    if (!negativeRows.length) {
      setNotice("Nenhuma campanha negativa com receita informada.");
      return;
    }
    const ok = window.confirm(`Confirmo: pausar ${negativeRows.length} campanha(s) negativas na Meta? (Nunca ACTIVE)`);
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      for (const r of negativeRows) {
        try {
          await pauseMetaCampaign(r.meta_campaign_id);
        } catch {
          // continuar
        }
      }
      await logOps({
        entity: "meta_campaign",
        action: "meta.campaign.pause.bulk.request",
        ok: true,
        details: { date, count: negativeRows.length },
      });
      setNotice("Pausa em massa solicitada (use o diagnóstico técnico se houver falhas).");
    } catch (err) {
      await logOps({
        entity: "meta_campaign",
        action: "meta.campaign.pause.bulk.request",
        ok: false,
        error: err?.message ? String(err.message) : "Falha",
        details: { date, count: negativeRows.length },
      });
      setError(err?.message ? String(err.message) : "Falha na pausa em massa.");
    } finally {
      setBusy(false);
    }
  }

  async function editBudget(metaAdSetId, { generatedCampaignId } = {}) {
    if (!metaAdSetId) return;
    const raw = window.prompt("Novo daily budget (centavos). Ex: 1000 = R$10,00", "1000");
    if (raw === null) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      setNotice("Budget inválido.");
      return;
    }
    const ok = window.confirm("Confirmo: alterar orçamento do AdSet na Meta e manter PAUSED?");
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateMetaAdSetBudget(metaAdSetId, { dailyBudgetCents: Math.trunc(n) });
      await logOps({
        entity: "meta_adset",
        action: "meta.adset.budget.update.request",
        ok: true,
        details: { metaAdSetId, dailyBudgetCents: Math.trunc(n), generatedCampaignId, date },
      });
      setNotice("Orçamento atualizado (Meta).");
    } catch (err) {
      await logOps({
        entity: "meta_adset",
        action: "meta.adset.budget.update.request",
        ok: false,
        error: err?.message ? String(err.message) : "Falha",
        details: { metaAdSetId, generatedCampaignId, date },
      });
      setError(err?.message ? String(err.message) : "Falha ao atualizar orçamento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="ROI operacional (mínimo)"
      subtitle="Gasto (Meta) + receita manual → lucro/prejuízo e ações seguras (PAUSED)."
      backFallbackTo="/"
    >
      <div className="card" style={{ padding: 16, borderColor: "#fde68a", background: "#fffbeb" }}>
        <div style={{ fontWeight: 950, color: "#92400e" }}>
          Guardrails: nunca ACTIVE • ações exigem confirmação • toda ação REAL deve ser segura.
        </div>
      </div>

      {notice ? (
        <div className="card" style={{ padding: 14, marginTop: 14, borderColor: "#bfdbfe", color: "#1d4ed8" }}>
          <div style={{ fontWeight: 900 }}>{notice}</div>
        </div>
      ) : null}

      {error ? (
        <div className="card" style={{ padding: 14, marginTop: 14, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ fontWeight: 900 }}>Erro</div>
          <div style={{ marginTop: 6, fontWeight: 750 }}>{error}</div>
        </div>
      ) : null}

      <section style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 900, color: "#374151" }}>Data</div>
          <input
            type="date"
            value={date}
            disabled={busy || loading}
            onChange={(e) => setDate(e.target.value)}
            style={{
              height: 44,
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              padding: "0 14px",
              fontWeight: 900,
            }}
          />
        </div>

        <button type="button" className="pillOutline" disabled={busy || loading} onClick={pauseAllNegatives}>
          Pausar negativos ({negativeRows.length})
        </button>
        <button type="button" className="pillOutline" disabled={busy} onClick={() => openMetaTest({})}>
          Abrir diagnóstico técnico
        </button>
      </section>

      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
        <Metric label="Gasto" value={loading ? "—" : formatCurrencyBRLFromCents(summary.spend_cents)} tone="red" />
        <Metric
          label="Receita"
          value={loading ? "—" : summary.revenue_cents === null ? "—" : formatCurrencyBRLFromCents(summary.revenue_cents)}
        />
        <Metric
          label="Lucro"
          value={loading ? "—" : summary.profit_cents === null ? "—" : formatCurrencyBRLFromCents(summary.profit_cents)}
          tone={typeof summary.profit_cents === "number" && summary.profit_cents < 0 ? "red" : "green"}
        />
        <Metric label="ROI" value={loading ? "—" : formatPercentOrDash(summary.roi_percent)} tone="green" />
      </section>

      <div className="card" style={{ padding: 0, marginTop: 16, opacity: busy ? 0.75 : 1 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="dataTable" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>País</th>
                <th>Gasto</th>
                <th>Receita (manual)</th>
                <th>Lucro</th>
                <th>ROI</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ fontWeight: 800 }}>
                    Carregando…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => {
                  const profit = r.profit_cents;
                  const isNegative = typeof profit === "number" && profit < 0;
                  return (
                    <tr
                      key={r.generated_campaign_id}
                      style={{
                        background: isNegative ? "#fff1f2" : "transparent",
                      }}
                    >
                      <td style={{ fontWeight: 900 }}>
                        {r.campaign_name}
                        <div className="muted" style={{ fontWeight: 800, fontSize: 12, marginTop: 4 }}>
                          {r.generated_campaign_id}
                        </div>
                      </td>
                      <td className="muted" style={{ fontWeight: 900 }}>
                        {r.country_code}
                      </td>
                      <td className="muted" style={{ fontWeight: 900 }}>
                        {formatCurrencyBRLFromCents(r.spend_cents)}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            value={revenueInputs[r.generated_campaign_id] ?? ""}
                            disabled={busy}
                            onChange={(e) =>
                              setRevenueInputs((p) => ({ ...p, [r.generated_campaign_id]: e.target.value }))
                            }
                            placeholder="Ex: 123,45"
                            style={{
                              height: 36,
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                              padding: "0 10px",
                              fontWeight: 900,
                              width: 140,
                            }}
                          />
                          <button
                            type="button"
                            className="pillOutline"
                            disabled={busy}
                            onClick={() => saveRevenue(r.generated_campaign_id)}
                          >
                            Salvar
                          </button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 950, color: isNegative ? "#dc2626" : "#16a34a" }}>
                        {profit === null || profit === undefined ? "—" : formatCurrencyBRLFromCents(profit)}
                      </td>
                      <td style={{ fontWeight: 950 }}>{formatPercentOrDash(r.roi_percent)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="pillOutline"
                            disabled={busy}
                            onClick={() => openMetaTest({ generatedCampaignId: r.generated_campaign_id })}
                          >
                            Diagnóstico técnico
                          </button>
                          <button
                            type="button"
                            className="pillOutline"
                            disabled={busy || !r.meta_campaign_id}
                            onClick={() => pauseOne(r.meta_campaign_id, { generatedCampaignId: r.generated_campaign_id })}
                          >
                            Pausar
                          </button>
                          <button
                            type="button"
                            className="pillOutline"
                            disabled={busy || !r.meta_adset_id}
                            onClick={() => editBudget(r.meta_adset_id, { generatedCampaignId: r.generated_campaign_id })}
                          >
                            Orçamento
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="muted" style={{ fontWeight: 800 }}>
                    Nenhum dado encontrado para esta data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
