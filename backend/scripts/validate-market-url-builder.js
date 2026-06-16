import assert from 'node:assert/strict'
import { buildMarketDestinationUrl } from '../src/lib/marketTracking.js'

const baseInput = {
  domain: 'https://menteinformada.com',
  brazilPermalink: 'aplicativos-para-assistir-jogos-de-futebol',
  internationalPermalink: 'apps-to-watch-football-games-2',
  nicheParam: 'FutebolBTN3'
}

const cases = [
  {
    label: 'BR',
    input: { ...baseInput, marketCode: 'BR' },
    expected:
      'https://menteinformada.com/aplicativos-para-assistir-jogos-de-futebol?utm_source=facebook&utm_medium=cpa&utm_campaign=BR&src=BR-FutebolBTN3-FB&niche=FutebolBTN3'
  },
  {
    label: 'DE',
    input: { ...baseInput, marketCode: 'DE' },
    expected:
      'https://menteinformada.com/DE/apps-to-watch-football-games-2?utm_source=facebook&utm_medium=cpa&utm_campaign=DE&src=DE-FutebolBTN3-FB&niche=FutebolBTN3'
  },
  {
    label: 'FRAF',
    input: { ...baseInput, marketCode: 'FRAF' },
    expected:
      'https://menteinformada.com/FR/apps-to-watch-football-games-2?utm_source=facebook&utm_medium=cpa&utm_campaign=FRAF&src=FRAF-FutebolBTN3-FB&niche=FutebolBTN3'
  },
  {
    label: 'Template antigo',
    input: {
      destinationUrl: 'https://www.google.com/?teste=scalifyads',
      marketCode: 'DE',
      nicheParam: 'CarrosBTN'
    },
    expected:
      'https://www.google.com/?teste=scalifyads&utm_source=facebook&utm_medium=cpa&utm_campaign=DE&src=DE-CarrosBTN-FB&niche=CarrosBTN'
  }
]

for (const testCase of cases) {
  assert.equal(buildMarketDestinationUrl(testCase.input), testCase.expected, `${testCase.label} final URL mismatch`)
}

console.log('validate-market-url-builder: OK')
