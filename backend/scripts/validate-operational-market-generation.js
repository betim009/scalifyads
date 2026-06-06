import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDb, getPool, closeDb } from '../src/db.js'
import { generateOperationalMarkets } from '../src/lib/operationalMarketGeneration.js'
import { insertOperationalMarketGeneration } from '../src/services/operationalMarketGenerations.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationPath = path.resolve(here, '..', 'migrations', '0024_operational_market_generations.sql')

const sampleMarkets = ['ENCA', 'AREU', 'ARM', 'AROM']

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required to validate operational market generation')
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const migrationSql = await fs.readFile(migrationPath, 'utf8')
    await client.query(migrationSql)

    const { rows: countryRows } = await client.query(`SELECT code FROM countries ORDER BY code ASC`)
    const availableCountryCodes = countryRows.map((row) => row.code).filter(Boolean)
    const generated = generateOperationalMarkets({
      niche: 'PlantasBTN',
      markets: sampleMarkets,
      availableCountryCodes
    })
    assert(generated.ok, `Invalid operational generation input: ${generated.errors.join(', ')}`)
    assert(generated.markets.length === 4, 'Expected 4 generated operational markets')

    const campaignResult = await client.query(
      `
        INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
        VALUES ($1, 'P38 Operational Market Generation', 'draft', 'global', NULL, NULL, $2::jsonb)
        RETURNING id
      `,
      [`p38-operational-generation-${Date.now()}`, JSON.stringify({ source: 'p38.validation' })]
    )
    const campaignId = campaignResult.rows[0].id

    const rows = []
    for (const market of generated.markets) {
      const row = await insertOperationalMarketGeneration(client, { campaignId, market })
      rows.push(row)
    }

    const listed = await client.query(
      `
        SELECT
          id,
          campaign_id,
          market_code,
          market_name,
          market_param,
          resolved_countries,
          targeting_preview,
          utm_campaign,
          src,
          status,
          created_at,
          updated_at
        FROM operational_market_generations
        WHERE campaign_id = $1::uuid
        ORDER BY market_code ASC
      `,
      [campaignId]
    )

    assert(listed.rows.length === 4, 'Expected 4 operational_market_generations rows')

    for (const row of listed.rows) {
      assert(row.status === 'PAUSED', `${row.market_code} status should remain PAUSED`)
      assert(row.market_param === `${row.market_code}-PlantasBTN-FB`, `${row.market_code} market_param mismatch`)
      assert(row.utm_campaign === row.market_code, `${row.market_code} utm_campaign mismatch`)
      assert(row.src === row.market_param, `${row.market_code} src mismatch`)
      assert(Array.isArray(row.resolved_countries) && row.resolved_countries.length > 0, `${row.market_code} resolved_countries missing`)
      assert(row.targeting_preview?.operationalTargeting?.source === 'market_code', `${row.market_code} operational source mismatch`)
      assert(row.targeting_preview?.operationalTargeting?.marketCode === row.market_code, `${row.market_code} operational marketCode mismatch`)
      assert(row.targeting_preview?.legacyCountryCode, `${row.market_code} legacyCountryCode should remain only in preview metadata`)
      assert(row.targeting_preview?.publishable === false, `${row.market_code} should not be publishable`)
    }

    await client.query('ROLLBACK')
    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          table: 'operational_market_generations',
          generated: listed.rows.map((row) => ({
            market_code: row.market_code,
            status: row.status,
            market_param: row.market_param,
            resolved_countries: row.resolved_countries,
            utm_campaign: row.utm_campaign,
            src: row.src,
            operational_targeting: row.targeting_preview?.operationalTargeting ?? null,
            legacy_country_code_metadata: row.targeting_preview?.legacyCountryCode ?? null
          }))
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
  console.error(`[validate-operational-market-generation] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
