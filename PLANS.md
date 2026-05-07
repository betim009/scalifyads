# ExecPlan — Campaign Builder (estado atual + backlog ativo)

Este ExecPlan é um documento vivo e deve ser mantido curto, executável e navegável.

Fonte operacional:

- `PLANS.md`: estado atual + backlog ativo (ÚNICA fonte de backlog)
- `RUNBOOK.md`: procedimentos, comandos, validação e troubleshooting
- `ARCHIVE.md`: histórico, worklogs e backlogs concluídos (contexto legado)

## Regras de Atualização (OBRIGATÓRIO)

Todas as seções deste documento devem registrar data de atualização.

Formato padrão:

[YYYY-MM-DD HH:mm]

Exemplo:

[2026-05-04 22:30]

Regras:

- Sempre que alterar qualquer seção, adicionar ou atualizar a data.
- Nunca sobrescrever histórico importante sem registrar a mudança.
- Atualizações devem refletir o estado real do projeto.
- O documento deve funcionar como um log de evolução.

Observação:

Se uma seção não tiver data, ela deve ser considerada desatualizada.

## Navegação

- Snapshot do sistema: ver `## Snapshot (Estado Atual)`
- Backlog ativo (único): ver `## Backlog Ativo (ÚNICO)`
- Arquitetura atual: ver `## Arquitetura (Snapshot)`
- Decisões ainda válidas: ver `## Decision Log (Ativo)`
- Bloqueios e riscos: ver `## Blockers & Risks`
- Procedimentos: ver `RUNBOOK.md`
- Histórico completo: ver `ARCHIVE.md`

## Purpose / Big Picture

Última atualização: [2026-05-06 17:55]

Construir o **Campaign Builder**, uma aplicação web que substitui a planilha operacional (XLSX) usada pelo cliente para criar, organizar e acompanhar campanhas de anúncios, evoluindo para integração real com Meta Ads (sincronização de métricas, ROI e automações).

## Snapshot (Estado Atual)

Última atualização: [2026-05-07 14:03]

O que está funcional hoje:

- Frontend SPA (React + Vite) com navegação e telas implementadas: ver `frontend/src/App.jsx`.
- Backend Express com healthcheck e API REST mínima (quando há DB): ver `backend/src/server.js`.
- Banco Postgres modelado via migrations SQL + seed idempotente: ver `backend/migrations/` e `backend/src/seed.js`.
- Stack Docker definida (db + backend + frontend): ver `docker-compose.yml` e `README.md`.
- Sincronização de métricas definida como sync manual (`/api/meta/sync/*`) com provider Meta Graph e fallback `stub`: ver `backend/src/routes/meta.js`.
- Criação real de campanhas Meta Ads via backend (`POST /api/meta/campaigns`) implementada com persistência em `generated_campaigns` (campos `meta_*`) e regra obrigatória `status: PAUSED`.

Nota importante:

- O frontend já consome o backend via `VITE_BACKEND_URL` para países/campanhas (Dashboard/Configurações/Nova Campanha) e Financeiro, mantendo fallback local quando a API/DB não estiver disponível.

## Fontes de Verdade

Última atualização: [2026-05-06 17:55]

- Design (UI): `screens/desktop/*` e `screens/mobile/*`.
- Regra de negócio (legado operacional): `projeto_escopo.xlsx`.
- Estado real do stack: diretórios `frontend/`, `backend/` e `docker-compose.yml`.
- Backlog ativo: este documento (`PLANS.md`) em `## Backlog Ativo (ÚNICO)`.

## Arquitetura (Snapshot)

Última atualização: [2026-05-07 14:03]

- Frontend: React + Vite + React Router em `frontend/` (scripts `dev/build/preview`).
- Backend: Node (ESM) + Express em `backend/` (scripts `dev/migrate/seed/start`).
- Banco: Postgres (migrations SQL em `backend/migrations/`).
- Docker: `db` (host `5433`), `backend` (host `3001`), `frontend` (host `5173`).
- Meta Campaign Create:
  `POST /api/meta/campaigns`
  - Regra operacional obrigatória (dev): toda campanha criada deve nascer como `status: PAUSED`.
  - Implementação: service/provider em `backend/src/meta/*` (routes não acessam Meta diretamente).

Contratos atuais (mínimo):

- Backend health: `GET /healthz`.
- API base: `GET /api`.
- Campanhas: `POST /api/campaigns`, `POST /api/campaigns/:id/duplicate`, `POST /api/campaigns/:id/generate`.
- Generated campaigns: `POST /api/generated-campaigns/:id/mark-published`, `POST /api/generated-campaigns/:id/status`.
- Meta tokens + sync: `POST /api/meta/tokens`, `GET /api/meta/tokens`, `POST /api/meta/sync/generated-campaigns/:id`.

## Backlog Ativo (ÚNICO)

Última atualização: [2026-05-07 09:03]

Regras:

- Esta é a ÚNICA fonte oficial do backlog ativo.
- Backlog concluído e worklogs históricos devem ficar em `ARCHIVE.md`.
- Procedimentos/como rodar/testar devem ficar em `RUNBOOK.md`.
- Ao concluir um item: marcar como `[x]`, registrar decisão se necessário em `Decision Log (Ativo)` e criar commit incremental.

### Fase 5 — Integração Full Stack (próximos passos reais)

- [x] Desbloquear execução com Docker e registrar evidência (stack sobe + smoke test). (ver `RUNBOOK.md`)
- [x] Conectar o frontend ao backend via `VITE_BACKEND_URL` (client HTTP + primeira tela lendo dados reais).
- [x] Trocar dados “de referência” (países/campanhas) de mocks → API (mantendo fallback local quando DB não estiver disponível).
- [x] Fechar no frontend o fluxo operacional mínimo: criar campanha → gerar por país → marcar como publicada → listar geradas.
- [x] Criar endpoints de leitura/aggregate para Financeiro/ROI com base em `campaign_metrics` (mesmo que com provider `stub`).

### Fase 6 — Meta Ads real + Automação (quando Fase 5 estabilizar)

- [x] Definir estratégia de autenticação/token (escopo por usuário, expiração/refresh) e registrar decisão.
- [x] Substituir gradualmente `stub` por sync real da Meta (mantendo `stub` para dev).
  - [x] `POST /api/meta/validate` para validar token (Graph `/me`)
  - [x] `GET /api/meta/status` para diagnóstico (provider + token presente)
  - [x] Retry/backoff + paginação (`paging.next`) no fetch de insights
  - [x] Extrair `revenue_cents` quando disponível (ex: `action_values.purchase` / `omni_purchase`)
- [x] Definir 1–2 regras MVP de automação e implementar executor + logs.

### P0 — Consolidar dados reais (remover divergência mock vs API)

Última atualização: [2026-05-07 09:14]

Objetivo:
Eliminar inconsistências entre frontend mockado e backend real, fortalecendo a confiabilidade do dashboard financeiro e ROI.

#### [x] Remover mock da página Mensal (`frontend/src/pages/Mensal.jsx`)

Objetivo:
Substituir `mockMonthly` por dados reais vindos do backend.

Escopo:

* Criar endpoint:

  * `GET /api/finance/monthly?month=YYYY-MM`
* Retornar:

  * `totals`
  * `daily`
  * `bestDay`
  * `worstDay`
  * `roiSeries`
* Utilizar `campaign_metrics` como fonte principal
* Manter compatibilidade com provider `stub`
* Criar loading/error states
* Preservar layout atual

Critérios de aceite:

* Página renderiza sem `mockMonthly`
* Troca de mês funciona corretamente
* Tela possui loading/error states
* Build frontend/backend funcionando

#### [x] Remover mock da página ROI Ontem (`frontend/src/pages/RoiOntem.jsx`)

Objetivo:
Substituir `mockRoiOntem` por dados reais do backend baseados em `campaign_metrics`.

Escopo:

* Criar endpoint:

  * `GET /api/finance/roi-d1?date=YYYY-MM-DD`
* Retornar:

  * `summary`
  * `rows`
  * métricas agregadas
* Preparar integração futura com automação (`dryRun`)
* Corrigir textos hardcoded de data/hora

Critérios de aceite:

* Página renderiza sem mocks
* Data D-1 calculada dinamicamente
* Tela possui loading/error states
* Backend retorna agregações reais

### P1 — Persistência real da Nova Campanha

Última atualização: [2026-05-07 09:19]

Objetivo:
Persistir de forma real todos os dados do formulário de Nova Campanha.

#### [x] Persistir formulário completo da Nova Campanha

Escopo:

* Salvar:

  * BM
  * Ad Account
  * Pixel
  * Budget
  * Datas
  * Copy
  * Uploads
  * Configurações
* Definir modelagem:

  * novas colunas
  * ou tabelas normalizadas
* Permitir:

  * salvar draft
  * reabrir draft
  * editar draft
  * continuar geração por país

Critérios de aceite:

* Draft pode ser reaberto
* Dados permanecem persistidos
* Campos obrigatórios possuem validação
* Frontend deixa de depender de estado temporário local

### P2 — Criação real de campanhas Meta (modo seguro)

Última atualização: [2026-05-07 14:03]

Objetivo:
Substituir a simulação de criação de campanhas pela criação real via Meta Marketing API, mantendo segurança operacional durante o desenvolvimento.

#### [ ] Criar campanha real Meta via backend

Escopo:

* Criar endpoint:

  * `POST /api/meta/campaigns`

* Fluxo:

  * Backend recebe dados da campanha
  * Backend chama Meta Marketing API
  * Campanha nasce obrigatoriamente como:
    
    ```json
    {
      "status": "PAUSED"
    }
    ```

* Persistir:

  * `meta_campaign_id`
  * `meta_ad_account_id`
  * `meta_user_id`
  * `status`
  * `effective_status`
  * `objective`

* Atualizar frontend:

  * Exibir status real da campanha
  * Exibir `meta_campaign_id`
  * Exibir indicador:
    
    * REAL
    * STUB

* Permitir sincronização posterior:

  * `GET /{meta_campaign_id}`
  * sync de status
  * sync de métricas

Critérios de aceite:

* Campanha real criada na Meta
* Campanha nasce obrigatoriamente como `PAUSED`
* `meta_campaign_id` persistido no banco
* Backend consegue consultar campanha criada
* Frontend exibe dados reais
* Nenhuma campanha ativa automaticamente

Subtarefas (execução incremental):

- [x] Migração + persistência de campos `meta_*` em `generated_campaigns`.
- [x] Backend: provider/service + endpoint `POST /api/meta/campaigns` (forçando `status: PAUSED`).
- [x] Backend: endpoint de consulta `GET /api/meta/campaigns/:id` (via Graph).
- [x] Frontend: exibir indicador `STUB`/`REAL`, `meta_campaign_id` e status real (`meta_status`/`meta_effective_status`).
- [ ] Validar com token real em dev (criar + consultar + persistir + refletir no UI).




## Decision Log (Ativo)

Última atualização: [2026-05-07 14:03]

Mantém apenas decisões ainda válidas para execução atual. Histórico completo: ver `ARCHIVE.md` em `## Decision Log (histórico completo)`.

- [2026-05-06 14:15] Docker via `docker-compose.yml` (Postgres + backend + frontend) com Postgres exposto em `5433` no host.
- [2026-05-06 14:12] Banco via Postgres + migrations SQL versionadas (sem ORM) + seed idempotente.
- [2026-05-06 12:08] Backend simples (Node + Express) com `GET /healthz` e API em `/api/*`.
- [2026-05-06 17:36] Sync Meta definido como trigger manual (endpoint) persistindo métricas em `campaign_metrics` (Meta Graph quando houver token; fallback `stub` quando não houver).
- [2026-05-06 17:55] `PLANS.md` reduzido para estado atual + backlog ativo único; histórico isolado em `ARCHIVE.md` e procedimentos em `RUNBOOK.md`.
- [2026-05-06 19:22] Endpoints de Financeiro/ROI adicionados em `/api/finance/*`; provider `stub` passou a gerar `revenue` para permitir cálculo de ROI no dev.
- [2026-05-06 19:54] Estratégia de token (MVP): sem auth no frontend; token fica apenas no backend (env `META_ACCESS_TOKEN` ou `POST /api/meta/tokens`), com escopo opcional por `userId` (uuid) para multiusuário futuro. Refresh automático fora do escopo por enquanto (operar com token válido/long-lived e `expires_at` para invalidar).
- [2026-05-06 19:54] Automação MVP via executor no backend (regras em `automation_rules`, logs em `automation_logs`) acionado manualmente por endpoint.
- [2026-05-06 19:58] Integração externa Meta Graph com retry/backoff para erros transitórios (429/5xx/timeouts). `META_SYNC_PROVIDER=meta` pode forçar Graph e evitar fallback para `stub` quando não há token.
- [2026-05-06 20:00] Endpoint `POST /api/meta/validate` adicionado para validar token e retornar `me` via Meta Graph (sem expor token no frontend).
- [2026-05-06 20:04] UI de campanhas geradas permite vincular `meta_campaign_id` manualmente (além do atalho `stub-*`) para testar sync real sem alterar arquitetura.
- [2026-05-06 20:06] `docker-compose.yml` expõe `META_SYNC_PROVIDER`, `META_GRAPH_VERSION`, `META_ACCESS_TOKEN` para habilitar sync real sem mudanças de código/arquitetura.
- [2026-05-06 20:08] `.env.example` adicionado para padronizar configuração local do Meta sync via Docker Compose (sem commitar `.env` real).
- [2026-05-06 20:13] `revenue_cents` pode vir do Graph Insights via `action_values` (purchase/omni_purchase) quando disponível; mantém fallback `stub` para dev.
- [2026-05-07 13:54] Criação real de campanhas Meta Ads validada em ambiente de desenvolvimento. Durante o desenvolvimento, toda campanha criada via API deve nascer obrigatoriamente com `status: PAUSED` para evitar veiculação acidental.
- [2026-05-07 14:03] Criação real de campanhas implementada via `POST /api/meta/campaigns` + persistência em `generated_campaigns` (`meta_campaign_id`, `meta_ad_account_id`, `meta_user_id`, `meta_status`, `meta_effective_status`, `meta_objective`); UI passa a exibir `STUB`/`REAL` e status Meta.

## Blockers & Risks

Última atualização: [2026-05-07 14:03]

- Docker stack validado neste ambiente (ainda depende do daemon estar rodando). Ver evidência no `RUNBOOK.md`.
- Frontend usa backend parcialmente (países/campanhas/financeiro); ainda há telas baseadas em mocks (ex: ROI) e risco de divergência até completar a integração.
- Tokens Meta: riscos de segurança/expiração (refresh fora do escopo por enquanto; provider `stub` existe para desenvolvimento).
- Risco operacional: campanhas reais agora podem ser criadas via Meta Marketing API. Durante desenvolvimento, toda criação deve permanecer obrigatoriamente com `status: PAUSED`.
- Risco de execução: `objective` pode estar ausente (UI ainda não define `objective_key` por padrão); o endpoint exige `objective` via body quando não houver objetivo no banco.

## Progress (sessão atual)

Última atualização: [2026-05-07 14:03]

- Migração adicionada para persistir campos `meta_*` em `generated_campaigns`.
- Backend implementado para criação real de campanha (`POST /api/meta/campaigns`) com regra obrigatória `status: PAUSED` e persistência.
- Backend implementado para consulta (`GET /api/meta/campaigns/:id`).
- Frontend atualizado para exibir `STUB`/`REAL`, `meta_campaign_id` e status real da Meta.

## Surprises & Discoveries

Última atualização: [2026-05-07 14:03]

- Para criação de campanha via Marketing API, o payload inclui `special_ad_categories` (mesmo vazio) e deve sempre forçar `status=PAUSED` no backend em dev.

## Outcomes & Retrospective

Última atualização: [2026-05-07 14:03]

- O projeto deixa de ser apenas simulação para criação de campanhas: existe caminho real end-to-end via backend, mantendo segurança operacional com `PAUSED`.

## Referências (histórico e legado)

Última atualização: [2026-05-06 18:01]

Este documento foi enxugado para evitar execução errada por agentes.

Conteúdo histórico/muito detalhado foi mantido em `ARCHIVE.md`, incluindo:

- `## Data Progress`
- `## Pending Work (Pendências)`
- `## Surprises & Discoveries (log)`
- `## Decision Log (histórico completo)`
- `## Plan of Work` / `## Execução detalhada (Fase 2 — legado)` / `## Interfaces and Dependencies`

Procedimentos e comandos ficam em `RUNBOOK.md`.

Nota:

- `PLANS.backup.md` existe como snapshot legado e não deve ser usado para execução (fonte oficial é este `PLANS.md`).

## Architecture Rules

Última atualização: [2026-05-06 19:22]

### Frontend

- Não fazer fetch direto em componentes
- Toda chamada HTTP deve passar por `services/`
- Não usar mocks hardcoded em componentes
- Componentes devem ser reutilizáveis
- Evitar lógica complexa em JSX

### Backend

- Arquitetura:
  routes/
  controllers/
  services/
  repositories/
  database/

- Controllers não acessam banco diretamente
- Toda regra de negócio deve ficar em `services`
- Queries SQL devem ficar isoladas
- Nunca acessar Meta API diretamente na route

### Infra

- Toda integração externa deve possuir retry
- Toda automação deve gerar logs
- Nenhum token pode ficar no frontend
