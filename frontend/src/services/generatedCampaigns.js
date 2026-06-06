import { apiGet, apiPost } from "./http.js";

export async function listGeneratedCampaigns({ campaignId, limit = 200 } = {}) {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  if (campaignId) query.set("campaignId", String(campaignId));
  const data = await apiGet(`/api/generated-campaigns?${query.toString()}`);
  const list = Array.isArray(data?.generated_campaigns) ? data.generated_campaigns : [];
  return { ok: true, generatedCampaigns: list };
}

export async function createOperationalMarketGeneration({ campaignId, campaignName, niche, markets } = {}) {
  const data = await apiPost("/api/generated-campaigns/operational-markets", {
    ...(campaignId ? { campaignId } : null),
    campaignName,
    niche,
    markets: Array.isArray(markets) ? markets : [],
  });
  return {
    ok: true,
    campaign: data?.campaign ?? null,
    operationalMarketGenerations: Array.isArray(data?.operational_market_generations) ? data.operational_market_generations : [],
    generatedCampaigns: Array.isArray(data?.generated_campaigns) ? data.generated_campaigns : [],
    metaPublishing: data?.meta_publishing === true,
  };
}

export async function markGeneratedPublished(id, { metaCampaignId }) {
  const data = await apiPost(`/api/generated-campaigns/${encodeURIComponent(String(id))}/mark-published`, {
    metaCampaignId,
  });
  return { ok: true, generatedCampaign: data?.generated_campaign ?? null };
}

export async function updateGeneratedStatus(id, { status }) {
  const data = await apiPost(`/api/generated-campaigns/${encodeURIComponent(String(id))}/status`, { status });
  return { ok: true, generatedCampaign: data?.generated_campaign ?? null };
}

export async function updateGeneratedOpsState(id, { opsState }) {
  const data = await apiPost(`/api/generated-campaigns/${encodeURIComponent(String(id))}/ops-state`, { opsState });
  return { ok: true, generatedCampaign: data?.generated_campaign ?? null };
}

export async function getGeneratedCampaignStructure(id) {
  const data = await apiGet(`/api/generated-campaigns/${encodeURIComponent(String(id))}/structure`);
  return {
    ok: true,
    generatedAdSets: Array.isArray(data?.generated_adsets) ? data.generated_adsets : [],
    generatedAds: Array.isArray(data?.generated_ads) ? data.generated_ads : [],
  };
}

export async function listGeneratedCampaignEvents(id, { limit = 50 } = {}) {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  const data = await apiGet(`/api/generated-campaigns/${encodeURIComponent(String(id))}/events?${query.toString()}`);
  return {
    ok: true,
    generatedCampaignEvents: Array.isArray(data?.generated_campaign_events) ? data.generated_campaign_events : [],
  };
}

export async function createGeneratedCheckpoint(id, { label, note } = {}) {
  const data = await apiPost(`/api/generated-campaigns/${encodeURIComponent(String(id))}/checkpoints`, { label, note });
  return { ok: true, generatedCampaignEvent: data?.generated_campaign_event ?? null };
}
