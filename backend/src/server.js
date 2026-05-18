import express from 'express'
import path from 'node:path'
import { initDb } from './db.js'
import { startAutomationScheduler } from './scheduler/automationScheduler.js'
import { healthRouter } from './routes/health.js'
import { apiRouter } from './routes/api.js'

const port = Number(process.env.PORT ?? 3001)

const dbStatus = await initDb()

const app = express()
app.locals.dbEnabled = Boolean(dbStatus?.enabled)

startAutomationScheduler(app)

app.use(express.json())

// Dev static uploads (no auth). Never store tokens here.
app.use('/uploads', express.static(path.resolve('uploads')))

// Minimal dev CORS (avoid extra dependency)
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN ?? '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.use(healthRouter())
app.use('/api', apiRouter())

app.use((err, req, res, next) => {
  console.error('[backend] unhandled error', err)
  if (res.headersSent) return next(err)

  const code = err?.code
  if (code === '22P02') {
    return res.status(400).json({ ok: false, error: { message: 'Invalid input' } })
  }
  if (code === '23503') {
    return res.status(400).json({ ok: false, error: { message: 'Invalid reference' } })
  }
  if (code === '23505') {
    return res.status(409).json({ ok: false, error: { message: 'Conflict' } })
  }

  res.status(500).json({ ok: false, error: { message: 'Internal Server Error' } })
})

app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`)
})
