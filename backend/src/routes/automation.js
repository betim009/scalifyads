import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError } from '../lib/http.js'
import { runAutomation } from '../automation/executor.js'

function isYyyyMmDd(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function automationRouter() {
  const router = Router()

  router.get(
    '/scheduler/status',
    asyncHandler(async (req, res) => {
      const scheduler = req.app.locals.automationScheduler ?? { enabled: false, status: 'unknown' }
      return res.json({ ok: true, scheduler })
    })
  )

  router.post(
    '/run',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const date = typeof req.body?.date === 'string' ? req.body.date : null
      if (date && !isYyyyMmDd(date)) {
        return jsonError(res, 400, 'Invalid date (expected YYYY-MM-DD)')
      }

      const dryRun = Boolean(req.body?.dryRun)
      const pool = getPool()
      const result = await runAutomation({ pool, date, dryRun })
      return res.json({ ok: true, automation: result })
    })
  )

  return router
}
