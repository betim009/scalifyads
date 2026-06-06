import { validateOperationalMarketCode } from './operationalMarkets.js'

const TRANSLATABLE_AD_FIELDS = ['primaryText', 'headline', 'description']

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeMarketCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
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
