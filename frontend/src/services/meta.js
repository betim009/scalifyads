import { apiPost } from "./http.js";

export async function syncGeneratedCampaign(generatedCampaignId, { startDate, endDate, accessToken, userId } = {}) {
  const body = {
    ...(startDate ? { startDate } : null),
    ...(endDate ? { endDate } : null),
    ...(accessToken ? { accessToken } : null),
    ...(userId ? { userId } : null),
  };

  const data = await apiPost(
    `/api/meta/sync/generated-campaigns/${encodeURIComponent(String(generatedCampaignId))}`,
    body,
  );
  return { ok: true, sync: data?.sync ?? null };
}

export async function createMetaCampaign({
  generatedCampaignId,
  metaAdAccountId,
  objective,
  metaUserId,
  force,
} = {}) {
  const body = {
    generatedCampaignId,
    metaAdAccountId,
    ...(objective ? { objective } : null),
    ...(metaUserId ? { metaUserId } : null),
    ...(force === true ? { force: true } : null),
  };

  const data = await apiPost("/api/meta/campaigns", body);
  return {
    ok: true,
    metaCampaign: data?.meta_campaign ?? null,
    generatedCampaign: data?.generated_campaign ?? null,
  };
}
