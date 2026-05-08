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

Última atualização: [2026-05-07 22:20]

O que está funcional hoje:

- Frontend SPA (React + Vite) com navegação e telas implementadas: ver `frontend/src/App.jsx`.
- Backend Express com healthcheck e API REST mínima (quando há DB): ver `backend/src/server.js`.
- Banco Postgres modelado via migrations SQL + seed idempotente: ver `backend/migrations/` e `backend/src/seed.js`.
- Stack Docker definida (db + backend + frontend): ver `docker-compose.yml` e `README.md`.
- Sincronização de métricas definida como sync manual (`/api/meta/sync/*`) com provider Meta Graph e fallback `stub`: ver `backend/src/routes/meta.js`.
- Criação real de campanhas Meta Ads via backend (`POST /api/meta/campaigns`) implementada com persistência em `generated_campaigns` (campos `meta_*`) e regra obrigatória `status: PAUSED`.
- Criação REAL simplificada (lab) com campos mínimos via `POST /api/meta/campaigns/simple` (nome/objetivo/ad account/país), persistindo em `campaigns` + `generated_campaigns`.
- `/meta-test` agora suporta:
  - criação simples (REAL/STUB, sempre `PAUSED`)
  - batch por país (Campaign independente por país)
  - diagnóstico de token (`/api/meta/status` + `/api/meta/validate`)
  - evidência de persistência local (`generated_campaigns`)
- O fluxo operacional começou a ser separado conceitualmente entre:
  - Campaign
  - AdSet
  - Ad
- A página `/meta-test` passa a ser utilizada como laboratório operacional da integração Meta real e futura evolução do fluxo principal de criação.

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

### P0 — Integração Full Stack — Integração Full Stack (próximos passos reais)

- [x] Desbloquear execução com Docker e registrar evidência (stack sobe + smoke test). (ver `RUNBOOK.md`)
- [x] Conectar o frontend ao backend via `VITE_BACKEND_URL` (client HTTP + primeira tela lendo dados reais).
- [x] Trocar dados “de referência” (países/campanhas) de mocks → API (mantendo fallback local quando DB não estiver disponível).
- [x] Fechar no frontend o fluxo operacional mínimo: criar campanha → gerar por país → marcar como publicada → listar geradas.
- [x] Criar endpoints de leitura/aggregate para Financeiro/ROI com base em `campaign_metrics` (mesmo que com provider `stub`).

### P1 — Meta Ads real + Automação — Meta Ads real + Automação (quando Fase 5 estabilizar)

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


### P0 — Conectar criação real Meta PAUSED em página de teste

Última atualização: [2026-05-07 15:08]

Objetivo:
Habilitar, via UI, um fluxo isolado e seguro para criação REAL de campanhas na Meta via backend, garantindo que toda campanha nasça como `PAUSED`.

Regras:

- NÃO substituir o fluxo principal atual.
- Criar página isolada de teste.
- Não colocar token no frontend (token apenas no backend via env ou `/api/meta/tokens`).
- Toda criação real deve ser `PAUSED` (forçado no backend).

Backlog (execução incremental):

- [x] Criar página isolada `frontend/src/pages/MetaPausedTest.jsx`.
- [x] Criar rota isolada `/meta-test`.
- [x] Adicionar ponto de navegação em Configurações (sem mexer no fluxo principal).
- [x] Criar service no frontend para `POST /api/meta/campaigns` (sem token no frontend).
- [x] UI: loading/error/success states e refresh.
- [x] UI: listar `generated_campaigns` e permitir criar REAL (PAUSED) a partir de um `generated_campaign_id`.
- [x] UI: listar campanhas REAL persistidas (via `generated_campaigns.meta_campaign_id`) e exibir `meta_status/meta_effective_status`.
- [x] Backend: garantir `status=PAUSED` obrigatório na criação real.
- [x] Backend: enviar `is_adset_budget_sharing_enabled=false` na criação real.
- [x] Corrigir `POST /api/generated-campaigns/:id/mark-published` para não setar `ACTIVE` indevidamente (apenas vincula `meta_campaign_id`).
- [x] Backend: endpoint para listar campanhas da Meta por Ad Account (PAUSED) sem token no frontend.
- [x] UI: listar campanhas PAUSED existentes no Ads Manager via backend (não depende do banco local).
- [ ] Validar com token real via UI (evidência: campanha aparece PAUSED no Ads Manager).
- [ ] (Opcional) Adicionar botão “atualizar status” (Graph) para REAL persistidas, sem expor token.



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

### P2 — Criação real de Campaign Meta (histórico consolidado)

Última atualização: [2026-05-07 21:57]

Objetivo:
Consolidar a **primeira integração REAL** com Meta Ads (criação de Campaign via backend), mantendo segurança operacional durante o desenvolvimento.

Nota:
Esta seção é **histórico consolidado** da primeira integração real.
A evolução futura do fluxo operacional deve acontecer prioritariamente em:
`P1 — Evolução da /meta-test`.

#### [x] Criar Campaign REAL via backend (modo seguro: `PAUSED`)

Escopo:

* Endpoint:
  * `POST /api/meta/campaigns`
* Regras:
  * Toda Campaign criada deve nascer obrigatoriamente como:
    ```json
    { "status": "PAUSED" }
    ```
  * Token nunca vai ao frontend (token apenas no backend via env ou `/api/meta/tokens`).
* Persistência:
  * `generated_campaigns.meta_campaign_id`
  * `generated_campaigns.meta_ad_account_id`
  * `generated_campaigns.meta_user_id`
  * `generated_campaigns.meta_status`
  * `generated_campaigns.meta_effective_status`
  * `generated_campaigns.meta_objective`
* Consulta:
  * `GET /api/meta/campaigns/:id` (via Graph)

Subtarefas (execução incremental):

- [x] Migração + persistência de campos `meta_*` em `generated_campaigns`.
- [x] Backend: provider/service + endpoint `POST /api/meta/campaigns` (forçando `status: PAUSED`).
- [x] Backend: endpoint de consulta `GET /api/meta/campaigns/:id` (via Graph).
- [x] Frontend: exibir indicador `STUB`/`REAL`, `meta_campaign_id` e status real (`meta_status`/`meta_effective_status`).
- [ ] Validar com token real em dev (criar + consultar + persistir + refletir no UI).

### P1 — Evolução da `/meta-test` como fluxo operacional principal

Última atualização: [2026-05-07 22:20]

Objetivo:
Transformar a página `/meta-test` no novo fluxo simplificado e progressivo de integração Meta Ads real, reduzindo dependência do formulário gigante atual.

Regras:

- Não remover o fluxo antigo ainda.
- Não remover provider stub.
- Toda criação Meta deve permanecer `PAUSED`.
- Não depender do formulário completo da Nova Campanha.
- Evoluir incrementalmente:
  - Campaign
  - AdSet
  - Ad

Backlog:

- [x] Simplificar UI da `/meta-test` (fluxo mínimo de Campaign)
- [ ] Remover dependência de fluxos antigos (manter compatibilidade enquanto migra)
- [x] Permitir criar Campaign diretamente pela UI (campos mínimos)
- [x] Permitir gerar automaticamente Campaigns independentes por país (batch)
- [x] Exibir claramente:
  - REAL
  - STUB
  - FALLBACK
- [x] Preparar UI/serviços para criação de AdSet (sem implementar full)
- [x] Preparar UI/serviços para criação de Ad (sem implementar full)
- [ ] Adicionar criação REAL de AdSet
- [ ] Adicionar criação REAL de Ad
- [ ] Exibir estrutura Meta:
  - Campaign
  - AdSet
  - Ad
- [ ] Persistir:
  - meta_campaign_id
  - meta_adset_id
  - meta_ad_id
- [ ] Adicionar logs operacionais básicos
- [ ] Preparar futura substituição da página "Nova Campanha"


## Decision Log (Ativo)

Última atualização: [2026-05-07 22:20]

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
- [2026-05-07 14:49] `POST /api/generated-campaigns/:id/mark-published` deixa de setar `ACTIVE` automaticamente (evitar estado local indevido); passa a apenas vincular `meta_campaign_id`.
- [2026-05-07 15:08] Endpoint `GET /api/meta/ad-accounts/:id/campaigns` adicionado para listar campanhas PAUSED diretamente da Meta via backend (token nunca vai ao frontend); `/meta-test` passou a exibir esta lista.
- [2026-05-07] Decisão: validar a criação real de campanhas Meta em uma página de teste isolada antes de integrar ao fluxo principal.
  Motivo: reduzir risco, manter campanhas sempre pausadas e evitar quebrar o fluxo atual baseado em campanhas locais/simuladas.
- [2026-05-07 21:57] Decisão arquitetural: a página `/meta-test` passa a evoluir como novo fluxo simplificado de criação operacional Meta Ads, desacoplado do formulário legado "Nova Campanha". O objetivo é validar progressivamente:
  - Campaign
  - AdSet
  - Ad
  sem depender do fluxo completo antigo.
- [2026-05-07 22:05] Decisão: para iniciar o fluxo progressivo com baixo acoplamento, `/meta-test` cria Campaign via endpoint dedicado (`POST /api/meta/campaigns/simple`) com campos mínimos (nome/objetivo/ad account/país), mantendo `POST /api/meta/campaigns` (baseado em `generated_campaigns`) como compatibilidade do fluxo antigo.
- [2026-05-07 22:20] Decisão: batch por país será implementado no frontend (sequencial) chamando `POST /api/meta/campaigns/simple` por país, evitando criar endpoints batch agora (sem overengineering) e mantendo `PAUSED` obrigatório.

## Blockers & Risks

Última atualização: [2026-05-07 14:03]

- Docker stack validado neste ambiente (ainda depende do daemon estar rodando). Ver evidência no `RUNBOOK.md`.
- Frontend usa backend parcialmente (países/campanhas/financeiro); ainda há telas baseadas em mocks (ex: ROI) e risco de divergência até completar a integração.
- Tokens Meta: riscos de segurança/expiração (refresh fora do escopo por enquanto; provider `stub` existe para desenvolvimento).
- Risco operacional: campanhas reais agora podem ser criadas via Meta Marketing API. Durante desenvolvimento, toda criação deve permanecer obrigatoriamente com `status: PAUSED`.
- Risco de execução: `objective` pode estar ausente (UI ainda não define `objective_key` por padrão); o endpoint exige `objective` via body quando não houver objetivo no banco.
- Criação real de campanhas Meta deve permanecer sempre com `status: PAUSED` nesta fase para evitar veiculação ou gasto acidental.
- O formulário atual "Nova Campanha" concentra responsabilidades de:
  - Campaign
  - AdSet
  - Ad
  em um único fluxo, aumentando complexidade operacional e de manutenção.
## Progress (sessão atual)

Última atualização: [2026-05-07 22:20]

- Migração adicionada para persistir campos `meta_*` em `generated_campaigns`.
- Backend implementado para criação real de campanha (`POST /api/meta/campaigns`) com regra obrigatória `status: PAUSED` e persistência.
- Backend implementado para consulta (`GET /api/meta/campaigns/:id`).
- Frontend atualizado para exibir `STUB`/`REAL`, `meta_campaign_id` e status real da Meta.
- Página isolada adicionada para testar criação REAL via UI: `/meta-test` (sem token no frontend).
- `mark-published` corrigido para não alterar status local indevidamente.
- Backend: endpoint `POST /api/meta/campaigns/simple` adicionado para criação REAL/`STUB` com campos mínimos (modo seguro `PAUSED`) + persistência local.
- Frontend: `/meta-test` simplificado para fluxo progressivo (Campaign) e exibição explícita de REAL/STUB/FALLBACK.
- Backend: scaffolding inicial para AdSet/Ad (providers + rotas `POST /api/meta/adsets` e `POST /api/meta/ads` como placeholders).
- Frontend: `/meta-test` ganhou painel de status do backend/token (`/api/meta/status` + `/api/meta/validate`), validação de `act_...` e botão para consultar status da Campaign via Graph (`GET /api/meta/campaigns/:id`).
- Frontend: `/meta-test` ganhou base visual para AdSet/Ad (UI desabilitada + preview de payload).
- Frontend: `/meta-test` ganhou batch de criação de Campaigns por país (REAL/STUB, sempre `PAUSED`) + painel de evidência de persistência local (`generated_campaigns`).

## Surprises & Discoveries

Última atualização: [2026-05-07 22:05]

- Para criação de campanha via Marketing API, o payload inclui `special_ad_categories` (mesmo vazio) e deve sempre forçar `status=PAUSED` no backend em dev.
- O “país” não existe como entidade nativa na Campaign da Meta: no produto, ele é parte do **modelo operacional** (mapeado em `generated_campaigns.country_code`) e será aplicado de forma real no nível de AdSet (targeting) na evolução futura.

## Outcomes & Retrospective

Última atualização: [2026-05-07 22:20]

- O projeto deixa de ser apenas simulação para criação de campanhas: existe caminho real end-to-end via backend, mantendo segurança operacional com `PAUSED`.
- Direção arquitetural consolidada: abandonar evolução como “formulário gigante” e migrar para fluxo progressivo baseado em entidades Meta reais, com `/meta-test` como laboratório principal.
- A `/meta-test` agora expõe “modo operacional” de forma explícita (RUN MODE / DATA / META READY) e prepara incrementalmente o caminho para AdSet/Ad sem quebrar o fluxo antigo.
- A `/meta-test` já executa batch de Campaigns independentes por país e mostra evidência de persistência local (DB) para validar `meta_campaign_id` e status Meta.

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


## Meta Domain Model

Última atualização: [2026-05-07 21:57]

Campaign (Meta)
- objetivo (`objective`)
- status (`status` / `effective_status`)
- categorias especiais (`special_ad_categories`)
- existe dentro de uma Ad Account (`act_<id>`)

AdSet (Meta)
- orçamento (`daily_budget`/`lifetime_budget`) + calendário
- otimização (`optimization_goal`) + cobrança (`billing_event`)
- targeting (país/idioma/interesses/posicionamentos)
- pertence a 1 Campaign

Ad (Meta)
- criativo (`creative`) + textos (primary text/headline/description)
- mídia (imagem/vídeo) + CTA
- pertence a 1 AdSet

Fluxo Meta:

Campaign
→ AdSet
→ Ad

## Modos Operacionais

Última atualização: [2026-05-07 21:57]

REAL
- backend chama Meta Graph/Marketing API (token válido)
- IDs reais persistidos (`meta_*`)
- sync real quando aplicável

STUB
- provider local (não depende de token)
- usado para desenvolvimento/offline (simula respostas e gera métricas)

FALLBACK
- usado quando API/DB indisponível no frontend
- deve sempre ser explicitamente exibido na UI (para evitar “dado falso”)

## Architecture Rules

Última atualização: [2026-05-06 19:22]

- A evolução futura da integração Meta deve respeitar separação conceitual entre:
  - Campaign
  - AdSet
  - Ad

- Não concentrar toda lógica Meta em um único formulário ou service gigante.

- A UI operacional deve evoluir de:
  - formulário gigante
  para:
  - fluxo progressivo baseado em entidades Meta:
    - Campaign
    - AdSet
    - Ad

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
