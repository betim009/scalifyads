# P50 - Operational Publish Preview

Data: 2026-06-08

## Objetivo

Criar um contrato de publicacao operacional em modo preview para conectar, futuramente, uma linha de `operational_market_generations` ao pipeline Meta antigo baseado em `generated_campaigns`.

Este P50 nao publica nada.

## Endpoint

```http
GET /api/operational-market-generations/:id/publish-preview
```

O endpoint e somente leitura. Ele busca:

- `operational_market_generations`
- `campaigns`
- `campaign_objectives`
- `campaign_templates`, quando `campaigns.config.templateId` aponta para um template existente

Ele nao chama Meta Graph, nao cria `generated_campaigns`, nao cria Campaign, AdSet, Creative ou Ad e nao altera scheduler.

## Resposta

Formato principal:

```json
{
  "ok": true,
  "publishable": false,
  "previewOnly": true,
  "metaPublishing": false,
  "status": "PAUSED",
  "operationalMarketGeneration": {},
  "source": {},
  "campaignPayloadPreview": {},
  "adSetPayloadPreview": {},
  "creativePayloadPreview": {},
  "adPayloadPreview": {},
  "missingRequirements": []
}
```

Guardrails fixos:

- `publishable=false`
- `previewOnly=true`
- `metaPublishing=false`
- `status=PAUSED`
- todos os payload previews usam `status=PAUSED`

## Payloads Montados

### Campaign

`campaignPayloadPreview` mostra o payload necessario para uma futura Campaign Meta:

- `metaAdAccountId`
- `name`
- `objective`
- `status=PAUSED`
- `specialAdCategories=[]`
- `isAdsetBudgetSharingEnabled=false`
- origem operacional: `operationalMarketGenerationId`, `campaignId`, `marketCode`, `marketParam`

### AdSet

`adSetPayloadPreview` mostra o payload necessario para um futuro AdSet:

- `name`
- `campaignId={{meta_campaign_id}}`
- `dailyBudgetCents`
- `billingEvent`
- `optimizationGoal`
- `targeting`
- `status=PAUSED`

O targeting vem de `targeting_preview.futurePayloadPreview.targeting` quando existir. Caso contrario, o preview monta:

```json
{
  "geo_locations": {
    "countries": ["...resolved_countries"]
  }
}
```

Isso ainda e preview. O helper Meta real antigo continua usando `countryCode` unico ate uma adaptacao futura.

### Creative

`creativePayloadPreview` mostra o payload necessario para um futuro AdCreative:

- `metaAdAccountId`
- `pageId`
- `instagramActorId`
- `name`
- `message`
- `link`
- `headline`
- `description`
- `ctaType`

Textos usam, nesta ordem:

1. `payload.translationsByMarket.{MARKET}.adVariants`
2. `payload.adVariants`

`link` vem do template (`destinationUrl`) e recebe `utm_campaign` e `src` do mercado quando a URL e valida.

### Ad

`adPayloadPreview` mostra o payload necessario para um futuro Ad:

- `metaAdAccountId`
- `name`
- `adsetId={{meta_adset_id}}`
- `creative.creativeId={{meta_creative_id}}`
- `status=PAUSED`

## Requisitos Faltantes

`missingRequirements` lista itens bloqueantes para publicacao futura. Exemplos:

- `metaAdAccountId ausente`
- `objective ausente`
- `pageId ausente`
- `destinationUrl ausente`
- `creativeDraft ausente`
- `budget ausente`
- `adVariant/traducao ausente`
- `template relacionado ausente`

Mesmo que todos os requisitos estejam presentes, este endpoint continua retornando `publishable=false` e `metaPublishing=false` ate existir uma etapa explicita de aprovacao/publicacao futura.

## ARM-PlantasBTN-FB

Para uma linha ARM gerada pelo fluxo operacional:

- `marketParam` esperado: `ARM-PlantasBTN-FB`
- `utm_campaign`: `ARM`
- `src`: `ARM-PlantasBTN-FB`
- `adSetPayloadPreview.targeting.geo_locations.countries`: lista de paises resolvidos para ARM
- `creativePayloadPreview`: usa `translationsByMarket.ARM.adVariants` quando o template relacionado estiver presente

O preview mostra o que ja existe e o que falta para transformar essa linha em publicacao futura, sem criar nenhuma entidade Meta.

## Validacao

Script criado:

```sh
node backend/scripts/validate-operational-publish-preview.js
```

O script:

- abre transacao;
- cria template/campanha/linha ARM local de validacao;
- monta preview para `ARM-PlantasBTN-FB`;
- confirma guardrails (`publishable=false`, `previewOnly=true`, `metaPublishing=false`, `PAUSED`);
- confirma que textos ARM entram no Creative preview;
- confirma requisitos faltantes (`metaAdAccountId`, `objective`, `pageId`, `creativeDraft`);
- executa `ROLLBACK`.

Nenhuma chamada Meta REAL e feita.

## Proximos Passos

P50 cria apenas o contrato de preview. A ponte real futura ainda deve ser feita em etapa separada:

1. definir aprovacao explicita;
2. decidir onde persistir o vinculo `operational_market_generation -> generated_campaign`;
3. adaptar AdSet para targeting por mercado;
4. conectar traducoes por mercado a Creative Drafts;
5. manter todos os objetos Meta nascendo `PAUSED`.
