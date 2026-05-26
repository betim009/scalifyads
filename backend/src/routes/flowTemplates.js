import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError, parseLimit } from '../lib/http.js'
import { resolveAuthUser } from '../lib/internalAuth.js'
import { isUuid } from '../lib/validate.js'
import { libreTranslateText } from '../services/libreTranslate.js'

function normalizeNonEmptyString(value, { maxLen } = {}) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (maxLen && trimmed.length > maxLen) return trimmed.slice(0, maxLen)
  return trimmed
}

export function flowTemplatesRouter() {
  const router = Router()

  router.use(
    asyncHandler(async (req, res, next) => {
      if (!req.app.locals.dbEnabled) {
        req.auth = null
        return next()
      }
      const pool = getPool()
      req.auth = await resolveAuthUser(pool, req)
      return next()
    })
  )

  function requireAuth(req, res) {
    if (!req.app.locals.dbEnabled) return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
    if (!req.auth?.userId) return jsonError(res, 401, 'Login required')
    return null
  }

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const limit = parseLimit(req.query.limit, 50, 200)
      const pool = getPool()
      const { rows } = await pool.query(
        `
          SELECT
            id,
            user_id,
            name,
            payload,
            created_at,
            updated_at
          FROM flow_templates
          WHERE user_id = $1::uuid
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [req.auth.userId, limit]
      )

      return res.json({ ok: true, flow_templates: rows })
    })
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const name = normalizeNonEmptyString(req.body?.name, { maxLen: 140 })
      if (!name) return jsonError(res, 400, 'Invalid name')

      const payload = req.body?.payload
      if (payload != null && typeof payload !== 'object') {
        return jsonError(res, 400, 'Invalid payload (expected object)')
      }

      const pool = getPool()
      const { rows } = await pool.query(
        `
          INSERT INTO flow_templates (user_id, name, payload)
          VALUES ($1::uuid, $2, $3::jsonb)
          RETURNING
            id,
            user_id,
            name,
            payload,
            created_at,
            updated_at
        `,
        [req.auth.userId, name, JSON.stringify(payload ?? {})]
      )

      return res.status(201).json({ ok: true, flow_template: rows[0] })
    })
  )

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const id = req.params.id
      if (!isUuid(id)) return jsonError(res, 400, 'Invalid flow template id')

      const name = normalizeNonEmptyString(req.body?.name, { maxLen: 140 })
      const payload = req.body?.payload
      if (payload !== undefined && payload !== null && typeof payload !== 'object') {
        return jsonError(res, 400, 'Invalid payload (expected object)')
      }

      if (!name && payload === undefined) {
        return jsonError(res, 400, 'Nothing to update')
      }

      const pool = getPool()
      const { rows, rowCount } = await pool.query(
        `
          UPDATE flow_templates
          SET
            name = COALESCE($3, name),
            payload = COALESCE($4::jsonb, payload),
            updated_at = now()
          WHERE id = $1::uuid AND user_id = $2::uuid
          RETURNING
            id,
            user_id,
            name,
            payload,
            created_at,
            updated_at
        `,
        [id, req.auth.userId, name ?? null, payload === undefined ? null : JSON.stringify(payload ?? {})]
      )

      if (rowCount === 0) return jsonError(res, 404, 'Flow template not found')
      return res.json({ ok: true, flow_template: rows[0] })
    })
  )

  router.post(
    '/:id/generate-translations',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const id = req.params.id
      if (!isUuid(id)) return jsonError(res, 400, 'Invalid flow template id')

      const overwrite = Boolean(req.body?.overwrite)

      const pool = getPool()
      const { rows: found, rowCount } = await pool.query(
        `
          SELECT id, user_id, name, payload, created_at, updated_at
          FROM flow_templates
          WHERE id = $1::uuid AND user_id = $2::uuid
          LIMIT 1
        `,
        [id, req.auth.userId]
      )
      if (rowCount === 0) return jsonError(res, 404, 'Flow template not found')

      const tpl = found[0]
      const payload = tpl?.payload && typeof tpl.payload === 'object' ? tpl.payload : {}

      const basePrimaryText = normalizeNonEmptyString(payload?.primaryText, { maxLen: 5000 })
      const baseHeadline = normalizeNonEmptyString(payload?.headline, { maxLen: 255 })
      const baseDescription = normalizeNonEmptyString(payload?.description, { maxLen: 1000 })

      if (!basePrimaryText && !baseHeadline && !baseDescription) {
        return jsonError(res, 400, 'Nothing to translate (primaryText/headline/description are empty)')
      }

      const { rows: op } = await pool.query(
        `
          SELECT country_code, primary_language
          FROM user_operational_countries
          WHERE user_id = $1::uuid
          ORDER BY country_code ASC
        `,
        [req.auth.userId]
      )

      const allowedCountryCodes = Array.isArray(payload?.countryCodes)
        ? new Set(payload.countryCodes.map((c) => String(c || '').trim().toUpperCase()).filter(Boolean))
        : null

      const translationsByCountry =
        payload?.translationsByCountry && typeof payload.translationsByCountry === 'object' ? payload.translationsByCountry : {}

      const nextTranslationsByCountry = { ...translationsByCountry }

      for (const row of op) {
        const countryCode = normalizeNonEmptyString(row?.country_code, { maxLen: 12 })
        const lang = normalizeNonEmptyString(row?.primary_language, { maxLen: 12 })
        if (!countryCode || !lang) continue
        if (allowedCountryCodes && allowedCountryCodes.size > 0 && !allowedCountryCodes.has(countryCode.toUpperCase())) continue

        const existing = nextTranslationsByCountry[countryCode] && typeof nextTranslationsByCountry[countryCode] === 'object'
          ? nextTranslationsByCountry[countryCode]
          : null

        if (!overwrite && existing && normalizeNonEmptyString(existing?.language) === lang) {
          // Already exists for this language; keep it.
          continue
        }

        const translatedPrimaryText = basePrimaryText ? await libreTranslateText({ q: basePrimaryText, source: 'auto', target: lang }) : ''
        const translatedHeadline = baseHeadline ? await libreTranslateText({ q: baseHeadline, source: 'auto', target: lang }) : ''
        const translatedDescription = baseDescription ? await libreTranslateText({ q: baseDescription, source: 'auto', target: lang }) : ''

        nextTranslationsByCountry[countryCode] = {
          language: lang,
          provider: 'libretranslate',
          sourceLanguage: 'auto',
          generatedAt: new Date().toISOString(),
          primaryText: translatedPrimaryText,
          headline: translatedHeadline,
          description: translatedDescription
        }
      }

      const nextPayload = { ...payload, translationsByCountry: nextTranslationsByCountry }

      const { rows: updated } = await pool.query(
        `
          UPDATE flow_templates
          SET payload = $3::jsonb, updated_at = now()
          WHERE id = $1::uuid AND user_id = $2::uuid
          RETURNING id, user_id, name, payload, created_at, updated_at
        `,
        [id, req.auth.userId, JSON.stringify(nextPayload)]
      )

      return res.json({ ok: true, flow_template: updated[0] })
    })
  )

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const id = req.params.id
      if (!isUuid(id)) return jsonError(res, 400, 'Invalid flow template id')

      const pool = getPool()
      const { rows, rowCount } = await pool.query(
        `
          DELETE FROM flow_templates
          WHERE id = $1::uuid AND user_id = $2::uuid
          RETURNING
            id,
            user_id,
            name,
            payload,
            created_at,
            updated_at
        `,
        [id, req.auth.userId]
      )

      if (rowCount === 0) return jsonError(res, 404, 'Flow template not found')
      return res.json({ ok: true, flow_template: rows[0] })
    })
  )

  return router
}
