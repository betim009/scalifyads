import { Router } from 'express'
import { getPool } from '../db.js'
import { jsonError, parseLimit } from '../lib/http.js'
import { asyncHandler } from '../lib/asyncHandler.js'

export function objectivesRouter() {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

    const limit = parseLimit(req.query.limit, 100, 500)
    const pool = getPool()
    const { rows } = await pool.query(
      `
        SELECT key, label, meta_value
        FROM campaign_objectives
        ORDER BY key ASC
        LIMIT $1
      `,
      [limit]
    )

      return res.json({ ok: true, objectives: rows })
    })
  )

  return router
}
