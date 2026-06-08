# P56B - Creative REAL ENCA

## Objetivo

Validar em ambiente REAL a criacao de um Meta Creative para ENCA, sem criar Ads.

## Pre-condicoes

ENCA ja validado no P55I:

- `operational_market_generation_id`: `aa36d50e-3120-4e48-aa8b-58f81a481f33`
- Campaign: `120248719385340596`
- AdSet: `120248719401030596`
- `generated_campaign_id`: `41d063c6-8a5c-4098-a0bd-b24297eed781`

Antes da chamada:

```json
{
  "campaign": {
    "id": "120248719385340596",
    "name": "ENCA-PlantasBTN-FB",
    "status": "PAUSED",
    "effective_status": "PAUSED",
    "objective": "OUTCOME_AWARENESS",
    "adsCount": 0
  },
  "adset": {
    "id": "120248719401030596",
    "name": "ENCA-PlantasBTN-FB",
    "status": "PAUSED",
    "effective_status": "PAUSED",
    "campaign_id": "120248719385340596"
  },
  "local": {
    "creativeDrafts": 0,
    "publishedCreatives": 0,
    "generatedAds": 0
  }
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

## Requisitos usados

- `pageId`: `1139210415939326`
- `headline`: `ENCA PlantasBTN`
- `primaryText`: `Explore ofertas selecionadas para o Canada com PlantasBTN.`
- `description`: `Conteudo validado para o mercado ENCA.`
- `destinationUrl`: `https://example.com/enca?src=ENCA-PlantasBTN-FB`
- `ctaType`: `LEARN_MORE`
- Asset/imagem: nao usado. O teste validou um link creative minimo.

Nao havia template/traducao vinculado a essa linha ENCA; os textos foram enviados explicitamente no payload.

## Endpoint executado

```http
POST /api/operational-market-generations/aa36d50e-3120-4e48-aa8b-58f81a481f33/publish-creative
```

Payload:

```json
{
  "pageId": "1139210415939326",
  "primaryText": "Explore ofertas selecionadas para o Canada com PlantasBTN.",
  "headline": "ENCA PlantasBTN",
  "description": "Conteudo validado para o mercado ENCA.",
  "destinationUrl": "https://example.com/enca?src=ENCA-PlantasBTN-FB",
  "ctaType": "LEARN_MORE",
  "confirmPublishCreative": true
}
```

## Resposta recebida

```json
{
  "ok": true,
  "status": "PAUSED",
  "metaCreativeId": "1741627617191004",
  "creativeDraftId": "839fe3f9-52f1-4546-972f-07720362f4e2",
  "generatedCampaignId": "41d063c6-8a5c-4098-a0bd-b24297eed781",
  "operationalMarketGenerationId": "aa36d50e-3120-4e48-aa8b-58f81a481f33",
  "created": {
    "campaign": false,
    "adSet": false,
    "creative": true,
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
  "campaign_id": "120248719385340596"
}
```

Creative:

```json
{
  "id": "1741627617191004",
  "name": "ENCA PlantasBTN 2026-06-08-b5ec4e75b63ced738e79eb01b02e5a94",
  "object_story_spec": {
    "page_id": "1139210415939326",
    "link_data": {
      "link": "https://example.com/enca?src=ENCA-PlantasBTN-FB",
      "message": "Explore ofertas selecionadas para o Canada com PlantasBTN.",
      "name": "ENCA PlantasBTN",
      "description": "Conteudo validado para o mercado ENCA.",
      "call_to_action": {
        "type": "LEARN_MORE",
        "value": {
          "link": "https://example.com/enca?src=ENCA-PlantasBTN-FB"
        }
      }
    }
  },
  "effective_object_story_id": "1139210415939326_122104033701322561",
  "status": "IN_PROCESS"
}
```

## Validacao local

```json
{
  "generatedCampaignId": "41d063c6-8a5c-4098-a0bd-b24297eed781",
  "metaCampaignId": "120248719385340596",
  "metaAdSetId": "120248719401030596",
  "creativeDraftId": "839fe3f9-52f1-4546-972f-07720362f4e2",
  "creativeDraftStatus": "meta_published",
  "metaCreativeId": "1741627617191004",
  "generatedAds": 0
}
```

## Confirmacoes

- Creative criado na Meta.
- `meta_creative_id` persistido em `creative_drafts`.
- Nenhum Ad criado.
- Nenhum `generated_ads` criado.
- Nenhum `ACTIVE`.
- Campaign permaneceu `PAUSED`.
- AdSet permaneceu `PAUSED`.
- Campaign e AdSet nao foram alterados.
- Nenhum lote executado.

## Observacao

O Creative retornou `status = IN_PROCESS`, que e status do processamento do Creative na Meta. Isso nao representa ativacao de entrega e nenhum Ad foi criado. Campaign e AdSet permaneceram `PAUSED`.

## Conclusao

P56B atingiu o criterio de aceite. O pipeline operacional validou a criacao REAL de Creative para ENCA sem criar Ads.
