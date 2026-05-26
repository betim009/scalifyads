import { isUuid } from '../lib/validate.js'

export function coerceAccessToken(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

async function lookupToken(pool, { userId } = {}) {
  if (userId && !isUuid(userId)) {
    return null
  }

  const query =
    userId && isUuid(userId)
      ? `
          SELECT access_token, expires_at
          FROM meta_tokens
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `
      : `
          SELECT access_token, expires_at
          FROM meta_tokens
          ORDER BY created_at DESC
          LIMIT 1
        `

  const params = userId && isUuid(userId) ? [userId] : []
  const result = await pool.query(query, params)
  if (result.rowCount === 0) return null

  const row = result.rows[0]
  const token = coerceAccessToken(row.access_token)
  if (!token) return null

  if (row.expires_at) {
    const expiresAt = new Date(row.expires_at)
    if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
      return null
    }
  }

  return token
}

export async function resolveAccessToken(pool, req) {
  const fromBody = coerceAccessToken(req.body?.accessToken)
  if (fromBody) return fromBody

  const fromAuth = await lookupToken(pool, { userId: req.auth?.userId })
  if (fromAuth) return fromAuth

  const fromEnv = coerceAccessToken(process.env.META_ACCESS_TOKEN)
  if (fromEnv) return fromEnv

  const fromDb = await lookupToken(pool, { userId: req.body?.userId })
  if (fromDb) return fromDb

  return null
}

export async function resolveAccessTokenForScheduler(pool, { userId } = {}) {
  const fromEnv = coerceAccessToken(process.env.META_ACCESS_TOKEN)
  if (fromEnv) return fromEnv

  const fromDb = await lookupToken(pool, { userId })
  if (fromDb) return fromDb

  return null
}
