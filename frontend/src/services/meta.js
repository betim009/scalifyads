import { apiGet, apiPost } from "./http.js";

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

export async function createMetaCampaignSimple({
  name,
  objective,
  metaAdAccountId,
  countryCode,
  mode,
  metaUserId,
} = {}) {
  const body = {
    name,
    metaAdAccountId,
    countryCode,
    ...(objective ? { objective } : null),
    ...(mode ? { mode } : null),
    ...(metaUserId ? { metaUserId } : null),
  };

  const data = await apiPost("/api/meta/campaigns/simple", body);
  return {
    ok: true,
    mode: data?.mode ?? null,
    metaCampaign: data?.meta_campaign ?? null,
    campaign: data?.campaign ?? null,
    generatedCampaign: data?.generated_campaign ?? null,
  };
}

export async function listMetaAdAccountCampaigns({ metaAdAccountId, limit = 50, pausedOnly = true } = {}) {
  const id = String(metaAdAccountId || "").trim();
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  query.set("pausedOnly", pausedOnly ? "true" : "false");

  const data = await apiGet(
    `/api/meta/ad-accounts/${encodeURIComponent(id)}/campaigns?${query.toString()}`,
  );
  const list = Array.isArray(data?.meta_campaigns) ? data.meta_campaigns : [];
  return { ok: true, metaCampaigns: list };
}

export async function getMetaStatus() {
  const data = await apiGet("/api/meta/status");
  return {
    ok: true,
    provider: data?.provider ?? null,
    graphVersion: data?.graph_version ?? null,
    hasAccessToken: Boolean(data?.has_access_token),
  };
}

export async function validateMetaToken() {
  const data = await apiPost("/api/meta/validate", {});
  return { ok: true, me: data?.me ?? null };
}

export async function getMetaCampaign(metaCampaignId) {
  const id = String(metaCampaignId || "").trim();
  const data = await apiGet(`/api/meta/campaigns/${encodeURIComponent(id)}`);
  return { ok: true, metaCampaign: data?.meta_campaign ?? null };
}

export async function createMetaAdSet(payload) {
  const data = await apiPost("/api/meta/adsets", payload ?? {});
  return { ok: true, metaAdSet: data?.meta_adset ?? null };
}

export async function createMetaAd(payload) {
  const data = await apiPost("/api/meta/ads", payload ?? {});
  return { ok: true, metaAd: data?.meta_ad ?? null };
}
