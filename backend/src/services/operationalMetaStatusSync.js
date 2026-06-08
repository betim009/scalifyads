function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function isRealMetaId(value) {
  const id = normalizeNonEmptyString(value)
  if (!id) return false
  return !id.startsWith('stub-')
}

function pickConfiguredStatus(value) {
  return normalizeNonEmptyString(value?.configured_status) ?? normalizeNonEmptyString(value?.status)
}

function pickEffectiveStatus(value) {
  return normalizeNonEmptyString(value?.effective_status)
}

async function fetchOperationalStatusContext(client, id) {
  const { rows, rowCount } = await client.query(
    `
      SELECT
        omg.id AS operational_market_generation_id,
        omg.campaign_id,
        omg.market_code,
        omg.market_name,
        omg.market_param,
        gc.id AS generated_campaign_id,
        gc.meta_campaign_id,
        gc.meta_adset_id,
        gc.meta_ad_id,
        gc.meta_ad_account_id,
        ga.id AS generated_ad_id,
        ga.meta_ad_id AS generated_ad_meta_ad_id,
        gadset.id AS generated_adset_id,
        gadset.meta_adset_id AS generated_adset_meta_adset_id,
        cd.id AS creative_draft_id,
        cd.meta_creative_id
      FROM operational_market_generations omg
      LEFT JOIN LATERAL (
        SELECT *
        FROM generated_campaigns
        WHERE campaign_id = omg.campaign_id
          AND market_code = omg.market_code
          AND meta_campaign_id IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      ) gc ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM generated_adsets
        WHERE generated_campaign_id = gc.id
          AND meta_adset_id IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      ) gadset ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM creative_drafts
        WHERE generated_campaign_id = gc.id
          AND meta_creative_id IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      ) cd ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM generated_ads
        WHERE generated_campaign_id = gc.id
          AND meta_ad_id IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      ) ga ON true
      WHERE omg.id = $1::uuid
      LIMIT 1
    `,
    [id]
  )

  return rowCount > 0 ? rows[0] : null
}

async function updateGeneratedCampaignStatus(client, { row, campaign, adSet, ad }) {
  if (!row?.generated_campaign_id) return null

  const campaignStatus = pickConfiguredStatus(campaign)
  const campaignEffectiveStatus = pickEffectiveStatus(campaign)
  const objective = normalizeNonEmptyString(campaign?.objective)
  const adSetStatus = pickConfiguredStatus(adSet)
  const adSetEffectiveStatus = pickEffectiveStatus(adSet)
  const adStatus = pickConfiguredStatus(ad)
  const adEffectiveStatus = pickEffectiveStatus(ad)

  const { rows } = await client.query(
    `
      UPDATE generated_campaigns
      SET
        meta_status = COALESCE($2, meta_status),
        meta_effective_status = COALESCE($3, meta_effective_status),
        meta_objective = COALESCE($4, meta_objective),
        meta_adset_status = COALESCE($5, meta_adset_status),
        meta_adset_effective_status = COALESCE($6, meta_adset_effective_status),
        meta_ad_status = COALESCE($7, meta_ad_status),
        meta_ad_effective_status = COALESCE($8, meta_ad_effective_status),
        ops_last_action = 'operational_market.meta_status.sync',
        ops_last_ok = true,
        ops_last_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        meta_status,
        meta_effective_status,
        meta_objective,
        meta_adset_status,
        meta_adset_effective_status,
        meta_ad_status,
        meta_ad_effective_status
    `,
    [
      row.generated_campaign_id,
      campaignStatus,
      campaignEffectiveStatus,
      objective,
      adSetStatus,
      adSetEffectiveStatus,
      adStatus,
      adEffectiveStatus
    ]
  )

  return rows?.[0] ?? null
}

async function updateGeneratedAdSetStatus(client, { row, adSet }) {
  if (!row?.generated_adset_id || !adSet) return null

  const configuredStatus = pickConfiguredStatus(adSet)
  const effectiveStatus = pickEffectiveStatus(adSet)
  const { rows } = await client.query(
    `
      UPDATE generated_adsets
      SET
        status = COALESCE($2, status),
        configured_status = COALESCE($2, configured_status),
        effective_status = COALESCE($3, effective_status)
      WHERE id = $1::uuid
      RETURNING id, meta_adset_id, status, configured_status, effective_status
    `,
    [row.generated_adset_id, configuredStatus, effectiveStatus]
  )

  return rows?.[0] ?? null
}

async function updateCreativeDraftStatus(client, { row, creative }) {
  if (!row?.creative_draft_id || !creative) return null

  const metaStatus = pickConfiguredStatus(creative)
  const { rows } = await client.query(
    `
      UPDATE creative_drafts
      SET meta_status = COALESCE($2, meta_status)
      WHERE id = $1::uuid
      RETURNING id, meta_creative_id, status, meta_status
    `,
    [row.creative_draft_id, metaStatus]
  )

  return rows?.[0] ?? null
}

async function updateGeneratedAdStatus(client, { row, ad }) {
  if (!row?.generated_ad_id || !ad) return null

  const configuredStatus = pickConfiguredStatus(ad)
  const effectiveStatus = pickEffectiveStatus(ad)
  const { rows } = await client.query(
    `
      UPDATE generated_ads
      SET
        status = COALESCE($2, status),
        configured_status = COALESCE($2, configured_status),
        effective_status = COALESCE($3, effective_status)
      WHERE id = $1::uuid
      RETURNING id, meta_ad_id, status, configured_status, effective_status
    `,
    [row.generated_ad_id, configuredStatus, effectiveStatus]
  )

  return rows?.[0] ?? null
}

export async function syncOperationalMetaStatuses({
  pool,
  client: providedClient,
  operationalMarketGenerationId,
  accessToken,
  fetchCampaign,
  fetchAdSet,
  fetchCreative,
  fetchAd
} = {}) {
  if (!pool && !providedClient) throw new Error('pool is required')
  if (typeof fetchCampaign !== 'function') throw new Error('fetchCampaign is required')
  if (typeof fetchAdSet !== 'function') throw new Error('fetchAdSet is required')
  if (typeof fetchCreative !== 'function') throw new Error('fetchCreative is required')
  if (typeof fetchAd !== 'function') throw new Error('fetchAd is required')

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

    const row = await fetchOperationalStatusContext(client, operationalMarketGenerationId)
    if (!row) {
      const err = new Error('Operational market generation not found')
      err.status = 404
      throw err
    }

    if (!row.generated_campaign_id) {
      const err = new Error('Operational market generation has no generated campaign to sync')
      err.status = 400
      throw err
    }

    const metaCampaignId = isRealMetaId(row.meta_campaign_id) ? row.meta_campaign_id : null
    const metaAdSetId = isRealMetaId(row.meta_adset_id ?? row.generated_adset_meta_adset_id)
      ? row.meta_adset_id ?? row.generated_adset_meta_adset_id
      : null
    const metaCreativeId = isRealMetaId(row.meta_creative_id) ? row.meta_creative_id : null
    const metaAdId = isRealMetaId(row.meta_ad_id ?? row.generated_ad_meta_ad_id)
      ? row.meta_ad_id ?? row.generated_ad_meta_ad_id
      : null

    const [campaign, adSet, creative, ad] = await Promise.all([
      metaCampaignId
        ? fetchCampaign({
            metaCampaignId,
            accessToken: token,
            fields: ['id', 'name', 'status', 'effective_status', 'objective']
          })
        : null,
      metaAdSetId
        ? fetchAdSet({
            metaAdSetId,
            accessToken: token,
            fields: ['id', 'name', 'status', 'effective_status', 'campaign_id']
          })
        : null,
      metaCreativeId
        ? fetchCreative({
            metaCreativeId,
            accessToken: token,
            fields: ['id', 'name', 'status']
          })
        : null,
      metaAdId
        ? fetchAd({
            metaAdId,
            accessToken: token,
            fields: ['id', 'name', 'status', 'configured_status', 'effective_status', 'adset_id', 'campaign_id', 'creative']
          })
        : null
    ])

    const generatedCampaign = await updateGeneratedCampaignStatus(client, { row, campaign, adSet, ad })
    const generatedAdSet = await updateGeneratedAdSetStatus(client, { row, adSet })
    const creativeDraft = await updateCreativeDraftStatus(client, { row, creative })
    const generatedAd = await updateGeneratedAdStatus(client, { row, ad })

    if (manageTransaction) await client.query('COMMIT')

    return {
      ok: true,
      operationalMarketGenerationId: row.operational_market_generation_id,
      generatedCampaignId: row.generated_campaign_id,
      created: {
        campaign: false,
        adSet: false,
        creative: false,
        ad: false
      },
      fetched: {
        campaign: Boolean(campaign),
        adSet: Boolean(adSet),
        creative: Boolean(creative),
        ad: Boolean(ad)
      },
      meta: {
        campaign,
        adSet,
        creative,
        ad
      },
      persisted: {
        generatedCampaign,
        generatedAdSet,
        creativeDraft,
        generatedAd
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
