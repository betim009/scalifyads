# P57 - Validacao REAL de Ad operacional PAUSED

Data: 2026-06-08

## Objetivo

Validar o ultimo elo do pipeline operacional ENCA criando 1 Ad Meta REAL em `PAUSED`, reutilizando a Campaign, o AdSet e o Creative ja validados, sem criar lote e sem criar novos objetos alem do Ad.

## Fluxo auditado

O fluxo legado de Ad usa `metaCreateAd` em `backend/src/meta/ads.js`. O helper exige:

- `metaAdAccountId`
- `metaAdSetId`
- `name`
- `creativeId`
- `accessToken`

O helper serializa `creative: { creative_id }` e forca `status = PAUSED` no payload enviado ao Graph.

O fluxo legado de rotas em `backend/src/routes/meta.js` criava Ads a partir de `generated_campaigns`, exigindo `meta_adset_id` e um creative publicado. Para P57 foi criada a ponte operacional:

`operational_market_generations -> generated_campaigns -> generated_adsets/creative_drafts -> metaCreateAd -> generated_ads`

Endpoint criado:

`POST /api/operational-market-generations/:id/publish-ad`

Payload usado:

```json
{
  "confirmPublishPausedAd": true
}
```

Guardrails implementados:

- exige `confirmPublishPausedAd === true`;
- rejeita lote via `ids` ou `operationalMarketGenerationIds`;
- exige Campaign Meta ja publicada;
- exige AdSet Meta ja publicado;
- exige Creative Meta ja publicado;
- chama somente `metaCreateAd`;
- envia status `PAUSED`;
- persiste em `generated_ads`;
- atualiza `generated_campaigns.meta_ad_id`;
- previne duplicidade se ja houver `meta_ad_id` local ou `generated_ads.meta_ad_id`.

## Pre-condicoes

Linha operacional:

- `operational_market_generation_id`: `aa36d50e-3120-4e48-aa8b-58f81a481f33`
- mercado: `ENCA`
- `market_param`: `ENCA-PlantasBTN-FB`

Objetos Meta existentes antes do teste:

- Campaign: `120248719385340596`
- AdSet: `120248719401030596`
- Creative: `1741627617191004`

Validacao local antes da chamada:

- `generated_campaign_id`: `41d063c6-8a5c-4098-a0bd-b24297eed781`
- `meta_campaign_id`: `120248719385340596`
- `meta_adset_id`: `120248719401030596`
- `meta_ad_id`: vazio
- `generated_ads`: `0`
- `creative_draft_id`: `839fe3f9-52f1-4546-972f-07720362f4e2`
- `meta_creative_id`: `1741627617191004`

Validacao Graph antes da chamada:

- Campaign `120248719385340596`: `status=PAUSED`, `effective_status=PAUSED`
- AdSet `120248719401030596`: `status=PAUSED`, `effective_status=PAUSED`
- nenhum Ad listado na Campaign

## Execucao REAL

Chamada executada uma unica vez:

```http
POST /api/operational-market-generations/aa36d50e-3120-4e48-aa8b-58f81a481f33/publish-ad
Content-Type: application/json

{
  "confirmPublishPausedAd": true
}
```

Resposta:

```json
{
  "ok": true,
  "status": "PAUSED",
  "metaCampaignId": "120248719385340596",
  "metaAdSetId": "120248719401030596",
  "metaCreativeId": "1741627617191004",
  "metaAdId": "120248721507440596",
  "generatedCampaignId": "41d063c6-8a5c-4098-a0bd-b24297eed781",
  "generatedAdId": "f8ae4b84-bbdd-4089-b7b4-049e5e98f71e",
  "creativeDraftId": "839fe3f9-52f1-4546-972f-07720362f4e2",
  "operationalMarketGenerationId": "aa36d50e-3120-4e48-aa8b-58f81a481f33",
  "duplicated": false,
  "created": {
    "campaign": false,
    "adSet": false,
    "creative": false,
    "ad": true
  }
}
```

## Validacao Graph

Ad criado:

- `meta_ad_id`: `120248721507440596`
- nome: `ENCA-PlantasBTN-FB`
- `status`: `PAUSED`
- `configured_status`: `PAUSED`
- `effective_status`: `PENDING_REVIEW`
- `campaign_id`: `120248719385340596`
- `adset_id`: `120248719401030596`
- `creative.id`: `1741627617191004`

Campaign apos a chamada:

- `id`: `120248719385340596`
- `status`: `PAUSED`
- `effective_status`: `PAUSED`
- Ads listados: apenas `120248721507440596`

AdSet apos a chamada:

- `id`: `120248719401030596`
- `status`: `PAUSED`
- `effective_status`: `PAUSED`
- Ads listados: apenas `120248721507440596`

Creative:

- `id`: `1741627617191004`
- `status`: `ACTIVE`

Observacao: o Creative ja aparecia como `ACTIVE` antes do P57. O P57 nao alterou o Creative; o unico novo objeto criado foi o Ad, com entrega configurada como `PAUSED`.

## Persistencia local

`generated_campaigns`:

- `id`: `41d063c6-8a5c-4098-a0bd-b24297eed781`
- `meta_campaign_id`: `120248719385340596`
- `meta_adset_id`: `120248719401030596`
- `meta_ad_id`: `120248721507440596`
- `status`: `PAUSED`
- `meta_ad_status`: `PAUSED`
- `meta_ad_effective_status`: `IN_PROCESS`
- `meta_run_mode`: `REAL`
- `generated_ads`: `1`

`generated_ads`:

- `id`: `f8ae4b84-bbdd-4089-b7b4-049e5e98f71e`
- `generated_campaign_id`: `41d063c6-8a5c-4098-a0bd-b24297eed781`
- `generated_adset_id`: `afffeadd-5493-4113-901a-3f5cffe18f3c`
- `creative_draft_id`: `839fe3f9-52f1-4546-972f-07720362f4e2`
- `meta_ad_id`: `120248721507440596`
- `name`: `ENCA-PlantasBTN-FB`
- `status`: `PAUSED`
- `effective_status`: `IN_PROCESS`
- `run_mode`: `REAL`

## Validacoes tecnicas

Executadas sem chamada Meta REAL:

```bash
node --check backend/src/services/operationalMarketAdPublisher.js
node --check backend/src/routes/operationalMarketGenerations.js
node --check backend/scripts/validate-operational-publish-ad.js
node -e "import('./backend/src/routes/api.js').then(()=>import('./backend/src/services/operationalMarketAdPublisher.js')).then(()=>console.log('imports ok'))"
DATABASE_URL=postgres://postgres:postgres@localhost:5433/campaign_builder node backend/scripts/validate-operational-publish-ad.js
```

Resultado do validador rollback:

- `rolledBack`: `true`
- `noRealMetaCall`: `true`
- cria somente Ad via stub;
- bloqueia sem confirmacao;
- bloqueia sem Campaign/Creative publicados;
- previne duplicidade sem nova chamada `createAd`.

Build frontend:

```bash
cd frontend
npm run build
```

Resultado: build concluido com sucesso. Permanece apenas o aviso existente de chunk maior que 500 kB do Vite.

## Conclusao

P57 criou 1 Ad Meta REAL para ENCA:

- Ad: `120248721507440596`
- status configurado: `PAUSED`
- Campaign continua `PAUSED`
- AdSet continua `PAUSED`
- Creative reutilizado: `1741627617191004`
- nenhum novo Campaign, AdSet ou Creative foi criado
- nenhum lote foi executado
- nenhum objeto foi publicado como `ACTIVE`

Inconsistencia residual: o criterio pedia `effective_status=PAUSED`, mas o Graph retornou `effective_status=PENDING_REVIEW` para o Ad logo apos a criacao. O `configured_status` e o `status` do Ad estao `PAUSED`; portanto a entrega permanece bloqueada, mas a Meta ainda mostra o objeto em revisao.
