import { Router } from 'express'
import { getPool } from '../db.js'
import { jsonError } from '../lib/http.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { isUuid } from '../lib/validate.js'
import { buildOperationalPublishPreview } from '../lib/operationalPublishPreview.js'

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function resolveTemplateId(campaign) {
  const config = isPlainObject(campaign?.config) ? campaign.config : {}
  return normalizeNonEmptyString(config.templateId) ?? normalizeNonEmptyString(config.template_id)
}

export function operationalMarketGenerationsRouter() {
  const router = Router()

  router.get(
    '/:id/publish-preview',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const id = req.params.id
      if (!isUuid(id)) {
        return jsonError(res, 400, 'Invalid operational market generation id')
      }

      const pool = getPool()
      const { rows, rowCount } = await pool.query(
        `
          SELECT
            omg.id,
            omg.campaign_id,
            omg.market_code,
            omg.market_name,
            omg.market_param,
            omg.resolved_countries,
            omg.targeting_preview,
            omg.utm_campaign,
            omg.src,
            omg.status,
            omg.created_at,
            omg.updated_at,
            c.id AS linked_campaign_id,
            c.slug AS campaign_slug,
            c.name AS campaign_name,
            c.status AS campaign_status,
            c.scope AS campaign_scope,
            c.objective_key,
            c.config AS campaign_config,
            c.created_at AS campaign_created_at,
            o.meta_value AS objective_meta_value
          FROM operational_market_generations omg
          LEFT JOIN campaigns c ON c.id = omg.campaign_id
          LEFT JOIN campaign_objectives o ON o.key = c.objective_key
          WHERE omg.id = $1::uuid
          LIMIT 1
        `,
        [id]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Operational market generation not found')
      }

      const row = rows[0]
      const campaign = row.linked_campaign_id
        ? {
            id: row.linked_campaign_id,
            slug: row.campaign_slug,
            name: row.campaign_name,
            status: row.campaign_status,
            scope: row.campaign_scope,
            objective_key: row.objective_key,
            objective_meta_value: row.objective_meta_value,
            config: row.campaign_config,
            created_at: row.campaign_created_at
          }
        : null

      let template = null
      const templateId = resolveTemplateId(campaign)
      if (templateId && isUuid(templateId)) {
        const templateResult = await pool.query(
          `
            SELECT id, name, payload, created_at
            FROM campaign_templates
            WHERE id = $1::uuid
            LIMIT 1
          `,
          [templateId]
        )
        template = templateResult.rows?.[0] ?? null
      }

      const preview = buildOperationalPublishPreview({
        operationalGeneration: {
          id: row.id,
          campaign_id: row.campaign_id,
          market_code: row.market_code,
          market_name: row.market_name,
          market_param: row.market_param,
          resolved_countries: row.resolved_countries,
          targeting_preview: row.targeting_preview,
          utm_campaign: row.utm_campaign,
          src: row.src,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at
        },
        campaign,
        template
      })

      return res.json({
        ok: true,
        ...preview
      })
    })
  )

  return router
}
