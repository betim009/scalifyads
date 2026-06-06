import { normalizeIsoCountryCode, normalizeIsoCountryCodes, normalizeMarketCode } from './marketTargeting.js'
import { getOperationalMarketByCode } from './operationalMarkets.js'
import { resolveMarketMetaLocations } from './metaLocations.js'

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeOptionalObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value
}

export function generateMarketParam(marketCode, niche) {
  const code = normalizeMarketCode(marketCode)
  const normalizedNiche = normalizeNonEmptyString(niche)
  if (!code || !normalizedNiche) return null
  return `${code}-${normalizedNiche}-FB`
}

export function generateOperationalTracking(marketCode, niche) {
  const code = normalizeMarketCode(marketCode)
  const marketParam = generateMarketParam(code, niche)
  if (!code || !marketParam) return null
  return {
    utm_source: 'facebook',
    utm_medium: 'cpa',
    utm_campaign: code,
    src: marketParam
  }
}

export function resolveLegacyCountryCode({ resolvedCountries, availableCountryCodes, requestedCountryCode, usedLegacyCountryCodes } = {}) {
  const availableCodes = normalizeIsoCountryCodes(availableCountryCodes)
  const available = new Set(availableCodes)
  const used = new Set(normalizeIsoCountryCodes(usedLegacyCountryCodes))
  const requested = normalizeIsoCountryCode(requestedCountryCode)
  if (requested) {
    return available.has(requested) && !used.has(requested)
      ? {
          legacyCountryCode: requested,
          reason: 'request_country_code'
        }
      : {
          legacyCountryCode: null,
          reason: 'request_country_code_not_available'
        }
  }

  for (const countryCode of resolvedCountries) {
    if (available.has(countryCode) && !used.has(countryCode)) {
      return {
        legacyCountryCode: countryCode,
        reason: 'first_resolved_country_available_in_legacy_countries'
      }
    }
  }
  if (available.has('BR') && !used.has('BR')) {
    return {
      legacyCountryCode: 'BR',
      reason: 'fallback_br_legacy_compatibility'
    }
  }
  const anyUnused = availableCodes.find((countryCode) => !used.has(countryCode))
  if (anyUnused) {
    return {
      legacyCountryCode: anyUnused,
      reason: 'fallback_any_legacy_country_to_avoid_unique_conflict'
    }
  }
  return {
    legacyCountryCode: null,
    reason: 'no_compatible_country_code_available'
  }
}

export function buildOperationalTargeting({ marketCode, resolvedCountries, targetingPreview, tracking } = {}) {
  return {
    source: 'market_code',
    marketCode: normalizeMarketCode(marketCode),
    resolvedCountries: normalizeIsoCountryCodes(resolvedCountries),
    targetingPreview: normalizeOptionalObject(targetingPreview) ?? {},
    tracking: normalizeOptionalObject(tracking) ?? null,
    publishable: false,
    previewOnly: true
  }
}

export function generateOperationalMarkets({ niche, markets, availableCountryCodes } = {}) {
  const normalizedNiche = normalizeNonEmptyString(niche)
  const errors = []
  if (!normalizedNiche) errors.push('Invalid niche')
  if (!Array.isArray(markets) || markets.length === 0) errors.push('markets must include at least one market')

  const generated = []
  const seenMarketCodes = new Set()
  const seenCompatibilityCountryCodes = new Set()

  for (const item of Array.isArray(markets) ? markets : []) {
    const itemIsCode = typeof item === 'string'
    const marketCode = normalizeMarketCode(itemIsCode ? item : item?.marketCode ?? item?.market_code ?? item?.code)
    if (!marketCode) {
      errors.push('Invalid marketCode')
      continue
    }
    const catalogMarket = getOperationalMarketByCode(marketCode)
    if (!catalogMarket) {
      errors.push(`Unknown operational market: ${marketCode}`)
      continue
    }
    if (seenMarketCodes.has(marketCode)) {
      errors.push(`Duplicate marketCode: ${marketCode}`)
      continue
    }
    seenMarketCodes.add(marketCode)

    const resolvedMarket = resolveMarketMetaLocations(marketCode)
    const resolvedCountries = normalizeIsoCountryCodes(
      itemIsCode
        ? resolvedMarket?.resolvedCountries
        : item?.resolvedCountries ?? item?.resolved_countries ?? resolvedMarket?.resolvedCountries
    )
    if (resolvedCountries.length === 0) {
      errors.push(`resolvedCountries must include at least one ISO-2 country code for ${marketCode}`)
      continue
    }

    const tracking = generateOperationalTracking(marketCode, normalizedNiche)
    if (!tracking) {
      errors.push(`Could not generate tracking for ${marketCode}`)
      continue
    }

    const legacy = resolveLegacyCountryCode({
      resolvedCountries,
      availableCountryCodes,
      requestedCountryCode: item?.legacyCountryCode ?? item?.legacy_country_code ?? item?.countryCode ?? item?.country_code,
      usedLegacyCountryCodes: Array.from(seenCompatibilityCountryCodes)
    })

    if (legacy.legacyCountryCode) {
      seenCompatibilityCountryCodes.add(legacy.legacyCountryCode)
    }

    const inputTargetingPreview =
      normalizeOptionalObject(itemIsCode ? null : item?.targetingPreview ?? item?.targeting_preview) ??
      {
        strategy: resolvedMarket?.strategy ?? null,
        included: catalogMarket.includedLocations ?? [],
        excluded: catalogMarket.excludedLocations ?? [],
        excludedCountryCodes: resolvedMarket?.excludedCountryCodes ?? [],
        publishable: false,
        previewOnly: true
      }
    const operationalTargeting = buildOperationalTargeting({
      marketCode,
      resolvedCountries,
      targetingPreview: inputTargetingPreview,
      tracking
    })
    const targetingPreview = {
      ...inputTargetingPreview,
      operationalTargeting,
      publishable: false,
      previewOnly: true,
      resolvedCountries,
      legacyCountryCode: legacy.legacyCountryCode,
      legacyCountryCodeReason: legacy.reason,
      compatibilityCountryCode: legacy.legacyCountryCode,
      compatibilityCountryCodeReason: legacy.reason,
      tracking
    }

    generated.push({
      marketCode,
      marketName: normalizeNonEmptyString(itemIsCode ? catalogMarket.name : item?.marketName ?? item?.market_name ?? item?.name) ?? catalogMarket.name,
      language: normalizeNonEmptyString(itemIsCode ? catalogMarket.language : item?.language) ?? catalogMarket.language,
      marketParam: tracking.src,
      tracking,
      legacyCountryCode: legacy.legacyCountryCode,
      legacyCountryCodeReason: legacy.reason,
      countryCode: legacy.legacyCountryCode,
      countryCodeReason: legacy.reason,
      resolvedCountries,
      operationalTargeting,
      targetingPreview
    })
  }

  return {
    ok: errors.length === 0,
    errors,
    niche: normalizedNiche,
    markets: generated
  }
}
