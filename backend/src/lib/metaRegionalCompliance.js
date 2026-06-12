function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeIsoCountryCode(value) {
  const code = normalizeNonEmptyString(value)?.toUpperCase()
  return code && /^[A-Z]{2}$/.test(code) ? code : null
}

function normalizeIsoCountryCodes(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  for (const item of value) {
    const code = normalizeIsoCountryCode(item)
    if (code) seen.add(code)
  }
  return [...seen].sort()
}

function normalizeCategory(value) {
  const category = normalizeNonEmptyString(value)?.toUpperCase()
  return category && /^[A-Z0-9_]{3,80}$/.test(category) ? category : null
}

function normalizeCategories(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  for (const item of value) {
    const category = normalizeCategory(item)
    if (category) seen.add(category)
  }
  return [...seen]
}

export function resolveRegionalRegulatedCategories(targeting) {
  const countries = normalizeIsoCountryCodes(targeting?.geo_locations?.countries)
  const categories = []

  if (countries.includes('SG')) categories.push('SINGAPORE_UNIVERSAL')

  return categories
}

export function applyMetaRegionalCompliance(payload = {}, context = {}) {
  const targeting = payload?.targeting && typeof payload.targeting === 'object' && !Array.isArray(payload.targeting)
    ? payload.targeting
    : {}
  const includedCountries = normalizeIsoCountryCodes(targeting?.geo_locations?.countries)
  const removedCountries = normalizeIsoCountryCodes(
    context.removedCountries ??
      context.removedExcludedCountries ??
      context.targetingMetadata?.removedExcludedCountries
  )
  const currentCategories = normalizeCategories(
    payload.regionalRegulatedCategories ??
      payload.regional_regulated_categories
  )
  const resolvedCategories = resolveRegionalRegulatedCategories(targeting)
  const regionalRegulatedCategories = [...new Set([...currentCategories, ...resolvedCategories])]

  const nextPayload = {
    ...payload,
    targeting
  }
  if (regionalRegulatedCategories.length > 0) {
    nextPayload.regionalRegulatedCategories = regionalRegulatedCategories
  }

  const diagnostic = {
    marketCode: normalizeNonEmptyString(context.marketCode) ?? null,
    marketParam: normalizeNonEmptyString(context.marketParam) ?? null,
    includedCountries,
    removedCountries,
    regionalRegulatedCategories,
    appliedRules: resolvedCategories.includes('SINGAPORE_UNIVERSAL')
      ? [
          {
            rule: 'SG_REQUIRES_SINGAPORE_UNIVERSAL',
            country: 'SG',
            category: 'SINGAPORE_UNIVERSAL'
          }
        ]
      : [],
    payloadFinalRelevant: {
      name: normalizeNonEmptyString(payload.name) ?? null,
      status: normalizeNonEmptyString(payload.status) ?? 'PAUSED',
      targeting,
      regional_regulated_categories: regionalRegulatedCategories
    }
  }

  return {
    payload: nextPayload,
    diagnostic,
    regionalRegulatedCategories
  }
}

export function mapMetaRegionalComplianceError(error, context = {}) {
  const details = error?.details && typeof error.details === 'object' ? error.details : null
  const message = normalizeNonEmptyString(details?.message) ?? normalizeNonEmptyString(error?.message)
  const subcode = Number(details?.error_subcode)
  let errorData = details?.error_data
  if (typeof errorData === 'string') {
    try {
      errorData = JSON.parse(errorData)
    } catch {
      errorData = errorData.includes('compliance_section') ? { blame_field_specs: [['compliance_section']] } : null
    }
  }
  const blameSpecs = Array.isArray(errorData?.blame_field_specs) ? errorData.blame_field_specs : []
  const mentionsCompliance = String(message ?? '').toLowerCase().includes('singapura') ||
    String(message ?? '').toLowerCase().includes('singapore') ||
    blameSpecs.some((spec) => Array.isArray(spec) && spec.includes('compliance_section'))

  if (subcode !== 3858550 && !mentionsCompliance) return null

  return {
    type: 'regional_compliance',
    code: details?.code ?? null,
    errorSubcode: Number.isFinite(subcode) ? subcode : details?.error_subcode ?? null,
    blameFieldSpecs: blameSpecs,
    originalMetaError: details,
    operationalMessage:
      'A Meta recusou o AdSet porque o público inclui Singapura e exige uma declaração regional específica. O sistema tentou aplicar SINGAPORE_UNIVERSAL. Se continuar falhando, revise a verificação/transparência da conta Meta.',
    regionalCompliance: context.regionalCompliance ?? null
  }
}
