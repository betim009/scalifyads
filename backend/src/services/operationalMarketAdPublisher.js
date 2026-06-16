function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeVariantKey(value) {
  const key = normalizeNonEmptyString(value)?.toUpperCase()
  return ['A', 'B', 'C', 'D', 'E'].includes(key) ? key : 'A'
}

function adNumberForVariantKey(variantKey) {
  return { A: 1, B: 2, C: 3, D: 4, E: 5 }[normalizeVariantKey(variantKey)] ?? 1
}

function normalizeCreatedAd(created) {
  const id = normalizeNonEmptyString(created?.id)
  if (!id) {
    const err = new Error('Meta ad creation returned no id')
    err.status = 502
    throw err
  }
  return {
    id,
    status: normalizeNonEmptyString(created?.status) ?? 'PAUSED',
    effectiveStatus: normalizeNonEmptyString(created?.effective_status) ?? 'PAUSED',
    adsetId: normalizeNonEmptyString(created?.adset_id) ?? null,
    campaignId: normalizeNonEmptyString(created?.campaign_id) ?? null,
    creative: created?.creative ?? null
  }
}

async function fetchOperationalContext(client, id) {
  const { rows, rowCount } = await client.query(
    `
      SELECT
        id,
        campaign_id,
        market_code,
        market_name,
        market_param
      FROM operational_market_generations
      WHERE id = $1::uuid
      FOR UPDATE
    `,
    [id]
  )
  return rowCount > 0 ? rows[0] : null
}

async function findGeneratedCampaign(client, row) {
  const { rows } = await client.query(
    `
      SELECT
        id,
        meta_campaign_id,
        meta_adset_id,
        meta_ad_account_id,
        meta_ad_id
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

async function findPublishedCreativeDraft(client, generatedCampaignId, variantKey = 'A') {
  const { rows } = await client.query(
    `
      SELECT id, meta_creative_id, variant_key
      FROM creative_drafts
      WHERE generated_campaign_id = $1::uuid
        AND COALESCE(variant_key, 'A') = $2
        AND meta_creative_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [generatedCampaignId, normalizeVariantKey(variantKey)]
  )
  return rows?.[0] ?? null
}

async function findGeneratedAdSet(client, generatedCampaignId, metaAdSetId) {
  const { rows } = await client.query(
    `
      SELECT id
      FROM generated_adsets
      WHERE generated_campaign_id = $1::uuid
        AND meta_adset_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [generatedCampaignId, metaAdSetId]
  )
  return rows?.[0] ?? null
}

async function findExistingGeneratedAd(client, generatedCampaignId, variantKey = 'A') {
  const { rows } = await client.query(
    `
      SELECT id, meta_ad_id, variant_key
      FROM generated_ads
      WHERE generated_campaign_id = $1::uuid
        AND COALESCE(variant_key, 'A') = $2
        AND meta_ad_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [generatedCampaignId, normalizeVariantKey(variantKey)]
  )
  return rows?.[0] ?? null
}

async function persistAd(client, { generatedCampaign, generatedAdSetId, creativeDraftId, name, createdAd, variantKey }) {
  const normalizedVariantKey = normalizeVariantKey(variantKey)
  const shouldUpdateLegacyAd = normalizedVariantKey === 'A'
  const { rows: updatedRows } = await client.query(
    `
      UPDATE generated_campaigns
      SET
        meta_ad_id = CASE WHEN $5::boolean THEN $2 ELSE meta_ad_id END,
        meta_ad_status = CASE WHEN $5::boolean THEN $3 ELSE meta_ad_status END,
        meta_ad_effective_status = CASE WHEN $5::boolean THEN $4 ELSE meta_ad_effective_status END,
        meta_run_mode = 'REAL',
        status = 'PAUSED',
        ops_last_action = 'operational_market.ad.publish',
        ops_last_ok = true,
        ops_last_at = now()
      WHERE id = $1::uuid
      RETURNING id
    `,
    [generatedCampaign.id, createdAd.id, createdAd.status, createdAd.effectiveStatus, shouldUpdateLegacyAd]
  )

  const { rows: adRows } = await client.query(
    `
      INSERT INTO generated_ads (
        generated_campaign_id,
        generated_adset_id,
        creative_draft_id,
        meta_ad_id,
        name,
        variant_key,
        run_mode,
        status,
        effective_status
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, 'REAL', $7, $8)
      RETURNING id
    `,
    [
      generatedCampaign.id,
      generatedAdSetId,
      creativeDraftId,
      createdAd.id,
      name,
      normalizedVariantKey,
      createdAd.status,
      createdAd.effectiveStatus
    ]
  )

  return {
    generatedCampaignId: updatedRows[0]?.id ?? generatedCampaign.id,
    generatedAdId: adRows[0]?.id ?? null
  }
}

export async function publishPausedOperationalAd({
  pool,
  client: providedClient,
  operationalMarketGenerationId,
  confirmPublishPausedAd,
  variantKey,
  accessToken,
  createAd
} = {}) {
  if (!pool && !providedClient) throw new Error('pool is required')
  if (typeof createAd !== 'function') throw new Error('createAd is required')

  if (confirmPublishPausedAd !== true) {
    const err = new Error('confirmPublishPausedAd must be true')
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

    const requestedVariantKey = normalizeVariantKey(variantKey)
    const existingGeneratedAd = await findExistingGeneratedAd(client, generatedCampaign.id, requestedVariantKey)
    const existingAdId =
      (requestedVariantKey === 'A' ? normalizeNonEmptyString(generatedCampaign.meta_ad_id) : null) ??
      normalizeNonEmptyString(existingGeneratedAd?.meta_ad_id)
    if (existingAdId) {
      if (manageTransaction) await client.query('COMMIT')
      return {
        ok: true,
        status: 'PAUSED',
        metaCampaignId: generatedCampaign.meta_campaign_id,
        metaAdSetId: generatedCampaign.meta_adset_id,
        metaAdId: existingAdId,
        variantKey: existingGeneratedAd?.variant_key ?? requestedVariantKey,
        generatedCampaignId: generatedCampaign.id,
        generatedAdId: existingGeneratedAd?.id ?? null,
        operationalMarketGenerationId: row.id,
        duplicated: true,
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

    const metaAdSetId = normalizeNonEmptyString(generatedCampaign.meta_adset_id)
    if (!metaAdSetId) {
      const err = new Error('Operational market generation has no published Meta AdSet')
      err.status = 400
      throw err
    }

    const creativeDraft = await findPublishedCreativeDraft(client, generatedCampaign.id, requestedVariantKey)
    const creativeId = normalizeNonEmptyString(creativeDraft?.meta_creative_id)
    if (!creativeId) {
      const err = new Error('Operational market generation has no published Meta Creative')
      err.status = 400
      throw err
    }

    const generatedAdSet = await findGeneratedAdSet(client, generatedCampaign.id, metaAdSetId)
    const baseName = normalizeNonEmptyString(row.market_param) ?? `Operational Ad ${row.id}`
    const name = requestedVariantKey === 'A' ? baseName : `${baseName} Ad ${adNumberForVariantKey(requestedVariantKey)}`
    const createdAd = normalizeCreatedAd(
      await createAd({
        metaAdAccountId,
        metaAdSetId,
        name,
        creativeId,
        accessToken: token,
        status: 'PAUSED'
      })
    )

    const persisted = await persistAd(client, {
      generatedCampaign,
      generatedAdSetId: generatedAdSet?.id ?? null,
      creativeDraftId: creativeDraft.id,
      name,
      createdAd,
      variantKey: requestedVariantKey
    })

    if (manageTransaction) await client.query('COMMIT')
    return {
      ok: true,
      status: 'PAUSED',
      metaCampaignId: generatedCampaign.meta_campaign_id,
      metaAdSetId,
      metaCreativeId: creativeId,
      metaAdId: createdAd.id,
      variantKey: requestedVariantKey,
      generatedCampaignId: persisted.generatedCampaignId,
      generatedAdId: persisted.generatedAdId,
      creativeDraftId: creativeDraft.id,
      operationalMarketGenerationId: row.id,
      duplicated: false,
      created: {
        campaign: false,
        adSet: false,
        creative: false,
        ad: true
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
