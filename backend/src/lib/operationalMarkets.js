import {
  buildMarketTracking,
  generateMarketParam as buildGeneratedMarketParam
} from './marketTracking.js';

export const OFFICIAL_OPERATIONAL_MARKETS = [
  { code: "ARM", name: "Árabe Mundo", language: "Árabe", includedLocations: ["Worldwide"], excludedLocations: ["Taiwan"] },
  { code: "AREU", name: "Árabe Europa", language: "Árabe", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "ARIS", name: "Árabe Israel", language: "Árabe", includedLocations: ["Israel"], excludedLocations: [] },
  { code: "ARKU", name: "Árabe Kuwait", language: "Árabe", includedLocations: ["Bahrein", "Kuwait", "Omã"], excludedLocations: [] },
  { code: "AROM", name: "Árabe Oriente Médio", language: "Árabe", includedLocations: ["Emirados Árabes Unidos", "Catar", "Arábia Saudita"], excludedLocations: [] },
  { code: "DE", name: "Alemanha", language: "Alemão", includedLocations: ["Áustria", "Suíça", "Alemanha", "Liechtenstein", "Luxemburgo"], excludedLocations: [] },
  { code: "BN", name: "Bangladesh", language: "Bengali", includedLocations: ["Worldwide"], excludedLocations: ["Taiwan"] },
  { code: "BNOM", name: "Bangladesh Oriente Médio", language: "Bengali", includedLocations: ["Emirados Árabes Unidos", "Catar", "Arábia Saudita"], excludedLocations: [] },
  { code: "BR", name: "Brasil", language: "Todos os idiomas", includedLocations: ["Brasil"], excludedLocations: [] },
  { code: "BREUA", name: "Brasil EUA", language: "Português (Brasil)", includedLocations: ["Estados Unidos"], excludedLocations: [] },
  { code: "BREU", name: "Brasil Europa", language: "Português (Brasil)", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "BG", name: "Bulgária", language: "Búlgaro", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "KO", name: "Coreia", language: "Coreano", includedLocations: ["Coreia do Sul"], excludedLocations: [] },
  { code: "HR", name: "Croácia", language: "Croata", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "ZHHK", name: "Chinês Hong Kong", language: "Chinês Tradicional (Taiwan)", includedLocations: ["Hong Kong"], excludedLocations: [] },
  { code: "ZHML", name: "Chinês Malásia", language: "Chinês Tradicional (Taiwan)", includedLocations: ["Malásia"], excludedLocations: [] },
  { code: "ZHTW", name: "Chinês Taiwan", language: "Chinês Tradicional (Taiwan)", includedLocations: ["Taiwan"], excludedLocations: [] },
  { code: "SK", name: "Eslováquia", language: "Eslovaco", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "SL", name: "Eslovênia", language: "Esloveno", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "ESM", name: "Espanhol Mundo", language: "Espanhol", includedLocations: ["Worldwide"], excludedLocations: ["Bolívia", "Guatemala", "Nicarágua", "Paraguai", "Taiwan", "Venezuela"] },
  { code: "ESARG", name: "Espanhol Argentina", language: "Espanhol", includedLocations: ["Argentina"], excludedLocations: [] },
  { code: "ESCB", name: "Espanhol Colômbia", language: "Espanhol", includedLocations: ["Colômbia"], excludedLocations: [] },
  { code: "ESCH", name: "Espanhol Chile", language: "Espanhol", includedLocations: ["Chile"], excludedLocations: [] },
  { code: "ESEUA", name: "Espanhol EUA", language: "Espanhol", includedLocations: ["Estados Unidos"], excludedLocations: [] },
  { code: "ESEU", name: "Espanhol Europa", language: "Espanhol", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "ESMX", name: "Espanhol México", language: "Espanhol", includedLocations: ["México"], excludedLocations: [] },
  { code: "TLOM", name: "Filipinas Oriente Médio", language: "Filipino", includedLocations: ["Emirados Árabes Unidos", "Catar", "Arábia Saudita"], excludedLocations: [] },
  { code: "TL", name: "Filipinas", language: "Filipino", includedLocations: ["Worldwide"], excludedLocations: ["Taiwan"] },
  { code: "FRCN", name: "França Canadá", language: "Francês", includedLocations: ["Canadá"], excludedLocations: [] },
  { code: "FREU", name: "França Europa", language: "Francês", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "FRMD", name: "França Mundo", language: "Francês", includedLocations: ["Worldwide"], excludedLocations: ["Taiwan"] },
  { code: "EL", name: "Grécia", language: "Grego", includedLocations: ["Grécia"], excludedLocations: [] },
  { code: "NL", name: "Holanda", language: "Holandês", includedLocations: ["Holanda"], excludedLocations: [] },
  { code: "HU", name: "Hungria", language: "Húngaro", includedLocations: ["Hungria"], excludedLocations: [] },
  { code: "HIOM", name: "Hindi Oriente Médio", language: "Hindi", includedLocations: ["Emirados Árabes Unidos", "Catar", "Arábia Saudita"], excludedLocations: [] },
  { code: "HI", name: "Hindi", language: "Hindi", includedLocations: ["Índia"], excludedLocations: [] },
  { code: "ID", name: "Indonésia", language: "Indonésio", includedLocations: ["Indonésia"], excludedLocations: [] },
  { code: "ENAU", name: "Inglês Austrália", language: "Inglês", includedLocations: ["Austrália"], excludedLocations: [] },
  { code: "ENCA", name: "Inglês Canadá", language: "Inglês", includedLocations: ["Canadá"], excludedLocations: [] },
  { code: "ENOM", name: "Inglês Oriente Médio", language: "Inglês", includedLocations: ["Emirados Árabes Unidos", "Catar", "Arábia Saudita"], excludedLocations: [] },
  { code: "ENRU", name: "Inglês Reino Unido", language: "Inglês", includedLocations: ["Reino Unido"], excludedLocations: [] },
  { code: "ENNZ", name: "Inglês Nova Zelândia", language: "Inglês", includedLocations: ["Nova Zelândia"], excludedLocations: [] },
  { code: "ENAF", name: "Inglês África do Sul", language: "Inglês", includedLocations: ["África do Sul"], excludedLocations: [] },
  { code: "HE", name: "Israel", language: "Hebraico", includedLocations: ["Israel"], excludedLocations: [] },
  { code: "IT", name: "Itália", language: "Italiano", includedLocations: ["Itália"], excludedLocations: [] },
  { code: "JP", name: "Japão", language: "Japonês", includedLocations: ["Japão"], excludedLocations: [] },
  { code: "MS", name: "Malásia", language: "Malaio", includedLocations: ["Malásia"], excludedLocations: [] },
  { code: "PL", name: "Polônia", language: "Polonês", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "RO", name: "Romênia", language: "Romeno", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "RUEU", name: "Rússia Europa", language: "Russo", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "SRO", name: "S/Romênia", language: "Romeno", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo", "Romênia"] },
  { code: "RU", name: "Rússia Mundo", language: "Russo", includedLocations: ["Worldwide"], excludedLocations: ["Taiwan"] },
  { code: "SR", name: "Sérvia", language: "Sérvio", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "TH", name: "Tailândia", language: "Tailandês", includedLocations: ["Worldwide"], excludedLocations: ["Camboja", "Laos", "Myanmar", "Taiwan"] },
  { code: "CS", name: "Tcheco", language: "Tcheco", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "TREU", name: "Turco Europa", language: "Turco", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "TRM", name: "Turco Mundo", language: "Turco", includedLocations: ["Worldwide"], excludedLocations: ["Taiwan"] },
  { code: "UK", name: "Ucrânia", language: "Ucraniano", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "UROM", name: "Urdu Oriente Médio", language: "Urdu", includedLocations: ["Emirados Árabes Unidos", "Catar", "Arábia Saudita"], excludedLocations: [] },
  { code: "VI", name: "Vietnã", language: "Vietnamita", includedLocations: ["Worldwide"], excludedLocations: ["Taiwan"] },
  { code: "LT", name: "Lituânia", language: "Lituano", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "SV", name: "Suécia", language: "Sueco", includedLocations: ["Europa"], excludedLocations: ["Albânia", "Bósnia e Herzegovina", "Montenegro", "Macedônia do Norte", "Kosovo"] },
  { code: "ARAF", name: "Árabe África", language: "Árabe", includedLocations: ["Argélia", "Marrocos", "Tunísia"], excludedLocations: [] },
  { code: "ARAS", name: "Árabe Ásia", language: "Árabe", includedLocations: ["Arábia Saudita", "Emirados Árabes Unidos", "Kuwait", "Catar"], excludedLocations: [] },
  { code: "ARNE", name: "Árabe Norte e Europa", language: "Árabe", includedLocations: ["Canadá", "Alemanha", "França", "Itália", "Estados Unidos"], excludedLocations: [] },
  { code: "ARCA", name: "Árabe Canadá", language: "Árabe", includedLocations: ["Canadá"], excludedLocations: [] },
  { code: "ARUS", name: "Árabe EUA", language: "Árabe", includedLocations: ["Estados Unidos"], excludedLocations: [] },
  { code: "ARIT", name: "Árabe Itália", language: "Árabe", includedLocations: ["Itália"], excludedLocations: [] },
  { code: "BNEUAS", name: "Bengali Europa Ásia Sul", language: "Bengali", includedLocations: ["Reino Unido", "Itália", "Portugal"], excludedLocations: [] },
  { code: "BRAF", name: "Brasil África", language: "Português (Brasil)", includedLocations: ["Angola", "Cabo Verde", "Moçambique"], excludedLocations: [] },
  { code: "BREUOC", name: "Brasil Europa e Oceania", language: "Português (Brasil)", includedLocations: ["Portugal", "Irlanda", "Luxemburgo", "Austrália", "Nova Zelândia"], excludedLocations: [] },
  { code: "ZHEUOC", name: "Chinês Europa e Oceania", language: "Chinês Tradicional (Taiwan)", includedLocations: ["Austrália", "Espanha", "França", "Reino Unido", "Nova Zelândia"], excludedLocations: [] },
  { code: "ZHNA", name: "Chinês Norte", language: "Chinês Tradicional (Taiwan)", includedLocations: ["Canadá", "Estados Unidos"], excludedLocations: [] },
  { code: "ESAMNA", name: "Espanhol América Norte e África", language: "Espanhol", includedLocations: ["Canadá", "Estados Unidos", "Marrocos"], excludedLocations: [] },
  { code: "ESSL", name: "Espanhol Sul", language: "Espanhol", includedLocations: ["Argentina", "Chile", "Colômbia"], excludedLocations: [] },
  { code: "TLAS", name: "Filipinas Ásia", language: "Filipino", includedLocations: ["Filipinas"], excludedLocations: [] },
  { code: "TLSON", name: "Filipinas Sul Oceania e Norte", language: "Filipino", includedLocations: ["Austrália", "Brasil", "Canadá", "Chile", "Nova Zelândia", "Estados Unidos"], excludedLocations: [] },
  { code: "FRAF", name: "França África", language: "Francês", includedLocations: ["Costa do Marfim", "Marrocos", "Senegal"], excludedLocations: [] },
  { code: "FRAS", name: "França Ásia", language: "Francês", includedLocations: ["Camboja", "Líbano"], excludedLocations: ["Singapura", "Taiwan"] },
  { code: "FRN", name: "França Norte", language: "Francês", includedLocations: ["Canadá", "Haiti"], excludedLocations: [] },
  { code: "HIAS", name: "Hindi Ásia", language: "Hindi", includedLocations: ["Índia", "Nepal"], excludedLocations: [] },
  { code: "HISAF", name: "Hindi Sul Norte África", language: "Hindi", includedLocations: ["Canadá", "Guiana", "Quênia", "Suriname", "Estados Unidos", "África do Sul"], excludedLocations: [] },
  { code: "IDAS", name: "Indonésia Ásia", language: "Indonésio", includedLocations: ["Indonésia", "Timor-Leste"], excludedLocations: [] },
  { code: "IDSEUOC", name: "Indonésia Sul Europa Oceania", language: "Indonésio", includedLocations: ["Austrália", "Brasil", "Alemanha", "Países Baixos", "Papua-Nova Guiné", "Suriname"], excludedLocations: [] },
  { code: "ENEU", name: "Inglês Europa", language: "Inglês", includedLocations: ["Reino Unido", "Irlanda", "Malta"], excludedLocations: [] },
  { code: "ENNA", name: "Inglês Norte", language: "Inglês", includedLocations: ["Belize", "Canadá", "Estados Unidos"], excludedLocations: [] },
  { code: "ENOC", name: "Inglês Oceania", language: "Inglês", includedLocations: ["Austrália", "Ilhas Fiji", "Nova Zelândia"], excludedLocations: [] },
  { code: "MSAS", name: "Malásia Ásia", language: "Malaio", includedLocations: ["Brunei", "Malásia"], excludedLocations: [] },
  { code: "MSAOC", name: "Malásia Sul África Oceania", language: "Malaio", includedLocations: ["Austrália", "Nova Zelândia", "Suriname", "África do Sul"], excludedLocations: [] },
  { code: "RUAS", name: "Rússia Ásia", language: "Russo", includedLocations: ["Quirguistão", "Cazaquistão"], excludedLocations: [] },
  { code: "RUNOC", name: "Rússia Norte e Oceania", language: "Russo", includedLocations: ["Austrália", "Canadá", "Nova Zelândia", "Estados Unidos"], excludedLocations: [] },
  { code: "THAS", name: "Tailândia Ásia", language: "Tailandês", includedLocations: ["Chipre", "Turquia"], excludedLocations: [] },
  { code: "THNEUOC", name: "Tailândia Norte Europa Oceania", language: "Tailandês", includedLocations: ["Austrália", "Canadá", "Alemanha", "Reino Unido", "Nova Zelândia", "Estados Unidos"], excludedLocations: [] },
  { code: "TRAFN", name: "Turco África e Norte", language: "Turco", includedLocations: ["Canadá", "Egito", "Líbia", "Estados Unidos", "Europa"], excludedLocations: [] },
  { code: "TRAS", name: "Turco Ásia", language: "Turco", includedLocations: ["Índia", "Nepal"], excludedLocations: ["Singapura", "Taiwan"] },
  { code: "URAS", name: "Urdu Ásia", language: "Urdu", includedLocations: ["Paquistão"], excludedLocations: [] },
  { code: "UREUAF", name: "Urdu Europa Sul e África", language: "Urdu", includedLocations: ["Reino Unido", "Guiana", "Quênia", "Noruega", "África do Sul"], excludedLocations: [] },
  { code: "VIAS", name: "Vietnam Ásia", language: "Vietnamita", includedLocations: ["Vietnã"], excludedLocations: [] },
  { code: "VINA", name: "Vietnam Norte", language: "Vietnamita", includedLocations: ["Canadá", "Estados Unidos"], excludedLocations: [] },
  { code: "VISEU", name: "Vietnam Sul e Europa", language: "Vietnamita", includedLocations: ["Brasil", "Alemanha", "França"], excludedLocations: [] },
];

export const OPERATIONAL_MARKETS = OFFICIAL_OPERATIONAL_MARKETS.map((market) => ({
  ...market,
  slugMode: market.code === "BR" ? "br" : "international",
}));

export const OPERATIONAL_MARKET_CODES = OPERATIONAL_MARKETS.map((market) => market.code);

export function getOperationalMarketLanguageGroup(market) {
  const language = normalizeText(market?.language)
  const code = normalizeText(market?.code).toUpperCase()
  if (/^portugu[eê]s/i.test(language)) return 'Português'
  if (code === 'BR' && /^todos os idiomas$/i.test(language)) return 'Português'
  return language || 'Sem idioma'
}

export const MARKET_TARGETING_TYPES = {
  SIMPLE_LOCATION: "simple_location",
  LOCATION_GROUP: "location_group",
  REGION_WITH_EXCLUSIONS: "region_with_exclusions",
  WORLDWIDE_WITH_EXCLUSIONS: "worldwide_with_exclusions",
  LOCATION_GROUP_WITH_EXCLUSIONS: "location_group_with_exclusions",
  UNKNOWN: "unknown",
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getOperationalMarket(code) {
  const normalized = normalizeText(code).toUpperCase();
  return OPERATIONAL_MARKETS.find((market) => market.code === normalized) ?? null;
}

function normalizeLocationList(locations) {
  return Array.isArray(locations)
    ? locations.map((item) => normalizeText(item)).filter(Boolean)
    : [];
}

export function classifyMarketTargeting(marketOrCode) {
  const market = typeof marketOrCode === "string" ? getOperationalMarket(marketOrCode) : marketOrCode;
  if (!market) return MARKET_TARGETING_TYPES.UNKNOWN;

  const included = normalizeLocationList(market.includedLocations);
  const excluded = normalizeLocationList(market.excludedLocations);
  const includesWorldwide = included.some((item) => item.toLowerCase() === "worldwide");
  const includesRegion = included.some((item) => item.toLowerCase() === "europa");

  if (includesWorldwide && excluded.length > 0) return MARKET_TARGETING_TYPES.WORLDWIDE_WITH_EXCLUSIONS;
  if (includesRegion && excluded.length > 0) return MARKET_TARGETING_TYPES.REGION_WITH_EXCLUSIONS;
  if (included.length === 1 && excluded.length === 0) return MARKET_TARGETING_TYPES.SIMPLE_LOCATION;
  if (included.length > 1 && excluded.length === 0) return MARKET_TARGETING_TYPES.LOCATION_GROUP;
  if (included.length > 0 && excluded.length > 0) return MARKET_TARGETING_TYPES.LOCATION_GROUP_WITH_EXCLUSIONS;
  return MARKET_TARGETING_TYPES.UNKNOWN;
}

export function resolveMarketTargeting(marketCode) {
  const market = getOperationalMarket(marketCode);
  if (!market) return null;

  const includedLocations = normalizeLocationList(market.includedLocations);
  const excludedLocations = normalizeLocationList(market.excludedLocations);
  const targetingType = classifyMarketTargeting(market);

  return {
    marketCode: market.code,
    marketName: market.name,
    language: market.language,
    targetingType,
    publishable: false,
    reason: "preview_only_meta_location_mapping_pending",
    targeting: {
      included: includedLocations.map((name) => ({
        name,
        source: "official_catalog",
        metaLocation: null,
        status: "mapping_pending",
      })),
      excluded: excludedLocations.map((name) => ({
        name,
        source: "official_catalog",
        metaLocation: null,
        status: "mapping_pending",
      })),
    },
    metaTargetingPreview: {
      geo_locations: {
        included: includedLocations,
        excluded: excludedLocations,
      },
    },
  };
}

export function getMarketTargetingClassificationSummary(markets = OPERATIONAL_MARKETS) {
  return (markets || []).reduce((acc, market) => {
    const type = classifyMarketTargeting(market);
    acc[type] = acc[type] || [];
    acc[type].push(market.code);
    return acc;
  }, {});
}

export function generateMarketParam(marketCode, nicheParam) {
  return buildGeneratedMarketParam(marketCode, nicheParam) ?? "";
}

export function generateTrackingParams(marketCode, nicheParam) {
  const tracking = buildMarketTracking({ marketCode, nicheParam });
  return tracking
    ? {
        utm_source: tracking.utm_source,
        utm_medium: tracking.utm_medium,
        utm_campaign: tracking.utm_campaign,
        src: tracking.src,
      }
    : {
        utm_source: "facebook",
        utm_medium: "cpa",
        utm_campaign: normalizeText(marketCode).toUpperCase(),
        src: "",
      };
}

export function resolveSlug(marketCode, brSlug, internationalSlug) {
  const code = normalizeText(marketCode).toUpperCase();
  return code === "BR" ? normalizeText(brSlug) : normalizeText(internationalSlug);
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function stripBoundarySlash(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

export function buildFinalUrl(baseDomain, slug, trackingParams) {
  const base = normalizeText(baseDomain);
  const path = stripBoundarySlash(slug);
  const target = path ? `${stripTrailingSlash(base)}/${path}` : stripTrailingSlash(base);
  const url = new URL(target || "https://example.com");
  Object.entries(trackingParams || {}).forEach(([key, value]) => {
    const normalized = normalizeText(value);
    if (normalized) url.searchParams.set(key, normalized);
  });
  return url.toString();
}

export { buildMarketTracking };

export function buildMarketPreview({ markets, nicheParam, brSlug, internationalSlug, baseDomain }) {
  return (markets || [])
    .map((marketCode) => getOperationalMarket(marketCode))
    .filter(Boolean)
    .map((market) => {
      const slug = resolveSlug(market.code, brSlug, internationalSlug);
      const trackingParams = generateTrackingParams(market.code, nicheParam);
      const targetingPreview = resolveMarketTargeting(market.code);
      return {
        ...market,
        marketParam: trackingParams.src,
        utm_campaign: trackingParams.utm_campaign,
        src: trackingParams.src,
        slug,
        finalUrl: buildFinalUrl(baseDomain, slug, trackingParams),
        targetingPreview,
      };
    });
}

export function getOperationalMarketByCode(code) {
  return getOperationalMarket(code);
}

export function validateOperationalMarketCode(code) {
  return Boolean(getOperationalMarketByCode(code));
}

export function listOperationalMarkets() {
  return OPERATIONAL_MARKETS;
}
