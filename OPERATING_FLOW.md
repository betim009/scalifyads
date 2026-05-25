# OPERATING_FLOW — Criar anúncio REAL via frontend

Última atualização: [2026-05-25 18:57]

## 1. Objetivo

Este documento ensina como operar o fluxo **REAL** no navegador usando o console `/meta-test`, criando uma estrutura completa na Meta (Campaign → AdSet → Creative → Ad) com **status obrigatório `PAUSED`** e com evidências via DB e Graph.

## 2. Pré-requisitos

- Docker rodando.
- Backend funcionando.
- DB funcionando (Postgres).
- Token configurado **apenas no backend** (`META_ACCESS_TOKEN`).
- App Meta publicado/aceito (fora do Development Mode para as operações necessárias).
- Forma de pagamento configurada na Ad Account usada para testes.
- `META_PAGE_ID` configurado (env no backend) **ou** `pageId` disponível para informar no publish do Creative.
- `META_AD_ACCOUNT_ID` conhecido (formato `act_<id>`).
- Toda criação REAL deve ser **PAUSED** (não criar/ativar `ACTIVE`).

## 3. Subir ambiente

Comandos operacionais (RUNBOOK):

```bash
docker compose up -d
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
curl http://localhost:3001/healthz
curl http://localhost:3001/api/meta/status
curl -X POST http://localhost:3001/api/meta/validate -H "Content-Type: application/json" -d '{}'
```

Resultados esperados:

- `GET /healthz` → `ok=true`
- `GET /api/meta/status` → `ok=true` e `has_access_token=true`
- `POST /api/meta/validate` → `ok=true` (Graph `/me`)

## 4. Abrir o console operacional

- Abrir o frontend no navegador (default do Docker Compose: `http://localhost:5173`).
- Acessar diretamente: `http://localhost:5173/meta-test`.
- Usar o `/meta-test` como **fluxo principal** de operação/validação.
- Não usar “Nova Campanha” como fluxo principal (fluxo legado/compatibilidade).

## 5. Etapa 1 — Criar Campaign REAL

Campos típicos no `/meta-test`:

- Ad Account: `act_<id>`
- Nome da Campaign
- Objetivo (ex.: `OUTCOME_SALES`, conforme operação/teste)
- País (quando aplicável no fluxo do console)
- Modo: `REAL`

Exemplo prático (preenchimento):

- Ad Account: `act_259174718403969`
- Nome: `DEMO • Campaign Builder • BR • 2026-05-25`
- Objetivo: `OUTCOME_SALES`
- Modo: `REAL`

Ação:

- Clicar para criar **Campaign REAL (PAUSED)**.

Resultado esperado:

- Retorno com `meta_campaign_id`.
- `status=PAUSED` (forçado no backend).
- Registro persistido no DB (evidência em `generated_campaigns.meta_campaign_id`).

## 6. Etapa 2 — Criar AdSet REAL

Campos típicos:

- `generatedCampaign` selecionada (registro gerado no DB / selecionado no console).
- Nome do AdSet.
- Orçamento (budget).
- `billing_event`.
- `optimization_goal`.
- Modo: `REAL`.

Exemplo prático (preenchimento):

- Nome: `DEMO • AdSet • BR • ABO`
- daily budget: `R$ 20,00` (no console, informar em centavos quando aplicável: `2000`)
- `billing_event`: `IMPRESSIONS`
- `optimization_goal`: `OFFSITE_CONVERSIONS`
- Modo: `REAL`

Ação:

- Clicar para criar **AdSet REAL (PAUSED)**.

Resultado esperado:

- Retorno com `meta_adset_id`.
- `status=PAUSED` (effective pode iniciar como `IN_PROCESS` em alguns casos).
- Persistência no DB (evidência em `generated_campaigns.meta_adset_id` e tabelas relacionadas, quando aplicável).

## 7. Etapa 3 — Criar/selecionar Creative Draft

No console, criar ou selecionar um `creativeDraft`:

- `primaryText` (texto principal)
- `headline`
- `description`
- `destinationUrl` (obrigatório para publish REAL do AdCreative)
- Selecionar/upload de mídia, se houver no fluxo disponível (assets locais do projeto)

Exemplo prático (conteúdo):

- `primaryText`: `Teste controlado do Campaign Builder. Não ativar.`
- `headline`: `Demo — Anúncio PAUSED`
- `description`: `Fluxo REAL validado via backend.`
- `destinationUrl`: `https://example.com/?utm_source=demo&utm_medium=meta&utm_campaign=campaign-builder`

Ação:

- Clicar para criar o **Creative Draft**.

Resultado esperado:

- `creativeDraftId` (UUID) persistido no DB.

## 8. Etapa 4 — Publicar Creative REAL

Pré-check:

- Garantir que existe `pageId` (via env `META_PAGE_ID` no backend ou informado no publish pelo console).

Exemplo prático (pageId):

- `pageId`: `123456789012345` (exemplo; obter pelo botão “Listar Pages (Graph)” no `/meta-test` ou por configuração no backend)

Ação:

- Selecionar `creativeDraftId`.
- Clicar em **Publicar Creative REAL**.
- Consultar o Creative no Graph (botão/ação do console, quando disponível).

Resultado esperado:

- `meta_creative_id` persistido no DB (ex.: em `creative_drafts.meta_creative_id`).
- Graph read OK (`GET /api/meta/creatives/{meta_creative_id}` → `ok=true`).

## 9. Etapa 5 — Criar Ad REAL

Campos/inputs típicos:

- Selecionar `generatedCampaign` (e AdSet já criado para ela).
- Informar/selecionar `creativeDraftId` que já tenha `meta_creative_id` publicado.
- `creativeId`:
  - pode ficar vazio se o sistema estiver usando fallback via draft (quando implementado); nesse caso, o backend usa `creative_drafts.meta_creative_id`.
- Modo: `REAL`.

Ação:

- Clicar para criar **Ad REAL (PAUSED)**.

Resultado esperado:

- `meta_ad_id`.
- `status=PAUSED`.
- `effective_status` pode aparecer como `IN_PROCESS` inicialmente.
- Persistência no DB:
  - `generated_campaigns.meta_ad_id` atualizado
  - insert em `generated_ads` (com `run_mode=REAL`, `status=PAUSED`)
- Graph read OK (`GET /api/meta/ads/{meta_ad_id}` → `ok=true`).
- Preview OK, quando a Meta retornar (`GET /api/meta/ads/{meta_ad_id}/previews?...` → `ok=true`, iframe/HTML).

## 10. Conferências obrigatórias

Checklist antes de considerar “validado”:

- [ ] Campaign criada?
- [ ] AdSet criado?
- [ ] Creative publicado?
- [ ] Ad criado?
- [ ] Tudo `PAUSED`?
- [ ] IDs persistidos no DB?
- [ ] Graph read funcionando?
- [ ] Preview retornou (quando disponível)?
- [ ] Nenhum token apareceu no frontend?

## 11. Onde copiar evidências

No `/meta-test`, o operador deve conseguir copiar/registrar:

- payloads e respostas (JSON) de cada etapa (Campaign/AdSet/Creative/Ad).
- IDs Meta (`meta_campaign_id`, `meta_adset_id`, `meta_creative_id`, `meta_ad_id`).
- recovery bundle (quando disponível no console).
- logs operacionais e snapshots do Graph (quando persistidos/mostrados pelo console).
- preview (HTML/iframe) quando disponível.
- status do backend (`/api/meta/status`, `/api/meta/validate`, `/api/meta/diagnostics`).

## 12. Erros comuns

- Token ausente no backend (`has_access_token=false` em `/api/meta/status`).
- `pageId` ausente (env `META_PAGE_ID` não configurado e não informado no publish).
- App Meta ainda em Development Mode / roles insuficientes (bloqueia publish do Creative REAL).
- Forma de pagamento ausente ou problema de billing na Ad Account.
- Creative draft sem `destinationUrl`.
- `creativeId` ausente e draft sem `meta_creative_id` publicado (fallback não consegue resolver).
- Ad Account incorreta (`act_<id>` errado).
- Docker/DB offline (impede drafts/persistência e quebra o fluxo do `/meta-test`).

## 13. Regra de segurança operacional

- Nunca criar `ACTIVE`.
- Tudo deve nascer `PAUSED` (guardrail obrigatório).
- Não ativar manualmente no Ads Manager durante testes.
- Token e credenciais ficam **somente no backend** (nunca no frontend; nunca no Git; nunca em logs/documentos).

## 14. Resultado final esperado

Ao final do fluxo, o operador terá:

- Campaign REAL criada.
- AdSet REAL criado.
- Creative REAL publicado.
- Ad REAL criado.
- Tudo `PAUSED`.
- Evidências persistidas no DB e confirmadas via Graph read.
- Preview disponível quando a Meta retornar (iframe/HTML).
