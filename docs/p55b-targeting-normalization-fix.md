# P55B - Correcao de normalizacao do targeting operacional

## Contexto

No P55, a tentativa REAL de criar 1 AdSet Meta `PAUSED` falhou antes da criacao com:

```text
Normalization does not allow the value excluded_countries
```

O payload operacional enviado continha:

```json
{
  "geo_locations": {
    "countries": ["..."],
    "excluded_countries": ["TW"]
  }
}
```

A Graph API rejeitou `excluded_countries` dentro de `geo_locations`. Nenhum AdSet, Creative, Ad ou `ACTIVE` foi criado.

## Decisao

O payload real de AdSet nao deve enviar `geo_locations.excluded_countries`.

A exclusao operacional continua aplicada por normalizacao:

1. `resolvedCountries` e normalizado para ISO-2.
2. `excludedCountryCodes` e normalizado para ISO-2.
3. Paises excluidos sao removidos da lista final `geo_locations.countries`.
4. O payload real enviado para Meta contem somente `geo_locations.countries`.
5. Os paises excluidos continuam expostos como metadados para auditoria.

## Payload real esperado

ARM:

```json
{
  "geo_locations": {
    "countries": ["AE", "..."]
  }
}
```

Metadados:

```json
{
  "excludedCountryCodes": ["TW"],
  "removedExcludedCountries": []
}
```

AREU:

```json
{
  "geo_locations": {
    "countries": ["AD", "AT", "..."]
  }
}
```

Metadados:

```json
{
  "excludedCountryCodes": ["AL", "BA", "ME", "MK", "XK"],
  "removedExcludedCountries": []
}
```

## Arquivos alterados

- `backend/src/lib/marketTargeting.js`
- `backend/src/meta/adsets.js`
- `backend/src/services/operationalMarketAdSetPublisher.js`
- `backend/scripts/validate-operational-targeting-adapter.js`
- `backend/scripts/validate-operational-publish-adset.js`

## Guardrail adicional

Mesmo que algum chamador passe `targeting.geo_locations.excluded_countries` por engano para `metaCreateAdSet`, o helper sanitiza o payload e remove esse campo antes de montar a chamada Graph.

O fluxo legado continua preservado:

```text
countryCode unico
-> metaCreateAdSet
-> geo_locations.countries = [countryCode]
```

## Validacoes sem Meta REAL

Executado:

```bash
node backend/scripts/validate-operational-targeting-adapter.js
```

Resultado validado:

- ARM: 82 paises em `countries`;
- ARM: `TW` fora de `countries`;
- ARM: sem `geo_locations.excluded_countries`;
- AREU: 33 paises em `countries`;
- AREU: `AL`, `BA`, `ME`, `MK`, `XK` fora de `countries`;
- AREU: sem `geo_locations.excluded_countries`;
- ENCA: `CA` preservado;
- caso invalido: falha quando todos os paises validos sao excluidos.

Validador transacional:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5433/campaign_builder \
node backend/scripts/validate-operational-publish-adset.js
```

Esse script usa stub e rollback. Ele valida que o endpoint operacional envia targeting sem `excluded_countries`, nao usa `countryCode` legado, nao cria Creative, nao cria Ad e bloqueia duplicidade.

## Conclusao

P55B corrige a incompatibilidade descoberta no P55 sem chamar Meta REAL e sem criar AdSet. A proxima repeticao real do P55 deve testar somente 1 mercado, 1 AdSet `PAUSED`, usando o mesmo endpoint P54.
