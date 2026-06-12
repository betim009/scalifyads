import { apiGet } from "./http.js";

export async function getMetaObjectDiagnostic(type, id, { metaAccountId } = {}) {
  const normalizedType = String(type || "").trim().toLowerCase();
  const normalizedId = String(id || "").trim();
  if (!normalizedType) throw new Error("type is required");
  if (!normalizedId) throw new Error("id is required");
  const query = new URLSearchParams();
  if (metaAccountId) query.set("metaAccountId", String(metaAccountId));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiGet(`/api/meta/objects/${encodeURIComponent(normalizedType)}/${encodeURIComponent(normalizedId)}/diagnostic${qs}`);
}
