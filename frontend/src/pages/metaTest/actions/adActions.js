import { createMetaAd } from "../../../services/metaAds.js";
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
