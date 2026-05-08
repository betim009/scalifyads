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

Última atualização: [2026-05-08 08:48]

- Subir stack: `docker compose up -d`
- Smoke tests (host):
  - `curl http://localhost:3001/healthz`
  - `curl http://localhost:3001/api/countries`
- Migrations + seed:
  - `docker compose exec backend npm run migrate`
  - `docker compose exec backend npm run seed`

### Meta — Token (validate/status)

Última atualização: [2026-05-08 08:48]

- Diagnóstico: `curl http://localhost:3001/api/meta/status`
- Validar token (Graph `/me` via backend): `curl -X POST http://localhost:3001/api/meta/validate -H 'Content-Type: application/json' -d '{}'`

### Meta — Operações principais (backend)

Última atualização: [2026-05-08 08:48]

- Criar Campaign REAL (PAUSED): `POST /api/meta/campaigns`
- Criar Campaign REAL/STUB mínima (PAUSED): `POST /api/meta/campaigns/simple`
- Criar AdSet/Ad (REAL/STUB, PAUSED): `POST /api/meta/adsets`, `POST /api/meta/ads`
- Consultar Campaign no Graph (via backend): `GET /api/meta/campaigns/{meta_campaign_id}`
- Listar Campaigns PAUSED por Ad Account (via backend): `GET /api/meta/ad-accounts/:id/campaigns?pausedOnly=true&limit=100`

### Meta — Sync / Automação (dev)

Última atualização: [2026-05-08 10:43]

- Sync manual de métricas: `POST /api/meta/sync/generated-campaigns/:id`
- Fallback seguro: se o Graph falhar e `META_SYNC_PROVIDER` não for `meta`, o backend retorna `provider=stub` + campo `fallback` (para fail-fast, use `META_SYNC_PROVIDER=meta`).
- Executor de automação (dry-run): `curl -X POST http://localhost:3001/api/automation/run -H 'Content-Type: application/json' -d '{"dryRun":true}'`
- Executor de automação (persistindo logs): `curl -X POST http://localhost:3001/api/automation/run -H 'Content-Type: application/json' -d '{}'`

### Registros operacionais (cronológico)

Esta seção deve ser atualizada sempre que:

- Algo não for implementado pelo Codex
- Um bug for encontrado
- Um fluxo estiver incompleto

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

## LEGADO / NÃO EXECUTAR

Última atualização: [2026-05-08 08:48]

Bootstrap inicial, checklists históricos e regras de fases antigas foram movidos para o arquivo de histórico, para não competir com este runbook operacional.

- Ver `ARCHIVE.md` em `## RUNBOOK (legado) — não executar`.
