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

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function metaCreateCampaignStub({ stubId, name, objective } = {}) {
  const id = normalizeNonEmptyString(stubId) ?? `stub-${Date.now()}`
  return {
    id,
    name: normalizeNonEmptyString(name) ?? id,
    status: 'PAUSED',
    effective_status: 'PAUSED',
    objective: normalizeNonEmptyString(objective) ?? null
  }
}

export async function metaCreateCampaign({
  metaAdAccountId,
  name,
  objective,
  accessToken,
  status = 'PAUSED',
  specialAdCategories = []
} = {}) {
  const act = normalizeNonEmptyString(metaAdAccountId)
  if (!act) {
    const err = new Error('metaAdAccountId is required')
    err.status = 400
    throw err
  }

  const campaignName = normalizeNonEmptyString(name)
  if (!campaignName) {
    const err = new Error('name is required')
    err.status = 400
    throw err
  }

  const obj = normalizeNonEmptyString(objective)
  if (!obj) {
    const err = new Error('objective is required')
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

  const params = new URLSearchParams()
  params.set('access_token', token)
  params.set('name', campaignName)
  params.set('objective', obj)
  params.set('status', forcedStatus)
  params.set('special_ad_categories', JSON.stringify(Array.isArray(specialAdCategories) ? specialAdCategories : []))
  params.set('is_adset_budget_sharing_enabled', 'false')

  const json = await fetchJson(buildUrl(`act_${act.replace(/^act_/, '')}/campaigns`), {
    method: 'POST',
    body: params,
    retries: 3
  })

  const id = normalizeNonEmptyString(json?.id)
  if (!id) {
    const err = new Error('Meta campaign creation returned no id')
    err.status = 502
    err.details = json ?? null
    throw err
  }

  const created = await metaFetchCampaign({ metaCampaignId: id, accessToken: token })
  return created
}

export async function metaFetchCampaign({
  metaCampaignId,
  accessToken,
  fields = ['id', 'name', 'status', 'effective_status', 'objective']
} = {}) {
  const id = normalizeNonEmptyString(metaCampaignId)
  if (!id) {
    const err = new Error('metaCampaignId is required')
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

function normalizeMetaAdAccountId(metaAdAccountId) {
  const raw = normalizeNonEmptyString(metaAdAccountId)
  if (!raw) return null
  const stripped = raw.replace(/^act_/, '')
  if (!/^\d+$/.test(stripped)) return null
  return `act_${stripped}`
}

export async function metaListAdAccountCampaigns({
  metaAdAccountId,
  accessToken,
  limit = 50,
  effectiveStatus = ['PAUSED'],
  fields = ['id', 'name', 'status', 'effective_status', 'objective']
} = {}) {
  const act = normalizeMetaAdAccountId(metaAdAccountId)
  if (!act) {
    const err = new Error('metaAdAccountId is required (expected act_<digits>)')
    err.status = 400
    throw err
  }

  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(200, Number(limit))) : 50
  const statuses = Array.isArray(effectiveStatus)
    ? effectiveStatus.map((s) => normalizeNonEmptyString(s)).filter(Boolean)
    : []

  const firstUrl = buildUrl(`${act}/campaigns`, {
    access_token: token,
    fields: Array.isArray(fields) ? fields.join(',') : String(fields),
    limit: safeLimit,
    ...(statuses.length ? { effective_status: JSON.stringify(statuses) } : null)
  })

  const out = []
  let nextUrl = firstUrl
  let pages = 0

  while (nextUrl && pages < 20) {
    pages += 1
    const json = await fetchJson(nextUrl, { retries: 3 })
    const data = Array.isArray(json?.data) ? json.data : []
    out.push(...data)
    nextUrl = typeof json?.paging?.next === 'string' ? json.paging.next : null
  }

  return out
}

export async function metaPauseCampaign({ metaCampaignId, accessToken } = {}) {
  const id = normalizeNonEmptyString(metaCampaignId)
  if (!id) {
    const err = new Error('metaCampaignId is required')
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
  params.set('status', 'PAUSED')

  await fetchJson(buildUrl(id), { method: 'POST', body: params, retries: 3 })
  return metaFetchCampaign({ metaCampaignId: id, accessToken: token })
}
