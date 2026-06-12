import { OPERATIONAL_MARKETS, getOperationalMarketLanguageGroup } from "./operationalMarkets.js";

export const OPERATIONAL_MEDIA_AD_KEYS = ["A", "B", "C", "D", "E"];

export const OPERATIONAL_MEDIA_GROUP_DEFINITIONS = [
  { group: "BR", language: "Português", aliases: ["BR", "PT"] },
  { group: "EN", language: "Inglês", aliases: ["EN"] },
  { group: "AE", language: "Árabe", aliases: ["AE", "AR"] },
  { group: "ES", language: "Espanhol", aliases: ["ES"] },
  { group: "FR", language: "Francês", aliases: ["FR"] },
  { group: "DE", language: "Alemão", aliases: ["DE"] },
  { group: "RU", language: "Russo", aliases: ["RU"] },
  { group: "HI", language: "Hindi", aliases: ["HI"] },
  { group: "TR", language: "Turco", aliases: ["TR"] },
  { group: "ZH", language: "Chinês Tradicional (Taiwan)", aliases: ["ZH"] },
];

const DEFINITIONS_BY_GROUP = new Map(OPERATIONAL_MEDIA_GROUP_DEFINITIONS.map((item) => [item.group, item]));
const GROUP_BY_ALIAS = new Map(
  OPERATIONAL_MEDIA_GROUP_DEFINITIONS.flatMap((item) => item.aliases.map((alias) => [alias.toUpperCase(), item.group])),
);

function normalizeMediaGroup(value) {
  return String(value || "").trim().toUpperCase();
}

export function resolveOperationalMediaGroup(value) {
  const normalized = normalizeMediaGroup(value);
  return GROUP_BY_ALIAS.get(normalized) || (DEFINITIONS_BY_GROUP.has(normalized) ? normalized : "");
}

export function getOperationalMediaGroups() {
  return OPERATIONAL_MEDIA_GROUP_DEFINITIONS.map((definition) => ({
    ...definition,
    marketCodes: OPERATIONAL_MARKETS.filter((market) => getOperationalMarketLanguageGroup(market) === definition.language)
      .map((market) => market.code)
      .sort(),
  }));
}

export const BULK_VIDEO_GROUPS = Object.fromEntries(getOperationalMediaGroups().map((item) => [item.group, item.marketCodes]));

export function getOperationalMediaGroupInfo(group) {
  const resolved = resolveOperationalMediaGroup(group);
  if (!resolved) return null;
  return getOperationalMediaGroups().find((item) => item.group === resolved) || null;
}

export function mediaGroupForMarket(code) {
  const normalized = normalizeMediaGroup(code);
  for (const item of getOperationalMediaGroups()) {
    if (item.marketCodes.includes(normalized)) return item.group;
  }
  return "Outro";
}

export function marketsForBulkGroup(group, selectedMarkets = []) {
  const resolved = resolveOperationalMediaGroup(group);
  const codes = BULK_VIDEO_GROUPS[resolved] || [];
  const selected = new Set((selectedMarkets || []).map(normalizeMediaGroup).filter(Boolean));
  return codes.filter((code) => selected.has(code));
}

export function parseBulkVideoFilename(filename) {
  const name = String(filename || "").trim();
  const match = /^video([A-Za-z]{2,8})([1-5])\.mp4$/i.exec(name);
  if (!match) return { recognized: false, group: "", alias: "", variantKey: "", reason: "Nome fora do padrão video<GRUPO><NUMERO>.mp4" };
  const alias = normalizeMediaGroup(match[1]);
  const group = resolveOperationalMediaGroup(alias);
  const variantKey = OPERATIONAL_MEDIA_AD_KEYS[Number(match[2]) - 1] || "";
  if (!group) {
    return { recognized: false, group: alias, alias, variantKey, reason: `Grupo ${alias} não está cadastrado para upload por idioma.` };
  }
  return { recognized: true, group, alias, variantKey, reason: "" };
}
