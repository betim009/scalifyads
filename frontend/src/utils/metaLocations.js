import { OPERATIONAL_MARKETS, getOperationalMarket } from "./operationalMarkets.js";

export const META_LOCATION_MAPPING_STATUS = {
  READY: "mapping_ready",
  READY_INTERNAL: "mapping_ready_internal",
  PENDING: "mapping_pending",
};

export const META_LOCATION_TYPES = {
  COUNTRY: "country",
  REGION_GROUP: "region_group",
  WORLDWIDE_GROUP: "worldwide_group",
};

export const EUROPE_COUNTRY_CODES = [
  "AD",
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

export const META_LOCATION_CATALOG = [
  { name: "África do Sul", type: "country", countryCode: "ZA", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Albânia", type: "country", countryCode: "AL", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Alemanha", type: "country", countryCode: "DE", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Angola", type: "country", countryCode: "AO", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Arábia Saudita", type: "country", countryCode: "SA", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Argélia", type: "country", countryCode: "DZ", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Argentina", type: "country", countryCode: "AR", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Austrália", type: "country", countryCode: "AU", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Áustria", type: "country", countryCode: "AT", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Bahrein", type: "country", countryCode: "BH", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Belize", type: "country", countryCode: "BZ", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Bolívia", type: "country", countryCode: "BO", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Bósnia e Herzegovina", type: "country", countryCode: "BA", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Brasil", type: "country", countryCode: "BR", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Brunei", type: "country", countryCode: "BN", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Cabo Verde", type: "country", countryCode: "CV", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Camboja", type: "country", countryCode: "KH", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Canadá", type: "country", countryCode: "CA", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Catar", type: "country", countryCode: "QA", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Cazaquistão", type: "country", countryCode: "KZ", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Chile", type: "country", countryCode: "CL", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Chipre", type: "country", countryCode: "CY", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Colômbia", type: "country", countryCode: "CO", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Coreia do Sul", type: "country", countryCode: "KR", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Costa do Marfim", type: "country", countryCode: "CI", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Egito", type: "country", countryCode: "EG", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Emirados Árabes Unidos", type: "country", countryCode: "AE", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Espanha", type: "country", countryCode: "ES", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Estados Unidos", type: "country", countryCode: "US", status: META_LOCATION_MAPPING_STATUS.READY },
  {
    name: "Europa",
    type: META_LOCATION_TYPES.REGION_GROUP,
    key: "EUROPE",
    status: META_LOCATION_MAPPING_STATUS.READY_INTERNAL,
    strategy: "country_expansion",
    countryCodes: EUROPE_COUNTRY_CODES,
    publishable: false,
  },
  { name: "Filipinas", type: "country", countryCode: "PH", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "França", type: "country", countryCode: "FR", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Grécia", type: "country", countryCode: "GR", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Guatemala", type: "country", countryCode: "GT", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Guiana", type: "country", countryCode: "GY", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Haiti", type: "country", countryCode: "HT", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Holanda", type: "country", countryCode: "NL", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Hong Kong", type: "country", countryCode: "HK", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Hungria", type: "country", countryCode: "HU", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Ilhas Fiji", type: "country", countryCode: "FJ", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Índia", type: "country", countryCode: "IN", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Indonésia", type: "country", countryCode: "ID", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Irlanda", type: "country", countryCode: "IE", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Israel", type: "country", countryCode: "IL", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Itália", type: "country", countryCode: "IT", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Japão", type: "country", countryCode: "JP", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Kosovo", type: "country", countryCode: "XK", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Kuwait", type: "country", countryCode: "KW", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Laos", type: "country", countryCode: "LA", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Líbano", type: "country", countryCode: "LB", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Líbia", type: "country", countryCode: "LY", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Liechtenstein", type: "country", countryCode: "LI", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Luxemburgo", type: "country", countryCode: "LU", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Macedônia do Norte", type: "country", countryCode: "MK", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Malásia", type: "country", countryCode: "MY", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Malta", type: "country", countryCode: "MT", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Marrocos", type: "country", countryCode: "MA", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "México", type: "country", countryCode: "MX", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Moçambique", type: "country", countryCode: "MZ", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Montenegro", type: "country", countryCode: "ME", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Myanmar", type: "country", countryCode: "MM", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Nepal", type: "country", countryCode: "NP", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Nicarágua", type: "country", countryCode: "NI", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Noruega", type: "country", countryCode: "NO", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Nova Zelândia", type: "country", countryCode: "NZ", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Omã", type: "country", countryCode: "OM", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Países Baixos", type: "country", countryCode: "NL", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Papua-Nova Guiné", type: "country", countryCode: "PG", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Paquistão", type: "country", countryCode: "PK", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Paraguai", type: "country", countryCode: "PY", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Portugal", type: "country", countryCode: "PT", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Quênia", type: "country", countryCode: "KE", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Quirguistão", type: "country", countryCode: "KG", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Reino Unido", type: "country", countryCode: "GB", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Romênia", type: "country", countryCode: "RO", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Senegal", type: "country", countryCode: "SN", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Singapura", type: "country", countryCode: "SG", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Suíça", type: "country", countryCode: "CH", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Suriname", type: "country", countryCode: "SR", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Taiwan", type: "country", countryCode: "TW", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Timor-Leste", type: "country", countryCode: "TL", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Tunísia", type: "country", countryCode: "TN", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Turquia", type: "country", countryCode: "TR", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Venezuela", type: "country", countryCode: "VE", status: META_LOCATION_MAPPING_STATUS.READY },
  { name: "Vietnã", type: "country", countryCode: "VN", status: META_LOCATION_MAPPING_STATUS.READY },
  {
    name: "Worldwide",
    type: META_LOCATION_TYPES.WORLDWIDE_GROUP,
    key: "WORLDWIDE",
    status: META_LOCATION_MAPPING_STATUS.READY_INTERNAL,
    strategy: "catalog_country_expansion_preview_only",
    publishable: false,
  },
];

function normalizeName(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function listUniqueOperationalLocations(markets = OPERATIONAL_MARKETS) {
  const names = new Set();
  for (const market of markets || []) {
    for (const location of market?.includedLocations || []) names.add(location);
    for (const location of market?.excludedLocations || []) names.add(location);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function resolveMetaLocation(name) {
  const normalized = normalizeName(name);
  if (!normalized) {
    return {
      name: "",
      type: "unknown",
      status: META_LOCATION_MAPPING_STATUS.PENDING,
      reason: "empty_location",
    };
  }

  const found = META_LOCATION_CATALOG.find((location) => location.name === normalized);
  if (found) {
    if (found.name === "Worldwide") {
      return { ...found, countryCodes: getWorldwidePreviewCountryCodes() };
    }
    return { ...found };
  }

  return {
    name: normalized,
    type: "unknown",
    status: META_LOCATION_MAPPING_STATUS.PENDING,
    reason: "not_in_static_catalog",
  };
}

export function getWorldwidePreviewCountryCodes() {
  return Array.from(
    new Set(
      META_LOCATION_CATALOG
        .filter((location) => location.type === META_LOCATION_TYPES.COUNTRY && location.countryCode)
        .map((location) => location.countryCode)
    )
  ).sort();
}

export function expandIncludedLocations(locations = []) {
  return (locations || []).map((location) => {
    const resolved = typeof location === "string" ? resolveMetaLocation(location) : location;
    const countryCodes =
      resolved?.type === META_LOCATION_TYPES.COUNTRY && resolved.countryCode
        ? [resolved.countryCode]
        : Array.isArray(resolved?.countryCodes)
          ? resolved.countryCodes
          : [];
    return {
      ...resolved,
      resolvedCountryCodes: countryCodes,
      publishable: resolved?.publishable === true,
    };
  });
}

export function applyExcludedLocations(includedLocations = [], excludedLocations = []) {
  const includedCodes = new Set();
  for (const location of includedLocations || []) {
    for (const code of location?.resolvedCountryCodes || []) includedCodes.add(code);
  }

  const excludedCodes = new Set();
  for (const location of excludedLocations || []) {
    const resolved = typeof location === "string" ? resolveMetaLocation(location) : location;
    if (resolved?.type === META_LOCATION_TYPES.COUNTRY && resolved.countryCode) excludedCodes.add(resolved.countryCode);
    for (const code of resolved?.countryCodes || []) excludedCodes.add(code);
  }

  for (const code of excludedCodes) includedCodes.delete(code);

  return {
    countries: Array.from(includedCodes).sort(),
    excludedCountryCodes: Array.from(excludedCodes).sort(),
  };
}

export function resolveMarketMetaLocations(marketCode) {
  const market = getOperationalMarket(marketCode);
  if (!market) return null;

  const included = (market.includedLocations || []).map(resolveMetaLocation);
  const excluded = (market.excludedLocations || []).map(resolveMetaLocation);
  const expandedIncluded = expandIncludedLocations(included);
  const expansion = applyExcludedLocations(expandedIncluded, excluded);
  const all = [...included, ...excluded];
  const pendingLocations = all.filter((location) => location.status === META_LOCATION_MAPPING_STATUS.PENDING);

  return {
    marketCode: market.code,
    marketName: market.name,
    included,
    excluded,
    ready: pendingLocations.length === 0,
    publishable: false,
    publishableReason: "backend_market_targeting_not_integrated",
    pendingLocations,
    resolvedCountries: expansion.countries,
    excludedCountryCodes: expansion.excludedCountryCodes,
    strategy:
      included.some((location) => location.name === "Europa")
        ? "country_expansion"
        : included.some((location) => location.name === "Worldwide")
          ? "catalog_country_expansion_preview_only"
          : "direct_country_codes",
  };
}

export function getMetaLocationMappingSummary(markets = OPERATIONAL_MARKETS) {
  const uniqueLocations = listUniqueOperationalLocations(markets);
  const resolvedLocations = uniqueLocations.map(resolveMetaLocation);
  const readyLocations = resolvedLocations.filter((location) => location.status === META_LOCATION_MAPPING_STATUS.READY);
  const internalReadyLocations = resolvedLocations.filter((location) => location.status === META_LOCATION_MAPPING_STATUS.READY_INTERNAL);
  const pendingLocations = resolvedLocations.filter((location) => location.status === META_LOCATION_MAPPING_STATUS.PENDING);
  const resolvedMarkets = (markets || []).map((market) => resolveMarketMetaLocations(market.code)).filter(Boolean);
  const readyMarkets = resolvedMarkets.filter((market) => market.ready);
  const pendingMarkets = resolvedMarkets.filter((market) => !market.ready);
  const publishableMarkets = resolvedMarkets.filter((market) => market.publishable);
  const internalReadyMarkets = resolvedMarkets.filter((market) => market.ready && !market.publishable);
  const europeResolvedMarkets = resolvedMarkets.filter((market) => (market.included || []).some((location) => location.name === "Europa"));
  const worldwideResolvedMarkets = resolvedMarkets.filter((market) => (market.included || []).some((location) => location.name === "Worldwide"));

  return {
    totalMarkets: (markets || []).length,
    totalUniqueLocations: uniqueLocations.length,
    mappingReadyLocations: readyLocations.length,
    mappingReadyInternalLocations: internalReadyLocations.length,
    mappingPendingLocations: pendingLocations.length,
    readyMarkets: readyMarkets.length,
    pendingMarkets: pendingMarkets.length,
    publishableMarkets: publishableMarkets.length,
    internalReadyMarkets: internalReadyMarkets.length,
    europeResolvedMarkets: europeResolvedMarkets.length,
    worldwidePreviewOnlyMarkets: worldwideResolvedMarkets.length,
    pendingLocationNames: pendingLocations.map((location) => location.name),
    readyMarketCodes: readyMarkets.map((market) => market.marketCode),
    pendingMarketCodes: pendingMarkets.map((market) => market.marketCode),
    publishableMarketCodes: publishableMarkets.map((market) => market.marketCode),
  };
}
