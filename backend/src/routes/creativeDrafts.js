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

export function creativeDraftsRouter() {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const limit = parseLimit(req.query.limit, 50, 200)
      const generatedCampaignId = normalizeNonEmptyString(req.query.generatedCampaignId)
      if (generatedCampaignId && !isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generatedCampaignId')
      }

      const pool = getPool()
      const { rows } = await pool.query(
        `
          SELECT
            cd.id,
            cd.generated_campaign_id,
            cd.creative_asset_id,
            cd.creative_thumbnail_asset_id,
            cd.primary_text,
            cd.headline,
            cd.description,
            cd.cta_type,
            cd.destination_url,
            cd.status,
            cd.meta_creative_id,
            cd.meta_status,
            cd.created_at,
            ca.stored_name AS asset_stored_name,
            ca.original_name AS asset_original_name,
            ca.mime_type AS asset_mime_type,
            cta.stored_name AS thumbnail_stored_name,
            cta.original_name AS thumbnail_original_name,
            cta.mime_type AS thumbnail_mime_type
          FROM creative_drafts cd
          LEFT JOIN creative_assets ca ON ca.id = cd.creative_asset_id
          LEFT JOIN creative_assets cta ON cta.id = cd.creative_thumbnail_asset_id
          WHERE ($1::uuid IS NULL OR cd.generated_campaign_id = $1::uuid)
          ORDER BY cd.created_at DESC
          LIMIT $2
        `,
        [generatedCampaignId, limit]
      )

      const drafts = rows.map((d) => ({
        ...d,
        asset_url: d.asset_stored_name ? `/uploads/creative-assets/${encodeURIComponent(d.asset_stored_name)}` : null,
        thumbnail_url: d.thumbnail_stored_name ? `/uploads/creative-assets/${encodeURIComponent(d.thumbnail_stored_name)}` : null
      }))

      return res.json({ ok: true, creative_drafts: drafts })
    })
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const generatedCampaignId = normalizeNonEmptyString(req.body?.generatedCampaignId)
      if (!generatedCampaignId || !isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generatedCampaignId')
      }

      const creativeAssetId = normalizeNonEmptyString(req.body?.creativeAssetId)
      if (creativeAssetId && !isUuid(creativeAssetId)) {
        return jsonError(res, 400, 'Invalid creativeAssetId')
      }

      const creativeThumbnailAssetId = normalizeNonEmptyString(req.body?.creativeThumbnailAssetId)
      if (creativeThumbnailAssetId && !isUuid(creativeThumbnailAssetId)) {
        return jsonError(res, 400, 'Invalid creativeThumbnailAssetId')
      }

      const primaryText = normalizeNonEmptyString(req.body?.primaryText, { maxLen: 5000 })
      const headline = normalizeNonEmptyString(req.body?.headline, { maxLen: 255 })
      const description = normalizeNonEmptyString(req.body?.description, { maxLen: 1000 })
      const ctaType = normalizeNonEmptyString(req.body?.ctaType, { maxLen: 60 })
      const destinationUrl = normalizeNonEmptyString(req.body?.destinationUrl, { maxLen: 2048 })

      if (!primaryText && !headline && !description && !creativeAssetId) {
        return jsonError(res, 400, 'Draft is empty (provide text and/or creativeAssetId)')
      }

      const pool = getPool()
      const { rows } = await pool.query(
        `
          INSERT INTO creative_drafts (
            generated_campaign_id,
            creative_asset_id,
            creative_thumbnail_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url
          )
          VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)
          RETURNING
            id,
            generated_campaign_id,
            creative_asset_id,
            creative_thumbnail_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url,
            status,
            meta_creative_id,
            created_at
        `,
        [generatedCampaignId, creativeAssetId, creativeThumbnailAssetId, primaryText, headline, description, ctaType, destinationUrl]
      )

      return res.status(201).json({ ok: true, creative_draft: rows[0] })
    })
  )

  router.post(
    '/:id/duplicate',
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
            generated_campaign_id,
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
      const { rows } = await pool.query(
        `
          INSERT INTO creative_drafts (
            generated_campaign_id,
            creative_asset_id,
            primary_text,
            headline,
            description,
            cta_type,
            destination_url,
            status,
            meta_creative_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', NULL)
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
          src.generated_campaign_id,
          src.creative_asset_id,
          src.primary_text,
          src.headline,
          src.description,
          src.cta_type,
          src.destination_url
        ]
      )

      return res.status(201).json({ ok: true, creative_draft: rows[0] })
    })
  )

  return router
}
