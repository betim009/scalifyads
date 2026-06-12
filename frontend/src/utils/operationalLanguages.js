import { OPERATIONAL_MARKETS, getOperationalMarketLanguageGroup } from "./operationalMarkets.js";

export const CORE_OPERATIONAL_LANGUAGE_LABELS = [
  "Inglês",
  "Espanhol",
  "Árabe",
  "Português",
  "Francês",
  "Alemão",
  "Russo",
  "Chinês Tradicional (Taiwan)",
  "Hindi",
  "Turco",
];

const LANGUAGE_META = {
  Português: { targetLanguage: "pt", icon: "🇧🇷", mediaGroup: "PT", translationSupported: true },
  Inglês: { targetLanguage: "en", icon: "🌐", mediaGroup: "EN", translationSupported: true },
  Árabe: { targetLanguage: "ar", icon: "🌍", mediaGroup: "AR", translationSupported: true },
  Espanhol: { targetLanguage: "es", icon: "🇪🇸", mediaGroup: "ES", translationSupported: true },
  Alemão: { targetLanguage: "de", icon: "🇩🇪", mediaGroup: "DE", translationSupported: true },
  Francês: { targetLanguage: "fr", icon: "🇫🇷", mediaGroup: "FR", translationSupported: true },
  Russo: { targetLanguage: "ru", icon: "🌎", mediaGroup: "RU", translationSupported: true },
  "Chinês Tradicional (Taiwan)": { targetLanguage: "zh-Hant", icon: "🌎", mediaGroup: "ZH", translationSupported: true },
  Hindi: { targetLanguage: "hi", icon: "🌎", mediaGroup: "HI", translationSupported: true },
  Turco: { targetLanguage: "tr", icon: "🇹🇷", mediaGroup: "TR", translationSupported: true },
  Bengali: { targetLanguage: "bn", icon: "🌎", mediaGroup: "BN", translationSupported: true },
  Búlgaro: { targetLanguage: "bg", icon: "🌎", mediaGroup: "BG", translationSupported: true },
  Coreano: { targetLanguage: "ko", icon: "🌎", mediaGroup: "KO", translationSupported: true },
  Croata: { targetLanguage: "hr", icon: "🇭🇷", mediaGroup: "HR", translationSupported: true },
  Eslovaco: { targetLanguage: "sk", icon: "🌎", mediaGroup: "SK", translationSupported: true },
  Esloveno: { targetLanguage: "sl", icon: "🌎", mediaGroup: "SL", translationSupported: true },
  Filipino: { targetLanguage: "tl", icon: "🌎", mediaGroup: "TL", translationSupported: true },
  Grego: { targetLanguage: "el", icon: "🌎", mediaGroup: "EL", translationSupported: true },
  Hebraico: { targetLanguage: "he", icon: "🌎", mediaGroup: "HE", translationSupported: true },
  Holandês: { targetLanguage: "nl", icon: "🌎", mediaGroup: "NL", translationSupported: true },
  Húngaro: { targetLanguage: "hu", icon: "🌎", mediaGroup: "HU", translationSupported: true },
  Indonésio: { targetLanguage: "id", icon: "🌎", mediaGroup: "ID", translationSupported: true },
  Italiano: { targetLanguage: "it", icon: "🇮🇹", mediaGroup: "IT", translationSupported: true },
  Japonês: { targetLanguage: "ja", icon: "🌎", mediaGroup: "JP", translationSupported: true },
  Lituano: { targetLanguage: "lt", icon: "🇱🇹", mediaGroup: "LT", translationSupported: true },
  Malaio: { targetLanguage: "ms", icon: "🌎", mediaGroup: "MS", translationSupported: true },
  Polonês: { targetLanguage: "pl", icon: "🌎", mediaGroup: "PL", translationSupported: true },
  Romeno: { targetLanguage: "ro", icon: "🌎", mediaGroup: "RO", translationSupported: true },
  Sérvio: { targetLanguage: "sr", icon: "🇷🇸", mediaGroup: "SR", translationSupported: true },
  Sueco: { targetLanguage: "sv", icon: "🇸🇪", mediaGroup: "SV", translationSupported: true },
  Tailandês: { targetLanguage: "th", icon: "🌎", mediaGroup: "TH", translationSupported: true },
  Tcheco: { targetLanguage: "cs", icon: "🌎", mediaGroup: "CS", translationSupported: true },
  Ucraniano: { targetLanguage: "uk", icon: "🇺🇦", mediaGroup: "UK", translationSupported: true },
  Urdu: { targetLanguage: "ur", icon: "🌎", mediaGroup: "UR", translationSupported: true },
  Vietnamita: { targetLanguage: "vi", icon: "🇻🇳", mediaGroup: "VI", translationSupported: true },
};

export function normalizeLanguageKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getOperationalLanguages() {
  const byLabel = new Map();
  for (const market of OPERATIONAL_MARKETS) {
    const label = getOperationalMarketLanguageGroup(market);
    if (!label) continue;
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(market.code);
  }

  return Array.from(byLabel.entries())
    .map(([label, marketCodes]) => {
      const meta = LANGUAGE_META[label] || {};
      return {
        key: normalizeLanguageKey(label),
        label,
        targetLanguage: meta.targetLanguage || "",
        isCore: CORE_OPERATIONAL_LANGUAGE_LABELS.includes(label),
        icon: meta.icon || "🌎",
        marketCodes: [...new Set(marketCodes)].sort(),
        mediaGroup: meta.mediaGroup || "",
        translationSupported: Boolean(meta.translationSupported && meta.targetLanguage),
      };
    })
    .sort((a, b) => {
      const coreA = CORE_OPERATIONAL_LANGUAGE_LABELS.indexOf(a.label);
      const coreB = CORE_OPERATIONAL_LANGUAGE_LABELS.indexOf(b.label);
      if (coreA !== -1 || coreB !== -1) return (coreA === -1 ? 999 : coreA) - (coreB === -1 ? 999 : coreB);
      return a.label.localeCompare(b.label, "pt-BR");
    });
}

export function bootstrapActiveLanguageKeys(configuredKeys = []) {
  const existing = new Set((Array.isArray(configuredKeys) ? configuredKeys : []).map(normalizeLanguageKey).filter(Boolean));
  for (const label of CORE_OPERATIONAL_LANGUAGE_LABELS) existing.add(normalizeLanguageKey(label));
  return Array.from(existing).sort();
}

export function mergeLanguageCatalogWithActive(activeKeys = []) {
  const active = new Set(bootstrapActiveLanguageKeys(activeKeys));
  return getOperationalLanguages().map((language) => ({
    ...language,
    active: active.has(language.key),
  }));
}
