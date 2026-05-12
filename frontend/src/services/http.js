function getBaseUrl() {
  const raw = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
  return String(raw).replace(/\/+$/, "");
}

function buildUrl(path) {
  const p = String(path || "");
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return `${getBaseUrl()}${normalized}`;
}

async function readJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export class HttpError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status ?? null;
    this.body = body ?? null;
  }
}

export async function apiRequest(path, { method = "GET", body, headers, signal } = {}) {
  const url = buildUrl(path);
  const hasBody = body !== undefined;
  const res = await fetch(url, {
    method,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : null),
      ...(headers ?? null),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
    signal,
  });

  const json = await readJson(res);
  if (!res.ok) {
    const message =
      json?.error?.message ||
      json?.error ||
      json?.message ||
      `Request failed (${res.status})`;
    throw new HttpError(message, { status: res.status, body: json });
  }
  return json;
}

export async function apiPostFormData(path, formData, { headers, signal } = {}) {
  const url = buildUrl(path);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(headers ?? null),
      // DO NOT set Content-Type for FormData (browser will set boundary).
    },
    body: formData,
    signal,
  });

  const json = await readJson(res);
  if (!res.ok) {
    const message =
      json?.error?.message ||
      json?.error ||
      json?.message ||
      `Request failed (${res.status})`;
    throw new HttpError(message, { status: res.status, body: json });
  }
  return json;
}

export function apiGet(path, opts) {
  return apiRequest(path, { ...(opts ?? null), method: "GET" });
}

export function apiPost(path, body, opts) {
  return apiRequest(path, { ...(opts ?? null), method: "POST", body });
}

export function apiPatch(path, body, opts) {
  return apiRequest(path, { ...(opts ?? null), method: "PATCH", body });
}
