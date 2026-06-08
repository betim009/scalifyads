import { Router } from 'express'
import { countriesRouter } from './countries.js'
import { objectivesRouter } from './objectives.js'
import { campaignsRouter } from './campaigns.js'
import { generatedCampaignsRouter } from './generatedCampaigns.js'
import { metaRouter } from './meta.js'
import { financeRouter } from './finance.js'
import { automationRouter } from './automation.js'
import { schedulerRouter } from './scheduler.js'
import { opsLogsRouter } from './opsLogs.js'
import { creativeAssetsRouter } from './creativeAssets.js'
import { creativeDraftsRouter } from './creativeDrafts.js'
import { creativeTemplatesRouter } from './creativeTemplates.js'
import { countryTemplatesRouter } from './countryTemplates.js'
import { campaignTemplatesRouter } from './campaignTemplates.js'
import { authRouter } from './auth.js'
import { flowTemplatesRouter } from './flowTemplates.js'
import { metaAccountsRouter } from './metaAccounts.js'
import { operationalMarketGenerationsRouter } from './operationalMarketGenerations.js'

export function apiRouter() {
  const router = Router()

  router.get('/', (req, res) => {
    res.json({ ok: true })
  })

  router.use('/countries', countriesRouter())
  router.use('/auth', authRouter())
  router.use('/meta-accounts', metaAccountsRouter())
  router.use('/objectives', objectivesRouter())
  router.use('/campaigns', campaignsRouter())
  router.use('/generated-campaigns', generatedCampaignsRouter())
  router.use('/operational-market-generations', operationalMarketGenerationsRouter())
  router.use('/meta', metaRouter())
  router.use('/finance', financeRouter())
  router.use('/automation', automationRouter())
  router.use('/scheduler', schedulerRouter())
  router.use('/ops-logs', opsLogsRouter())
  router.use('/creative-assets', creativeAssetsRouter())
  router.use('/creative-drafts', creativeDraftsRouter())
  router.use('/creative-templates', creativeTemplatesRouter())
  router.use('/country-templates', countryTemplatesRouter())
  router.use('/campaign-templates', campaignTemplatesRouter())
  router.use('/flow-templates', flowTemplatesRouter())

  return router
}
