# P55 - Validacao REAL de AdSet Meta PAUSED

## Resumo

Validacao executada em ambiente REAL para criar 1 AdSet Meta `PAUSED` a partir da Campaign operacional publicada no P52.

Resultado: a Meta rejeitou o payload de targeting antes de criar o AdSet.

Nenhum AdSet foi criado. Nenhum Creative foi criado. Nenhum Ad foi criado. Nenhum `ACTIVE` foi introduzido.

## Mercado usado

- Mercado: `ARM`
- Linha operacional: `199c5ff6-0205-43a6-be34-a116e91ff6ba`
- `market_param`: `ARM-PlantasBTN-FB`
- `generated_campaign_id`: `3425b703-248a-4069-b2ba-89dab177461f`

## Campaign usada

- Campaign Meta ID: `120248694192270596`
- Nome: `ARM-PlantasBTN-FB`
- Conta: `act_259174718403969`
- Objective: `OUTCOME_SALES`
- Status antes do teste: `PAUSED`
- Effective status antes do teste: `PAUSED`

Pre-condicao local confirmada antes da chamada:

```json
{
  "operationalMarketGenerationId": "199c5ff6-0205-43a6-be34-a116e91ff6ba",
  "generatedCampaignId": "3425b703-248a-4069-b2ba-89dab177461f",
  "metaCampaignId": "120248694192270596",
  "metaAdSetId": null,
  "status": "PAUSED",
  "metaRunMode": "REAL",
  "generatedAdsets": 0,
  "generatedAds": 0
}
```

## Endpoint executado

```http
POST /api/operational-market-generations/199c5ff6-0205-43a6-be34-a116e91ff6ba/publish-adset
```

Payload enviado:

```json
{
  "dailyBudgetCents": 1000,
  "billingEvent": "IMPRESSIONS",
  "optimizationGoal": "OFFSITE_CONVERSIONS",
  "confirmPublishPausedAdSet": true
}
```

## Resposta recebida

```json
{
  "ok": false,
  "error": {
    "message": "Invalid parameter",
    "details": {
      "message": "Invalid parameter",
      "type": "OAuthException",
      "code": 100,
      "error_subcode": 1487079,
      "is_transient": false,
      "error_user_title": "Especificacao de alvo invalida",
      "error_user_msg": "A especificacao de direcionamento indicada nao e valida porque: Invalid data for field geo_locations. Especificacao de alvo invalida: A especificacao de direcionamento indicada nao e valida porque: Normalization does not allow the value excluded_countries",
      "fbtrace_id": "A7Ud6bqI24nbyOCPN9quZ8Q"
    }
  }
}
```

## Validacao local apos a tentativa

Persistencia local permaneceu sem AdSet:

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

## Validacao Graph apos a tentativa

Consulta Graph da Campaign `120248694192270596`:

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

## Validacoes

- Campaign continua `PAUSED`: confirmado.
- Campaign continua com `effective_status = PAUSED`: confirmado.
- Nenhum AdSet local criado: confirmado.
- Nenhum AdSet Meta criado: confirmado por Graph.
- Nenhum Creative criado: confirmado por ausencia de fluxo de Creative e sem persistencia local.
- Nenhum Ad criado: confirmado localmente e por Graph.
- Nenhum `ACTIVE`: confirmado.
- Lote nao executado: confirmado, somente 1 `operational_market_generation_id`.

## Inconsistencia encontrada

O P53B/P54 construiu targeting operacional usando:

```json
{
  "geo_locations": {
    "countries": ["..."],
    "excluded_countries": ["TW"]
  }
}
```

Na chamada REAL, a Meta rejeitou `excluded_countries` dentro de `geo_locations`:

```text
Normalization does not allow the value excluded_countries
```

Isso indica que o formato aceito pela Graph API para exclusoes nao e o mesmo formato previsto no adapter operacional. A lista multi-pais em `countries` nao chegou a ser validada isoladamente porque a chamada foi bloqueada pela presenca de `excluded_countries`.

## Conclusao

O criterio de aceite principal do P55 nao foi atingido: nenhum AdSet REAL foi criado.

A falha ocorreu de forma segura:

- Meta rejeitou o payload antes da criacao;
- nenhuma persistencia local de AdSet aconteceu;
- Campaign permaneceu `PAUSED`;
- nenhum Creative foi criado;
- nenhum Ad foi criado;
- nenhum `ACTIVE` foi introduzido.

Antes de repetir a validacao REAL, o adapter operacional de targeting precisa ser ajustado para um formato de exclusao aceito pela Meta Graph API, preservando o suporte multi-pais e mantendo o fluxo legado intacto.

Nota P55B: a correcao foi documentada em `docs/p55b-targeting-normalization-fix.md`. O payload real deixa de enviar `geo_locations.excluded_countries`; os paises excluidos sao removidos de `geo_locations.countries` e mantidos como metadados.

## P55C - Repeticao apos correcao de targeting

Validacao repetida apos o P55B, sem alteracao de codigo durante o teste.

### Pre-condicoes

Local:

```json
{
  "operationalMarketGenerationId": "199c5ff6-0205-43a6-be34-a116e91ff6ba",
  "generatedCampaignId": "3425b703-248a-4069-b2ba-89dab177461f",
  "metaCampaignId": "120248694192270596",
  "metaAdSetId": null,
  "status": "PAUSED",
  "metaRunMode": "REAL",
  "generatedAdsets": 0,
  "generatedAds": 0
}
```

Graph antes da chamada:

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

Preview de targeting antes da chamada:

```json
{
  "status": "PAUSED",
  "countryCount": 82,
  "hasTW": false,
  "hasExcludedCountriesField": false,
  "excludedCountryCodes": ["TW"]
}
```

### Chamada executada

```http
POST /api/operational-market-generations/199c5ff6-0205-43a6-be34-a116e91ff6ba/publish-adset
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

### Resposta recebida

```json
{
  "ok": false,
  "error": {
    "message": "Invalid parameter",
    "details": {
      "message": "Invalid parameter",
      "type": "OAuthException",
      "code": 100,
      "error_subcode": 1815430,
      "is_transient": false,
      "error_user_title": "Selecione um objeto promovido para seu conjunto de anuncios.",
      "error_user_msg": "Selecione um objeto promovido para seu conjunto de anuncios.",
      "fbtrace_id": "Ah0T5jIK8__iugwT2VXLETb"
    }
  }
}
```

### Validacao apos a tentativa

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

Graph apos a tentativa:

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

### Resultado P55C

O criterio de aceite principal do P55C nao foi atingido: nenhum AdSet REAL foi criado.

A correcao de targeting do P55B foi confirmada no preview operacional:

- ARM manteve 82 paises em `geo_locations.countries`;
- `TW` nao aparece em `countries`;
- `geo_locations.excluded_countries` nao existe no payload final.

A chamada REAL avancou alem do erro anterior de `excluded_countries`, mas a Meta bloqueou a criacao por falta de objeto promovido (`promoted_object`) para `optimizationGoal = OFFSITE_CONVERSIONS`.

Estado final seguro:

- Campaign continuou `PAUSED`;
- nenhum AdSet local criado;
- nenhum AdSet Meta criado;
- nenhum Creative criado;
- nenhum Ad criado;
- nenhum `ACTIVE`;
- nenhum lote executado.

Antes de repetir a validacao REAL, o endpoint precisa aceitar e enviar o `promoted_object` exigido pela Meta para AdSets com `OFFSITE_CONVERSIONS`, preservando o status `PAUSED` e o escopo de criar somente AdSet.

Nota P55D: a correcao foi documentada em `docs/p55d-promoted-object-adset.md`. Para `optimizationGoal = OFFSITE_CONVERSIONS`, o endpoint passa a exigir `promotedObject` e o helper Meta serializa `promoted_object` no payload real.

## P55E - Tentativa com promotedObject

Validacao planejada para repetir a criacao REAL de 1 AdSet Meta `PAUSED`, agora com `promotedObject`.

### Pre-condicoes verificadas

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

Graph da Campaign antes da chamada:

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

### Descoberta de Pixel

O payload P55E exige um Pixel real:

```json
{
  "promotedObject": {
    "pixel_id": "PIXEL_ID_REAL_AQUI",
    "custom_event_type": "PURCHASE"
  }
}
```

Nao havia `META_PIXEL_ID`, `PIXEL_ID` ou variavel equivalente no ambiente local.

Consultas Graph em modo leitura na conta `act_259174718403969`:

```json
{
  "edge": "adspixels",
  "ok": true,
  "count": 0,
  "data": []
}
```

```json
{
  "edge": "customconversions",
  "ok": true,
  "count": 0,
  "data": []
}
```

Tambem nao foi encontrado `pixel_id`, `custom_conversion_id` ou equivalente no banco local.

### Resultado P55E

O endpoint de criacao real nao foi chamado.

Motivo: falta de `pixel_id` real para montar o `promotedObject` obrigatorio de `OFFSITE_CONVERSIONS`.

Executar a chamada com placeholder ou Pixel inventado nao validaria o criterio de aceite e poderia gerar apenas nova falha externa nao informativa.

Estado final:

- Campaign continua `PAUSED`;
- nenhum AdSet local criado;
- nenhum AdSet Meta criado;
- nenhum Creative criado;
- nenhum Ad criado;
- nenhum `ACTIVE`;
- nenhum lote executado.

Para repetir o P55E, e necessario fornecer um destes conjuntos reais da conta Meta:

- `promotedObject.pixel_id` + `promotedObject.custom_event_type`;
- ou `promotedObject.custom_conversion_id`;
- ou `promotedObject.offsite_conversion_event_id`.
