import express from 'express'
import { initDb } from './db.js'
import { healthRouter } from './routes/health.js'

const port = Number(process.env.PORT ?? 3001)

await initDb()

const app = express()

app.use(express.json())
app.use(healthRouter())

app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`)
})
