import { Router } from 'express'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import Busboy from 'busboy'
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

function safeBaseName(name) {
  const raw = normalizeNonEmptyString(name, { maxLen: 140 }) ?? 'file'
  // Keep simple: letters, numbers, dot, dash, underscore.
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-')
  return cleaned || 'file'
}

function getUploadsDir() {
  // backend runs with CWD at repo/backend (docker working_dir=/app)
  return path.resolve('uploads', 'creative-assets')
}

export function creativeAssetsRouter() {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const limit = parseLimit(req.query.limit, 50, 200)
      const pool = getPool()
      const { rows } = await pool.query(
        `
          SELECT id, stored_name, original_name, mime_type, size_bytes, created_at
          FROM creative_assets
          ORDER BY created_at DESC
          LIMIT $1
        `,
        [limit]
      )

      const assets = rows.map((a) => ({
        ...a,
        url: `/uploads/creative-assets/${encodeURIComponent(a.stored_name)}`
      }))

      return res.json({ ok: true, creative_assets: assets })
    })
  )

  router.post(
    '/upload',
    asyncHandler(async (req, res) => {
      if (!req.app.locals.dbEnabled) {
        return jsonError(res, 503, 'Database is not enabled. Set DATABASE_URL.')
      }

      const contentType = req.headers['content-type'] || ''
      if (!String(contentType).includes('multipart/form-data')) {
        return jsonError(res, 400, 'Invalid content-type (expected multipart/form-data)')
      }

      const uploadId = crypto.randomUUID()
      const uploadsDir = getUploadsDir()
      await fsp.mkdir(uploadsDir, { recursive: true })

      const pool = getPool()

      const bb = Busboy({
        headers: req.headers,
        // Supports images and (small/medium) videos; keep a reasonable cap for disk usage.
        limits: { files: 1, fileSize: 200 * 1024 * 1024 } // 200MB
      })

      let done = false
      let fileHandled = false
      let storedName = null
      let originalName = null
      let mimeType = null
      let sizeBytes = 0

      function finishOnce(fn) {
        if (done) return
        done = true
        fn()
      }

      bb.on('file', (fieldname, file, info) => {
        if (fileHandled) {
          file.resume()
          return
        }
        fileHandled = true

        originalName = normalizeNonEmptyString(info?.filename, { maxLen: 240 })
        mimeType = normalizeNonEmptyString(info?.mimeType, { maxLen: 120 })

        const ext = originalName ? path.extname(originalName) : ''
        const baseName = originalName ? path.basename(originalName, ext) : 'asset'
        const base = safeBaseName(baseName)
        storedName = `${uploadId}-${base}${ext || ''}`
        const fullPath = path.join(uploadsDir, storedName)

        const out = fs.createWriteStream(fullPath)
        file.on('data', (chunk) => {
          sizeBytes += chunk.length
        })

        file.on('limit', () => {
          out.destroy(new Error('File too large (max 200MB)'))
        })

        out.on('error', (err) => {
          finishOnce(() => {
            return jsonError(res, 400, err?.message ?? 'Upload failed')
          })
        })

        out.on('finish', async () => {
          try {
            const { rows } = await pool.query(
              `
                INSERT INTO creative_assets (id, stored_name, original_name, mime_type, size_bytes)
                VALUES ($1::uuid, $2, $3, $4, $5)
                RETURNING id, stored_name, original_name, mime_type, size_bytes, created_at
              `,
              [uploadId, storedName, originalName, mimeType, sizeBytes]
            )

            const asset = {
              ...rows[0],
              url: `/uploads/creative-assets/${encodeURIComponent(rows[0].stored_name)}`
            }
            finishOnce(() => res.status(201).json({ ok: true, creative_asset: asset }))
          } catch (err) {
            finishOnce(() => jsonError(res, 500, 'Failed to persist asset', err?.message ?? null))
          }
        })

        file.pipe(out)
      })

      bb.on('error', (err) => {
        finishOnce(() => jsonError(res, 400, err?.message ?? 'Invalid multipart payload'))
      })

      bb.on('finish', () => {
        if (done) return
        if (!fileHandled) {
          finishOnce(() => jsonError(res, 400, 'Missing file field'))
        }
      })

      req.pipe(bb)
    })
  )

  return router
}
