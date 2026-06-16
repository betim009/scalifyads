import { apiGet, apiPost } from "./http.js";

function normalizeId(id) {
  return encodeURIComponent(String(id || "").trim());
}

export async function getOperationalPublishPreview(id) {
  const data = await apiGet(`/api/operational-market-generations/${normalizeId(id)}/publish-preview`);
  return { ok: true, ...data };
}

export async function publishOperationalCampaign(id, { metaAdAccountId, objective, metaUserId } = {}) {
  return apiPost(`/api/operational-market-generations/${normalizeId(id)}/publish-campaign`, {
    metaAdAccountId,
    objective,
    ...(metaUserId ? { metaUserId } : null),
    confirmPublishPausedCampaign: true,
  });
}

export async function publishOperationalAdSet(
  id,
  { dailyBudgetCents, billingEvent, optimizationGoal, bidStrategy, bidAmount, bidConstraints, promotedObject } = {},
) {
  return apiPost(`/api/operational-market-generations/${normalizeId(id)}/publish-adset`, {
    dailyBudgetCents,
    billingEvent,
    optimizationGoal,
    ...(bidStrategy ? { bidStrategy } : null),
    ...(bidAmount ? { bidAmount } : null),
    ...(bidConstraints ? { bidConstraints } : null),
    ...(promotedObject ? { promotedObject } : null),
    confirmPublishPausedAdSet: true,
  });
}

export async function publishOperationalCreative(
  id,
  { pageId, instagramActorId, primaryText, headline, description, destinationUrl, ctaType, variantKey } = {},
) {
  return apiPost(`/api/operational-market-generations/${normalizeId(id)}/publish-creative`, {
    ...(pageId ? { pageId } : null),
    ...(instagramActorId ? { instagramActorId } : null),
    ...(primaryText ? { primaryText } : null),
    ...(headline ? { headline } : null),
    ...(description ? { description } : null),
    ...(destinationUrl ? { destinationUrl } : null),
    ...(ctaType ? { ctaType } : null),
    ...(variantKey ? { variantKey } : null),
    confirmPublishCreative: true,
  });
}

export async function publishOperationalAd(id, { variantKey } = {}) {
  return apiPost(`/api/operational-market-generations/${normalizeId(id)}/publish-ad`, {
    ...(variantKey ? { variantKey } : null),
    confirmPublishPausedAd: true,
  });
}

export async function syncOperationalMetaStatus(id) {
  return apiPost(`/api/operational-market-generations/${normalizeId(id)}/sync-meta-status`, {});
}
