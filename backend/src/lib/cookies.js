export function parseCookies(headerValue) {
  const header = typeof headerValue === 'string' ? headerValue : ''
  if (!header) return {}

  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    if (!key) continue
    const value = part.slice(idx + 1).trim()
    out[key] = value
  }
  return out
}

export function buildSetCookie(name, value, opts = {}) {
  const key = String(name || '').trim()
  if (!key) throw new Error('cookie name is required')

  const val = value === null ? '' : String(value)
  const parts = [`${key}=${val}`]

  const path = opts.path ?? '/'
  if (path) parts.push(`Path=${path}`)

  if (opts.httpOnly !== false) parts.push('HttpOnly')

  const sameSite = opts.sameSite ?? 'Lax'
  if (sameSite) parts.push(`SameSite=${sameSite}`)

  if (opts.secure === true) parts.push('Secure')

  if (Number.isFinite(opts.maxAgeSeconds)) parts.push(`Max-Age=${Math.floor(opts.maxAgeSeconds)}`)

  return parts.join('; ')
}

