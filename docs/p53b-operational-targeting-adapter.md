# P53B - Operational Targeting Adapter

Data: 2026-06-08

## Objetivo

Adaptar a camada de construcao de targeting para suportar mercados operacionais multi-pais antes de qualquer criacao real de AdSet Meta.

Este P53B nao cria AdSet, Creative ou Ad, nao chama Meta REAL, nao altera Campaigns existentes, nao altera scheduler e nao introduz `ACTIVE`.

## Helper Atual de AdSet

Arquivo: `backend/src/meta/adsets.js`

Hoje o helper real `metaCreateAdSet` monta targeting internamente assim:

```js
const targeting = { geo_locations: { countries: [cc] } }
```

Entrada exigida pelo caminho legado:

- `countryCode`: ISO-2 unico.

Esse comportamento foi preservado. O P53B nao alterou `metaCreateAdSet` e nao mudou o fluxo legado.

## Novo Adapter Operacional

Arquivo: `backend/src/lib/marketTargeting.js`

Funcoes criadas:

- `buildOperationalMarketTargeting`
- `buildOperationalMarketTargetingPreview`

Entrada principal:

```js
buildOperationalMarketTargeting({
  marketCode,
  resolvedCountries,
  excludedCountryCodes,
  targetingPreview
})
```

Saida:

```json
{
  "ok": true,
  "errors": [],
  "marketCode": "ARM",
  "resolvedCountries": ["..."],
  "excludedCountryCodes": ["..."],
  "removedExcludedCountries": ["..."],
  "targeting": {
    "geo_locations": {
      "countries": ["..."]
    }
  },
  "targetingMetadata": {
    "excludedCountryCodes": ["..."],
    "removedExcludedCountries": ["..."]
  },
  "publishable": false,
  "previewOnly": true,
  "source": "operational_market_targeting"
}
```

Regras do adapter:

- Normaliza `marketCode`.
- Normaliza paises para ISO-2.
- Remove duplicidades.
- Remove paises excluidos da lista final `countries`.
- Expõe exclusoes em metadados (`excludedCountryCodes`/`removedExcludedCountries`), fora do payload Meta.
- Retorna erro se a lista final ficar vazia.
- Mantem `publishable=false` e `previewOnly=true`.

## Preview Técnico

`buildOperationalMarketTargetingPreview` retorna:

```json
{
  "ok": true,
  "finalPayloadPreview": {
    "targeting": {
      "geo_locations": {
        "countries": ["..."]
      }
    }
  },
  "excludedCountryCodes": ["..."],
  "removedExcludedCountries": ["..."],
  "publishable": false,
  "previewOnly": true
}
```

O `publish-preview` operacional tambem passa a usar esse adapter para montar `adSetPayloadPreview.targeting`. Isso continua sendo apenas preview; nenhuma chamada Meta e feita.

## Validação

Script criado:

```sh
node backend/scripts/validate-operational-targeting-adapter.js
```

O script nao usa banco, nao chama Meta e nao cria AdSet. Ele valida:

- `ARM`
- `AREU`
- `ENCA`
- caso invalido com todos os paises removidos por exclusao.

## ARM

Mercado: `Árabe Mundo`

Entrada:

- `resolvedCountries`: 82 paises.
- `excludedCountryCodes`: `["TW"]`.

Payload final:

```json
{
  "geo_locations": {
    "countries": [
      "AE", "AL", "AO", "AR", "AT", "AU", "BA", "BH", "BN", "BO",
      "BR", "BZ", "CA", "CH", "CI", "CL", "CO", "CV", "CY", "DE",
      "DZ", "EG", "ES", "FJ", "FR", "GB", "GR", "GT", "GY", "HK",
      "HT", "HU", "ID", "IE", "IL", "IN", "IT", "JP", "KE", "KG",
      "KH", "KR", "KW", "KZ", "LA", "LB", "LI", "LU", "LY", "MA",
      "ME", "MK", "MM", "MT", "MX", "MY", "MZ", "NI", "NL", "NO",
      "NP", "NZ", "OM", "PG", "PH", "PK", "PT", "PY", "QA", "RO",
      "SA", "SG", "SN", "SR", "TL", "TN", "TR", "US", "VE", "VN",
      "XK", "ZA"
    ]
  }
}
```

Resultado:

- Targeting valido.
- `TW` nao aparece em `countries`.
- Duplicidades: 0.
- `publishable=false`.
- `previewOnly=true`.

## AREU

Mercado: `Árabe Europa`

Entrada:

- `resolvedCountries`: 33 paises.
- `excludedCountryCodes`: `["AL", "BA", "ME", "MK", "XK"]`.

Payload final:

```json
{
  "geo_locations": {
    "countries": [
      "AD", "AT", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE",
      "ES", "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT",
      "LI", "LT", "LU", "LV", "MT", "NL", "NO", "PL", "PT", "RO",
      "SE", "SI", "SK"
    ]
  }
}
```

Resultado:

- Targeting valido.
- Exclusoes nao aparecem em `countries`.
- Duplicidades: 0.
- `publishable=false`.
- `previewOnly=true`.

## ENCA

Mercado: `Inglês Canadá`

Entrada:

- `resolvedCountries`: `["CA"]`.
- `excludedCountryCodes`: `[]`.

Payload final:

```json
{
  "geo_locations": {
    "countries": ["CA"]
  }
}
```

Resultado:

- Targeting valido.
- Continua compativel com o comportamento legado porque e pais unico.
- `publishable=false`.
- `previewOnly=true`.

## Caso Inválido

Entrada validada:

```js
{
  marketCode: 'ARM',
  resolvedCountries: ['CA', 'invalid', 'CA'],
  excludedCountryCodes: ['CA']
}
```

Resultado:

```json
{
  "ok": false,
  "errors": [
    "targeting countries must include at least one country after exclusions"
  ],
  "normalizedResolvedCountries": ["CA"],
  "removedExcludedCountries": ["CA"]
}
```

## Compatibilidade Preservada

Fluxo legado:

```text
countryCode unico
-> metaCreateAdSet
-> geo_locations.countries = [countryCode]
```

Fluxo operacional preparado:

```text
resolvedCountries + excludedCountryCodes
-> buildOperationalMarketTargeting
-> geo_locations.countries
-> excludedCountryCodes em metadados
```

O P53B nao conecta esse adapter ao endpoint real de criacao de AdSet. Essa conexao deve acontecer em etapa futura, com aprovacao explicita e mantendo `PAUSED`.

## Recomendação

Proximo passo antes de AdSet real:

1. Criar endpoint de preview de AdSet operacional, se necessario para UI.
2. Adaptar o endpoint real de AdSet para aceitar o targeting operacional somente quando aprovado.
3. Manter o caminho legado por `countryCode`.
4. Bloquear criacao se `buildOperationalMarketTargeting(...).ok !== true`.
5. Manter AdSet sempre `PAUSED`.
