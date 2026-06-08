import { generateOperationalMarkets } from '../src/lib/operationalMarketGeneration.js'
import {
  buildOperationalMarketTargeting,
  buildOperationalMarketTargetingPreview
} from '../src/lib/marketTargeting.js'
import { META_LOCATION_CATALOG } from '../src/lib/metaLocations.js'

const sampleMarkets = ['ARM', 'AREU', 'ENCA']

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function countDuplicates(values) {
  const seen = new Set()
  let count = 0
  for (const value of values) {
    if (seen.has(value)) count += 1
    seen.add(value)
  }
  return count
}

function validateMarket(market, expected) {
  const targeting = buildOperationalMarketTargeting({
    marketCode: market.marketCode,
    resolvedCountries: market.resolvedCountries,
    excludedCountryCodes: market.targetingPreview?.excludedCountryCodes,
    targetingPreview: market.targetingPreview
  })

  assert(targeting.ok, `${market.marketCode} targeting should be valid: ${targeting.errors.join(', ')}`)
  assert(targeting.publishable === false, `${market.marketCode} targeting should remain non-publishable`)
  assert(targeting.previewOnly === true, `${market.marketCode} targeting should remain preview-only`)
  assert(targeting.targeting?.geo_locations, `${market.marketCode} geo_locations missing`)

  const countries = targeting.targeting.geo_locations.countries
  const excluded = targeting.targeting.geo_locations.excluded_countries ?? []
  assert(Array.isArray(countries), `${market.marketCode} countries should be an array`)
  assert(countries.length === expected.countryCount, `${market.marketCode} expected ${expected.countryCount} countries, got ${countries.length}`)
  assert(countDuplicates(countries) === 0, `${market.marketCode} countries should not contain duplicates`)
  assert(countries.every((code) => /^[A-Z]{2}$/.test(code)), `${market.marketCode} countries should be ISO-2`)
  assert(excluded.length === expected.excludedCount, `${market.marketCode} expected ${expected.excludedCount} exclusions, got ${excluded.length}`)
  assert(excluded.every((code) => !countries.includes(code)), `${market.marketCode} excluded countries should not remain in countries`)

  for (const requiredCountry of expected.includes ?? []) {
    assert(countries.includes(requiredCountry), `${market.marketCode} should include ${requiredCountry}`)
  }
  for (const excludedCountry of expected.excludes ?? []) {
    assert(excluded.includes(excludedCountry), `${market.marketCode} should expose excluded country ${excludedCountry}`)
    assert(!countries.includes(excludedCountry), `${market.marketCode} should not include excluded country ${excludedCountry}`)
  }

  const preview = buildOperationalMarketTargetingPreview({
    marketCode: market.marketCode,
    resolvedCountries: market.resolvedCountries,
    excludedCountryCodes: market.targetingPreview?.excludedCountryCodes,
    targetingPreview: market.targetingPreview
  })
  assert(preview.ok, `${market.marketCode} preview should be ok`)
  assert(preview.finalPayloadPreview?.targeting?.geo_locations?.countries?.length === expected.countryCount, `${market.marketCode} preview country count mismatch`)

  return {
    marketCode: market.marketCode,
    marketName: market.marketName,
    countryCount: countries.length,
    excludedCount: excluded.length,
    targeting: targeting.targeting,
    preview: preview.finalPayloadPreview,
    publishable: targeting.publishable,
    previewOnly: targeting.previewOnly
  }
}

async function main() {
  const availableCountryCodes = [
    ...new Set(
      META_LOCATION_CATALOG
        .filter((location) => location.type === 'country' && location.countryCode)
        .map((location) => location.countryCode)
    )
  ].sort()

  const generated = generateOperationalMarkets({
    niche: 'PlantasBTN',
    markets: sampleMarkets,
    availableCountryCodes
  })
  assert(generated.ok, `Invalid operational markets input: ${generated.errors.join(', ')}`)

  const byCode = new Map(generated.markets.map((market) => [market.marketCode, market]))
  const results = [
    validateMarket(byCode.get('ARM'), { countryCount: 82, excludedCount: 1, includes: ['AE', 'US'], excludes: ['TW'] }),
    validateMarket(byCode.get('AREU'), { countryCount: 33, excludedCount: 5, includes: ['AT', 'FR'], excludes: ['AL', 'BA', 'ME', 'MK', 'XK'] }),
    validateMarket(byCode.get('ENCA'), { countryCount: 1, excludedCount: 0, includes: ['CA'] })
  ]

  const invalid = buildOperationalMarketTargeting({
    marketCode: 'ARM',
    resolvedCountries: ['CA', 'invalid', 'CA'],
    excludedCountryCodes: ['CA']
  })
  assert(invalid.ok === false, 'Targeting should fail when all valid countries are excluded')
  assert(invalid.errors.includes('targeting countries must include at least one country after exclusions'), 'Expected empty-after-exclusion error')
  assert(invalid.resolvedCountries.length === 1, 'Invalid/duplicate country codes should be normalized away')

  console.log(
    JSON.stringify(
      {
        ok: true,
        noMetaCall: true,
        noAdSetCreated: true,
        markets: results,
        invalidCase: {
          ok: invalid.ok,
          errors: invalid.errors,
          normalizedResolvedCountries: invalid.resolvedCountries,
          removedExcludedCountries: invalid.removedExcludedCountries
        }
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(`[validate-operational-targeting-adapter] ${err?.message ?? err}`)
  process.exitCode = 1
})
