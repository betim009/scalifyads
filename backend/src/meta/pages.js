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

function clampInt(value, { min, max, fallback }) {
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return fallback
  if (typeof min === 'number' && n < min) return min
  if (typeof max === 'number' && n > max) return max
  return n
}

async function fetchAllPages(path, { accessToken, fields, limit = 50, maxItems = 250 } = {}) {
  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const pageLimit = clampInt(limit, { min: 1, max: 200, fallback: 50 })
  const hardLimit = clampInt(maxItems, { min: 1, max: 2000, fallback: 250 })

  let after = null
  const out = []

  while (out.length < hardLimit) {
    const url = buildUrl(path, {
      access_token: token,
      fields,
      limit: pageLimit,
      after
    })
    const json = await fetchJson(url, { retries: 2 })
    const pages = pickPages(json)
    out.push(...pages)

    const nextAfter = normalizeNonEmptyString(json?.paging?.cursors?.after) ?? null
    if (!nextAfter) break
    after = nextAfter
  }

  const unique = new Map()
  for (const p of out) unique.set(p.id, p)
  return Array.from(unique.values()).slice(0, hardLimit)
}

async function fetchAllBusinesses(path, { accessToken, fields, limit = 50, maxItems = 250 } = {}) {
  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const pageLimit = clampInt(limit, { min: 1, max: 200, fallback: 50 })
  const hardLimit = clampInt(maxItems, { min: 1, max: 2000, fallback: 250 })

  let after = null
  const out = []

  while (out.length < hardLimit) {
    const url = buildUrl(path, {
      access_token: token,
      fields,
      limit: pageLimit,
      after
    })
    const json = await fetchJson(url, { retries: 2 })
    const businesses = pickBusinesses(json)
    out.push(...businesses)

    const nextAfter = normalizeNonEmptyString(json?.paging?.cursors?.after) ?? null
    if (!nextAfter) break
    after = nextAfter
  }

  const unique = new Map()
  for (const b of out) unique.set(b.id, b)
  return Array.from(unique.values()).slice(0, hardLimit)
}

export async function metaListMyPages({ accessToken, limit = 50 } = {}) {
  return fetchAllPages('me/accounts', { accessToken, fields: 'id,name', limit, maxItems: 500 })
}

export async function metaListMyBusinesses({ accessToken, limit = 50 } = {}) {
  return fetchAllBusinesses('me/businesses', { accessToken, fields: 'id,name', limit, maxItems: 500 })
}

export async function metaListBusinessOwnedPages({ businessId, accessToken, limit = 50 } = {}) {
  const biz = normalizeNonEmptyString(businessId)
  if (!biz) {
    const err = new Error('businessId is required')
    err.status = 400
    throw err
  }

  return fetchAllPages(`${biz}/owned_pages`, { accessToken, fields: 'id,name', limit, maxItems: 500 })
}

export async function metaFetchAdAccountBusiness({ metaAdAccountId, accessToken } = {}) {
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

  const url = buildUrl(act, {
    access_token: token,
    fields: 'business{id,name}'
  })
  const json = await fetchJson(url, { retries: 2 })
  const business = json?.business ?? null
  const id = normalizeNonEmptyString(business?.id) ?? null
  return id
    ? { id, name: normalizeNonEmptyString(business?.name) ?? null }
    : null
}

export async function metaFetchPage({ metaPageId, accessToken, fields = ['id', 'name'] } = {}) {
  const id = normalizeNonEmptyString(metaPageId)
  if (!id) {
    const err = new Error('metaPageId is required')
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

export async function metaListAdAccountPromotePages({ metaAdAccountId, accessToken, limit = 50 } = {}) {
  const act = normalizeMetaAdAccountId(metaAdAccountId)
  if (!act) {
    const err = new Error('metaAdAccountId is required (expected act_<digits>)')
    err.status = 400
    throw err
  }

  return fetchAllPages(`${act}/promote_pages`, { accessToken, fields: 'id,name', limit, maxItems: 500 })
}
