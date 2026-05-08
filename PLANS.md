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

Última atualização: [2026-05-07 22:44]

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
  - criação de AdSet/Ad (REAL/STUB, sempre `PAUSED`) + persistência em `generated_campaigns`
  - batch por país (Campaign independente por país)
  - diagnóstico de token (`/api/meta/status` + `/api/meta/validate`)
  - evidência de persistência local (`generated_campaigns`)
  - logs operacionais básicos (frontend-only, sem token)
  - visualização explícita de estrutura Meta (Campaign → AdSet → Ad)
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
  - Regras operacionais (PAUSED + token): ver `RUNBOOK.md` em `## PLAYBOOKS ATUAIS`.
  - Implementação: service/provider em `backend/src/meta/*` (routes não acessam Meta diretamente).

Contratos atuais (mínimo):

- Backend health: `GET /healthz`.
- API base: `GET /api`.
- Campanhas: `POST /api/campaigns`, `POST /api/campaigns/:id/duplicate`, `POST /api/campaigns/:id/generate`.
- Generated campaigns: `POST /api/generated-campaigns/:id/mark-published`, `POST /api/generated-campaigns/:id/status`.
- Meta tokens + sync: `POST /api/meta/tokens`, `GET /api/meta/tokens`, `POST /api/meta/sync/generated-campaigns/:id`.

## Governança Operacional

Última atualização: [2026-05-08 08:48]

Regras explícitas (IA-safe):

- `/meta-test` = laboratório operacional atual e caminho de evolução futura da integração Meta (Campaign → AdSet → Ad).
- “Nova Campanha” = fluxo legado parcial (manutenção/compatibilidade; evitar novas features estruturais).

Fontes únicas (para reduzir drift):

- Timestamps e governança documental: este `PLANS.md` (ver `## Regras de Atualização (OBRIGATÓRIO)`).
- Backlog ativo: este `PLANS.md` (ver `## Backlog Ativo (ÚNICO)`).
- Regras operacionais Meta (PAUSED obrigatório, token nunca no frontend, validações/curl/evidências): `RUNBOOK.md` em `## PLAYBOOKS ATUAIS`.
- Histórico completo (worklogs, decisões antigas, execuções concluídas): `ARCHIVE.md`.

## Operational Priorities

Última atualização: [2026-05-08 10:46]

- Manter `/meta-test` como fluxo prioritário e estável (não quebrar o lab).
- Segurança Meta: toda criação REAL permanece obrigatoriamente `PAUSED` e token nunca vai ao frontend.
- Preservar fallback `STUB` e sinalização explícita de `REAL/STUB/FALLBACK` na UI para evitar “dado falso”.
- Mudanças pequenas e verificáveis (evidência via curl/DB quando aplicável) com commit incremental + timestamps.

## Execution Rules

Última atualização: [2026-05-08 10:47]

- Sempre ler primeiro: Snapshot, Operational Priorities, Backlog Ativo, Decision Log, Architecture Rules, Blockers e Risks.
- Nunca executar backlog legado do `ARCHIVE.md` (histórico apenas).
- Prioridade de execução: P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 (P6 aplicado continuamente).
- Sempre priorizar `/meta-test`; “Nova Campanha” é legado e deve apenas ser mantido compatível.
- Guardrails Meta: criação REAL sempre `PAUSED`; token nunca no frontend; nunca remover fallback `STUB`.
- Por item: implementar incrementalmente → validar → atualizar docs/timestamps → marcar progresso no `PLANS.md` → registrar decisão relevante → commit incremental claro.

## Backlog Ativo (ÚNICO)

Última atualização: [2026-05-08 11:04]

Regras:

- Esta é a ÚNICA fonte oficial do backlog ativo.
- Backlog concluído e worklogs históricos devem ficar em `ARCHIVE.md`.
- Procedimentos/como rodar/testar devem ficar em `RUNBOOK.md`.
- Ao concluir um item: marcar como `[x]`, registrar decisão se necessário em `Decision Log (Ativo)` e criar commit incremental.

### P0 — Operação REAL mínima

- [x] Validar Campaign REAL via `/meta-test`
- [x] Validar persistência completa `meta_*`
- [x] Evidência `meta_*` persistida em STUB (Campaign/AdSet/Ad)
- [x] Evidência `meta_*` persistida em REAL (Campaign + AdSet)
- [x] Confirmar Campaign aparecendo PAUSED no Ads Manager (via Graph/listagem)
- [x] Validar leitura REAL do Graph
- [x] Validar status REAL sincronizado
- [x] Adicionar evidência visual REAL/STUB/FALLBACK
- [x] Garantir que token nunca chega no frontend
- [x] Garantir fallback seguro quando Graph falhar

### P1 — UX operacional

- [ ] Melhorar loading states
- [x] `/meta-test`: exibir `LOADING` nos indicadores (DATA/DB/META/SYNC)
- [ ] Melhorar error states
- [ ] Melhorar feedback visual de persistência
- [x] `/meta-test`: destacar registro recém-criado/atualizado em `generated_campaigns`
- [x] Exibir provider/fallback no resultado do sync (Campanha Detalhes)
- [ ] Melhorar timeline/log operacional
- [ ] Melhorar visualização da estrutura Meta
- [ ] Melhorar estados de sucesso/erro
- [ ] Melhorar navegação operacional
- [ ] Melhorar percepção REAL vs STUB
- [ ] Refinar responsividade

### P2 — Fluxo progressivo Meta

- [ ] Consolidar fluxo Campaign → AdSet → Ad
- [ ] Separar estados operacionais por entidade
- [ ] Separar services por entidade Meta
- [ ] Separar persistência por entidade
- [ ] Separar logs por entidade
- [ ] Permitir continuar fluxo incrementalmente
- [ ] Criar navegação progressiva
- [ ] Evitar formulário gigante

### P3 — Persistência operacional

- [ ] Persistir drafts operacionais
- [ ] Persistir logs operacionais
- [ ] Persistir estados REAL/STUB
- [ ] Persistir falhas operacionais
- [ ] Persistir histórico Meta
- [ ] Persistir status de execução
- [ ] Persistir estrutura Campaign/AdSet/Ad
- [ ] Criar recuperação operacional

### P4 — Creative Flow MVP

- [ ] Upload real de mídia
- [ ] Persistência de creatives
- [ ] Criar estrutura de copy
- [ ] Criar estrutura headline/description
- [ ] Associar creative ao Ad
- [ ] Validar creative REAL
- [ ] Exibir preview operacional
- [ ] Preparar variações futuras

### P5 — Ad REAL mínimo

- [ ] Validar criação REAL de Ad
- [ ] Validar creative vinculado
- [ ] Validar CTA
- [ ] Validar mídia
- [ ] Validar preview
- [ ] Validar status PAUSED
- [ ] Validar persistência do Ad
- [ ] Validar leitura REAL do Graph

### P6 — Governança operacional leve

- [x] Adicionar Operational Priorities
- [x] Adicionar Execution Rules
- [ ] Adicionar Technical Debt
- [ ] Adicionar Known Problems
- [x] Separar Blockers de Risks
- [ ] Padronizar timestamps
- [ ] Melhorar rastreabilidade
- [ ] Melhorar logs de decisão

### P7 — Refinamento do fluxo legado

- [ ] Reduzir dependência da Nova Campanha
- [ ] Remover responsabilidades excessivas
- [ ] Migrar partes úteis para `/meta-test`
- [ ] Isolar partes obsoletas
- [ ] Melhorar compatibilidade temporária
- [ ] Criar estratégia de substituição gradual
- [ ] Evitar duplicação operacional

Histórico/itens concluídos:
- Ver `ARCHIVE.md` em `## Backlog (concluído) — snapshots de execução` e `## Integração Meta — histórico consolidado`.


## Decision Log (Ativo)

Última atualização: [2026-05-08 10:47]

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
- [2026-05-07 22:27] Decisão: logs operacionais ficam inicialmente no frontend (localStorage) para acelerar auditoria e troubleshooting sem criar schema/log pipeline no backend nesta fase.
- [2026-05-07 22:44] Decisão: criação incremental de AdSet/Ad via `POST /api/meta/adsets` e `POST /api/meta/ads` (sempre `PAUSED`), persistindo `meta_adset_id/meta_ad_id` e status em `generated_campaigns`. `creativeId` é obrigatório apenas em REAL.
- [2026-05-08 10:43] Decisão: frontend não envia `accessToken` em nenhuma chamada HTTP; token permanece exclusivamente no backend (env/DB).
- [2026-05-08 10:43] Decisão: sync de métricas tolera falhas do Meta Graph com fallback `stub` quando `META_SYNC_PROVIDER` não for `meta` (retorna `fallback` no payload); para fail-fast, usar `META_SYNC_PROVIDER=meta`.
- [2026-05-08 10:46] Decisão: adicionar `Operational Priorities` no `PLANS.md` para orientar execução contínua e reduzir drift.
- [2026-05-08 10:46] Decisão: separar `Blockers` de `Risks` em seções distintas para rastreabilidade e priorização mais claras.
- [2026-05-08 10:47] Decisão: documentar `Execution Rules` no `PLANS.md` para orientar execução contínua e reduzir ambiguidades operacionais.

## Blockers

Última atualização: [2026-05-08 10:46]

- Execução com DB/stack depende do daemon do Docker estar rodando (`docker compose up -d`). Ver `RUNBOOK.md`.

## Risks

Última atualização: [2026-05-08 10:46]

- Frontend usa backend parcialmente (países/campanhas/financeiro); ainda há telas baseadas em mocks (ex: ROI) e risco de divergência até completar a integração.
- Tokens Meta: riscos de segurança/expiração (refresh fora do escopo por enquanto; provider `stub` existe para desenvolvimento).
- Risco operacional: campanhas reais agora podem ser criadas via Meta Marketing API; durante desenvolvimento, toda criação deve permanecer obrigatoriamente com `status: PAUSED`.
- Risco de execução: `objective` pode estar ausente (UI ainda não define `objective_key` por padrão); o endpoint exige `objective` via body quando não houver objetivo no banco.
- O formulário atual "Nova Campanha" concentra responsabilidades de Campaign/AdSet/Ad em um único fluxo, aumentando complexidade operacional e de manutenção.

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
