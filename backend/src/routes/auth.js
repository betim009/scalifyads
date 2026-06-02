import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError, parseLimit } from '../lib/http.js'
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

      const { rows: opCountriesRows } = await pool.query(
        `
          SELECT country_code, primary_language
          FROM user_operational_countries
          WHERE user_id = $1::uuid
          ORDER BY country_code ASC
        `,
        [auth.userId]
      )
      const operationalCountries = opCountriesRows.map((r) => ({
        countryCode: r.country_code,
        primaryLanguage: r.primary_language ?? null
      }))
      const operationalCountryCodes = operationalCountries.map((r) => r.countryCode).filter(Boolean)

      const { rows: metaAccountRows } = await pool.query(
        `
          SELECT id, name, meta_ad_account_id, meta_page_id, meta_access_token, is_active, updated_at
          FROM user_meta_accounts
          WHERE user_id = $1::uuid AND is_default = true
          LIMIT 1
        `,
        [auth.userId]
      )
      const defaultMetaAccount = metaAccountRows?.[0] ?? null
      const defaultMetaToken = maskToken(defaultMetaAccount?.meta_access_token)

      // Legacy fallback: meta_tokens (kept for compatibility during migration).
      let legacyLatest = null
      let legacyTokenMeta = { hasToken: false, last4: null }
      if (!defaultMetaAccount) {
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
        legacyLatest = rows?.[0] ?? null
        legacyTokenMeta = maskToken(legacyLatest?.access_token)
      }

      return res.json({
        ok: true,
        authenticated: true,
        user: {
          id: auth.userId,
          username: auth.username,
          metaAdAccountId: auth.metaAdAccountId,
          metaPageId: auth.metaPageId,
          operationalCountryCodes,
          operationalCountries,
          metaAccessToken: {
            saved: defaultMetaAccount ? defaultMetaToken.hasToken : legacyTokenMeta.hasToken,
            last4: defaultMetaAccount ? defaultMetaToken.last4 : legacyTokenMeta.last4,
            createdAt: defaultMetaAccount ? defaultMetaAccount.updated_at ?? null : legacyLatest?.created_at ?? null
          },
          defaultMetaAccount: defaultMetaAccount
            ? {
                id: defaultMetaAccount.id,
                name: defaultMetaAccount.name,
                metaAdAccountId: defaultMetaAccount.meta_ad_account_id ?? null,
                metaPageId: defaultMetaAccount.meta_page_id ?? null,
                isActive: Boolean(defaultMetaAccount.is_active),
                metaAccessToken: { saved: defaultMetaToken.hasToken, last4: defaultMetaToken.last4 }
              }
            : null
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

      // P29 compatibility: also persist into user's default Meta Account (if exists), or create one.
      const { rows: defaultRows } = await pool.query(
        `
          SELECT id
          FROM user_meta_accounts
          WHERE user_id = $1::uuid AND is_default = true
          LIMIT 1
        `,
        [auth.userId]
      )
      const defaultId = defaultRows?.[0]?.id ?? null
      if (defaultId) {
        await pool.query(
          `
            UPDATE user_meta_accounts
            SET
              meta_ad_account_id = $2,
              meta_page_id = $3,
              meta_access_token = COALESCE($4, meta_access_token),
              is_active = true,
              updated_at = now()
            WHERE id = $1::uuid AND user_id = $5::uuid
          `,
          [defaultId, metaAdAccountId, metaPageId, accessToken || null, auth.userId]
        )
      } else if (metaAdAccountId || metaPageId || accessToken) {
        // If user has no default, create a "Conta principal".
        await pool.query(
          `
            INSERT INTO user_meta_accounts (
              user_id,
              name,
              meta_ad_account_id,
              meta_page_id,
              meta_access_token,
              is_default,
              is_active
            )
            VALUES ($1::uuid, 'Conta principal', $2, $3, $4, true, true)
          `,
          [auth.userId, metaAdAccountId, metaPageId, accessToken || null]
        )
      }

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

  router.get(
    '/operational-countries',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }
      const pool = getPool()
      const auth = await resolveAuthUser(pool, req)
      if (!auth) return jsonError(res, 401, 'Login required')

      const limit = parseLimit(req.query.limit, 200, 500)
      const { rows } = await pool.query(
        `
          SELECT country_code, primary_language, created_at
          FROM user_operational_countries
          WHERE user_id = $1::uuid
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [auth.userId, limit]
      )
      return res.json({
        ok: true,
        operational_countries: rows.map((r) => ({
          countryCode: r.country_code,
          primaryLanguage: r.primary_language ?? null,
          createdAt: r.created_at ?? null
        }))
      })
    })
  )

  router.post(
    '/operational-countries/add',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }
      const pool = getPool()
      const auth = await resolveAuthUser(pool, req)
      if (!auth) return jsonError(res, 401, 'Login required')

      const countryCode = normalizeNonEmptyString(req.body?.countryCode)
      if (!countryCode) return jsonError(res, 400, 'Invalid countryCode')

      const { rows: found } = await pool.query(`SELECT code, language_code FROM countries WHERE code = $1`, [countryCode.toUpperCase()])
      if (found.length === 0) return jsonError(res, 400, 'Invalid countryCode (not found)')

      const dbLanguageCode = normalizeNonEmptyString(found[0]?.language_code)
      const primaryLanguageRequested = normalizeNonEmptyString(req.body?.primaryLanguage)
      const defaultPrimaryLanguage = dbLanguageCode ? dbLanguageCode.toLowerCase() : null
      const primaryLanguage = primaryLanguageRequested || defaultPrimaryLanguage

      await pool.query(
        `
          INSERT INTO user_operational_countries (user_id, country_code)
          VALUES ($1::uuid, $2)
          ON CONFLICT (user_id, country_code) DO NOTHING
        `,
        [auth.userId, countryCode.toUpperCase()]
      )

      if (primaryLanguage) {
        await pool.query(
          `
            UPDATE user_operational_countries
            SET primary_language = $3
            WHERE user_id = $1::uuid AND country_code = $2
              AND ($4::boolean OR primary_language IS NULL)
          `,
          [auth.userId, countryCode.toUpperCase(), primaryLanguage, Boolean(primaryLanguageRequested)]
        )
      }

      return res.status(201).json({ ok: true })
    })
  )

  router.post(
    '/operational-countries/remove',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }
      const pool = getPool()
      const auth = await resolveAuthUser(pool, req)
      if (!auth) return jsonError(res, 401, 'Login required')

      const countryCode = normalizeNonEmptyString(req.body?.countryCode)
      if (!countryCode) return jsonError(res, 400, 'Invalid countryCode')

      await pool.query(
        `
          DELETE FROM user_operational_countries
          WHERE user_id = $1::uuid AND country_code = $2
        `,
        [auth.userId, countryCode.toUpperCase()]
      )

      return res.json({ ok: true })
    })
  )

  router.post(
    '/operational-countries/add-all',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }
      const pool = getPool()
      const auth = await resolveAuthUser(pool, req)
      if (!auth) return jsonError(res, 401, 'Login required')

      const { rows: all } = await pool.query(`SELECT code, language_code FROM countries ORDER BY code ASC`)
      const pairs = all
        .map((r) => ({ code: r.code, lang: normalizeNonEmptyString(r.language_code) ? String(r.language_code).toLowerCase() : null }))
        .filter((r) => r.code)

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        for (const { code, lang } of pairs) {
          await client.query(
            `
              INSERT INTO user_operational_countries (user_id, country_code)
              VALUES ($1::uuid, $2)
              ON CONFLICT (user_id, country_code) DO NOTHING
            `,
            [auth.userId, code]
          )

          if (lang) {
            await client.query(
              `
                UPDATE user_operational_countries
                SET primary_language = $3
                WHERE user_id = $1::uuid AND country_code = $2 AND primary_language IS NULL
              `,
              [auth.userId, code, lang]
            )
          }
        }
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }

      return res.status(201).json({ ok: true, count: pairs.length })
    })
  )

  router.post(
    '/operational-countries/language',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }
      const pool = getPool()
      const auth = await resolveAuthUser(pool, req)
      if (!auth) return jsonError(res, 401, 'Login required')

      const countryCode = normalizeNonEmptyString(req.body?.countryCode)
      if (!countryCode) return jsonError(res, 400, 'Invalid countryCode')

      const primaryLanguageRaw = req.body?.primaryLanguage
      const primaryLanguage = primaryLanguageRaw === null ? null : normalizeNonEmptyString(primaryLanguageRaw)

      const { rowCount } = await pool.query(
        `
          UPDATE user_operational_countries
          SET primary_language = $3
          WHERE user_id = $1::uuid AND country_code = $2
        `,
        [auth.userId, countryCode.toUpperCase(), primaryLanguage]
      )
      if (rowCount === 0) return jsonError(res, 404, 'Operational country not found')

      return res.json({ ok: true })
    })
  )

  return router
}
