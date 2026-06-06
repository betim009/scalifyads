import { apiGet, apiPost } from "./http.js";

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
  metaAccountId,
  countryCode,
  marketCode,
  marketName,
  marketParam,
  resolvedCountries,
  targetingPreview,
  mode,
  metaUserId,
} = {}) {
  const body = {
    name,
    metaAdAccountId,
    ...(metaAccountId ? { metaAccountId } : null),
    countryCode,
    ...(marketCode ? { marketCode } : null),
    ...(marketName ? { marketName } : null),
    ...(marketParam ? { marketParam } : null),
    ...(Array.isArray(resolvedCountries) ? { resolvedCountries } : null),
    ...(targetingPreview && typeof targetingPreview === "object" ? { targetingPreview } : null),
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

export async function getMetaCampaign(metaCampaignId) {
  const id = String(metaCampaignId || "").trim();
  const data = await apiGet(`/api/meta/campaigns/${encodeURIComponent(id)}`);
  return { ok: true, metaCampaign: data?.meta_campaign ?? null };
}

export async function pauseMetaCampaign(metaCampaignId) {
  const id = String(metaCampaignId || "").trim();
  const data = await apiPost(`/api/meta/campaigns/${encodeURIComponent(id)}/pause`, {});
  return { ok: true, metaCampaign: data?.meta_campaign ?? null };
}
