import assert from 'node:assert/strict'

const AD_KEYS = ['A', 'B', 'C', 'D', 'E']

function adNumber(key) {
  return AD_KEYS.indexOf(key) + 1
}

function completeSlots(template) {
  return AD_KEYS.map((variantKey, index) => {
    const variant = template.variants[index] ?? {}
    const media = template.media[index] ?? null
    const missing = [
      !variant.primaryText ? 'primaryText' : '',
      !variant.headline ? 'headline' : '',
      !variant.description ? 'description' : '',
      !media ? 'media' : ''
    ].filter(Boolean)
    return {
      adNumber: adNumber(variantKey),
      variantKey,
      complete: missing.length === 0,
      missing
    }
  })
}

function summarize(markets, template) {
  const rows = markets.map((marketCode) => {
    const slots = completeSlots(template)
    const completed = slots.filter((slot) => slot.complete)
    return {
      marketCode,
      campaignId: `campaign-${marketCode}`,
      adSetId: `adset-${marketCode}`,
      creativeId: completed[0] ? `creative-${marketCode}-${completed[0].variantKey}` : null,
      adId: completed[0] ? `ad-${marketCode}-${completed[0].variantKey}` : null,
      creatives: completed.map((slot) => ({
        adNumber: slot.adNumber,
        variantKey: slot.variantKey,
        creativeId: `creative-${marketCode}-${slot.variantKey}`,
        status: 'PAUSED'
      })),
      ads: completed.map((slot) => ({
        adNumber: slot.adNumber,
        variantKey: slot.variantKey,
        adId: `ad-${marketCode}-${slot.variantKey}`,
        status: 'PAUSED'
      })),
      skippedAds: slots
        .filter((slot) => !slot.complete)
        .map((slot) => ({
          adNumber: slot.adNumber,
          variantKey: slot.variantKey,
          status: 'incompleto',
          missing: slot.missing
        }))
    }
  })

  return {
    processedMarkets: rows.length,
    campaigns: rows.length,
    adSets: rows.length,
    creatives: rows.reduce((sum, row) => sum + row.creatives.length, 0),
    ads: rows.reduce((sum, row) => sum + row.ads.length, 0),
    rows
  }
}

const fullTemplate = {
  variants: AD_KEYS.map((key) => ({
    primaryText: `Texto ${key}`,
    headline: `Titulo ${key}`,
    description: `Descricao ${key}`
  })),
  media: AD_KEYS.map((key) => `videoXX${adNumber(key)}.mp4`)
}

const brFull = summarize(['BR'], fullTemplate)
assert.equal(brFull.campaigns, 1)
assert.equal(brFull.adSets, 1)
assert.equal(brFull.creatives, 5)
assert.equal(brFull.ads, 5)
assert.deepEqual(brFull.rows[0].creatives.map((item) => item.variantKey), AD_KEYS)
assert.equal(brFull.rows[0].creativeId, 'creative-BR-A')
assert.equal(brFull.rows[0].adId, 'ad-BR-A')

const twoMarketsFull = summarize(['BR', 'DE'], fullTemplate)
assert.equal(twoMarketsFull.campaigns, 2)
assert.equal(twoMarketsFull.adSets, 2)
assert.equal(twoMarketsFull.creatives, 10)
assert.equal(twoMarketsFull.ads, 10)

const legacyTemplate = {
  variants: [fullTemplate.variants[0]],
  media: [fullTemplate.media[0]]
}
const legacy = summarize(['BR'], legacyTemplate)
assert.equal(legacy.creatives, 1)
assert.equal(legacy.ads, 1)
assert.equal(legacy.rows[0].skippedAds.length, 4)

const incompleteTemplate = {
  variants: fullTemplate.variants.map((variant, index) => (index === 2 ? { ...variant, headline: '' } : variant)),
  media: fullTemplate.media
}
const incomplete = summarize(['BR'], incompleteTemplate)
assert.equal(incomplete.creatives, 4)
assert.equal(incomplete.ads, 4)
assert.equal(incomplete.rows[0].skippedAds.length, 1)
assert.equal(incomplete.rows[0].skippedAds[0].variantKey, 'C')
assert(incomplete.rows[0].skippedAds[0].missing.includes('headline'))

console.log('validate-operational-publish-multiple-ads: OK')
