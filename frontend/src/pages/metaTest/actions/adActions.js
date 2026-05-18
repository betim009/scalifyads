import { createMetaAd, getMetaAdPreviews } from "../../../services/metaAds.js";
import { normalizeNonEmptyString } from "../metaTestUtils.js";

export async function createAd(payload) {
  const res = await createMetaAd(payload ?? {});
  return {
    mode: normalizeNonEmptyString(res?.mode) || null,
    creativeIdSource: normalizeNonEmptyString(res?.creativeIdSource) || null,
    metaAd: res?.metaAd ?? null,
    generatedCampaign: res?.generatedCampaign ?? null,
  };
}

export async function fetchMetaAdPreviews(metaAdId, { adFormat } = {}) {
  const id = normalizeNonEmptyString(metaAdId);
  if (!id) throw new Error("metaAdId is required");

  const res = await getMetaAdPreviews(id, { adFormat: normalizeNonEmptyString(adFormat) || undefined });
  return res?.metaPreviews ?? null;
}
