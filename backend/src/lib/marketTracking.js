import { normalizeMarketCode } from './marketTargeting.js'

const MARKET_URL_PREFIXES = {
  ARAF: 'AR',
  ENAF: 'EN',
  ESAMNA: 'ES',
  FRAF: 'FR'
}

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

function stripBoundarySlash(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '')
}

export function resolveMarketUrlPrefix(marketCode) {
  const code = normalizeMarketCode(marketCode)
  if (!code) return null
  if (MARKET_URL_PREFIXES[code]) return MARKET_URL_PREFIXES[code]
  return code.length === 2 ? code : code.slice(0, 2)
}

export function generateMarketParam(marketCode, nicheParam) {
  const code = normalizeMarketCode(marketCode)
  const niche = normalizeNonEmptyString(nicheParam)
  if (!code || !niche) return null
  return `${code}-${niche}-FB`
}

export function parseNicheParamFromMarketParam(marketParam, marketCode) {
  const param = normalizeNonEmptyString(marketParam)
  const code = normalizeMarketCode(marketCode)
  if (!param || !code) return null
  const prefix = `${code}-`
  const suffix = '-FB'
  if (!param.startsWith(prefix) || !param.endsWith(suffix)) return null
  return normalizeNonEmptyString(param.slice(prefix.length, -suffix.length))
}

export function buildMarketTracking({ marketCode, nicheParam, destinationUrl } = {}) {
  const code = normalizeMarketCode(marketCode)
  const marketParam = generateMarketParam(code, nicheParam)
  if (!code || !marketParam) return null

  const tracking = {
    utm_source: 'facebook',
    utm_medium: 'cpa',
    utm_campaign: code,
    src: marketParam,
    niche: normalizeNonEmptyString(nicheParam)
  }

  const rawUrl = normalizeNonEmptyString(destinationUrl)
  if (!rawUrl) return { ...tracking, finalUrl: null }

  try {
    const parsed = new URL(rawUrl)
    for (const [key, value] of Object.entries(tracking)) {
      if (value) parsed.searchParams.set(key, value)
    }
    return { ...tracking, finalUrl: parsed.toString() }
  } catch {
    return { ...tracking, finalUrl: rawUrl }
  }
}

export function buildMarketDestinationUrl({
  domain,
  brazilPermalink,
  internationalPermalink,
  marketCode,
  nicheParam,
  destinationUrl
} = {}) {
  const code = normalizeMarketCode(marketCode)
  const normalizedDomain = normalizeNonEmptyString(domain)
  const brPath = stripBoundarySlash(normalizeNonEmptyString(brazilPermalink))
  const internationalPath = stripBoundarySlash(normalizeNonEmptyString(internationalPermalink))
  const legacyUrl = normalizeNonEmptyString(destinationUrl)

  let baseUrl = legacyUrl
  if (normalizedDomain && code === 'BR' && brPath) {
    baseUrl = `${stripTrailingSlash(normalizedDomain)}/${brPath}`
  } else if (normalizedDomain && code && code !== 'BR' && internationalPath) {
    baseUrl = `${stripTrailingSlash(normalizedDomain)}/${resolveMarketUrlPrefix(code)}/${internationalPath}`
  }

  const tracking = buildMarketTracking({ marketCode: code, nicheParam, destinationUrl: baseUrl })
  return tracking?.finalUrl ?? baseUrl ?? null
}
