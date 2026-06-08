# P51 - Publish Paused Campaign

Data: 2026-06-08

## Objetivo

Criar a primeira ponte real entre `operational_market_generations` e Meta, com escopo minimo:

- publicar somente uma Campaign Meta;
- usar uma unica linha operacional por chamada;
- manter a Campaign em `PAUSED`;
- persistir o vinculo em `generated_campaigns`;
- nao criar AdSet, Creative ou Ad.

## Endpoint

```http
POST /api/operational-market-generations/:id/publish-campaign
```

Payload obrigatorio:

```json
{
  "metaAdAccountId": "act_123456789",
  "objective": "OUTCOME_SALES",
  "confirmPublishPausedCampaign": true
}
```

O token continua sendo resolvido no backend pelo mecanismo existente:

- `accessToken` no body, se fornecido;
- token de conta Meta salva;
- token salvo em `meta_tokens`;
- `META_ACCESS_TOKEN` no ambiente.

## O Que Faz

1. Busca a linha em `operational_market_generations`.
2. Bloqueia chamada sem:
   - `confirmPublishPausedCampaign=true`;
   - `metaAdAccountId`;
   - `objective`;
   - access token resolvido.
3. Usa `market_param` como nome da Campaign Meta.
   - Exemplo: `ARM-PlantasBTN-FB`.
4. Chama o helper existente `metaCreateCampaign`.
5. O helper Meta existente forca `status=PAUSED`.
6. Cria ou reutiliza uma linha local de compatibilidade em `generated_campaigns`.
7. Persiste:
   - `meta_campaign_id`;
   - `meta_run_mode=REAL`;
   - `meta_ad_account_id`;
   - `meta_objective`;
   - campos operacionais (`market_code`, `market_name`, `market_param`, `resolved_countries`, `targeting_preview`).

Resposta esperada em criacao:

```json
{
  "ok": true,
  "status": "PAUSED",
  "metaCampaignId": "120...",
  "generatedCampaignId": "...",
  "operationalMarketGenerationId": "...",
  "duplicated": false,
  "created": {
    "campaign": true,
    "adSet": false,
    "creative": false,
    "ad": false
  }
}
```

Se ja existir `generated_campaigns` para o mesmo `campaign_id + market_code` com `meta_campaign_id`, o endpoint nao cria outra Campaign. Ele retorna o vinculo existente com:

```json
{
  "created": {
    "campaign": false,
    "adSet": false,
    "creative": false,
    "ad": false
  }
}
```

## O Que Nao Faz

- Nao cria AdSet.
- Nao cria Creative.
- Nao cria Ad.
- Nao publica em `ACTIVE`.
- Nao permite lote.
- Nao altera scheduler.
- Nao remove guardrails.
- Nao reconstrói o publicador Meta do zero.

## Compatibilidade Local

Como o pipeline antigo acompanha publicacao por `generated_campaigns`, o P51 cria/reutiliza uma linha local de compatibilidade.

Mapeamento:

- `country_code`: vem de `targeting_preview.compatibilityCountryCode` ou `targeting_preview.legacyCountryCode`.
- `market_code`: vem de `operational_market_generations.market_code`.
- `market_name`: vem de `operational_market_generations.market_name`.
- `market_param`: vem de `operational_market_generations.market_param`.
- `resolved_countries`: copiado da linha operacional.
- `targeting_preview`: copiado da linha operacional.
- `status`: sempre `PAUSED`.
- `meta_run_mode`: `REAL`.
- `meta_campaign_id`: ID retornado pela Meta.

Se a combinacao legada `campaign_id + country_code` ja estiver ocupada por outra linha, a chamada falha com conflito em vez de reutilizar um registro ambíguo.

## Guardrails

- Confirmacao explicita obrigatoria: `confirmPublishPausedCampaign === true`.
- Apenas um ID no path; payloads com listas de IDs sao rejeitados.
- `metaCreateCampaign` e reaproveitado, mantendo o status forçado `PAUSED`.
- Resposta declara explicitamente `adSet=false`, `creative=false`, `ad=false`.
- O script de validacao usa stub e nao chama Meta REAL.

## Validacao Segura

Script:

```sh
DATABASE_URL=postgres://postgres:postgres@localhost:5433/campaign_builder \
node backend/scripts/validate-operational-publish-campaign.js
```

O script:

- abre transacao;
- cria uma linha ARM local;
- valida bloqueio sem confirmacao;
- valida bloqueio sem `metaAdAccountId`;
- valida bloqueio sem `objective`;
- usa um `createCampaign` stub;
- cria uma Campaign stub `PAUSED` somente no teste;
- confirma persistencia de `meta_campaign_id` em `generated_campaigns`;
- confirma que AdSet/Creative/Ad nao sao criados;
- confirma prevencao de duplicidade;
- executa `ROLLBACK`.

## Teste Real Controlado

Antes de testar contra Meta REAL:

1. Escolher uma unica linha de `operational_market_generations`.
2. Rodar o preview:

```http
GET /api/operational-market-generations/:id/publish-preview
```

3. Confirmar `marketParam`, `metaAdAccountId`, `objective` e conta/token.
4. Executar somente a Campaign:

```http
POST /api/operational-market-generations/:id/publish-campaign
Content-Type: application/json

{
  "metaAdAccountId": "act_123456789",
  "objective": "OUTCOME_SALES",
  "confirmPublishPausedCampaign": true
}
```

5. Confirmar que a resposta informa:
   - `status=PAUSED`;
   - `created.campaign=true`;
   - `created.adSet=false`;
   - `created.creative=false`;
   - `created.ad=false`.

Este P51 nao deve ser usado para AdSet/Creative/Ad. Essas etapas continuam fora do escopo.
