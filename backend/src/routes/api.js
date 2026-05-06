import { Router } from 'express'
import { countriesRouter } from './countries.js'
import { objectivesRouter } from './objectives.js'
import { campaignsRouter } from './campaigns.js'
import { generatedCampaignsRouter } from './generatedCampaigns.js'

export function apiRouter() {
  const router = Router()

  router.get('/', (req, res) => {
    res.json({ ok: true })
  })

  router.use('/countries', countriesRouter())
  router.use('/objectives', objectivesRouter())
  router.use('/campaigns', campaignsRouter())
  router.use('/generated-campaigns', generatedCampaignsRouter())

  return router
}

