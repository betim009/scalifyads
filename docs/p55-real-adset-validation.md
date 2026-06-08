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
