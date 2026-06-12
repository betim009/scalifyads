import { buildOperationalMarketTargeting } from '../lib/marketTargeting.js'
import { applyMetaRegionalCompliance, mapMetaRegionalComplianceError } from '../lib/metaRegionalCompliance.js'

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizePositiveInt(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const i = Math.trunc(n)
  return i > 0 ? i : null
}

function normalizePromotedObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const normalized = {}
  for (const [key, item] of Object.entries(value)) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      normalized[key] = JSON.stringify(item)
      continue
    }

    const stringValue = normalizeNonEmptyString(item)
    if (stringValue) normalized[key] = stringValue
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

function requiresPromotedObject(optimizationGoal) {
  return normalizeNonEmptyString(optimizationGoal)?.toUpperCase() === 'OFFSITE_CONVERSIONS'
}

function validateOffsitePromotedObject(promotedObject) {
  if (!promotedObject) {
    return ['promotedObject is required when optimizationGoal is OFFSITE_CONVERSIONS']
  }

  const hasPixelEvent =
    Boolean(normalizeNonEmptyString(promotedObject.pixel_id)) &&
    Boolean(normalizeNonEmptyString(promotedObject.custom_event_type))
  const hasCustomConversion = Boolean(normalizeNonEmptyString(promotedObject.custom_conversion_id))
  const hasOffsiteConversionEvent = Boolean(normalizeNonEmptyString(promotedObject.offsite_conversion_event_id))

  if (!hasPixelEvent && !hasCustomConversion && !hasOffsiteConversionEvent) {
    return [
      'promotedObject for OFFSITE_CONVERSIONS must include pixel_id + custom_event_type, custom_conversion_id, or offsite_conversion_event_id'
    ]
  }

  return []
}

function normalizeCreatedAdSet(created) {
  const id = normalizeNonEmptyString(created?.id)
  if (!id) {
    const err = new Error('Meta ad set creation returned no id')
    err.status = 502
    throw err
  }
  return {
    id,
    status: normalizeNonEmptyString(created?.status) ?? 'PAUSED',
    effectiveStatus: normalizeNonEmptyString(created?.effective_status) ?? 'PAUSED',
    campaignId: normalizeNonEmptyString(created?.campaign_id) ?? null
  }
}

async function fetchOperationalMarketGeneration(client, id) {
  const { rows, rowCount } = await client.query(
    `
      SELECT
        id,
        campaign_id,
        market_code,
        market_name,
        market_param,
        resolved_countries,
        targeting_preview,
        status
      FROM operational_market_generations
      WHERE id = $1::uuid
      FOR UPDATE
    `,
    [id]
  )
  return rowCount > 0 ? rows[0] : null
}

async function findGeneratedCampaign(client, row) {
  const { rows } = await client.query(
    `
      SELECT
        id,
        meta_campaign_id,
        meta_ad_account_id,
        meta_adset_id
      FROM generated_campaigns
      WHERE campaign_id = $1::uuid
        AND market_code = $2
        AND meta_campaign_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [row.campaign_id, row.market_code]
  )
  return rows?.[0] ?? null
}

async function findExistingGeneratedAdSet(client, generatedCampaignId) {
  const { rows } = await client.query(
    `
      SELECT id, meta_adset_id
      FROM generated_adsets
      WHERE generated_campaign_id = $1::uuid
        AND meta_adset_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [generatedCampaignId]
  )
  return rows?.[0] ?? null
}

async function persistAdSet(client, { generatedCampaign, row, name, createdAdSet }) {
  const { rows: updatedRows } = await client.query(
    `
      UPDATE generated_campaigns
      SET
        meta_adset_id = $2,
        meta_adset_status = $3,
        meta_adset_effective_status = $4,
        meta_run_mode = 'REAL',
        status = 'PAUSED',
        market_code = $5,
        market_name = $6,
        market_param = $7,
        resolved_countries = $8::jsonb,
        targeting_preview = $9::jsonb,
        ops_last_action = 'operational_market.adset.publish',
        ops_last_ok = true,
        ops_last_at = now()
      WHERE id = $1::uuid
      RETURNING id
    `,
    [
      generatedCampaign.id,
      createdAdSet.id,
      createdAdSet.status,
      createdAdSet.effectiveStatus,
      row.market_code,
      row.market_name,
      row.market_param,
      JSON.stringify(Array.isArray(row.resolved_countries) ? row.resolved_countries : []),
      JSON.stringify(row.targeting_preview && typeof row.targeting_preview === 'object' ? row.targeting_preview : {})
    ]
  )

  const { rows: adSetRows } = await client.query(
    `
      INSERT INTO generated_adsets (
        generated_campaign_id,
        meta_adset_id,
        name,
        run_mode,
        status,
        effective_status
      )
      VALUES ($1::uuid, $2, $3, 'REAL', $4, $5)
      RETURNING id
    `,
    [generatedCampaign.id, createdAdSet.id, name, createdAdSet.status, createdAdSet.effectiveStatus]
  )

  return {
    generatedCampaignId: updatedRows[0]?.id ?? generatedCampaign.id,
    generatedAdSetId: adSetRows[0]?.id ?? null
  }
}

export async function publishPausedOperationalAdSet({
  pool,
  client: providedClient,
  operationalMarketGenerationId,
  dailyBudgetCents,
  billingEvent,
  optimizationGoal,
  confirmPublishPausedAdSet,
  accessToken,
  createAdSet,
  bidStrategy,
  bidAmount,
  bidConstraints,
  promotedObject,
  promoted_object
} = {}) {
  if (!pool && !providedClient) throw new Error('pool is required')
  if (typeof createAdSet !== 'function') throw new Error('createAdSet is required')

  if (confirmPublishPausedAdSet !== true) {
    const err = new Error('confirmPublishPausedAdSet must be true')
    err.status = 400
    throw err
  }

  const budget = normalizePositiveInt(dailyBudgetCents)
  if (!budget) {
    const err = new Error('dailyBudgetCents is required (positive integer)')
    err.status = 400
    throw err
  }

  const be = normalizeNonEmptyString(billingEvent)
  if (!be) {
    const err = new Error('billingEvent is required')
    err.status = 400
    throw err
  }

  const og = normalizeNonEmptyString(optimizationGoal)
  if (!og) {
    const err = new Error('optimizationGoal is required')
    err.status = 400
    throw err
  }

  const normalizedPromotedObject = normalizePromotedObject(promotedObject ?? promoted_object)
  const promotedObjectErrors = requiresPromotedObject(og) ? validateOffsitePromotedObject(normalizedPromotedObject) : []
  if (promotedObjectErrors.length > 0) {
    const err = new Error('promotedObject is required for OFFSITE_CONVERSIONS')
    err.status = 400
    err.details = { errors: promotedObjectErrors }
    throw err
  }

  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const client = providedClient ?? (await pool.connect())
  const manageTransaction = !providedClient
  try {
    if (manageTransaction) await client.query('BEGIN')

    const row = await fetchOperationalMarketGeneration(client, operationalMarketGenerationId)
    if (!row) {
      const err = new Error('Operational market generation not found')
      err.status = 404
      throw err
    }

    const generatedCampaign = await findGeneratedCampaign(client, row)
    if (!generatedCampaign?.meta_campaign_id) {
      const err = new Error('Operational market generation has no published Meta Campaign')
      err.status = 400
      throw err
    }

    const existingGeneratedAdSet = await findExistingGeneratedAdSet(client, generatedCampaign.id)
    const existingAdSetId =
      normalizeNonEmptyString(generatedCampaign.meta_adset_id) ??
      normalizeNonEmptyString(existingGeneratedAdSet?.meta_adset_id)
    if (existingAdSetId) {
      if (manageTransaction) await client.query('COMMIT')
      return {
        ok: true,
        status: 'PAUSED',
        metaCampaignId: generatedCampaign.meta_campaign_id,
        metaAdSetId: existingAdSetId,
        generatedCampaignId: generatedCampaign.id,
        generatedAdSetId: existingGeneratedAdSet?.id ?? null,
        operationalMarketGenerationId: row.id,
        duplicated: false,
        created: {
          campaign: false,
          adSet: false,
          creative: false,
          ad: false
        }
      }
    }

    const metaAdAccountId = normalizeNonEmptyString(generatedCampaign.meta_ad_account_id)
    if (!metaAdAccountId) {
      const err = new Error('Generated campaign is missing meta_ad_account_id')
      err.status = 400
      throw err
    }

    const targetingResult = buildOperationalMarketTargeting({
      marketCode: row.market_code,
      resolvedCountries: row.resolved_countries,
      targetingPreview: row.targeting_preview
    })
    if (!targetingResult.ok) {
      const err = new Error('Operational targeting is invalid')
      err.status = 400
      err.details = { errors: targetingResult.errors }
      throw err
    }

    const name = normalizeNonEmptyString(row.market_param)
    if (!name) {
      const err = new Error('market_param is required to name the Meta AdSet')
      err.status = 400
      throw err
    }

    const compliance = applyMetaRegionalCompliance(
      {
        name,
        targeting: targetingResult.targeting,
        status: 'PAUSED'
      },
      {
        marketCode: row.market_code,
        marketParam: row.market_param,
        targetingMetadata: targetingResult.targetingMetadata
      }
    )

    let createdAdSetRaw = null
    try {
      createdAdSetRaw = await createAdSet({
        metaAdAccountId,
        metaCampaignId: generatedCampaign.meta_campaign_id,
        name,
        targeting: compliance.payload.targeting,
        dailyBudgetCents: budget,
        billingEvent: be,
        optimizationGoal: og,
        bidStrategy: normalizeNonEmptyString(bidStrategy) ?? 'LOWEST_COST_WITHOUT_CAP',
        bidAmount,
        bidConstraints,
        promotedObject: normalizedPromotedObject,
        regionalRegulatedCategories: compliance.regionalRegulatedCategories,
        regional_regulated_categories: compliance.regionalRegulatedCategories,
        accessToken: token,
        status: 'PAUSED'
      })
    } catch (err) {
      const complianceError = mapMetaRegionalComplianceError(err, { regionalCompliance: compliance.diagnostic })
      if (complianceError) {
        err.details = {
          ...(err.details && typeof err.details === 'object' ? { originalMetaError: err.details } : null),
          operationalMessage: complianceError.operationalMessage,
          regionalCompliance: compliance.diagnostic,
          meta: complianceError
        }
      }
      throw err
    }

    const createdAdSet = normalizeCreatedAdSet(createdAdSetRaw)

    const persisted = await persistAdSet(client, {
      generatedCampaign,
      row,
      name,
      createdAdSet
    })

    if (manageTransaction) await client.query('COMMIT')
    return {
      ok: true,
      status: 'PAUSED',
      metaCampaignId: generatedCampaign.meta_campaign_id,
      metaAdSetId: createdAdSet.id,
      generatedCampaignId: persisted.generatedCampaignId,
      generatedAdSetId: persisted.generatedAdSetId,
      operationalMarketGenerationId: row.id,
      targeting: targetingResult.targeting,
      targetingMetadata: targetingResult.targetingMetadata,
      regionalCompliance: compliance.diagnostic,
      promotedObject: normalizedPromotedObject,
      regionalRegulatedCategories: compliance.regionalRegulatedCategories,
      complianceSection: compliance.regionalRegulatedCategories[0] ?? null,
      duplicated: false,
      created: {
        campaign: false,
        adSet: true,
        creative: false,
        ad: false
      }
    }
  } catch (err) {
    if (manageTransaction) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // best-effort rollback
      }
    }
    throw err
  } finally {
    if (!providedClient) client.release()
  }
}
