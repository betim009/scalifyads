import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'

export function schedulerRouter() {
  const router = Router()

  router.get(
    '/status',
    asyncHandler(async (req, res) => {
      return res.json({
        ok: true,
        schedulers: {
          automation: req.app.locals.automationScheduler ?? null,
          metaStatus: req.app.locals.metaStatusScheduler ?? null,
          metaMetrics: req.app.locals.metaMetricsScheduler ?? null
        }
      })
    })
  )

  return router
}
