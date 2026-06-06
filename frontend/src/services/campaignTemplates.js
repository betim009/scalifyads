import { apiDelete, apiGet, apiPost } from "./http.js";

export async function listCampaignTemplates({ limit = 50 } = {}) {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  const data = await apiGet(`/api/campaign-templates?${query.toString()}`);
  return { ok: true, campaignTemplates: Array.isArray(data?.campaign_templates) ? data.campaign_templates : [] };
}

export async function createCampaignTemplate({ name, payload } = {}) {
  const data = await apiPost(`/api/campaign-templates`, { name, payload });
  return { ok: true, campaignTemplate: data?.campaign_template ?? null };
}

export async function createCampaignTemplateFromGenerated(generatedCampaignId, { name } = {}) {
  const data = await apiPost(`/api/campaign-templates/from-generated/${encodeURIComponent(String(generatedCampaignId))}`, { name });
  return { ok: true, campaignTemplate: data?.campaign_template ?? null };
}

export async function deleteCampaignTemplate(templateId) {
  const data = await apiDelete(`/api/campaign-templates/${encodeURIComponent(String(templateId))}`);
  return { ok: true, campaignTemplate: data?.campaign_template ?? null };
}

export async function applyCampaignTemplate(templateId, { name, countryCode, metaObjective, metaAdAccountId, metaRunMode } = {}) {
  const data = await apiPost(`/api/campaign-templates/${encodeURIComponent(String(templateId))}/apply`, {
    name,
    countryCode,
    metaObjective,
    metaAdAccountId,
    metaRunMode,
  });
  return {
    ok: true,
    campaign: data?.campaign ?? null,
    generatedCampaign: data?.generated_campaign ?? null,
    generatedAdSets: Array.isArray(data?.generated_adsets) ? data.generated_adsets : [],
    generatedAds: Array.isArray(data?.generated_ads) ? data.generated_ads : [],
  };
}

export async function generateCampaignTemplateTranslationsByMarket(templateId, { markets, overwrite = false } = {}) {
  const data = await apiPost(`/api/campaign-templates/${encodeURIComponent(String(templateId))}/translations-by-market/generate`, {
    markets: Array.isArray(markets) ? markets : [],
    overwrite: Boolean(overwrite),
  });
  return {
    ok: true,
    campaignTemplate: data?.campaign_template ?? null,
    generated: Array.isArray(data?.generated) ? data.generated : [],
    preserved: Array.isArray(data?.preserved) ? data.preserved : [],
    overwrite: Boolean(data?.overwrite),
  };
}
