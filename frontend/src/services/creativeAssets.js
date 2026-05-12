import { apiGet, apiPostFormData } from "./http.js";

export async function listCreativeAssets({ limit = 50 } = {}) {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  const data = await apiGet(`/api/creative-assets?${query.toString()}`);
  return { ok: true, creativeAssets: Array.isArray(data?.creative_assets) ? data.creative_assets : [] };
}

export async function uploadCreativeAsset(file) {
  if (!file) throw new Error("Missing file");
  const form = new FormData();
  form.append("file", file);
  const data = await apiPostFormData("/api/creative-assets/upload", form);
  return { ok: true, creativeAsset: data?.creative_asset ?? null };
}

