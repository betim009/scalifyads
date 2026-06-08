# P53A - Validacao de Targeting Operacional para AdSet Meta

Data: 2026-06-08

## Objetivo

Validar localmente o payload de targeting que sera usado futuramente na criacao de AdSets Meta para mercados operacionais.

Este P53A nao criou AdSet, Creative ou Ad, nao chamou endpoint de criacao de AdSet, nao alterou Campaigns existentes, nao introduziu `ACTIVE` e nao alterou scheduler.

## Auditoria do `metaCreateAdSet`

Arquivo auditado: `backend/src/meta/adsets.js`.

Formato atual esperado pelo helper:

```js
metaCreateAdSet({
  metaAdAccountId,
  metaCampaignId,
  name,
  countryCode,
  dailyBudgetCents,
  billingEvent,
  optimizationGoal,
  accessToken,
  status = 'PAUSED',
  bidStrategy,
  bidAmount,
  bidConstraints
})
```

Campos obrigatorios:

- `metaAdAccountId`: normalizado para `act_<digits>`.
- `metaCampaignId`: string nao vazia.
- `name`: string nao vazia.
- `countryCode`: ISO-2 unico, validado por regex `^[A-Z]{2}$`.
- `dailyBudgetCents`: inteiro positivo.
- `billingEvent`: string nao vazia.
- `optimizationGoal`: string nao vazia.
- `accessToken`: string nao vazia.

Targeting montado hoje:

```json
{
  "geo_locations": {
    "countries": ["<countryCode>"]
  }
}
```

Guardrail atual:

- O helper ignora o `status` recebido e envia sempre `status=PAUSED`.
- Nao ha suporte atual para `resolved_countries`.
- Nao ha suporte atual para `targeting_preview`.
- Nao ha suporte atual para multiplos paises.
- Nao ha suporte atual para exclusoes explicitas.

Conclusao da auditoria: o formato Meta esperado para paises (`geo_locations.countries`) e compativel com o modelo operacional, mas o helper atual aceita apenas um `countryCode` legado.

## Metodo de Validacao

Validacao local executada com:

- `resolveMarketMetaLocations`
- `generateOperationalMarkets`
- catalogo estatico de localizacoes em `backend/src/lib/metaLocations.js`

Mercados selecionados:

- `ARM`
- `AREU`
- `ENCA`

Checks executados:

- quantidade de paises resolvidos;
- formato ISO-2;
- duplicidades;
- exclusoes ainda presentes no payload final;
- comparacao entre `resolved_countries` e payload final Meta esperado;
- compatibilidade com o helper atual.

Nenhuma chamada Meta foi feita.

## Mercado ARM

Nome: `Árabe Mundo`

Estrategia: `catalog_country_expansion_preview_only`

Entradas operacionais:

- included: `Worldwide`
- excluded: `Taiwan`

### Países Resolvidos

Quantidade: 82

```json
[
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
```

Exclusoes resolvidas:

```json
["TW"]
```

### Payload Meta Esperado

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

### Validação

- Formato ISO-2 invalido: nenhum.
- Duplicidades: nenhuma.
- Excluidos ainda presentes: nenhum (`TW` nao aparece no payload final).
- `resolved_countries` vs payload final: iguais.

### Compatibilidade com Helper Atual

Nao compativel diretamente.

O helper atual geraria apenas:

```json
{
  "geo_locations": {
    "countries": ["AE"]
  }
}
```

`AE` e apenas `legacyCountryCode` de compatibilidade, nao o targeting operacional ARM.

## Mercado AREU

Nome: `Árabe Europa`

Estrategia: `country_expansion`

Entradas operacionais:

- included: `Europa`
- excluded: `Albânia`, `Bósnia e Herzegovina`, `Montenegro`, `Macedônia do Norte`, `Kosovo`

### Países Resolvidos

Quantidade: 33

```json
[
  "AD", "AT", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE",
  "ES", "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT",
  "LI", "LT", "LU", "LV", "MT", "NL", "NO", "PL", "PT", "RO",
  "SE", "SI", "SK"
]
```

Exclusoes resolvidas:

```json
["AL", "BA", "ME", "MK", "XK"]
```

### Payload Meta Esperado

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

### Validação

- Formato ISO-2 invalido: nenhum.
- Duplicidades: nenhuma.
- Excluidos ainda presentes: nenhum (`AL`, `BA`, `ME`, `MK`, `XK` nao aparecem no payload final).
- `resolved_countries` vs payload final: iguais.

Observacao: parte dos paises de AREU vem da constante interna `EUROPE_COUNTRY_CODES`, nao de entradas individuais do `META_LOCATION_CATALOG`. Isso nao e erro de formato; significa que a expansao regional usa uma lista interna consolidada.

### Compatibilidade com Helper Atual

Nao compativel diretamente.

O helper atual geraria apenas:

```json
{
  "geo_locations": {
    "countries": ["AT"]
  }
}
```

`AT` e apenas `legacyCountryCode` de compatibilidade, nao o targeting operacional AREU.

## Mercado ENCA

Nome: `Inglês Canadá`

Estrategia: `direct_country_codes`

Entradas operacionais:

- included: `Canadá`
- excluded: nenhum

### Países Resolvidos

Quantidade: 1

```json
["CA"]
```

Exclusoes resolvidas:

```json
[]
```

### Payload Meta Esperado

```json
{
  "geo_locations": {
    "countries": ["CA"]
  }
}
```

### Validação

- Formato ISO-2 invalido: nenhum.
- Duplicidades: nenhuma.
- Excluidos ainda presentes: nenhum.
- `resolved_countries` vs payload final: iguais.

### Compatibilidade com Helper Atual

Compativel por coincidencia operacional, porque ENCA tem um unico pais.

O helper atual geraria:

```json
{
  "geo_locations": {
    "countries": ["CA"]
  }
}
```

Mesmo nesse caso, a chamada atual ainda depende de `countryCode` legado, nao de `resolved_countries`.

## Comparativo

| Mercado | Países resolvidos | Exclusões aplicadas | Duplicidades | ISO-2 inválidos | Compatível com helper atual |
| --- | ---: | ---: | ---: | ---: | --- |
| ARM | 82 | 1 | 0 | 0 | Não |
| AREU | 33 | 5 | 0 | 0 | Não |
| ENCA | 1 | 0 | 0 | 0 | Sim, por ser país único |

## Problemas Encontrados

1. `metaCreateAdSet` ainda recebe `countryCode`, nao `targeting`.
2. O helper atual sempre monta `geo_locations.countries = [countryCode]`.
3. ARM e AREU perderiam quase todo o targeting se publicados pelo helper atual.
4. Exclusoes hoje sao aplicadas por remocao dos paises da lista final, nao por envio de um campo separado de exclusoes.
5. `targeting_preview.publishable=false` permanece correto: o payload esta validado como preview, mas ainda nao integrado ao helper real.

## Recomendação

Antes de criar AdSet real por mercado operacional:

1. Criar um helper puro de montagem de targeting operacional:
   - entrada: `market_code`, `resolved_countries`, `targeting_preview`;
   - saida: `{ geo_locations: { countries: [...] } }`;
   - valida ISO-2, duplicidade, lista vazia e exclusoes.
2. Adaptar `metaCreateAdSet` para aceitar `targeting` estruturado, mantendo o caminho legado `countryCode`.
3. Bloquear AdSet real quando:
   - `resolved_countries` estiver vazio;
   - houver codigo invalido;
   - uma exclusao ainda aparecer na lista final;
   - `publishable` ainda nao estiver liberado por etapa futura.
4. Manter `status=PAUSED`.
5. Validar ARM e AREU novamente antes da primeira chamada real de AdSet.

P53A valida que o payload operacional esperado e coerente com o formato Meta de paises, mas confirma que o helper atual ainda nao deve ser usado para ARM/AREU em producao real de AdSet.
