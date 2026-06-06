import { initDb, getPool, closeDb } from '../src/db.js'
import { normalizeMarketPersistenceInput } from '../src/lib/marketTargeting.js'

const sampleMarket = {
  marketCode: 'ENCA',
  marketName: 'Ingles Canada',
  marketParam: 'ENCA-PlantasBTN-FB',
  resolvedCountries: ['CA'],
  targetingPreview: {
    included: ['Canada'],
    excluded: [],
    countries: ['CA'],
    publishable: false
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function main() {
  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required to validate market persistence')
  }

  const market = normalizeMarketPersistenceInput(sampleMarket)
  assert(market.ok, `Invalid sample market input: ${market.errors.join(', ')}`)

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `
        INSERT INTO countries (code, name, language_code)
        VALUES ('CA', 'Canada', 'en')
        ON CONFLICT (code) DO NOTHING
      `
    )

    const campaignResult = await client.query(
      `
        INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
        VALUES ($1, $2, 'draft', 'global', NULL, NULL, '{}'::jsonb)
        RETURNING id
      `,
      [`p36b-market-persistence-${Date.now()}`, 'P36B Market Persistence Validation']
    )
    const campaignId = campaignResult.rows[0].id

    const insertedMarket = await client.query(
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
          targeting_preview
        )
        VALUES ($1::uuid, 'CA', $2, 'PAUSED', $3, $4, $5, $6::jsonb, $7::jsonb)
        RETURNING
          id,
          country_code,
          status,
          market_code,
          market_name,
          market_param,
          resolved_countries,
          targeting_preview
      `,
      [
        campaignId,
        'P36B Market Persistence Validation - ENCA',
        market.marketCode,
        market.marketName,
        market.marketParam,
        JSON.stringify(market.resolvedCountries),
        JSON.stringify(market.targetingPreview)
      ]
    )

    const marketRow = insertedMarket.rows[0]
    assert(marketRow.country_code === 'CA', 'country_code was not preserved')
    assert(marketRow.status === 'PAUSED', 'status guardrail was not preserved')
    assert(marketRow.market_code === 'ENCA', 'market_code was not persisted')
    assert(marketRow.market_name === 'Ingles Canada', 'market_name was not persisted')
    assert(marketRow.market_param === 'ENCA-PlantasBTN-FB', 'market_param was not persisted')
    assert(Array.isArray(marketRow.resolved_countries), 'resolved_countries was not returned as an array')
    assert(marketRow.resolved_countries[0] === 'CA', 'resolved_countries content mismatch')
    assert(marketRow.targeting_preview?.publishable === false, 'targeting_preview publishable flag mismatch')

    const legacyCampaignResult = await client.query(
      `
        INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
        VALUES ($1, $2, 'draft', 'global', NULL, NULL, '{}'::jsonb)
        RETURNING id
      `,
      [`p36b-legacy-persistence-${Date.now()}`, 'P36B Legacy Persistence Validation']
    )
    const legacyCampaignId = legacyCampaignResult.rows[0].id

    const legacyInserted = await client.query(
      `
        INSERT INTO generated_campaigns (campaign_id, country_code, name, status)
        VALUES ($1::uuid, 'CA', $2, 'PAUSED')
        RETURNING
          id,
          country_code,
          status,
          market_code,
          market_name,
          market_param,
          resolved_countries,
          targeting_preview
      `,
      [legacyCampaignId, 'P36B Legacy Compatibility Validation']
    )

    const legacyRow = legacyInserted.rows[0]
    assert(legacyRow.country_code === 'CA', 'legacy country_code was not preserved')
    assert(legacyRow.status === 'PAUSED', 'legacy status guardrail was not preserved')
    assert(legacyRow.market_code === null, 'legacy market_code should be null')
    assert(legacyRow.resolved_countries === null, 'legacy resolved_countries should be null')
    assert(legacyRow.targeting_preview === null, 'legacy targeting_preview should be null')

    await client.query('ROLLBACK')
    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          marketRow: {
            country_code: marketRow.country_code,
            status: marketRow.status,
            market_code: marketRow.market_code,
            market_name: marketRow.market_name,
            market_param: marketRow.market_param,
            resolved_countries: marketRow.resolved_countries,
            targeting_preview: marketRow.targeting_preview
          },
          legacyRow: {
            country_code: legacyRow.country_code,
            status: legacyRow.status,
            market_code: legacyRow.market_code,
            resolved_countries: legacyRow.resolved_countries,
            targeting_preview: legacyRow.targeting_preview
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
  console.error(`[validate-market-persistence] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
