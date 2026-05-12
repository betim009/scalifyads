import { apiGet, apiPost } from "./http.js";

export async function createOpsLogs({ source = "meta-test", entries } = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const data = await apiPost("/api/ops-logs", { source, entries: list });
  return { ok: true, opsLogs: Array.isArray(data?.ops_logs) ? data.ops_logs : [] };
}

export async function listOpsLogs({ source = "meta-test", entity, ok, limit = 100 } = {}) {
  const query = new URLSearchParams();
  if (source) query.set("source", String(source));
  if (entity) query.set("entity", String(entity));
  if (ok === true) query.set("ok", "true");
  if (ok === false) query.set("ok", "false");
  if (limit) query.set("limit", String(limit));
  const data = await apiGet(`/api/ops-logs?${query.toString()}`);
  return { ok: true, opsLogs: Array.isArray(data?.ops_logs) ? data.ops_logs : [] };
}

