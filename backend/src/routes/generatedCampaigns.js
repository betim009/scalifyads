import { Router } from 'express'
import { getPool } from '../db.js'
import { jsonError, parseLimit } from '../lib/http.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { isUuid } from '../lib/validate.js'
import { slugify } from '../lib/slugify.js'
import { generateOperationalMarkets } from '../lib/operationalMarketGeneration.js'
import {
  insertOperationalMarketGeneration,
  listOperationalMarketGenerations
} from '../services/operationalMarketGenerations.js'

const ALLOWED_STATUSES = new Set(['PAUSED', 'ACTIVE', 'ARCHIVED'])
const ALLOWED_OPS_STATES = new Set(['draft', 'validated', 'published'])
const CHECKPOINT_LABEL_MAX = 80
const CHECKPOINT_NOTE_MAX = 400

function normalizeNonEmptyString(value, { maxLen } = {}) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (maxLen && trimmed.length > maxLen) return trimmed.slice(0, maxLen)
  return trimmed
}

function compactOperationalParam(value, { maxLen = 80 } = {}) {
  const raw = normalizeNonEmptyString(value, { maxLen: 160 })
  if (!raw) return null
  const compact = raw.replace(/[^A-Za-z0-9_-]+/g, '')
  return compact ? compact.slice(0, maxLen) : null
}

function extractNicheFromMarketParam(value) {
  const raw = normalizeNonEmptyString(value, { maxLen: 160 })
  if (!raw) return null
  const match = raw.match(/^[A-Z0-9]+-(.+)-FB$/)
  return compactOperationalParam(match?.[1] ?? null)
}

function resolveTemplateOperationalBase(template) {
  if (!template) return null
  const payload = template?.payload && typeof template.payload === 'object' && !Array.isArray(template.payload)
    ? template.payload
    : {}
  const campaign = payload?.campaign && typeof payload.campaign === 'object' && !Array.isArray(payload.campaign)
    ? payload.campaign
    : {}
  const operationalMarket =
    payload?.operationalMarket && typeof payload.operationalMarket === 'object' && !Array.isArray(payload.operationalMarket)
      ? payload.operationalMarket
      : {}

  const niche =
    compactOperationalParam(operationalMarket?.nicheParam) ??
    compactOperationalParam(operationalMarket?.niche) ??
    compactOperationalParam(payload?.nicheParam) ??
    compactOperationalParam(payload?.niche) ??
    compactOperationalParam(payload?.slug) ??
    compactOperationalParam(campaign?.nicheParam) ??
    compactOperationalParam(campaign?.niche) ??
    compactOperationalParam(campaign?.slug) ??
    extractNicheFromMarketParam(campaign?.marketParam ?? campaign?.market_param) ??
    compactOperationalParam(template?.name)

  const campaignName =
    normalizeNonEmptyString(campaign?.name, { maxLen: 140 }) ??
    normalizeNonEmptyString(template?.name, { maxLen: 140 }) ??
    'Campanha Operacional'

  return {
    templateId: template.id,
    templateName: template.name,
    campaignName,
    niche,
    payload
  }
}

async function createUniqueSlug(pool, base) {
  const cleaned = slugify(base) || `campaign-${Date.now()}`
  let candidate = cleaned
  let attempt = 0

  while (true) {
    const { rowCount } = await pool.query('SELECT 1 FROM campaigns WHERE slug = $1', [candidate])
    if (rowCount === 0) return candidate
    attempt += 1
    candidate = `${cleaned}-${attempt}`
  }
}

async function tryInsertGeneratedCampaignEvent(pool, generatedCampaignId, eventType, payload) {
  try {
    await pool.query(
      `
        INSERT INTO generated_campaign_events (generated_campaign_id, event_type, payload)
        VALUES ($1::uuid, $2, $3::jsonb)
      `,
      [generatedCampaignId, eventType, JSON.stringify(payload ?? {})]
    )
  } catch {
    // best-effort
  }
}

function toOperationalMarketGenerationDto(row) {
  const targetingPreview = row?.targeting_preview && typeof row.targeting_preview === 'object'
    ? row.targeting_preview
    : {}
  const operationalTargeting =
    targetingPreview?.operationalTargeting && typeof targetingPreview.operationalTargeting === 'object'
      ? targetingPreview.operationalTargeting
      : {}

  return {
    id: row.id,
    campaignId: row.campaign_id,
    marketCode: row.market_code,
    marketName: row.market_name,
    marketParam: row.market_param,
    utmCampaign: row.utm_campaign,
    src: row.src,
    status: row.status,
    resolvedCountries: Array.isArray(row.resolved_countries) ? row.resolved_countries : [],
    targetingPreview,
    publishable: targetingPreview.publishable === true || operationalTargeting.publishable === true,
    previewOnly: targetingPreview.previewOnly === true || operationalTargeting.previewOnly === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function generatedCampaignsRouter() {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const limit = parseLimit(req.query.limit, 50, 200)
      const campaignId =
        typeof req.query.campaignId === 'string' && req.query.campaignId.trim()
          ? req.query.campaignId.trim()
          : null
      if (campaignId && !isUuid(campaignId)) {
        return jsonError(res, 400, 'Invalid campaignId')
      }
      const pool = getPool()

      const { rows } = await pool.query(
        `
          SELECT
            gc.id,
            gc.campaign_id,
            gc.country_code,
            gc.market_code,
            gc.market_name,
            gc.market_param,
            gc.resolved_countries,
            gc.targeting_preview,
            gc.meta_campaign_id,
            gc.meta_run_mode,
            gc.meta_ad_account_id,
            gc.meta_user_id,
            gc.meta_status,
            gc.meta_effective_status,
            gc.meta_objective,
            gc.meta_adset_id,
            gc.meta_adset_status,
            gc.meta_adset_effective_status,
            gc.meta_ad_id,
            gc.meta_ad_status,
            gc.meta_ad_effective_status,
            gc.ops_last_action,
            gc.ops_last_ok,
            gc.ops_last_at,
            gc.ops_state,
            gc.name,
            gc.status,
            gc.created_at
          FROM generated_campaigns gc
          WHERE ($1::uuid IS NULL OR gc.campaign_id = $1::uuid)
          ORDER BY gc.created_at DESC
          LIMIT $2
        `,
        [campaignId, limit]
      )

      return res.json({
        ok: true,
        generated_campaigns: rows.map((row) => ({
          ...row,
          operational_targeting: {
            source: row.market_code ? 'market_code' : 'legacy_country_code',
            market_code: row.market_code ?? null,
            resolved_countries: row.resolved_countries ?? null,
            targeting_preview: row.targeting_preview ?? null,
            legacy_country_code: row.country_code ?? null
          }
        }))
      })
    })
  )

  router.get(
    '/operational-markets',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const limit = parseLimit(req.query.limit, 50, 200)
      const campaignId =
        typeof req.query.campaignId === 'string' && req.query.campaignId.trim()
          ? req.query.campaignId.trim()
          : null
      if (campaignId && !isUuid(campaignId)) {
        return jsonError(res, 400, 'Invalid campaignId')
      }

      const rows = await listOperationalMarketGenerations(getPool(), { campaignId, limit })
      return res.json({ ok: true, operational_market_generations: rows })
    })
  )

  router.post(
    '/operational-markets',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const campaignIdRaw = normalizeNonEmptyString(req.body?.campaignId)
      if (campaignIdRaw && !isUuid(campaignIdRaw)) {
        return jsonError(res, 400, 'Invalid campaignId')
      }

      const templateIdRaw = normalizeNonEmptyString(req.body?.templateId)
      if (templateIdRaw && !isUuid(templateIdRaw)) {
        return jsonError(res, 400, 'Invalid templateId')
      }

      const marketsInput = Array.isArray(req.body?.markets) ? req.body.markets : []
      const pool = getPool()

      let templateBase = null
      if (templateIdRaw) {
        const { rows, rowCount } = await pool.query(
          `
            SELECT id, name, payload, created_at
            FROM campaign_templates
            WHERE id = $1::uuid
          `,
          [templateIdRaw]
        )
        if (rowCount === 0) {
          return jsonError(res, 404, 'Campaign template not found')
        }
        templateBase = resolveTemplateOperationalBase(rows[0])
        if (!templateBase?.niche) {
          return jsonError(res, 400, 'Invalid template operational niche')
        }
      }

      const campaignName =
        templateBase?.campaignName ??
        normalizeNonEmptyString(req.body?.campaignName, { maxLen: 140 }) ??
        'Campanha Operacional'
      const niche =
        templateBase?.niche ??
        normalizeNonEmptyString(req.body?.niche ?? req.body?.nicheParam, { maxLen: 80 })

      const { rows: countryRows } = await pool.query(`SELECT code FROM countries ORDER BY code ASC`)
      const availableCountryCodes = countryRows.map((row) => row.code).filter(Boolean)
      const generatedInput = generateOperationalMarkets({
        niche,
        markets: marketsInput,
        availableCountryCodes
      })
      if (!generatedInput.ok) {
        return jsonError(res, 400, 'Invalid operational markets input', { errors: generatedInput.errors })
      }

      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        let campaign = null
        if (campaignIdRaw) {
          const { rows, rowCount } = await client.query(
            `
              SELECT id, slug, name, status, scope, objective_key, created_by_user_id, config, created_at
              FROM campaigns
              WHERE id = $1::uuid
            `,
            [campaignIdRaw]
          )
          if (rowCount === 0) {
            await client.query('ROLLBACK')
            return jsonError(res, 404, 'Campaign not found')
          }
          campaign = rows[0]
        } else {
          const slug = await createUniqueSlug(client, campaignName)
          const { rows } = await client.query(
            `
              INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
              VALUES ($1, $2, 'draft', 'global', NULL, NULL, $3::jsonb)
              RETURNING id, slug, name, status, scope, objective_key, created_by_user_id, config, created_at
            `,
            [
              slug,
              campaignName,
              JSON.stringify({
                source: 'operational_market_generations',
                niche: generatedInput.niche,
                templateId: templateBase?.templateId ?? null,
                templateName: templateBase?.templateName ?? null,
                templateSource: templateBase ? 'campaign_templates' : null,
                metaPublishing: false
              })
            ]
          )
          campaign = rows[0]
        }

        const created = []
        for (const market of generatedInput.markets) {
          const row = await insertOperationalMarketGeneration(client, { campaignId: campaign.id, market })
          created.push(row)
        }

        await client.query('COMMIT')
        return res.status(201).json({
          ok: true,
          campaign,
          template: templateBase
            ? {
                id: templateBase.templateId,
                name: templateBase.templateName,
                niche: templateBase.niche
              }
            : null,
          operational_market_generations: created,
          generated_campaigns: [],
          meta_publishing: false
        })
      } catch (err) {
        await client.query('ROLLBACK')
        if (err?.code === '23505') {
          return jsonError(res, 409, 'Operational market generation conflicts with existing campaign market_code', {
            detail: err?.detail ?? null
          })
        }
        throw err
      } finally {
        client.release()
      }
    })
  )

  router.get(
    '/:campaignId/operational-markets',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const campaignId = req.params.campaignId
      if (!isUuid(campaignId)) {
        return jsonError(res, 400, 'Invalid campaignId')
      }

      const pool = getPool()
      const { rowCount } = await pool.query(
        `
          SELECT 1
          FROM campaigns
          WHERE id = $1::uuid
        `,
        [campaignId]
      )
      if (rowCount === 0) {
        return jsonError(res, 404, 'Campaign not found')
      }

      const rows = await listOperationalMarketGenerations(pool, { campaignId, limit: 200 })
      return res.json({
        ok: true,
        campaignId,
        operationalMarkets: rows.map(toOperationalMarketGenerationDto),
        metaPublishing: false
      })
    })
  )

  router.get(
    '/:id/structure',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      if (!isUuid(req.params.id)) {
        return jsonError(res, 400, 'Invalid generated campaign id')
      }

      const pool = getPool()

      const { rowCount: exists } = await pool.query(
        `
          SELECT 1
          FROM generated_campaigns
          WHERE id = $1
        `,
        [req.params.id]
      )
      if (exists === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      const { rows: adsets } = await pool.query(
        `
          SELECT
            id,
            generated_campaign_id,
            meta_adset_id,
            name,
            status,
            effective_status,
            created_at
          FROM generated_adsets
          WHERE generated_campaign_id = $1
          ORDER BY created_at DESC
          LIMIT 50
        `,
        [req.params.id]
      )

      const { rows: ads } = await pool.query(
        `
          SELECT
            id,
            generated_campaign_id,
            generated_adset_id,
            creative_draft_id,
            meta_ad_id,
            name,
            status,
            effective_status,
            created_at
          FROM generated_ads
          WHERE generated_campaign_id = $1
          ORDER BY created_at DESC
          LIMIT 200
        `,
        [req.params.id]
      )

      return res.json({ ok: true, generated_adsets: adsets, generated_ads: ads })
    })
  )

  router.get(
    '/:id/events',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      if (!isUuid(req.params.id)) {
        return jsonError(res, 400, 'Invalid generated campaign id')
      }

      const limit = parseLimit(req.query.limit, 50, 200)
      const pool = getPool()

      const { rows } = await pool.query(
        `
          SELECT
            id,
            generated_campaign_id,
            event_type,
            payload,
            created_at
          FROM generated_campaign_events
          WHERE generated_campaign_id = $1
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [req.params.id, limit]
      )

      return res.json({ ok: true, generated_campaign_events: rows })
    })
  )

  router.post(
    '/:id/checkpoints',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      if (!isUuid(req.params.id)) {
        return jsonError(res, 400, 'Invalid generated campaign id')
      }

      const labelRaw = typeof req.body?.label === 'string' ? req.body.label.trim() : ''
      if (!labelRaw) {
        return jsonError(res, 400, 'Invalid label')
      }
      if (labelRaw.length > CHECKPOINT_LABEL_MAX) {
        return jsonError(res, 400, 'Label too long', { max: CHECKPOINT_LABEL_MAX })
      }

      const noteRaw = typeof req.body?.note === 'string' ? req.body.note.trim() : ''
      if (noteRaw.length > CHECKPOINT_NOTE_MAX) {
        return jsonError(res, 400, 'Note too long', { max: CHECKPOINT_NOTE_MAX })
      }

      const pool = getPool()
      const { rows, rowCount } = await pool.query(
        `
          INSERT INTO generated_campaign_events (generated_campaign_id, event_type, payload)
          VALUES ($1::uuid, 'checkpoint.created', $2::jsonb)
          RETURNING
            id,
            generated_campaign_id,
            event_type,
            payload,
            created_at
        `,
        [
          req.params.id,
          JSON.stringify({
            label: labelRaw,
            note: noteRaw || null,
          }),
        ]
      )

      if (rowCount === 0) {
        return jsonError(res, 500, 'Failed to create checkpoint')
      }

      return res.json({ ok: true, generated_campaign_event: rows[0] })
    })
  )

  router.post(
    '/:id/status',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      if (!isUuid(req.params.id)) {
        return jsonError(res, 400, 'Invalid generated campaign id')
      }

      const status = req.body?.status
      if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
        return jsonError(res, 400, 'Invalid status', { allowed: [...ALLOWED_STATUSES] })
      }

      const pool = getPool()
      const { rows, rowCount } = await pool.query(
        `
          UPDATE generated_campaigns
          SET status = $2
          WHERE id = $1
          RETURNING
            id,
            campaign_id,
            country_code,
            market_code,
            market_name,
            market_param,
            resolved_countries,
            targeting_preview,
            meta_campaign_id,
            meta_run_mode,
            meta_ad_account_id,
            meta_user_id,
            meta_status,
            meta_effective_status,
            meta_objective,
            meta_adset_id,
            meta_adset_status,
            meta_adset_effective_status,
            meta_ad_id,
            meta_ad_status,
            meta_ad_effective_status,
            ops_last_action,
            ops_last_ok,
            ops_last_at,
            ops_state,
            name,
            status,
            created_at
        `,
        [req.params.id, status]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      return res.json({ ok: true, generated_campaign: rows[0] })
    })
  )

  router.post(
    '/:id/ops-state',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      if (!isUuid(req.params.id)) {
        return jsonError(res, 400, 'Invalid generated campaign id')
      }

      const opsState = req.body?.opsState
      if (typeof opsState !== 'string' || !ALLOWED_OPS_STATES.has(opsState)) {
        return jsonError(res, 400, 'Invalid opsState', { allowed: [...ALLOWED_OPS_STATES] })
      }

      const pool = getPool()
      const { rows, rowCount } = await pool.query(
        `
          UPDATE generated_campaigns
          SET ops_state = $2
          WHERE id = $1
          RETURNING
            id,
            campaign_id,
            country_code,
            market_code,
            market_name,
            market_param,
            resolved_countries,
            targeting_preview,
            meta_campaign_id,
            meta_run_mode,
            meta_ad_account_id,
            meta_user_id,
            meta_status,
            meta_effective_status,
            meta_objective,
            meta_adset_id,
            meta_adset_status,
            meta_adset_effective_status,
            meta_ad_id,
            meta_ad_status,
            meta_ad_effective_status,
            ops_last_action,
            ops_last_ok,
            ops_last_at,
            ops_state,
            name,
            status,
            created_at
        `,
        [req.params.id, opsState]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      await tryInsertGeneratedCampaignEvent(pool, req.params.id, 'ops_state.updated', { opsState })
      return res.json({ ok: true, generated_campaign: rows[0] })
    })
  )

  router.post(
    '/:id/mark-published',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      if (!isUuid(req.params.id)) {
        return jsonError(res, 400, 'Invalid generated campaign id')
      }

      const metaCampaignId = req.body?.metaCampaignId
      if (typeof metaCampaignId !== 'string' || !metaCampaignId.trim()) {
        return jsonError(res, 400, 'Invalid metaCampaignId')
      }

      const pool = getPool()
      const { rows, rowCount } = await pool.query(
        `
          UPDATE generated_campaigns
          SET meta_campaign_id = $2
          WHERE id = $1
          RETURNING
            id,
            campaign_id,
            country_code,
            market_code,
            market_name,
            market_param,
            resolved_countries,
            targeting_preview,
            meta_campaign_id,
            meta_run_mode,
            meta_ad_account_id,
            meta_user_id,
            meta_status,
            meta_effective_status,
            meta_objective,
            meta_adset_id,
            meta_adset_status,
            meta_adset_effective_status,
            meta_ad_id,
            meta_ad_status,
            meta_ad_effective_status,
            ops_last_action,
            ops_last_ok,
            ops_last_at,
            ops_state,
            name,
            status,
            created_at
        `,
        [req.params.id, metaCampaignId.trim()]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      await tryInsertGeneratedCampaignEvent(pool, req.params.id, 'meta_campaign_id.set', { metaCampaignId: metaCampaignId.trim() })
      return res.json({ ok: true, generated_campaign: rows[0] })
    })
  )

  return router
}
