# P55I - AdSet REAL ENCA sem Pixel

## Objetivo

Validar o pipeline operacional REAL:

```text
operational_market_generation ENCA
-> Campaign Meta PAUSED
-> AdSet Meta PAUSED
```

Sem Pixel, sem Singapura, sem Creative, sem Ad e sem `ACTIVE`.

## Linha operacional

- Mercado: `ENCA`
- `operational_market_generation_id`: `aa36d50e-3120-4e48-aa8b-58f81a481f33`
- `market_param`: `ENCA-PlantasBTN-FB`
- `resolved_countries`: `["CA"]`

Linha escolhida porque ainda nao possuia `generated_campaigns` publicado.

## Pre-condicao

Antes da execucao:

```json
{
  "operationalMarketGenerationId": "aa36d50e-3120-4e48-aa8b-58f81a481f33",
  "marketCode": "ENCA",
  "marketParam": "ENCA-PlantasBTN-FB",
  "resolvedCountries": ["CA"],
  "generatedCampaignId": null,
  "metaCampaignId": null,
  "metaAdSetId": null
}
```

Backend local iniciado com schedulers desabilitados:

```text
META_STATUS_SCHEDULER_ENABLED=false
META_METRICS_SCHEDULER_ENABLED=false
AUTOMATION_SCHEDULER_ENABLED=false
META_STATUS_SCHEDULER_RUN_ON_STARTUP=false
META_METRICS_SCHEDULER_RUN_ON_STARTUP=false
AUTOMATION_RUN_ON_STARTUP=false
```

## Campaign criada

Endpoint:

```http
POST /api/operational-market-generations/aa36d50e-3120-4e48-aa8b-58f81a481f33/publish-campaign
```

Payload:

```json
{
  "metaAdAccountId": "act_259174718403969",
  "objective": "OUTCOME_AWARENESS",
  "confirmPublishPausedCampaign": true
}
```

Resposta:

```json
{
  "ok": true,
  "status": "PAUSED",
  "metaCampaignId": "120248719385340596",
  "generatedCampaignId": "41d063c6-8a5c-4098-a0bd-b24297eed781",
  "operationalMarketGenerationId": "aa36d50e-3120-4e48-aa8b-58f81a481f33",
  "duplicated": false,
  "created": {
    "campaign": true,
    "adSet": false,
    "creative": false,
    "ad": false
  }
}
```

## AdSet criado

Endpoint:

```http
POST /api/operational-market-generations/aa36d50e-3120-4e48-aa8b-58f81a481f33/publish-adset
```

Payload:

```json
{
  "dailyBudgetCents": 1000,
  "billingEvent": "IMPRESSIONS",
  "optimizationGoal": "REACH",
  "confirmPublishPausedAdSet": true
}
```

Resposta:

```json
{
  "ok": true,
  "status": "PAUSED",
  "metaCampaignId": "120248719385340596",
  "metaAdSetId": "120248719401030596",
  "generatedCampaignId": "41d063c6-8a5c-4098-a0bd-b24297eed781",
  "generatedAdSetId": "afffeadd-5493-4113-901a-3f5cffe18f3c",
  "operationalMarketGenerationId": "aa36d50e-3120-4e48-aa8b-58f81a481f33",
  "targeting": {
    "geo_locations": {
      "countries": ["CA"]
    }
  },
  "targetingMetadata": {
    "excludedCountryCodes": [],
    "removedExcludedCountries": []
  },
  "promotedObject": null,
  "complianceSection": null,
  "duplicated": false,
  "created": {
    "campaign": false,
    "adSet": true,
    "creative": false,
    "ad": false
  }
}
```

## Validacao Graph

Campaign:

```json
{
  "id": "120248719385340596",
  "name": "ENCA-PlantasBTN-FB",
  "status": "PAUSED",
  "effective_status": "PAUSED",
  "objective": "OUTCOME_AWARENESS",
  "account_id": "259174718403969",
  "adsetsCount": 1,
  "adsCount": 0,
  "ads": []
}
```

AdSet:

```json
{
  "id": "120248719401030596",
  "name": "ENCA-PlantasBTN-FB",
  "status": "PAUSED",
  "effective_status": "PAUSED",
  "campaign_id": "120248719385340596",
  "daily_budget": "1000",
  "optimization_goal": "REACH",
  "billing_event": "IMPRESSIONS",
  "targeting": {
    "geo_locations": {
      "countries": ["CA"],
      "location_types": ["home", "recent"]
    }
  },
  "configured_status": "PAUSED"
}
```

## Validacao local

```json
{
  "generatedCampaignId": "41d063c6-8a5c-4098-a0bd-b24297eed781",
  "metaCampaignId": "120248719385340596",
  "metaAdSetId": "120248719401030596",
  "metaAdSetStatus": "PAUSED",
  "metaRunMode": "REAL",
  "status": "PAUSED",
  "marketCode": "ENCA",
  "marketParam": "ENCA-PlantasBTN-FB",
  "resolvedCountries": ["CA"],
  "generatedAdSetId": "afffeadd-5493-4113-901a-3f5cffe18f3c",
  "generatedAds": 0
}
```

Observacao: localmente `meta_adset_effective_status`/`generated_adsets.effective_status` retornaram `IN_PROCESS`, enquanto a Graph retornou `effective_status = PAUSED`. A validacao final usa Graph como fonte da verdade para o status efetivo real.

## Confirmacoes

- 1 Campaign ENCA criada.
- 1 AdSet ENCA criado.
- Campaign `PAUSED`.
- AdSet `PAUSED`.
- Targeting operacional aplicado com `countries = ["CA"]`.
- Sem Singapura no targeting.
- Sem Pixel/promoted_object.
- Sem compliance regional.
- Nenhum Creative criado.
- Nenhum Ad criado.
- Nenhum `ACTIVE`.
- Nenhum lote executado.

## Conclusao

P55I atingiu o criterio de aceite. O pipeline operacional `Campaign -> AdSet` foi validado em ambiente REAL usando ENCA, sem Pixel e sem Singapura.
