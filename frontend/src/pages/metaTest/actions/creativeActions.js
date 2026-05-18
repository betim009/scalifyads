import {
  getMetaCreative,
  getMetaCreativePreviews,
  publishMetaCreativeDraft,
} from "../../../services/metaCreatives.js";
import { normalizeNonEmptyString } from "../metaTestUtils.js";

export async function publishCreativeDraftAndExtractId(
  creativeDraftId,
  { pageId, instagramActorId, force } = {},
) {
  const id = normalizeNonEmptyString(creativeDraftId);
  if (!id) throw new Error("creativeDraftId is required");

  const res = await publishMetaCreativeDraft(id, {
    pageId: normalizeNonEmptyString(pageId) || null,
    instagramActorId: normalizeNonEmptyString(instagramActorId) || null,
    force: force === true,
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

export async function fetchMetaCreativePreviews(metaCreativeId, { adFormat } = {}) {
  const id = normalizeNonEmptyString(metaCreativeId);
  if (!id) throw new Error("metaCreativeId is required");

  const res = await getMetaCreativePreviews(id, { adFormat: normalizeNonEmptyString(adFormat) || undefined });
  return res?.metaPreviews ?? null;
}
