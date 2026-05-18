import { getPool } from '../db.js'
import { runAutomation } from '../automation/executor.js'

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

export function startAutomationScheduler(app) {
  const enabled = parseBool(process.env.AUTOMATION_SCHEDULER_ENABLED)
  const intervalMs = parseIntervalMs(process.env.AUTOMATION_SCHEDULER_INTERVAL_MS, 60 * 60 * 1000)
  const runOnStartup = parseBool(process.env.AUTOMATION_SCHEDULER_RUN_ON_STARTUP)

  const state = {
    enabled,
    intervalMs,
    runOnStartup,
    status: enabled ? (app.locals.dbEnabled ? 'enabled' : 'blocked_db_disabled') : 'disabled',
    running: false,
    lastRunAt: null,
    lastOkAt: null,
    lastErrorAt: null,
    lastError: null,
    lastResult: null
  }

  app.locals.automationScheduler = state

  if (!enabled) {
    return { stop: () => {} }
  }

  if (!app.locals.dbEnabled) {
    console.log('[scheduler] automation scheduler enabled but DB is disabled (skipping)')
    return { stop: () => {} }
  }

  let timer = null
  let stopped = false

  async function tick() {
    if (stopped) return
    if (state.running) return
    state.running = true
    state.lastRunAt = new Date().toISOString()
    try {
      const pool = getPool()
      const result = await runAutomation({ pool })
      state.lastOkAt = new Date().toISOString()
      state.lastErrorAt = null
      state.lastError = null
      state.lastResult = result
      console.log('[scheduler] automation ok', { date: result?.date ?? null, dryRun: result?.dryRun ?? null })
    } catch (err) {
      state.lastErrorAt = new Date().toISOString()
      state.lastError = err?.message ? String(err.message) : 'automation_failed'
      console.error('[scheduler] automation error', err)
    } finally {
      state.running = false
    }
  }

  timer = setInterval(tick, intervalMs)
  timer.unref?.()

  console.log('[scheduler] automation scheduler started', { intervalMs, runOnStartup })

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

