import { initDb, getPool, closeDb } from '../src/db.js'
import { generateOperationalMarkets } from '../src/lib/operationalMarketGeneration.js'
import { insertOperationalMarketGeneration } from '../src/services/operationalMarketGenerations.js'
import { syncOperationalMetaStatuses } from '../src/services/operationalMetaStatusSync.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required to validate operational status sync')
  }

  const pool = getPool()
  const client = await pool.connect()
  const calls = {
    campaign: 0,
    adSet: 0,
    creative: 0,
    ad: 0
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
        VALUES ($1, 'P58 Status Sync Validation', 'draft', 'global', NULL, NULL, $2::jsonb)
        RETURNING id
      `,
      [`p58-status-sync-${Date.now()}`, JSON.stringify({ source: 'p58.validation', metaPublishing: false })]
    )
    const campaignId = campaignResult.rows[0].id
    const row = await insertOperationalMarketGeneration(client, { campaignId, market: generated.markets[0] })

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
          meta_ad_id,
          meta_run_mode,
          meta_ad_account_id,
          meta_status,
          meta_effective_status,
          meta_adset_status,
          meta_adset_effective_status,
          meta_ad_status,
          meta_ad_effective_status
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
          '120000000000001',
          '120000000000002',
          '120000000000004',
          'REAL',
          'act_123456789',
          'PAUSED',
          'PAUSED',
          'PAUSED',
          'PAUSED',
          'PAUSED',
          'IN_PROCESS'
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
          status,
          configured_status,
          effective_status
        )
        VALUES ($1::uuid, '120000000000002', 'ENCA-PlantasBTN-FB', 'PAUSED', NULL, 'PAUSED')
        RETURNING id
      `,
      [generatedCampaignId]
    )
    const generatedAdSetId = adSetRows[0].id

    const { rows: creativeRows } = await client.query(
      `
        INSERT INTO creative_drafts (
          generated_campaign_id,
          primary_text,
          headline,
          destination_url,
          status,
          meta_creative_id,
          meta_status
        )
        VALUES ($1::uuid, 'ENCA primary text', 'ENCA headline', 'https://example.com/enca', 'meta_published', '120000000000003', NULL)
        RETURNING id
      `,
      [generatedCampaignId]
    )
    const creativeDraftId = creativeRows[0].id

    const { rows: adRows } = await client.query(
      `
        INSERT INTO generated_ads (
          generated_campaign_id,
          generated_adset_id,
          creative_draft_id,
          meta_ad_id,
          name,
          run_mode,
          status,
          configured_status,
          effective_status
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, '120000000000004', 'ENCA-PlantasBTN-FB', 'REAL', 'PAUSED', NULL, 'IN_PROCESS')
        RETURNING id
      `,
      [generatedCampaignId, generatedAdSetId, creativeDraftId]
    )
    const generatedAdId = adRows[0].id

    const result = await syncOperationalMetaStatuses({
      client,
      operationalMarketGenerationId: row.id,
      accessToken: 'fake-token-no-meta-call',
      fetchCampaign: async ({ metaCampaignId }) => {
        calls.campaign += 1
        assert(metaCampaignId === '120000000000001', 'Unexpected campaign id')
        return {
          id: metaCampaignId,
          status: 'PAUSED',
          effective_status: 'PAUSED',
          objective: 'OUTCOME_AWARENESS'
        }
      },
      fetchAdSet: async ({ metaAdSetId }) => {
        calls.adSet += 1
        assert(metaAdSetId === '120000000000002', 'Unexpected adset id')
        return {
          id: metaAdSetId,
          status: 'PAUSED',
          effective_status: 'PAUSED',
          campaign_id: '120000000000001'
        }
      },
      fetchCreative: async ({ metaCreativeId }) => {
        calls.creative += 1
        assert(metaCreativeId === '120000000000003', 'Unexpected creative id')
        return {
          id: metaCreativeId,
          status: 'ACTIVE'
        }
      },
      fetchAd: async ({ metaAdId }) => {
        calls.ad += 1
        assert(metaAdId === '120000000000004', 'Unexpected ad id')
        return {
          id: metaAdId,
          status: 'PAUSED',
          configured_status: 'PAUSED',
          effective_status: 'PENDING_REVIEW',
          adset_id: '120000000000002',
          campaign_id: '120000000000001',
          creative: { id: '120000000000003' }
        }
      }
    })

    assert(result.ok === true, 'Sync result should be ok')
    assert(result.created?.campaign === false, 'Sync must not create campaign')
    assert(result.created?.adSet === false, 'Sync must not create adset')
    assert(result.created?.creative === false, 'Sync must not create creative')
    assert(result.created?.ad === false, 'Sync must not create ad')
    assert(calls.campaign === 1 && calls.adSet === 1 && calls.creative === 1 && calls.ad === 1, 'Expected one fetch per object')

    const { rows: statusRows } = await client.query(
      `
        SELECT
          gc.meta_status,
          gc.meta_effective_status,
          gc.meta_objective,
          gc.meta_adset_status,
          gc.meta_adset_effective_status,
          gc.meta_ad_status,
          gc.meta_ad_effective_status,
          gas.configured_status AS adset_configured_status,
          gas.effective_status AS adset_effective_status,
          cd.meta_status AS creative_meta_status,
          ga.configured_status AS ad_configured_status,
          ga.effective_status AS ad_effective_status
        FROM generated_campaigns gc
        JOIN generated_adsets gas ON gas.id = $2::uuid
        JOIN creative_drafts cd ON cd.id = $3::uuid
        JOIN generated_ads ga ON ga.id = $4::uuid
        WHERE gc.id = $1::uuid
      `,
      [generatedCampaignId, generatedAdSetId, creativeDraftId, generatedAdId]
    )
    const statusRow = statusRows[0]
    assert(statusRow.meta_status === 'PAUSED', 'Campaign configured status mismatch')
    assert(statusRow.meta_effective_status === 'PAUSED', 'Campaign effective status mismatch')
    assert(statusRow.meta_objective === 'OUTCOME_AWARENESS', 'Campaign objective mismatch')
    assert(statusRow.meta_adset_status === 'PAUSED', 'AdSet status mismatch on generated_campaigns')
    assert(statusRow.meta_adset_effective_status === 'PAUSED', 'AdSet effective mismatch on generated_campaigns')
    assert(statusRow.meta_ad_status === 'PAUSED', 'Ad status mismatch on generated_campaigns')
    assert(statusRow.meta_ad_effective_status === 'PENDING_REVIEW', 'Ad effective mismatch on generated_campaigns')
    assert(statusRow.adset_configured_status === 'PAUSED', 'generated_adsets configured status mismatch')
    assert(statusRow.adset_effective_status === 'PAUSED', 'generated_adsets effective status mismatch')
    assert(statusRow.creative_meta_status === 'ACTIVE', 'creative_drafts meta status mismatch')
    assert(statusRow.ad_configured_status === 'PAUSED', 'generated_ads configured status mismatch')
    assert(statusRow.ad_effective_status === 'PENDING_REVIEW', 'generated_ads effective status mismatch')

    await client.query('ROLLBACK')

    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          noRealMetaCall: true,
          operationalMarketGenerationId: row.id,
          generatedCampaignId,
          generatedAdSetId,
          creativeDraftId,
          generatedAdId,
          fetched: result.fetched,
          created: result.created,
          persistedAdEffectiveStatus: statusRow.ad_effective_status
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
  console.error(`[validate-operational-status-sync] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
