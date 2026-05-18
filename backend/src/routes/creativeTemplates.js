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

export function creativeTemplatesRouter() {
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
            ct.id,
            ct.name,
            ct.creative_asset_id,
            ct.primary_text,
            ct.headline,
            ct.description,
            ct.cta_type,
            ct.destination_url,
            ct.created_at,
            ca.stored_name AS asset_stored_name,
            ca.original_name AS asset_original_name,
            ca.mime_type AS asset_mime_type
          FROM creative_templates ct
          LEFT JOIN creative_assets ca ON ca.id = ct.creative_asset_id
          ORDER BY ct.created_at DESC
          LIMIT $1
        `,
        [limit]
      )

      const templates = rows.map((t) => ({
        ...t,
        asset_url: t.asset_stored_name ? `/uploads/creative-assets/${encodeURIComponent(t.asset_stored_name)}` : null
      }))

      return res.json({ ok: true, creative_templates: templates })
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

      const creativeAssetId = normalizeNonEmptyString(req.body?.creativeAssetId)
      if (creativeAssetId && !isUuid(creativeAssetId)) {
        return jsonError(res, 400, 'Invalid creativeAssetId')
      }

      const primaryText = normalizeNonEmptyString(req.body?.primaryText, { maxLen: 5000 })
      const headline = normalizeNonEmptyString(req.body?.headline, { maxLen: 255 })
      const description = normalizeNonEmptyString(req.body?.description, { maxLen: 1000 })
      const ctaType = normalizeNonEmptyString(req.body?.ctaType, { maxLen: 60 })
      const destinationUrl = normalizeNonEmptyString(req.body?.destinationUrl, { maxLen: 2048 })

      if (!primaryText && !headline && !description && !creativeAssetId && !destinationUrl) {
        return jsonError(res, 400, 'Template is empty (provide fields)')
      }

      const pool = getPool()
      const { rows } = await pool.query(
        `
          INSERT INTO creative_templates (
            name,
            creative_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url
          )
          VALUES ($1, $2::uuid, $3, $4, $5, $6, $7)
          RETURNING
            id,
            name,
            creative_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url,
            created_at
        `,
        [name, creativeAssetId, primaryText, headline, description, ctaType, destinationUrl]
      )

      return res.status(201).json({ ok: true, creative_template: rows[0] })
    })
  )

  router.post(
    '/from-draft/:id',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const sourceId = req.params.id
      if (!isUuid(sourceId)) {
        return jsonError(res, 400, 'Invalid creative draft id')
      }

      const pool = getPool()
      const { rows: found, rowCount } = await pool.query(
        `
          SELECT
            creative_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url
          FROM creative_drafts
          WHERE id = $1
        `,
        [sourceId]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Creative draft not found')
      }

      const src = found[0]
      const explicitName = normalizeNonEmptyString(req.body?.name, { maxLen: 140 })
      const fallbackName =
        normalizeNonEmptyString(src?.headline, { maxLen: 120 }) ?? `Template ${String(sourceId).slice(0, 8)}`
      const name = explicitName ?? `${fallbackName} (template)`

      const { rows } = await pool.query(
        `
          INSERT INTO creative_templates (
            name,
            creative_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            id,
            name,
            creative_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url,
            created_at
        `,
        [
          name,
          src.creative_asset_id,
          src.primary_text,
          src.headline,
          src.description,
          src.cta_type,
          src.destination_url
        ]
      )

      return res.status(201).json({ ok: true, creative_template: rows[0] })
    })
  )

  router.post(
    '/:id/apply',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const templateId = req.params.id
      if (!isUuid(templateId)) {
        return jsonError(res, 400, 'Invalid creative template id')
      }

      const generatedCampaignId = normalizeNonEmptyString(req.body?.generatedCampaignId)
      if (!generatedCampaignId || !isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generatedCampaignId')
      }

      const pool = getPool()
      const { rows: found, rowCount } = await pool.query(
        `
          SELECT
            creative_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url
          FROM creative_templates
          WHERE id = $1
        `,
        [templateId]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Creative template not found')
      }

      const t = found[0]
      const { rows } = await pool.query(
        `
          INSERT INTO creative_drafts (
            generated_campaign_id,
            creative_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            id,
            generated_campaign_id,
            creative_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url,
            status,
            meta_creative_id,
            created_at
        `,
        [
          generatedCampaignId,
          t.creative_asset_id,
          t.primary_text,
          t.headline,
          t.description,
          t.cta_type,
          t.destination_url
        ]
      )

      return res.status(201).json({ ok: true, creative_draft: rows[0] })
    })
  )

  return router
}

