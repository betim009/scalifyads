import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDb, getPool, closeDb } from '../src/db.js'
import { generateOperationalMarkets } from '../src/lib/operationalMarketGeneration.js'
import { listOperationalMarkets } from '../src/lib/operationalMarkets.js'
import { insertOperationalMarketGeneration } from '../src/services/operationalMarketGenerations.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationPath = path.resolve(here, '..', 'migrations', '0024_operational_market_generations.sql')
const niche = 'PlantasBTN'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertNonEmptyString(value, message) {
  assert(typeof value === 'string' && value.trim().length > 0, message)
}

async function main() {
  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required to validate all operational markets')
  }

  const catalog = listOperationalMarkets()
  const marketCodes = catalog.map((market) => market.code)
  const uniqueCodes = new Set(marketCodes)

  assert(catalog.length > 0, 'Operational market catalog is empty')
  assert(uniqueCodes.size === catalog.length, 'Operational market catalog has duplicate codes')

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const migrationSql = await fs.readFile(migrationPath, 'utf8')
    await client.query(migrationSql)

    const { rows: countryRows } = await client.query(`SELECT code FROM countries ORDER BY code ASC`)
    const availableCountryCodes = countryRows.map((row) => row.code).filter(Boolean)
    const generated = generateOperationalMarkets({
      niche,
      markets: marketCodes,
      availableCountryCodes
    })

    assert(generated.ok, `Invalid full operational generation input: ${generated.errors.join(', ')}`)
    assert(generated.markets.length === catalog.length, `Expected ${catalog.length} generated markets, got ${generated.markets.length}`)

    const campaignResult = await client.query(
      `
        INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
        VALUES ($1, 'P39 All Operational Markets Validation', 'draft', 'global', NULL, NULL, $2::jsonb)
        RETURNING id, config
      `,
      [
        `p39-all-operational-markets-${Date.now()}`,
        JSON.stringify({
          source: 'p39.validation',
          metaPublishing: false,
          niche,
          marketCount: catalog.length
        })
      ]
    )
    const campaign = campaignResult.rows[0]
    assert(campaign.config?.metaPublishing === false, 'Campaign config metaPublishing should remain false')

    for (const market of generated.markets) {
      await insertOperationalMarketGeneration(client, { campaignId: campaign.id, market })
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
      [campaign.id]
    )

    assert(listed.rows.length === catalog.length, `Expected ${catalog.length} persisted rows, got ${listed.rows.length}`)

    const persistedCodes = new Set()
    const countryCounts = []
    const strategyCounts = {}

    for (const row of listed.rows) {
      persistedCodes.add(row.market_code)
      assert(uniqueCodes.has(row.market_code), `${row.market_code} is not in backend catalog`)
      assert(row.status === 'PAUSED', `${row.market_code} status should remain PAUSED`)
      assert(row.status !== 'ACTIVE', `${row.market_code} should never be ACTIVE`)
      assertNonEmptyString(row.market_code, `${row.market_code} market_code missing`)
      assertNonEmptyString(row.market_name, `${row.market_code} market_name missing`)
      assert(row.market_param === `${row.market_code}-${niche}-FB`, `${row.market_code} market_param mismatch`)
      assert(row.utm_campaign === row.market_code, `${row.market_code} utm_campaign mismatch`)
      assert(row.src === row.market_param, `${row.market_code} src mismatch`)
      assert(Array.isArray(row.resolved_countries) && row.resolved_countries.length > 0, `${row.market_code} resolved_countries missing`)
      assert(row.targeting_preview && typeof row.targeting_preview === 'object', `${row.market_code} targeting_preview missing`)
      assert(row.targeting_preview.publishable === false, `${row.market_code} should not be publishable`)
      assert(row.targeting_preview.operationalTargeting?.publishable === false, `${row.market_code} operational targeting should not be publishable`)
      assert(row.targeting_preview.operationalTargeting?.previewOnly === true, `${row.market_code} operational targeting should remain preview-only`)
      assert(row.targeting_preview.operationalTargeting?.source === 'market_code', `${row.market_code} operational source mismatch`)
      assert(row.targeting_preview.operationalTargeting?.marketCode === row.market_code, `${row.market_code} operational marketCode mismatch`)
      assert(row.targeting_preview.tracking?.utm_campaign === row.market_code, `${row.market_code} tracking utm_campaign mismatch`)
      assert(row.targeting_preview.tracking?.src === row.market_param, `${row.market_code} tracking src mismatch`)
      assert(row.targeting_preview.meta_publishing !== true, `${row.market_code} meta_publishing should not be true`)
      countryCounts.push(row.resolved_countries.length)
      const strategy = row.targeting_preview.strategy ?? 'unknown'
      strategyCounts[strategy] = (strategyCounts[strategy] ?? 0) + 1
    }

    for (const code of marketCodes) {
      assert(persistedCodes.has(code), `${code} was not persisted`)
    }

    await client.query('ROLLBACK')

    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          catalogCount: catalog.length,
          generatedCount: generated.markets.length,
          persistedCount: listed.rows.length,
          table: 'operational_market_generations',
          campaignStatus: 'draft',
          metaPublishing: false,
          status: 'PAUSED',
          publishable: false,
          niche,
          countryCount: {
            min: Math.min(...countryCounts),
            max: Math.max(...countryCounts)
          },
          strategyCounts,
          sample: listed.rows.slice(0, 8).map((row) => ({
            market_code: row.market_code,
            market_name: row.market_name,
            market_param: row.market_param,
            utm_campaign: row.utm_campaign,
            src: row.src,
            status: row.status,
            resolved_country_count: row.resolved_countries.length,
            strategy: row.targeting_preview?.strategy ?? null,
            publishable: row.targeting_preview?.publishable ?? null
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
  console.error(`[validate-all-operational-markets] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
