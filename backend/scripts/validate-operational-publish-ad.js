import { initDb, getPool, closeDb } from '../src/db.js'
import { generateOperationalMarkets } from '../src/lib/operationalMarketGeneration.js'
import { insertOperationalMarketGeneration } from '../src/services/operationalMarketGenerations.js'
import { publishPausedOperationalAd } from '../src/services/operationalMarketAdPublisher.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function expectError(label, fn, expectedStatus) {
  try {
    await fn()
  } catch (err) {
    assert(
      err?.status === expectedStatus,
      `${label}: expected status ${expectedStatus}, got ${err?.status ?? 'none'} (${err?.message ?? 'no message'})`
    )
    return err
  }
  throw new Error(`${label}: expected error`)
}

async function main() {
  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required to validate operational publish ad')
  }

  const pool = getPool()
  const client = await pool.connect()
  let createCalls = 0

  const createAdStub = async ({ metaAdAccountId, metaAdSetId, name, creativeId, status }) => {
    createCalls += 1
    assert(metaAdAccountId === 'act_123456789', 'Unexpected metaAdAccountId')
    assert(metaAdSetId === 'stub-meta-adset-p57', 'Unexpected metaAdSetId')
    assert(name === 'ENCA-PlantasBTN-FB', 'Ad name should use market_param')
    assert(creativeId === 'stub-meta-creative-p57', 'Unexpected creativeId')
    assert(status === 'PAUSED', 'Ad status should be forced to PAUSED')
    return {
      id: 'stub-meta-ad-p57',
      name,
      adset_id: metaAdSetId,
      campaign_id: 'stub-meta-campaign-p57',
      creative: { id: creativeId },
      status: 'PAUSED',
      effective_status: 'PAUSED'
    }
  }

  try {
    await client.query('BEGIN')

    const { rows: countryRows } = await client.query(`SELECT code FROM countries ORDER BY code ASC`)
    const compatibilityCountryCode = countryRows[0]?.code
    assert(compatibilityCountryCode, 'Expected at least one seeded country')
    const generated = generateOperationalMarkets({
      niche: 'PlantasBTN',
      markets: ['ENCA'],
      availableCountryCodes: countryRows.map((row) => row.code).filter(Boolean)
    })
    assert(generated.ok, `Invalid operational generation input: ${generated.errors.join(', ')}`)

    const campaignResult = await client.query(
      `
        INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
        VALUES ($1, 'P57 Publish Ad Validation', 'draft', 'global', NULL, NULL, $2::jsonb)
        RETURNING id
      `,
      [`p57-publish-ad-${Date.now()}`, JSON.stringify({ source: 'p57.validation', metaPublishing: false })]
    )
    const campaignId = campaignResult.rows[0].id
    const row = await insertOperationalMarketGeneration(client, { campaignId, market: generated.markets[0] })
    assert(row.market_param === 'ENCA-PlantasBTN-FB', 'Expected ENCA-PlantasBTN-FB')

    const base = {
      client,
      operationalMarketGenerationId: row.id,
      confirmPublishPausedAd: true,
      accessToken: 'fake-token-no-meta-call',
      createAd: createAdStub
    }

    await expectError(
      'missing confirmation',
      () => publishPausedOperationalAd({ ...base, confirmPublishPausedAd: false }),
      400
    )
    await expectError('missing generated campaign', () => publishPausedOperationalAd(base), 400)
    assert(createCalls === 0, 'Validation failures must not call createAd')

    const { rows: generatedRows } = await client.query(
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
          meta_adset_id,
          meta_run_mode,
          meta_ad_account_id,
          meta_status,
          meta_effective_status,
          meta_objective
        )
        VALUES (
          $1::uuid,
          $5,
          'ENCA-PlantasBTN-FB',
          'PAUSED',
          'ENCA',
          $2,
          'ENCA-PlantasBTN-FB',
          $3::jsonb,
          $4::jsonb,
          'stub-meta-campaign-p57',
          'stub-meta-adset-p57',
          'REAL',
          'act_123456789',
          'PAUSED',
          'PAUSED',
          'OUTCOME_AWARENESS'
        )
        RETURNING id
      `,
      [
        campaignId,
        row.market_name,
        JSON.stringify(row.resolved_countries),
        JSON.stringify(row.targeting_preview),
        compatibilityCountryCode
      ]
    )
    const generatedCampaignId = generatedRows[0].id

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
        VALUES ($1::uuid, 'stub-meta-adset-p57', 'ENCA-PlantasBTN-FB', 'REAL', 'PAUSED', 'PAUSED')
        RETURNING id
      `,
      [generatedCampaignId]
    )
    const generatedAdSetId = adSetRows[0].id

    await expectError('missing creative', () => publishPausedOperationalAd(base), 400)
    assert(createCalls === 0, 'Missing creative must not call createAd')

    const { rows: creativeRows } = await client.query(
      `
        INSERT INTO creative_drafts (
          generated_campaign_id,
          primary_text,
          headline,
          destination_url,
          status,
          meta_creative_id
        )
        VALUES ($1::uuid, 'ENCA primary text', 'ENCA headline', 'https://example.com/enca', 'meta_published', 'stub-meta-creative-p57')
        RETURNING id
      `,
      [generatedCampaignId]
    )
    const creativeDraftId = creativeRows[0].id

    const result = await publishPausedOperationalAd(base)
    assert(result.ok === true, 'Publish result should be ok')
    assert(result.created?.campaign === false, 'Campaign must not be created')
    assert(result.created?.adSet === false, 'AdSet must not be created')
    assert(result.created?.creative === false, 'Creative must not be created')
    assert(result.created?.ad === true, 'Ad should be created')
    assert(result.metaAdId === 'stub-meta-ad-p57', 'metaAdId mismatch')
    assert(result.generatedCampaignId === generatedCampaignId, 'generatedCampaignId mismatch')
    assert(createCalls === 1, 'createAd should be called once')

    const { rows: adRows, rowCount: adCount } = await client.query(
      `
        SELECT id, generated_campaign_id, generated_adset_id, creative_draft_id, meta_ad_id, name, run_mode, status, effective_status
        FROM generated_ads
        WHERE generated_campaign_id = $1::uuid
      `,
      [generatedCampaignId]
    )
    assert(adCount === 1, 'Expected one generated_ads row')
    assert(adRows[0].generated_adset_id === generatedAdSetId, 'generated_adset_id mismatch')
    assert(adRows[0].creative_draft_id === creativeDraftId, 'creative_draft_id mismatch')
    assert(adRows[0].meta_ad_id === 'stub-meta-ad-p57', 'meta_ad_id should be persisted')
    assert(adRows[0].status === 'PAUSED', 'generated_ads status should be PAUSED')

    const duplicate = await publishPausedOperationalAd(base)
    assert(duplicate.ok === true, 'Duplicate result should be ok')
    assert(duplicate.duplicated === true, 'Duplicate result should be marked as duplicated')
    assert(duplicate.created?.ad === false, 'Duplicate call must not create another Ad')
    assert(duplicate.metaAdId === result.metaAdId, 'Duplicate should return existing metaAdId')
    assert(duplicate.generatedAdId === result.generatedAdId, 'Duplicate should return existing generatedAdId')
    assert(createCalls === 1, 'Duplicate call must not call createAd again')

    await client.query('ROLLBACK')

    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          endpoint: '/api/operational-market-generations/:id/publish-ad',
          noRealMetaCall: true,
          marketParam: row.market_param,
          metaAdId: result.metaAdId,
          generatedAdId: result.generatedAdId,
          generatedCampaignId: result.generatedCampaignId,
          creativeDraftId: result.creativeDraftId,
          operationalMarketGenerationId: result.operationalMarketGenerationId,
          created: result.created,
          duplicateCreated: duplicate.created,
          createAdCalls: createCalls
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
  console.error(`[validate-operational-publish-ad] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
