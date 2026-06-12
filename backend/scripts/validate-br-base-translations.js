import assert from 'node:assert/strict'
import { generateTranslationsByMarket } from '../src/lib/campaignTemplateTranslations.js'
import { CORE_OPERATIONAL_LANGUAGE_LABELS, getOperationalLanguages } from '../src/lib/operationalLanguages.js'

function buildPayload(prefix = 'Base') {
  return {
    adVariants: Array.from({ length: 5 }, (_, index) => ({
      primaryText: `${prefix} texto ${index + 1}`,
      headline: `${prefix} titulo ${index + 1}`,
      description: `${prefix} descricao ${index + 1}`
    }))
  }
}

function createTranslatorSpy() {
  const calls = []
  return {
    calls,
    translateText: async ({ q, target, marketCode, field }) => {
      calls.push({ q, target, marketCode, field })
      return `[${marketCode}:${target}:${field}] ${q}`
    }
  }
}

function assertBaseEntry(payload, expectedPayload) {
  const entry = payload.translationsByMarket.BR
  assert.equal(entry.source, 'base')
  assert.equal(entry.language, 'Português')
  assert.equal(entry.targetLanguage, 'pt')
  assert.deepEqual(entry.adVariants, expectedPayload.adVariants)
}

async function validateScenario(markets, expectedExternalMarkets) {
  const payload = buildPayload()
  const spy = createTranslatorSpy()
  const result = await generateTranslationsByMarket({
    payload,
    markets,
    overwrite: true,
    translateText: spy.translateText
  })

  assert.equal(result.ok, true, result.errors.join(', '))
  assert.deepEqual(result.baseMarkets, ['BR'])
  assertBaseEntry(result.payload, payload)
  assert.deepEqual(result.generated.map((item) => item.marketCode), expectedExternalMarkets)
  assert.equal(spy.calls.length, expectedExternalMarkets.length * 5 * 3)
  assert(spy.calls.every((call) => call.marketCode !== 'BR'), 'BR must never call the translation provider')
  assert(spy.calls.every((call) => call.target !== 'pb' && call.target !== 'pt-BR'), 'Provider target must never be pb or pt-BR')

  return result
}

async function main() {
  const onlyBrPayload = buildPayload()
  const onlyBr = await generateTranslationsByMarket({
    payload: onlyBrPayload,
    markets: ['BR'],
    overwrite: true
  })
  assert.equal(onlyBr.ok, true, onlyBr.errors.join(', '))
  assert.deepEqual(onlyBr.generated, [])
  assert.deepEqual(onlyBr.baseMarkets, ['BR'])
  assertBaseEntry(onlyBr.payload, onlyBrPayload)

  await validateScenario(['BR', 'FRN'], ['FRN'])
  await validateScenario(['BR', 'ESM', 'FRN'], ['ESM', 'FRN'])

  const firstPayload = buildPayload('Antes')
  const firstSpy = createTranslatorSpy()
  const first = await generateTranslationsByMarket({
    payload: firstPayload,
    markets: ['BR', 'ESM', 'FRN'],
    overwrite: true,
    translateText: firstSpy.translateText
  })
  assert.equal(first.ok, true, first.errors.join(', '))

  const editedPayload = {
    ...buildPayload('Depois'),
    translationsByMarket: first.payload.translationsByMarket
  }
  const secondSpy = createTranslatorSpy()
  const regenerated = await generateTranslationsByMarket({
    payload: editedPayload,
    markets: ['BR', 'ESM', 'FRN'],
    overwrite: true,
    translateText: secondSpy.translateText
  })
  assert.equal(regenerated.ok, true, regenerated.errors.join(', '))
  assertBaseEntry(regenerated.payload, editedPayload)
  assert(regenerated.payload.translationsByMarket.ESM.adVariants[0].primaryText.includes('Depois texto 1'))
  assert(regenerated.payload.translationsByMarket.FRN.adVariants[0].primaryText.includes('Depois texto 1'))

  const coreLanguages = getOperationalLanguages().filter((language) => language.isCore)
  assert.equal(CORE_OPERATIONAL_LANGUAGE_LABELS.length, 10)
  assert.equal(coreLanguages.length, 10)
  assert(coreLanguages.every((language) => language.targetLanguage))
  assert(coreLanguages.every((language) => language.targetLanguage !== 'pb' && language.targetLanguage !== 'pt-BR'))
  assert.equal(coreLanguages.find((language) => language.label === 'Português')?.targetLanguage, 'pt')

  const unsupported = await generateTranslationsByMarket({
    payload: buildPayload(),
    markets: ['FRN'],
    overwrite: true,
    translateText: async () => {
      throw new Error('xx is not supported')
    }
  })
  assert.equal(unsupported.ok, false)
  assert(unsupported.errors.every((error) => !error.includes('xx is not supported')))
  assert(unsupported.errors.some((error) => error.includes('FRN') && error.includes('Francês') && error.includes('not supported by the translation service')))

  console.log(JSON.stringify({
    ok: true,
    scenarios: ['BR', 'BR+FRN', 'BR+ESM+FRN', 'regeneration'],
    brProviderCalls: 0,
    portugueseTargetLanguage: 'pt',
    coreLanguageCount: coreLanguages.length,
    unsupportedLanguageMessage: 'friendly'
  }, null, 2))
}

main().catch((err) => {
  console.error(`[validate-br-base-translations] ${err?.stack ?? err}`)
  process.exitCode = 1
})
