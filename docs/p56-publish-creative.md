# P56 - Creative operacional Meta REAL

## Objetivo

Criar a ponte operacional para publicar somente um Meta Creative a partir de uma `operational_market_generation` ja validada.

Escopo:

- cria somente Creative;
- nao cria Ad;
- nao cria `ACTIVE`;
- nao altera Campaign;
- nao altera AdSet;
- nao executa lote;
- preserva o fluxo legado.

## Auditoria do fluxo legado

Fluxo legado encontrado:

```http
POST /api/meta/creative-drafts/:id/publish
```

Componentes:

- `backend/src/routes/meta.js`
- `backend/src/meta/creatives.js`
- `creative_drafts`
- `creative_assets`
- `generated_campaigns`

O fluxo legado:

1. Le um `creative_draft`.
2. Resolve `meta_ad_account_id` pela `generated_campaigns`.
3. Exige `pageId`.
4. Exige `destination_url`.
5. Faz upload de imagem/video se existir asset.
6. Chama `metaCreateAdCreative`.
7. Persiste `creative_drafts.meta_creative_id`.
8. Nao cria Ad.

## Endpoint operacional

```http
POST /api/operational-market-generations/:id/publish-creative
```

Payload minimo:

```json
{
  "pageId": "123456789012345",
  "primaryText": "ENCA primary text",
  "headline": "ENCA headline",
  "description": "ENCA description",
  "destinationUrl": "https://example.com/enca",
  "ctaType": "LEARN_MORE",
  "confirmPublishCreative": true
}
```

O endpoint tambem aceita:

- `instagramActorId`;
- `page_id`;
- `primary_text`;
- `destination_url`;
- `cta_type`.

## Requisitos

Obrigatorios:

- `confirmPublishCreative === true`;
- linha `operational_market_generations` existente;
- `generated_campaigns` compativel ja publicado com `meta_campaign_id`;
- `generated_campaigns.meta_adset_id` ja preenchido;
- `generated_campaigns.meta_ad_account_id`;
- `pageId`;
- `destinationUrl`;
- `primaryText` ou `headline`;
- token Meta resolvido por `resolveAccessToken`.

## Fonte dos textos

O service operacional tenta resolver texto nesta ordem:

1. payload do endpoint;
2. `translationsByMarket.<marketCode>.adVariants[0]`, quando houver template associado;
3. `payload.adVariants[0]`;
4. `payload.creative`;
5. fallback de headline para `market_param`.

Para ENCA, o caminho esperado e:

```text
translationsByMarket.ENCA
```

quando existir template vinculado.

## Persistencia

Ao publicar:

1. Insere uma linha em `creative_drafts`.
2. Chama `metaCreateAdCreative`.
3. Atualiza:

```text
creative_drafts.meta_creative_id
creative_drafts.status = meta_published
```

4. Atualiza rastreabilidade em `generated_campaigns.ops_last_*`.

Nao insere `generated_ads`.

## Duplicidade

Se ja existir `creative_drafts.meta_creative_id` para a `generated_campaigns`, o endpoint retorna o Creative existente e nao chama Meta novamente.

## Resposta

```json
{
  "ok": true,
  "status": "PAUSED",
  "metaCreativeId": "120...",
  "creativeDraftId": "...",
  "generatedCampaignId": "...",
  "operationalMarketGenerationId": "...",
  "created": {
    "campaign": false,
    "adSet": false,
    "creative": true,
    "ad": false
  }
}
```

## Validacao sem Meta REAL

Script:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5433/campaign_builder \
node backend/scripts/validate-operational-publish-creative.js
```

O script:

- usa stub de `createCreative`;
- usa transacao com rollback;
- valida confirmacao obrigatoria;
- valida requisitos minimos;
- valida que Creative e persistido em `creative_drafts`;
- valida prevencao de duplicidade;
- valida que nenhum `generated_ads` e criado.

## Guardrails

P56 nao executa Creative real por padrao.

O endpoint so chama Meta quando invocado explicitamente com:

```json
{
  "confirmPublishCreative": true
}
```

Nao cria:

- Campaign;
- AdSet;
- Ad;
- `ACTIVE`.

## Proximo passo REAL

Usar ENCA validado no P55I:

- Campaign: `120248719385340596`
- AdSet: `120248719401030596`
- `operational_market_generation_id`: `aa36d50e-3120-4e48-aa8b-58f81a481f33`

Criar somente Creative e validar `meta_creative_id`, sem criar Ad.
