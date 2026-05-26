import crypto from 'node:crypto'
import { parseCookies } from './cookies.js'
import { isUuid } from './validate.js'

export const SESSION_COOKIE_NAME = 'cb_session'

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex')
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function getSessionTokenFromReq(req) {
  const cookies = parseCookies(req.headers?.cookie)
  const raw = cookies?.[SESSION_COOKIE_NAME]
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export async function resolveAuthUser(pool, req) {
  const token = getSessionTokenFromReq(req)
  if (!token) return null
  const tokenHash = sha256Hex(token)

  const { rows, rowCount } = await pool.query(
    `
      SELECT
        s.user_id,
        s.expires_at,
        u.username,
        u.meta_ad_account_id,
        u.meta_page_id
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
      LIMIT 1
    `,
    [tokenHash]
  )

  if (rowCount === 0) return null
  const row = rows[0]

  if (!isUuid(row.user_id)) return null

  if (row.expires_at) {
    const expiresAt = new Date(row.expires_at)
    if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
      return null
    }
  }

  return {
    userId: row.user_id,
    username: row.username ?? null,
    metaAdAccountId: row.meta_ad_account_id ?? null,
    metaPageId: row.meta_page_id ?? null
  }
}

export async function insertSession(pool, { userId, token, ttlDays = 14 } = {}) {
  if (!isUuid(userId)) throw new Error('Invalid userId')
  const raw = String(token || '').trim()
  if (!raw) throw new Error('Invalid token')

  const tokenHash = sha256Hex(raw)
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()

  await pool.query(
    `
      INSERT INTO user_sessions (user_id, token_hash, expires_at)
      VALUES ($1::uuid, $2, $3::timestamptz)
      ON CONFLICT (token_hash) DO NOTHING
    `,
    [userId, tokenHash, expiresAt]
  )

  return { tokenHash, expiresAt }
}

export async function deleteSession(pool, token) {
  const raw = String(token || '').trim()
  if (!raw) return
  const tokenHash = sha256Hex(raw)
  await pool.query('DELETE FROM user_sessions WHERE token_hash = $1', [tokenHash])
}

