import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError, parseLimit } from '../lib/http.js'

function normalizeNonEmptyString(value, { maxLen } = {}) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (maxLen && trimmed.length > maxLen) return trimmed.slice(0, maxLen)
  return trimmed
}

function coerceBoolean(value, fallback = null) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function redactSecrets(value) {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(redactSecrets)

  const out = {}
  for (const [k, v] of Object.entries(value)) {
    const key = String(k).toLowerCase()
    if (
      key.includes('token') ||
      key.includes('access_token') ||
      key.includes('authorization') ||
      key.includes('cookie')
    ) {
      out[k] = '[REDACTED]'
      continue
    }
    out[k] = redactSecrets(v)
  }
  return out
}

function normalizeDetails(details) {
  if (details === undefined || details === null) return {}
  if (typeof details !== 'object') return { value: String(details) }

  const redacted = redactSecrets(details)
  try {
    const raw = JSON.stringify(redacted)
    if (raw.length > 8000) {
      return { truncated: true, bytes: raw.length }
    }
  } catch {
    return { unserializable: true }
  }
  return redacted
}

export function opsLogsRouter() {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const limit = parseLimit(req.query.limit, 100, 500)
      const source = normalizeNonEmptyString(req.query.source, { maxLen: 40 }) ?? 'meta-test'
      const entity = normalizeNonEmptyString(req.query.entity, { maxLen: 40 })
      const ok = coerceBoolean(req.query.ok, null)

      const pool = getPool()
      const { rows } = await pool.query(
        `
          SELECT
            id,
            source,
            entity,
            action,
            ok,
            error,
            details,
            client_at,
            created_at
          FROM ops_logs
          WHERE
            source = $1
            AND ($2::text IS NULL OR entity = $2::text)
            AND ($3::boolean IS NULL OR ok = $3::boolean)
          ORDER BY created_at DESC
          LIMIT $4
        `,
        [source, entity, ok, limit]
      )

      return res.json({ ok: true, ops_logs: rows })
    })
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const source = normalizeNonEmptyString(req.body?.source, { maxLen: 40 }) ?? 'meta-test'
      const entries = Array.isArray(req.body?.entries) ? req.body.entries : null
      if (!entries || entries.length === 0) {
        return jsonError(res, 400, 'Invalid entries (expected non-empty array)')
      }
      if (entries.length > 50) {
        return jsonError(res, 400, 'Too many entries (max 50)')
      }

      const normalized = []
      for (const item of entries) {
        const action = normalizeNonEmptyString(item?.action, { maxLen: 160 })
        if (!action) return jsonError(res, 400, 'Invalid entry.action')

        normalized.push({
          entity: normalizeNonEmptyString(item?.entity, { maxLen: 40 }),
          action,
          ok: typeof item?.ok === 'boolean' ? item.ok : Boolean(item?.ok),
          error: normalizeNonEmptyString(item?.error, { maxLen: 700 }),
          details: normalizeDetails(item?.details),
          clientAt: normalizeNonEmptyString(item?.clientAt ?? item?.at, { maxLen: 80 })
        })
      }

      const pool = getPool()
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const out = []
        for (const item of normalized) {
          const { rows } = await client.query(
            `
              INSERT INTO ops_logs (source, entity, action, ok, error, details, client_at)
              VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
              RETURNING id, source, entity, action, ok, error, details, client_at, created_at
            `,
            [
              source,
              item.entity,
              item.action,
              item.ok,
              item.error,
              JSON.stringify(item.details ?? {}),
              item.clientAt
            ]
          )
          out.push(rows[0])
        }

        await client.query('COMMIT')
        return res.status(201).json({ ok: true, ops_logs: out })
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    })
  )

  return router
}

