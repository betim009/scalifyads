import { apiGet, apiPost } from "./http.js";

export async function createMetaAd(payload) {
  const data = await apiPost("/api/meta/ads", payload ?? {});
  return {
    ok: true,
    mode: data?.mode ?? null,
    metaAd: data?.meta_ad ?? null,
    generatedCampaign: data?.generated_campaign ?? null,
  };
}

export async function getMetaAd(metaAdId) {
  const id = String(metaAdId || "").trim();
  const data = await apiGet(`/api/meta/ads/${encodeURIComponent(id)}`);
  return { ok: true, metaAd: data?.meta_ad ?? null };
}
