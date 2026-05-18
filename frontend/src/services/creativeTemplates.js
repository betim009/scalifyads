import { apiGet, apiPost } from "./http.js";

export async function listCreativeTemplates({ limit = 50 } = {}) {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  const data = await apiGet(`/api/creative-templates?${query.toString()}`);
  return { ok: true, creativeTemplates: Array.isArray(data?.creative_templates) ? data.creative_templates : [] };
}

export async function createCreativeTemplateFromDraft(draftId, { name } = {}) {
  const data = await apiPost(`/api/creative-templates/from-draft/${encodeURIComponent(String(draftId))}`, {
    ...(name ? { name } : null),
  });
  return { ok: true, creativeTemplate: data?.creative_template ?? null };
}

export async function applyCreativeTemplate(templateId, { generatedCampaignId } = {}) {
  const data = await apiPost(`/api/creative-templates/${encodeURIComponent(String(templateId))}/apply`, {
    generatedCampaignId,
  });
  return { ok: true, creativeDraft: data?.creative_draft ?? null };
}

