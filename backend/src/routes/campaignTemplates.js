import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError, parseLimit } from '../lib/http.js'
import { slugify } from '../lib/slugify.js'
import { isUuid } from '../lib/validate.js'
import { normalizeMarketPersistenceInput } from '../lib/marketTargeting.js'
import { resolveAuthUser } from '../lib/internalAuth.js'
import {
  generateTranslationsByMarket,
  validateCampaignTemplatePayload
} from '../lib/campaignTemplateTranslations.js'
import { libreTranslateText } from '../services/libreTranslate.js'

function normalizeNonEmptyString(value, { maxLen } = {}) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (maxLen && trimmed.length > maxLen) return trimmed.slice(0, maxLen)
  return trimmed
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

function normalizeCountryCode(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toUpperCase()
  return trimmed ? trimmed : null
}

export function campaignTemplatesRouter() {
  const router = Router()

  async function fetchEditableTemplate(client, req, templateId) {
    const campaignTemplate = await client.query(
      `
        SELECT id, name, payload, created_at, NULL::timestamptz AS updated_at
        FROM campaign_templates
        WHERE id = $1::uuid
        FOR UPDATE
      `,
      [templateId]
    )
    if (campaignTemplate.rowCount > 0) {
      return { source: 'campaign_templates', row: campaignTemplate.rows[0] }
    }

    const auth = await resolveAuthUser(getPool(), req)
    if (!auth?.userId) return null

    const flowTemplate = await client.query(
      `
        SELECT id, name, payload, created_at, updated_at
        FROM flow_templates
        WHERE id = $1::uuid AND user_id = $2::uuid
        FOR UPDATE
      `,
      [templateId, auth.userId]
    )
    if (flowTemplate.rowCount > 0) {
      return { source: 'flow_templates', row: flowTemplate.rows[0] }
    }

    return null
  }

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
      const payloadValidation = validateCampaignTemplatePayload(payload)
      if (!payloadValidation.ok) {
        return jsonError(res, 400, 'Invalid payload', { errors: payloadValidation.errors })
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
            market_code,
            market_name,
            market_param,
            resolved_countries,
            targeting_preview,
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
          marketCode: gc?.market_code ?? null,
          marketName: gc?.market_name ?? null,
          marketParam: gc?.market_param ?? null,
          resolvedCountries: gc?.resolved_countries ?? null,
          targetingPreview: gc?.targeting_preview ?? null,
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

  router.post(
    '/:id/translations-by-market/generate',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const templateId = req.params.id
      if (!isUuid(templateId)) {
        return jsonError(res, 400, 'Invalid campaign template id')
      }

      const markets = Array.isArray(req.body?.markets) ? req.body.markets : []
      const overwrite = req.body?.overwrite === true
      const pool = getPool()
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const found = await fetchEditableTemplate(client, req, templateId)
        if (!found) {
          await client.query('ROLLBACK')
          return jsonError(res, 404, 'Campaign template not found')
        }

        const template = found.row
        const payload = template?.payload && typeof template.payload === 'object' && !Array.isArray(template.payload)
          ? template.payload
          : {}
        const generated = await generateTranslationsByMarket({
          payload,
          markets,
          overwrite,
          translateText: libreTranslateText
        })
        if (!generated.ok) {
          await client.query('ROLLBACK')
          return jsonError(res, 400, 'Invalid translationsByMarket generation input', { errors: generated.errors })
        }

        const updated = found.source === 'flow_templates'
          ? await client.query(
              `
                UPDATE flow_templates
                SET payload = $2::jsonb, updated_at = now()
                WHERE id = $1::uuid
                RETURNING id, name, payload, created_at, updated_at
              `,
              [templateId, JSON.stringify(generated.payload)]
            )
          : await client.query(
              `
                UPDATE campaign_templates
                SET payload = $2::jsonb
                WHERE id = $1::uuid
                RETURNING id, name, payload, created_at, NULL::timestamptz AS updated_at
              `,
              [templateId, JSON.stringify(generated.payload)]
            )

        await client.query('COMMIT')
        return res.json({
          ok: true,
          campaign_template: updated.rows[0],
          source: found.source,
          generated: generated.generated,
          preserved: generated.preserved,
          base_markets: generated.baseMarkets,
          overwrite
        })
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
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
        return jsonError(res, 400, 'Invalid campaign template id')
      }

      const pool = getPool()
      const { rows: templates, rowCount } = await pool.query(
        `
          SELECT
            id,
            name,
            payload,
            created_at
          FROM campaign_templates
          WHERE id = $1
        `,
        [templateId]
      )
      if (rowCount === 0) {
        return jsonError(res, 404, 'Campaign template not found')
      }

      const template = templates[0]
      const payload = template?.payload && typeof template.payload === 'object' ? template.payload : {}
      const payloadCampaign = payload?.campaign && typeof payload.campaign === 'object' ? payload.campaign : {}
      const payloadStructure = payload?.structure && typeof payload.structure === 'object' ? payload.structure : {}

      const overrideName = normalizeNonEmptyString(req.body?.name, { maxLen: 140 })
      const overrideCountryCode = normalizeCountryCode(req.body?.countryCode)
      const overrideMetaObjective = normalizeNonEmptyString(req.body?.metaObjective, { maxLen: 64 })
      const overrideMetaAdAccountId = normalizeNonEmptyString(req.body?.metaAdAccountId, { maxLen: 64 })
      const overrideMetaRunMode = normalizeNonEmptyString(req.body?.metaRunMode, { maxLen: 16 })

      const name =
        overrideName ??
        normalizeNonEmptyString(payloadCampaign?.name, { maxLen: 140 }) ??
        normalizeNonEmptyString(template?.name, { maxLen: 140 })
      if (!name) {
        return jsonError(res, 400, 'Invalid name (template payload missing campaign.name)')
      }

      const countryCode =
        overrideCountryCode ??
        normalizeCountryCode(payloadCampaign?.countryCode) ??
        normalizeCountryCode(payloadCampaign?.country_code)
      if (!countryCode) {
        return jsonError(res, 400, 'Invalid countryCode (template payload missing campaign.countryCode)')
      }

      const marketInput = normalizeMarketPersistenceInput({
        marketCode: req.body?.marketCode ?? payloadCampaign?.marketCode ?? payloadCampaign?.market_code,
        marketName: req.body?.marketName ?? payloadCampaign?.marketName ?? payloadCampaign?.market_name,
        marketParam: req.body?.marketParam ?? payloadCampaign?.marketParam ?? payloadCampaign?.market_param,
        resolvedCountries: req.body?.resolvedCountries ?? payloadCampaign?.resolvedCountries ?? payloadCampaign?.resolved_countries,
        targetingPreview: req.body?.targetingPreview ?? payloadCampaign?.targetingPreview ?? payloadCampaign?.targeting_preview,
      })
      if (!marketInput.ok) {
        return jsonError(res, 400, 'Invalid market persistence input', { errors: marketInput.errors })
      }

      const metaObjective =
        overrideMetaObjective ??
        normalizeNonEmptyString(payloadCampaign?.metaObjective, { maxLen: 64 }) ??
        normalizeNonEmptyString(payloadCampaign?.meta_objective, { maxLen: 64 }) ??
        null
      const metaAdAccountId =
        overrideMetaAdAccountId ??
        normalizeNonEmptyString(payloadCampaign?.metaAdAccountId, { maxLen: 64 }) ??
        normalizeNonEmptyString(payloadCampaign?.meta_ad_account_id, { maxLen: 64 }) ??
        null

      const runMode =
        overrideMetaRunMode ??
        normalizeNonEmptyString(payload?.source?.metaRunMode, { maxLen: 16 }) ??
        null

      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const { rowCount: hasCountry } = await client.query(`SELECT 1 FROM countries WHERE code = $1`, [countryCode])
        if (hasCountry === 0) {
          await client.query('ROLLBACK')
          return jsonError(res, 400, 'Invalid countryCode (not found)', { countryCode })
        }

        const slug = await createUniqueSlug(client, name)
        const insertedCampaign = await client.query(
          `
            INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
            VALUES ($1, $2, 'draft', 'global', NULL, NULL, $3::jsonb)
            RETURNING id, slug, name, status, scope, objective_key, created_by_user_id, config, created_at
          `,
          [
            slug,
            name,
            JSON.stringify({
              source: 'campaign_template.apply',
              metaAdAccountId,
              metaObjective,
              templateId,
            }),
          ]
        )
        const campaign = insertedCampaign.rows[0]

        const insertedGenerated = await client.query(
          `
            INSERT INTO generated_campaigns (
              campaign_id,
              country_code,
              name,
              status,
              market_code,
              market_name,
              market_param,
              resolved_countries,
              targeting_preview,
              meta_ad_account_id,
              meta_objective,
              meta_run_mode
            )
            VALUES ($1::uuid, $2, $3, 'PAUSED', $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)
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
          [
            campaign.id,
            countryCode,
            name,
            marketInput.marketCode,
            marketInput.marketName,
            marketInput.marketParam,
            marketInput.resolvedCountries ? JSON.stringify(marketInput.resolvedCountries) : null,
            marketInput.targetingPreview ? JSON.stringify(marketInput.targetingPreview) : null,
            metaAdAccountId,
            metaObjective,
            runMode
          ]
        )
        const generatedCampaign = insertedGenerated.rows[0]

        const sourceAdsets = Array.isArray(payloadStructure?.adsets) ? payloadStructure.adsets : []
        const sourceAds = Array.isArray(payloadStructure?.ads) ? payloadStructure.ads : []

        const adsetIdMap = new Map()
        const createdAdsets = []

        for (const adset of sourceAdsets.slice(0, 50)) {
          const adsetName = normalizeNonEmptyString(adset?.name, { maxLen: 140 }) ?? 'AdSet'
          const inserted = await client.query(
            `
              INSERT INTO generated_adsets (generated_campaign_id, meta_adset_id, name, status, effective_status, run_mode)
              VALUES ($1::uuid, NULL, $2, 'PAUSED', NULL, $3)
              RETURNING id, generated_campaign_id, meta_adset_id, name, status, effective_status, created_at, run_mode
            `,
            [generatedCampaign.id, adsetName, runMode]
          )
          const row = inserted.rows[0]
          createdAdsets.push(row)
          const oldId = normalizeNonEmptyString(adset?.id, { maxLen: 80 })
          if (oldId) adsetIdMap.set(oldId, row.id)
        }

        const createdAds = []
        for (const ad of sourceAds.slice(0, 200)) {
          const adName = normalizeNonEmptyString(ad?.name, { maxLen: 140 }) ?? 'Ad'
          const oldAdsetId = normalizeNonEmptyString(ad?.generated_adset_id, { maxLen: 80 }) ?? normalizeNonEmptyString(ad?.generatedAdsetId, { maxLen: 80 })
          const mappedAdsetId = oldAdsetId && adsetIdMap.has(oldAdsetId) ? adsetIdMap.get(oldAdsetId) : null
          const creativeDraftId = isUuid(ad?.creative_draft_id) ? ad.creative_draft_id : isUuid(ad?.creativeDraftId) ? ad.creativeDraftId : null

          const inserted = await client.query(
            `
              INSERT INTO generated_ads (
                generated_campaign_id,
                generated_adset_id,
                meta_ad_id,
                name,
                status,
                effective_status,
                run_mode,
                creative_draft_id
              )
              VALUES ($1::uuid, $2::uuid, NULL, $3, 'PAUSED', NULL, $4, $5::uuid)
              RETURNING
                id,
                generated_campaign_id,
                generated_adset_id,
                creative_draft_id,
                meta_ad_id,
                name,
                status,
                effective_status,
                created_at,
                run_mode
            `,
            [generatedCampaign.id, mappedAdsetId, adName, runMode, creativeDraftId]
          )
          createdAds.push(inserted.rows[0])
        }

        try {
          await client.query(
            `
              INSERT INTO generated_campaign_events (generated_campaign_id, event_type, payload)
              VALUES ($1::uuid, 'campaign_template.applied', $2::jsonb)
            `,
            [
              generatedCampaign.id,
              JSON.stringify({
                templateId,
                templateName: template?.name ?? null,
                overrides: {
                  name: overrideName ?? null,
                  countryCode: overrideCountryCode ?? null,
                  metaObjective: overrideMetaObjective ?? null,
                  metaAdAccountId: overrideMetaAdAccountId ?? null,
                  metaRunMode: overrideMetaRunMode ?? null,
                },
              }),
            ]
          )
        } catch {
          // best-effort
        }

        await client.query('COMMIT')
        return res.status(201).json({
          ok: true,
          campaign,
          generated_campaign: generatedCampaign,
          generated_adsets: createdAdsets,
          generated_ads: createdAds,
        })
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    })
  )

  return router
}
