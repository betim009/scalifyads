import { apiGet, apiPost } from "./http.js";

export async function getMetaStatus() {
  const data = await apiGet("/api/meta/status");
  return {
    ok: true,
    dbEnabled: Boolean(data?.db_enabled),
    provider: data?.provider ?? null,
    graphVersion: data?.graph_version ?? null,
    hasAccessToken: Boolean(data?.has_access_token),
    hasPageId: Boolean(data?.has_page_id),
    hasInstagramActorId: Boolean(data?.has_instagram_actor_id),
  };
}

export async function validateMetaToken() {
  const data = await apiPost("/api/meta/validate", {});
  return { ok: true, me: data?.me ?? null };
}

export async function getMetaDiagnostics() {
  const data = await apiGet("/api/meta/diagnostics");
  return { ok: true, me: data?.me ?? null, dbEnabled: Boolean(data?.db_enabled) };
}
