import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError } from '../lib/http.js'
import { resolveAuthUser } from '../lib/internalAuth.js'
import { isUuid } from '../lib/validate.js'
import { metaFetchMe } from '../meta/graph.js'

function normalizeNonEmptyString(value, { maxLen = 1024 } = {}) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (maxLen && trimmed.length > maxLen) return trimmed.slice(0, maxLen)
  return trimmed
}

function normalizeOptionalString(value, { maxLen = 2048 } = {}) {
  if (value === null) return null
  if (value === undefined) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (maxLen && trimmed.length > maxLen) return trimmed.slice(0, maxLen)
  return trimmed
}

function maskToken(token) {
  const t = normalizeNonEmptyString(token, { maxLen: 4096 })
  if (!t) return { saved: false, last4: null }
  const last4 = t.length >= 4 ? t.slice(-4) : t
  return { saved: true, last4 }
}

async function resolveSelectedMetaAccount(pool, { userId, metaAccountId } = {}) {
  if (!isUuid(userId)) return null

  if (metaAccountId) {
    if (!isUuid(metaAccountId)) return null
    const { rows, rowCount } = await pool.query(
      `
        SELECT
          id,
          user_id,
          name,
          meta_ad_account_id,
          meta_page_id,
          meta_access_token,
          meta_instagram_actor_id,
          business_label,
          country_hint,
          notes,
          is_default,
          is_active,
          created_at,
          updated_at
        FROM user_meta_accounts
        WHERE id = $1::uuid AND user_id = $2::uuid
        LIMIT 1
      `,
      [metaAccountId, userId]
    )
    if (rowCount === 0) return null
    return rows[0]
  }

  const { rows, rowCount } = await pool.query(
    `
      SELECT
        id,
        user_id,
        name,
        meta_ad_account_id,
        meta_page_id,
        meta_access_token,
        meta_instagram_actor_id,
        business_label,
        country_hint,
        notes,
        is_default,
        is_active,
        created_at,
        updated_at
      FROM user_meta_accounts
      WHERE user_id = $1::uuid AND is_default = true
      LIMIT 1
    `,
    [userId]
  )
  if (rowCount === 0) return null
  return rows[0]
}

export function metaAccountsRouter() {
  const router = Router()

  router.use(
    asyncHandler(async (req, res, next) => {
      if (!req.app.locals.dbEnabled) {
        req.auth = null
        return next()
      }
      const pool = getPool()
      req.auth = await resolveAuthUser(pool, req)
      return next()
    })
  )

  function requireAuth(req, res) {
    if (!req.app.locals.dbEnabled) return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
    if (!req.auth?.userId) return jsonError(res, 401, 'Login required')
    return null
  }

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const pool = getPool()
      const { rows } = await pool.query(
        `
          SELECT
            id,
            name,
            meta_ad_account_id,
            meta_page_id,
            meta_instagram_actor_id,
            business_label,
            country_hint,
            notes,
            is_default,
            is_active,
            meta_access_token,
            created_at,
            updated_at
          FROM user_meta_accounts
          WHERE user_id = $1::uuid
          ORDER BY is_default DESC, is_active DESC, created_at DESC
        `,
        [req.auth.userId]
      )

      return res.json({
        ok: true,
        meta_accounts: rows.map((r) => {
          const tokenMeta = maskToken(r.meta_access_token)
          return {
            id: r.id,
            name: r.name,
            metaAdAccountId: r.meta_ad_account_id ?? null,
            metaPageId: r.meta_page_id ?? null,
            metaInstagramActorId: r.meta_instagram_actor_id ?? null,
            businessLabel: r.business_label ?? null,
            countryHint: r.country_hint ?? null,
            notes: r.notes ?? null,
            isDefault: Boolean(r.is_default),
            isActive: Boolean(r.is_active),
            metaAccessToken: tokenMeta,
            createdAt: r.created_at ?? null,
            updatedAt: r.updated_at ?? null
          }
        })
      })
    })
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const name = normalizeNonEmptyString(req.body?.name, { maxLen: 160 })
      if (!name) return jsonError(res, 400, 'Invalid name')

      const metaAdAccountId = normalizeOptionalString(req.body?.metaAdAccountId, { maxLen: 80 })
      const metaPageId = normalizeOptionalString(req.body?.metaPageId, { maxLen: 80 })
      const metaAccessToken = normalizeOptionalString(req.body?.metaAccessToken, { maxLen: 4096 })
      const metaInstagramActorId = normalizeOptionalString(req.body?.metaInstagramActorId, { maxLen: 80 })
      const businessLabel = normalizeOptionalString(req.body?.businessLabel, { maxLen: 200 })
      const countryHint = normalizeOptionalString(req.body?.countryHint, { maxLen: 8 })
      const notes = normalizeOptionalString(req.body?.notes, { maxLen: 2000 })
      const isDefault = req.body?.isDefault === true
      const isActive = req.body?.isActive === false ? false : true

      const pool = getPool()
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        if (isDefault) {
          await client.query(
            `
              UPDATE user_meta_accounts
              SET is_default = false, updated_at = now()
              WHERE user_id = $1::uuid AND is_default = true
            `,
            [req.auth.userId]
          )
        }

        const { rows } = await client.query(
          `
            INSERT INTO user_meta_accounts (
              user_id,
              name,
              meta_ad_account_id,
              meta_page_id,
              meta_access_token,
              meta_instagram_actor_id,
              business_label,
              country_hint,
              notes,
              is_default,
              is_active
            )
            VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING
              id,
              name,
              meta_ad_account_id,
              meta_page_id,
              meta_instagram_actor_id,
              business_label,
              country_hint,
              notes,
              is_default,
              is_active,
              meta_access_token,
              created_at,
              updated_at
          `,
          [
            req.auth.userId,
            name,
            metaAdAccountId,
            metaPageId,
            metaAccessToken,
            metaInstagramActorId,
            businessLabel,
            countryHint,
            notes,
            isDefault,
            isActive
          ]
        )

        await client.query('COMMIT')

        const created = rows[0]
        const tokenMeta = maskToken(created.meta_access_token)
        return res.status(201).json({
          ok: true,
          meta_account: {
            id: created.id,
            name: created.name,
            metaAdAccountId: created.meta_ad_account_id ?? null,
            metaPageId: created.meta_page_id ?? null,
            metaInstagramActorId: created.meta_instagram_actor_id ?? null,
            businessLabel: created.business_label ?? null,
            countryHint: created.country_hint ?? null,
            notes: created.notes ?? null,
            isDefault: Boolean(created.is_default),
            isActive: Boolean(created.is_active),
            metaAccessToken: tokenMeta,
            createdAt: created.created_at ?? null,
            updatedAt: created.updated_at ?? null
          }
        })
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    })
  )

  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const id = req.params?.id
      if (!isUuid(id)) return jsonError(res, 400, 'Invalid id')

      const name = normalizeNonEmptyString(req.body?.name, { maxLen: 160 })
      if (!name) return jsonError(res, 400, 'Invalid name')

      const metaAdAccountId = normalizeOptionalString(req.body?.metaAdAccountId, { maxLen: 80 })
      const metaPageId = normalizeOptionalString(req.body?.metaPageId, { maxLen: 80 })
      const metaInstagramActorId = normalizeOptionalString(req.body?.metaInstagramActorId, { maxLen: 80 })
      const businessLabel = normalizeOptionalString(req.body?.businessLabel, { maxLen: 200 })
      const countryHint = normalizeOptionalString(req.body?.countryHint, { maxLen: 8 })
      const notes = normalizeOptionalString(req.body?.notes, { maxLen: 2000 })

      const isDefault = req.body?.isDefault === true ? true : req.body?.isDefault === false ? false : null
      const isActive = req.body?.isActive === true ? true : req.body?.isActive === false ? false : null

      const hasMetaAccessTokenField = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'metaAccessToken')
      const nextMetaAccessToken = hasMetaAccessTokenField
        ? normalizeOptionalString(req.body?.metaAccessToken, { maxLen: 4096 })
        : undefined

      const pool = getPool()
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const existingRes = await client.query(
          `
            SELECT id, is_default
            FROM user_meta_accounts
            WHERE id = $1::uuid AND user_id = $2::uuid
            LIMIT 1
          `,
          [id, req.auth.userId]
        )
        if (existingRes.rowCount === 0) {
          await client.query('ROLLBACK')
          return jsonError(res, 404, 'Meta account not found')
        }

        if (isDefault === true) {
          await client.query(
            `
              UPDATE user_meta_accounts
              SET is_default = false, updated_at = now()
              WHERE user_id = $1::uuid AND is_default = true AND id <> $2::uuid
            `,
            [req.auth.userId, id]
          )
        }

        const { rows } = await client.query(
          `
            UPDATE user_meta_accounts
            SET
              name = $3,
              meta_ad_account_id = $4,
              meta_page_id = $5,
              meta_instagram_actor_id = $6,
              business_label = $7,
              country_hint = $8,
              notes = $9,
              is_default = COALESCE($10, is_default),
              is_active = COALESCE($11, is_active),
              meta_access_token = COALESCE($12, meta_access_token),
              updated_at = now()
            WHERE id = $1::uuid AND user_id = $2::uuid
            RETURNING
              id,
              name,
              meta_ad_account_id,
              meta_page_id,
              meta_instagram_actor_id,
              business_label,
              country_hint,
              notes,
              is_default,
              is_active,
              meta_access_token,
              created_at,
              updated_at
          `,
          [
            id,
            req.auth.userId,
            name,
            metaAdAccountId,
            metaPageId,
            metaInstagramActorId,
            businessLabel,
            countryHint,
            notes,
            isDefault,
            isActive,
            nextMetaAccessToken === undefined ? null : nextMetaAccessToken
          ]
        )

        await client.query('COMMIT')

        const updated = rows[0]
        const tokenMeta = maskToken(updated.meta_access_token)
        return res.json({
          ok: true,
          meta_account: {
            id: updated.id,
            name: updated.name,
            metaAdAccountId: updated.meta_ad_account_id ?? null,
            metaPageId: updated.meta_page_id ?? null,
            metaInstagramActorId: updated.meta_instagram_actor_id ?? null,
            businessLabel: updated.business_label ?? null,
            countryHint: updated.country_hint ?? null,
            notes: updated.notes ?? null,
            isDefault: Boolean(updated.is_default),
            isActive: Boolean(updated.is_active),
            metaAccessToken: tokenMeta,
            createdAt: updated.created_at ?? null,
            updatedAt: updated.updated_at ?? null
          }
        })
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    })
  )

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const id = req.params?.id
      if (!isUuid(id)) return jsonError(res, 400, 'Invalid id')

      const pool = getPool()
      const { rowCount } = await pool.query(
        `
          UPDATE user_meta_accounts
          SET is_active = false, is_default = false, updated_at = now()
          WHERE id = $1::uuid AND user_id = $2::uuid
        `,
        [id, req.auth.userId]
      )
      if (rowCount === 0) return jsonError(res, 404, 'Meta account not found')
      return res.json({ ok: true })
    })
  )

  router.post(
    '/:id/default',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const id = req.params?.id
      if (!isUuid(id)) return jsonError(res, 400, 'Invalid id')

      const pool = getPool()
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const owned = await client.query(
          'SELECT id FROM user_meta_accounts WHERE id = $1::uuid AND user_id = $2::uuid LIMIT 1',
          [id, req.auth.userId]
        )
        if (owned.rowCount === 0) {
          await client.query('ROLLBACK')
          return jsonError(res, 404, 'Meta account not found')
        }

        await client.query(
          `
            UPDATE user_meta_accounts
            SET is_default = false, updated_at = now()
            WHERE user_id = $1::uuid AND is_default = true AND id <> $2::uuid
          `,
          [req.auth.userId, id]
        )

        await client.query(
          `
            UPDATE user_meta_accounts
            SET is_default = true, is_active = true, updated_at = now()
            WHERE id = $1::uuid AND user_id = $2::uuid
          `,
          [id, req.auth.userId]
        )

        await client.query('COMMIT')
        return res.json({ ok: true })
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    })
  )

  router.post(
    '/:id/validate',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const id = req.params?.id
      if (!isUuid(id)) return jsonError(res, 400, 'Invalid id')

      const pool = getPool()
      const account = await resolveSelectedMetaAccount(pool, { userId: req.auth.userId, metaAccountId: id })
      if (!account) return jsonError(res, 404, 'Meta account not found')

      if (!account.is_active) {
        return jsonError(res, 400, 'Meta account is inactive')
      }

      const accessToken = normalizeNonEmptyString(account.meta_access_token, { maxLen: 4096 })
      if (!accessToken) {
        return jsonError(res, 400, 'Missing access token for this Meta account')
      }

      try {
        const me = await metaFetchMe({ accessToken })
        return res.json({
          ok: true,
          meta_account: { id: account.id, name: account.name },
          me
        })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta Graph validation failed', err?.details)
      }
    })
  )

  return router
}

