import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError } from '../lib/http.js'
import { buildSetCookie } from '../lib/cookies.js'
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  deleteSession,
  getSessionTokenFromReq,
  insertSession,
  resolveAuthUser
} from '../lib/internalAuth.js'

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function maskToken(token) {
  const t = normalizeNonEmptyString(token)
  if (!t) return { hasToken: false, last4: null }
  const last4 = t.length >= 4 ? t.slice(-4) : t
  return { hasToken: true, last4 }
}

export function authRouter() {
  const router = Router()

  router.get(
    '/me',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return res.json({ ok: true, authenticated: false, user: null })
      }

      const pool = getPool()
      const auth = await resolveAuthUser(pool, req)
      if (!auth) {
        return res.json({ ok: true, authenticated: false, user: null })
      }

      const { rows } = await pool.query(
        `
          SELECT access_token, created_at
          FROM meta_tokens
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [auth.userId]
      )
      const latest = rows?.[0] ?? null
      const tokenMeta = maskToken(latest?.access_token)

      return res.json({
        ok: true,
        authenticated: true,
        user: {
          id: auth.userId,
          username: auth.username,
          metaAdAccountId: auth.metaAdAccountId,
          metaPageId: auth.metaPageId,
          metaAccessToken: {
            saved: tokenMeta.hasToken,
            last4: tokenMeta.last4,
            createdAt: latest?.created_at ?? null
          }
        }
      })
    })
  )

  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const username = normalizeNonEmptyString(req.body?.username)
      const password = normalizeNonEmptyString(req.body?.password)
      if (!username) return jsonError(res, 400, 'Invalid username')
      if (!password) return jsonError(res, 400, 'Invalid password')

      const pool = getPool()
      const { rows, rowCount } = await pool.query(
        `
          INSERT INTO users (username, password_plain, name)
          VALUES ($1, $2, $3)
          ON CONFLICT (username) DO NOTHING
          RETURNING id, username
        `,
        [username, password, username]
      )

      if (rowCount === 0) {
        return jsonError(res, 409, 'Username already exists')
      }

      // Auto-login after register
      const token = createSessionToken()
      await insertSession(pool, { userId: rows[0].id, token })

      res.setHeader(
        'Set-Cookie',
        buildSetCookie(SESSION_COOKIE_NAME, token, {
          httpOnly: true,
          sameSite: 'Lax',
          secure: process.env.COOKIE_SECURE === 'true',
          maxAgeSeconds: 14 * 24 * 60 * 60
        })
      )

      return res.status(201).json({ ok: true, user: { id: rows[0].id, username: rows[0].username } })
    })
  )

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const username = normalizeNonEmptyString(req.body?.username)
      const password = normalizeNonEmptyString(req.body?.password)
      if (!username) return jsonError(res, 400, 'Invalid username')
      if (!password) return jsonError(res, 400, 'Invalid password')

      const pool = getPool()
      const { rows, rowCount } = await pool.query(
        `
          SELECT id, username, password_plain
          FROM users
          WHERE username = $1
          LIMIT 1
        `,
        [username]
      )

      if (rowCount === 0) return jsonError(res, 401, 'Invalid credentials')
      const user = rows[0]
      if (String(user.password_plain || '') !== password) return jsonError(res, 401, 'Invalid credentials')

      const token = createSessionToken()
      await insertSession(pool, { userId: user.id, token })

      res.setHeader(
        'Set-Cookie',
        buildSetCookie(SESSION_COOKIE_NAME, token, {
          httpOnly: true,
          sameSite: 'Lax',
          secure: process.env.COOKIE_SECURE === 'true',
          maxAgeSeconds: 14 * 24 * 60 * 60
        })
      )

      return res.json({ ok: true, user: { id: user.id, username: user.username } })
    })
  )

  router.post(
    '/logout',
    asyncHandler(async (req, res) => {
      if (req.app.locals.dbEnabled) {
        const pool = getPool()
        const token = getSessionTokenFromReq(req)
        if (token) {
          await deleteSession(pool, token)
        }
      }

      res.setHeader(
        'Set-Cookie',
        buildSetCookie(SESSION_COOKIE_NAME, '', {
          httpOnly: true,
          sameSite: 'Lax',
          secure: process.env.COOKIE_SECURE === 'true',
          maxAgeSeconds: 0
        })
      )
      return res.json({ ok: true })
    })
  )

  router.post(
    '/meta-credentials',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const pool = getPool()
      const auth = await resolveAuthUser(pool, req)
      if (!auth) return jsonError(res, 401, 'Login required')

      const metaAdAccountId = normalizeNonEmptyString(req.body?.metaAdAccountId)
      const metaPageId = normalizeNonEmptyString(req.body?.metaPageId)

      const accessToken = normalizeNonEmptyString(req.body?.metaAccessToken)

      await pool.query(
        `
          UPDATE users
          SET
            meta_ad_account_id = $2,
            meta_page_id = $3
          WHERE id = $1
        `,
        [auth.userId, metaAdAccountId, metaPageId]
      )

      if (accessToken) {
        // Never return or log the token; only insert.
        await pool.query(
          `
            INSERT INTO meta_tokens (user_id, meta_user_id, access_token, expires_at)
            VALUES ($1::uuid, NULL, $2, NULL)
          `,
          [auth.userId, accessToken]
        )
      }

      return res.status(201).json({ ok: true })
    })
  )

  return router
}
