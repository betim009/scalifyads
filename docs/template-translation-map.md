# P43 — Mapa de Tradução dos Campaign Templates

Data: 2026-06-06

## Escopo

Este documento mapeia quais campos dos `campaign_templates` podem ser traduzidos futuramente por mercado operacional.

O P43 é apenas documental. Não altera banco, frontend, backend, scheduler ou publicação Meta.

## Estrutura Atual

Tabela auditada:

- `campaign_templates`

Campos físicos:

- `id`
- `name`
- `payload`
- `created_at`

O campo relevante para tradução é `payload jsonb`. Ele não possui schema rígido no banco.

Fontes atuais de payload:

- Tela de templates (`/templates`)
- `POST /api/campaign-templates`
- `POST /api/campaign-templates/from-generated/:id`
- `POST /api/campaign-templates/:id/apply`
- Uso operacional via `POST /api/generated-campaigns/operational-markets`

## Formatos de Payload Encontrados

### Template Operacional/Campaign Flow

Campos comuns no payload criado pela tela de templates:

- `objective`
- `metaAccountId`
- `countryCodes`
- `dailyBudgetCents`
- `billingEvent`
- `optimizationGoal`
- `destinationUrl`
- `ctaType`
- `adVariants`
- `mediaByCountry`
- `translationsByCountry`
- `nicheParam`
- `niche`
- `slug`
- `operationalMarket`

### Template Criado de Generated Campaign

Formato criado por `POST /api/campaign-templates/from-generated/:id`:

- `generatedCampaignId`
- `source.createdAt`
- `source.metaRunMode`
- `campaign.name`
- `campaign.countryCode`
- `campaign.marketCode`
- `campaign.marketName`
- `campaign.marketParam`
- `campaign.resolvedCountries`
- `campaign.targetingPreview`
- `campaign.metaObjective`
- `campaign.metaAdAccountId`
- `structure.adsets[].id`
- `structure.adsets[].name`
- `structure.ads[].id`
- `structure.ads[].generated_adset_id`
- `structure.ads[].creative_draft_id`
- `structure.ads[].name`

## Campos Traduzíveis

Estes campos representam texto humano de anúncio ou rótulo visível e podem entrar na camada futura de tradução.

### Copy de Criativos

- `adVariants[].primaryText`
- `adVariants[].headline`
- `adVariants[].description`

Campos equivalentes já usados em drafts/templates criativos:

- `primaryText`
- `primary_text`
- `headline`
- `description`

### Traduções já Materializadas

- `translationsByCountry.{COUNTRY}.primaryText`
- `translationsByCountry.{COUNTRY}.headline`
- `translationsByCountry.{COUNTRY}.description`
- `translationsByCountry.{COUNTRY}.ads.{AD_KEY}.primaryText`
- `translationsByCountry.{COUNTRY}.ads.{AD_KEY}.headline`
- `translationsByCountry.{COUNTRY}.ads.{AD_KEY}.description`

Observação: a tela de templates já trata `translationsByCountry` como estrutura revisável por país. Para mercados operacionais, essa estrutura deve evoluir para `translationsByMarket` ou equivalente, sem perder compatibilidade.

### Nomes Operacionais Humanos

Traduzíveis apenas se forem usados como texto exibido ao usuário final. Hoje, em geral, são identificadores internos e devem ser tratados com cautela.

- `campaign.name`
- `structure.adsets[].name`
- `structure.ads[].name`

Recomendação: não traduzir automaticamente estes nomes no primeiro ciclo. Eles são úteis para operação, diagnóstico e rastreio interno.

### CTA

- `ctaType`

Observação: `ctaType` é técnico no payload Meta (`LEARN_MORE`, `SIGN_UP`, etc.), mas representa uma chamada visível. A tradução não deve alterar o valor técnico. Se houver texto de CTA exibido em UI, traduzir label separado, não `ctaType`.

## Campos Não Traduzíveis

Estes campos são técnicos, numéricos, IDs, targeting, tracking, mídia ou URLs. Não devem ser enviados para tradução automática.

### Identidade e Banco

- `id`
- `created_at`
- `createdAt`
- `generatedCampaignId`
- `templateId`
- `creativeDraftId`
- `creative_draft_id`
- `generated_adset_id`
- `generatedAdsetId`

### Mercado Operacional

- `market_code`
- `marketCode`
- `market_name`
- `marketName`
- `market_param`
- `marketParam`
- `resolved_countries`
- `resolvedCountries`
- `targeting_preview`
- `targetingPreview`
- `operationalTargeting`
- `publishable`
- `previewOnly`

Observação: `marketName` é nome amigável interno do mercado. Não traduzir por enquanto, pois faz parte do catálogo oficial do cliente.

### Tracking

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `src`
- `marketParam`
- `nicheParam`
- `niche`
- `slug`

Observação: `nicheParam`, `niche` e `slug` podem ter origem textual, mas entram em URLs, SRC e rastreio. Não traduzir automaticamente. Para slug, usar regras próprias por mercado/idioma.

### URLs

- `destinationUrl`
- `finalUrl`
- `baseDomain`
- `brSlug`
- `internationalSlug`
- `url`
- `previewUrl`
- `asset_url`

URLs não devem ser traduzidas. A geração de URL por mercado deve usar regra operacional específica.

### Meta e Conta

- `metaAccountId`
- `metaAdAccountId`
- `meta_ad_account_id`
- `metaObjective`
- `meta_objective`
- `metaRunMode`
- `meta_run_mode`
- `metaCampaignId`
- `metaAdSetId`
- `metaAdId`
- `metaCreativeId`
- `pageId`
- `instagramActorId`
- `pixel_id`
- `conversion_event`

### AdSet e Targeting

- `countryCode`
- `country_code`
- `countryCodes`
- `includedLocations`
- `excludedLocations`
- `dailyBudgetCents`
- `billingEvent`
- `optimizationGoal`
- `objective`
- `status`
- `effective_status`
- `run_mode`

### Mídia

- `mediaByCountry`
- `creativeAssetId`
- `thumbnailCreativeAssetId`
- `thumbnail`
- `mimeType`
- `originalName`
- `storedName`
- `kind`

Nomes de arquivos não devem ser traduzidos.

## Campos Já Preparados Para Tradução

A tela de templates já possui suporte operacional para:

- gerar traduções;
- revisar traduções;
- editar traduções por país;
- armazenar traduções em `payload.translationsByCountry`;
- trabalhar com variações A-E por país via `translationsByCountry.{COUNTRY}.ads.{AD_KEY}`.

Campos principais já preparados:

- `primaryText`
- `headline`
- `description`

Limitação atual:

- a estrutura é orientada por país (`countryCode`);
- mercados operacionais podem representar país, grupo de países, região ou Worldwide;
- P44/P45 deve definir uma estrutura por mercado, por exemplo `translationsByMarket.{MARKET_CODE}`, antes de traduzir por mercado.

## Estrutura Adicionada Para Mercado

Formato estrutural preparado no P44:

```json
{
  "translationsByMarket": {
    "ARM": {
      "adVariants": [
        {
          "primaryText": "...",
          "headline": "...",
          "description": "..."
        }
      ]
    },
    "ENCA": {
      "adVariants": [
        {
          "primaryText": "...",
          "headline": "...",
          "description": "..."
        }
      ]
    }
  }
}
```

Validação mínima:

- `translationsByMarket` deve ser objeto quando existir.
- Cada chave deve ser um `marketCode` oficial.
- `adVariants`, quando existir, deve ser array.
- Cada item de `adVariants` deve ser objeto.
- `primaryText`, `headline` e `description`, quando existirem, devem ser strings.

Essa estrutura é apenas persistência/validação. Ela não executa tradução automática, não publica Meta e não altera `translationsByCountry`.

## Regras Recomendadas Para P44/P45

1. Não traduzir tracking, URL, IDs, targeting ou mídia.
2. Traduzir apenas copy de anúncio:
   - `primaryText`
   - `headline`
   - `description`
3. Preservar `ctaType` técnico. Se necessário, traduzir apenas label visual.
4. Usar saída por mercado:
   - `translationsByMarket.{MARKET_CODE}.adVariants[].primaryText`
   - `translationsByMarket.{MARKET_CODE}.adVariants[].headline`
   - `translationsByMarket.{MARKET_CODE}.adVariants[].description`
5. Manter `translationsByCountry` por compatibilidade.
6. Antes de publicar Meta REAL, exigir revisão humana das traduções por mercado.

## Resumo

Traduzir:

- `adVariants[].primaryText`
- `adVariants[].headline`
- `adVariants[].description`
- `translationsByCountry.*.primaryText`
- `translationsByCountry.*.headline`
- `translationsByCountry.*.description`
- `translationsByCountry.*.ads.*.primaryText`
- `translationsByCountry.*.ads.*.headline`
- `translationsByCountry.*.ads.*.description`

Não traduzir:

- mercado (`marketCode`, `marketParam`, `resolvedCountries`, `targetingPreview`)
- tracking (`utm_campaign`, `src`)
- URL/slug/domínio
- IDs Meta/banco
- pixel/conversão
- orçamento/billing/optimization
- mídia/assets
- status/guardrails
