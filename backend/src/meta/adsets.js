function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function metaCreateAdSetStub({ stubId, name, campaign_id } = {}) {
  const id = normalizeNonEmptyString(stubId) ?? `stub-adset-${Date.now()}`
  return {
    id,
    name: normalizeNonEmptyString(name) ?? id,
    campaign_id: normalizeNonEmptyString(campaign_id) ?? null,
    status: 'PAUSED',
    effective_status: 'PAUSED'
  }
}

function getGraphBaseUrl() {
  const version = process.env.META_GRAPH_VERSION ?? 'v20.0'
  return `https://graph.facebook.com/${version.replace(/^v/, 'v')}`
}

function buildUrl(path, params) {
  const base = getGraphBaseUrl()
  const url = new URL(`${base}/${String(path).replace(/^\//, '')}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null) continue
    url.searchParams.set(key, String(value))
  }
  return url
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599)
}

async function fetchJson(url, { method = 'GET', body, timeoutMs = 15000, retries = 2 } = {}) {
  let attempt = 0
  while (attempt <= retries) {
    attempt += 1

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      try {
        const res = await fetch(url, {
          method,
          body,
          signal: controller.signal,
          headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined
        })
        const text = await res.text()
        let json = null
        try {
          json = text ? JSON.parse(text) : null
        } catch {
          json = null
        }

        if (!res.ok) {
          const message =
            json?.error?.message ??
            `Meta Graph request failed (${res.status} ${res.statusText || 'Error'})`
          const err = new Error(message)
          err.status = res.status
          err.details = json?.error ?? null

          if (attempt <= retries && isRetryableStatus(res.status)) {
            const base = 300 * 2 ** (attempt - 1)
            const jitter = Math.floor(Math.random() * 200)
            await sleepMs(base + jitter)
            continue
          }

          throw err
        }

        return json
      } catch (err) {
        const status = err?.status
        const aborted = err?.name === 'AbortError'
        if (aborted) throw err

        if (attempt <= retries && (typeof status === 'number' ? isRetryableStatus(status) : true)) {
          const base = 300 * 2 ** (attempt - 1)
          const jitter = Math.floor(Math.random() * 200)
          await sleepMs(base + jitter)
          continue
        }

        throw err
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error('Meta Graph request failed after retries')
}

function normalizeMetaAdAccountId(metaAdAccountId) {
  const raw = normalizeNonEmptyString(metaAdAccountId)
  if (!raw) return null
  const stripped = raw.replace(/^act_/, '')
  if (!/^\d+$/.test(stripped)) return null
  return `act_${stripped}`
}

function normalizeCountryCode(value) {
  const raw = normalizeNonEmptyString(value)
  if (!raw) return null
  const code = raw.toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  return code
}

function normalizeTargeting(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const geo = value.geo_locations
  if (!geo || typeof geo !== 'object' || Array.isArray(geo)) return null

  const countries = Array.isArray(geo.countries)
    ? geo.countries.map(normalizeCountryCode).filter(Boolean)
    : []
  const uniqueCountries = [...new Set(countries)]
  if (uniqueCountries.length === 0) return null

  const normalizedGeo = {
    ...geo,
    countries: uniqueCountries
  }
  delete normalizedGeo.excluded_countries

  return {
    ...value,
    geo_locations: normalizedGeo
  }
}

function normalizePromotedObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const allowedStringFields = [
    'application_id',
    'conversion_goal_id',
    'custom_conversion_id',
    'custom_event_str',
    'custom_event_type',
    'event_id',
    'mcme_conversion_id',
    'object_store_url',
    'offline_conversion_data_set_id',
    'offsite_conversion_event_id',
    'page_id',
    'pixel_id',
    'product_catalog_id',
    'product_item_id',
    'product_set_id'
  ]

  const normalized = {}
  for (const field of allowedStringFields) {
    const item = normalizeNonEmptyString(value[field])
    if (item) normalized[field] = item
  }

  const pixelRule = normalizeNonEmptyString(value.pixel_rule)
  if (pixelRule) {
    normalized.pixel_rule = pixelRule
  } else if (value.pixel_rule && typeof value.pixel_rule === 'object' && !Array.isArray(value.pixel_rule)) {
    normalized.pixel_rule = JSON.stringify(value.pixel_rule)
  }

  const pixelAggregationRule = normalizeNonEmptyString(value.pixel_aggregation_rule)
  if (pixelAggregationRule) {
    normalized.pixel_aggregation_rule = pixelAggregationRule
  } else if (
    value.pixel_aggregation_rule &&
    typeof value.pixel_aggregation_rule === 'object' &&
    !Array.isArray(value.pixel_aggregation_rule)
  ) {
    normalized.pixel_aggregation_rule = JSON.stringify(value.pixel_aggregation_rule)
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

function normalizePositiveInt(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const i = Math.trunc(n)
  return i > 0 ? i : null
}

export async function metaFetchAdSet({
  metaAdSetId,
  accessToken,
  fields = ['id', 'name', 'status', 'effective_status', 'campaign_id', 'daily_budget', 'optimization_goal', 'billing_event']
} = {}) {
  const id = normalizeNonEmptyString(metaAdSetId)
  if (!id) {
    const err = new Error('metaAdSetId is required')
    err.status = 400
    throw err
  }

  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const url = buildUrl(id, {
    access_token: token,
    fields: Array.isArray(fields) ? fields.join(',') : String(fields)
  })
  return fetchJson(url, { retries: 2 })
}

export async function metaCreateAdSet({
  metaAdAccountId,
  metaCampaignId,
  name,
  countryCode,
  targeting,
  dailyBudgetCents,
  billingEvent,
  optimizationGoal,
  accessToken,
  status = 'PAUSED',
  bidStrategy,
  bidAmount,
  bidConstraints,
  promotedObject,
  promoted_object
} = {}) {
  const act = normalizeMetaAdAccountId(metaAdAccountId)
  if (!act) {
    const err = new Error('metaAdAccountId is required (expected act_<digits>)')
    err.status = 400
    throw err
  }

  const campaignId = normalizeNonEmptyString(metaCampaignId)
  if (!campaignId) {
    const err = new Error('metaCampaignId is required')
    err.status = 400
    throw err
  }

  const adSetName = normalizeNonEmptyString(name)
  if (!adSetName) {
    const err = new Error('name is required')
    err.status = 400
    throw err
  }

  const structuredTargeting = normalizeTargeting(targeting)
  const cc = structuredTargeting ? null : normalizeCountryCode(countryCode)
  if (!structuredTargeting && !cc) {
    const err = new Error('countryCode or targeting.geo_locations.countries is required')
    err.status = 400
    throw err
  }

  const budget = normalizePositiveInt(dailyBudgetCents)
  if (!budget) {
    const err = new Error('dailyBudgetCents is required (positive integer)')
    err.status = 400
    throw err
  }

  const be = normalizeNonEmptyString(billingEvent)
  if (!be) {
    const err = new Error('billingEvent is required')
    err.status = 400
    throw err
  }

  const og = normalizeNonEmptyString(optimizationGoal)
  if (!og) {
    const err = new Error('optimizationGoal is required')
    err.status = 400
    throw err
  }

  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const forcedStatus = 'PAUSED'
  const targetingPayload = structuredTargeting ?? { geo_locations: { countries: [cc] } }

  const bs = normalizeNonEmptyString(bidStrategy)
  const ba = bidAmount === undefined || bidAmount === null ? null : normalizePositiveInt(bidAmount)
  const bcRaw = bidConstraints ?? null
  const bc = bcRaw && typeof bcRaw === 'object' ? bcRaw : null
  const po = normalizePromotedObject(promotedObject ?? promoted_object)

  const params = new URLSearchParams()
  params.set('access_token', token)
  params.set('name', adSetName)
  params.set('campaign_id', campaignId)
  params.set('daily_budget', String(budget))
  params.set('billing_event', be)
  params.set('optimization_goal', og)
  params.set('targeting', JSON.stringify(targetingPayload))
  params.set('status', forcedStatus)
  if (bs) params.set('bid_strategy', bs)
  if (ba) params.set('bid_amount', String(ba))
  if (bc) params.set('bid_constraints', JSON.stringify(bc))
  if (po) params.set('promoted_object', JSON.stringify(po))

  const json = await fetchJson(buildUrl(`${act}/adsets`), { method: 'POST', body: params, retries: 3 })
  const id = normalizeNonEmptyString(json?.id)
  if (!id) {
    const err = new Error('Meta ad set creation returned no id')
    err.status = 502
    err.details = json ?? null
    throw err
  }

  const created = await metaFetchAdSet({ metaAdSetId: id, accessToken: token })
  return created
}

export async function metaUpdateAdSetDailyBudgetPaused({ metaAdSetId, dailyBudgetCents, accessToken } = {}) {
  const id = normalizeNonEmptyString(metaAdSetId)
  if (!id) {
    const err = new Error('metaAdSetId is required')
    err.status = 400
    throw err
  }

  const budget = normalizePositiveInt(dailyBudgetCents)
  if (!budget) {
    const err = new Error('dailyBudgetCents is required (expected positive int)')
    err.status = 400
    throw err
  }

  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const params = new URLSearchParams()
  params.set('access_token', token)
  params.set('daily_budget', String(budget))
  params.set('status', 'PAUSED')

  await fetchJson(buildUrl(id), { method: 'POST', body: params, retries: 3 })
  return metaFetchAdSet({ metaAdSetId: id, accessToken: token })
}
