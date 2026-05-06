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

function toCents(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

function toInt(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

function addDays(yyyyMmDd, days) {
  const [y, m, d] = yyyyMmDd.split('-').map((v) => Number(v))
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function eachDateInclusive(since, until) {
  const out = []
  let current = since
  while (current <= until) {
    out.push(current)
    current = addDays(current, 1)
  }
  return out
}

function hashString(input) {
  const str = String(input)
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
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

export async function metaFetchCampaignInsightsDaily({
  metaCampaignId,
  accessToken,
  since,
  until,
  fields = ['spend', 'impressions', 'clicks', 'cpc', 'cpm', 'ctr', 'date_start', 'date_stop']
}) {
  const provider = process.env.META_SYNC_PROVIDER
  if (provider === 'meta' && !accessToken) {
    const err = new Error('Missing accessToken for META_SYNC_PROVIDER=meta')
    err.status = 400
    throw err
  }
  const isStub = provider === 'stub' || (!accessToken && provider !== 'meta')
  if (isStub) {
    const days = eachDateInclusive(since, until)
    return days.map((date) => {
      const seed = hashString(`${metaCampaignId}:${date}`)
      const spendCents = 80000 + (seed % 520000) // 800.00–6000.00
      const impressions = 500 + (seed % 90000)
      const clicks = Math.max(0, Math.round(impressions * (0.004 + ((seed % 25) / 10000))))
      const revenueCents = Math.round(spendCents * (1.2 + ((seed % 180) / 100))) // 1.2x–3.0x
      const spend = (spendCents / 100).toFixed(2)
      const cpc = clicks > 0 ? (Number(spend) / clicks).toFixed(2) : null
      const cpm = impressions > 0 ? ((Number(spend) * 1000) / impressions).toFixed(2) : null
      const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : null

      return {
        date_start: date,
        date_stop: date,
        spend,
        revenue: (revenueCents / 100).toFixed(2),
        impressions: String(impressions),
        clicks: String(clicks),
        cpc,
        cpm,
        ctr
      }
    })
  }

  const url = buildUrl(`${metaCampaignId}/insights`, {
    access_token: accessToken,
    fields: Array.isArray(fields) ? fields.join(',') : String(fields),
    time_increment: 1,
    time_range: JSON.stringify({ since, until }),
    limit: 5000
  })

  const out = []
  let nextUrl = url
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

export async function metaFetchMe({ accessToken, fields = ['id', 'name'] } = {}) {
  if (!accessToken) throw new Error('accessToken is required')
  const url = buildUrl('me', {
    access_token: accessToken,
    fields: Array.isArray(fields) ? fields.join(',') : String(fields)
  })
  return fetchJson(url, { retries: 2 })
}

export function normalizeDailyInsightRow(row) {
  const date =
    typeof row?.date_start === 'string'
      ? row.date_start
      : typeof row?.date_stop === 'string'
        ? row.date_stop
        : null
  if (!date) return null

  const spendCents = toCents(row?.spend) ?? 0
  const revenueCents = toCents(row?.revenue)
  const impressions = toInt(row?.impressions) ?? 0
  const clicks = toInt(row?.clicks) ?? 0
  const cpcCents = toCents(row?.cpc)
  const cpmCents = toCents(row?.cpm)

  return {
    metricDate: date,
    spendCents,
    revenueCents,
    impressions,
    clicks,
    cpcCents,
    cpmCents
  }
}

export function addDaysUtc(yyyyMmDd, days) {
  return addDays(yyyyMmDd, days)
}
