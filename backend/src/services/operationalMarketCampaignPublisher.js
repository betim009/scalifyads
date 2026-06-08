function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeMetaAdAccountId(value) {
  const raw = normalizeNonEmptyString(value)
  if (!raw) return null
  const stripped = raw.replace(/^act_/, '')
  if (!/^\d+$/.test(stripped)) return null
  return `act_${stripped}`
}

function normalizeCountryCode(value) {
  const raw = normalizeNonEmptyString(value)
  if (!raw) return null
  const code = raw.toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  return code
}

function normalizeJsonObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizeJsonArray(value) {
  return Array.isArray(value) ? value : []
}

function resolveCompatibilityCountryCode(row) {
  const targetingPreview = normalizeJsonObject(row?.targeting_preview)
  return (
    normalizeCountryCode(targetingPreview.compatibilityCountryCode) ??
    normalizeCountryCode(targetingPreview.legacyCountryCode) ??
    normalizeCountryCode(targetingPreview.operationalTargeting?.resolvedCountries?.[0]) ??
    normalizeCountryCode(row?.resolved_countries?.[0])
  )
}

function normalizeCreatedCampaign(created) {
  const id = normalizeNonEmptyString(created?.id)
  if (!id) {
    const err = new Error('Meta campaign creation returned no id')
    err.status = 502
    throw err
  }
  return {
    id,
    status: normalizeNonEmptyString(created?.status) ?? 'PAUSED',
    effectiveStatus: normalizeNonEmptyString(created?.effective_status) ?? 'PAUSED',
    objective: normalizeNonEmptyString(created?.objective) ?? null
  }
}

async function fetchOperationalMarketGeneration(client, id) {
  const { rows, rowCount } = await client.query(
    `
      SELECT
        id,
        campaign_id,
        market_code,
        market_name,
        market_param,
        resolved_countries,
        targeting_preview,
        utm_campaign,
        src,
        status
      FROM operational_market_generations
      WHERE id = $1::uuid
      FOR UPDATE
    `,
    [id]
  )
  return rowCount > 0 ? rows[0] : null
}

async function findExistingPublishedGenerated(client, row) {
  const { rows } = await client.query(
    `
      SELECT id, meta_campaign_id
      FROM generated_campaigns
      WHERE campaign_id = $1::uuid
        AND market_code = $2
        AND meta_campaign_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [row.campaign_id, row.market_code]
  )
  return rows?.[0] ?? null
}

async function findReusableGenerated(client, row) {
  const { rows } = await client.query(
    `
      SELECT id
      FROM generated_campaigns
      WHERE campaign_id = $1::uuid
        AND market_code = $2
        AND meta_campaign_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [row.campaign_id, row.market_code]
  )
  return rows?.[0] ?? null
}

async function insertGeneratedCompatibility(client, row, { countryCode }) {
  const name = normalizeNonEmptyString(row.market_param) ?? `${row.market_code}-Campaign`
  const { rows } = await client.query(
    `
      INSERT INTO generated_campaigns (
        campaign_id,
        country_code,
        name,
        status,
        market_code,
        market_name,
        market_param,
        resolved_countries,
        targeting_preview
      )
      VALUES ($1::uuid, $2, $3, 'PAUSED', $4, $5, $6, $7::jsonb, $8::jsonb)
      RETURNING id
    `,
    [
      row.campaign_id,
      countryCode,
      name,
      row.market_code,
      row.market_name,
      row.market_param,
      JSON.stringify(normalizeJsonArray(row.resolved_countries)),
      JSON.stringify(normalizeJsonObject(row.targeting_preview))
    ]
  )
  return rows[0]
}

async function upsertGeneratedCompatibility(client, row, { metaAdAccountId, createdCampaign, objective, metaUserId }) {
  const countryCode = resolveCompatibilityCountryCode(row)
  if (!countryCode) {
    const err = new Error('Missing compatibility country_code for operational market generation')
    err.status = 400
    throw err
  }

  let generated = await findReusableGenerated(client, row)
  if (!generated) {
    try {
      generated = await insertGeneratedCompatibility(client, row, { countryCode })
    } catch (err) {
      if (err?.code === '23505') {
        const conflict = new Error('Compatibility generated_campaign already exists for this campaign/country_code')
        conflict.status = 409
        conflict.details = { countryCode }
        throw conflict
      }
      throw err
    }
  }

  const { rows } = await client.query(
    `
      UPDATE generated_campaigns
      SET
        name = $2,
        status = 'PAUSED',
        market_code = $3,
        market_name = $4,
        market_param = $5,
        resolved_countries = $6::jsonb,
        targeting_preview = $7::jsonb,
        meta_campaign_id = $8,
        meta_run_mode = 'REAL',
        meta_ad_account_id = $9,
        meta_user_id = $10,
        meta_status = $11,
        meta_effective_status = $12,
        meta_objective = $13,
        ops_last_action = 'operational_market.campaign.publish',
        ops_last_ok = true,
        ops_last_at = now()
      WHERE id = $1::uuid
      RETURNING id
    `,
    [
      generated.id,
      normalizeNonEmptyString(row.market_param) ?? `${row.market_code}-Campaign`,
      row.market_code,
      row.market_name,
      row.market_param,
      JSON.stringify(normalizeJsonArray(row.resolved_countries)),
      JSON.stringify(normalizeJsonObject(row.targeting_preview)),
      createdCampaign.id,
      metaAdAccountId,
      metaUserId ?? null,
      createdCampaign.status,
      createdCampaign.effectiveStatus,
      createdCampaign.objective ?? objective
    ]
  )
  return rows[0]
}

export async function publishPausedOperationalCampaign({
  pool,
  client: providedClient,
  operationalMarketGenerationId,
  metaAdAccountId,
  objective,
  confirmPublishPausedCampaign,
  accessToken,
  metaUserId,
  createCampaign
} = {}) {
  if (!pool && !providedClient) throw new Error('pool is required')
  if (typeof createCampaign !== 'function') throw new Error('createCampaign is required')

  if (confirmPublishPausedCampaign !== true) {
    const err = new Error('confirmPublishPausedCampaign must be true')
    err.status = 400
    throw err
  }

  const act = normalizeMetaAdAccountId(metaAdAccountId)
  if (!act) {
    const err = new Error('metaAdAccountId is required (expected act_<digits>)')
    err.status = 400
    throw err
  }

  const obj = normalizeNonEmptyString(objective)
  if (!obj) {
    const err = new Error('objective is required')
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

    const row = await fetchOperationalMarketGeneration(client, operationalMarketGenerationId)
    if (!row) {
      const err = new Error('Operational market generation not found')
      err.status = 404
      throw err
    }

    const existing = await findExistingPublishedGenerated(client, row)
    if (existing?.meta_campaign_id) {
      if (manageTransaction) await client.query('COMMIT')
      return {
        ok: true,
        status: 'PAUSED',
        metaCampaignId: existing.meta_campaign_id,
        generatedCampaignId: existing.id,
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

    const name = normalizeNonEmptyString(row.market_param)
    if (!name) {
      const err = new Error('market_param is required to name the Meta Campaign')
      err.status = 400
      throw err
    }

    const createdCampaign = normalizeCreatedCampaign(
      await createCampaign({
        metaAdAccountId: act,
        name,
        objective: obj,
        accessToken: token,
        status: 'PAUSED'
      })
    )

    const generated = await upsertGeneratedCompatibility(client, row, {
      metaAdAccountId: act,
      createdCampaign,
      objective: obj,
      metaUserId: normalizeNonEmptyString(metaUserId)
    })

    if (manageTransaction) await client.query('COMMIT')
    return {
      ok: true,
      status: 'PAUSED',
      metaCampaignId: createdCampaign.id,
      generatedCampaignId: generated.id,
      operationalMarketGenerationId: row.id,
      duplicated: false,
      created: {
        campaign: true,
        adSet: false,
        creative: false,
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
