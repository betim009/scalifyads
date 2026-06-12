import { OPERATIONAL_MARKETS } from "../src/utils/operationalMarkets.js";
import {
  OPERATIONAL_MEDIA_AD_KEYS,
  getOperationalMediaGroupInfo,
  marketsForBulkGroup,
  mediaGroupForMarket,
  parseBulkVideoFilename,
} from "../src/utils/operationalMediaGroups.js";

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, error: message, ...details }, null, 2));
  process.exit(1);
}

const requiredMappings = {
  BR: "BR",
  PT: "BR",
  EN: "EN",
  AE: "AE",
  AR: "AE",
  ES: "ES",
  FR: "FR",
  DE: "DE",
  RU: "RU",
  HI: "HI",
  TR: "TR",
  ZH: "ZH",
};

const allMarketCodes = OPERATIONAL_MARKETS.map((market) => market.code);
const checked = [];

for (const [alias, expectedGroup] of Object.entries(requiredMappings)) {
  const parsed = parseBulkVideoFilename(`video${alias}1.mp4`);
  if (!parsed.recognized || parsed.group !== expectedGroup || parsed.variantKey !== "A") {
    fail("Required media filename was not recognized correctly.", { alias, expectedGroup, parsed });
  }

  const groupInfo = getOperationalMediaGroupInfo(parsed.group);
  if (!groupInfo?.language || !groupInfo.marketCodes.length) {
    fail("Recognized media group must have language and affected markets.", { alias, expectedGroup, groupInfo });
  }

  const affectedMarkets = marketsForBulkGroup(alias, allMarketCodes);
  if (!affectedMarkets.length) {
    fail("Recognized media group must resolve affected markets.", { alias, expectedGroup });
  }

  const unexpectedMarkets = affectedMarkets.filter((code) => mediaGroupForMarket(code) !== expectedGroup);
  if (unexpectedMarkets.length) {
    fail("Affected markets must map back to the expected media group.", { alias, expectedGroup, unexpectedMarkets });
  }

  checked.push({ alias, expectedGroup, language: groupInfo.language, affectedMarkets });
}

for (const filename of ["videoDE1.mp4", "videode1.mp4", "VideoDe1.mp4"]) {
  const parsed = parseBulkVideoFilename(filename);
  if (!parsed.recognized || parsed.group !== "DE" || parsed.variantKey !== "A") {
    fail("Case-insensitive DE filename was not recognized.", { filename, parsed });
  }
}

for (let index = 1; index <= 5; index += 1) {
  const parsed = parseBulkVideoFilename(`videoDE${index}.mp4`);
  const expectedVariantKey = OPERATIONAL_MEDIA_AD_KEYS[index - 1];
  if (!parsed.recognized || parsed.group !== "DE" || parsed.variantKey !== expectedVariantKey) {
    fail("DE A-E variation was not mapped correctly.", { index, expectedVariantKey, parsed });
  }
}

const invalid = parseBulkVideoFilename("videoXX1.mp4");
if (invalid.recognized || /tabela explícita/i.test(invalid.reason)) {
  fail("Invalid groups should remain rejected without legacy explicit-table messaging.", { invalid });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checkedAliases: checked.map((item) => ({
        alias: item.alias,
        group: item.expectedGroup,
        language: item.language,
        marketCount: item.affectedMarkets.length,
        markets: item.affectedMarkets,
      })),
      caseInsensitive: ["videoDE1.mp4", "videode1.mp4", "VideoDe1.mp4"],
      variations: OPERATIONAL_MEDIA_AD_KEYS.map((key, index) => `videoDE${index + 1}.mp4 -> Ad ${key}`),
    },
    null,
    2,
  ),
);
