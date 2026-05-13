import { createMetaAdSet } from "../../../services/metaAdSets.js";

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed : "";
}

export async function createAdSet(payload) {
  const res = await createMetaAdSet(payload ?? {});
  return {
    mode: normalizeNonEmptyString(res?.mode) || null,
    metaAdSet: res?.metaAdSet ?? null,
    generatedCampaign: res?.generatedCampaign ?? null,
  };
}

