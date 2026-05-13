import { getMetaCreative, publishMetaCreativeDraft } from "../../../services/metaCreatives.js";

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed : "";
}

export async function publishCreativeDraftAndExtractId(creativeDraftId, { pageId, instagramActorId } = {}) {
  const id = normalizeNonEmptyString(creativeDraftId);
  if (!id) throw new Error("creativeDraftId is required");

  const res = await publishMetaCreativeDraft(id, {
    pageId: normalizeNonEmptyString(pageId) || null,
    instagramActorId: normalizeNonEmptyString(instagramActorId) || null,
  });

  const metaId =
    normalizeNonEmptyString(res?.metaCreative?.id) ||
    normalizeNonEmptyString(res?.creativeDraft?.meta_creative_id) ||
    "";

  return { metaId, metaCreative: res?.metaCreative ?? null, creativeDraft: res?.creativeDraft ?? null };
}

export async function fetchMetaCreative(metaCreativeId) {
  const id = normalizeNonEmptyString(metaCreativeId);
  if (!id) throw new Error("metaCreativeId is required");

  const res = await getMetaCreative(id);
  return res?.metaCreative ?? null;
}

