import { OPERATIONAL_MARKETS, getOperationalMarketLanguageGroup } from "../src/utils/operationalMarkets.js";
import {
  CORE_OPERATIONAL_LANGUAGE_LABELS,
  bootstrapActiveLanguageKeys,
  getOperationalLanguages,
  normalizeLanguageKey,
} from "../src/utils/operationalLanguages.js";

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, error: message, ...details }, null, 2));
  process.exit(1);
}

const catalogCodes = OPERATIONAL_MARKETS.map((market) => market.code);
const duplicateCatalogCodes = catalogCodes.filter((code, index) => catalogCodes.indexOf(code) !== index);
if (duplicateCatalogCodes.length) {
  fail("Catalog has duplicate market codes.", { duplicateCatalogCodes });
}

const groups = new Map();
for (const market of OPERATIONAL_MARKETS) {
  const language = getOperationalMarketLanguageGroup(market);
  if (!language) fail("Market without language group.", { market });
  if (!groups.has(language)) groups.set(language, []);
  groups.get(language).push(market.code);
}

const groupedCodes = Array.from(groups.values()).flat();
const missingCodes = catalogCodes.filter((code) => !groupedCodes.includes(code));
const duplicateGroupedCodes = groupedCodes.filter((code, index) => groupedCodes.indexOf(code) !== index);
const duplicateVisualGroups = Array.from(groups.keys()).filter((language, index, all) => {
  const normalized = language.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return all.findIndex((item) => item.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalized) !== index;
});

if (missingCodes.length) fail("Some markets were not grouped.", { missingCodes });
if (duplicateGroupedCodes.length) fail("Some markets were grouped more than once.", { duplicateGroupedCodes });
if (duplicateVisualGroups.length) fail("Some visual language groups are duplicated.", { duplicateVisualGroups });

const summary = Array.from(groups.entries())
  .map(([language, codes]) => ({ language, total: codes.length, codes: [...codes].sort() }))
  .sort((a, b) => a.language.localeCompare(b.language, "pt-BR"));

const operationalLanguages = getOperationalLanguages();
const coreLanguages = operationalLanguages.filter((language) => language.isCore);
if (CORE_OPERATIONAL_LANGUAGE_LABELS.length !== 10) {
  fail("Core language label list must contain exactly 10 languages.", { total: CORE_OPERATIONAL_LANGUAGE_LABELS.length });
}
if (coreLanguages.length !== 10) {
  fail("Catalog must resolve exactly 10 core languages.", { total: coreLanguages.length, coreLanguages });
}

const coreWithoutTargetLanguage = coreLanguages.filter((language) => !language.targetLanguage);
if (coreWithoutTargetLanguage.length) {
  fail("Every core language must have targetLanguage.", { coreWithoutTargetLanguage });
}

const emptyBootstrap = bootstrapActiveLanguageKeys([]);
const expectedCoreKeys = CORE_OPERATIONAL_LANGUAGE_LABELS.map(normalizeLanguageKey).sort();
const missingCoreFromEmptyBootstrap = expectedCoreKeys.filter((key) => !emptyBootstrap.includes(key));
if (missingCoreFromEmptyBootstrap.length) {
  fail("Empty user bootstrap did not receive every core language.", { missingCoreFromEmptyBootstrap });
}

const partialBootstrap = bootstrapActiveLanguageKeys([normalizeLanguageKey("Bengali")]);
const missingCoreFromPartialBootstrap = expectedCoreKeys.filter((key) => !partialBootstrap.includes(key));
if (missingCoreFromPartialBootstrap.length || !partialBootstrap.includes(normalizeLanguageKey("Bengali"))) {
  fail("Partial user bootstrap did not preserve existing languages and add missing core languages.", {
    missingCoreFromPartialBootstrap,
    partialBootstrap,
  });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      totalMarkets: OPERATIONAL_MARKETS.length,
      totalGroups: groups.size,
      coreLanguageCount: coreLanguages.length,
      coreLanguages: coreLanguages.map((language) => ({
        label: language.label,
        key: language.key,
        targetLanguage: language.targetLanguage,
        marketCount: language.marketCodes.length,
      })),
      groups: summary,
    },
    null,
    2
  )
);
