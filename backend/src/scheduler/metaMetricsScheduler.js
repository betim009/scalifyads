import { getPool } from '../db.js'
import { resolveAccessTokenForScheduler } from '../meta/accessToken.js'
import { syncGeneratedCampaignMetrics } from '../meta/sync.js'

function parseBool(value) {
  const v = String(value ?? '').trim().toLowerCase()
  if (!v) return false
  return v === '1' || v === 'true' || v === 'yes' || v === 'y' || v === 'on'
}

function parseIntervalMs(value, fallbackMs) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallbackMs
  return Math.trunc(n)
}

function parseLimit(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(200, Math.trunc(n))
}

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function isRealMetaId(value) {
  const id = normalizeNonEmptyString(value)
  if (!id) return false
  return !id.startsWith('stub-')
}

export function startMetaMetricsScheduler(app) {
  const enabled = parseBool(process.env.META_METRICS_SCHEDULER_ENABLED)
  const intervalMs = parseIntervalMs(process.env.META_METRICS_SCHEDULER_INTERVAL_MS, 60 * 60 * 1000)
  const limit = parseLimit(process.env.META_METRICS_SCHEDULER_LIMIT, 25)
  const runOnStartup = parseBool(process.env.META_METRICS_SCHEDULER_RUN_ON_STARTUP)

  const state = {
    enabled,
    intervalMs,
    limit,
    runOnStartup,
    status: enabled ? (app.locals.dbEnabled ? 'enabled' : 'blocked_db_disabled') : 'disabled',
    running: false,
    lastRunAt: null,
    lastOkAt: null,
    lastErrorAt: null,
    lastError: null,
    lastResult: null
  }

  app.locals.metaMetricsScheduler = state

  if (!enabled) {
    return { stop: () => {} }
  }

  if (!app.locals.dbEnabled) {
    console.log('[scheduler] meta metrics scheduler enabled but DB is disabled (skipping)')
    return { stop: () => {} }
  }

  let timer = null
  let stopped = false

  async function tick() {
    if (stopped) return
    if (state.running) return
    state.running = true
    state.lastRunAt = new Date().toISOString()

    const pool = getPool()
    try {
      const accessToken = await resolveAccessTokenForScheduler(pool)
      if (!accessToken) {
        state.lastResult = { ok: false, reason: 'missing_access_token' }
        state.lastErrorAt = null
        state.lastError = null
        state.status = 'blocked_missing_access_token'
        return
      }

      state.status = 'enabled'

      const { rows } = await pool.query(
        `
          SELECT id, meta_campaign_id
          FROM generated_campaigns
          WHERE meta_campaign_id IS NOT NULL
          ORDER BY created_at DESC
          LIMIT $1
        `,
        [limit]
      )

      let scanned = 0
      let synced = 0
      let failed = 0
      const providers = {}

      for (const gc of rows ?? []) {
        scanned += 1
        if (!isRealMetaId(gc.meta_campaign_id)) continue

        try {
          const result = await syncGeneratedCampaignMetrics({
            pool,
            generatedCampaignId: gc.id,
            metaCampaignId: String(gc.meta_campaign_id),
            accessToken
          })
          synced += 1
          const p = normalizeNonEmptyString(result?.provider) ?? 'unknown'
          providers[p] = (providers[p] ?? 0) + 1
        } catch (err) {
          failed += 1
          console.log('[scheduler] meta metrics sync failed', {
            generatedCampaignId: gc.id,
            error: err?.message ? String(err.message) : 'sync_failed'
          })
        }
      }

      const result = { ok: true, scanned, synced, failed, providers }
      state.lastOkAt = new Date().toISOString()
      state.lastErrorAt = null
      state.lastError = null
      state.lastResult = result
    } catch (err) {
      state.lastErrorAt = new Date().toISOString()
      state.lastError = err?.message ? String(err.message) : 'meta_metrics_scheduler_failed'
      console.error('[scheduler] meta metrics scheduler error', err)
    } finally {
      state.running = false
    }
  }

  timer = setInterval(tick, intervalMs)
  timer.unref?.()

  console.log('[scheduler] meta metrics scheduler started', { intervalMs, limit, runOnStartup })

  if (runOnStartup) {
    setTimeout(() => {
      tick().catch(() => {
        // ignore
      })
    }, 2500).unref?.()
  }

  return {
    stop() {
      stopped = true
      if (timer) clearInterval(timer)
      timer = null
      state.status = 'stopped'
    }
  }
}

