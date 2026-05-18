import { getMetaCampaign } from "../../../services/metaCampaigns.js";
import { getMetaAdSet } from "../../../services/metaAdSets.js";
import { getMetaAd } from "../../../services/metaAds.js";
import { normalizeNonEmptyString } from "../metaTestUtils.js";

export async function fetchGraphCampaign(metaCampaignId) {
  const id = normalizeNonEmptyString(metaCampaignId);
  if (!id) return null;
  const res = await getMetaCampaign(id);
  return res ?? null;
}

export async function fetchGraphAdSet(metaAdSetId) {
  const id = normalizeNonEmptyString(metaAdSetId);
  if (!id) return null;
  const res = await getMetaAdSet(id);
  return res ?? null;
}

export async function fetchGraphAd(metaAdId) {
  const id = normalizeNonEmptyString(metaAdId);
  if (!id) return null;
  const res = await getMetaAd(id);
  return res ?? null;
}

