# P52 - Validacao Real de Campaign Meta PAUSED

Data: 2026-06-08

## Objetivo

Validar em ambiente REAL a criacao de uma unica Campaign Meta `PAUSED` a partir de uma linha de `operational_market_generations`, usando o endpoint criado no P51.

## Escopo Executado

- Mercado: `ARM`
- Linha operacional: `ARM-PlantasBTN-FB`
- `operational_market_generation_id`: `199c5ff6-0205-43a6-be34-a116e91ff6ba`
- Endpoint usado: `POST /api/operational-market-generations/:id/publish-campaign`
- Ambiente local com backend em `http://localhost:3001`
- Schedulers iniciados explicitamente como desabilitados no processo local:
  - `META_STATUS_SCHEDULER_ENABLED=false`
  - `META_METRICS_SCHEDULER_ENABLED=false`
  - `AUTOMATION_SCHEDULER_ENABLED=false`

## Pre-check

Linha selecionada antes da publicacao:

```json
{
  "id": "199c5ff6-0205-43a6-be34-a116e91ff6ba",
  "campaign_id": "d2ad4643-65e1-4171-ab82-79bb50cbc7f4",
  "market_code": "ARM",
  "market_param": "ARM-PlantasBTN-FB",
  "status": "PAUSED",
  "generated_campaign_id": null,
  "meta_campaign_id": null
}
```

Preview antes da publicacao:

```json
{
  "ok": true,
  "marketParam": "ARM-PlantasBTN-FB",
  "status": "PAUSED",
  "publishable": false,
  "previewOnly": true,
  "metaPublishing": false,
  "campaignName": "ARM-PlantasBTN-FB"
}
```

## Payload Enviado

```json
{
  "metaAdAccountId": "act_259174718403969",
  "objective": "OUTCOME_SALES",
  "confirmPublishPausedCampaign": true
}
```

## Resposta Recebida

```json
{
  "ok": true,
  "status": "PAUSED",
  "metaCampaignId": "120248694192270596",
  "generatedCampaignId": "3425b703-248a-4069-b2ba-89dab177461f",
  "operationalMarketGenerationId": "199c5ff6-0205-43a6-be34-a116e91ff6ba",
  "duplicated": false,
  "created": {
    "campaign": true,
    "adSet": false,
    "creative": false,
    "ad": false
  }
}
```

## Validacao Graph / Endpoint

Consulta via endpoint existente:

`GET /api/meta/campaigns/120248694192270596`

```json
{
  "ok": true,
  "meta_campaign": {
    "id": "120248694192270596",
    "name": "ARM-PlantasBTN-FB",
    "status": "PAUSED",
    "effective_status": "PAUSED",
    "objective": "OUTCOME_SALES"
  }
}
```

Consulta Graph direta com campos adicionais:

```json
{
  "id": "120248694192270596",
  "name": "ARM-PlantasBTN-FB",
  "status": "PAUSED",
  "effective_status": "PAUSED",
  "objective": "OUTCOME_SALES",
  "account_id": "259174718403969"
}
```

## Persistencia Local

`generated_campaigns`:

```json
{
  "id": "3425b703-248a-4069-b2ba-89dab177461f",
  "campaign_id": "d2ad4643-65e1-4171-ab82-79bb50cbc7f4",
  "country_code": "AE",
  "market_code": "ARM",
  "market_name": "Árabe Mundo",
  "market_param": "ARM-PlantasBTN-FB",
  "status": "PAUSED",
  "meta_run_mode": "REAL",
  "meta_campaign_id": "120248694192270596",
  "meta_ad_account_id": "act_259174718403969",
  "meta_objective": "OUTCOME_SALES",
  "meta_status": "PAUSED",
  "meta_effective_status": "PAUSED"
}
```

## Confirmacao de Nao Criacao de Filhos

Persistencia local:

```json
{
  "generated_adsets": 0,
  "generated_ads": 0,
  "creative_drafts": 0
}
```

Graph direto nas edges da Campaign:

```json
{
  "campaignId": "120248694192270596",
  "adsetsCount": 0,
  "adsCount": 0,
  "adsets": [],
  "ads": []
}
```

## Resultado

Validacao aprovada.

- Campaign criada na Meta: sim.
- Nome correto: `ARM-PlantasBTN-FB`.
- Status Meta: `PAUSED`.
- Effective status Meta: `PAUSED`.
- Objective: `OUTCOME_SALES`.
- Conta Meta: `259174718403969`.
- Persistencia local correta: sim.
- `generated_campaigns.meta_run_mode = REAL`: sim.
- `generated_campaigns.status = PAUSED`: sim.
- `market_code` e `market_param` persistidos: sim.
- AdSet criado: nao.
- Creative criado: nao.
- Ad criado: nao.
- `ACTIVE` introduzido: nao.
- Scheduler alterado: nao.

## Inconsistencias Encontradas

Nenhuma inconsistencia bloqueante foi encontrada.

Observacao operacional: `GET /api/meta/status` exige login no backend atual e retornou erro quando chamado sem sessao. Isso nao bloqueou a validacao, pois o token foi resolvido pelo backend/env no endpoint operacional e as validacoes Graph/Meta foram executadas com sucesso.

## Conclusao

O P52 confirmou que a ponte P51 consegue transformar uma linha de `operational_market_generations` em uma unica Campaign Meta REAL, mantendo `PAUSED`, persistindo o vinculo local em `generated_campaigns` e sem criar AdSet, Creative ou Ad.
