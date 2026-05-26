function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getLibreTranslateUrl() {
  return normalizeNonEmptyString(process.env.LIBRETRANSLATE_URL) || 'http://localhost:5000'
}

export async function libreTranslateText({ q, source = 'auto', target, timeoutMs = 15000 } = {}) {
  const text = normalizeNonEmptyString(q)
  if (!text) return ''
  const tgt = normalizeNonEmptyString(target)
  if (!tgt) throw new Error('Invalid target language')

  const base = getLibreTranslateUrl().replace(/\/+$/, '')
  const url = `${base}/translate`

  const attempts = 2
  let lastErr = null
  for (let i = 0; i < attempts; i += 1) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source, target: tgt, format: 'text' }),
        signal: ctrl.signal
      })

      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = body?.error ? String(body.error) : `LibreTranslate HTTP ${res.status}`
        throw new Error(msg)
      }

      const translated =
        normalizeNonEmptyString(body?.translatedText) ??
        normalizeNonEmptyString(body?.translated_text) ??
        normalizeNonEmptyString(body?.translation)
      return translated ?? ''
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) await sleep(350)
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastErr ?? new Error('LibreTranslate request failed')
}

