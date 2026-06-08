import { initDb, getPool, closeDb } from '../src/db.js'
import { generateOperationalMarkets } from '../src/lib/operationalMarketGeneration.js'
import { insertOperationalMarketGeneration } from '../src/services/operationalMarketGenerations.js'
import { publishOperationalCreative } from '../src/services/operationalMarketCreativePublisher.js'

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
    throw new Error('DATABASE_URL is required to validate operational publish creative')
  }

  const pool = getPool()
  const client = await pool.connect()
  let createCalls = 0

  const createCreativeStub = async ({
    metaAdAccountId,
    pageId,
    name,
    message,
    link,
    headline,
    description,
    ctaType,
    imageHash,
    videoId
  }) => {
    createCalls += 1
    assert(metaAdAccountId === 'act_123456789', 'Unexpected metaAdAccountId in createCreative stub')
    assert(pageId === '123456789012345', 'Unexpected pageId in createCreative stub')
    assert(name === 'ENCA Plantas Headline', 'Creative name should use headline')
    assert(message === 'ENCA primary text', 'Unexpected primary text')
    assert(link === 'https://example.com/enca?src=ENCA-PlantasBTN-FB', 'Unexpected destination URL')
    assert(headline === 'ENCA Plantas Headline', 'Unexpected headline')
    assert(description === 'ENCA description', 'Unexpected description')
    assert(ctaType === 'LEARN_MORE', 'Unexpected ctaType')
    assert(imageHash === undefined, 'Operational minimal Creative should not require imageHash')
    assert(videoId === undefined, 'Operational minimal Creative should not require videoId')
    return {
      id: 'stub-meta-creative-p56',
      name,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          link,
          message,
          name: headline,
          description,
          call_to_action: {
            type: ctaType,
            value: { link }
          }
        }
      }
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
        VALUES ($1, 'P56 Publish Creative Validation', 'draft', 'global', NULL, NULL, $2::jsonb)
        RETURNING id
      `,
      [`p56-publish-creative-${Date.now()}`, JSON.stringify({ source: 'p56.validation', metaPublishing: false })]
    )
    const campaignId = campaignResult.rows[0].id
    const row = await insertOperationalMarketGeneration(client, { campaignId, market: generated.markets[0] })
    assert(row.market_param === 'ENCA-PlantasBTN-FB', 'Expected ENCA-PlantasBTN-FB')

    const baseBody = {
      pageId: '123456789012345',
      primaryText: 'ENCA primary text',
      headline: 'ENCA Plantas Headline',
      description: 'ENCA description',
      destinationUrl: 'https://example.com/enca?src=ENCA-PlantasBTN-FB',
      ctaType: 'LEARN_MORE',
      confirmPublishCreative: true
    }
    const base = {
      client,
      operationalMarketGenerationId: row.id,
      body: baseBody,
      accessToken: 'fake-token-no-meta-call',
      createCreative: createCreativeStub
    }

    await expectError(
      'missing confirmation',
      () => publishOperationalCreative({ ...base, body: { ...baseBody, confirmPublishCreative: false } }),
      400
    )
    await expectError('missing generated campaign', () => publishOperationalCreative(base), 400)
    assert(createCalls === 0, 'Validation failures must not call createCreative')

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
          'stub-meta-campaign-p56',
          'stub-meta-adset-p56',
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
    const generatedCampaignId = insertedGenerated.rows[0].id

    await expectError(
      'missing pageId',
      () => publishOperationalCreative({ ...base, body: { ...baseBody, pageId: null, page_id: null } }),
      400
    )
    await expectError(
      'missing destinationUrl',
      () => publishOperationalCreative({ ...base, body: { ...baseBody, destinationUrl: null, destination_url: null } }),
      400
    )
    assert(createCalls === 0, 'Creative requirement failures must not call createCreative')

    const result = await publishOperationalCreative(base)
    assert(result.ok === true, 'Publish result should be ok')
    assert(result.created?.campaign === false, 'Campaign must not be created')
    assert(result.created?.adSet === false, 'AdSet must not be created')
    assert(result.created?.creative === true, 'Creative should be created')
    assert(result.created?.ad === false, 'Ad must not be created')
    assert(result.metaCreativeId === 'stub-meta-creative-p56', 'metaCreativeId mismatch')
    assert(result.generatedCampaignId === generatedCampaignId, 'generatedCampaignId mismatch')
    assert(createCalls === 1, 'createCreative should be called once')

    const { rows: draftRows, rowCount: draftCount } = await client.query(
      `
        SELECT id, generated_campaign_id, primary_text, headline, description, cta_type, destination_url, status, meta_creative_id
        FROM creative_drafts
        WHERE generated_campaign_id = $1::uuid
      `,
      [generatedCampaignId]
    )
    assert(draftCount === 1, 'Expected one creative_drafts row')
    assert(draftRows[0].meta_creative_id === 'stub-meta-creative-p56', 'meta_creative_id should be persisted')
    assert(draftRows[0].status === 'meta_published', 'Creative draft status should be meta_published')

    const { rowCount: adCount } = await client.query(
      `SELECT 1 FROM generated_ads WHERE generated_campaign_id = $1::uuid`,
      [generatedCampaignId]
    )
    assert(adCount === 0, 'Creative publish must not create generated_ads')

    const duplicate = await publishOperationalCreative(base)
    assert(duplicate.ok === true, 'Duplicate result should be ok')
    assert(duplicate.created?.creative === false, 'Duplicate call must not create another Creative')
    assert(duplicate.metaCreativeId === result.metaCreativeId, 'Duplicate should return existing metaCreativeId')
    assert(createCalls === 1, 'Duplicate call must not call createCreative again')

    await client.query('ROLLBACK')

    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          endpoint: '/api/operational-market-generations/:id/publish-creative',
          noRealMetaCall: true,
          marketParam: row.market_param,
          metaCreativeId: result.metaCreativeId,
          creativeDraftId: result.creativeDraftId,
          generatedCampaignId: result.generatedCampaignId,
          operationalMarketGenerationId: result.operationalMarketGenerationId,
          created: result.created,
          duplicateCreated: duplicate.created,
          createCreativeCalls: createCalls,
          generatedAdsCreated: adCount
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
  console.error(`[validate-operational-publish-creative] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
