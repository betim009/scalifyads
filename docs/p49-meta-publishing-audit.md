# P49 - Auditoria do Fluxo de Publicacao Meta

Data: 2026-06-08

Escopo: auditoria de codigo e documentacao. Nenhum endpoint Meta foi executado, nenhuma Campaign/AdSet/Ad foi criada, nenhum guardrail foi removido e nenhum scheduler foi alterado.

## Fluxo antigo

O fluxo antigo de publicacao Meta existe em duas entradas principais:

1. Fluxo baseado em `generated_campaigns` existente:
   - `POST /api/meta/campaigns`
   - Entrada principal: `generatedCampaignId`.
   - Entradas auxiliares: `metaAdAccountId` ou `metaAccountId`, `objective`, `metaUserId`, `force`.
   - Busca `generated_campaigns.name`, `generated_campaigns.meta_campaign_id`, `campaigns.objective_key` e `campaign_objectives.meta_value`.
   - Cria Campaign real via `metaCreateCampaign`.
   - Persiste `meta_campaign_id`, `meta_run_mode = REAL`, `meta_ad_account_id`, `meta_account_id`, `meta_user_id`, `meta_status`, `meta_effective_status`, `meta_objective`.

2. Fluxo simples/progressivo usado por `/campaign-flow` e `/meta-test`:
   - `POST /api/meta/campaigns/simple`
   - Entrada principal: `name`, `objective`, `countryCode`, `mode`.
   - Entradas auxiliares: `metaAdAccountId` ou `metaAccountId`, `marketCode`, `marketName`, `marketParam`, `resolvedCountries`, `targetingPreview`, `metaUserId`.
   - Cria uma `campaigns` local.
   - Insere `campaign_country_targets`.
   - Cria um `generated_campaigns` local com `country_code` obrigatorio e, se enviados, campos de mercado.
   - Em `mode = REAL`, cria Campaign real via `metaCreateCampaign`.
   - Em `mode = STUB`, cria apenas ID stub.

Depois da Campaign, o fluxo antigo continua progressivamente:

- `POST /api/meta/adsets`
  - Entrada principal: `generatedCampaignId`.
  - Entradas: `name`, `dailyBudgetCents`, `billingEvent`, `optimizationGoal`, `mode`, `bidStrategy`, `bidAmount`, `bidConstraints`, `metaAccountId`.
  - Le `generated_campaigns.country_code`, `meta_campaign_id`, `meta_ad_account_id`, `meta_account_id`.
  - Cria AdSet real via `metaCreateAdSet`.
  - O targeting real atual e `targeting.geo_locations.countries = [countryCode]`.

- `POST /api/meta/creative-drafts/:id/publish`
  - Entrada principal: `creativeDraftId`.
  - Entradas auxiliares: `pageId`, `instagramActorId`, `force`, `metaAccountId`.
  - Le `creative_drafts` e `generated_campaigns.meta_ad_account_id`.
  - Faz upload de imagem/video quando ha asset local.
  - Cria AdCreative real via `metaCreateAdCreative`.

- `POST /api/meta/ads`
  - Entrada principal: `generatedCampaignId`.
  - Entradas: `name`, `mode`, `creativeId` ou `creativeDraftId`, `metaAccountId`.
  - Le `generated_campaigns.meta_ad_account_id`, `meta_account_id`, `meta_adset_id`.
  - Cria Ad real via `metaCreateAd`.

Todos os criadores reais forcam `PAUSED` no helper Meta, independentemente de status recebido.

## Componentes encontrados

Rotas backend Meta:

- `POST /api/meta/market-targeting-preview`: preview tecnico de targeting por mercado. Retorna `publishable=false` e `previewOnly=true`.
- `GET /api/meta/tokens` e `POST /api/meta/tokens`: gestao de tokens salvos no backend.
- `POST /api/meta/validate`: valida token com Graph `/me`.
- `GET /api/meta/status`: diagnostico de provider, token, pagina e conta Meta.
- `GET /api/meta/diagnostics`: diagnostico Graph autenticado.
- `GET /api/meta/pages` e `GET /api/meta/pages/:id`: diagnostico/descoberta de Pages.
- `POST /api/meta/campaigns`: cria Campaign a partir de `generatedCampaignId`.
- `POST /api/meta/campaigns/simple`: cria `campaigns`, `generated_campaigns` e Campaign Meta ou stub.
- `GET /api/meta/campaigns/:id`: consulta Campaign Meta.
- `POST /api/meta/campaigns/:id/pause`: pausa Campaign Meta existente.
- `GET /api/meta/ad-accounts/:id/campaigns`: lista Campaigns da conta, por padrao `PAUSED`.
- `POST /api/meta/adsets`: cria AdSet Meta ou stub.
- `GET /api/meta/adsets/:id`: consulta AdSet Meta.
- `POST /api/meta/adsets/:id/budget`: atualiza budget de AdSet existente, mantendo status pausado no helper.
- `POST /api/meta/creative-drafts/:id/publish`: cria AdCreative Meta.
- `GET /api/meta/creatives/:id` e `GET /api/meta/creatives/:id/previews`: consulta Creative/preview.
- `POST /api/meta/ads`: cria Ad Meta ou stub.
- `GET /api/meta/ads/:id` e `GET /api/meta/ads/:id/previews`: consulta Ad/preview.
- `POST /api/meta/sync/generated-campaigns/:id`: sincroniza metricas de Campaign ja publicada.

Rotas operacionais relacionadas:

- `POST /api/campaign-templates/:id/translations-by-market/generate`: gera `payload.translationsByMarket`.
- `POST /api/generated-campaigns/operational-markets`: gera `operational_market_generations` e retorna `generated_campaigns = []`, `meta_publishing = false`.
- `GET /api/generated-campaigns/:campaignId/operational-markets`: lista as geracoes operacionais com `metaPublishing=false`.
- `GET /api/generated-campaigns`: lista `generated_campaigns`, incluindo campos legados e campos de mercado.
- `GET /api/generated-campaigns/:id/structure`: lista `generated_adsets` e `generated_ads`.
- `POST /api/generated-campaigns/:id/mark-published`: vincula manualmente `meta_campaign_id`; nao cria Meta.

Services/helpers backend:

- `backend/src/meta/campaigns.js`: `metaCreateCampaign`, `metaFetchCampaign`, `metaListAdAccountCampaigns`, `metaPauseCampaign`.
- `backend/src/meta/adsets.js`: `metaCreateAdSet`, `metaCreateAdSetStub`, `metaFetchAdSet`, `metaUpdateAdSetDailyBudgetPaused`.
- `backend/src/meta/creatives.js`: upload de imagem/video, `metaCreateAdCreative`, fetch/previews.
- `backend/src/meta/ads.js`: `metaCreateAd`, `metaCreateAdStub`, fetch/previews.
- `backend/src/meta/sync.js` e `backend/src/meta/graph.js`: metricas e Graph genérico.
- `backend/src/meta/accessToken.js`: resolucao de token por conta/usuario/env/scheduler.
- `backend/src/lib/operationalMarketGeneration.js`: gera `marketParam`, `utm_campaign`, `src`, `resolvedCountries`, `targetingPreview` e codigo legado de compatibilidade.
- `backend/src/lib/marketTargeting.js`: normalizacao de mercado, preview tecnico e persistencia de metadados de mercado.
- `backend/src/services/operationalMarketGenerations.js`: insert/list de `operational_market_generations`.

Jobs/schedulers:

- `metaStatusScheduler`: se habilitado por env, consulta status de IDs Meta ja persistidos em `generated_campaigns`.
- `metaMetricsScheduler`: se habilitado por env, sincroniza metricas para Campaigns com `meta_campaign_id` real.
- `automationScheduler`: altera status local de `generated_campaigns` conforme regras de ROI. Nao cria Meta, mas existe regra local `activate_positive_roi_d1` que pode escrever `status = ACTIVE` local.

Frontend:

- `frontend/src/services/metaCampaigns.js`, `metaAdSets.js`, `metaCreatives.js`, `metaAds.js`, `generatedCampaigns.js`.
- `/meta-test`: console tecnico que chama os services Meta progressivos.
- `/campaign-flow`: fluxo guiado antigo por pais e modo REAL/STUB.
- `CampanhaDetalhes.jsx`: conferencia de `operational_market_generations`, exibindo publicacao Meta como nao liberada quando `publishable=false`.

## Dependencias antigas

Dependencias fortes do modelo antigo:

- `country_code` em `generated_campaigns` e `campaign_country_targets`.
- `countryCode` no payload de `POST /api/meta/campaigns/simple`.
- `countryCode` resolvido em `POST /api/meta/adsets`.
- `countries` table contendo o codigo ISO-2 usado.
- Unicidade antiga `generated_campaigns (campaign_id, country_code)`.
- Nome gerado derivado de campanha + pais no fluxo batch antigo.
- Copys/midias do `/campaign-flow` resolvidas por codigo de pais ou por codigo selecionado no fluxo, nao diretamente por registro `operational_market_generations`.
- AdSet real limitado a um unico pais: `targeting.geo_locations.countries = [countryCode]`.

Dependencias Meta obrigatorias:

- `metaAdAccountId` no formato `act_<digits>` ou conta Meta salva (`user_meta_accounts`).
- Access token resolvido no backend.
- `objective` Meta, vindo de `campaign_objectives.meta_value` ou body.
- Para Creative real: Page ID, destination URL e, se video, thumbnail.
- Para Ad real: `meta_adset_id` e `creativeId` ou `creativeDraftId` ja publicado.

Guardrails existentes:

- `metaCreateCampaign`, `metaCreateAdSet`, `metaCreateAdCreative` e `metaCreateAd` mantem criacao em `PAUSED`.
- Fluxo operacional P30-P47 persiste `publishable=false`, `previewOnly=true`, `metaPublishing=false`.
- `POST /api/generated-campaigns/operational-markets` retorna `generated_campaigns = []`, logo nao alimenta o publicador antigo automaticamente.

## Compatibilidade com mercados operacionais

`operational_market_generations` produz:

- `campaign_id`
- `market_code`
- `market_name`
- `market_param`
- `resolved_countries`
- `targeting_preview`
- `utm_campaign`
- `src`
- `status = PAUSED`

O publicador antigo espera, por etapa:

- Campaign antiga (`POST /api/meta/campaigns`): `generatedCampaignId`, `generated_campaigns.name`, objetivo Meta e conta Meta.
- Campaign simple (`POST /api/meta/campaigns/simple`): `name`, `objective`, `countryCode`, conta Meta e opcionalmente metadados de mercado.
- AdSet (`POST /api/meta/adsets`): `generatedCampaignId` ja com `meta_campaign_id`, `country_code`, budget, billing, optimization.
- Creative: `creative_drafts` associado a `generated_campaigns`.
- Ad: `generatedCampaignId` ja com `meta_adset_id` e Creative publicado.

Compatibilidades existentes:

- O modelo operacional ja tem nome operacional (`market_param`) que poderia virar nome/sufixo de Campaign.
- Ja tem `resolved_countries`, que e mais rico que `country_code`.
- Ja tem preview tecnico que antecipa o futuro payload `targeting.geo_locations.countries`.
- Ja tem `utm_campaign` e `src` para tracking.
- A funcao `generateOperationalMarkets` calcula um `legacyCountryCode` de compatibilidade, mas ele fica dentro de `targeting_preview`; a tabela `operational_market_generations` nao cria `generated_campaigns`.

Incompatibilidades atuais:

- `operational_market_generations` nao possui `generated_campaigns.id`.
- O publicador antigo nao aceita `operationalMarketGenerationId`.
- O publicador antigo nao cria `generated_campaigns` a partir de uma linha operacional.
- `POST /api/meta/adsets` ignora `resolved_countries` e `targeting_preview`; usa apenas `country_code`.
- `metaCreateAdSet` nao aceita targeting por mercado nem exclusoes; monta internamente `{ geo_locations: { countries: [cc] } }`.
- As traducoes em `payload.translationsByMarket` nao sao conectadas automaticamente a `creative_drafts`.
- O fluxo operacional novo nao define objetivo Meta, conta Meta, budget, billing/optimization, Page ID, assets ou approval final de publicacao.

## Lacunas identificadas

1. Fonte de publicacao desconectada
   - A fonte nova e `operational_market_generations`.
   - A fonte antiga e `generated_campaigns`.
   - O novo endpoint operacional retorna explicitamente `generated_campaigns = []`.

2. Identificador de entrada ausente
   - Nao existe endpoint do tipo `POST /api/meta/operational-market-generations/:id/...`.
   - Nao existe adaptador documentado que converta uma linha operacional em `generated_campaigns`.

3. Targeting por mercado ainda e preview
   - `buildMarketTargetingTechnicalPreview` declara que a criacao real de AdSet ainda usa `countryCode`.
   - `targeting_preview.publishable=false` e `previewOnly=true`.
   - `metaCreateAdSet` precisa de ISO-2 unico e nao consome `resolved_countries`.

4. Guardrail de publicacao bloqueia intencionalmente
   - `metaPublishing=false` no fluxo operacional.
   - `publishable=false` nos registros.
   - `previewOnly=true` nos registros.

5. Dados operacionais incompletos para publicacao completa
   - Falta objetivo Meta resolvido na propria geracao operacional.
   - Falta conta Meta selecionada por linha operacional.
   - Falta budget/billing/optimization por linha operacional.
   - Falta Page ID/Instagram actor/contexto criativo por linha operacional.
   - Falta vinculo entre `translationsByMarket` e `creative_drafts`.
   - Falta estado de aprovacao final antes da chamada real.

6. Modelo legado ainda exige pais
   - `country_code` continua NOT NULL em `generated_campaigns`.
   - `campaign_country_targets` continua exigindo codigo de pais.
   - A compatibilidade por `legacyCountryCode` existe, mas e workaround para constraints antigas, nao publicacao operacional real.

7. Schedulers dependem de IDs ja publicados
   - `metaStatusScheduler` e `metaMetricsScheduler` so atuam depois que `generated_campaigns.meta_campaign_id` existe.
   - Eles nao ajudam uma linha operacional a virar Campaign Meta.

## O que impede ARM-PlantasBTN-FB de virar uma Campaign Meta hoje

`ARM-PlantasBTN-FB` existe como `market_param`/`src` em `operational_market_generations`, mas nao e uma entidade publicavel para o publicador antigo.

Bloqueios concretos:

- A linha operacional nao tem `generatedCampaignId`, que e a entrada exigida por `POST /api/meta/campaigns`, `POST /api/meta/adsets` e `POST /api/meta/ads`.
- O fluxo que cria essas linhas retorna `generated_campaigns = []` e `meta_publishing = false`.
- `publishable=false` e `previewOnly=true` marcam o registro como conferencia, nao publicacao.
- A Campaign Meta antiga precisa de `name`, `objective`, conta Meta e token. A linha operacional tem nome/tracking, mas nao carrega a configuracao completa de publicacao.
- O AdSet antigo precisa de `country_code` unico. ARM resolve muitos paises; o payload real por mercado ainda nao esta conectado ao helper Meta.
- As traducoes por mercado nao criam automaticamente Creative Drafts/AdCreatives.

Resultado: hoje `ARM-PlantasBTN-FB` pode ser conferido, rastreado e usado como preview operacional, mas nao ha ponte implementada entre essa linha e o pipeline Campaign -> AdSet -> Creative -> Ad.

## Estimativa de adaptacao

Baixa/media para criar uma primeira Campaign por mercado em modo controlado, se o escopo for somente Campaign:

- Criar adaptador `operational_market_generations -> generated_campaigns` ou novo endpoint que aceite `operationalMarketGenerationId`.
- Resolver objetivo Meta, conta Meta e approval explicito.
- Manter `PAUSED`.
- Persistir `meta_campaign_id` em uma entidade rastreavel.

Media para publicar Campaign + AdSet:

- Alterar/adaptar `metaCreateAdSet` para aceitar targeting por mercado:
  - `resolved_countries`
  - exclusoes de `targeting_preview.excludedCountryCodes`
  - futuro payload de `targeting_preview.futurePayloadPreview`
- Definir politica para mercados grandes/multi-pais, limites e validacao antes de liberar `publishable=true`.

Media/alta para Campaign + AdSet + Ads:

- Conectar `translationsByMarket` a `creative_drafts`.
- Resolver assets, videos, thumbnails, destination URL por mercado.
- Garantir Page ID/Instagram actor por conta.
- Criar checklist/aprovacao final e evidencias por linha operacional.

## Recomendacao

Nao adaptar diretamente o fluxo antigo para publicar a partir de `country_code`.

Recomendacao pragmatica:

1. Manter os guardrails atuais ate existir uma etapa explicita de aprovacao.
2. Criar primeiro um contrato de publicacao operacional, sem chamar Meta:
   - entrada: `operationalMarketGenerationId`
   - saida preview: payload esperado para Campaign, AdSet, Creative e Ad
   - status: `publishable=false` ate validacoes passarem
3. Depois, criar uma camada adaptadora fina que reaproveite os helpers Meta existentes, mantendo `PAUSED`.
4. Para AdSet, evoluir o helper para aceitar targeting estruturado, nao apenas `countryCode`.
5. Preservar `/meta-test` como laboratorio tecnico e usar o novo fluxo operacional apenas quando o contrato por mercado estiver completo.

Nenhuma correcao de codigo foi aplicada nesta auditoria porque nao foi encontrado bug trivial que pudesse ser corrigido sem alterar comportamento.
