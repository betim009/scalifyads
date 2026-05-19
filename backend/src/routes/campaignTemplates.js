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

export function campaignTemplatesRouter() {
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
            payload,
            created_at
          FROM campaign_templates
          ORDER BY created_at DESC
          LIMIT $1
        `,
        [limit]
      )

      return res.json({ ok: true, campaign_templates: rows })
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
        return jsonError(res, 400, 'Invalid campaign template id')
      }

      const pool = getPool()
      const { rows, rowCount } = await pool.query(
        `
          DELETE FROM campaign_templates
          WHERE id = $1
          RETURNING
            id,
            name,
            payload,
            created_at
        `,
        [templateId]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Campaign template not found')
      }

      return res.json({ ok: true, campaign_template: rows[0] })
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

      const payload = req.body?.payload
      if (payload != null && typeof payload !== 'object') {
        return jsonError(res, 400, 'Invalid payload (expected object)')
      }

      const pool = getPool()
      const { rows } = await pool.query(
        `
          INSERT INTO campaign_templates (name, payload)
          VALUES ($1, $2::jsonb)
          RETURNING
            id,
            name,
            payload,
            created_at
        `,
        [name, JSON.stringify(payload ?? {})]
      )

      return res.status(201).json({ ok: true, campaign_template: rows[0] })
    })
  )

  router.post(
    '/from-generated/:id',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const generatedCampaignId = req.params.id
      if (!isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generated campaign id')
      }

      const pool = getPool()
      const { rows: found, rowCount } = await pool.query(
        `
          SELECT
            id,
            name,
            country_code,
            meta_objective,
            meta_ad_account_id,
            meta_run_mode,
            created_at
          FROM generated_campaigns
          WHERE id = $1
        `,
        [generatedCampaignId]
      )
      if (rowCount === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      const gc = found[0]

      const { rows: adsets } = await pool.query(
        `
          SELECT
            id,
            name
          FROM generated_adsets
          WHERE generated_campaign_id = $1
          ORDER BY created_at DESC
          LIMIT 50
        `,
        [generatedCampaignId]
      )

      const { rows: ads } = await pool.query(
        `
          SELECT
            id,
            generated_adset_id,
            creative_draft_id,
            name
          FROM generated_ads
          WHERE generated_campaign_id = $1
          ORDER BY created_at DESC
          LIMIT 200
        `,
        [generatedCampaignId]
      )

      const explicitName = normalizeNonEmptyString(req.body?.name, { maxLen: 140 })
      const fallbackName = normalizeNonEmptyString(gc?.name, { maxLen: 120 }) ?? `Template ${String(generatedCampaignId).slice(0, 8)}`
      const name = explicitName ?? `${fallbackName} (campaign template)`

      const payload = {
        generatedCampaignId,
        source: {
          createdAt: gc?.created_at ?? null,
          metaRunMode: gc?.meta_run_mode ?? null,
        },
        campaign: {
          name: gc?.name ?? null,
          countryCode: gc?.country_code ?? null,
          metaObjective: gc?.meta_objective ?? null,
          metaAdAccountId: gc?.meta_ad_account_id ?? null,
        },
        structure: {
          adsets: adsets ?? [],
          ads: ads ?? [],
        },
      }

      const { rows } = await pool.query(
        `
          INSERT INTO campaign_templates (name, payload)
          VALUES ($1, $2::jsonb)
          RETURNING
            id,
            name,
            payload,
            created_at
        `,
        [name, JSON.stringify(payload)]
      )

      return res.status(201).json({ ok: true, campaign_template: rows[0] })
    })
  )

  return router
}
