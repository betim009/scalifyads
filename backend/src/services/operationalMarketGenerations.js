export async function insertOperationalMarketGeneration(client, { campaignId, market } = {}) {
  const result = await client.query(
    `
      INSERT INTO operational_market_generations (
        campaign_id,
        market_code,
        market_name,
        market_param,
        resolved_countries,
        targeting_preview,
        utm_campaign,
        src,
        status,
        updated_at
      )
      VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, 'PAUSED', now())
      ON CONFLICT (campaign_id, market_code) DO UPDATE SET
        market_name = EXCLUDED.market_name,
        market_param = EXCLUDED.market_param,
        resolved_countries = EXCLUDED.resolved_countries,
        targeting_preview = EXCLUDED.targeting_preview,
        utm_campaign = EXCLUDED.utm_campaign,
        src = EXCLUDED.src,
        status = 'PAUSED',
        updated_at = now()
      RETURNING
        id,
        campaign_id,
        market_code,
        market_name,
        market_param,
        resolved_countries,
        targeting_preview,
        utm_campaign,
        src,
        status,
        created_at,
        updated_at
    `,
    [
      campaignId,
      market.marketCode,
      market.marketName,
      market.marketParam,
      JSON.stringify(market.resolvedCountries ?? []),
      JSON.stringify(market.targetingPreview ?? {}),
      market.tracking?.utm_campaign ?? market.marketCode,
      market.tracking?.src ?? market.marketParam
    ]
  )
  return result.rows[0]
}

export async function listOperationalMarketGenerations(pool, { campaignId, limit = 200 } = {}) {
  const result = await pool.query(
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
        status,
        created_at,
        updated_at
      FROM operational_market_generations
      WHERE ($1::uuid IS NULL OR campaign_id = $1::uuid)
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [campaignId ?? null, limit]
  )
  return result.rows
}
