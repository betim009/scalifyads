import { normalizeMarketCode } from './marketTargeting.js'

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
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
    src: marketParam
  }

  const rawUrl = normalizeNonEmptyString(destinationUrl)
  if (!rawUrl) return { ...tracking, finalUrl: null }

  try {
    const parsed = new URL(rawUrl)
    for (const [key, value] of Object.entries(tracking)) {
      parsed.searchParams.set(key, value)
    }
    return { ...tracking, finalUrl: parsed.toString() }
  } catch {
    return { ...tracking, finalUrl: rawUrl }
  }
}
