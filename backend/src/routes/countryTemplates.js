import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError, parseLimit } from '../lib/http.js'
import { isUuid } from '../lib/validate.js'

function normalizeNonEmptyString(value, { maxLen } = {}) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (maxLen && trimmed.length > maxLen) return trimmed.slice(0, maxLen)
  return trimmed
}

function normalizeCodes(value) {
  if (!Array.isArray(value)) return []
  const codes = []
  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim().toUpperCase()
    if (!trimmed) continue
    if (trimmed.length > 8) continue
    codes.push(trimmed)
  }
  return Array.from(new Set(codes)).slice(0, 200)
}

export function countryTemplatesRouter() {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const limit = parseLimit(req.query.limit, 50, 200)
      const pool = getPool()

      const { rows } = await pool.query(
        `
          SELECT
            id,
            name,
            codes,
            created_at
          FROM country_templates
          ORDER BY created_at DESC
          LIMIT $1
        `,
        [limit]
      )

      return res.json({ ok: true, country_templates: rows })
    })
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const name = normalizeNonEmptyString(req.body?.name, { maxLen: 140 })
      if (!name) {
        return jsonError(res, 400, 'Invalid name')
      }

      const codes = normalizeCodes(req.body?.codes)
      if (codes.length === 0) {
        return jsonError(res, 400, 'Invalid codes (provide at least 1 country code)')
      }

      const pool = getPool()
      const { rows } = await pool.query(
        `
          INSERT INTO country_templates (name, codes)
          VALUES ($1, $2::text[])
          RETURNING id, name, codes, created_at
        `,
        [name, codes]
      )

      return res.status(201).json({ ok: true, country_template: rows[0] })
    })
  )

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const templateId = req.params.id
      if (!isUuid(templateId)) {
        return jsonError(res, 400, 'Invalid country template id')
      }

      const pool = getPool()
      const { rowCount } = await pool.query(`DELETE FROM country_templates WHERE id = $1`, [templateId])
      if (rowCount === 0) {
        return jsonError(res, 404, 'Country template not found')
      }

      return res.json({ ok: true })
    })
  )

  return router
}

