function normalizeNonEmptyString(value, { maxLen } = {}) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return maxLen && trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed
}

function normalizeOptionalObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function readTemplateId(campaignConfig) {
  return normalizeNonEmptyString(campaignConfig.templateId) ?? normalizeNonEmptyString(campaignConfig.template_id)
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = normalizeNonEmptyString(value)
    if (normalized) return normalized
  }
  return null
}

function resolveMarketCreativeInput({ row, campaignConfig, templatePayload, body } = {}) {
  const marketCode = normalizeNonEmptyString(row?.market_code)
  const payload = normalizeOptionalObject(templatePayload)
  const translationsByMarket = normalizeOptionalObject(payload.translationsByMarket)
  const marketTranslation = normalizeOptionalObject(translationsByMarket?.[marketCode])
  const translatedVariants = Array.isArray(marketTranslation.adVariants)
    ? marketTranslation.adVariants.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    : []
  const baseVariants = Array.isArray(payload.adVariants)
    ? payload.adVariants.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    : []
  const variant = translatedVariants[0] ?? baseVariants[0] ?? {}
  const payloadCreative = normalizeOptionalObject(payload.creative)
  const bodyInput = normalizeOptionalObject(body)

  return {
    pageId: firstNonEmpty(
      bodyInput.pageId,
      bodyInput.page_id,
      campaignConfig.pageId,
      campaignConfig.page_id,
      campaignConfig.metaPageId,
      campaignConfig.meta_page_id,
      payloadCreative.pageId,
      payloadCreative.page_id,
      payloadCreative.metaPageId,
      payloadCreative.meta_page_id,
      payload.pageId,
      payload.page_id
    ),
    instagramActorId: firstNonEmpty(
      bodyInput.instagramActorId,
      bodyInput.instagram_actor_id,
      campaignConfig.instagramActorId,
      campaignConfig.instagram_actor_id,
      payloadCreative.instagramActorId,
      payloadCreative.instagram_actor_id
    ),
    primaryText: firstNonEmpty(
      bodyInput.primaryText,
      bodyInput.primary_text,
      variant.primaryText,
      variant.primary_text,
      payloadCreative.primaryText,
      payloadCreative.primary_text
    ),
    headline: firstNonEmpty(
      bodyInput.headline,
      variant.headline,
      payloadCreative.headline,
      row?.market_param,
      `${marketCode ?? 'Operational'} Creative`
    ),
    description: firstNonEmpty(
      bodyInput.description,
      variant.description,
      payloadCreative.description
    ),
    ctaType: firstNonEmpty(
      bodyInput.ctaType,
      bodyInput.cta_type,
      payloadCreative.ctaType,
      payloadCreative.cta_type,
      payload.ctaType,
      payload.cta_type,
      'LEARN_MORE'
    ),
    destinationUrl: firstNonEmpty(
      bodyInput.destinationUrl,
      bodyInput.destination_url,
      marketTranslation.destinationUrl,
      marketTranslation.destination_url,
      payload.destinationUrl,
      payload.destination_url,
      payloadCreative.destinationUrl,
      payloadCreative.destination_url
    ),
    source: {
      adVariantSource: translatedVariants.length > 0 ? `translationsByMarket.${marketCode}.adVariants` : 'payload/body',
      adVariantIndex: translatedVariants.length > 0 || baseVariants.length > 0 ? 0 : null
    }
  }
}

function normalizeCreatedCreative(created) {
  const id = normalizeNonEmptyString(created?.id)
  if (!id) {
    const err = new Error('Meta creative creation returned no id')
    err.status = 502
    throw err
  }
  return { id }
}

async function fetchOperationalContext(client, id) {
  const { rows, rowCount } = await client.query(
    `
      SELECT
        omg.id,
        omg.campaign_id,
        omg.market_code,
        omg.market_name,
        omg.market_param,
        omg.resolved_countries,
        omg.targeting_preview,
        c.config AS campaign_config
      FROM operational_market_generations omg
      LEFT JOIN campaigns c ON c.id = omg.campaign_id
      WHERE omg.id = $1::uuid
      FOR UPDATE OF omg
    `,
    [id]
  )
  return rowCount > 0 ? rows[0] : null
}

async function fetchTemplatePayload(client, campaignConfig) {
  const templateId = readTemplateId(campaignConfig)
  if (!templateId) return {}
  const { rows, rowCount } = await client.query(
    `
      SELECT payload
      FROM campaign_templates
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [templateId]
  )
  if (rowCount > 0) return normalizeOptionalObject(rows[0]?.payload)

  const flowResult = await client.query(
    `
      SELECT payload
      FROM flow_templates
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [templateId]
  )
  return flowResult.rowCount > 0 ? normalizeOptionalObject(flowResult.rows[0]?.payload) : {}
}

async function findGeneratedCampaign(client, row) {
  const { rows } = await client.query(
    `
      SELECT
        id,
        meta_campaign_id,
        meta_adset_id,
        meta_ad_account_id
      FROM generated_campaigns
      WHERE campaign_id = $1::uuid
        AND market_code = $2
        AND meta_campaign_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [row.campaign_id, row.market_code]
  )
  return rows?.[0] ?? null
}

async function findExistingPublishedCreativeDraft(client, generatedCampaignId) {
  const { rows } = await client.query(
    `
      SELECT id, meta_creative_id
      FROM creative_drafts
      WHERE generated_campaign_id = $1::uuid
        AND meta_creative_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [generatedCampaignId]
  )
  return rows?.[0] ?? null
}

async function insertCreativeDraft(client, generatedCampaignId, creativeInput) {
  const { rows } = await client.query(
    `
      INSERT INTO creative_drafts (
        generated_campaign_id,
        creative_asset_id,
        creative_thumbnail_asset_id,
        primary_text,
        headline,
        description,
        cta_type,
        destination_url,
        status
      )
      VALUES ($1::uuid, NULL, NULL, $2, $3, $4, $5, $6, 'draft')
      RETURNING
        id,
        generated_campaign_id,
        primary_text,
        headline,
        description,
        cta_type,
        destination_url,
        status,
        meta_creative_id,
        created_at
    `,
    [
      generatedCampaignId,
      creativeInput.primaryText,
      creativeInput.headline,
      creativeInput.description,
      creativeInput.ctaType,
      creativeInput.destinationUrl
    ]
  )
  return rows[0]
}

async function markCreativePublished(client, creativeDraftId, metaCreativeId) {
  const { rows } = await client.query(
    `
      UPDATE creative_drafts
      SET
        meta_creative_id = $2,
        status = 'meta_published'
      WHERE id = $1::uuid
      RETURNING
        id,
        generated_campaign_id,
        primary_text,
        headline,
        description,
        cta_type,
        destination_url,
        status,
        meta_creative_id,
        created_at
    `,
    [creativeDraftId, metaCreativeId]
  )
  return rows[0]
}

export async function publishOperationalCreative({
  pool,
  client: providedClient,
  operationalMarketGenerationId,
  body,
  accessToken,
  createCreative
} = {}) {
  if (!pool && !providedClient) throw new Error('pool is required')
  if (typeof createCreative !== 'function') throw new Error('createCreative is required')

  if (body?.confirmPublishCreative !== true) {
    const err = new Error('confirmPublishCreative must be true')
    err.status = 400
    throw err
  }

  const token = normalizeNonEmptyString(accessToken)
  if (!token) {
    const err = new Error('accessToken is required')
    err.status = 400
    throw err
  }

  const client = providedClient ?? (await pool.connect())
  const manageTransaction = !providedClient
  try {
    if (manageTransaction) await client.query('BEGIN')

    const row = await fetchOperationalContext(client, operationalMarketGenerationId)
    if (!row) {
      const err = new Error('Operational market generation not found')
      err.status = 404
      throw err
    }

    const generatedCampaign = await findGeneratedCampaign(client, row)
    if (!generatedCampaign?.meta_campaign_id) {
      const err = new Error('Operational market generation has no published Meta Campaign')
      err.status = 400
      throw err
    }
    if (!normalizeNonEmptyString(generatedCampaign.meta_adset_id)) {
      const err = new Error('Operational market generation has no published Meta AdSet')
      err.status = 400
      throw err
    }

    const existing = await findExistingPublishedCreativeDraft(client, generatedCampaign.id)
    if (existing?.meta_creative_id) {
      if (manageTransaction) await client.query('COMMIT')
      return {
        ok: true,
        status: 'PAUSED',
        metaCreativeId: existing.meta_creative_id,
        creativeDraftId: existing.id,
        generatedCampaignId: generatedCampaign.id,
        operationalMarketGenerationId: row.id,
        duplicated: false,
        created: {
          campaign: false,
          adSet: false,
          creative: false,
          ad: false
        }
      }
    }

    const metaAdAccountId = normalizeNonEmptyString(generatedCampaign.meta_ad_account_id)
    if (!metaAdAccountId) {
      const err = new Error('Generated campaign is missing meta_ad_account_id')
      err.status = 400
      throw err
    }

    const campaignConfig = normalizeOptionalObject(row.campaign_config)
    const templatePayload = await fetchTemplatePayload(client, campaignConfig)
    const creativeInput = resolveMarketCreativeInput({ row, campaignConfig, templatePayload, body })
    const missing = []
    if (!creativeInput.pageId) missing.push('pageId')
    if (!creativeInput.destinationUrl) missing.push('destinationUrl')
    if (!creativeInput.primaryText && !creativeInput.headline) missing.push('primaryText/headline')
    if (missing.length > 0) {
      const err = new Error('Missing Creative requirements')
      err.status = 400
      err.details = { missing }
      throw err
    }

    const draft = await insertCreativeDraft(client, generatedCampaign.id, creativeInput)
    const createdCreative = normalizeCreatedCreative(
      await createCreative({
        metaAdAccountId,
        accessToken: token,
        pageId: creativeInput.pageId,
        instagramActorId: creativeInput.instagramActorId,
        name: creativeInput.headline ?? `${row.market_param} Creative`,
        message: creativeInput.primaryText,
        link: creativeInput.destinationUrl,
        headline: creativeInput.headline,
        description: creativeInput.description,
        ctaType: creativeInput.ctaType
      })
    )

    const publishedDraft = await markCreativePublished(client, draft.id, createdCreative.id)
    await client.query(
      `
        UPDATE generated_campaigns
        SET
          ops_last_action = 'operational_market.creative.publish',
          ops_last_ok = true,
          ops_last_at = now()
        WHERE id = $1::uuid
      `,
      [generatedCampaign.id]
    )

    if (manageTransaction) await client.query('COMMIT')
    return {
      ok: true,
      status: 'PAUSED',
      metaCreativeId: createdCreative.id,
      creativeDraftId: publishedDraft.id,
      generatedCampaignId: generatedCampaign.id,
      operationalMarketGenerationId: row.id,
      creativeDraft: publishedDraft,
      creativePayload: {
        metaAdAccountId,
        pageId: creativeInput.pageId,
        instagramActorId: creativeInput.instagramActorId,
        name: creativeInput.headline,
        message: creativeInput.primaryText,
        link: creativeInput.destinationUrl,
        headline: creativeInput.headline,
        description: creativeInput.description,
        ctaType: creativeInput.ctaType,
        source: creativeInput.source
      },
      duplicated: false,
      created: {
        campaign: false,
        adSet: false,
        creative: true,
        ad: false
      }
    }
  } catch (err) {
    if (manageTransaction) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // best-effort rollback
      }
    }
    throw err
  } finally {
    if (!providedClient) client.release()
  }
}
