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

Última atualização: [2026-05-06 17:55]

O que está funcional hoje:

- Frontend SPA (React + Vite) com navegação e telas implementadas: ver `frontend/src/App.jsx`.
- Backend Express com healthcheck e API REST mínima (quando há DB): ver `backend/src/server.js`.
- Banco Postgres modelado via migrations SQL + seed idempotente: ver `backend/migrations/` e `backend/src/seed.js`.
- Stack Docker definida (db + backend + frontend): ver `docker-compose.yml` e `README.md`.
- Sincronização de métricas definida como sync manual (`/api/meta/sync/*`) com provider Meta Graph e fallback `stub`: ver `backend/src/routes/meta.js`.

Nota importante:

- O frontend ainda não consome o backend (integração via `VITE_BACKEND_URL` ainda não foi conectada no código).

## Fontes de Verdade

Última atualização: [2026-05-06 17:55]

- Design (UI): `screens/desktop/*` e `screens/mobile/*`.
- Regra de negócio (legado operacional): `projeto_escopo.xlsx`.
- Estado real do stack: diretórios `frontend/`, `backend/` e `docker-compose.yml`.
- Backlog ativo: este documento (`PLANS.md`) em `## Backlog Ativo (ÚNICO)`.

## Arquitetura (Snapshot)

Última atualização: [2026-05-06 17:55]

- Frontend: React + Vite + React Router em `frontend/` (scripts `dev/build/preview`).
- Backend: Node (ESM) + Express em `backend/` (scripts `dev/migrate/seed/start`).
- Banco: Postgres (migrations SQL em `backend/migrations/`).
- Docker: `db` (host `5433`), `backend` (host `3001`), `frontend` (host `5173`).

Contratos atuais (mínimo):

- Backend health: `GET /healthz`.
- API base: `GET /api`.
- Campanhas: `POST /api/campaigns`, `POST /api/campaigns/:id/duplicate`, `POST /api/campaigns/:id/generate`.
- Generated campaigns: `POST /api/generated-campaigns/:id/mark-published`, `POST /api/generated-campaigns/:id/status`.
- Meta tokens + sync: `POST /api/meta/tokens`, `GET /api/meta/tokens`, `POST /api/meta/sync/generated-campaigns/:id`.

## Backlog Ativo (ÚNICO)

Última atualização: [2026-05-06 17:55]

Regras:

- Esta é a ÚNICA fonte oficial do backlog ativo.
- Backlog concluído e worklogs históricos devem ficar em `ARCHIVE.md`.
- Procedimentos/como rodar/testar devem ficar em `RUNBOOK.md`.
- Ao concluir um item: marcar como `[x]`, registrar decisão se necessário em `Decision Log (Ativo)` e criar commit incremental.

### Fase 5 — Integração Full Stack (próximos passos reais)

- [ ] Desbloquear execução com Docker e registrar evidência (stack sobe + smoke test). (ver `RUNBOOK.md`)
- [ ] Conectar o frontend ao backend via `VITE_BACKEND_URL` (client HTTP + primeira tela lendo dados reais).
- [ ] Trocar dados “de referência” (países/objetivos/campanhas) de mocks → API (mantendo fallback local quando DB não estiver disponível).
- [ ] Fechar no frontend o fluxo operacional mínimo: criar campanha → gerar por país → marcar como publicada → listar geradas.
- [ ] Criar endpoints de leitura/aggregate para Financeiro/ROI com base em `campaign_metrics` (mesmo que com provider `stub`).

### Fase 6 — Meta Ads real + Automação (quando Fase 5 estabilizar)

- [ ] Definir estratégia de autenticação/token (escopo por usuário, expiração/refresh) e registrar decisão.
- [ ] Substituir gradualmente `stub` por sync real da Meta (mantendo `stub` para dev).
- [ ] Definir 1–2 regras MVP de automação e implementar executor + logs.

## Decision Log (Ativo)

Última atualização: [2026-05-06 17:55]

Mantém apenas decisões ainda válidas para execução atual. Histórico completo: ver `ARCHIVE.md` em `## Decision Log (histórico completo)`.

- [2026-05-06 14:15] Docker via `docker-compose.yml` (Postgres + backend + frontend) com Postgres exposto em `5433` no host.
- [2026-05-06 14:12] Banco via Postgres + migrations SQL versionadas (sem ORM) + seed idempotente.
- [2026-05-06 12:08] Backend simples (Node + Express) com `GET /healthz` e API em `/api/*`.
- [2026-05-06 17:36] Sync Meta definido como trigger manual (endpoint) persistindo métricas em `campaign_metrics` (Meta Graph quando houver token; fallback `stub` quando não houver).
- [2026-05-06 17:55] `PLANS.md` reduzido para estado atual + backlog ativo único; histórico isolado em `ARCHIVE.md` e procedimentos em `RUNBOOK.md`.

## Blockers & Risks

Última atualização: [2026-05-06 17:55]

- Docker daemon pode estar inacessível no ambiente (bloqueio já observado). Ver `RUNBOOK.md` e registro em `ARCHIVE.md`.
- Frontend ainda não usa o backend: risco de divergência entre UI e contratos da API até a integração.
- Tokens Meta: riscos de segurança/expiração (estratégia ainda não definida; provider `stub` existe para desenvolvimento).

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
