function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizePositiveInt(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const i = Math.trunc(n)
  return i > 0 ? i : null
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = normalizeNonEmptyString(value)
    if (normalized) return normalized
  }
  return null
}

function readPath(obj, path) {
  let current = obj
  for (const key of path) {
    if (!isPlainObject(current)) return undefined
    current = current[key]
  }
  return current
}

function resolveAdVariants(payload, marketCode) {
  const translationsByMarket = isPlainObject(payload?.translationsByMarket) ? payload.translationsByMarket : {}
  const marketTranslation = isPlainObject(translationsByMarket?.[marketCode]) ? translationsByMarket[marketCode] : null
  const translatedVariants = Array.isArray(marketTranslation?.adVariants) ? marketTranslation.adVariants : []
  if (translatedVariants.length > 0) {
    return {
      source: `translationsByMarket.${marketCode}.adVariants`,
      variants: translatedVariants.filter(isPlainObject)
    }
  }

  const baseVariants = Array.isArray(payload?.adVariants) ? payload.adVariants : []
  return {
    source: 'payload.adVariants',
    variants: baseVariants.filter(isPlainObject)
  }
}

function resolveDestinationUrl({ payload, marketCode, operationalGeneration }) {
  const translationsByMarket = isPlainObject(payload?.translationsByMarket) ? payload.translationsByMarket : {}
  const marketTranslation = isPlainObject(translationsByMarket?.[marketCode]) ? translationsByMarket[marketCode] : null
  const tracking = isPlainObject(operationalGeneration?.targeting_preview?.tracking)
    ? operationalGeneration.targeting_preview.tracking
    : {}

  const url = firstNonEmpty(
    marketTranslation?.destinationUrl,
    marketTranslation?.destination_url,
    payload?.destinationUrl,
    payload?.destination_url,
    readPath(payload, ['creative', 'destinationUrl']),
    readPath(payload, ['creative', 'destination_url'])
  )

  if (!url) return null

  try {
    const parsed = new URL(url)
    if (tracking?.utm_campaign && !parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', String(tracking.utm_campaign))
    }
    if (tracking?.src && !parsed.searchParams.has('src')) {
      parsed.searchParams.set('src', String(tracking.src))
    }
    return parsed.toString()
  } catch {
    return url
  }
}

function resolveTemplatePayload(template) {
  return isPlainObject(template?.payload) ? template.payload : {}
}

function addMissing(missing, key, label) {
  missing.push({ key, label })
}

export function buildOperationalPublishPreview({ operationalGeneration, campaign, template } = {}) {
  const row = operationalGeneration ?? {}
  const campaignConfig = isPlainObject(campaign?.config) ? campaign.config : {}
  const templatePayload = resolveTemplatePayload(template)
  const payloadCampaign = isPlainObject(templatePayload?.campaign) ? templatePayload.campaign : {}
  const payloadAdSet = isPlainObject(templatePayload?.adSet) ? templatePayload.adSet : {}
  const payloadCreative = isPlainObject(templatePayload?.creative) ? templatePayload.creative : {}

  const marketCode = normalizeNonEmptyString(row.market_code)
  const marketParam = firstNonEmpty(row.market_param, row.src, marketCode)
  const campaignName = firstNonEmpty(
    marketParam,
    payloadCampaign?.name,
    campaign?.name,
    template?.name,
    'Operational Market Campaign'
  )

  const metaAdAccountId = firstNonEmpty(
    campaignConfig.metaAdAccountId,
    campaignConfig.meta_ad_account_id,
    payloadCampaign.metaAdAccountId,
    payloadCampaign.meta_ad_account_id,
    templatePayload.metaAdAccountId,
    templatePayload.meta_ad_account_id
  )

  const objective = firstNonEmpty(
    campaign?.objective_meta_value,
    campaignConfig.metaObjective,
    campaignConfig.meta_objective,
    payloadCampaign.metaObjective,
    payloadCampaign.meta_objective,
    payloadCampaign.objective,
    templatePayload.metaObjective,
    templatePayload.meta_objective
  )

  const dailyBudgetCents = normalizePositiveInt(
    payloadAdSet.dailyBudgetCents ??
      payloadAdSet.daily_budget_cents ??
      templatePayload.dailyBudgetCents ??
      templatePayload.daily_budget_cents ??
      campaignConfig.dailyBudgetCents ??
      campaignConfig.daily_budget_cents
  )
  const billingEvent = firstNonEmpty(
    payloadAdSet.billingEvent,
    payloadAdSet.billing_event,
    templatePayload.billingEvent,
    templatePayload.billing_event,
    campaignConfig.billingEvent,
    campaignConfig.billing_event
  )
  const optimizationGoal = firstNonEmpty(
    payloadAdSet.optimizationGoal,
    payloadAdSet.optimization_goal,
    templatePayload.optimizationGoal,
    templatePayload.optimization_goal,
    campaignConfig.optimizationGoal,
    campaignConfig.optimization_goal
  )

  const targetingPreview = isPlainObject(row.targeting_preview) ? row.targeting_preview : {}
  const resolvedCountries = Array.isArray(row.resolved_countries) ? row.resolved_countries : []
  const futureTargeting =
    isPlainObject(targetingPreview?.futurePayloadPreview?.targeting)
      ? targetingPreview.futurePayloadPreview.targeting
      : {
          geo_locations: {
            countries: resolvedCountries
          }
        }

  const pageId = firstNonEmpty(
    campaignConfig.pageId,
    campaignConfig.page_id,
    campaignConfig.metaPageId,
    campaignConfig.meta_page_id,
    payloadCreative.pageId,
    payloadCreative.page_id,
    payloadCreative.metaPageId,
    payloadCreative.meta_page_id,
    templatePayload.pageId,
    templatePayload.page_id,
    templatePayload.metaPageId,
    templatePayload.meta_page_id
  )
  const instagramActorId = firstNonEmpty(
    campaignConfig.instagramActorId,
    campaignConfig.instagram_actor_id,
    campaignConfig.metaInstagramActorId,
    campaignConfig.meta_instagram_actor_id,
    payloadCreative.instagramActorId,
    payloadCreative.instagram_actor_id,
    payloadCreative.metaInstagramActorId,
    payloadCreative.meta_instagram_actor_id
  )

  const adVariants = resolveAdVariants(templatePayload, marketCode)
  const firstVariant = adVariants.variants[0] ?? null
  const destinationUrl = resolveDestinationUrl({ payload: templatePayload, marketCode, operationalGeneration: row })

  const missingRequirements = []
  if (!metaAdAccountId) addMissing(missingRequirements, 'metaAdAccountId', 'metaAdAccountId ausente')
  if (!objective) addMissing(missingRequirements, 'objective', 'objective ausente')
  if (!dailyBudgetCents) addMissing(missingRequirements, 'budget', 'budget ausente')
  if (!billingEvent) addMissing(missingRequirements, 'billingEvent', 'billingEvent ausente')
  if (!optimizationGoal) addMissing(missingRequirements, 'optimizationGoal', 'optimizationGoal ausente')
  if (!pageId) addMissing(missingRequirements, 'pageId', 'pageId ausente')
  if (!destinationUrl) addMissing(missingRequirements, 'destinationUrl', 'destinationUrl ausente')
  if (adVariants.variants.length === 0) {
    addMissing(missingRequirements, 'adVariant', 'adVariant/traducao ausente')
  }
  if (!template?.id) addMissing(missingRequirements, 'template', 'template relacionado ausente')
  addMissing(missingRequirements, 'creativeDraft', 'creativeDraft ausente')

  return {
    publishable: false,
    previewOnly: true,
    metaPublishing: false,
    status: 'PAUSED',
    operationalMarketGeneration: {
      id: row.id ?? null,
      campaignId: row.campaign_id ?? null,
      marketCode,
      marketName: row.market_name ?? null,
      marketParam: row.market_param ?? null,
      utmCampaign: row.utm_campaign ?? null,
      src: row.src ?? null,
      status: row.status ?? null,
      resolvedCountries,
      targetingPreview
    },
    source: {
      campaign: campaign
        ? {
            id: campaign.id,
            name: campaign.name ?? null,
            status: campaign.status ?? null,
            objectiveKey: campaign.objective_key ?? null,
            objectiveMetaValue: campaign.objective_meta_value ?? null,
            config: campaignConfig
          }
        : null,
      template: template
        ? {
            id: template.id,
            name: template.name,
            hasTranslationsByMarket: isPlainObject(templatePayload?.translationsByMarket),
            adVariantSource: adVariants.source,
            adVariantCount: adVariants.variants.length
          }
        : null
    },
    campaignPayloadPreview: {
      metaAdAccountId,
      name: campaignName,
      objective,
      status: 'PAUSED',
      specialAdCategories: [],
      isAdsetBudgetSharingEnabled: false,
      source: {
        operationalMarketGenerationId: row.id ?? null,
        campaignId: row.campaign_id ?? null,
        marketCode,
        marketParam
      }
    },
    adSetPayloadPreview: {
      name: `${campaignName} - AdSet`,
      campaignId: '{{meta_campaign_id}}',
      dailyBudgetCents,
      billingEvent,
      optimizationGoal,
      targeting: futureTargeting,
      status: 'PAUSED',
      source: {
        resolvedCountries,
        targetingPreview,
        previewOnly: true
      }
    },
    creativePayloadPreview: {
      metaAdAccountId,
      pageId,
      instagramActorId,
      name: firstNonEmpty(firstVariant?.headline, `${campaignName} - Creative`),
      message: firstVariant?.primaryText ?? null,
      link: destinationUrl,
      headline: firstVariant?.headline ?? null,
      description: firstVariant?.description ?? null,
      ctaType: firstNonEmpty(payloadCreative.ctaType, payloadCreative.cta_type, templatePayload.ctaType, templatePayload.cta_type),
      source: {
        adVariantSource: adVariants.source,
        adVariantIndex: firstVariant ? 0 : null,
        requiresCreativeDraft: true
      }
    },
    adPayloadPreview: {
      metaAdAccountId,
      name: `${campaignName} - Ad`,
      adsetId: '{{meta_adset_id}}',
      creative: {
        creativeId: '{{meta_creative_id}}'
      },
      status: 'PAUSED',
      source: {
        requiresCreativeDraft: true
      }
    },
    missingRequirements
  }
}
