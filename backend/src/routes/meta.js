import path from 'node:path'
import fsp from 'node:fs/promises'
import { Router } from 'express'
import { getPool } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { jsonError } from '../lib/http.js'
import { isUuid } from '../lib/validate.js'
import { syncGeneratedCampaignMetrics } from '../meta/sync.js'
import { metaFetchMe } from '../meta/graph.js'
import { coerceAccessToken, resolveAccessToken } from '../meta/accessToken.js'
import { insertOpsLogBestEffort } from '../ops/opsLogs.js'
import { metaCreateCampaign, metaFetchCampaign, metaListAdAccountCampaigns, metaPauseCampaign } from '../meta/campaigns.js'
import { slugify } from '../lib/slugify.js'
import { metaCreateAdSet, metaCreateAdSetStub, metaFetchAdSet, metaUpdateAdSetDailyBudgetPaused } from '../meta/adsets.js'
import { metaCreateAd, metaCreateAdStub, metaFetchAd, metaFetchAdPreviews } from '../meta/ads.js'
import {
  metaCreateAdCreative,
  metaFetchAdCreative,
  metaFetchAdCreativePreviews,
  metaUploadAdImage,
  metaUploadAdVideo
} from '../meta/creatives.js'
import {
  metaListAdAccountPromotePages,
  metaFetchAdAccountBusiness,
  metaFetchPage,
  metaListBusinessOwnedPages,
  metaListMyBusinesses,
  metaListMyPages
} from '../meta/pages.js'
import { resolveAuthUser } from '../lib/internalAuth.js'

function parseDateOrNull(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return null
  return d.toISOString()
}

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeMetaAdAccountId(value) {
  const raw = normalizeNonEmptyString(value)
  if (!raw) return null
  const stripped = raw.replace(/^act_/, '')
  if (!/^\d+$/.test(stripped)) return null
  return `act_${stripped}`
}

function normalizeLimit(value, { fallback = 50, min = 1, max = 200 } = {}) {
  if (value === undefined || value === null) return fallback
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return fallback
  if (n < min) return min
  if (n > max) return max
  return n
}

function normalizeCountryCode(value) {
  const raw = normalizeNonEmptyString(value)
  if (!raw) return null
  const code = raw.toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  return code
}

function getCreativeUploadsDir() {
  return path.resolve('uploads', 'creative-assets')
}

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

export function metaRouter() {
  const router = Router()

  // P19: attach auth context (if DB is enabled).
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

  async function insertOpsLogBestEffort(pool, entry) {
    try {
      const source = normalizeNonEmptyString(entry?.source) ?? 'meta-test'
      const entity = normalizeNonEmptyString(entry?.entity)
      const action = normalizeNonEmptyString(entry?.action)
      if (!action) return

      const ok = typeof entry?.ok === 'boolean' ? entry.ok : Boolean(entry?.ok)
      const error = normalizeNonEmptyString(entry?.error)

      let details = entry?.details
      if (!details || typeof details !== 'object') details = {}
      let detailsJson = '{}'
      try {
        detailsJson = JSON.stringify(details)
      } catch {
        detailsJson = JSON.stringify({ unserializable: true })
      }

      await pool.query(
        `
          INSERT INTO ops_logs (source, entity, action, ok, error, details, client_at)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        `,
        [source, entity, action, ok, error, detailsJson, null]
      )
    } catch {
      // best-effort
    }
  }

  router.get(
    '/tokens',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const pool = getPool()
      const { rows } = await pool.query(
        `
          SELECT id, user_id, meta_user_id, expires_at, created_at
          FROM meta_tokens
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 5
        `,
        [req.auth.userId]
      )

      return res.json({ ok: true, tokens: rows })
    })
  )

  router.post(
    '/creative-drafts/:id/publish',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const creativeDraftId = req.params.id
      if (!isUuid(creativeDraftId)) {
        return jsonError(res, 400, 'Invalid creative draft id')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      const { rows, rowCount } = await pool.query(
        `
          SELECT
            cd.id,
            cd.generated_campaign_id,
            cd.creative_asset_id,
            cd.primary_text,
            cd.headline,
            cd.description,
            cd.cta_type,
            cd.destination_url,
            cd.status,
            cd.meta_creative_id,
            gc.meta_ad_account_id,
            ca.stored_name AS asset_stored_name,
            ca.original_name AS asset_original_name,
            ca.mime_type AS asset_mime_type
          FROM creative_drafts cd
          JOIN generated_campaigns gc ON gc.id = cd.generated_campaign_id
          LEFT JOIN creative_assets ca ON ca.id = cd.creative_asset_id
          WHERE cd.id = $1
        `,
        [creativeDraftId]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Creative draft not found')
      }

      const draft = rows[0]
      const existing = normalizeNonEmptyString(draft.meta_creative_id)
      if (existing && !existing.startsWith('stub-') && req.body?.force !== true) {
        return jsonError(res, 409, 'Creative draft already has meta_creative_id', { meta_creative_id: existing })
      }

      const metaAdAccountId = normalizeNonEmptyString(draft.meta_ad_account_id)
      if (!metaAdAccountId) {
        return jsonError(res, 400, 'Missing meta_ad_account_id on generated campaign (create Campaign first)')
      }

      const pageId =
        normalizeNonEmptyString(req.body?.pageId) ??
        normalizeNonEmptyString(req.auth?.metaPageId) ??
        normalizeNonEmptyString(process.env.META_PAGE_ID)
      if (!pageId) {
        return jsonError(res, 400, 'Missing pageId (provide body.pageId or META_PAGE_ID env)')
      }

      const instagramActorId =
        normalizeNonEmptyString(req.body?.instagramActorId) ??
        normalizeNonEmptyString(process.env.META_INSTAGRAM_ACTOR_ID)

      const destinationUrl = normalizeNonEmptyString(draft.destination_url)
      if (!destinationUrl) {
        return jsonError(res, 400, 'Missing destination_url on creative draft (set destinationUrl)')
      }

      let imageHash = null
      let videoId = null
      if (normalizeNonEmptyString(draft.creative_asset_id)) {
        const storedName = normalizeNonEmptyString(draft.asset_stored_name)
        if (!storedName) {
          return jsonError(res, 400, 'Creative asset is missing stored_name')
        }
        const fullPath = path.join(getCreativeUploadsDir(), storedName)
        try {
          await fsp.stat(fullPath)
        } catch {
          return jsonError(res, 400, 'Creative asset file not found on disk', { stored_name: storedName })
        }

        const mimeType = normalizeNonEmptyString(draft.asset_mime_type) ?? null
        if (mimeType && mimeType.startsWith('video/')) {
          try {
            const uploaded = await metaUploadAdVideo({
              metaAdAccountId,
              accessToken,
              filePath: fullPath,
              mimeType,
              originalName: draft.asset_original_name ?? storedName
            })
            videoId = uploaded.id
          } catch (err) {
            const status = typeof err?.status === 'number' ? err.status : 502
            return jsonError(res, status, err?.message ?? 'Meta video upload failed', err?.details)
          }
        } else {
          try {
            const uploaded = await metaUploadAdImage({
              metaAdAccountId,
              accessToken,
              filePath: fullPath,
              mimeType,
              originalName: draft.asset_original_name ?? storedName
            })
            imageHash = uploaded.hash
          } catch (err) {
            const status = typeof err?.status === 'number' ? err.status : 502
            return jsonError(res, status, err?.message ?? 'Meta image upload failed', err?.details)
          }
        }
      }

      try {
        const created = await metaCreateAdCreative({
          metaAdAccountId,
          accessToken,
          pageId,
          instagramActorId,
          name: normalizeNonEmptyString(draft.headline) ?? `Creative Draft ${draft.id}`,
          message: normalizeNonEmptyString(draft.primary_text),
          link: destinationUrl,
          headline: normalizeNonEmptyString(draft.headline),
          description: normalizeNonEmptyString(draft.description),
          ctaType: normalizeNonEmptyString(draft.cta_type),
          imageHash,
          videoId
        })

        const client = await pool.connect()
        try {
          await client.query('BEGIN')

          const { rows: updatedRows } = await client.query(
            `
              UPDATE creative_drafts
              SET
                meta_creative_id = $2,
                status = 'meta_published'
              WHERE id = $1
              RETURNING
                id,
                generated_campaign_id,
                creative_asset_id,
                primary_text,
                headline,
                description,
                cta_type,
                destination_url,
                status,
                meta_creative_id,
                created_at
            `,
            [creativeDraftId, String(created?.id ?? '')]
          )

          await client.query(
            `
              UPDATE generated_campaigns
              SET
                ops_last_action = 'creative.publish',
                ops_last_ok = true,
                ops_last_at = now()
              WHERE id = $1
            `,
            [draft.generated_campaign_id]
          )

          await client.query('COMMIT')

          void insertOpsLogBestEffort(pool, {
            source: 'meta-test',
            entity: 'creative',
            action: 'creative.publish',
            ok: true,
            details: {
              creative_draft_id: creativeDraftId,
              generated_campaign_id: draft.generated_campaign_id,
              meta_creative_id: normalizeNonEmptyString(created?.id) ?? null,
              image_hash: imageHash
            }
          })

          return res.status(201).json({ ok: true, meta_creative: created, creative_draft: updatedRows[0] })
        } catch (err) {
          await client.query('ROLLBACK')
          throw err
        } finally {
          client.release()
        }

      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        void insertOpsLogBestEffort(pool, {
          source: 'meta-test',
          entity: 'creative',
          action: 'creative.publish',
          ok: false,
          error: err?.message ? String(err.message) : 'Meta ad creative creation failed',
          details: {
            creative_draft_id: creativeDraftId,
            generated_campaign_id: draft.generated_campaign_id,
            status,
            meta_error: err?.details ?? null
          }
        })
        return jsonError(res, status, err?.message ?? 'Meta ad creative creation failed', err?.details)
      }
    })
  )

  router.get(
    '/creatives/:id',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const metaCreativeId = normalizeNonEmptyString(req.params.id)
      if (!metaCreativeId) {
        return jsonError(res, 400, 'Invalid meta creative id')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const creative = await metaFetchAdCreative({ metaCreativeId, accessToken })
        return res.json({ ok: true, meta_creative: creative })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta creative fetch failed', err?.details)
      }
    })
  )

  router.get(
    '/creatives/:id/previews',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const metaCreativeId = normalizeNonEmptyString(req.params.id)
      if (!metaCreativeId) {
        return jsonError(res, 400, 'Invalid meta creative id')
      }

      const adFormat =
        normalizeNonEmptyString(req.query?.adFormat) ??
        normalizeNonEmptyString(req.query?.ad_format) ??
        'DESKTOP_FEED_STANDARD'

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const previews = await metaFetchAdCreativePreviews({ metaCreativeId, accessToken, adFormat })
        return res.json({ ok: true, ad_format: adFormat, meta_previews: previews })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta creative previews fetch failed', err?.details)
      }
    })
  )

  router.get(
    '/pages',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const dbEnabled = Boolean(req.app.locals.dbEnabled)
      const pool = dbEnabled ? getPool() : null
      const accessToken = dbEnabled
        ? await resolveAccessToken(pool, req)
        : coerceAccessToken(process.env.META_ACCESS_TOKEN)

      if (!accessToken) {
        return jsonError(res, 400, 'Missing accessToken (set META_ACCESS_TOKEN env or save via /tokens)')
      }

      const metaAdAccountId =
        normalizeMetaAdAccountId(req.query?.metaAdAccountId) ?? normalizeMetaAdAccountId(req.auth?.metaAdAccountId)
      const limit = normalizeLimit(req.query?.limit, { fallback: 50, min: 1, max: 200 })

      try {
        const myPages = await metaListMyPages({ accessToken, limit })
        const promotePages = metaAdAccountId
          ? await metaListAdAccountPromotePages({ metaAdAccountId, accessToken, limit })
          : []

        const businesses = await metaListMyBusinesses({ accessToken, limit })
        const ownedPagesByBusiness = []
        for (const b of businesses) {
          try {
            const pages = await metaListBusinessOwnedPages({ businessId: b.id, accessToken, limit })
            ownedPagesByBusiness.push({ business_id: b.id, business_name: b.name ?? null, pages })
          } catch {
            ownedPagesByBusiness.push({ business_id: b.id, business_name: b.name ?? null, pages: [] })
          }
        }

        let adAccountBusiness = null
        let ownedPagesFromAdAccountBusiness = []
        if (metaAdAccountId) {
          try {
            adAccountBusiness = await metaFetchAdAccountBusiness({ metaAdAccountId, accessToken })
            if (adAccountBusiness?.id) {
              ownedPagesFromAdAccountBusiness = await metaListBusinessOwnedPages({
                businessId: adAccountBusiness.id,
                accessToken,
                limit
              })
            }
          } catch {
            adAccountBusiness = null
            ownedPagesFromAdAccountBusiness = []
          }
        }

        return res.json({
          ok: true,
          meta_ad_account_id: metaAdAccountId,
          my_pages: myPages,
          promote_pages: promotePages,
          businesses,
          owned_pages_by_business: ownedPagesByBusiness,
          ad_account_business: adAccountBusiness,
          owned_pages_from_ad_account_business: ownedPagesFromAdAccountBusiness
        })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta pages fetch failed', err?.details)
      }
    })
  )

  router.get(
    '/pages/:id',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const dbEnabled = Boolean(req.app.locals.dbEnabled)
      const pool = dbEnabled ? getPool() : null
      const accessToken = dbEnabled
        ? await resolveAccessToken(pool, req)
        : coerceAccessToken(process.env.META_ACCESS_TOKEN)

      if (!accessToken) {
        return jsonError(res, 400, 'Missing accessToken (set META_ACCESS_TOKEN env or save via /tokens)')
      }

      const metaPageId = normalizeNonEmptyString(req.params.id)
      if (!metaPageId) {
        return jsonError(res, 400, 'Invalid metaPageId')
      }

      try {
        const page = await metaFetchPage({ metaPageId, accessToken, fields: ['id', 'name'] })
        return res.json({ ok: true, meta_page: page })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta page fetch failed', err?.details)
      }
    })
  )

  router.get(
    '/diagnostics',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const dbEnabled = Boolean(req.app.locals.dbEnabled)
      const pool = dbEnabled ? getPool() : null
      const accessToken = dbEnabled
        ? await resolveAccessToken(pool, req)
        : coerceAccessToken(process.env.META_ACCESS_TOKEN)

      if (!accessToken) {
        return jsonError(res, 400, 'Missing accessToken (set META_ACCESS_TOKEN env or save via /tokens)')
      }

      try {
        const me = await metaFetchMe({ accessToken, fields: ['id', 'name', 'permissions'] })
        return res.json({
          ok: true,
          db_enabled: dbEnabled,
          me
        })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta diagnostics failed', err?.details)
      }
    })
  )

  router.post(
    '/tokens',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const metaUserId =
        typeof req.body?.metaUserId === 'string' && req.body.metaUserId.trim()
          ? req.body.metaUserId.trim()
          : null

      const accessToken = coerceAccessToken(req.body?.accessToken)
      if (!accessToken) {
        return jsonError(res, 400, 'Invalid accessToken')
      }

      const expiresAt = parseDateOrNull(req.body?.expiresAt)
      if (req.body?.expiresAt && !expiresAt) {
        return jsonError(res, 400, 'Invalid expiresAt (expected ISO date string)')
      }

      const pool = getPool()
      const { rows } = await pool.query(
        `
          INSERT INTO meta_tokens (user_id, meta_user_id, access_token, expires_at)
          VALUES ($1::uuid, $2, $3, $4::timestamptz)
          RETURNING id, user_id, meta_user_id, expires_at, created_at
        `,
        [req.auth.userId, metaUserId, accessToken, expiresAt]
      )

      return res.status(201).json({ ok: true, token: rows[0] })
    })
  )

  router.post(
    '/validate',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const dbEnabled = Boolean(req.app.locals.dbEnabled)
      const pool = dbEnabled ? getPool() : null
      const accessToken = dbEnabled
        ? await resolveAccessToken(pool, req)
        : coerceAccessToken(process.env.META_ACCESS_TOKEN)

      if (!accessToken) {
        return jsonError(
          res,
          400,
          dbEnabled
            ? 'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
            : 'Missing accessToken (set META_ACCESS_TOKEN env; DB is disabled)'
        )
      }

      try {
        const me = await metaFetchMe({ accessToken })
        return res.json({ ok: true, me })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta Graph validation failed', err?.details)
      }
    })
  )

  router.get(
    '/status',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const dbEnabled = Boolean(req.app.locals.dbEnabled)
      const pool = dbEnabled ? getPool() : null
      const accessToken = dbEnabled
        ? await resolveAccessToken(pool, req)
        : coerceAccessToken(process.env.META_ACCESS_TOKEN)

      return res.json({
        ok: true,
        db_enabled: dbEnabled,
        provider: process.env.META_SYNC_PROVIDER ?? null,
        graph_version: process.env.META_GRAPH_VERSION ?? null,
        has_access_token: Boolean(accessToken),
        has_page_id: Boolean(
          normalizeNonEmptyString(req.auth?.metaPageId) ?? normalizeNonEmptyString(process.env.META_PAGE_ID)
        ),
        has_instagram_actor_id: Boolean(normalizeNonEmptyString(process.env.META_INSTAGRAM_ACTOR_ID))
      })
    })
  )

  router.post(
    '/sync/generated-campaigns/:id',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const generatedCampaignId = req.params.id
      if (!isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generated campaign id')
      }

      const startDate = typeof req.body?.startDate === 'string' ? req.body.startDate : null
      const endDate = typeof req.body?.endDate === 'string' ? req.body.endDate : null

      const pool = getPool()
      const gc = await pool.query(
        `
          SELECT id, meta_campaign_id
          FROM generated_campaigns
          WHERE id = $1
        `,
        [generatedCampaignId]
      )

      if (gc.rowCount === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      const metaCampaignId = gc.rows[0].meta_campaign_id
      if (typeof metaCampaignId !== 'string' || !metaCampaignId.trim()) {
        return jsonError(res, 400, 'Generated campaign is not published (missing meta_campaign_id)')
      }

      const accessToken = await resolveAccessToken(pool, req)
      try {
        const result = await syncGeneratedCampaignMetrics({
          pool,
          generatedCampaignId,
          metaCampaignId: metaCampaignId.trim(),
          accessToken,
          startDate,
          endDate
        })

        await insertOpsLogBestEffort(pool, {
          source: 'meta-sync',
          entity: 'metrics',
          action: 'meta.metrics.sync',
          ok: true,
          details: {
            generatedCampaignId,
            metaCampaignId: metaCampaignId.trim(),
            provider: result?.provider ?? null,
            inserted: result?.inserted ?? null,
            updated: result?.updated ?? null,
            since: result?.since ?? null,
            until: result?.until ?? null,
            reason: result?.reason ?? null,
            startDate: startDate ?? null,
            endDate: endDate ?? null
          }
        })

        return res.json({ ok: true, sync: result })
      } catch (err) {
        await insertOpsLogBestEffort(pool, {
          source: 'meta-sync',
          entity: 'metrics',
          action: 'meta.metrics.sync',
          ok: false,
          error: err?.message ? String(err.message) : 'Meta sync failed',
          details: {
            generatedCampaignId,
            metaCampaignId: metaCampaignId.trim(),
            status: typeof err?.status === 'number' ? err.status : null,
            startDate: startDate ?? null,
            endDate: endDate ?? null
          }
        })
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta sync failed', err?.details)
      }
    })
  )

  router.post(
    '/campaigns',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const generatedCampaignId = req.body?.generatedCampaignId
      if (typeof generatedCampaignId !== 'string' || !isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generatedCampaignId')
      }

      const metaAdAccountId = normalizeMetaAdAccountId(req.body?.metaAdAccountId)
      if (!metaAdAccountId) {
        return jsonError(res, 400, 'Invalid metaAdAccountId (expected act_<digits>)')
      }

      const pool = getPool()

      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      const { rows: gcRows, rowCount } = await pool.query(
        `
          SELECT
            gc.id,
            gc.name,
            gc.meta_campaign_id,
            c.objective_key,
            o.meta_value AS objective_meta_value
          FROM generated_campaigns gc
          JOIN campaigns c ON c.id = gc.campaign_id
          LEFT JOIN campaign_objectives o ON o.key = c.objective_key
          WHERE gc.id = $1
        `,
        [generatedCampaignId]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      const gc = gcRows[0]
      const existing = normalizeNonEmptyString(gc.meta_campaign_id)
      if (existing && !existing.startsWith('stub-') && req.body?.force !== true) {
        return jsonError(res, 409, 'Generated campaign already has meta_campaign_id', {
          meta_campaign_id: existing
        })
      }

      const objective =
        normalizeNonEmptyString(gc.objective_meta_value) ?? normalizeNonEmptyString(req.body?.objective)
      if (!objective) {
        return jsonError(res, 400, 'Missing objective (set campaign objective or provide body.objective)')
      }

      let metaUserId = normalizeNonEmptyString(req.body?.metaUserId)
      if (!metaUserId) {
        try {
          const me = await metaFetchMe({ accessToken })
          metaUserId = normalizeNonEmptyString(me?.id)
        } catch (err) {
          const status = typeof err?.status === 'number' ? err.status : 502
          return jsonError(res, status, err?.message ?? 'Meta Graph validation failed', err?.details)
        }
      }

      try {
        const created = await metaCreateCampaign({
          metaAdAccountId,
          name: gc.name,
          objective,
          accessToken
        })

        const updated = await pool.query(
          `
            UPDATE generated_campaigns
            SET
              meta_campaign_id = $2,
              meta_run_mode = 'REAL',
              meta_ad_account_id = $3,
              meta_user_id = $4,
              meta_status = $5,
              meta_effective_status = $6,
              meta_objective = $7,
              ops_last_action = 'campaign.create',
              ops_last_ok = true,
              ops_last_at = now()
            WHERE id = $1
            RETURNING
              id,
              campaign_id,
              country_code,
              meta_campaign_id,
              meta_run_mode,
              meta_ad_account_id,
              meta_user_id,
              meta_status,
              meta_effective_status,
              meta_objective,
              name,
              status,
              created_at
          `,
          [
            generatedCampaignId,
            String(created.id),
            metaAdAccountId,
            metaUserId,
            normalizeNonEmptyString(created?.status),
            normalizeNonEmptyString(created?.effective_status),
            normalizeNonEmptyString(created?.objective)
          ]
        )

        return res.status(201).json({
          ok: true,
          meta_campaign: created,
          generated_campaign: updated.rows[0]
        })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta campaign creation failed', err?.details)
      }
    })
  )

  router.post(
    '/campaigns/simple',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const name = normalizeNonEmptyString(req.body?.name)
      if (!name) {
        return jsonError(res, 400, 'Invalid name')
      }

      const objective = normalizeNonEmptyString(req.body?.objective)
      if (!objective) {
        return jsonError(res, 400, 'Missing objective')
      }

      const countryCode = normalizeCountryCode(req.body?.countryCode)
      if (!countryCode) {
        return jsonError(res, 400, 'Invalid countryCode (expected ISO-2)')
      }

      const metaAdAccountId =
        normalizeMetaAdAccountId(req.body?.metaAdAccountId) ?? normalizeMetaAdAccountId(req.auth?.metaAdAccountId)
      if (!metaAdAccountId) {
        return jsonError(res, 400, 'Invalid metaAdAccountId (expected act_<digits>)')
      }

      const modeRaw = normalizeNonEmptyString(req.body?.mode)
      const mode = modeRaw === 'STUB' ? 'STUB' : 'REAL'

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)

      if (mode === 'REAL' && !accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      const country = await pool.query('SELECT code FROM countries WHERE code = $1', [countryCode])
      if (country.rowCount === 0) {
        return jsonError(res, 400, 'Unknown countryCode (not in countries table)')
      }

      let metaUserId = normalizeNonEmptyString(req.body?.metaUserId)
      if (!metaUserId && mode === 'REAL') {
        try {
          const me = await metaFetchMe({ accessToken })
          metaUserId = normalizeNonEmptyString(me?.id)
        } catch (err) {
          const status = typeof err?.status === 'number' ? err.status : 502
          return jsonError(res, status, err?.message ?? 'Meta Graph validation failed', err?.details)
        }
      }

      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const slug = await createUniqueSlug(client, name)
        const insertedCampaign = await client.query(
          `
            INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
            VALUES ($1, $2, 'draft', 'global', NULL, $3::uuid, '{}'::jsonb)
            RETURNING id, slug, name, status, scope, objective_key, created_by_user_id, config, created_at
          `,
          [slug, name, req.auth.userId]
        )

        const campaign = insertedCampaign.rows[0]

        await client.query(
          `
            INSERT INTO campaign_country_targets (campaign_id, country_code)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `,
          [campaign.id, countryCode]
        )

        const generatedName = `${name} — ${countryCode}`
        const insertedGenerated = await client.query(
          `
            INSERT INTO generated_campaigns (campaign_id, country_code, name, status)
            VALUES ($1, $2, $3, 'PAUSED')
            RETURNING
              id,
              campaign_id,
              country_code,
              meta_campaign_id,
              meta_run_mode,
              meta_ad_account_id,
              meta_user_id,
              meta_status,
              meta_effective_status,
              meta_objective,
              name,
              status,
              created_at
          `,
          [campaign.id, countryCode, generatedName]
        )

        const generated = insertedGenerated.rows[0]

        let created = null
        if (mode === 'REAL') {
          created = await metaCreateCampaign({
            metaAdAccountId,
            name: generated.name,
            objective,
            accessToken
          })
        } else {
          created = {
            id: `stub-${generated.id}`,
            name: generated.name,
            status: 'PAUSED',
            effective_status: 'PAUSED',
            objective
          }
        }

        const updated = await client.query(
          `
            UPDATE generated_campaigns
            SET
              meta_campaign_id = $2,
              meta_run_mode = $8,
              meta_ad_account_id = $3,
              meta_user_id = $4,
              meta_status = $5,
              meta_effective_status = $6,
              meta_objective = $7,
              ops_last_action = 'campaign.create.simple',
              ops_last_ok = true,
              ops_last_at = now()
            WHERE id = $1
            RETURNING
              id,
              campaign_id,
              country_code,
              meta_campaign_id,
              meta_run_mode,
              meta_ad_account_id,
              meta_user_id,
              meta_status,
              meta_effective_status,
              meta_objective,
              name,
              status,
              created_at
          `,
          [
            generated.id,
            String(created.id),
            metaAdAccountId,
            metaUserId,
            normalizeNonEmptyString(created?.status),
            normalizeNonEmptyString(created?.effective_status),
            normalizeNonEmptyString(created?.objective),
            mode
          ]
        )

        await client.query('COMMIT')
        return res.status(201).json({
          ok: true,
          mode,
          meta_campaign: created,
          campaign,
          generated_campaign: updated.rows[0]
        })
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    })
  )

  router.post(
    '/adsets',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const generatedCampaignId = req.body?.generatedCampaignId
      if (typeof generatedCampaignId !== 'string' || !isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generatedCampaignId')
      }

      const name = normalizeNonEmptyString(req.body?.name)
      if (!name) {
        return jsonError(res, 400, 'Invalid name')
      }

      const dailyBudgetCents = Number(req.body?.dailyBudgetCents)
      if (!Number.isFinite(dailyBudgetCents) || Math.trunc(dailyBudgetCents) <= 0) {
        return jsonError(res, 400, 'Invalid dailyBudgetCents (expected positive integer)')
      }

      const billingEvent = normalizeNonEmptyString(req.body?.billingEvent)
      if (!billingEvent) {
        return jsonError(res, 400, 'Missing billingEvent')
      }

      const optimizationGoal = normalizeNonEmptyString(req.body?.optimizationGoal)
      if (!optimizationGoal) {
        return jsonError(res, 400, 'Missing optimizationGoal')
      }

      const bidStrategyRaw = normalizeNonEmptyString(req.body?.bidStrategy)
      const bidStrategy = bidStrategyRaw ?? null
      const bidAmountRaw = req.body?.bidAmount
      const bidAmount = bidAmountRaw === undefined || bidAmountRaw === null ? null : Number(bidAmountRaw)
      const bidConstraints = req.body?.bidConstraints ?? null

      const modeRaw = normalizeNonEmptyString(req.body?.mode)
      const mode = modeRaw === 'STUB' ? 'STUB' : 'REAL'

      const pool = getPool()
      const { rows: gcRows, rowCount } = await pool.query(
        `
          SELECT
            id,
            country_code,
            meta_campaign_id,
            meta_ad_account_id,
            meta_adset_id
          FROM generated_campaigns
          WHERE id = $1
        `,
        [generatedCampaignId]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      const gc = gcRows[0]
      const metaCampaignId = normalizeNonEmptyString(gc.meta_campaign_id)
      if (!metaCampaignId) {
        return jsonError(res, 400, 'Generated campaign is not linked to Meta (missing meta_campaign_id)')
      }

      const metaAdAccountId =
        normalizeNonEmptyString(gc.meta_ad_account_id) ??
        normalizeMetaAdAccountId(req.body?.metaAdAccountId) ??
        normalizeMetaAdAccountId(req.auth?.metaAdAccountId)
      if (!metaAdAccountId) {
        return jsonError(res, 400, 'Missing metaAdAccountId (expected act_<digits>)')
      }

      const accessToken = await resolveAccessToken(pool, req)
      if (mode === 'REAL' && !accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      const countryCode = normalizeCountryCode(gc.country_code) ?? normalizeCountryCode(req.body?.countryCode)
      if (!countryCode) {
        return jsonError(res, 400, 'Missing countryCode')
      }

      try {
        const created =
          mode === 'REAL'
            ? await metaCreateAdSet({
                metaAdAccountId,
                metaCampaignId,
                name,
                countryCode,
                dailyBudgetCents: Math.trunc(dailyBudgetCents),
                billingEvent,
                optimizationGoal,
                bidStrategy: bidStrategy ?? 'LOWEST_COST_WITHOUT_CAP',
                bidAmount,
                bidConstraints,
                accessToken
              })
            : metaCreateAdSetStub({ stubId: `stub-adset-${generatedCampaignId}`, name, campaign_id: metaCampaignId })

        const client = await pool.connect()
        try {
          await client.query('BEGIN')

          const updated = await client.query(
            `
              UPDATE generated_campaigns
              SET
                meta_adset_id = $2,
                meta_adset_status = $3,
                meta_adset_effective_status = $4,
                meta_run_mode = $5,
                ops_last_action = 'adset.create',
                ops_last_ok = true,
                ops_last_at = now()
              WHERE id = $1
              RETURNING
                id,
                campaign_id,
                country_code,
                meta_campaign_id,
                meta_run_mode,
                meta_ad_account_id,
                meta_user_id,
                meta_status,
                meta_effective_status,
                meta_objective,
                meta_adset_id,
                meta_adset_status,
                meta_adset_effective_status,
                meta_ad_id,
                meta_ad_status,
                meta_ad_effective_status,
                name,
                status,
                created_at
            `,
            [
              generatedCampaignId,
              String(created.id),
              normalizeNonEmptyString(created?.status),
              normalizeNonEmptyString(created?.effective_status),
              mode
            ]
          )

          await client.query(
            `
              INSERT INTO generated_adsets (
                generated_campaign_id,
                meta_adset_id,
                name,
                run_mode,
                status,
                effective_status
              )
              VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              generatedCampaignId,
              String(created.id),
              name,
              mode,
              normalizeNonEmptyString(created?.status) ?? 'PAUSED',
              normalizeNonEmptyString(created?.effective_status)
            ]
          )

          await client.query('COMMIT')
          return res.status(201).json({ ok: true, mode, meta_adset: created, generated_campaign: updated.rows[0] })
        } catch (err) {
          await client.query('ROLLBACK')
          throw err
        } finally {
          client.release()
        }
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta ad set creation failed', err?.details)
      }
    })
  )

  router.post(
    '/ads',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const generatedCampaignId = req.body?.generatedCampaignId
      if (typeof generatedCampaignId !== 'string' || !isUuid(generatedCampaignId)) {
        return jsonError(res, 400, 'Invalid generatedCampaignId')
      }

      const name = normalizeNonEmptyString(req.body?.name)
      if (!name) {
        return jsonError(res, 400, 'Invalid name')
      }

      const modeRaw = normalizeNonEmptyString(req.body?.mode)
      const mode = modeRaw === 'STUB' ? 'STUB' : 'REAL'

      const creativeDraftId = normalizeNonEmptyString(req.body?.creativeDraftId)
      if (creativeDraftId && !isUuid(creativeDraftId)) {
        return jsonError(res, 400, 'Invalid creativeDraftId')
      }

      let creativeId = normalizeNonEmptyString(req.body?.creativeId)

      const pool = getPool()
      const { rows: gcRows, rowCount } = await pool.query(
        `
          SELECT
            id,
            meta_ad_account_id,
            meta_adset_id
          FROM generated_campaigns
          WHERE id = $1
        `,
        [generatedCampaignId]
      )

      if (rowCount === 0) {
        return jsonError(res, 404, 'Generated campaign not found')
      }

      const gc = gcRows[0]
      const metaAdAccountId =
        normalizeNonEmptyString(gc.meta_ad_account_id) ??
        normalizeMetaAdAccountId(req.body?.metaAdAccountId) ??
        normalizeMetaAdAccountId(req.auth?.metaAdAccountId)
      if (!metaAdAccountId) {
        return jsonError(res, 400, 'Missing metaAdAccountId (expected act_<digits>)')
      }

      const metaAdSetId = normalizeNonEmptyString(gc.meta_adset_id)
      if (!metaAdSetId) {
        return jsonError(res, 400, 'Missing meta_adset_id (create AdSet first)')
      }

      let creativeIdSource = creativeId ? 'body' : null

      if (mode === 'REAL' && !creativeId && creativeDraftId) {
        const { rows: draftRows, rowCount: draftCount } = await pool.query(
          `
            SELECT meta_creative_id
            FROM creative_drafts
            WHERE id = $1 AND generated_campaign_id = $2
          `,
          [creativeDraftId, generatedCampaignId]
        )

        if (draftCount === 0) {
          return jsonError(res, 400, 'creativeDraftId not found for generatedCampaignId')
        }

        const fromDraft = normalizeNonEmptyString(draftRows?.[0]?.meta_creative_id)
        if (fromDraft && !fromDraft.startsWith('stub-')) {
          creativeId = fromDraft
          creativeIdSource = 'draft'
        }
      }

      if (mode === 'REAL' && !creativeId) {
        return jsonError(
          res,
          400,
          'Missing creativeId (provide body.creativeId, or send creativeDraftId with meta_creative_id already published on the draft)',
          { creative_draft_id: creativeDraftId ?? null }
        )
      }

      const accessToken = await resolveAccessToken(pool, req)
      if (mode === 'REAL' && !accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const created =
          mode === 'REAL'
            ? await metaCreateAd({
                metaAdAccountId,
                metaAdSetId,
                name,
                creativeId,
                accessToken
              })
            : metaCreateAdStub({ stubId: `stub-ad-${generatedCampaignId}`, name, adset_id: metaAdSetId })

        const client = await pool.connect()
        try {
          await client.query('BEGIN')

          const updated = await client.query(
            `
              UPDATE generated_campaigns
              SET
                meta_ad_id = $2,
                meta_ad_status = $3,
                meta_ad_effective_status = $4,
                meta_run_mode = $5,
                ops_last_action = 'ad.create',
                ops_last_ok = true,
                ops_last_at = now()
              WHERE id = $1
              RETURNING
                id,
                campaign_id,
                country_code,
                meta_campaign_id,
                meta_run_mode,
                meta_ad_account_id,
                meta_user_id,
                meta_status,
                meta_effective_status,
                meta_objective,
                meta_adset_id,
                meta_adset_status,
                meta_adset_effective_status,
                meta_ad_id,
                meta_ad_status,
                meta_ad_effective_status,
                name,
                status,
                created_at
            `,
            [
              generatedCampaignId,
              String(created.id),
              normalizeNonEmptyString(created?.status),
              normalizeNonEmptyString(created?.effective_status),
              mode
            ]
          )

          const { rows: gaRows } = await client.query(
            `
              SELECT id
              FROM generated_adsets
              WHERE generated_campaign_id = $1 AND meta_adset_id = $2
              ORDER BY created_at DESC
              LIMIT 1
            `,
            [generatedCampaignId, metaAdSetId]
          )
          const generatedAdSetRowId = gaRows?.[0]?.id ?? null

          await client.query(
            `
              INSERT INTO generated_ads (
                generated_campaign_id,
                generated_adset_id,
                creative_draft_id,
                meta_ad_id,
                name,
                run_mode,
                status,
                effective_status
              )
              VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8)
            `,
            [
              generatedCampaignId,
              generatedAdSetRowId,
              creativeDraftId,
              String(created.id),
              name,
              mode,
              normalizeNonEmptyString(created?.status) ?? 'PAUSED',
              normalizeNonEmptyString(created?.effective_status)
            ]
          )

          await client.query('COMMIT')
          return res
            .status(201)
            .json({ ok: true, mode, creative_id_source: creativeIdSource, meta_ad: created, generated_campaign: updated.rows[0] })
        } catch (err) {
          await client.query('ROLLBACK')
          throw err
        } finally {
          client.release()
        }
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta ad creation failed', err?.details)
      }
    })
  )

  router.get(
    '/campaigns/:id',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const metaCampaignId = normalizeNonEmptyString(req.params.id)
      if (!metaCampaignId) {
        return jsonError(res, 400, 'Invalid meta campaign id')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const campaign = await metaFetchCampaign({ metaCampaignId, accessToken })
        return res.json({ ok: true, meta_campaign: campaign })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta campaign fetch failed', err?.details)
      }
    })
  )

  // P22 — ROI operacional mínimo: ações seguras (nunca ACTIVE)
  router.post(
    '/campaigns/:id/pause',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const metaCampaignId = normalizeNonEmptyString(req.params.id)
      if (!metaCampaignId) {
        return jsonError(res, 400, 'Invalid meta campaign id')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const paused = await metaPauseCampaign({ metaCampaignId, accessToken })

        insertOpsLogBestEffort(pool, {
          source: 'roi-operational',
          entity: 'meta.campaign',
          action: 'meta.campaign.pause',
          ok: true,
          details: { metaCampaignId }
        })

        return res.json({ ok: true, meta_campaign: paused })
      } catch (err) {
        insertOpsLogBestEffort(pool, {
          source: 'roi-operational',
          entity: 'meta.campaign',
          action: 'meta.campaign.pause',
          ok: false,
          error: err?.message ?? 'Meta campaign pause failed',
          details: { metaCampaignId, details: err?.details ?? null, status: err?.status ?? null }
        })
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta campaign pause failed', err?.details)
      }
    })
  )

  router.get(
    '/adsets/:id',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const metaAdSetId = normalizeNonEmptyString(req.params.id)
      if (!metaAdSetId) {
        return jsonError(res, 400, 'Invalid meta ad set id')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const adset = await metaFetchAdSet({ metaAdSetId, accessToken })
        return res.json({ ok: true, meta_adset: adset })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta ad set fetch failed', err?.details)
      }
    })
  )

  router.post(
    '/adsets/:id/budget',
    asyncHandler(async (req, res) => {
      const denied = requireAuth(req, res)
      if (denied) return denied

      const metaAdSetId = normalizeNonEmptyString(req.params.id)
      if (!metaAdSetId) {
        return jsonError(res, 400, 'Invalid meta ad set id')
      }

      const dailyBudgetCents = req.body?.dailyBudgetCents

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const updated = await metaUpdateAdSetDailyBudgetPaused({
          metaAdSetId,
          dailyBudgetCents,
          accessToken
        })

        insertOpsLogBestEffort(pool, {
          source: 'roi-operational',
          entity: 'meta.adset',
          action: 'meta.adset.budget.update',
          ok: true,
          details: { metaAdSetId, dailyBudgetCents: Number(dailyBudgetCents) }
        })

        return res.json({ ok: true, meta_adset: updated })
      } catch (err) {
        insertOpsLogBestEffort(pool, {
          source: 'roi-operational',
          entity: 'meta.adset',
          action: 'meta.adset.budget.update',
          ok: false,
          error: err?.message ?? 'Meta ad set budget update failed',
          details: { metaAdSetId, dailyBudgetCents, details: err?.details ?? null, status: err?.status ?? null }
        })
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta ad set budget update failed', err?.details)
      }
    })
  )

  router.get(
    '/ads/:id',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const metaAdId = normalizeNonEmptyString(req.params.id)
      if (!metaAdId) {
        return jsonError(res, 400, 'Invalid meta ad id')
      }

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const ad = await metaFetchAd({ metaAdId, accessToken })
        return res.json({ ok: true, meta_ad: ad })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta ad fetch failed', err?.details)
      }
    })
  )

  router.get(
    '/ads/:id/previews',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const metaAdId = normalizeNonEmptyString(req.params.id)
      if (!metaAdId) {
        return jsonError(res, 400, 'Invalid meta ad id')
      }

      const adFormat =
        normalizeNonEmptyString(req.query?.adFormat) ??
        normalizeNonEmptyString(req.query?.ad_format) ??
        'DESKTOP_FEED_STANDARD'

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const previews = await metaFetchAdPreviews({ metaAdId, accessToken, adFormat })
        return res.json({ ok: true, ad_format: adFormat, meta_previews: previews })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta ad previews fetch failed', err?.details)
      }
    })
  )

  router.get(
    '/ad-accounts/:id/campaigns',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const metaAdAccountId = normalizeMetaAdAccountId(req.params.id)
      if (!metaAdAccountId) {
        return jsonError(res, 400, 'Invalid meta ad account id (expected act_<digits>)')
      }

      const pausedOnly = req.query.pausedOnly === undefined ? true : String(req.query.pausedOnly) !== 'false'
      const limitRaw = req.query.limit
      const limit = typeof limitRaw === 'string' && limitRaw.trim() ? Number(limitRaw) : 50

      const pool = getPool()
      const accessToken = await resolveAccessToken(pool, req)
      if (!accessToken) {
        return jsonError(
          res,
          400,
          'Missing accessToken (provide body.accessToken, META_ACCESS_TOKEN, or save via /tokens)'
        )
      }

      try {
        const campaigns = await metaListAdAccountCampaigns({
          metaAdAccountId,
          accessToken,
          limit,
          effectiveStatus: pausedOnly ? ['PAUSED'] : []
        })
        return res.json({ ok: true, meta_campaigns: campaigns })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 502
        return jsonError(res, status, err?.message ?? 'Meta ad account campaigns fetch failed', err?.details)
      }
    })
  )

  return router
}
