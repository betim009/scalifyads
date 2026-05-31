import { apiGet, apiPost, apiRequest } from "./http.js";

export async function listMetaAccounts() {
  const data = await apiGet("/api/meta-accounts");
  const list = Array.isArray(data?.meta_accounts) ? data.meta_accounts : [];
  return { ok: true, metaAccounts: list };
}

export async function createMetaAccount(payload) {
  const data = await apiPost("/api/meta-accounts", payload ?? {});
  return { ok: true, metaAccount: data?.meta_account ?? null };
}

export async function updateMetaAccount(metaAccountId, payload) {
  const id = String(metaAccountId || "").trim();
  const data = await apiRequest(`/api/meta-accounts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload ?? {},
  });
  return { ok: true, metaAccount: data?.meta_account ?? null };
}

export async function deleteMetaAccount(metaAccountId) {
  const id = String(metaAccountId || "").trim();
  const data = await apiRequest(`/api/meta-accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
  return { ok: true, ...data };
}

export async function setDefaultMetaAccount(metaAccountId) {
  const id = String(metaAccountId || "").trim();
  const data = await apiPost(`/api/meta-accounts/${encodeURIComponent(id)}/default`, {});
  return { ok: true, ...data };
}

export async function validateMetaAccount(metaAccountId) {
  const id = String(metaAccountId || "").trim();
  const data = await apiPost(`/api/meta-accounts/${encodeURIComponent(id)}/validate`, {});
  return { ok: true, me: data?.me ?? null };
}
