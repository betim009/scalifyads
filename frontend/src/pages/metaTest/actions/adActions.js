import { createMetaAd } from "../../../services/metaAds.js";

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed : "";
}

export async function createAd(payload) {
  const res = await createMetaAd(payload ?? {});
  return {
    mode: normalizeNonEmptyString(res?.mode) || null,
    metaAd: res?.metaAd ?? null,
    generatedCampaign: res?.generatedCampaign ?? null,
  };
}

