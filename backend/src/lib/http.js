export function jsonError(res, status, message, details) {
  return res.status(status).json({
    ok: false,
    error: { message, details: details ?? null }
  })
}

export function parseLimit(value, fallback = 50, max = 200) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(Math.floor(n), max)
}

