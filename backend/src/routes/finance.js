import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError, parseLimit } from '../lib/http.js'
import { resolveAuthUser } from '../lib/internalAuth.js'
import { isUuid } from '../lib/validate.js'

function isYyyyMmDd(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isYyyyMm(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)
}

function todayUtcYyyyMmDd() {
  return new Date().toISOString().slice(0, 10)
}

function thisMonthUtcYyyyMm() {
  return new Date().toISOString().slice(0, 7)
}

function addDaysUtc(yyyyMmDd, days) {
  const [y, m, d] = yyyyMmDd.split('-').map((v) => Number(v))
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function monthRangeUtc(yyyyMm) {
  const [yRaw, mRaw] = String(yyyyMm).split('-')
  const year = Number(yRaw)
  const month = Number(mRaw)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null

  const since = `${yRaw}-${mRaw}-01`
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(8, 10)
  const until = `${yRaw}-${mRaw}-${lastDay}`
  if (!isYyyyMmDd(since) || !isYyyyMmDd(until)) return null
  return { since, until }
}

function parseDateOrNull(value) {
  if (!isYyyyMmDd(value)) return null
  return value
}

function parseMonthOrNull(value) {
  if (!isYyyyMm(value)) return null
  const [y, m] = String(value).split('-')
  const month = Number(m)
  if (!Number.isFinite(month) || month < 1 || month > 12) return null
  if (!/^\d{4}$/.test(y)) return null
  return `${y}-${m}`
}

function toInt(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.trunc(n)
}

function toNullableInt(value) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

function computeCpcCents({ spendCents, clicks }) {
  if (!clicks) return null
  return Math.round(spendCents / clicks)
}

function computeCpmCents({ spendCents, impressions }) {
  if (!impressions) return null
  return Math.round((spendCents * 1000) / impressions)
}

function computeRoiPercent({ spendCents, revenueCents }) {
  if (!spendCents || revenueCents === null || revenueCents === undefined) return null
  const profit = revenueCents - spendCents
  return Math.round((profit / spendCents) * 10000) / 100
}

function normalizeNonEmptyString(value, { maxLen } = {}) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (maxLen && trimmed.length > maxLen) return trimmed.slice(0, maxLen)
  return trimmed
}

export function financeRouter() {
  const router = Router()

  async function requireAuthAsync(req, res) {
    const pool = getPool()
    const auth = await resolveAuthUser(pool, req)
    if (!auth?.userId) {
      jsonError(res, 401, 'Unauthorized')
      return null
    }
    return auth
  }

  router.get(
    '/monthly',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const month = parseMonthOrNull(req.query.month) ?? thisMonthUtcYyyyMm()
      const range = monthRangeUtc(month)
      if (!range) {
        return jsonError(res, 400, 'Invalid month. Use YYYY-MM.')
      }

      const { since, until } = range
      const pool = getPool()

      const totalsResult = await pool.query(
        `
          SELECT
            COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
            COALESCE(SUM(cm.impressions), 0) AS impressions,
            COALESCE(SUM(cm.clicks), 0) AS clicks,
            SUM(cm.revenue_cents) AS revenue_cents
          FROM campaign_metrics cm
          WHERE cm.metric_date BETWEEN $1::date AND $2::date
        `,
        [since, until]
      )

      const totalsRow = totalsResult.rows?.[0] ?? {}
      const spendCents = toInt(totalsRow.spend_cents)
      const impressions = toInt(totalsRow.impressions)
      const clicks = toInt(totalsRow.clicks)
      const revenueCents = toNullableInt(totalsRow.revenue_cents)
      const profitCents = revenueCents === null ? null : revenueCents - spendCents

      const dailyResult = await pool.query(
        `
          SELECT
            cm.metric_date::text AS metric_date,
            COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
            SUM(cm.revenue_cents) AS revenue_cents,
            COALESCE(SUM(cm.impressions), 0) AS impressions,
            COALESCE(SUM(cm.clicks), 0) AS clicks
          FROM campaign_metrics cm
          WHERE cm.metric_date BETWEEN $1::date AND $2::date
          GROUP BY cm.metric_date
          ORDER BY cm.metric_date ASC
        `,
        [since, until]
      )

      const daily = dailyResult.rows.map((r) => {
        const spend = toInt(r.spend_cents)
        const revenue = toNullableInt(r.revenue_cents)
        const profit = revenue === null ? null : revenue - spend
        return {
          date: r.metric_date,
          spend_cents: spend,
          revenue_cents: revenue,
          profit_cents: profit,
          roi_percent: computeRoiPercent({ spendCents: spend, revenueCents: revenue }),
          impressions: toInt(r.impressions),
          clicks: toInt(r.clicks)
        }
      })

      const ranked = daily.filter((d) => typeof d.roi_percent === 'number')
      const bestDay = ranked.length
        ? ranked.reduce((best, cur) => (cur.roi_percent > best.roi_percent ? cur : best), ranked[0])
        : null
      const worstDay = ranked.length
        ? ranked.reduce((best, cur) => (cur.roi_percent < best.roi_percent ? cur : best), ranked[0])
        : null

      const roiSeries = daily.map((d) => ({
        date: d.date,
        roi_percent: d.roi_percent
      }))

      return res.json({
        ok: true,
        month,
        range: { since, until },
        totals: {
          spend_cents: spendCents,
          revenue_cents: revenueCents,
          profit_cents: profitCents,
          impressions,
          clicks,
          roi_percent: computeRoiPercent({ spendCents, revenueCents })
        },
        daily,
        bestDay,
        worstDay,
        roiSeries
      })
    })
  )

  router.get(
    '/roi-d1',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const date = parseDateOrNull(req.query.date) ?? addDaysUtc(todayUtcYyyyMmDd(), -1)
      if (!isYyyyMmDd(date)) {
        return jsonError(res, 400, 'Invalid date. Use YYYY-MM-DD.')
      }

      const pool = getPool()

      const totalsResult = await pool.query(
        `
          SELECT
            COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
            SUM(cm.revenue_cents) AS revenue_cents
          FROM campaign_metrics cm
          WHERE cm.metric_date = $1::date
        `,
        [date]
      )
      const totalsRow = totalsResult.rows?.[0] ?? {}
      const spendCents = toInt(totalsRow.spend_cents)
      const revenueCents = toNullableInt(totalsRow.revenue_cents)
      const profitCents = revenueCents === null ? null : revenueCents - spendCents

      const rowsResult = await pool.query(
        `
          SELECT
            c.name AS campaign_name,
            gc.country_code,
            gc.status AS generated_status,
            COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
            SUM(cm.revenue_cents) AS revenue_cents
          FROM campaign_metrics cm
          JOIN generated_campaigns gc ON gc.id = cm.generated_campaign_id
          JOIN campaigns c ON c.id = gc.campaign_id
          WHERE cm.metric_date = $1::date
          GROUP BY c.name, gc.country_code, gc.status
          ORDER BY COALESCE(SUM(cm.revenue_cents), 0) - COALESCE(SUM(cm.spend_cents), 0) DESC, c.name ASC
        `,
        [date]
      )

      const rows = rowsResult.rows.map((r) => {
        const spend = toInt(r.spend_cents)
        const revenue = toNullableInt(r.revenue_cents)
        const profit = revenue === null ? null : revenue - spend
        return {
          campaign_name: r.campaign_name,
          country_code: r.country_code,
          status: r.generated_status,
          spend_cents: spend,
          revenue_cents: revenue,
          profit_cents: profit,
          roi_percent: computeRoiPercent({ spendCents: spend, revenueCents: revenue })
        }
      })

      return res.json({
        ok: true,
        date,
        summary: {
          spend_cents: spendCents,
          revenue_cents: revenueCents,
          profit_cents: profitCents,
          roi_percent: computeRoiPercent({ spendCents, revenueCents })
        },
        rows
      })
    })
  )

  router.get(
    '/overview',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const until = parseDateOrNull(req.query.until) ?? todayUtcYyyyMmDd()
      const since = parseDateOrNull(req.query.since) ?? addDaysUtc(until, -6)
      if (!isYyyyMmDd(since) || !isYyyyMmDd(until)) {
        return jsonError(res, 400, 'Invalid date range. Use YYYY-MM-DD.')
      }
      if (since > until) {
        return jsonError(res, 400, 'Invalid date range (since > until).')
      }

      const limit = parseLimit(req.query.limit, 200, 1000)
      const pool = getPool()

      const totalsResult = await pool.query(
        `
          SELECT
            COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
            COALESCE(SUM(cm.impressions), 0) AS impressions,
            COALESCE(SUM(cm.clicks), 0) AS clicks,
            SUM(cm.revenue_cents) AS revenue_cents
          FROM campaign_metrics cm
          WHERE cm.metric_date BETWEEN $1::date AND $2::date
        `,
        [since, until]
      )
      const totalsRow = totalsResult.rows?.[0] ?? {}
      const spendCents = toInt(totalsRow.spend_cents)
      const impressions = toInt(totalsRow.impressions)
      const clicks = toInt(totalsRow.clicks)
      const revenueCents = toNullableInt(totalsRow.revenue_cents)

      const dailyResult = await pool.query(
        `
          SELECT
            cm.metric_date::text AS metric_date,
            COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
            SUM(cm.revenue_cents) AS revenue_cents
          FROM campaign_metrics cm
          WHERE cm.metric_date BETWEEN $1::date AND $2::date
          GROUP BY cm.metric_date
          ORDER BY cm.metric_date ASC
        `,
        [since, until]
      )

      const breakdownResult = await pool.query(
        `
          SELECT
            c.name AS campaign_name,
            gc.country_code,
            gc.status AS generated_status,
            COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
            SUM(cm.revenue_cents) AS revenue_cents,
            COALESCE(SUM(cm.impressions), 0) AS impressions,
            COALESCE(SUM(cm.clicks), 0) AS clicks
          FROM campaign_metrics cm
          JOIN generated_campaigns gc ON gc.id = cm.generated_campaign_id
          JOIN campaigns c ON c.id = gc.campaign_id
          WHERE cm.metric_date BETWEEN $1::date AND $2::date
          GROUP BY c.name, gc.country_code, gc.status
          ORDER BY SUM(cm.spend_cents) DESC, c.name ASC, gc.country_code ASC
          LIMIT $3
        `,
        [since, until, limit]
      )

      return res.json({
        ok: true,
        range: { since, until },
        totals: {
          spend_cents: spendCents,
          impressions,
          clicks,
          cpc_cents: computeCpcCents({ spendCents, clicks }),
          cpm_cents: computeCpmCents({ spendCents, impressions }),
          revenue_cents: revenueCents,
          roi_percent: computeRoiPercent({ spendCents, revenueCents })
        },
        spend_series: dailyResult.rows.map((r) => ({
          metric_date: r.metric_date,
          spend_cents: toInt(r.spend_cents)
        })),
        performance_series: dailyResult.rows.map((r) => {
          const spendCentsDay = toInt(r.spend_cents)
          const revenueCentsDay = toNullableInt(r.revenue_cents)
          const profitCentsDay = revenueCentsDay === null ? null : revenueCentsDay - spendCentsDay
          return {
            metric_date: r.metric_date,
            spend_cents: spendCentsDay,
            revenue_cents: revenueCentsDay,
            profit_cents: profitCentsDay,
            roi_percent: computeRoiPercent({ spendCents: spendCentsDay, revenueCents: revenueCentsDay }),
            roas:
              revenueCentsDay === null || !spendCentsDay
                ? null
                : Math.round((revenueCentsDay / spendCentsDay) * 1000) / 1000
          }
        }),
        breakdown: breakdownResult.rows.map((r) => ({
          campaign_name: r.campaign_name,
          country_code: r.country_code,
          status: r.generated_status,
          spend_cents: toInt(r.spend_cents),
          revenue_cents: toNullableInt(r.revenue_cents),
          profit_cents:
            toNullableInt(r.revenue_cents) === null ? null : toNullableInt(r.revenue_cents) - toInt(r.spend_cents),
          roi_percent: computeRoiPercent({ spendCents: toInt(r.spend_cents), revenueCents: toNullableInt(r.revenue_cents) }),
          roas:
            toNullableInt(r.revenue_cents) === null || !toInt(r.spend_cents)
              ? null
              : Math.round((toNullableInt(r.revenue_cents) / toInt(r.spend_cents)) * 1000) / 1000,
          impressions: toInt(r.impressions),
          clicks: toInt(r.clicks),
          cpc_cents: computeCpcCents({ spendCents: toInt(r.spend_cents), clicks: toInt(r.clicks) }),
          cpm_cents: computeCpmCents({ spendCents: toInt(r.spend_cents), impressions: toInt(r.impressions) })
        }))
      })
    })
  )

  router.get(
    '/roi',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      // ROI mínimo operacional (P22) é protegido por login.
      // (O endpoint legacy /roi continua sem auth para compatibilidade interna.)
      // Use /roi-operational para operação com ações.

      const date = parseDateOrNull(req.query.date) ?? addDaysUtc(todayUtcYyyyMmDd(), -1)
      if (!isYyyyMmDd(date)) {
        return jsonError(res, 400, 'Invalid date. Use YYYY-MM-DD.')
      }

      const pool = getPool()
      const rowsResult = await pool.query(
        `
          SELECT
            c.name AS campaign_name,
            gc.country_code,
            gc.status AS generated_status,
            COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
            SUM(cm.revenue_cents) AS revenue_cents
          FROM campaign_metrics cm
          JOIN generated_campaigns gc ON gc.id = cm.generated_campaign_id
          JOIN campaigns c ON c.id = gc.campaign_id
          WHERE cm.metric_date = $1::date
          GROUP BY c.name, gc.country_code, gc.status
          ORDER BY SUM(cm.spend_cents) DESC, c.name ASC, gc.country_code ASC
        `,
        [date]
      )

      const list = rowsResult.rows.map((r) => {
        const spendCents = toInt(r.spend_cents)
        const revenueCents = toNullableInt(r.revenue_cents)
        const profitCents = revenueCents === null ? null : revenueCents - spendCents
        return {
          campaign_name: r.campaign_name,
          country_code: r.country_code,
          status: r.generated_status,
          spend_cents: spendCents,
          revenue_cents: revenueCents,
          profit_cents: profitCents,
          roi_percent: computeRoiPercent({ spendCents, revenueCents })
        }
      })

      const totals = list.reduce(
        (acc, r) => {
          acc.spend_cents += r.spend_cents
          if (r.revenue_cents !== null) acc.revenue_cents += r.revenue_cents
          else acc.has_null_revenue = true
          return acc
        },
        { spend_cents: 0, revenue_cents: 0, has_null_revenue: false }
      )

      const revenueCents = totals.has_null_revenue ? null : totals.revenue_cents
      const profitCents = revenueCents === null ? null : revenueCents - totals.spend_cents

      return res.json({
        ok: true,
        date,
        summary: {
          spend_cents: totals.spend_cents,
          revenue_cents: revenueCents,
          profit_cents: profitCents,
          roi_percent: computeRoiPercent({ spendCents: totals.spend_cents, revenueCents })
        },
        rows: list
      })
    })
  )

  router.get(
    '/roi-operational',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const auth = await requireAuthAsync(req, res)
      if (!auth) return

      const date = parseDateOrNull(req.query.date) ?? addDaysUtc(todayUtcYyyyMmDd(), -1)
      if (!isYyyyMmDd(date)) {
        return jsonError(res, 400, 'Invalid date. Use YYYY-MM-DD.')
      }

      const limit = parseLimit(req.query.limit, 200, 500)
      const pool = getPool()

      const totalsResult = await pool.query(
        `
          SELECT
            COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
            SUM(cm.revenue_cents) AS revenue_cents
          FROM campaign_metrics cm
          WHERE cm.metric_date = $1::date
        `,
        [date]
      )

      const totalsRow = totalsResult.rows?.[0] ?? {}
      const spendCents = toInt(totalsRow.spend_cents)
      const revenueCents = toNullableInt(totalsRow.revenue_cents)
      const profitCents = revenueCents === null ? null : revenueCents - spendCents

      const rowsResult = await pool.query(
        `
          SELECT
            gc.id AS generated_campaign_id,
            c.name AS campaign_name,
            gc.country_code,
            gc.status AS generated_status,
            gc.meta_run_mode,
            gc.meta_campaign_id,
            gc.meta_adset_id,
            COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
            SUM(cm.revenue_cents) AS revenue_cents
          FROM campaign_metrics cm
          JOIN generated_campaigns gc ON gc.id = cm.generated_campaign_id
          JOIN campaigns c ON c.id = gc.campaign_id
          WHERE cm.metric_date = $1::date
          GROUP BY
            gc.id,
            c.name,
            gc.country_code,
            gc.status,
            gc.meta_run_mode,
            gc.meta_campaign_id,
            gc.meta_adset_id
          ORDER BY COALESCE(SUM(cm.revenue_cents), 0) - COALESCE(SUM(cm.spend_cents), 0) DESC, c.name ASC
          LIMIT $2
        `,
        [date, limit]
      )

      const rows = rowsResult.rows.map((r) => {
        const spend = toInt(r.spend_cents)
        const revenue = toNullableInt(r.revenue_cents)
        const profit = revenue === null ? null : revenue - spend
        return {
          generated_campaign_id: r.generated_campaign_id,
          campaign_name: r.campaign_name,
          country_code: r.country_code,
          status: r.generated_status,
          meta_run_mode: r.meta_run_mode ?? null,
          meta_campaign_id: r.meta_campaign_id ?? null,
          meta_adset_id: r.meta_adset_id ?? null,
          spend_cents: spend,
          revenue_cents: revenue,
          profit_cents: profit,
          roi_percent: computeRoiPercent({ spendCents: spend, revenueCents: revenue })
        }
      })

      return res.json({
        ok: true,
        date,
        summary: {
          spend_cents: spendCents,
          revenue_cents: revenueCents,
          profit_cents: profitCents,
          roi_percent: computeRoiPercent({ spendCents, revenueCents })
        },
        rows
      })
    })
  )

  router.post(
    '/revenue',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const auth = await requireAuthAsync(req, res)
      if (!auth) return

      const generatedCampaignId = normalizeNonEmptyString(req.body?.generatedCampaignId)
      if (!generatedCampaignId || !isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generatedCampaignId')
      }

      const date = parseDateOrNull(req.body?.date) ?? null
      if (!date || !isYyyyMmDd(date)) {
        return jsonError(res, 400, 'Invalid date. Use YYYY-MM-DD.')
      }

      const revenueCentsRaw = req.body?.revenueCents
      let revenueCents = null
      if (revenueCentsRaw !== null && revenueCentsRaw !== undefined) {
        const n = Number(revenueCentsRaw)
        if (!Number.isFinite(n) || n < 0) {
          return jsonError(res, 400, 'Invalid revenueCents (expected >= 0)')
        }
        revenueCents = Math.trunc(n)
      }

      const pool = getPool()
      const { rowCount: exists } = await pool.query(`SELECT 1 FROM generated_campaigns WHERE id = $1`, [generatedCampaignId])
      if (exists === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      const { rows } = await pool.query(
        `
          INSERT INTO campaign_metrics (generated_campaign_id, metric_date, revenue_cents)
          VALUES ($1::uuid, $2::date, $3::integer)
          ON CONFLICT (generated_campaign_id, metric_date)
          DO UPDATE SET revenue_cents = EXCLUDED.revenue_cents
          RETURNING
            id,
            generated_campaign_id,
            metric_date::text AS metric_date,
            spend_cents,
            impressions,
            clicks,
            revenue_cents,
            created_at
        `,
        [generatedCampaignId, date, revenueCents]
      )

      return res.status(201).json({ ok: true, campaign_metric: rows[0] })
    })
  )

  return router
}
