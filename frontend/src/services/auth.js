import { apiGet, apiPost } from "./http.js";

export async function getAuthMe() {
  const data = await apiGet("/api/auth/me");
  return {
    ok: true,
    authenticated: Boolean(data?.authenticated),
    user: data?.user ?? null,
  };
}

export async function login({ username, password } = {}) {
  const data = await apiPost("/api/auth/login", { username, password });
  return { ok: true, user: data?.user ?? null };
}

export async function register({ username, password } = {}) {
  const data = await apiPost("/api/auth/register", { username, password });
  return { ok: true, user: data?.user ?? null };
}

export async function logout() {
  const data = await apiPost("/api/auth/logout", {});
  return { ok: true, ...data };
}

export async function saveMetaCredentials({ metaAdAccountId, metaPageId, metaAccessToken } = {}) {
  const data = await apiPost("/api/auth/meta-credentials", {
    metaAdAccountId,
    metaPageId,
    metaAccessToken,
  });
  return { ok: true, ...data };
}

export async function listOperationalCountries({ limit = 200 } = {}) {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  const data = await apiGet(`/api/auth/operational-countries?${query.toString()}`);
  const list = Array.isArray(data?.operational_countries) ? data.operational_countries : [];
  return { ok: true, operationalCountries: list };
}

export async function addOperationalCountry({ countryCode } = {}) {
  const data = await apiPost(`/api/auth/operational-countries/add`, { countryCode });
  return { ok: true, ...data };
}

export async function removeOperationalCountry({ countryCode } = {}) {
  const data = await apiPost(`/api/auth/operational-countries/remove`, { countryCode });
  return { ok: true, ...data };
}

export async function addAllOperationalCountries() {
  const data = await apiPost(`/api/auth/operational-countries/add-all`, {});
  return { ok: true, ...data };
}

export async function setOperationalCountryLanguage({ countryCode, primaryLanguage } = {}) {
  const data = await apiPost(`/api/auth/operational-countries/language`, { countryCode, primaryLanguage });
  return { ok: true, ...data };
}
