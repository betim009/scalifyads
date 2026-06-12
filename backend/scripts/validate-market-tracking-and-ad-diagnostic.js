import { buildMarketTracking } from '../src/lib/marketTracking.js'
import { generateOperationalMarkets } from '../src/lib/operationalMarketGeneration.js'
import { buildOperationalPublishPreview } from '../src/lib/operationalPublishPreview.js'
import { buildMetaObjectDiagnostic } from '../src/routes/meta.js'

const REQUIRED_MARKETS = ['ARM', 'AREU', 'BR', 'ENCA', 'ENAU', 'BREU', 'BREUA', 'ARIS', 'AROM', 'ARKU']
const NICHE = 'CopaDoMundoBTN'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertNoUtmAlert(diagnostic, label) {
  const hasUtmAlert = diagnostic.alerts.some((alert) => String(alert?.message ?? '').includes('UTM'))
  assert(!hasUtmAlert, `${label} should not alert UTM`)
}

function assertHasUtmAlert(diagnostic, label) {
  const hasUtmAlert = diagnostic.alerts.some((alert) => String(alert?.message ?? '').includes('UTM'))
  assert(hasUtmAlert, `${label} should alert UTM`)
}

function assertTracking(url, marketCode, label) {
  const parsed = new URL(url)
  assert(parsed.searchParams.get('utm_source') === 'facebook', `${label} utm_source mismatch`)
  assert(parsed.searchParams.get('utm_medium') === 'cpa', `${label} utm_medium mismatch`)
  assert(parsed.searchParams.get('utm_campaign') === marketCode, `${label} utm_campaign mismatch`)
  assert(parsed.searchParams.get('src') === `${marketCode}-${NICHE}-FB`, `${label} src mismatch`)
  assert(parsed.searchParams.get('utm_campaign') !== 'ARM' || marketCode === 'ARM', `${label} inherited ARM utm_campaign`)
  assert(parsed.searchParams.get('src') !== 'ARM-CopaDoMundoBTN-FB' || marketCode === 'ARM', `${label} inherited ARM src`)
}

function buildCreative({ id = 'creative-1', link }) {
  return {
    id,
    name: `Creative ${id}`,
    object_story_spec: {
      page_id: '123',
      link_data: {
        link,
        image_hash: 'image-hash',
        call_to_action: {
          type: 'LEARN_MORE',
          value: { link }
        }
      }
    },
    thumbnail_url: 'https://example.com/thumb.jpg'
  }
}

const generated = generateOperationalMarkets({
  niche: NICHE,
  markets: REQUIRED_MARKETS,
  availableCountryCodes: ['AR', 'AU', 'BR', 'CA', 'IL', 'KW', 'PT', 'US']
})
assert(generated.ok, `Operational tracking generation failed: ${generated.errors.join(', ')}`)

const seenFinalUrls = new Map()
for (const marketCode of REQUIRED_MARKETS) {
  const baseUrl = `https://example.com/${marketCode.toLowerCase()}?utm_campaign=ARM&src=ARM-${NICHE}-FB&keep=1`
  const tracking = buildMarketTracking({ marketCode, nicheParam: NICHE, destinationUrl: baseUrl })
  assert(tracking, `${marketCode} tracking should be generated`)
  assert(tracking.utm_campaign === marketCode, `${marketCode} tracking utm_campaign mismatch`)
  assert(tracking.src === `${marketCode}-${NICHE}-FB`, `${marketCode} tracking src mismatch`)
  assert(tracking.finalUrl, `${marketCode} finalUrl missing`)
  assertTracking(tracking.finalUrl, marketCode, `${marketCode} helper finalUrl`)
  assert(new URL(tracking.finalUrl).searchParams.get('keep') === '1', `${marketCode} unrelated params should be preserved`)
  seenFinalUrls.set(marketCode, tracking.finalUrl)
}

for (const market of generated.markets) {
  assert(REQUIRED_MARKETS.includes(market.marketCode), `${market.marketCode} unexpected market generated`)
  assert(market.tracking.utm_campaign === market.marketCode, `${market.marketCode} generated utm_campaign mismatch`)
  assert(market.tracking.src === `${market.marketCode}-${NICHE}-FB`, `${market.marketCode} generated src mismatch`)

  const preview = buildOperationalPublishPreview({
    operationalGeneration: {
      id: '00000000-0000-0000-0000-000000000000',
      campaign_id: '00000000-0000-0000-0000-000000000001',
      market_code: market.marketCode,
      market_name: market.marketName,
      market_param: market.marketParam,
      resolved_countries: market.resolvedCountries,
      targeting_preview: market.targetingPreview,
      utm_campaign: 'ARM',
      src: `ARM-${NICHE}-FB`,
      status: 'PAUSED'
    },
    campaign: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'P45 Preview',
      status: 'draft',
      objective_key: null,
      objective_meta_value: 'OUTCOME_TRAFFIC',
      config: {
        metaAdAccountId: 'act_123',
        pageId: '123'
      }
    },
    template: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'P45 Template',
      payload: {
        niche: NICHE,
        dailyBudgetCents: 1000,
        billingEvent: 'IMPRESSIONS',
        optimizationGoal: 'LINK_CLICKS',
        destinationUrl: `https://example.com/${market.marketCode.toLowerCase()}?utm_campaign=ARM&src=ARM-${NICHE}-FB`,
        adVariants: [{ primaryText: 'Text', headline: 'Headline' }]
      }
    }
  })
  assert(preview.status === 'PAUSED', `${market.marketCode} preview should remain PAUSED`)
  assertTracking(preview.creativePayloadPreview.link, market.marketCode, `${market.marketCode} preview finalUrl`)
}

const enauUrl = seenFinalUrls.get('ENAU')
assertTracking(enauUrl, 'ENAU', 'ENAU finalUrl')

const campaignDiagnostic = buildMetaObjectDiagnostic({
  type: 'campaign',
  id: 'campaign-1',
  object: { id: 'campaign-1', name: 'Campaign', status: 'PAUSED', effective_status: 'PAUSED' }
})
assertNoUtmAlert(campaignDiagnostic, 'Campaign diagnostic')

const adSetDiagnostic = buildMetaObjectDiagnostic({
  type: 'adset',
  id: 'adset-1',
  object: {
    id: 'adset-1',
    name: 'AdSet',
    status: 'PAUSED',
    effective_status: 'PAUSED',
    targeting: { geo_locations: { countries: ['BR'] } }
  }
})
assertNoUtmAlert(adSetDiagnostic, 'AdSet diagnostic')

const creativeWithTracking = buildCreative({ link: seenFinalUrls.get('BR') })
const creativeDiagnostic = buildMetaObjectDiagnostic({
  type: 'creative',
  id: creativeWithTracking.id,
  object: creativeWithTracking
})
assertNoUtmAlert(creativeDiagnostic, 'Creative diagnostic with tracking')
assert(creativeDiagnostic.summary.finalUrl === seenFinalUrls.get('BR'), 'Creative finalUrl should come from object_story_spec')

const creativeWithoutTracking = buildCreative({ id: 'creative-no-utm', link: 'https://example.com/no-utm' })
const creativeMissingDiagnostic = buildMetaObjectDiagnostic({
  type: 'creative',
  id: creativeWithoutTracking.id,
  object: creativeWithoutTracking
})
assertHasUtmAlert(creativeMissingDiagnostic, 'Creative diagnostic without tracking')

const adDiagnostic = buildMetaObjectDiagnostic({
  type: 'ad',
  id: 'ad-1',
  object: {
    id: 'ad-1',
    name: 'Ad',
    status: 'PAUSED',
    effective_status: 'PAUSED',
    creative: { id: creativeWithTracking.id },
    preview_shareable_link: 'https://fb.example/preview-without-final-url'
  },
  linkedCreative: creativeWithTracking
})
assertNoUtmAlert(adDiagnostic, 'Ad diagnostic with linked creative tracking')
assert(adDiagnostic.summary.previewShareableLink === 'https://fb.example/preview-without-final-url', 'Ad preview link should be preserved as preview only')
assert(adDiagnostic.summary.finalUrl === seenFinalUrls.get('BR'), 'Ad finalUrl should come from linked Creative')
assert(adDiagnostic.summary.finalUrl !== adDiagnostic.summary.previewShareableLink, 'Ad preview_shareable_link must not be finalUrl')
assert(adDiagnostic.summary.linkedCreative?.objectStorySpec, 'Ad diagnostic should include linked creative object_story_spec')
assert(adDiagnostic.summary.linkedCreative?.cta?.type === 'LEARN_MORE', 'Ad diagnostic should include linked creative CTA')
assert(adDiagnostic.summary.media.detected === true, 'Ad diagnostic should enrich media from linked creative')

const adMissingDiagnostic = buildMetaObjectDiagnostic({
  type: 'ad',
  id: 'ad-2',
  object: {
    id: 'ad-2',
    name: 'Ad missing tracking',
    status: 'PAUSED',
    effective_status: 'PAUSED',
    creative: { id: creativeWithoutTracking.id },
    preview_shareable_link: seenFinalUrls.get('ENAU')
  },
  linkedCreative: creativeWithoutTracking
})
assertHasUtmAlert(adMissingDiagnostic, 'Ad diagnostic without linked creative tracking')
assert(adMissingDiagnostic.summary.finalUrl === 'https://example.com/no-utm', 'Ad missing finalUrl should still come from linked Creative')

const adWithoutCreativeDiagnostic = buildMetaObjectDiagnostic({
  type: 'ad',
  id: 'ad-3',
  object: {
    id: 'ad-3',
    name: 'Ad without creative',
    status: 'PAUSED',
    effective_status: 'PAUSED',
    preview_shareable_link: seenFinalUrls.get('ENAU')
  }
})
assertNoUtmAlert(adWithoutCreativeDiagnostic, 'Ad diagnostic without linked creative')
assert(
  adWithoutCreativeDiagnostic.alerts.some((alert) => String(alert?.message ?? '').includes('criativo vinculado')),
  'Ad without creative should alert missing linked creative'
)

console.log(
  JSON.stringify(
    {
      ok: true,
      noRealMetaCall: true,
      status: 'PAUSED',
      markets: REQUIRED_MARKETS.map((marketCode) => ({
        marketCode,
        finalUrl: seenFinalUrls.get(marketCode)
      })),
      enauDoesNotInheritArm: new URL(enauUrl).searchParams.get('utm_campaign') === 'ENAU',
      diagnostic: {
        campaignNoUtmAlert: true,
        adSetNoUtmAlert: true,
        creativeValidatesUtm: true,
        adUsesLinkedCreativeFinalUrl: true,
        previewShareableLinkIsPreviewOnly: true
      }
    },
    null,
    2
  )
)
