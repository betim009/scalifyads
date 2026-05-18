import { apiGet, HttpError } from "./http.js";
import { mockFinancial } from "../data/mockFinancial.js";

function todayUtcYyyyMmDd() {
  return new Date().toISOString().slice(0, 10);
}

function thisMonthUtcYyyyMm() {
  return new Date().toISOString().slice(0, 7);
}

function addDaysUtc(yyyyMmDd, days) {
  const [y, m, d] = String(yyyyMmDd).split("-").map((v) => Number(v));
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatMonthLabelPtBr(yyyyMm) {
  const [y, m] = String(yyyyMm || "").split("-");
  const year = Number(y);
  const month = Number(m);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return String(yyyyMm || "");
  const dt = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(dt);
}

function formatCurrencyBRLFromCents(cents) {
  const value = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatInt(n) {
  return new Intl.NumberFormat("pt-BR").format(Number(n) || 0);
}

function formatDdMm(yyyyMmDd) {
  const [y, m, d] = String(yyyyMmDd).split("-");
  if (!y || !m || !d) return String(yyyyMmDd);
  return `${d}/${m}`;
}

function formatPercentOrDash(value, { digits = 2 } = {}) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

export function buildFinanceRange(periodLabel) {
  const today = todayUtcYyyyMmDd();
  if (periodLabel === "Hoje") return { since: today, until: today };
  if (periodLabel === "Ontem") {
    const y = addDaysUtc(today, -1);
    return { since: y, until: y };
  }
  if (periodLabel === "30 dias") return { since: addDaysUtc(today, -29), until: today };
  return { since: addDaysUtc(today, -6), until: today };
}

export async function getFinanceOverview({ since, until, limit = 200 } = {}) {
  try {
    const query = new URLSearchParams();
    if (since) query.set("since", since);
    if (until) query.set("until", until);
    if (limit) query.set("limit", String(limit));
    const data = await apiGet(`/api/finance/overview?${query.toString()}`);
    return { ok: true, data, source: "api" };
  } catch (err) {
    const shouldFallback = err instanceof HttpError ? err.status === 503 || err.status === 0 : true;
    if (!shouldFallback) throw err;
    return { ok: false, data: null, source: "fallback" };
  }
}

export async function getFinanceMonthly({ month } = {}) {
  const resolvedMonth = month || thisMonthUtcYyyyMm();
  const query = new URLSearchParams();
  if (resolvedMonth) query.set("month", resolvedMonth);
  return apiGet(`/api/finance/monthly?${query.toString()}`);
}

export async function getFinanceRoiD1({ date } = {}) {
  const query = new URLSearchParams();
  if (date) query.set("date", date);
  return apiGet(`/api/finance/roi-d1?${query.toString()}`);
}

export function toFinanceRoiD1ViewModel(roiD1) {
  const summary = roiD1?.summary ?? {};
  const rows = Array.isArray(roiD1?.rows) ? roiD1.rows : [];

  const spendCents = summary.spend_cents ?? 0;
  const revenueCents = summary.revenue_cents;
  const profitCents = summary.profit_cents;

  const summaryVm = {
    spendTotal: formatCurrencyBRLFromCents(spendCents),
    revenueTotal:
      revenueCents === null || revenueCents === undefined ? "—" : formatCurrencyBRLFromCents(revenueCents),
    profitTotal:
      profitCents === null || profitCents === undefined ? "—" : formatCurrencyBRLFromCents(profitCents),
    roiOverall: formatPercentOrDash(summary.roi_percent, { digits: 0 }),
  };

  const mappedRows = rows.map((r) => {
    const spend = Number(r.spend_cents) || 0;
    const revenue = r.revenue_cents;
    const roi = typeof r.roi_percent === "number" ? r.roi_percent : null;
    const profit = r.profit_cents;

    const status =
      roi === null
        ? { tone: "yellow", label: "Sem Receita" }
        : roi >= 150
          ? { tone: "green", label: "Alta Performance" }
          : roi >= 100
            ? { tone: "green", label: "Positiva" }
            : roi >= 0
              ? { tone: "yellow", label: "Baixa" }
              : { tone: "red", label: "Negativa" };

    const acao =
      roi === null
        ? { tone: "yellow", label: "Revisar" }
        : roi >= 150
          ? { tone: "green", label: "Escalar" }
          : roi < 50
            ? { tone: "red", label: "Pausar" }
            : { tone: "yellow", label: "Revisar" };

    const campaignLabel = r.country_code ? `${r.campaign_name} [${r.country_code}]` : r.campaign_name;

    return {
      campanha: campaignLabel,
      nicho: "—",
      conta: "—",
      act: "—",
      gasto: formatCurrencyBRLFromCents(spend),
      receita:
        revenue === null || revenue === undefined ? "—" : formatCurrencyBRLFromCents(revenue),
      roi: roi === null ? "—" : formatPercentOrDash(roi, { digits: 0 }),
      status,
      acao,
      _raw: {
        spend_cents: spend,
        revenue_cents: revenue,
        profit_cents: profit,
        roi_percent: roi,
      },
    };
  });

  return { date: roiD1?.date ?? null, summary: summaryVm, rows: mappedRows };
}

export function toFinanceMonthlyViewModel(monthly) {
  const month = monthly?.month || thisMonthUtcYyyyMm();
  const totals = monthly?.totals ?? {};
  const daily = Array.isArray(monthly?.daily) ? monthly.daily : [];
  const best = monthly?.bestDay ?? null;
  const worst = monthly?.worstDay ?? null;
  const roiSeriesRaw = Array.isArray(monthly?.roiSeries) ? monthly.roiSeries : [];

  const spendCents = totals.spend_cents ?? 0;
  const revenueCents = totals.revenue_cents;
  const profitCents = totals.profit_cents;

  const metrics = {
    spendTotal: formatCurrencyBRLFromCents(spendCents),
    revenueTotal: revenueCents === null || revenueCents === undefined ? "—" : formatCurrencyBRLFromCents(revenueCents),
    profitTotal: profitCents === null || profitCents === undefined ? "—" : formatCurrencyBRLFromCents(profitCents),
    roiAvg: formatPercentOrDash(totals.roi_percent, { digits: 0 }),
    dollarToday: "—",
  };

  const dailyRows = daily.map((d) => {
    const spendCentsDay = Number(d.spend_cents) || 0;
    const revenueCentsDay = d.revenue_cents === undefined ? null : d.revenue_cents;
    const profitCentsDay = d.profit_cents === undefined ? null : d.profit_cents;
    const roi = typeof d.roi_percent === "number" ? d.roi_percent : null;
    return {
      date: formatDdMm(d.date),
      spend: spendCentsDay / 100,
      revenue:
        revenueCentsDay === null || revenueCentsDay === undefined
          ? null
          : Number(revenueCentsDay) / 100,
      profit:
        profitCentsDay === null || profitCentsDay === undefined
          ? null
          : Number(profitCentsDay) / 100,
      roi,
      hasRevenue: !(revenueCentsDay === null || revenueCentsDay === undefined),
      hasRoi: roi !== null,
      spendLabel: formatCurrencyBRLFromCents(spendCentsDay),
      revenueLabel:
        revenueCentsDay === null || revenueCentsDay === undefined
          ? "—"
          : formatCurrencyBRLFromCents(revenueCentsDay),
      profitLabel:
        profitCentsDay === null || profitCentsDay === undefined
          ? "—"
          : formatCurrencyBRLFromCents(profitCentsDay),
      roiLabel: formatPercentOrDash(roi),
    };
  });

  const summaryRow = {
    label: "TOTAL DO MÊS",
    spendTotal: formatCurrencyBRLFromCents(spendCents),
    revenueTotal:
      revenueCents === null || revenueCents === undefined ? "—" : formatCurrencyBRLFromCents(revenueCents),
    profitTotal:
      profitCents === null || profitCents === undefined ? "—" : formatCurrencyBRLFromCents(profitCents),
    roiAvg: formatPercentOrDash(totals.roi_percent, { digits: 0 }),
  };

  const bestDay = best
    ? {
        date: formatDdMm(best.date),
        roi: formatPercentOrDash(best.roi_percent),
        profit:
          best.profit_cents === null || best.profit_cents === undefined
            ? "—"
            : formatCurrencyBRLFromCents(best.profit_cents),
      }
    : null;

  const worstDay = worst
    ? {
        date: formatDdMm(worst.date),
        roi: formatPercentOrDash(worst.roi_percent),
        profit:
          worst.profit_cents === null || worst.profit_cents === undefined
            ? "—"
            : formatCurrencyBRLFromCents(worst.profit_cents),
      }
    : null;

  const roiSeries = roiSeriesRaw
    .filter((p) => p && p.date)
    .map((p) => ({
      label: formatDdMm(p.date),
      value: typeof p.roi_percent === "number" ? Math.round(p.roi_percent) : 0,
      hasRoi: typeof p.roi_percent === "number",
    }));

  return {
    month,
    monthLabel: formatMonthLabelPtBr(month),
    metrics,
    daily: dailyRows,
    summaryRow,
    bestDay,
    worstDay,
    roiSeries,
  };
}

export function toFinanceViewModel(overview, { countryNameByCode } = {}) {
  const totals = overview?.totals ?? {};
  const spendSeries = Array.isArray(overview?.spend_series) ? overview.spend_series : [];
  const breakdown = Array.isArray(overview?.breakdown) ? overview.breakdown : [];

  const spendCents = Number(totals.spend_cents) || 0;
  const revenueCents =
    totals.revenue_cents === null || totals.revenue_cents === undefined ? null : Number(totals.revenue_cents);
  const profitCents = revenueCents === null ? null : revenueCents - spendCents;
  const roas = revenueCents === null || !spendCents ? null : revenueCents / spendCents;

  const metrics = {
    spendTotal: formatCurrencyBRLFromCents(spendCents),
    cpm: totals.cpm_cents === null ? "—" : formatCurrencyBRLFromCents(totals.cpm_cents),
    clicks: formatInt(totals.clicks),
    impressions: formatInt(totals.impressions),
    cpc: totals.cpc_cents === null ? "—" : formatCurrencyBRLFromCents(totals.cpc_cents),
    revenueTotal: revenueCents === null ? "—" : formatCurrencyBRLFromCents(revenueCents),
    profitTotal: profitCents === null ? "—" : formatCurrencyBRLFromCents(profitCents),
    roiOverall: formatPercentOrDash(totals.roi_percent, { digits: 0 }),
    roasOverall: roas === null ? "—" : `${roas.toFixed(2)}x`,
  };

  const spendSeriesPoints = spendSeries.map((p) => ({
    label: formatDdMm(p.metric_date),
    value: Math.round((Number(p.spend_cents) || 0) / 100),
  }));

  const rows = breakdown.map((r) => {
    const countryCode = r.country_code;
    const countryName = countryNameByCode?.[countryCode] || countryCode;
    const status = String(r.status || "").toUpperCase() === "ACTIVE" ? "Ativo" : "Pausado";
    const revenueCents =
      r.revenue_cents === null || r.revenue_cents === undefined ? null : Number(r.revenue_cents);
    const profitCents =
      r.profit_cents === null || r.profit_cents === undefined ? null : Number(r.profit_cents);
    const roas = r.roas === null || r.roas === undefined ? null : Number(r.roas);

    return {
      campaign: r.campaign_name,
      countryCode,
      country: countryName,
      spend: formatCurrencyBRLFromCents(r.spend_cents),
      revenue: revenueCents === null ? "—" : formatCurrencyBRLFromCents(revenueCents),
      profit: profitCents === null ? "—" : formatCurrencyBRLFromCents(profitCents),
      roi: formatPercentOrDash(r.roi_percent, { digits: 0 }),
      roas: roas === null || !Number.isFinite(roas) ? "—" : `${roas.toFixed(2)}x`,
      impressions: formatInt(r.impressions),
      clicks: formatInt(r.clicks),
      cpc: r.cpc_cents === null ? "—" : formatCurrencyBRLFromCents(r.cpc_cents),
      cpm: r.cpm_cents === null ? "—" : formatCurrencyBRLFromCents(r.cpm_cents),
      status,
    };
  });

  return { metrics, spendSeries: spendSeriesPoints, tableRows: rows };
}

export async function getFinancePeriodsViewModel({ periodOptions, countryNameByCode } = {}) {
  const options = Array.isArray(periodOptions) ? periodOptions : mockFinancial.filters.periodOptions;
  const results = await Promise.all(
    options.map(async (label) => {
      const range = buildFinanceRange(label);
      const overview = await getFinanceOverview(range);
      return { label, overview };
    }),
  );

  const out = {};
  for (const { label, overview } of results) {
    if (overview.ok) {
      out[label] = toFinanceViewModel(overview.data, { countryNameByCode });
    }
  }

  if (Object.keys(out).length === 0) {
    return { ok: true, periods: mockFinancial.periods, source: "fallback" };
  }

  return { ok: true, periods: out, source: "api" };
}
