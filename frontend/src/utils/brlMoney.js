export function parseBrlToCents(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  // Accept:
  // - "10"
  // - "10,50"
  // - "10.50"
  // - also tolerate "1.234,56"
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  let normalized = raw;
  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  normalized = normalized.replace(/\s+/g, "");
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

export function formatBrlFromCents(cents, { withSymbol = true } = {}) {
  const value = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: withSymbol ? "currency" : "decimal",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatBrlInputFromCents(cents) {
  const value = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

