function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
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

async function fetchJson(url, { timeoutMs = 15000, retries = 2 } = {}) {
  let attempt = 0
  while (attempt <= retries) {
    attempt += 1

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      try {
        const res = await fetch(url, { signal: controller.signal })
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

function normalizeMetaAdAccountId(value) {
  const raw = normalizeNonEmptyString(value)
  if (!raw) return null
  const stripped = raw.replace(/^act_/, '')
  if (!/^\d+$/.test(stripped)) return null
  return `act_${stripped}`
}

function pickPages(json) {
  const data = Array.isArray(json?.data) ? json.data : []
  return data
    .map((p) => ({
      id: normalizeNonEmptyString(p?.id) ?? null,
      name: normalizeNonEmptyString(p?.name) ?? null
    }))
    .filter((p) => p.id)
}

function pickBusinesses(json) {
  const data = Array.isArray(json?.data) ? json.data : []
  return data
    .map((b) => ({
      id: normalizeNonEmptyString(b?.id) ?? null,
      name: normalizeNonEmptyString(b?.name) ?? null
    }))
    .filter((b) => b.id)
}

export async function metaListMyPages({ accessToken, limit = 50 } = {}) {
  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const url = buildUrl('me/accounts', {
    access_token: token,
    fields: 'id,name',
    limit
  })
  const json = await fetchJson(url, { retries: 2 })
  return pickPages(json)
}

export async function metaListMyBusinesses({ accessToken, limit = 50 } = {}) {
  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const url = buildUrl('me/businesses', {
    access_token: token,
    fields: 'id,name',
    limit
  })
  const json = await fetchJson(url, { retries: 2 })
  return pickBusinesses(json)
}

export async function metaListBusinessOwnedPages({ businessId, accessToken, limit = 50 } = {}) {
  const biz = normalizeNonEmptyString(businessId)
  if (!biz) {
    const err = new Error('businessId is required')
    err.status = 400
    throw err
  }

  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const url = buildUrl(`${biz}/owned_pages`, {
    access_token: token,
    fields: 'id,name',
    limit
  })
  const json = await fetchJson(url, { retries: 2 })
  return pickPages(json)
}

export async function metaListAdAccountPromotePages({ metaAdAccountId, accessToken, limit = 50 } = {}) {
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

  const url = buildUrl(`${act}/promote_pages`, {
    access_token: token,
    fields: 'id,name',
    limit
  })
  const json = await fetchJson(url, { retries: 2 })
  return pickPages(json)
}
