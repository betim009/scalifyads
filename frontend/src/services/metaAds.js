import { apiGet, apiPost } from "./http.js";

export async function createMetaAd(payload) {
  const data = await apiPost("/api/meta/ads", payload ?? {});
  return {
    ok: true,
    mode: data?.mode ?? null,
    creativeIdSource: data?.creative_id_source ?? null,
    metaAd: data?.meta_ad ?? null,
    generatedCampaign: data?.generated_campaign ?? null,
  };
}

export async function getMetaAd(metaAdId) {
  const id = String(metaAdId || "").trim();
  const data = await apiGet(`/api/meta/ads/${encodeURIComponent(id)}`);
  return { ok: true, metaAd: data?.meta_ad ?? null };
}

export async function getMetaAdPreviews(metaAdId, { adFormat } = {}) {
  const id = String(metaAdId || "").trim();
  if (!id) throw new Error("metaAdId is required");

  const fmt = String(adFormat || "").trim();
  const qs = fmt ? `?adFormat=${encodeURIComponent(fmt)}` : "";
  const data = await apiGet(`/api/meta/ads/${encodeURIComponent(id)}/previews${qs}`);
  return { ok: true, adFormat: data?.ad_format ?? (fmt || null), metaPreviews: data?.meta_previews ?? null };
}
