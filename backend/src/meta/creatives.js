import fsp from 'node:fs/promises'

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

async function fetchJson(url, { method = 'GET', body, timeoutMs = 15000, retries = 2 } = {}) {
  let attempt = 0
  while (attempt <= retries) {
    attempt += 1

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      try {
        const headers =
          body instanceof URLSearchParams
            ? { 'Content-Type': 'application/x-www-form-urlencoded' }
            : undefined

        const res = await fetch(url, {
          method,
          body,
          signal: controller.signal,
          headers
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

export async function metaUploadAdImage({
  metaAdAccountId,
  accessToken,
  filePath,
  mimeType,
  originalName
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

  const fp = normalizeNonEmptyString(filePath)
  if (!fp) {
    const err = new Error('filePath is required')
    err.status = 400
    throw err
  }

  const buf = await fsp.readFile(fp)
  const form = new FormData()
  form.append('access_token', token)

  const mt = normalizeNonEmptyString(mimeType) ?? 'application/octet-stream'
  const name = normalizeNonEmptyString(originalName) ?? 'asset'
  form.append('filename', new Blob([buf], { type: mt }), name)

  const json = await fetchJson(buildUrl(`${act}/adimages`), { method: 'POST', body: form, retries: 3 })
  const images = json?.images && typeof json.images === 'object' ? json.images : null
  const first = images ? Object.values(images)[0] : null
  const hash = normalizeNonEmptyString(first?.hash)
  if (!hash) {
    const err = new Error('Meta ad image upload returned no hash')
    err.status = 502
    err.details = json ?? null
    throw err
  }
  return { hash, raw: json }
}

export async function metaFetchAdCreative({
  metaCreativeId,
  accessToken,
  fields = ['id', 'name', 'object_story_spec', 'effective_object_story_id', 'status', 'thumbnail_url']
} = {}) {
  const id = normalizeNonEmptyString(metaCreativeId)
  if (!id) {
    const err = new Error('metaCreativeId is required')
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

export async function metaCreateAdCreative({
  metaAdAccountId,
  accessToken,
  pageId,
  instagramActorId,
  name,
  message,
  link,
  headline,
  description,
  ctaType,
  imageHash
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

  const pg = normalizeNonEmptyString(pageId)
  if (!pg) {
    const err = new Error('pageId is required')
    err.status = 400
    throw err
  }

  const url = normalizeNonEmptyString(link)
  if (!url) {
    const err = new Error('link is required (destination URL)')
    err.status = 400
    throw err
  }

  const creativeName = normalizeNonEmptyString(name) ?? `Creative ${Date.now()}`
  const msg = normalizeNonEmptyString(message)
  const head = normalizeNonEmptyString(headline)
  const desc = normalizeNonEmptyString(description)
  const cta = normalizeNonEmptyString(ctaType)
  const imgHash = normalizeNonEmptyString(imageHash)
  const igActor = normalizeNonEmptyString(instagramActorId)

  const linkData = {
    link: url,
    ...(msg ? { message: msg } : null),
    ...(head ? { name: head } : null),
    ...(desc ? { description: desc } : null),
    ...(imgHash ? { image_hash: imgHash } : null),
    ...(cta ? { call_to_action: { type: cta, value: { link: url } } } : null)
  }

  const objectStorySpec = {
    page_id: pg,
    link_data: linkData,
    ...(igActor ? { instagram_actor_id: igActor } : null)
  }

  const params = new URLSearchParams()
  params.set('access_token', token)
  params.set('name', creativeName)
  params.set('object_story_spec', JSON.stringify(objectStorySpec))

  const json = await fetchJson(buildUrl(`${act}/adcreatives`), { method: 'POST', body: params, retries: 3 })
  const id = normalizeNonEmptyString(json?.id)
  if (!id) {
    const err = new Error('Meta ad creative creation returned no id')
    err.status = 502
    err.details = json ?? null
    throw err
  }

  const created = await metaFetchAdCreative({ metaCreativeId: id, accessToken: token })
  return created
}

export async function metaFetchAdCreativePreviews({
  metaCreativeId,
  accessToken,
  adFormat = 'DESKTOP_FEED_STANDARD'
} = {}) {
  const id = normalizeNonEmptyString(metaCreativeId)
  if (!id) {
    const err = new Error('metaCreativeId is required')
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
