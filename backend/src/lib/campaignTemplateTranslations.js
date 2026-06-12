import { getOperationalMarketByCode, getOperationalMarketLanguageGroup, validateOperationalMarketCode } from './operationalMarkets.js'
import { getOperationalLanguageByLabel } from './operationalLanguages.js'

const TRANSLATABLE_AD_FIELDS = ['primaryText', 'headline', 'description']
const BASE_MARKET_CODES = new Set(['BR'])

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeMarketCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeMarkets(markets) {
  return [...new Set((Array.isArray(markets) ? markets : []).map(normalizeMarketCode).filter(Boolean))]
}

function normalizeAdVariants(adVariants) {
  return Array.isArray(adVariants)
    ? adVariants.map((variant) => (isPlainObject(variant) ? variant : {}))
    : []
}

export function resolveMarketTranslationLanguage(marketCode) {
  const code = normalizeMarketCode(marketCode)
  const market = getOperationalMarketByCode(code)
  if (!market) return null
  const language = normalizeNonEmptyString(getOperationalMarketLanguageGroup(market))
  const operationalLanguage = getOperationalLanguageByLabel(language)
  const targetLanguage = operationalLanguage?.targetLanguage || null
  return {
    marketCode: market.code,
    marketName: market.name,
    language: operationalLanguage?.label || language,
    targetLanguage,
    usesBaseText: BASE_MARKET_CODES.has(market.code)
  }
}

export function validateTranslationsByMarket(translationsByMarket) {
  const errors = []

  if (translationsByMarket === undefined || translationsByMarket === null) {
    return { ok: true, errors }
  }

  if (!isPlainObject(translationsByMarket)) {
    return { ok: false, errors: ['translationsByMarket must be an object'] }
  }

  for (const [rawMarketCode, marketValue] of Object.entries(translationsByMarket)) {
    const marketCode = normalizeMarketCode(rawMarketCode)
    if (!marketCode || !validateOperationalMarketCode(marketCode)) {
      errors.push(`translationsByMarket.${rawMarketCode} must be a valid marketCode`)
      continue
    }

    if (!isPlainObject(marketValue)) {
      errors.push(`translationsByMarket.${marketCode} must be an object`)
      continue
    }

    if (marketValue.adVariants !== undefined) {
      if (!Array.isArray(marketValue.adVariants)) {
        errors.push(`translationsByMarket.${marketCode}.adVariants must be an array`)
        continue
      }

      marketValue.adVariants.forEach((variant, index) => {
        if (!isPlainObject(variant)) {
          errors.push(`translationsByMarket.${marketCode}.adVariants.${index} must be an object`)
          return
        }

        for (const field of TRANSLATABLE_AD_FIELDS) {
          if (variant[field] !== undefined && typeof variant[field] !== 'string') {
            errors.push(`translationsByMarket.${marketCode}.adVariants.${index}.${field} must be a string`)
          }
        }
      })
    }
  }

  return { ok: errors.length === 0, errors }
}

export function validateCampaignTemplatePayload(payload) {
  if (payload === undefined || payload === null) return { ok: true, errors: [] }
  if (!isPlainObject(payload)) return { ok: false, errors: ['payload must be an object'] }
  return validateTranslationsByMarket(payload.translationsByMarket)
}

export async function generateTranslationsByMarket({ payload, markets, overwrite = false, translateText } = {}) {
  const errors = []
  if (!isPlainObject(payload)) errors.push('payload must be an object')

  const marketCodes = normalizeMarkets(markets)
  if (marketCodes.length === 0) errors.push('markets must include at least one marketCode')

  const adVariants = normalizeAdVariants(payload?.adVariants)
  if (adVariants.length === 0) errors.push('payload.adVariants must include at least one ad variant')

  const marketLanguages = []
  for (const marketCode of marketCodes) {
    const resolved = resolveMarketTranslationLanguage(marketCode)
    if (!resolved) {
      errors.push(`Invalid marketCode: ${marketCode}`)
      continue
    }
    if (!resolved.usesBaseText && !resolved.targetLanguage) {
      errors.push(`Unsupported translation language for ${marketCode}: ${resolved.language ?? 'unknown'}`)
      continue
    }
    marketLanguages.push(resolved)
  }

  if (marketLanguages.some((market) => !market.usesBaseText) && typeof translateText !== 'function') {
    errors.push('translateText must be a function when a selected market requires external translation')
  }

  if (errors.length > 0) {
    return { ok: false, errors, payload: payload ?? null, generated: [], preserved: [], baseMarkets: [] }
  }

  const currentTranslations = isPlainObject(payload.translationsByMarket) ? payload.translationsByMarket : {}
  const nextTranslationsByMarket = { ...currentTranslations }
  const generated = []
  const preserved = []
  const baseMarkets = []

  for (const market of marketLanguages) {
    if (market.usesBaseText) {
      nextTranslationsByMarket[market.marketCode] = {
        source: 'base',
        language: market.language,
        targetLanguage: market.targetLanguage,
        adVariants: adVariants.map((variant) => {
          const baseVariant = {}
          for (const field of TRANSLATABLE_AD_FIELDS) {
            if (variant[field] !== undefined) baseVariant[field] = variant[field]
          }
          return baseVariant
        })
      }
      baseMarkets.push(market.marketCode)
      continue
    }

    if (!overwrite && isPlainObject(currentTranslations[market.marketCode])) {
      preserved.push(market.marketCode)
      continue
    }

    const translatedVariants = []
    for (const variant of adVariants) {
      const translatedVariant = {}
      for (const field of TRANSLATABLE_AD_FIELDS) {
        if (variant[field] === undefined) continue
        if (typeof variant[field] !== 'string') {
          errors.push(`payload.adVariants.${translatedVariants.length}.${field} must be a string`)
          continue
        }
        if (!variant[field].trim()) {
          translatedVariant[field] = ''
          continue
        }
        try {
          translatedVariant[field] = await translateText({
            q: variant[field],
            source: 'auto',
            target: market.targetLanguage,
            marketCode: market.marketCode,
            field
          })
        } catch (err) {
          const providerMessage = String(err?.message ?? err)
          const friendlyReason = /not supported|unsupported/i.test(providerMessage)
            ? `target language "${market.targetLanguage}" is not supported by the translation service`
            : providerMessage
          errors.push(
            `Translation failed for ${market.marketCode} (${market.language}/${market.targetLanguage}) adVariants.${translatedVariants.length}.${field}: ${friendlyReason}`
          )
          translatedVariant[field] = ''
        }
      }
      translatedVariants.push(translatedVariant)
    }

    nextTranslationsByMarket[market.marketCode] = {
      language: market.language,
      targetLanguage: market.targetLanguage,
      adVariants: translatedVariants
    }
    generated.push({
      marketCode: market.marketCode,
      marketName: market.marketName,
      language: market.language,
      targetLanguage: market.targetLanguage,
      adVariantCount: translatedVariants.length
    })
  }

  if (errors.length > 0) {
    return { ok: false, errors, payload, generated, preserved, baseMarkets }
  }

  const nextPayload = {
    ...payload,
    translationsByMarket: nextTranslationsByMarket
  }
  const validation = validateCampaignTemplatePayload(nextPayload)
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, payload, generated, preserved, baseMarkets }
  }

  return {
    ok: true,
    errors: [],
    payload: nextPayload,
    generated,
    preserved,
    baseMarkets
  }
}
