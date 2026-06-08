# P55F - AdSet REAL sem Pixel

## Objetivo

Validar a criacao de 1 AdSet Meta REAL em `PAUSED` usando uma combinacao que nao exige Pixel ou `promoted_object`, para testar o pipeline:

```text
Campaign operacional REAL -> AdSet operacional REAL
```

## Pre-condicoes

Campaign Meta:

```json
{
  "id": "120248694192270596",
  "name": "ARM-PlantasBTN-FB",
  "status": "PAUSED",
  "effective_status": "PAUSED",
  "objective": "OUTCOME_SALES",
  "account_id": "259174718403969",
  "adsetsCount": 0,
  "adsCount": 0
}
```

Linha operacional:

```json
{
  "operationalMarketGenerationId": "199c5ff6-0205-43a6-be34-a116e91ff6ba",
  "marketCode": "ARM",
  "marketParam": "ARM-PlantasBTN-FB",
  "generatedCampaignId": "3425b703-248a-4069-b2ba-89dab177461f",
  "metaCampaignId": "120248694192270596",
  "metaAdSetId": null,
  "status": "PAUSED",
  "metaRunMode": "REAL",
  "metaAdAccountId": "act_259174718403969",
  "generatedAdsets": 0,
  "generatedAds": 0
}
```

Backend iniciado localmente com schedulers desabilitados:

```text
META_STATUS_SCHEDULER_ENABLED=false
META_METRICS_SCHEDULER_ENABLED=false
AUTOMATION_SCHEDULER_ENABLED=false
META_STATUS_SCHEDULER_RUN_ON_STARTUP=false
META_METRICS_SCHEDULER_RUN_ON_STARTUP=false
AUTOMATION_RUN_ON_STARTUP=false
```

## Tentativa 1 - REACH

Endpoint:

```http
POST /api/operational-market-generations/199c5ff6-0205-43a6-be34-a116e91ff6ba/publish-adset
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
  "ok": false,
  "error": {
    "message": "Invalid parameter",
    "details": {
      "message": "Invalid parameter",
      "type": "OAuthException",
      "code": 100,
      "error_data": "{\"blame_field_specs\":[[\"compliance_section\"]]}",
      "error_subcode": 3858550,
      "is_transient": false,
      "error_user_title": "Nao ha uma declaracao universal de anuncios de Singapura",
      "error_user_msg": "Valor necessario para categorias regulamentadas regionais: para publicar anuncios que incluem localizacoes em Singapura, use o seguinte valor para categorias regulamentadas regionais: SINGAPORE_UNIVERSAL",
      "fbtrace_id": "A8M9QVjdgc04dshZAvHU-f9"
    }
  }
}
```

## Tentativa 2 - IMPRESSIONS

Como a primeira tentativa foi bloqueada, foi testada uma combinacao equivalente sem Pixel.

Endpoint:

```http
POST /api/operational-market-generations/199c5ff6-0205-43a6-be34-a116e91ff6ba/publish-adset
```

Payload:

```json
{
  "dailyBudgetCents": 1000,
  "billingEvent": "IMPRESSIONS",
  "optimizationGoal": "IMPRESSIONS",
  "confirmPublishPausedAdSet": true
}
```

Resposta:

```json
{
  "ok": false,
  "error": {
    "message": "Invalid parameter",
    "details": {
      "message": "Invalid parameter",
      "type": "OAuthException",
      "code": 100,
      "error_data": "{\"blame_field_specs\":[[\"compliance_section\"]]}",
      "error_subcode": 3858550,
      "is_transient": false,
      "error_user_title": "Nao ha uma declaracao universal de anuncios de Singapura",
      "error_user_msg": "Valor necessario para categorias regulamentadas regionais: para publicar anuncios que incluem localizacoes em Singapura, use o seguinte valor para categorias regulamentadas regionais: SINGAPORE_UNIVERSAL",
      "fbtrace_id": "As8VlXJV6O8JZCsIt7JnphH"
    }
  }
}
```

## Validacao apos as tentativas

Persistencia local:

```json
{
  "generatedCampaignId": "3425b703-248a-4069-b2ba-89dab177461f",
  "metaCampaignId": "120248694192270596",
  "metaAdSetId": null,
  "metaAdSetStatus": null,
  "metaRunMode": "REAL",
  "generatedAdsets": 0,
  "generatedAds": 0
}
```

Graph da Campaign apos as tentativas:

```json
{
  "id": "120248694192270596",
  "name": "ARM-PlantasBTN-FB",
  "status": "PAUSED",
  "effective_status": "PAUSED",
  "objective": "OUTCOME_SALES",
  "account_id": "259174718403969",
  "adsetsCount": 0,
  "adsets": [],
  "adsCount": 0,
  "ads": []
}
```

## Resultado

O criterio de aceite principal do P55F nao foi atingido: nenhum AdSet REAL foi criado.

O bloqueio atual nao e Pixel nem `promoted_object`. A Meta exige declaracao regional para targeting que inclui Singapura (`SG`):

```text
SINGAPORE_UNIVERSAL
```

Isso afeta o mercado ARM porque o targeting operacional validado contem Singapura entre os 82 paises.

## Estado final seguro

- Campaign continuou `PAUSED`;
- nenhum AdSet local criado;
- nenhum AdSet Meta criado;
- nenhum Creative criado;
- nenhum Ad criado;
- nenhum `ACTIVE`;
- nenhum lote executado.

## Proxima lacuna

Antes de repetir o teste REAL de AdSet para ARM, o pipeline precisa suportar os campos de compliance regional exigidos pela Meta para localizacoes reguladas, pelo menos para `SINGAPORE_UNIVERSAL`, sem remover os guardrails de `PAUSED` e sem criar Creative/Ad.
