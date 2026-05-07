import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError } from '../lib/http.js'
import { isUuid } from '../lib/validate.js'
import { syncGeneratedCampaignMetrics } from '../meta/sync.js'
import { metaFetchMe } from '../meta/graph.js'
import { coerceAccessToken, resolveAccessToken } from '../meta/accessToken.js'
import { metaCreateCampaign, metaFetchCampaign } from '../meta/campaigns.js'

function parseDateOrNull(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return null
  return d.toISOString()
}

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeMetaAdAccountId(value) {
  const raw = normalizeNonEmptyString(value)
  if (!raw) return null
  const stripped = raw.replace(/^act_/, '')
  if (!/^\d+$/.test(stripped)) return null
  return `act_${stripped}`
}

export function metaRouter() {
  const router = Router()

  router.get(
    '/tokens',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const pool = getPool()
      const { rows } = await pool.query(
        `
          SELECT id, user_id, meta_user_id, expires_at, created_at
          FROM meta_tokens
          ORDER BY created_at DESC
          LIMIT 10
        `
      )

      return res.json({ ok: true, tokens: rows })
    })
  )

  router.post(
    '/tokens',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const userId = req.body?.userId ?? null
      if (userId !== null && userId !== undefined && !isUuid(userId)) {
        return jsonError(res, 400, 'Invalid userId')
      }

      const metaUserId =
        typeof req.body?.metaUserId === 'string' && req.body.metaUserId.trim()
          ? req.body.metaUserId.trim()
          : null

      const accessToken = coerceAccessToken(req.body?.accessToken)
      if (!accessToken) {
        return jsonError(res, 400, 'Invalid accessToken')
      }

      const expiresAt = parseDateOrNull(req.body?.expiresAt)
      if (req.body?.expiresAt && !expiresAt) {
        return jsonError(res, 400, 'Invalid expiresAt (expected ISO date string)')
      }

      const pool = getPool()
      const { rows } = await pool.query(
        `
          INSERT INTO meta_tokens (user_id, meta_user_id, access_token, expires_at)
          VALUES ($1::uuid, $2, $3, $4::timestamptz)
          RETURNING id, user_id, meta_user_id, expires_at, created_at
        `,
        [userId, metaUserId, accessToken, expiresAt]
      )

      return res.status(201).json({ ok: true, token: rows[0] })
    })
  )

  router.post(
    '/validate',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(res, 400, 'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)')
      }

      try {
        const me = await metaFetchMe({ accessToken })
        return res.json({ ok: true, me })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta Graph validation failed', err?.details)
      }
    })
  )

  router.get(
    '/status',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      return res.json({
        ok: true,
        provider: process.env.META_SYNC_PROVIDER ?? null,
        graph_version: process.env.META_GRAPH_VERSION ?? null,
        has_access_token: Boolean(accessToken)
      })
    })
  )

  router.post(
    '/sync/generated-campaigns/:id',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const generatedCampaignId = req.params.id
      if (!isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generated campaign id')
      }

      const startDate = typeof req.body?.startDate === 'string' ? req.body.startDate : null
      const endDate = typeof req.body?.endDate === 'string' ? req.body.endDate : null

      const pool = getPool()
      const gc = await pool.query(
        `
          SELECT id, meta_campaign_id
          FROM generated_campaigns
          WHERE id = $1
        `,
        [generatedCampaignId]
      )

      if (gc.rowCount === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      const metaCampaignId = gc.rows[0].meta_campaign_id
      if (typeof metaCampaignId !== 'string' || !metaCampaignId.trim()) {
        return jsonError(res, 400, 'Generated campaign is not published (missing meta_campaign_id)')
      }

      const accessToken = await resolveAccessToken(pool, req)
      try {
        const result = await syncGeneratedCampaignMetrics({
          pool,
          generatedCampaignId,
          metaCampaignId: metaCampaignId.trim(),
          accessToken,
          startDate,
          endDate
        })

        return res.json({ ok: true, sync: result })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta sync failed', err?.details)
      }
    })
  )

  router.post(
    '/campaigns',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const generatedCampaignId = req.body?.generatedCampaignId
      if (typeof generatedCampaignId !== 'string' || !isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generatedCampaignId')
      }

      const metaAdAccountId = normalizeMetaAdAccountId(req.body?.metaAdAccountId)
      if (!metaAdAccountId) {
        return jsonError(res, 400, 'Invalid metaAdAccountId (expected act_<digits>)')
      }

      const pool = getPool()

      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      const { rows: gcRows, rowCount } = await pool.query(
        `
          SELECT
            gc.id,
            gc.name,
            gc.meta_campaign_id,
            c.objective_key,
            o.meta_value AS objective_meta_value
          FROM generated_campaigns gc
          JOIN campaigns c ON c.id = gc.campaign_id
          LEFT JOIN campaign_objectives o ON o.key = c.objective_key
          WHERE gc.id = $1
        `,
        [generatedCampaignId]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      const gc = gcRows[0]
      const existing = normalizeNonEmptyString(gc.meta_campaign_id)
      if (existing && !existing.startsWith('stub-') && req.body?.force !== true) {
        return jsonError(res, 409, 'Generated campaign already has meta_campaign_id', {
          meta_campaign_id: existing
        })
      }

      const objective =
        normalizeNonEmptyString(gc.objective_meta_value) ?? normalizeNonEmptyString(req.body?.objective)
      if (!objective) {
        return jsonError(res, 400, 'Missing objective (set campaign objective or provide body.objective)')
      }

      let metaUserId = normalizeNonEmptyString(req.body?.metaUserId)
      if (!metaUserId) {
        try {
          const me = await metaFetchMe({ accessToken })
          metaUserId = normalizeNonEmptyString(me?.id)
        } catch (err) {
          const status = typeof err?.status === 'number' ? err.status : 502
          return jsonError(res, status, err?.message ?? 'Meta Graph validation failed', err?.details)
        }
      }

      try {
        const created = await metaCreateCampaign({
          metaAdAccountId,
          name: gc.name,
          objective,
          accessToken
        })

        const updated = await pool.query(
          `
            UPDATE generated_campaigns
            SET
              meta_campaign_id = $2,
              meta_ad_account_id = $3,
              meta_user_id = $4,
              meta_status = $5,
              meta_effective_status = $6,
              meta_objective = $7
            WHERE id = $1
            RETURNING
              id,
              campaign_id,
              country_code,
              meta_campaign_id,
              meta_ad_account_id,
              meta_user_id,
              meta_status,
              meta_effective_status,
              meta_objective,
              name,
              status,
              created_at
          `,
          [
            generatedCampaignId,
            String(created.id),
            metaAdAccountId,
            metaUserId,
            normalizeNonEmptyString(created?.status),
            normalizeNonEmptyString(created?.effective_status),
            normalizeNonEmptyString(created?.objective)
          ]
        )

        return res.status(201).json({
          ok: true,
          meta_campaign: created,
          generated_campaign: updated.rows[0]
        })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta campaign creation failed', err?.details)
      }
    })
  )

  router.get(
    '/campaigns/:id',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const metaCampaignId = normalizeNonEmptyString(req.params.id)
      if (!metaCampaignId) {
        return jsonError(res, 400, 'Invalid meta campaign id')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const campaign = await metaFetchCampaign({ metaCampaignId, accessToken })
        return res.json({ ok: true, meta_campaign: campaign })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta campaign fetch failed', err?.details)
      }
    })
  )

  return router
}
