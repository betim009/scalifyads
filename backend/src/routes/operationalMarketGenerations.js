import { Router } from 'express'
import { getPool } from '../db.js'
import { jsonError } from '../lib/http.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { isUuid } from '../lib/validate.js'
import { buildOperationalPublishPreview } from '../lib/operationalPublishPreview.js'
import { resolveAccessToken } from '../meta/accessToken.js'
import { metaCreateCampaign } from '../meta/campaigns.js'
import { metaFetchCampaign } from '../meta/campaigns.js'
import { metaCreateAdSet } from '../meta/adsets.js'
import { metaFetchAdSet } from '../meta/adsets.js'
import { metaCreateAdCreative } from '../meta/creatives.js'
import { metaFetchAdCreative } from '../meta/creatives.js'
import { metaCreateAd } from '../meta/ads.js'
import { metaFetchAd } from '../meta/ads.js'
import { publishPausedOperationalCampaign } from '../services/operationalMarketCampaignPublisher.js'
import { publishPausedOperationalAdSet } from '../services/operationalMarketAdSetPublisher.js'
import { publishOperationalCreative } from '../services/operationalMarketCreativePublisher.js'
import { publishPausedOperationalAd } from '../services/operationalMarketAdPublisher.js'
import { syncOperationalMetaStatuses } from '../services/operationalMetaStatusSync.js'
import { resolveAuthUser } from '../lib/internalAuth.js'

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
        if (!template) {
          const flowResult = await pool.query(
            `
              SELECT id, name, payload, created_at
              FROM flow_templates
              WHERE id = $1::uuid
              LIMIT 1
            `,
            [templateId]
          )
          template = flowResult.rows?.[0] ?? null
        }
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

  router.post(
    '/:id/publish-campaign',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const id = req.params.id
      if (!isUuid(id)) {
        return jsonError(res, 400, 'Invalid operational market generation id')
      }

      if (Array.isArray(req.body?.operationalMarketGenerationIds) || Array.isArray(req.body?.ids)) {
        return jsonError(res, 400, 'Batch publishing is not allowed')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)

      try {
        const result = await publishPausedOperationalCampaign({
          pool,
          operationalMarketGenerationId: id,
          metaAdAccountId: req.body?.metaAdAccountId,
          objective: req.body?.objective,
          confirmPublishPausedCampaign: req.body?.confirmPublishPausedCampaign,
          accessToken,
          metaUserId: req.body?.metaUserId,
          createCampaign: metaCreateCampaign
        })

        return res.status(result.created?.campaign ? 201 : 200).json(result)
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Operational Campaign publish failed', err?.details)
      }
    })
  )

  router.post(
    '/:id/publish-adset',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const id = req.params.id
      if (!isUuid(id)) {
        return jsonError(res, 400, 'Invalid operational market generation id')
      }

      if (Array.isArray(req.body?.operationalMarketGenerationIds) || Array.isArray(req.body?.ids)) {
        return jsonError(res, 400, 'Batch publishing is not allowed')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)

      try {
        const result = await publishPausedOperationalAdSet({
          pool,
          operationalMarketGenerationId: id,
          dailyBudgetCents: req.body?.dailyBudgetCents,
          billingEvent: req.body?.billingEvent,
          optimizationGoal: req.body?.optimizationGoal,
          confirmPublishPausedAdSet: req.body?.confirmPublishPausedAdSet,
          bidStrategy: req.body?.bidStrategy,
          bidAmount: req.body?.bidAmount,
          bidConstraints: req.body?.bidConstraints,
          promotedObject: req.body?.promotedObject ?? req.body?.promoted_object,
          accessToken,
          createAdSet: metaCreateAdSet
        })

        return res.status(result.created?.adSet ? 201 : 200).json(result)
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Operational AdSet publish failed', err?.details)
      }
    })
  )

  router.post(
    '/:id/publish-creative',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const id = req.params.id
      if (!isUuid(id)) {
        return jsonError(res, 400, 'Invalid operational market generation id')
      }

      if (Array.isArray(req.body?.operationalMarketGenerationIds) || Array.isArray(req.body?.ids)) {
        return jsonError(res, 400, 'Batch publishing is not allowed')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)

      try {
        const result = await publishOperationalCreative({
          pool,
          operationalMarketGenerationId: id,
          body: req.body ?? {},
          accessToken,
          createCreative: metaCreateAdCreative
        })

        return res.status(result.created?.creative ? 201 : 200).json(result)
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Operational Creative publish failed', err?.details)
      }
    })
  )

  router.post(
    '/:id/publish-ad',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const id = req.params.id
      if (!isUuid(id)) {
        return jsonError(res, 400, 'Invalid operational market generation id')
      }

      if (Array.isArray(req.body?.operationalMarketGenerationIds) || Array.isArray(req.body?.ids)) {
        return jsonError(res, 400, 'Batch publishing is not allowed')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)

      try {
        const result = await publishPausedOperationalAd({
          pool,
          operationalMarketGenerationId: id,
          confirmPublishPausedAd: req.body?.confirmPublishPausedAd,
          accessToken,
          createAd: metaCreateAd
        })

        return res.status(result.created?.ad ? 201 : 200).json(result)
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Operational Ad publish failed', err?.details)
      }
    })
  )

  router.post(
    '/:id/sync-meta-status',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const id = req.params.id
      if (!isUuid(id)) {
        return jsonError(res, 400, 'Invalid operational market generation id')
      }

      if (Array.isArray(req.body?.operationalMarketGenerationIds) || Array.isArray(req.body?.ids)) {
        return jsonError(res, 400, 'Batch status sync is not allowed')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)

      try {
        const result = await syncOperationalMetaStatuses({
          pool,
          operationalMarketGenerationId: id,
          accessToken,
          fetchCampaign: metaFetchCampaign,
          fetchAdSet: metaFetchAdSet,
          fetchCreative: metaFetchAdCreative,
          fetchAd: metaFetchAd
        })

        return res.json(result)
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Operational Meta status sync failed', err?.details)
      }
    })
  )

  return router
}
