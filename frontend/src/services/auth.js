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

