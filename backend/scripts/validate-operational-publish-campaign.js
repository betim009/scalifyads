import { initDb, getPool, closeDb } from '../src/db.js'
import { generateOperationalMarkets } from '../src/lib/operationalMarketGeneration.js'
import { insertOperationalMarketGeneration } from '../src/services/operationalMarketGenerations.js'
import { publishPausedOperationalCampaign } from '../src/services/operationalMarketCampaignPublisher.js'

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
    throw new Error('DATABASE_URL is required to validate operational publish campaign')
  }

  const pool = getPool()
  const client = await pool.connect()
  let createCalls = 0

  const createCampaignStub = async ({ metaAdAccountId, name, objective, status }) => {
    createCalls += 1
    assert(metaAdAccountId === 'act_123456789', 'Unexpected metaAdAccountId in createCampaign stub')
    assert(name === 'ARM-PlantasBTN-FB', 'Campaign name should use market_param')
    assert(objective === 'OUTCOME_SALES', 'Unexpected objective in createCampaign stub')
    assert(status === 'PAUSED', 'Campaign status should be forced to PAUSED')
    return {
      id: 'stub-meta-campaign-p51',
      name,
      status: 'PAUSED',
      effective_status: 'PAUSED',
      objective
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
        VALUES ($1, 'P51 Publish Campaign Validation', 'draft', 'global', NULL, NULL, $2::jsonb)
        RETURNING id
      `,
      [`p51-publish-campaign-${Date.now()}`, JSON.stringify({ source: 'p51.validation', metaPublishing: false })]
    )
    const campaignId = campaignResult.rows[0].id
    const row = await insertOperationalMarketGeneration(client, { campaignId, market: generated.markets[0] })
    assert(row.market_param === 'ARM-PlantasBTN-FB', 'Expected ARM-PlantasBTN-FB')

    const base = {
      client,
      operationalMarketGenerationId: row.id,
      metaAdAccountId: 'act_123456789',
      objective: 'OUTCOME_SALES',
      confirmPublishPausedCampaign: true,
      accessToken: 'fake-token-no-meta-call',
      createCampaign: createCampaignStub
    }

    await expectError(
      'missing confirmation',
      () => publishPausedOperationalCampaign({ ...base, confirmPublishPausedCampaign: false }),
      400
    )
    await expectError(
      'missing metaAdAccountId',
      () => publishPausedOperationalCampaign({ ...base, metaAdAccountId: null }),
      400
    )
    await expectError(
      'missing objective',
      () => publishPausedOperationalCampaign({ ...base, objective: null }),
      400
    )
    assert(createCalls === 0, 'Validation failures must not call createCampaign')

    const result = await publishPausedOperationalCampaign(base)
    assert(result.ok === true, 'Publish result should be ok')
    assert(result.status === 'PAUSED', 'Result status should be PAUSED')
    assert(result.created?.campaign === true, 'Campaign should be created on first valid call')
    assert(result.created?.adSet === false, 'AdSet must not be created')
    assert(result.created?.creative === false, 'Creative must not be created')
    assert(result.created?.ad === false, 'Ad must not be created')
    assert(result.metaCampaignId === 'stub-meta-campaign-p51', 'metaCampaignId mismatch')
    assert(createCalls === 1, 'createCampaign should be called once')

    const { rows: generatedRows, rowCount } = await client.query(
      `
        SELECT
          id,
          country_code,
          market_code,
          market_name,
          market_param,
          resolved_countries,
          targeting_preview,
          status,
          meta_run_mode,
          meta_campaign_id,
          meta_ad_account_id,
          meta_objective
        FROM generated_campaigns
        WHERE id = $1::uuid
      `,
      [result.generatedCampaignId]
    )
    assert(rowCount === 1, 'Generated campaign compatibility row missing')
    const gc = generatedRows[0]
    assert(gc.country_code === 'AE', 'Expected legacy compatibility country_code AE for ARM')
    assert(gc.market_code === 'ARM', 'market_code should be ARM')
    assert(gc.market_param === 'ARM-PlantasBTN-FB', 'market_param mismatch')
    assert(Array.isArray(gc.resolved_countries) && gc.resolved_countries.length === 82, 'resolved_countries should be persisted')
    assert(gc.targeting_preview?.publishable === false, 'targeting_preview should remain non-publishable')
    assert(gc.status === 'PAUSED', 'generated_campaign status should remain PAUSED')
    assert(gc.meta_run_mode === 'REAL', 'meta_run_mode should be REAL')
    assert(gc.meta_campaign_id === 'stub-meta-campaign-p51', 'meta_campaign_id should be persisted')
    assert(gc.meta_ad_account_id === 'act_123456789', 'meta_ad_account_id should be persisted')
    assert(gc.meta_objective === 'OUTCOME_SALES', 'meta_objective should be persisted')

    const duplicate = await publishPausedOperationalCampaign(base)
    assert(duplicate.ok === true, 'Duplicate result should be ok')
    assert(duplicate.created?.campaign === false, 'Duplicate call must not create another campaign')
    assert(duplicate.generatedCampaignId === result.generatedCampaignId, 'Duplicate should return existing generatedCampaignId')
    assert(duplicate.metaCampaignId === result.metaCampaignId, 'Duplicate should return existing metaCampaignId')
    assert(createCalls === 1, 'Duplicate call must not call createCampaign again')

    await client.query('ROLLBACK')

    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          endpoint: '/api/operational-market-generations/:id/publish-campaign',
          noRealMetaCall: true,
          marketParam: row.market_param,
          status: result.status,
          metaCampaignId: result.metaCampaignId,
          generatedCampaignId: result.generatedCampaignId,
          operationalMarketGenerationId: result.operationalMarketGenerationId,
          created: result.created,
          duplicateCreated: duplicate.created,
          createCampaignCalls: createCalls,
          compatibility: {
            countryCode: gc.country_code,
            marketCode: gc.market_code,
            marketParam: gc.market_param,
            resolvedCountryCount: gc.resolved_countries.length,
            metaRunMode: gc.meta_run_mode
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
  console.error(`[validate-operational-publish-campaign] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
