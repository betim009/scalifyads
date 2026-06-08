# P54 - Publicacao operacional de AdSet Meta PAUSED

## Objetivo

Criar a primeira ponte REAL entre uma `operational_market_generation` e um AdSet Meta, mantendo escopo minimo:

- cria somente AdSet;
- usa Campaign Meta ja publicada no P51/P52;
- usa targeting operacional multi-pais do P53B;
- forca `PAUSED`;
- nao cria Creative;
- nao cria Ad;
- nao altera scheduler;
- nao executa lote.

## Endpoint

```http
POST /api/operational-market-generations/:id/publish-adset
```

Payload:

```json
{
  "dailyBudgetCents": 1000,
  "billingEvent": "IMPRESSIONS",
  "optimizationGoal": "OFFSITE_CONVERSIONS",
  "confirmPublishPausedAdSet": true
}
```

Campos opcionais aceitos pelo helper Meta existente:

```json
{
  "bidStrategy": "LOWEST_COST_WITHOUT_CAP",
  "bidAmount": 100,
  "bidConstraints": {}
}
```

## Dependencias

O endpoint exige:

- `operational_market_generations.id` valido;
- Campaign operacional ja publicada;
- `generated_campaigns.meta_campaign_id` preenchido;
- `generated_campaigns.meta_ad_account_id` preenchido;
- `dailyBudgetCents` inteiro positivo;
- `billingEvent` preenchido;
- `optimizationGoal` preenchido;
- `confirmPublishPausedAdSet === true`;
- token Meta resolvido por `resolveAccessToken`.

O nome do AdSet usa `market_param`.

Exemplo:

```text
ARM-PlantasBTN-FB
```

## Targeting operacional

O endpoint chama obrigatoriamente:

```js
buildOperationalMarketTargeting({
  marketCode,
  resolvedCountries,
  targetingPreview
})
```

O payload enviado para `metaCreateAdSet` usa `targeting` estruturado:

```json
{
  "geo_locations": {
    "countries": ["AE", "..."]
  }
}
```

Paises excluidos continuam rastreados como metadados (`excludedCountryCodes`), mas nao sao enviados como `geo_locations.excluded_countries`.

O fluxo operacional nao usa `countryCode` legado para criar esse AdSet.

## Compatibilidade preservada

`metaCreateAdSet` agora aceita duas formas:

- legado: `countryCode`;
- operacional: `targeting.geo_locations.countries`.

Se `targeting` nao for enviado, o helper continua montando:

```json
{
  "geo_locations": {
    "countries": ["BR"]
  }
}
```

Isso preserva o comportamento dos endpoints antigos.

## Persistencia

Ao criar o AdSet, o backend atualiza `generated_campaigns`:

- `meta_adset_id`;
- `meta_adset_status`;
- `meta_adset_effective_status`;
- `meta_run_mode = REAL`;
- `status = PAUSED`;
- `ops_last_action = operational_market.adset.publish`;
- `ops_last_ok = true`;
- `ops_last_at`.

Tambem insere uma linha em `generated_adsets`:

- `generated_campaign_id`;
- `meta_adset_id`;
- `name`;
- `run_mode = REAL`;
- `status = PAUSED`;
- `effective_status`.

## Guardrails

O endpoint bloqueia:

- chamada sem confirmacao explicita;
- lote por `ids` ou `operationalMarketGenerationIds`;
- AdSet sem Campaign Meta ja publicada;
- AdSet sem conta Meta persistida;
- targeting operacional invalido;
- budget invalido;
- `billingEvent` ausente;
- `optimizationGoal` ausente.

O endpoint nao cria:

- Campaign;
- Creative;
- Ad.

O endpoint nao envia `ACTIVE`.

## Duplicidade

Se ja existir `meta_adset_id` em `generated_campaigns` ou em `generated_adsets` para a Campaign gerada, o endpoint retorna o registro existente e nao chama Meta novamente.

Resposta de duplicidade esperada:

```json
{
  "ok": true,
  "status": "PAUSED",
  "created": {
    "campaign": false,
    "adSet": false,
    "creative": false,
    "ad": false
  }
}
```

## Resposta de sucesso

```json
{
  "ok": true,
  "status": "PAUSED",
  "metaCampaignId": "120...",
  "metaAdSetId": "120...",
  "generatedCampaignId": "...",
  "generatedAdSetId": "...",
  "operationalMarketGenerationId": "...",
  "targeting": {
    "geo_locations": {
      "countries": ["AE", "..."]
    }
  },
  "targetingMetadata": {
    "excludedCountryCodes": ["TW"],
    "removedExcludedCountries": []
  },
  "created": {
    "campaign": false,
    "adSet": true,
    "creative": false,
    "ad": false
  }
}
```

## Validacao sem Meta REAL

Script:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5433/campaign_builder \
node backend/scripts/validate-operational-publish-adset.js
```

O script:

- usa transacao com rollback;
- injeta stub de `createAdSet`;
- valida bloqueio sem confirmacao;
- valida bloqueio sem budget;
- valida bloqueio sem `billingEvent`;
- valida bloqueio sem `optimizationGoal`;
- valida bloqueio sem Campaign Meta previa;
- valida targeting ARM com 82 paises e exclusao de `TW`;
- confirma que o fluxo operacional nao usa `countryCode` legado;
- confirma persistencia em `generated_campaigns`;
- confirma persistencia em `generated_adsets`;
- confirma que nenhum `generated_ads` foi criado;
- confirma prevencao de duplicidade.

## Procedimento REAL seguro

1. Escolher uma unica linha em `operational_market_generations`.
2. Confirmar que a linha ja possui Campaign publicada via `generated_campaigns.meta_campaign_id`.
3. Confirmar que nao existe `meta_adset_id` para essa Campaign gerada.
4. Chamar somente:

```http
POST /api/operational-market-generations/:id/publish-adset
```

5. Usar payload com `confirmPublishPausedAdSet: true`.
6. Validar na resposta:

- `status = PAUSED`;
- `created.adSet = true`;
- `created.campaign = false`;
- `created.creative = false`;
- `created.ad = false`.

7. Validar no Meta Graph que o AdSet existe em `PAUSED`.
8. Validar localmente `generated_campaigns.meta_adset_id` e uma linha em `generated_adsets`.

## Recomendacao

O P54 esta pronto para validacao REAL controlada em um unico mercado ja publicado. O proximo passo deve continuar limitado: validar um AdSet real PAUSED e registrar IDs, sem criar Creative ou Ad.
