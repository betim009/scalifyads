import { apiDelete, apiGet, apiPatch, apiPost } from "./http.js";

export async function listFlowTemplates({ limit = 100 } = {}) {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  const data = await apiGet(`/api/flow-templates?${query.toString()}`);
  return { ok: true, flowTemplates: Array.isArray(data?.flow_templates) ? data.flow_templates : [] };
}

export async function createFlowTemplate({ name, payload } = {}) {
  const data = await apiPost(`/api/flow-templates`, { name, payload });
  return { ok: true, flowTemplate: data?.flow_template ?? null };
}

export async function updateFlowTemplate(id, { name, payload } = {}) {
  const data = await apiPatch(`/api/flow-templates/${encodeURIComponent(String(id))}`, { name, payload });
  return { ok: true, flowTemplate: data?.flow_template ?? null };
}

export async function deleteFlowTemplate(id) {
  const data = await apiDelete(`/api/flow-templates/${encodeURIComponent(String(id))}`);
  return { ok: true, flowTemplate: data?.flow_template ?? null };
}

