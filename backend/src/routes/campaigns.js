import { Router } from 'express'
import { getPool } from '../db.js'
import { jsonError, parseLimit } from '../lib/http.js'
import { slugify } from '../lib/slugify.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { isUuid } from '../lib/validate.js'

async function createUniqueSlug(pool, base) {
  const cleaned = slugify(base) || `campaign-${Date.now()}`
  let candidate = cleaned
  let attempt = 0

  while (true) {
    const { rowCount } = await pool.query('SELECT 1 FROM campaigns WHERE slug = $1', [candidate])
    if (rowCount === 0) return candidate
    attempt += 1
    candidate = `${cleaned}-${attempt}`
  }
}

function normalizeCountryCodes(value) {
  const list = Array.isArray(value) ? value : []
  return [...new Set(list.map((c) => String(c).trim().toUpperCase()).filter(Boolean))]
}

export function campaignsRouter() {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

    const limit = parseLimit(req.query.limit, 50, 200)
    const status = typeof req.query.status === 'string' ? req.query.status : null
    const pool = getPool()

    const { rows } = await pool.query(
      `
        SELECT
          c.id,
          c.slug,
          c.name,
          c.status,
          c.scope,
          c.objective_key,
          o.label AS objective_label,
          o.meta_value AS objective_meta_value,
          c.created_by_user_id,
          c.created_at,
          COALESCE(
            json_agg(ct.country_code ORDER BY ct.country_code) FILTER (WHERE ct.country_code IS NOT NULL),
            '[]'::json
          ) AS country_codes
        FROM campaigns c
        LEFT JOIN campaign_objectives o ON o.key = c.objective_key
        LEFT JOIN campaign_country_targets ct ON ct.campaign_id = c.id
        WHERE ($1::text IS NULL OR c.status = $1)
        GROUP BY c.id, o.label, o.meta_value
        ORDER BY c.created_at DESC
        LIMIT $2
      `,
      [status, limit]
    )

      return res.json({ ok: true, campaigns: rows })
    })
  )

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const pool = getPool()
      const campaignId = req.params.id
      if (!isUuid(campaignId)) {
        return jsonError(res, 400, 'Invalid campaign id')
      }

    const campaignResult = await pool.query(
      `
        SELECT
          c.id,
          c.slug,
          c.name,
          c.status,
          c.scope,
          c.objective_key,
          o.label AS objective_label,
          o.meta_value AS objective_meta_value,
          c.created_by_user_id,
          c.created_at
        FROM campaigns c
        LEFT JOIN campaign_objectives o ON o.key = c.objective_key
        WHERE c.id = $1
      `,
      [campaignId]
    )

    if (campaignResult.rowCount === 0) {
      return jsonError(res, 404, 'Campaign not found')
    }

    const targetsResult = await pool.query(
      `
        SELECT country_code
        FROM campaign_country_targets
        WHERE campaign_id = $1
        ORDER BY country_code ASC
      `,
      [campaignId]
    )

      return res.json({
        ok: true,
        campaign: {
          ...campaignResult.rows[0],
          country_codes: targetsResult.rows.map((r) => r.country_code)
        }
      })
    })
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

    const name = req.body?.name
    const scope = req.body?.scope ?? 'global'
    const objectiveKey = req.body?.objectiveKey ?? null
    const createdByUserId = req.body?.createdByUserId ?? null
    const countryCodes = normalizeCountryCodes(req.body?.countryCodes)

    if (typeof name !== 'string' || !name.trim()) {
      return jsonError(res, 400, 'Invalid name')
    }

    const pool = getPool()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const slug = await createUniqueSlug(client, name)
      const insertResult = await client.query(
        `
          INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id)
          VALUES ($1, $2, 'draft', $3, $4, $5)
          RETURNING id, slug, name, status, scope, objective_key, created_by_user_id, created_at
        `,
        [slug, name.trim(), scope, objectiveKey, createdByUserId]
      )

      const campaign = insertResult.rows[0]

      for (const code of countryCodes) {
        await client.query(
          `
            INSERT INTO campaign_country_targets (campaign_id, country_code)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `,
          [campaign.id, code]
        )
      }

      await client.query('COMMIT')
      return res.status(201).json({ ok: true, campaign: { ...campaign, country_codes: countryCodes } })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
      } finally {
        client.release()
      }
    })
  )

  router.post(
    '/:id/duplicate',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const pool = getPool()
      const campaignId = req.params.id
      if (!isUuid(campaignId)) {
        return jsonError(res, 400, 'Invalid campaign id')
      }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const originalResult = await client.query(
        `
          SELECT id, name, scope, objective_key, created_by_user_id
          FROM campaigns
          WHERE id = $1
        `,
        [campaignId]
      )

      if (originalResult.rowCount === 0) {
        await client.query('ROLLBACK')
        return jsonError(res, 404, 'Campaign not found')
      }

      const original = originalResult.rows[0]
      const name = req.body?.name
      const newName =
        typeof name === 'string' && name.trim() ? name.trim() : `${original.name} (cópia)`

      const slug = await createUniqueSlug(client, newName)
      const inserted = await client.query(
        `
          INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id)
          VALUES ($1, $2, 'draft', $3, $4, $5)
          RETURNING id, slug, name, status, scope, objective_key, created_by_user_id, created_at
        `,
        [slug, newName, original.scope, original.objective_key, original.created_by_user_id]
      )
      const campaign = inserted.rows[0]

      const targets = await client.query(
        `
          SELECT country_code
          FROM campaign_country_targets
          WHERE campaign_id = $1
        `,
        [original.id]
      )
      const countryCodes = targets.rows.map((r) => r.country_code)

      for (const code of countryCodes) {
        await client.query(
          `
            INSERT INTO campaign_country_targets (campaign_id, country_code)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `,
          [campaign.id, code]
        )
      }

      await client.query('COMMIT')
      return res.status(201).json({ ok: true, campaign: { ...campaign, country_codes: countryCodes } })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
      } finally {
        client.release()
      }
    })
  )

  router.post(
    '/:id/generate',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const pool = getPool()
      const campaignId = req.params.id
      if (!isUuid(campaignId)) {
        return jsonError(res, 400, 'Invalid campaign id')
      }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const campaignResult = await client.query(
        `
          SELECT id, name
          FROM campaigns
          WHERE id = $1
        `,
        [campaignId]
      )
      if (campaignResult.rowCount === 0) {
        await client.query('ROLLBACK')
        return jsonError(res, 404, 'Campaign not found')
      }

      const targetsResult = await client.query(
        `
          SELECT country_code
          FROM campaign_country_targets
          WHERE campaign_id = $1
          ORDER BY country_code ASC
        `,
        [campaignId]
      )
      const targets = targetsResult.rows.map((r) => r.country_code)
      if (targets.length === 0) {
        await client.query('ROLLBACK')
        return jsonError(res, 400, 'Campaign has no country targets')
      }

      const created = []
      for (const countryCode of targets) {
        const name = `${campaignResult.rows[0].name} — ${countryCode}`
        const inserted = await client.query(
          `
            INSERT INTO generated_campaigns (campaign_id, country_code, name, status)
            VALUES ($1, $2, $3, 'PAUSED')
            ON CONFLICT (campaign_id, country_code) DO UPDATE SET
              name = EXCLUDED.name
            RETURNING id, campaign_id, country_code, meta_campaign_id, name, status, created_at
          `,
          [campaignId, countryCode, name]
        )
        created.push(inserted.rows[0])
      }

      await client.query('COMMIT')
      return res.status(201).json({ ok: true, generated_campaigns: created })
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
