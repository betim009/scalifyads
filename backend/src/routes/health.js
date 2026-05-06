import { Router } from 'express'

export function healthRouter() {
  const router = Router()

  router.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true })
  })

  return router
}
