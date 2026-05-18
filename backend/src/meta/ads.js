function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function metaCreateAdStub({ stubId, name, adset_id } = {}) {
  const id = normalizeNonEmptyString(stubId) ?? `stub-ad-${Date.now()}`
  return {
    id,
    name: normalizeNonEmptyString(name) ?? id,
    adset_id: normalizeNonEmptyString(adset_id) ?? null,
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

export async function metaFetchAd({
  metaAdId,
  accessToken,
  fields = ['id', 'name', 'status', 'effective_status', 'adset_id', 'campaign_id', 'creative']
} = {}) {
  const id = normalizeNonEmptyString(metaAdId)
  if (!id) {
    const err = new Error('metaAdId is required')
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

export async function metaCreateAd({
  metaAdAccountId,
  metaAdSetId,
  name,
  creativeId,
  accessToken,
  status = 'PAUSED'
} = {}) {
  const act = normalizeMetaAdAccountId(metaAdAccountId)
  if (!act) {
    const err = new Error('metaAdAccountId is required (expected act_<digits>)')
    err.status = 400
    throw err
  }

  const adsetId = normalizeNonEmptyString(metaAdSetId)
  if (!adsetId) {
    const err = new Error('metaAdSetId is required')
    err.status = 400
    throw err
  }

  const adName = normalizeNonEmptyString(name)
  if (!adName) {
    const err = new Error('name is required')
    err.status = 400
    throw err
  }

  const cId = normalizeNonEmptyString(creativeId)
  if (!cId) {
    const err = new Error('creativeId is required (existing creative id)')
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
  params.set('name', adName)
  params.set('adset_id', adsetId)
  params.set('creative', JSON.stringify({ creative_id: cId }))
  params.set('status', forcedStatus)

  const json = await fetchJson(buildUrl(`${act}/ads`), { method: 'POST', body: params, retries: 3 })
  const id = normalizeNonEmptyString(json?.id)
  if (!id) {
    const err = new Error('Meta ad creation returned no id')
    err.status = 502
    err.details = json ?? null
    throw err
  }

  const created = await metaFetchAd({ metaAdId: id, accessToken: token })
  return created
}

export async function metaFetchAdPreviews({
  metaAdId,
  accessToken,
  adFormat = 'DESKTOP_FEED_STANDARD'
} = {}) {
  const id = normalizeNonEmptyString(metaAdId)
  if (!id) {
    const err = new Error('metaAdId is required')
    err.status = 400
    throw err
  }

  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const fmt = normalizeNonEmptyString(adFormat) ?? 'DESKTOP_FEED_STANDARD'
  const url = buildUrl(`${id}/previews`, {
    access_token: token,
    ad_format: fmt
  })

  return fetchJson(url, { retries: 2 })
}
