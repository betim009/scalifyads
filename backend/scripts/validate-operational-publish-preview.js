import { initDb, getPool, closeDb } from '../src/db.js'
import { generateOperationalMarkets } from '../src/lib/operationalMarketGeneration.js'
import { buildOperationalPublishPreview } from '../src/lib/operationalPublishPreview.js'
import { insertOperationalMarketGeneration } from '../src/services/operationalMarketGenerations.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function hasMissing(preview, key) {
  return Array.isArray(preview?.missingRequirements) && preview.missingRequirements.some((item) => item?.key === key)
}

async function main() {
  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required to validate operational publish preview')
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: countryRows } = await client.query(`SELECT code FROM countries ORDER BY code ASC`)
    const availableCountryCodes = countryRows.map((row) => row.code).filter(Boolean)
    const generated = generateOperationalMarkets({
      niche: 'PlantasBTN',
      markets: ['ARM'],
      availableCountryCodes
    })
    assert(generated.ok, `Invalid operational generation input: ${generated.errors.join(', ')}`)
    assert(generated.markets.length === 1, 'Expected one operational market')

    const templateResult = await client.query(
      `
        INSERT INTO campaign_templates (name, payload)
        VALUES ($1, $2::jsonb)
        RETURNING id, name, payload, created_at
      `,
      [
        'P50 Preview Template',
        JSON.stringify({
          niche: 'PlantasBTN',
          campaign: {
            name: 'P50 Preview Campaign'
          },
          dailyBudgetCents: 1000,
          billingEvent: 'IMPRESSIONS',
          optimizationGoal: 'LINK_CLICKS',
          destinationUrl: 'https://example.com/plantas',
          adVariants: [
            {
              primaryText: 'Base primary text',
              headline: 'Base headline',
              description: 'Base description'
            }
          ],
          translationsByMarket: {
            ARM: {
              adVariants: [
                {
                  primaryText: 'Texto ARM',
                  headline: 'Headline ARM',
                  description: 'Descricao ARM'
                }
              ]
            }
          }
        })
      ]
    )
    const template = templateResult.rows[0]

    const campaignResult = await client.query(
      `
        INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
        VALUES ($1, 'P50 Operational Publish Preview', 'draft', 'global', NULL, NULL, $2::jsonb)
        RETURNING id, slug, name, status, scope, objective_key, config, created_at
      `,
      [
        `p50-operational-publish-preview-${Date.now()}`,
        JSON.stringify({
          source: 'p50.validation',
          templateId: template.id,
          metaPublishing: false
        })
      ]
    )
    const campaign = {
      ...campaignResult.rows[0],
      objective_meta_value: null
    }

    const row = await insertOperationalMarketGeneration(client, {
      campaignId: campaign.id,
      market: generated.markets[0]
    })
    assert(row.market_param === 'ARM-PlantasBTN-FB', 'Expected ARM-PlantasBTN-FB market param')

    const preview = buildOperationalPublishPreview({
      operationalGeneration: row,
      campaign,
      template
    })

    assert(preview.publishable === false, 'Preview must not be publishable')
    assert(preview.previewOnly === true, 'Preview must remain previewOnly')
    assert(preview.metaPublishing === false, 'Preview must not enable Meta publishing')
    assert(preview.status === 'PAUSED', 'Preview status must remain PAUSED')
    assert(preview.campaignPayloadPreview?.status === 'PAUSED', 'Campaign payload preview must be PAUSED')
    assert(preview.adSetPayloadPreview?.status === 'PAUSED', 'AdSet payload preview must be PAUSED')
    assert(preview.creativePayloadPreview?.message === 'Texto ARM', 'Creative preview should use ARM translation')
    assert(preview.creativePayloadPreview?.link?.includes('utm_campaign=ARM'), 'Destination URL should include ARM utm_campaign')
    assert(preview.creativePayloadPreview?.link?.includes('src=ARM-PlantasBTN-FB'), 'Destination URL should include ARM src')
    assert(Array.isArray(preview.adSetPayloadPreview?.targeting?.geo_locations?.countries), 'AdSet targeting countries missing')
    assert(preview.adSetPayloadPreview.targeting.geo_locations.countries.length > 0, 'AdSet targeting countries empty')
    assert(hasMissing(preview, 'metaAdAccountId'), 'Expected missing metaAdAccountId')
    assert(hasMissing(preview, 'objective'), 'Expected missing objective')
    assert(hasMissing(preview, 'pageId'), 'Expected missing pageId')
    assert(hasMissing(preview, 'creativeDraft'), 'Expected missing creativeDraft')
    assert(!hasMissing(preview, 'adVariant'), 'Translated ARM adVariant should be present')

    await client.query('ROLLBACK')

    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          endpoint: '/api/operational-market-generations/:id/publish-preview',
          marketParam: row.market_param,
          publishable: preview.publishable,
          previewOnly: preview.previewOnly,
          metaPublishing: preview.metaPublishing,
          status: preview.status,
          campaignPayloadPreview: preview.campaignPayloadPreview,
          adSetPayloadPreview: {
            ...preview.adSetPayloadPreview,
            targetingCountryCount: preview.adSetPayloadPreview.targeting.geo_locations.countries.length
          },
          creativePayloadPreview: preview.creativePayloadPreview,
          adPayloadPreview: preview.adPayloadPreview,
          missingRequirements: preview.missingRequirements
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
  console.error(`[validate-operational-publish-preview] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
