function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeOptionalObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value
}

export function normalizeMarketCode(value) {
  const raw = normalizeNonEmptyString(value)
  if (!raw) return null
  const code = raw.toUpperCase()
  if (!/^[A-Z0-9]{2,12}$/.test(code)) return null
  return code
}

export function normalizeIsoCountryCode(value) {
  const raw = normalizeNonEmptyString(value)
  if (!raw) return null
  const code = raw.toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  return code
}

export function normalizeIsoCountryCodes(value, { max = 250 } = {}) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  for (const item of value) {
    const code = normalizeIsoCountryCode(item)
    if (!code) continue
    seen.add(code)
    if (seen.size >= max) break
  }
  return [...seen].sort()
}

export function resolveMarketTargetingInput({ marketCode, resolvedCountries, excludedCountries } = {}) {
  const code = normalizeMarketCode(marketCode)
  const countries = normalizeIsoCountryCodes(resolvedCountries)
  const excluded = normalizeIsoCountryCodes(excludedCountries)
  const errors = []

  if (!code) errors.push('Invalid marketCode')
  if (countries.length === 0) errors.push('resolvedCountries must include at least one ISO-2 country code')

  return {
    ok: errors.length === 0,
    errors,
    marketCode: code,
    resolvedCountries: countries,
    excludedCountries: excluded
  }
}

export function buildOperationalMarketTargeting({ marketCode, resolvedCountries, excludedCountryCodes, targetingPreview } = {}) {
  const code = normalizeMarketCode(marketCode)
  const preview = normalizeOptionalObject(targetingPreview) ?? {}
  const previewOperationalTargeting = normalizeOptionalObject(preview.operationalTargeting) ?? {}
  const countries = normalizeIsoCountryCodes(
    resolvedCountries ??
      preview.resolvedCountries ??
      preview.resolved_countries ??
      previewOperationalTargeting.resolvedCountries ??
      previewOperationalTargeting.resolved_countries
  )
  const excluded = normalizeIsoCountryCodes(
    excludedCountryCodes ??
      preview.excludedCountryCodes ??
      preview.excluded_country_codes ??
      preview.excludedCountries ??
      preview.excluded_countries
  )

  const excludedSet = new Set(excluded)
  const finalCountries = countries.filter((countryCode) => !excludedSet.has(countryCode))
  const errors = []

  if (!code) errors.push('Invalid marketCode')
  if (countries.length === 0) errors.push('resolvedCountries must include at least one ISO-2 country code')
  if (finalCountries.length === 0) errors.push('targeting countries must include at least one country after exclusions')

  const geoLocations = {
    countries: finalCountries
  }
  if (excluded.length > 0) {
    geoLocations.excluded_countries = excluded
  }

  return {
    ok: errors.length === 0,
    errors,
    marketCode: code,
    resolvedCountries: countries,
    excludedCountryCodes: excluded,
    removedExcludedCountries: countries.filter((countryCode) => excludedSet.has(countryCode)),
    targeting: {
      geo_locations: geoLocations
    },
    publishable: false,
    previewOnly: true,
    source: 'operational_market_targeting'
  }
}

export function buildOperationalMarketTargetingPreview(input = {}) {
  const result = buildOperationalMarketTargeting(input)
  return {
    ok: result.ok,
    errors: result.errors,
    marketCode: result.marketCode,
    resolvedCountries: result.resolvedCountries,
    excludedCountryCodes: result.excludedCountryCodes,
    removedExcludedCountries: result.removedExcludedCountries,
    finalPayloadPreview: result.ok ? { targeting: result.targeting } : null,
    publishable: false,
    previewOnly: true,
    reason: 'P53B operational targeting adapter preview only; real Meta AdSet creation still uses legacy countryCode path.'
  }
}

export function buildMarketTargetingTechnicalPreview(input = {}) {
  const resolved = resolveMarketTargetingInput(input)
  const futureGeoLocations = resolved.ok
    ? {
        countries: resolved.resolvedCountries
      }
    : null

  return {
    ok: resolved.ok,
    errors: resolved.errors,
    marketCode: resolved.marketCode,
    resolvedCountries: resolved.resolvedCountries,
    excludedCountries: resolved.excludedCountries,
    futurePayloadPreview: futureGeoLocations
      ? {
          targeting: {
            geo_locations: futureGeoLocations
          }
        }
      : null,
    publishable: false,
    previewOnly: true,
    reason: 'P35 prepares market targeting input only; real Meta AdSet creation still uses countryCode.'
  }
}

export function normalizeMarketPersistenceInput(input = {}) {
  const marketCode = normalizeMarketCode(input?.marketCode ?? input?.market_code)
  const errors = []

  if (!marketCode) {
    return {
      ok: true,
      hasMarketData: false,
      errors,
      marketCode: null,
      marketName: null,
      marketParam: null,
      resolvedCountries: null,
      targetingPreview: null
    }
  }

  const resolvedCountries = normalizeIsoCountryCodes(input?.resolvedCountries ?? input?.resolved_countries)
  if (resolvedCountries.length === 0) {
    errors.push('resolvedCountries must include at least one ISO-2 country code when marketCode is provided')
  }

  return {
    ok: errors.length === 0,
    hasMarketData: true,
    errors,
    marketCode,
    marketName: normalizeNonEmptyString(input?.marketName ?? input?.market_name),
    marketParam: normalizeNonEmptyString(input?.marketParam ?? input?.market_param),
    resolvedCountries,
    targetingPreview: normalizeOptionalObject(input?.targetingPreview ?? input?.targeting_preview)
  }
}
