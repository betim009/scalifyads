import path from 'node:path'
import fsp from 'node:fs/promises'
import { buildMarketTracking, parseNicheParamFromMarketParam } from '../lib/marketTracking.js'

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

function getCreativeUploadsDir() {
  return path.resolve('uploads', 'creative-assets')
}

function normalizeVariantKey(value) {
  const key = normalizeNonEmptyString(value)?.toUpperCase()
  return ['A', 'B', 'C', 'D', 'E'].includes(key) ? key : 'A'
}

function variantIndexForKey(key) {
  return { A: 0, B: 1, C: 2, D: 3, E: 4 }[normalizeVariantKey(key)] ?? 0
}

function resolveMarketMedia({ marketCode, payload, body } = {}) {
  const bodyInput = normalizeOptionalObject(body)
  const variantKey = normalizeVariantKey(firstNonEmpty(bodyInput.variantKey, bodyInput.variant_key))
  const directAssetId = firstNonEmpty(bodyInput.creativeAssetId, bodyInput.creative_asset_id)
  const directThumbId = firstNonEmpty(bodyInput.creativeThumbnailAssetId, bodyInput.creative_thumbnail_asset_id, bodyInput.thumbnailAssetId)
  if (directAssetId) {
    return { creativeAssetId: directAssetId, creativeThumbnailAssetId: directThumbId, source: 'body', variantKey }
  }

  const mediaByMarket = normalizeOptionalObject(payload?.mediaByMarket)
  const marketMedia = normalizeOptionalObject(mediaByMarket?.[marketCode])
  const defaultMedia = normalizeOptionalObject(mediaByMarket?.default)
  const marketEntry = marketMedia?.[variantKey] || (variantKey === 'A' ? marketMedia?.A || marketMedia?.['1'] : null)
  const defaultEntry = defaultMedia?.[variantKey] || (variantKey === 'A' ? defaultMedia?.A || defaultMedia?.['1'] : null)
  const entry = normalizeOptionalObject(
    marketEntry ||
      (variantKey === 'A' && firstNonEmpty(marketMedia?.creativeAssetId, marketMedia?.creative_asset_id, marketMedia?.assetId) ? marketMedia : null) ||
      defaultEntry ||
      (variantKey === 'A' && firstNonEmpty(defaultMedia?.creativeAssetId, defaultMedia?.creative_asset_id, defaultMedia?.assetId) ? defaultMedia : null)
  )
  const thumb = normalizeOptionalObject(entry?.thumbnail)
  const creativeAssetId = firstNonEmpty(entry?.creativeAssetId, entry?.creative_asset_id, entry?.assetId)
  const creativeThumbnailAssetId = firstNonEmpty(
    thumb?.creativeAssetId,
    thumb?.creative_asset_id,
    thumb?.assetId,
    entry?.creativeThumbnailAssetId,
    entry?.creative_thumbnail_asset_id,
    entry?.thumbnailAssetId
  )
  if (!creativeAssetId) return null
  const source = marketEntry
    ? `mediaByMarket.${marketCode}.${variantKey}`
    : entry === marketMedia
      ? `mediaByMarket.${marketCode}`
      : defaultEntry
        ? `mediaByMarket.default.${variantKey}`
        : `mediaByMarket.default`
  return { creativeAssetId, creativeThumbnailAssetId, source, variantKey }
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
  const payloadCreative = normalizeOptionalObject(payload.creative)
  const bodyInput = normalizeOptionalObject(body)
  const variantKey = normalizeVariantKey(firstNonEmpty(bodyInput.variantKey, bodyInput.variant_key))
  const variantIndex = variantIndexForKey(variantKey)
  const variant = translatedVariants[variantIndex] ?? baseVariants[variantIndex] ?? translatedVariants[0] ?? baseVariants[0] ?? {}
  const targetingPreview = normalizeOptionalObject(row?.targeting_preview)
  const nicheParam =
    parseNicheParamFromMarketParam(firstNonEmpty(row?.market_param, row?.src), marketCode) ??
    normalizeNonEmptyString(payload?.niche) ??
    normalizeNonEmptyString(payload?.nicheParam) ??
    normalizeNonEmptyString(payload?.niche_param)
  const rawDestinationUrl = firstNonEmpty(
    bodyInput.destinationUrl,
    bodyInput.destination_url,
    marketTranslation.destinationUrl,
    marketTranslation.destination_url,
    payload.destinationUrl,
    payload.destination_url,
    payloadCreative.destinationUrl,
    payloadCreative.destination_url
  )
  const tracking = buildMarketTracking({ marketCode, nicheParam, destinationUrl: rawDestinationUrl })
  const destinationUrl = tracking?.finalUrl ?? rawDestinationUrl

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
    destinationUrl,
    media: resolveMarketMedia({ marketCode, payload, body }),
    source: {
      adVariantSource: translatedVariants.length > 0 ? `translationsByMarket.${marketCode}.adVariants` : 'payload/body',
      adVariantIndex: translatedVariants.length > 0 || baseVariants.length > 0 ? variantIndex : null,
      variantKey,
      tracking
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

async function findExistingPublishedCreativeDraft(client, generatedCampaignId, row) {
  const { rows } = await client.query(
    `
      SELECT id, meta_creative_id, destination_url
      FROM creative_drafts
      WHERE generated_campaign_id = $1::uuid
        AND meta_creative_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [generatedCampaignId]
  )
  return rows.find((item) => hasCurrentMarketTracking(item.destination_url, row)) ?? null
}

function hasCurrentMarketTracking(url, row) {
  const marketCode = normalizeNonEmptyString(row?.market_code)
  const nicheParam = parseNicheParamFromMarketParam(firstNonEmpty(row?.market_param, row?.src), marketCode)
  const expected = buildMarketTracking({ marketCode, nicheParam })
  if (!expected) return false

  try {
    const parsed = new URL(normalizeNonEmptyString(url) ?? '')
    return (
      parsed.searchParams.get('utm_source') === expected.utm_source &&
      parsed.searchParams.get('utm_medium') === expected.utm_medium &&
      parsed.searchParams.get('utm_campaign') === expected.utm_campaign &&
      parsed.searchParams.get('src') === expected.src
    )
  } catch {
    return false
  }
}

async function fetchCreativeAsset(client, id) {
  const assetId = normalizeNonEmptyString(id)
  if (!assetId) return null
  const { rows, rowCount } = await client.query(
    `
      SELECT id, stored_name, original_name, mime_type, size_bytes, created_at
      FROM creative_assets
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [assetId]
  )
  return rowCount > 0 ? rows[0] : null
}

async function uploadCreativeMedia({ client, media, metaAdAccountId, accessToken, uploadImage, uploadVideo } = {}) {
  const creativeAssetId = normalizeNonEmptyString(media?.creativeAssetId)
  if (!creativeAssetId) return { imageHash: null, videoId: null, asset: null, thumbnailAsset: null, source: 'link_fallback' }

  const asset = await fetchCreativeAsset(client, creativeAssetId)
  if (!asset) {
    const err = new Error('Creative asset not found')
    err.status = 400
    err.details = { creativeAssetId }
    throw err
  }

  const storedName = normalizeNonEmptyString(asset.stored_name)
  if (!storedName) {
    const err = new Error('Creative asset is missing stored_name')
    err.status = 400
    err.details = { creativeAssetId }
    throw err
  }

  const filePath = path.join(getCreativeUploadsDir(), storedName)
  try {
    await fsp.stat(filePath)
  } catch {
    const err = new Error('Creative asset file not found on disk')
    err.status = 400
    err.details = { stored_name: storedName }
    throw err
  }

  const mimeType = normalizeNonEmptyString(asset.mime_type) ?? null
  if (mimeType && mimeType.startsWith('video/')) {
    if (typeof uploadVideo !== 'function') throw new Error('uploadVideo is required for video creatives')
    if (typeof uploadImage !== 'function') throw new Error('uploadImage is required for video thumbnails')

    const uploadedVideo = await uploadVideo({
      metaAdAccountId,
      accessToken,
      filePath,
      mimeType,
      originalName: asset.original_name ?? storedName
    })

    const thumbId = normalizeNonEmptyString(media?.creativeThumbnailAssetId)
    if (!thumbId) {
      const err = new Error('Missing video thumbnail')
      err.status = 400
      err.details = { creativeAssetId, hint: 'Select or upload a thumbnail for video creatives.' }
      throw err
    }

    const thumbnailAsset = await fetchCreativeAsset(client, thumbId)
    if (!thumbnailAsset) {
      const err = new Error('Video thumbnail asset not found')
      err.status = 400
      err.details = { creativeThumbnailAssetId: thumbId }
      throw err
    }
    const thumbStored = normalizeNonEmptyString(thumbnailAsset.stored_name)
    const thumbMime = normalizeNonEmptyString(thumbnailAsset.mime_type)
    if (!thumbStored || !thumbMime?.startsWith('image/')) {
      const err = new Error('Invalid video thumbnail')
      err.status = 400
      err.details = { creativeThumbnailAssetId: thumbId, mimeType: thumbMime }
      throw err
    }
    const thumbPath = path.join(getCreativeUploadsDir(), thumbStored)
    try {
      await fsp.stat(thumbPath)
    } catch {
      const err = new Error('Video thumbnail file not found on disk')
      err.status = 400
      err.details = { stored_name: thumbStored }
      throw err
    }

    const uploadedThumb = await uploadImage({
      metaAdAccountId,
      accessToken,
      filePath: thumbPath,
      mimeType: thumbMime,
      originalName: thumbnailAsset.original_name ?? thumbStored
    })
    return {
      imageHash: uploadedThumb.hash,
      videoId: uploadedVideo.id,
      asset,
      thumbnailAsset,
      source: 'video'
    }
  }

  if (typeof uploadImage !== 'function') throw new Error('uploadImage is required for image creatives')
  const uploaded = await uploadImage({
    metaAdAccountId,
    accessToken,
    filePath,
    mimeType,
    originalName: asset.original_name ?? storedName
  })
  return { imageHash: uploaded.hash, videoId: null, asset, thumbnailAsset: null, source: 'image' }
}

async function insertCreativeDraft(client, generatedCampaignId, creativeInput, mediaUpload) {
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
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, 'draft')
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
      mediaUpload?.asset?.id ?? null,
      mediaUpload?.thumbnailAsset?.id ?? null,
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
  createCreative,
  uploadImage,
  uploadVideo
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

    const existing = await findExistingPublishedCreativeDraft(client, generatedCampaign.id, row)
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

    const mediaUpload = await uploadCreativeMedia({
      client,
      media: creativeInput.media,
      metaAdAccountId,
      accessToken: token,
      uploadImage,
      uploadVideo
    })

    const draft = await insertCreativeDraft(client, generatedCampaign.id, creativeInput, mediaUpload)
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
        ctaType: creativeInput.ctaType,
        imageHash: mediaUpload.imageHash,
        videoId: mediaUpload.videoId
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
        mediaSource: mediaUpload.source,
        creativeAssetId: mediaUpload.asset?.id ?? null,
        creativeThumbnailAssetId: mediaUpload.thumbnailAsset?.id ?? null,
        imageHash: mediaUpload.imageHash,
        videoId: mediaUpload.videoId,
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
