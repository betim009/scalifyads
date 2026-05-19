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
