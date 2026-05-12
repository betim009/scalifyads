import { apiGet, apiPost } from "./http.js";

export async function listCreativeDrafts({ generatedCampaignId, limit = 50 } = {}) {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  if (generatedCampaignId) query.set("generatedCampaignId", String(generatedCampaignId));
  const data = await apiGet(`/api/creative-drafts?${query.toString()}`);
  return { ok: true, creativeDrafts: Array.isArray(data?.creative_drafts) ? data.creative_drafts : [] };
}

export async function createCreativeDraft(payload) {
  const data = await apiPost("/api/creative-drafts", payload ?? {});
  return { ok: true, creativeDraft: data?.creative_draft ?? null };
}

