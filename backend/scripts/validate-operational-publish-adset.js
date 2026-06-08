import { initDb, getPool, closeDb } from '../src/db.js'
import { generateOperationalMarkets } from '../src/lib/operationalMarketGeneration.js'
import { insertOperationalMarketGeneration } from '../src/services/operationalMarketGenerations.js'
import { publishPausedOperationalAdSet } from '../src/services/operationalMarketAdSetPublisher.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function expectError(label, fn, expectedStatus) {
  try {
    await fn()
  } catch (err) {
    assert(err?.status === expectedStatus, `${label}: expected status ${expectedStatus}, got ${err?.status ?? 'none'}`)
    return err
  }
  throw new Error(`${label}: expected error`)
}

async function main() {
  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required to validate operational publish adset')
  }

  const pool = getPool()
  const client = await pool.connect()
  let createCalls = 0

  const createAdSetStub = async ({
    metaAdAccountId,
    metaCampaignId,
    name,
    countryCode,
    targeting,
    dailyBudgetCents,
    billingEvent,
    optimizationGoal,
    status
  }) => {
    createCalls += 1
    assert(metaAdAccountId === 'act_123456789', 'Unexpected metaAdAccountId in createAdSet stub')
    assert(metaCampaignId === 'stub-meta-campaign-p54', 'Unexpected metaCampaignId in createAdSet stub')
    assert(name === 'ARM-PlantasBTN-FB', 'AdSet name should use market_param')
    assert(countryCode === undefined, 'Operational AdSet must not use legacy countryCode')
    assert(Array.isArray(targeting?.geo_locations?.countries), 'Targeting countries missing')
    assert(targeting.geo_locations.countries.length === 82, 'ARM should target 82 resolved countries after exclusions')
    assert(targeting.geo_locations.countries.includes('AE'), 'ARM targeting should include AE')
    assert(!targeting.geo_locations.countries.includes('TW'), 'ARM targeting should remove excluded TW')
    assert(Array.isArray(targeting.geo_locations.excluded_countries), 'Excluded countries should be present for ARM')
    assert(targeting.geo_locations.excluded_countries.includes('TW'), 'ARM should include TW in excluded_countries')
    assert(dailyBudgetCents === 1000, 'Unexpected dailyBudgetCents in createAdSet stub')
    assert(billingEvent === 'IMPRESSIONS', 'Unexpected billingEvent in createAdSet stub')
    assert(optimizationGoal === 'OFFSITE_CONVERSIONS', 'Unexpected optimizationGoal in createAdSet stub')
    assert(status === 'PAUSED', 'AdSet status should be forced to PAUSED')
    return {
      id: 'stub-meta-adset-p54',
      name,
      campaign_id: metaCampaignId,
      status: 'PAUSED',
      effective_status: 'PAUSED'
    }
  }

  try {
    await client.query('BEGIN')

    const { rows: countryRows } = await client.query(`SELECT code FROM countries ORDER BY code ASC`)
    const generated = generateOperationalMarkets({
      niche: 'PlantasBTN',
      markets: ['ARM'],
      availableCountryCodes: countryRows.map((row) => row.code).filter(Boolean)
    })
    assert(generated.ok, `Invalid operational generation input: ${generated.errors.join(', ')}`)

    const campaignResult = await client.query(
      `
        INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
        VALUES ($1, 'P54 Publish AdSet Validation', 'draft', 'global', NULL, NULL, $2::jsonb)
        RETURNING id
      `,
      [`p54-publish-adset-${Date.now()}`, JSON.stringify({ source: 'p54.validation', metaPublishing: false })]
    )
    const campaignId = campaignResult.rows[0].id
    const row = await insertOperationalMarketGeneration(client, { campaignId, market: generated.markets[0] })
    assert(row.market_param === 'ARM-PlantasBTN-FB', 'Expected ARM-PlantasBTN-FB')

    const base = {
      client,
      operationalMarketGenerationId: row.id,
      dailyBudgetCents: 1000,
      billingEvent: 'IMPRESSIONS',
      optimizationGoal: 'OFFSITE_CONVERSIONS',
      confirmPublishPausedAdSet: true,
      accessToken: 'fake-token-no-meta-call',
      createAdSet: createAdSetStub
    }

    await expectError(
      'missing confirmation',
      () => publishPausedOperationalAdSet({ ...base, confirmPublishPausedAdSet: false }),
      400
    )
    await expectError(
      'missing dailyBudgetCents',
      () => publishPausedOperationalAdSet({ ...base, dailyBudgetCents: null }),
      400
    )
    await expectError(
      'missing billingEvent',
      () => publishPausedOperationalAdSet({ ...base, billingEvent: null }),
      400
    )
    await expectError(
      'missing optimizationGoal',
      () => publishPausedOperationalAdSet({ ...base, optimizationGoal: null }),
      400
    )
    await expectError('missing published campaign', () => publishPausedOperationalAdSet(base), 400)
    assert(createCalls === 0, 'Validation failures must not call createAdSet')

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
          meta_campaign_id,
          meta_run_mode,
          meta_ad_account_id,
          meta_status,
          meta_effective_status,
          meta_objective
        )
        VALUES (
          $1::uuid,
          'AE',
          'ARM-PlantasBTN-FB',
          'PAUSED',
          'ARM',
          $2,
          'ARM-PlantasBTN-FB',
          $3::jsonb,
          $4::jsonb,
          'stub-meta-campaign-p54',
          'REAL',
          'act_123456789',
          'PAUSED',
          'PAUSED',
          'OUTCOME_SALES'
        )
        RETURNING id
      `,
      [campaignId, row.market_name, JSON.stringify(row.resolved_countries), JSON.stringify(row.targeting_preview)]
    )
    const generatedCampaignId = insertedGenerated.rows[0].id

    const result = await publishPausedOperationalAdSet(base)
    assert(result.ok === true, 'Publish result should be ok')
    assert(result.status === 'PAUSED', 'Result status should be PAUSED')
    assert(result.created?.campaign === false, 'Campaign must not be created')
    assert(result.created?.adSet === true, 'AdSet should be created on first valid call')
    assert(result.created?.creative === false, 'Creative must not be created')
    assert(result.created?.ad === false, 'Ad must not be created')
    assert(result.metaCampaignId === 'stub-meta-campaign-p54', 'metaCampaignId mismatch')
    assert(result.metaAdSetId === 'stub-meta-adset-p54', 'metaAdSetId mismatch')
    assert(result.generatedCampaignId === generatedCampaignId, 'generatedCampaignId mismatch')
    assert(createCalls === 1, 'createAdSet should be called once')

    const { rows: gcRows, rowCount: gcCount } = await client.query(
      `
        SELECT id, meta_adset_id, meta_adset_status, meta_adset_effective_status, meta_run_mode, status, market_code, market_param
        FROM generated_campaigns
        WHERE id = $1::uuid
      `,
      [generatedCampaignId]
    )
    assert(gcCount === 1, 'Generated campaign missing after AdSet persist')
    const gc = gcRows[0]
    assert(gc.meta_adset_id === 'stub-meta-adset-p54', 'meta_adset_id should be persisted')
    assert(gc.meta_adset_status === 'PAUSED', 'meta_adset_status should be PAUSED')
    assert(gc.meta_adset_effective_status === 'PAUSED', 'meta_adset_effective_status should be PAUSED')
    assert(gc.meta_run_mode === 'REAL', 'meta_run_mode should remain REAL')
    assert(gc.status === 'PAUSED', 'generated_campaign status should remain PAUSED')
    assert(gc.market_code === 'ARM', 'market_code should remain ARM')
    assert(gc.market_param === 'ARM-PlantasBTN-FB', 'market_param mismatch')

    const { rows: adSetRows, rowCount: adSetCount } = await client.query(
      `
        SELECT id, generated_campaign_id, meta_adset_id, name, run_mode, status, effective_status
        FROM generated_adsets
        WHERE generated_campaign_id = $1::uuid
      `,
      [generatedCampaignId]
    )
    assert(adSetCount === 1, 'Expected one generated_adsets row')
    assert(adSetRows[0].meta_adset_id === 'stub-meta-adset-p54', 'generated_adsets meta_adset_id mismatch')
    assert(adSetRows[0].run_mode === 'REAL', 'generated_adsets run_mode should be REAL')
    assert(adSetRows[0].status === 'PAUSED', 'generated_adsets status should be PAUSED')

    const { rowCount: adCount } = await client.query(
      `SELECT 1 FROM generated_ads WHERE generated_campaign_id = $1::uuid`,
      [generatedCampaignId]
    )
    assert(adCount === 0, 'AdSet publish must not create generated_ads')

    const duplicate = await publishPausedOperationalAdSet(base)
    assert(duplicate.ok === true, 'Duplicate result should be ok')
    assert(duplicate.created?.adSet === false, 'Duplicate call must not create another AdSet')
    assert(duplicate.metaAdSetId === result.metaAdSetId, 'Duplicate should return existing metaAdSetId')
    assert(createCalls === 1, 'Duplicate call must not call createAdSet again')

    await client.query('ROLLBACK')

    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          endpoint: '/api/operational-market-generations/:id/publish-adset',
          noRealMetaCall: true,
          marketParam: row.market_param,
          status: result.status,
          metaCampaignId: result.metaCampaignId,
          metaAdSetId: result.metaAdSetId,
          generatedCampaignId: result.generatedCampaignId,
          generatedAdSetId: result.generatedAdSetId,
          operationalMarketGenerationId: result.operationalMarketGenerationId,
          created: result.created,
          duplicateCreated: duplicate.created,
          createAdSetCalls: createCalls,
          targeting: {
            countryCount: result.targeting.geo_locations.countries.length,
            excludedCountries: result.targeting.geo_locations.excluded_countries
          }
        },
        null,
        2
      )
    )
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // best-effort rollback
    }
    throw err
  } finally {
    client.release()
    await closeDb()
  }
}

main().catch(async (err) => {
  console.error(`[validate-operational-publish-adset] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
