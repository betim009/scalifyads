# RUNBOOK — Execução, validação e troubleshooting

## Governança (fonte única de operações)

Última atualização: [2026-05-08 08:48]

- Regra de timestamps (padrão e obrigatoriedade): ver `PLANS.md` em `## Regras de Atualização (OBRIGATÓRIO)`.
- Backlog ativo (único): ver `PLANS.md` em `## Backlog Ativo (ÚNICO)`.
- Este documento existe apenas para execução/validação/troubleshooting (sem checklists históricos competindo com o backlog).
- Conteúdo legado e fases antigas: ver `ARCHIVE.md` em `## RUNBOOK (legado) — não executar`.

## PLAYBOOKS ATUAIS

Última atualização: [2026-05-08 08:48]

### Guardrails Meta (OBRIGATÓRIO)

Última atualização: [2026-05-08 08:48]

- **PAUSED obrigatório (dev):** toda criação REAL via backend deve forçar `status=PAUSED` (mesmo que o client envie outro valor).
- **Token nunca no frontend:** token fica apenas no backend (env `META_ACCESS_TOKEN` ou via `POST /api/meta/tokens`).
- **Fluxo atual:** `/meta-test` é o laboratório operacional para evoluir Campaign → AdSet → Ad (o fluxo “Nova Campanha” é legado/compatibilidade).

### Setup rápido (Docker + DB)

Última atualização: [2026-05-14 20:06]

- Subir stack: `docker compose up -d`
- Smoke tests (host):
  - `curl http://localhost:3001/healthz`
  - `curl http://localhost:3001/api/countries`
- Se as portas estiverem ocupadas no host, sobrescreva no `.env`:
  - `DB_HOST_PORT` (default `5433`)
  - `BACKEND_HOST_PORT` (default `3001`)
  - `FRONTEND_HOST_PORT` (default `5173`)
- Migrations + seed:
  - `docker compose exec backend npm run migrate`
  - `docker compose exec backend npm run seed`

### Meta — Token (validate/status)

Última atualização: [2026-05-08 08:48]

- Diagnóstico: `curl http://localhost:3001/api/meta/status`
- Validar token (Graph `/me` via backend): `curl -X POST http://localhost:3001/api/meta/validate -H 'Content-Type: application/json' -d '{}'`
- Validar Page ID (read-only): `GET /api/meta/pages/<page_id>`
- Listar Pages disponíveis (para obter `pageId` do Creative REAL): `curl "http://localhost:3001/api/meta/pages?metaAdAccountId=act_<id>"`
- Diagnóstico completo (inclui permissões do token): `curl http://localhost:3001/api/meta/diagnostics`

### Meta — Operações principais (backend)

Última atualização: [2026-05-18 15:04]

- Criar Campaign REAL (PAUSED): `POST /api/meta/campaigns`
- Criar Campaign REAL/STUB mínima (PAUSED): `POST /api/meta/campaigns/simple`
- Criar AdSet/Ad (REAL/STUB, PAUSED): `POST /api/meta/adsets`, `POST /api/meta/ads`
  - `POST /api/meta/ads`:
    - `creativeDraftId` (uuid) é opcional para rastreabilidade/persistência local
    - no REAL, `creativeId` pode ser omitido se o draft já tiver `meta_creative_id` persistido (fallback)
- Consultar Campaign no Graph (via backend): `GET /api/meta/campaigns/{meta_campaign_id}`
- Consultar AdSet no Graph (via backend): `GET /api/meta/adsets/{meta_adset_id}`
- Consultar Ad no Graph (via backend): `GET /api/meta/ads/{meta_ad_id}`
- Consultar preview do Creative (HTML/iframe, ~24h): `GET /api/meta/creatives/{meta_creative_id}/previews?adFormat=DESKTOP_FEED_STANDARD`
- Consultar preview do Ad (HTML/iframe, ~24h): `GET /api/meta/ads/{meta_ad_id}/previews?adFormat=DESKTOP_FEED_STANDARD`
- Listar Campaigns PAUSED por Ad Account (via backend): `GET /api/meta/ad-accounts/:id/campaigns?pausedOnly=true&limit=100`

Exemplos (`curl`, sempre `PAUSED` e sem token no frontend):

- Criar AdSet REAL/STUB:
  - `curl -X POST http://localhost:3001/api/meta/adsets -H 'Content-Type: application/json' -d '{\"generatedCampaignId\":\"<generated_campaign_uuid>\",\"name\":\"AdSet BR\",\"dailyBudgetCents\":1000,\"billingEvent\":\"IMPRESSIONS\",\"optimizationGoal\":\"LINK_CLICKS\",\"mode\":\"REAL\"}'`
- Criar Ad REAL (requer AdSet criado; `creativeId` pode vir do draft):
  - `curl -X POST http://localhost:3001/api/meta/ads -H 'Content-Type: application/json' -d '{\"generatedCampaignId\":\"<generated_campaign_uuid>\",\"name\":\"Ad BR — 1\",\"creativeId\":\"<meta_creative_id>\",\"creativeDraftId\":\"<creative_draft_uuid>\",\"mode\":\"REAL\"}'`
- Criar Ad REAL sem `creativeId` (fallback: usa `creative_drafts.meta_creative_id` do `creativeDraftId`):
  - `curl -X POST http://localhost:3001/api/meta/ads -H 'Content-Type: application/json' -d '{\"generatedCampaignId\":\"<generated_campaign_uuid>\",\"name\":\"Ad BR — 1\",\"creativeDraftId\":\"<creative_draft_uuid>\",\"mode\":\"REAL\"}'`
- Criar Ad STUB (não requer `creativeId`):
  - `curl -X POST http://localhost:3001/api/meta/ads -H 'Content-Type: application/json' -d '{\"generatedCampaignId\":\"<generated_campaign_uuid>\",\"name\":\"Ad BR — STUB\",\"creativeDraftId\":\"<creative_draft_uuid>\",\"mode\":\"STUB\"}'`

### Meta — Sync / Automação (dev)

Última atualização: [2026-05-18 20:11]

- Sync manual de métricas: `POST /api/meta/sync/generated-campaigns/:id`
- Fallback seguro: se o Graph falhar e `META_SYNC_PROVIDER` não for `meta`, o backend retorna `provider=stub` + campo `fallback` (para fail-fast, use `META_SYNC_PROVIDER=meta`).
- Executor de automação (dry-run): `curl -X POST http://localhost:3001/api/automation/run -H 'Content-Type: application/json' -d '{"dryRun":true}'`
- Executor de automação (persistindo logs): `curl -X POST http://localhost:3001/api/automation/run -H 'Content-Type: application/json' -d '{}'`
- Scheduler (opcional, dev — requer DB): `AUTOMATION_SCHEDULER_ENABLED=true` (intervalo via `AUTOMATION_SCHEDULER_INTERVAL_MS`; opcional `AUTOMATION_SCHEDULER_RUN_ON_STARTUP=true`)
- Status do scheduler: `GET /api/automation/scheduler/status`
- Scheduler Meta status (opcional, dev — requer token+DB): `META_STATUS_SCHEDULER_ENABLED=true` (intervalo via `META_STATUS_SCHEDULER_INTERVAL_MS`; concurrency via `META_STATUS_SCHEDULER_CONCURRENCY`; opcional `META_STATUS_SCHEDULER_RUN_ON_STARTUP=true`)
- Scheduler Meta metrics (opcional, dev — requer token+DB): `META_METRICS_SCHEDULER_ENABLED=true` (intervalo via `META_METRICS_SCHEDULER_INTERVAL_MS`; concurrency via `META_METRICS_SCHEDULER_CONCURRENCY`; opcional `META_METRICS_SCHEDULER_RUN_ON_STARTUP=true`)
- Status (todos schedulers): `GET /api/scheduler/status`
- Histórico de sync (métricas): `GET /api/ops-logs?source=meta-sync&entity=metrics&limit=200`

### DB — Evidência operacional (dev)

Última atualização: [2026-05-12 18:26]

- Estrutura persistida (AdSet/Ad) por `generated_campaign_id`: `GET /api/generated-campaigns/{generated_campaign_id}/structure`

### Ops Logs — Persistência (dev)

Última atualização: [2026-05-12 18:28]

- Listar logs persistidos (padrão `source=meta-test`): `GET /api/ops-logs?limit=200`
- Inserir logs (best-effort, usado pelo `/meta-test`): `POST /api/ops-logs` com body `{ "source": "meta-test", "entries": [...] }`

### DB — Run Mode (REAL/STUB)

Última atualização: [2026-05-12 18:40]

- `generated_campaigns.meta_run_mode` persiste o modo operacional inferido/executado (`REAL`/`STUB`) para reduzir ambiguidade no `/meta-test`.

### Creative Assets — Upload local (dev)

Última atualização: [2026-05-12 18:54]

- Listar assets persistidos: `GET /api/creative-assets?limit=50`
- Upload (multipart): `POST /api/creative-assets/upload` (field `file`)
- Acesso ao arquivo: `GET /uploads/creative-assets/<stored_name>` (servido pelo backend)

### Creative Drafts — Copy/headline (dev)

Última atualização: [2026-05-12 18:59]

- Listar drafts: `GET /api/creative-drafts?generatedCampaignId=<uuid>&limit=50`
- Criar draft: `POST /api/creative-drafts`

### Creative Templates — Templates de copy/creative (dev)

Última atualização: [2026-05-18 20:31]

- Listar templates: `GET /api/creative-templates?limit=50`
- Criar template a partir de draft: `POST /api/creative-templates/from-draft/<creative_draft_uuid>` (body opcional: `{ "name": "..." }`)
- Aplicar template (cria draft): `POST /api/creative-templates/<template_uuid>/apply` (body: `{ "generatedCampaignId": "<uuid>" }`)

### Meta — Creative REAL (AdCreative)

Última atualização: [2026-05-13 14:09]

- Publicar Creative REAL a partir de um `creative_draft` (token no backend): `POST /api/meta/creative-drafts/:id/publish`
  - Requer `creative_drafts.destination_url` preenchido (use `destinationUrl` ao criar o draft).
  - `pageId` pode vir do body (`{ "pageId": "..." }`) ou do env `META_PAGE_ID` (obrigatório).
  - `docker-compose.yml` faz passthrough de `META_PAGE_ID` e `META_INSTAGRAM_ACTOR_ID` (via env/.env do host); após alterar, rode `docker compose restart backend`.

### Playbook — Validação REAL via `/meta-test` (Creative + Ad)

Última atualização: [2026-05-18 17:25]

Objetivo:
validar os itens abertos do `PLANS.md` em **P4/P5** (Creative REAL + Ad REAL) usando o console `/meta-test`, preservando os guardrails (**PAUSED obrigatório**; token apenas no backend).

Pré-requisitos:

- Stack no ar: `docker compose up -d`
- Backend OK: `curl http://localhost:3001/healthz`
- Token no backend:
  - `curl http://localhost:3001/api/meta/status` (esperado: `hasAccessToken=true`)
  - `curl -X POST http://localhost:3001/api/meta/validate -H 'Content-Type: application/json' -d '{}'`
- Page ID:
  - Preferir `META_PAGE_ID` no backend **ou** preencher `pageId` no UI (Etapa 3).
  - Diagnóstico: `curl \"http://localhost:3001/api/meta/pages?metaAdAccountId=act_<id>\"`

Atalhos (deep-links úteis):

- **Prefill (legado → lab):** o fluxo “Nova Campanha” agora abre o `/meta-test` com prefill via query params (`name`, `pageId`, `destinationUrl`) para reduzir atrito operacional (não envolve token no frontend).
- **Preselect (DB → lab):** em “Detalhes da Campanha”, cada linha de `generated_campaigns` tem o botão “Abrir /meta-test”, que abre o console já com `generatedCampaignId` e o registro selecionado automaticamente.
- **Manual (exemplos):**
  - `/meta-test?generatedCampaignId=<uuid>`
  - `/meta-test?generatedCampaignId=<uuid>&name=<nome>`
  - `/meta-test?name=<nome>&pageId=<page_id>&destinationUrl=https%3A%2F%2F...`

Fluxo recomendado (UI):

1) **Operação — fluxo principal**
   - Etapa 1 (Campaign): preencher `act_...`, nome/objetivo/país, modo `REAL`, criar Campaign.
   - Etapa 2 (AdSet): criar AdSet (REAL, PAUSED).
   - Etapa 3 (Ad): preparar Creative e criar Ad (REAL, PAUSED).

2) **Persistência (DB)**
   - (Opcional) Upload de mídia (dev) em “Mídia (dev) — upload local”.
   - Criar `creative_draft` (preencher `destinationUrl`).

3) **Etapa 3 — Creative REAL**
   - Selecionar `creativeDraftId` no dropdown.
   - (Opcional) clicar em “Listar Pages (Graph)” para obter `pageId` e confirmar acesso.
   - Clicar em “Publicar Creative REAL” e capturar `meta_creative_id`.
   - Clicar em “Consultar Creative (Graph)” para evidência (payload fica em accordion).

4) **Etapa 3 — Ad REAL**
   - Se o draft já tem `meta_creative_id`, o `creativeId` pode ser omitido (fallback) ou preenchido com o mesmo valor.
   - Clicar em “Criar Ad REAL (PAUSED)”.

5) **Graph (REAL)**
   - Usar “Graph refresh” para atualizar Campaign/AdSet/Ad via backend (evidência de status).

Checks mínimos (aceite):

- Campaign/AdSet/Ad criados como **PAUSED** (status/effective_status).
- IDs Meta persistidos no DB (`generated_campaigns` + estrutura `generated_adsets`/`generated_ads`).
- Creative REAL consultável via Graph (`AdCreative`) e `meta_creative_id` persistido no draft.

Troubleshooting comum:

- “Listar Pages (Graph)” retorna vazio:
  - token sem acesso a uma Page; informe `pageId` manualmente ou ajuste permissões/associação de Page.
  - ver `GET /api/meta/diagnostics` e `GET /api/meta/pages`.
- “Publicar Creative REAL” falha com `error_subcode=1885183` (“app em modo de desenvolvimento”):
  - o App Meta usado pelo token está em modo Dev; coloque em modo público (Live) e/ou use roles adequados no app (admin/developer/tester).
- Erros grandes ficam em accordions no UI (evita poluição visual); use “Copiar” no card de erro global quando necessário.
  - `instagramActorId` é opcional (body ou env `META_INSTAGRAM_ACTOR_ID`).
  - Se houver `creative_asset_id`, o backend faz upload da imagem na Meta (`adimages`) e usa `image_hash`.
- Consultar Creative no Graph (via backend): `GET /api/meta/creatives/{meta_creative_id}`

Exemplos (`curl`, sem token no frontend):

- Publicar (usa `META_PAGE_ID` do backend se `pageId` for omitido):
  - `curl -X POST http://localhost:3001/api/meta/creative-drafts/<creative_draft_uuid>/publish -H 'Content-Type: application/json' -d '{}'`
- Publicar informando `pageId` (e `force` opcional):
  - `curl -X POST http://localhost:3001/api/meta/creative-drafts/<creative_draft_uuid>/publish -H 'Content-Type: application/json' -d '{\"pageId\":\"<page_id>\",\"instagramActorId\":\"<ig_actor_id>\",\"force\":false}'`
- Consultar Creative no Graph (evidência):
  - `curl http://localhost:3001/api/meta/creatives/<meta_creative_id>`

### Registros operacionais (cronológico)

Esta seção deve ser atualizada sempre que:

- Algo não for implementado pelo Codex
- Um bug for encontrado
- Um fluxo estiver incompleto

[2026-05-18 14:46]

- Progresso (P4/P5 — Creative/Ad REAL): token valida e Pages retornam via Graph, mas publish do Creative REAL falha com `error_subcode=1885183` (“app em modo de desenvolvimento”).
  - Evidência: `POST /api/meta/validate` OK; `GET /api/meta/pages?metaAdAccountId=act_*` retorna Page(s); `POST /api/meta/creative-drafts/:id/publish` retorna subcode 1885183.
  - Ação: colocar o App Meta em modo público (Live) e/ou ajustar roles do app para permitir criação de AdCreative/Ad.

[2026-05-14 20:06]

- Ambiente: Docker daemon voltou a operar neste host.
  - Observação: a porta `5433` já estava em uso por outro projeto; para subir este stack foi necessário usar override (ex: `DB_HOST_PORT=5434 FRONTEND_HOST_PORT=5174 docker compose up -d`).
- Bloqueio (P4/P5 — Creative/Ad REAL): token atual valida (`POST /api/meta/validate` OK), mas não há Pages retornadas via Graph para uso no AdCreative:
  - `GET /me/accounts` → vazio
  - `GET /act_<ad_account_id>/promote_pages` → vazio
  - Ação: definir `META_PAGE_ID` (env) ou informar `pageId` no `/meta-test`. Se o token não tiver acesso a uma Page, criar/associar Page e garantir permissões.

[2026-05-13 13:19]

- Bloqueio (ambiente): Docker daemon indisponível neste host (erro ao rodar `docker compose ps`).
  - Impacto: não dá para validar P4/P5 com DB + `/meta-test` (creative drafts/assets exigem Postgres).
  - Ação: iniciar Docker Desktop/daemon e repetir `docker compose up -d` + smoke tests (ver `### Setup rápido (Docker + DB)`).

[2026-05-06 17:15]

- Bloqueio: não foi possível subir o Postgres via Docker neste ambiente (`docker compose up` falha por não conseguir conectar ao Docker daemon).
  - Ação: iniciar o Docker Desktop/daemon e validar o stack com `docker compose up`.
  - Smoke test sugerido (com DB): `curl http://localhost:3001/healthz` e `curl http://localhost:3001/api/countries`.

[2026-05-06 17:36]

- Nota: sincronização de métricas Meta foi definida como um sync manual via endpoint `POST /api/meta/sync/generated-campaigns/:id`, persistindo dados em `campaign_metrics`.
  - Provider: usa Meta Graph quando houver token (via `META_ACCESS_TOKEN`, body `accessToken` ou `meta_tokens`); caso contrário, usa `stub` para testar persistência sem credenciais.

[2026-05-06 19:22]

- Docker stack validado neste ambiente:
  - `docker compose up -d` sobe `db`, `backend`, `frontend`.
  - Smoke test (host):
    - `curl http://localhost:3001/healthz` → `{"ok":true}`
    - `curl http://localhost:3001/api/countries` → `{"ok":true,"countries":[...]}`
- Nota: quando o backend roda com `node --watch`, se ocorrer erro de runtime ele pode ficar “parado aguardando mudanças”; usar `docker compose restart backend` para recuperar.

[2026-05-06 19:54]

- Meta sync (dev):
  - Por padrão, o backend usa `stub` quando não há token; com token válido, tenta Meta Graph automaticamente.
  - Token via env: exportar `META_ACCESS_TOKEN=...` no serviço `backend` (ex: docker compose `environment:`) ou via `POST /api/meta/tokens`.
  - Forçar stub mesmo com token: `META_SYNC_PROVIDER=stub`.
  - Forçar Meta Graph (sem fallback para stub): `META_SYNC_PROVIDER=meta` (vai falhar se não houver token válido).
  - Validar token (Meta Graph): `curl -X POST http://localhost:3001/api/meta/validate -H 'Content-Type: application/json' -d '{}'`
  - Para sync real de uma campanha gerada, é preciso ter `generated_campaigns.meta_campaign_id` preenchido (pode ser vinculado no UI em Detalhes da Campanha).
  - Diagnóstico: `curl http://localhost:3001/api/meta/status`
  - Fluxo recomendado com Docker Compose:
    - Criar `.env` local a partir de `.env.example` e preencher `META_ACCESS_TOKEN`.
    - Subir stack: `docker compose up -d`
    - Validar token: `curl -X POST http://localhost:3001/api/meta/validate -H 'Content-Type: application/json' -d '{}'`
  - Observação: quando o Insights retornar `action_values` com `purchase`/`omni_purchase`, o backend persiste isso em `campaign_metrics.revenue_cents` (se ausente, pode ficar `null`).
- Automação MVP (manual):
  - Rodar executor (dry-run): `curl -X POST http://localhost:3001/api/automation/run -H 'Content-Type: application/json' -d '{"dryRun":true}'`
  - Rodar executor (persistindo logs): `curl -X POST http://localhost:3001/api/automation/run -H 'Content-Type: application/json' -d '{}'`

[2026-05-07 13:54]

- Criação real de campanhas Meta Ads validada:
  
  - Endpoint:
    
    `POST /api/meta/campaigns`

  - Estratégia operacional:
    
    Toda campanha criada durante desenvolvimento deve nascer obrigatoriamente com:
    
    ```json
    {
      "status": "PAUSED"
    }
    ```

    Observação: mesmo que o cliente envie outro valor no payload, o backend deve forçar `PAUSED` durante o desenvolvimento.

  - Fluxo validado:
    
    Frontend
    → Backend
    → Meta Marketing API
    → Recebe `meta_campaign_id`
    → Persistência local
    → Sincronização futura

  - Campos confirmados pela API:
    
    - `id`
    - `name`
    - `status`
    - `effective_status`
    - `objective`

  - Exemplo validado:
    
    - `meta_campaign_id`: `120246720768940596`
    - `meta_ad_account_id`: `act_259174718403969`

  - Consulta validada:
    
    `GET /{meta_campaign_id}?fields=id,name,status,effective_status,objective`

  - Implementação no projeto (backend):

    - Criar campanha (persistindo no Postgres):

      `POST /api/meta/campaigns`

      Body mínimo:

      ```json
      {
        "generatedCampaignId": "<uuid>",
        "metaAdAccountId": "act_<digits>",
        "objective": "OUTCOME_SALES"
      }
      ```

      Notas:

      - `objective` só é obrigatório quando a campanha não tiver `objective_key` definido no banco.
      - O backend força `status=PAUSED` sempre (modo seguro).

    - Consultar campanha no Graph (via backend):

      `GET /api/meta/campaigns/{meta_campaign_id}`

  - Fluxo operacional real (sugestão):

    1. Subir stack (com DB):

       `docker compose up -d`

    2. Rodar migrations + seed (no backend):

       `docker compose exec backend npm run migrate`
       `docker compose exec backend npm run seed`

    3. Configurar token (não colocar token no frontend):

       - Via env no serviço `backend`: `META_ACCESS_TOKEN=...`
       - Ou via API: `POST /api/meta/tokens`

    4. Gerar campanhas por país e pegar um `generated_campaigns.id` (UI Detalhes da Campanha).

    5. Criar campanha real (sempre `PAUSED`):

       `curl -X POST http://localhost:3001/api/meta/campaigns -H 'Content-Type: application/json' -d '{"generatedCampaignId":"<uuid>","metaAdAccountId":"act_259174718403969","objective":"OUTCOME_TRAFFIC"}'`

    6. Consultar campanha criada (backend → Graph):

       `curl http://localhost:3001/api/meta/campaigns/{meta_campaign_id}`

    7. Verificar persistência no DB (exemplo):

       `SELECT meta_campaign_id, meta_ad_account_id, meta_user_id, meta_status, meta_effective_status, meta_objective FROM generated_campaigns WHERE id = '<uuid>';`

[2026-05-07 14:49]

- UI (teste) para criação REAL `PAUSED`:

  - Acesso: Configurações → “Meta (teste)” → “Abrir teste Meta” (`/meta-test`)
  - Pré-requisitos:
    - DB habilitado (Docker ou `DATABASE_URL` local).
    - Token no backend (`META_ACCESS_TOKEN` ou salvo via `POST /api/meta/tokens`).
    - Existir ao menos 1 `generated_campaigns` (UI: criar campanha → “Gerar por país”).
  - Comportamento esperado:
    - Ao clicar “Criar REAL (PAUSED)” em uma linha, o frontend chama o backend (`POST /api/meta/campaigns`).
    - O backend força `status=PAUSED` e persiste `meta_campaign_id` + `meta_status/meta_effective_status`.
    - A campanha aparece como pausada no Ads Manager.

[2026-05-07 15:08]

- Listar campanhas PAUSED já existentes no Ads Manager (via UI de teste):

  - Endpoint (backend → Meta):
    - `GET /api/meta/ad-accounts/:id/campaigns?pausedOnly=true&limit=100`
  - UI:
    - Em `/meta-test`, preencher `act_<digits>` e clicar “Listar PAUSED na Meta”.
  - Observação:
    - Essa lista vem direto da Meta e não depende de `generated_campaigns` no banco.

[2026-05-08 10:52]

- Evidência (STUB): persistência completa de `meta_*` para Campaign/AdSet/Ad via backend:
  - `POST /api/meta/campaigns/simple` (`mode=STUB`)
  - `POST /api/meta/adsets` (`mode=STUB`)
  - `POST /api/meta/ads` (`mode=STUB`)
  - `generated_campaigns.id`: `bd48cdae-c728-4719-b460-cad996ab3dbb`
  - Verificação (db):
    - `SELECT meta_campaign_id, meta_status, meta_adset_id, meta_adset_status, meta_ad_id, meta_ad_status FROM generated_campaigns WHERE id = '<uuid>';`

[2026-05-08 10:59]

- Evidência (REAL): criação + leitura Graph + listagem PAUSED + sync (sem token no frontend):
  - Criar Campaign REAL (PAUSED): `POST /api/meta/campaigns/simple` (`mode=REAL`)
    - `generated_campaigns.id`: `7a6b1285-be7a-4f85-a8e4-26043d922394`
    - `meta_campaign_id`: `120246780124490596`
  - Ler Campaign no Graph: `GET /api/meta/campaigns/{meta_campaign_id}` → `status=PAUSED` / `effective_status=PAUSED`
  - Listar PAUSED por Ad Account: `GET /api/meta/ad-accounts/:id/campaigns?pausedOnly=true` (campanha encontrada na lista)
  - Sync REAL (insights): `POST /api/meta/sync/generated-campaigns/:id` → `provider=meta`
  - Criar AdSet REAL (PAUSED): `POST /api/meta/adsets` (`mode=REAL`)
    - `meta_adset_id`: `120246780152480596` (effective pode ficar `IN_PROCESS` no início)

[2026-05-09 15:32]

- `/meta-test` (UX operacional):
  - DB: lista de `generated_campaigns` agora permite “Selecionar” um registro para retomar o fluxo incremental (Campaign → AdSet → Ad) sem recriar a Campaign.
  - Logs: filtro por entidade (campaign/adset/ad/meta/db) e cópia do JSON respeita o filtro atual.
  - Navegação: atalhos exibem `OK/—` por etapa e botões “Ir para Etapa 2/3” fazem scroll.

## LEGADO / NÃO EXECUTAR

Última atualização: [2026-05-08 08:48]

Bootstrap inicial, checklists históricos e regras de fases antigas foram movidos para o arquivo de histórico, para não competir com este runbook operacional.

- Ver `ARCHIVE.md` em `## RUNBOOK (legado) — não executar`.


## Loop de execução contínua para IA

Última atualização: [2026-05-18 19:33]

Ao executar o projeto com Codex:

1. Ler `PLANS.md`.
2. Identificar o primeiro item `[ ]` executável no Backlog Ativo.
3. Se o item depender de bloqueio externo da Meta, registrar no `Blockers` e seguir para o próximo item.
4. Implementar em mudança pequena.
5. Validar com build, smoke test, curl ou teste manual documentado.
6. Atualizar `PLANS.md` com `[x]`, timestamp e commit.
7. Atualizar `RUNBOOK.md` somente se houver novo comando, endpoint ou procedimento.
8. Não executar backlog do `ARCHIVE.md`.
9. Repetir até não existir item executável sem bloqueio externo.
