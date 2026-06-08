import { initDb, getPool, closeDb } from '../src/db.js'
import { metaFetchCampaign } from '../src/meta/campaigns.js'
import { metaFetchAdSet } from '../src/meta/adsets.js'
import { metaFetchAdCreative } from '../src/meta/creatives.js'
import { metaFetchAd } from '../src/meta/ads.js'
import { syncOperationalMetaStatuses } from '../src/services/operationalMetaStatusSync.js'

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseArg(name) {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  if (found) return normalizeNonEmptyString(found.slice(prefix.length))
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return normalizeNonEmptyString(process.argv[index + 1])
  return null
}

async function main() {
  const id = parseArg('operationalMarketGenerationId') ?? parseArg('id')
  if (!id) {
    throw new Error('Missing --operationalMarketGenerationId')
  }

  const accessToken =
    normalizeNonEmptyString(process.env.META_ACCESS_TOKEN) ??
    normalizeNonEmptyString(process.env.FACEBOOK_ACCESS_TOKEN)
  if (!accessToken) {
    throw new Error('META_ACCESS_TOKEN or FACEBOOK_ACCESS_TOKEN is required')
  }

  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required')
  }

  const result = await syncOperationalMetaStatuses({
    pool: getPool(),
    operationalMarketGenerationId: id,
    accessToken,
    fetchCampaign: metaFetchCampaign,
    fetchAdSet: metaFetchAdSet,
    fetchCreative: metaFetchAdCreative,
    fetchAd: metaFetchAd
  })

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        operationalMarketGenerationId: result.operationalMarketGenerationId,
        generatedCampaignId: result.generatedCampaignId,
        created: result.created,
        fetched: result.fetched,
        statuses: {
          campaign: {
            configured_status: result.persisted?.generatedCampaign?.meta_status ?? null,
            effective_status: result.persisted?.generatedCampaign?.meta_effective_status ?? null
          },
          adSet: {
            configured_status: result.persisted?.generatedAdSet?.configured_status ?? null,
            effective_status: result.persisted?.generatedAdSet?.effective_status ?? null
          },
          creative: {
            meta_status: result.persisted?.creativeDraft?.meta_status ?? null
          },
          ad: {
            configured_status: result.persisted?.generatedAd?.configured_status ?? null,
            effective_status: result.persisted?.generatedAd?.effective_status ?? null
          }
        },
        metaIds: {
          campaign: result.meta?.campaign?.id ?? null,
          adSet: result.meta?.adSet?.id ?? null,
          creative: result.meta?.creative?.id ?? null,
          ad: result.meta?.ad?.id ?? null
        }
      },
      null,
      2
    )
  )
}

main()
  .catch((err) => {
    console.error(`[sync-operational-meta-status] ${err?.message ?? err}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDb()
  })
