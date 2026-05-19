import { apiGet, apiPost, apiDelete } from "./http.js";

export async function listCountryTemplates({ limit = 50 } = {}) {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  const data = await apiGet(`/api/country-templates?${query.toString()}`);
  return { ok: true, countryTemplates: Array.isArray(data?.country_templates) ? data.country_templates : [] };
}

export async function createCountryTemplate({ name, codes }) {
  const data = await apiPost(`/api/country-templates`, { name, codes });
  return { ok: true, countryTemplate: data?.country_template ?? null };
}

export async function deleteCountryTemplate(templateId) {
  const data = await apiDelete(`/api/country-templates/${encodeURIComponent(String(templateId))}`);
  return { ok: Boolean(data?.ok) };
}
