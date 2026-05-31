import { isUuid } from '../lib/validate.js'

export function coerceAccessToken(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

async function lookupMetaAccountToken(pool, { userId, metaAccountId } = {}) {
  if (!pool) return null
  if (!isUuid(userId)) return null

  if (metaAccountId) {
    if (!isUuid(metaAccountId)) return null
    const res = await pool.query(
      `
        SELECT meta_access_token
        FROM user_meta_accounts
        WHERE id = $1::uuid AND user_id = $2::uuid AND is_active = true
        LIMIT 1
      `,
      [metaAccountId, userId]
    )
    if (res.rowCount === 0) return null
    return coerceAccessToken(res.rows[0]?.meta_access_token)
  }

  const res = await pool.query(
    `
      SELECT meta_access_token
      FROM user_meta_accounts
      WHERE user_id = $1::uuid AND is_default = true AND is_active = true
      LIMIT 1
    `,
    [userId]
  )
  if (res.rowCount === 0) return null
  return coerceAccessToken(res.rows[0]?.meta_access_token)
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

  const requestedMetaAccountId =
    (typeof req.body?.metaAccountId === 'string' && req.body.metaAccountId.trim()
      ? req.body.metaAccountId.trim()
      : null) ??
    (typeof req.query?.metaAccountId === 'string' && req.query.metaAccountId.trim()
      ? req.query.metaAccountId.trim()
      : null)
  const fromMetaAccount = await lookupMetaAccountToken(pool, { userId: req.auth?.userId, metaAccountId: requestedMetaAccountId })
  if (fromMetaAccount) return fromMetaAccount

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

  const fromMetaAccount = await lookupMetaAccountToken(pool, { userId })
  if (fromMetaAccount) return fromMetaAccount

  const fromDb = await lookupToken(pool, { userId })
  if (fromDb) return fromDb

  return null
}
