# ExecPlan — Campaign Builder (estado atual + backlog ativo)

Este ExecPlan é um documento vivo e deve ser mantido curto, executável e navegável.

Fonte operacional:

- `PLANS.md`: estado atual + backlog ativo (ÚNICA fonte de backlog)
- `RUNBOOK.md`: procedimentos, comandos, validação e troubleshooting
- `ARCHIVE.md`: histórico, worklogs e backlogs concluídos (contexto legado)

## Regras de Atualização (OBRIGATÓRIO)

Última atualização: [2026-05-09 15:09]

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

Última atualização: [2026-05-09 15:09]

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

Última atualização: [2026-05-14 20:16]

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
  - publicação de Creative REAL (AdCreative) a partir de `creative_drafts` (page_id via env/body; upload de imagem via backend quando houver asset)
  - evidência de Creative REAL via Graph (consulta do AdCreative no backend + exibição no `/meta-test`)
  - operação mais segura de Creative REAL: opção `force` no publish (evita bloqueio por `meta_creative_id` já persistido) + evidência imediata no UI (commit: 98cc5c0)
  - status do backend agora evidencia `META_PAGE_ID`/`META_INSTAGRAM_ACTOR_ID` (sem expor tokens) para reduzir erro operacional no Creative REAL (commit: 8bed865)
  - publish de Creative REAL agora faz preflight de `META_PAGE_ID` (UI/env) e explica o que está faltando (reduz erro operacional 400) (commit: d6dd5ed)
  - `/api/meta/status` e `/api/meta/validate` agora funcionam mesmo sem DB (usam apenas `META_ACCESS_TOKEN` env) para troubleshooting mais rápido quando o Postgres/Docker estiver indisponível (commit: 2eabf2d)
  - `docker-compose.yml` agora permite override de portas do host (`DB_HOST_PORT`/`BACKEND_HOST_PORT`/`FRONTEND_HOST_PORT`) para evitar conflitos locais (defaults mantidos) (commit: bb1c792)
  - `/meta-test`: botão “Listar Pages (Graph)” para obter `pageId` (Creative REAL) diretamente do backend (sem expor token)
  - endpoint `GET /api/meta/diagnostics` (backend) para evidenciar permissões do token quando Creative REAL estiver bloqueado por Page
  - `/meta-test`: botão “Diagnostics (permissões)” no status do backend para troubleshooting de token sem expor segredo
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

FOCO ATUAL:
- P1 UX operacional
- reduzir densidade visual
- separar troubleshooting
- melhorar clareza do fluxo Campaign → AdSet → Ad

EXECUTAR DEPOIS:
- P2 fluxo progressivo Meta
- P3 persistência operacional

NÃO FAZER AGORA:
- redesign completo
- troca de design system
- microsserviços
- evitar refactor massivo sem necessidade operacional clara
- evitar mover arquitetura estável apenas por estética

GOVERNANÇA CONTÍNUA:
- P6 governança deve continuar sendo aplicada continuamente durante todos os progress

## Execution Rules

Última atualização: [2026-05-08 10:47]

- Sempre ler primeiro: Snapshot, Operational Priorities, Backlog Ativo, Decision Log, Architecture Rules, Blockers e Risks.
- Nunca executar backlog legado do `ARCHIVE.md` (histórico apenas).
- Prioridade de execução: P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 (P6 aplicado continuamente).
- Sempre priorizar `/meta-test`; “Nova Campanha” é legado e deve apenas ser mantido compatível.
- Guardrails Meta: criação REAL sempre `PAUSED`; token nunca no frontend; nunca remover fallback `STUB`.
- Por item: implementar incrementalmente → validar → atualizar docs/timestamps → marcar progresso no `PLANS.md` → registrar decisão relevante → commit incremental claro.

## Backlog Ativo (ÚNICO)

Última atualização: [2026-05-17 14:02]

Regras:

- Esta é a ÚNICA fonte oficial do backlog ativo.
- Backlog concluído e worklogs históricos devem ficar em `ARCHIVE.md`.
- Procedimentos/como rodar/testar devem ficar em `RUNBOOK.md`.
- Ao concluir um item: marcar como `[x]`, registrar decisão se necessário em `Decision Log (Ativo)` e criar commit incremental (ideal: registrar hash curto no item/decisão).

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

- [x] Melhorar loading states
- [x] `/meta-test`: exibir `LOADING` nos indicadores (DATA/DB/META/SYNC)
- [x] `/meta-test`: botão “Atualizar” (países) exibe estado `Atualizando...` (commit: 06babdf)
- [x] `/meta-test`: melhorar loading/erro para status do backend + Graph get (com detalhes + dismiss)
- [x] `/meta-test`: desabilitar criação REAL de Campaign quando token está ausente no backend (evitar tentativa/erro) (commit: a3bceb2)
- [x] `/meta-test`: adicionar botão “Copiar” no card de erro global (troubleshooting mais rápido) (commit: 22da892)
- [x] Melhorar error states
- [x] `/meta-test`: exibir detalhes (`error.details`) em falhas (validate/meta/db)
- [x] `/meta-test`: permitir dismiss de errors de seção (Meta/DB/status backend)
- [x] `/meta-test`: permitir dismiss de erro em “Validar token (Graph /me)” (commit: e7459f7)
- [x] Melhorar feedback visual de persistência
- [x] `/meta-test`: destacar registro recém-criado/atualizado em `generated_campaigns`
- [x] `/meta-test`: botão “Copiar IDs” na tabela de `generated_campaigns` (commit: 8db1a26)
- [x] Exibir provider/fallback no resultado do sync (Campanha Detalhes)
- [x] Melhorar timeline/log operacional
- [x] `/meta-test`: logs exibem `error` + `details` em falhas
- [x] `/meta-test`: logs com busca + filtro por status (OK/erro) (commit: 3431926)
- [x] Melhorar visualização da estrutura Meta
- [x] `/meta-test`: estrutura Meta exibe IDs/status de AdSet/Ad quando disponíveis
- [x] Melhorar estados de sucesso/erro
- [x] `/meta-test`: garantir consistência de alertas (erro limpa sucesso; dismiss manual)
- [x] `/meta-test`: ao validar token, limpar resultado anterior antes de revalidar (commit: e5dd3f1)
- [x] Melhorar navegação operacional
- [x] `/meta-test`: adicionar atalhos (anchors) para navegação entre seções
- [x] `/meta-test`: atalhos incluem Graph/DB estrutura/logs DB (commit: c6b5eee)
- [x] `/meta-test`: batch — adicionar botão “Limpar” (países selecionados)
- [x] `/meta-test`: batch — adicionar botões “Copiar resultados”/“Copiar erros” (JSON)
- [x] `/meta-test`: troubleshooting — logs persistidos (DB) com botão “Copiar JSON”
- [x] `/meta-test`: troubleshooting — status do backend com botão “Copiar JSON”
- [x] `/meta-test`: troubleshooting — callout quando `META_PAGE_ID` está ausente + snippet copiável (.env)
- [x] `/meta-test`: troubleshooting — Etapa 3 com botões “Copiar curl” (Publish/Pages/Ad REAL)
- [x] Melhorar percepção REAL vs STUB
- [x] `/meta-test`: exibir REAL/STUB por entidade (Campaign/AdSet/Ad) na estrutura Meta
- [x] Refinar responsividade
- [x] `/meta-test`: tornar grids responsivos (auto-fit/minmax) para telas menores
- [x] `/meta-test`: exigir `destinationUrl` no draft antes de publicar Creative REAL (evitar erro operacional) (commit: 7a86ab3)
#### Estrutura visual
- [x] Adicionar seções colapsáveis (commit: e2c6603)
- [x] Reduzir densidade visual (commit: 8c6f584)
- [x] Melhorar hierarquia visual (commit: 8c6f584)
- [x] Melhorar organização vertical (commit: 8c6f584)
- [x] Melhorar spacing entre seções (commit: 8c6f584)

#### Fluxo principal
- [x] Destacar fluxo principal (commit: 2211df2)
- [x] Ocultar detalhes avançados por padrão (commit: 2211df2)
- [x] Separar operação de troubleshooting (commit: 2211df2)
- [x] `/meta-test`: Etapas 2/3 (AdSet/Ad) colapsáveis por padrão (commit: 98e32a9)

#### Troubleshooting UX
- [x] Criar modo compacto para troubleshooting (commit: d7467c4)
- [x] Transformar payloads técnicos em accordions (commit: 2bd673e)
- [x] Reduzir excesso de informações simultâneas (commit: 0d37f40)
  - [x] `/meta-test`: erro do DB (`generated_campaigns`) em accordion (commit: 578d835)
  - [x] `/meta-test`: Pages/Creative/Preview (Etapa 3) em accordions (commit: 0d37f40)

#### Separação contextual
- [x] Separar visualmente (commit: 8c6f584):
  - [x] operação
  - [x] persistência
  - [x] debug
  - [x] Graph
  - [x] `/meta-test`: “Campanhas PAUSED na Meta” colapsável e dentro do bloco Graph (commit: 75527a5)

### P2 — Fluxo progressivo Meta

- [x] Consolidar fluxo Campaign → AdSet → Ad
- [x] `/meta-test`: prefill de nomes padrão (AdSet/Ad) ao criar/selecionar Campaign (commit: a0a5494)
- [x] `/meta-test`: refresh Graph de AdSet/Ad via backend (GET `/api/meta/adsets/:id`, `/api/meta/ads/:id`) (commit: 7df3fad)
- [x] Separar estados operacionais por entidade
- [x] `/meta-test`: extrair seção de logs em componente dedicado (reduzir arquivo gigante)
- [x] `/meta-test`: extrair seção de DB (`generated_campaigns`) em componente dedicado
- [x] `/meta-test`: extrair cards de navegação/progresso/modo em componentes dedicados
- [x] `/meta-test`: extrair seção de status do backend (token/provider/validate) em componente dedicado
- [x] `/meta-test`: extrair Etapa 2 (AdSet) em componente dedicado
- [x] `/meta-test`: extrair Etapa 3 (Ad) em componente dedicado
- [x] `/meta-test`: extrair Etapa 1 (Campaign) em componente dedicado
- [x] `/meta-test`: extrair lista “Campanhas PAUSED na Meta” em componente dedicado
- [x] `/meta-test`: extrair card “Estrutura Meta (Campaign → AdSet → Ad)” em componente dedicado
- [x] `/meta-test`: separar loading de create Campaign vs Graph get (evitar `createdLoading` ambíguo)
- [x] `/meta-test`: remover `busy` global e usar flags por entidade (Campaign/AdSet/Ad)
- [x] Separar services por entidade Meta
- [x] Separar persistência por entidade (dual-write: `generated_adsets`/`generated_ads` + compat `generated_campaigns.meta_*`) (commit: 69d93fd)
- [x] Separar logs por entidade
- [x] `/meta-test`: filtro de logs por entidade (campaign/adset/ad/meta/db)
- [x] Permitir continuar fluxo incrementalmente
- [x] `/meta-test`: selecionar registro de `generated_campaigns` para continuar (Campaign → AdSet → Ad)
- [x] `/meta-test`: ao selecionar registro no DB, alinhar `RUN MODE` com o modo inferido (REAL/STUB)
- [x] Criar navegação progressiva
- [x] `/meta-test`: exibir status OK/— das etapas nos atalhos (Campaign/AdSet/Ad)
- [x] `/meta-test`: adicionar card de progresso do fluxo (Campaign/AdSet/Ad) baseado em `meta_*` persistido
- [x] `/meta-test`: botões “Ir para Etapa 2/3” (scroll) para navegação incremental
- [x] Evitar formulário gigante (commit: 20e2627)

### P3 — Persistência operacional

- [x] Persistir drafts operacionais (`localStorage` no `/meta-test`) (commit: 378296d)
- [x] Persistir logs operacionais (ops_logs + POST best-effort no `/meta-test`) (commit: 6ab378e)
- [x] `/meta-test`: exibir logs persistidos (DB) via `GET /api/ops-logs` (commit: ad17b42)
- [x] Persistir estados REAL/STUB (`generated_campaigns.meta_run_mode`) (commit: b8ac3bc)
- [x] Persistir falhas operacionais (ops_logs com `ok=false` + `error/details`) (commit: 6ab378e)
- [x] Persistir histórico Meta (ops_logs + snapshots Graph) (commit: 7489ed7)
- [x] `/meta-test`: registrar snapshots do Graph em `ops_logs` (meta.*.get) (commit: 7489ed7)
- [x] Persistir status de execução (`ops_last_*` em `generated_campaigns`) (commit: 7c329b1)
- [x] Registrar publish de Creative REAL em `ops_last_*` + `ops_logs` (backend) (commit: 4454499)
- [x] Persistir estrutura Campaign/AdSet/Ad
- [x] `/meta-test`: exibir estrutura persistida (generated_adsets/generated_ads) para registro selecionado (commit: 402f699)
- [x] Criar recuperação operacional (bundle export + seleção do DB) (commit: 86995d6)

### P4 — Creative Flow MVP

- [x] Upload real de mídia (upload local + persistência em `creative_assets`) (commits: 1101817, 649a800)
- [x] Persistência de creatives (creative_drafts) (commits: 07757eb, 6ca9629)
- [x] Criar estrutura de copy (primary_text) (commits: 07757eb, 6ca9629)
- [x] Criar estrutura headline/description (commits: 07757eb, 6ca9629)
- [x] Associar creative ao Ad (creative_draft_id em `generated_ads` + UI seleção) (commits: 1fa8d8f, 5a6e520)
- [x] Publicar Creative REAL a partir de `creative_drafts` (endpoint + UI) (commit: cac550e)
- [x] `/meta-test`: consultar Creative REAL (Graph) para evidência operacional (commit: f3e7472)
- [x] `/meta-test`: checklist P4 (Creative REAL) com evidência copiável em JSON (commit: b9154c7)
- [ ] Validar creative REAL (prep: `force republish` no UI + evidência imediata do publish; validação REAL ainda pendente) (commits: 98cc5c0, 8bed865)
- [x] Exibir preview operacional (preview texto + mídia) (commit: f8689c5)
- [x] Preparar variações futuras (duplicar creative drafts) (commits: ba2322f, 41c1d13)

### P5 — Ad REAL mínimo

- [ ] Validar criação REAL de Ad
- [ ] Validar creative vinculado
- [ ] Validar CTA
- [ ] Validar mídia
- [ ] Validar preview
- [ ] Validar status PAUSED
- [ ] Validar persistência do Ad
- [ ] Validar leitura REAL do Graph
- [x] `/meta-test`: checklist operacional P5 (evidência copiável em JSON) (commit: 9c0eea5)
- [x] `/meta-test`: checklist P5 evidencia dependências (Campaign/AdSet) + próximos passos (anchors) (commit: 3736f9a)
- [x] Backend: `POST /api/meta/ads` (REAL) aceita `creativeDraftId` e usa `creative_drafts.meta_creative_id` como fallback quando `creativeId` estiver ausente (commit: 8996bdd)
- [x] `/meta-test`: Etapa 3 (Ad) sugere/usa `meta_creative_id` do draft quando `creativeId` estiver vazio (commit: 10ec7d1)
- [x] `RUNBOOK.md`: atualizar exemplos P5 (Ad REAL) para `creativeId` opcional via draft (commit: ac709af)

### P6 — Governança operacional leve

- [x] Adicionar Operational Priorities
- [x] Adicionar Execution Rules
- [x] Adicionar Technical Debt
- [x] Adicionar Known Problems
- [x] Separar Blockers de Risks
- [x] Padronizar timestamps
- [x] Melhorar rastreabilidade
- [x] Melhorar logs de decisão

### P7 — Refinamento do fluxo legado

- [x] Reduzir dependência da Nova Campanha
  - [x] Dashboard: destacar console `/meta-test` e rotular “Nova Campanha” como legado (commit: 95ed428)
  - [x] `/nova-campanha`: aviso “Fluxo legado” + atalho para `/meta-test` (commit: 95ed428)
- [ ] Remover responsabilidades excessivas
- [ ] Migrar partes úteis para `/meta-test`
- [ ] Isolar partes obsoletas
- [ ] Melhorar compatibilidade temporária
- [ ] Criar estratégia de substituição gradual
- [ ] Evitar duplicação operacional

Histórico/itens concluídos:
- Ver `ARCHIVE.md` em `## Backlog (concluído) — snapshots de execução` e `## Integração Meta — histórico consolidado`.


## Decision Log (Ativo)

Última atualização: [2026-05-17 13:40]

Mantém apenas decisões ainda válidas para execução atual. Histórico completo: ver `ARCHIVE.md` em `## Decision Log (histórico completo)`.

- [2026-05-06 14:15] Docker via `docker-compose.yml` (Postgres + backend + frontend) com Postgres exposto em `5433` no host.
- [2026-05-06 14:12] Banco via Postgres + migrations SQL versionadas (sem ORM) + seed idempotente.
- [2026-05-06 12:08] Backend simples (Node + Express) com `GET /healthz` e API em `/api/*`.
- [2026-05-06 17:36] Sync Meta definido como trigger manual (endpoint) persistindo métricas em `campaign_metrics` (Meta Graph quando houver token; fallback `stub` quando não houver).
- [2026-05-06 17:55] `PLANS.md` reduzido para estado atual + backlog ativo único; histórico isolado em `ARCHIVE.md` e procedimentos em `RUNBOOK.md`.
- [2026-05-06 19:22] Endpoints de Financeiro/ROI adicionados em `/api/finance/*`; provider `stub` passou a gerar `revenue` para permitir cálculo de ROI no dev.
- [2026-05-06 19:54] Estratégia de token (MVP): sem auth no frontend; token fica apenas no backend (env `META_ACCESS_TOKEN` ou `POST /api/meta/tokens`), com escopo opcional por `userId` (uuid) para multiusuário futuro. Refresh automático fora do escopo por enquanto (operar com token válido/long-lived e `expires_at` para invalidar).
- [2026-05-16 14:34] Decisão: adicionar checklist P4 (Creative REAL) no `/meta-test` com evidência copiável (JSON) para acelerar validação e troubleshooting sem expor token.
- [2026-05-06 19:54] Automação MVP via executor no backend (regras em `automation_rules`, logs em `automation_logs`) acionado manualmente por endpoint.
- [2026-05-06 19:58] Integração externa Meta Graph com retry/backoff para erros transitórios (429/5xx/timeouts). `META_SYNC_PROVIDER=meta` pode forçar Graph e evitar fallback para `stub` quando não há token.
- [2026-05-06 20:00] Endpoint `POST /api/meta/validate` adicionado para validar token e retornar `me` via Meta Graph (sem expor token no frontend).
- [2026-05-06 20:04] UI de campanhas geradas permite vincular `meta_campaign_id` manualmente (além do atalho `stub-*`) para testar sync real sem alterar arquitetura.
- [2026-05-06 20:06] `docker-compose.yml` expõe `META_SYNC_PROVIDER`, `META_GRAPH_VERSION`, `META_ACCESS_TOKEN` para habilitar sync real sem mudanças de código/arquitetura.
- [2026-05-06 20:08] `.env.example` adicionado para padronizar configuração local do Meta sync via Docker Compose (sem commitar `.env` real).
- [2026-05-06 20:13] `revenue_cents` pode vir do Graph Insights via `action_values` (purchase/omni_purchase) quando disponível; mantém fallback `stub` para dev.
- [2026-05-17 11:58] Decisão: `/api/meta/pages` passa a paginar resultados (cursor `after`) e aceita `?limit=` para reduzir “falso vazio” ao descobrir `pageId` (mitiga bloqueio P4/P5 sem expor token) (commit: d54a77b).
- [2026-05-17 13:40] Decisão: `POST /api/meta/ads` (REAL) pode derivar `creativeId` a partir de `creativeDraftId.meta_creative_id` quando `creativeId` não for enviado (mantém token no backend e reduz erro operacional no P5).
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
- [2026-05-09 15:03] Decisão: `/meta-test` deve sempre limpar/exibir detalhes de erro de forma consistente (evitar `errorDetails` stale) e indicar `LOADING/UNKNOWN` no status do backend para troubleshooting operacional.
- [2026-05-09 15:05] Decisão: `/meta-test` deve oferecer navegação rápida (anchors) por ser uma tela longa e usada para troubleshooting operacional.
- [2026-05-09 15:07] Decisão: `/meta-test` deve sinalizar REAL/STUB por entidade (Campaign/AdSet/Ad) na estrutura Meta para reduzir confusão operacional.
- [2026-05-09 15:08] Decisão: `/meta-test` deve evitar estado ambíguo de alertas (erro e sucesso simultâneos); em falhas, limpar `success`.
- [2026-05-09 15:10] Decisão: separar `services/` de Meta por entidade (Campaign/AdSet/Ad/Status/Sync), mantendo `services/meta.js` como re-export para compatibilidade incremental.
- [2026-05-09 15:13] Decisão: no `/meta-test`, separar estados de loading por ação/entidade (ex: create Campaign vs Graph get) para evitar sinais operacionais ambíguos.
- [2026-05-09 15:15] Decisão: remover `busy` global do `/meta-test` e derivar “bloqueios de ação” a partir de flags específicas de criação por entidade para reduzir acoplamento e risco de regressão.
- [2026-05-09 15:26] Decisão: ao selecionar um registro em `generated_campaigns` no `/meta-test`, alinhar o `RUN MODE` com o modo inferido (`REAL` quando `meta_campaign_id` é real; `STUB` quando `stub-*`) para evitar confusão operacional.
- [2026-05-09 15:27] Decisão: `/meta-test` deve exibir evidência de progresso do fluxo (Campaign/AdSet/Ad) baseada em `meta_*` persistido, para orientar execução incremental e troubleshooting.
- [2026-05-09 15:29] Decisão: `/meta-test` deve oferecer navegação incremental explícita (scroll para Etapa 2/3) para reduzir erro operacional em telas longas.
- [2026-05-09 15:31] Decisão: logs do `/meta-test` devem ter um campo `entity` persistido (inferido da `action`) para permitir filtro por entidade sem depender apenas de prefixo string.
- [2026-05-09 15:31] Decisão: “continuar fluxo incrementalmente” no `/meta-test` significa poder retomar do DB (sem recriar Campaign) e executar Campaign → AdSet → Ad em etapas independentes.
- [2026-05-09 15:32] Decisão: “navegação progressiva” no `/meta-test` é atendida por atalhos + status de etapas + card de progresso + botões de scroll, mantendo o fluxo baseado em entidades (Campaign → AdSet → Ad).
- [2026-05-09 15:35] Decisão: refactors no `/meta-test` devem ser incrementais e orientados por seção (extrair componentes UI sem alterar comportamento) para reduzir risco e evitar regressões.
- [2026-05-09 15:47] Decisão: extrair seções grandes do `/meta-test` (DB/logs/etc) para componentes dedicados é preferível a refactors “tudo de uma vez”.
- [2026-05-09 15:49] Decisão: cards de navegação/progresso/modo do `/meta-test` devem ser componentes dedicados para manter `MetaPausedTest.jsx` enxuto e reduzir risco de regressão.
- [2026-05-09 15:51] Decisão: seção de status do backend (provider/token/validate) do `/meta-test` deve ser um componente dedicado, mantendo o handler no backend e sem expor token no frontend.
- [2026-05-09 15:54] Decisão: cada etapa do fluxo `/meta-test` (Campaign/AdSet/Ad) deve ter componente próprio para manter separação conceitual e reduzir risco de regressões.
- [2026-05-09 15:56] Decisão: extrair Etapa 3 (Ad) para componente dedicado mantém a separação Campaign/AdSet/Ad e reduz acoplamento no `MetaPausedTest.jsx`.
- [2026-05-09 15:57] Decisão: considerar “Separar estados operacionais por entidade” concluído no `/meta-test` quando existirem flags de execução por entidade + componentes dedicados (Campaign/AdSet/Ad/DB/Logs/Status), mantendo comportamento estável.
- [2026-05-09 16:00] Decisão: extrair Etapa 1 (Campaign) para componente dedicado reduz risco de regressão e mantém a UI do lab organizada por entidade.
- [2026-05-09 16:55] Decisão: extrair a lista “Campanhas PAUSED na Meta” para componente dedicado reduz acoplamento e mantém o `/meta-test` modular.
- [2026-05-09 16:57] Decisão: extrair “Estrutura Meta (Campaign → AdSet → Ad)” para componente dedicado reduz o risco de regressões em UI e mantém separação por entidade.
- [2026-05-09 15:16] Decisão: preferir `gridTemplateColumns: repeat(auto-fit, minmax(...))` no `/meta-test` para responsividade sem depender de media queries/código extra.
- [2026-05-09 15:18] Decisão: logs do `/meta-test` devem ser filtráveis por entidade (campaign/adset/ad/meta/db) para troubleshooting rápido sem backend schema/log pipeline nesta fase.
- [2026-05-09 15:20] Decisão: `/meta-test` deve permitir retomar execução a partir de `generated_campaigns` existente (seleção explícita) para suportar troubleshooting e fluxo incremental sem refazer a Campaign.
- [2026-05-09 15:21] Decisão: a navegação progressiva do `/meta-test` deve exibir evidência de conclusão por etapa (OK/—) baseada em `meta_*` persistido no DB.
- [2026-05-09 15:22] Decisão: ignorar screenshots acidentais no repo root (ex: “Captura de Tela*.png”) via `.gitignore` para reduzir ruído operacional no `git status`.
- [2026-05-09 15:23] Decisão: erros por seção do `/meta-test` devem ser descartáveis (dismiss) para reduzir ruído visual durante troubleshooting.
- [2026-05-09 15:23] Decisão: ao selecionar `generated_campaigns` no `/meta-test`, preencher contexto no formulário (nome/objetivo/ad account/país) para facilitar retomar/depurar o fluxo.
- [2026-05-11 12:30] Decisão: reduzir risco do `/meta-test` extraindo seções (Batch/Resultado) + util/hook (`metaTestUtils`, `useOpsLogs`) para diminuir o tamanho de `MetaPausedTest.jsx` sem alterar comportamento. (commit: 20e2627)
- [2026-05-11 12:38] Decisão: persistir AdSet/Ad em tabelas dedicadas (`generated_adsets`, `generated_ads`) com dual-write, mantendo compatibilidade com campos `generated_campaigns.meta_*` durante migração gradual. (commit: 69d93fd)
- [2026-05-12 18:22] Decisão: expor endpoints de leitura via backend para AdSet/Ad (`GET /api/meta/adsets/:id`, `GET /api/meta/ads/:id`) para troubleshooting no `/meta-test` sem token no frontend. (commit: 7df3fad)
- [2026-05-12 18:26] Decisão: expor endpoint de leitura da estrutura persistida por `generated_campaign_id` para evidência operacional (`GET /api/generated-campaigns/:id/structure`) e exibir no `/meta-test`. (commit: 402f699)
- [2026-05-12 18:28] Decisão: persistir logs operacionais do `/meta-test` no Postgres (`ops_logs`) via `POST /api/ops-logs`, com redaction best-effort de chaves sensíveis e tolerância a DB offline. (commit: 6ab378e)
- [2026-05-12 18:30] Decisão: adicionar visualização de logs persistidos (DB) no `/meta-test` para auditoria/trace sem depender do localStorage do navegador. (commit: ad17b42)
- [2026-05-12 18:40] Decisão: persistir estado operacional REAL/STUB no DB (`generated_campaigns.meta_run_mode`) para reduzir inferência via prefixo `stub-*` e melhorar rastreabilidade. (commit: b8ac3bc)
- [2026-05-12 18:42] Decisão: usar `ops_logs` como trilha histórica mínima para snapshots do Graph (Campaign/AdSet/Ad) no `/meta-test`, evitando schema de histórico dedicado nesta fase. (commit: 7489ed7)
- [2026-05-12 18:44] Decisão: adicionar “recovery bundle” (JSON export) no `/meta-test` para rastreabilidade e troubleshooting rápido sem depender de prints/descrições manuais. (commit: 86995d6)
- [2026-05-12 18:47] Decisão: persistir resumo de execução no `generated_campaigns` (`ops_last_action/ok/at`) para visibilidade rápida sem abrir `ops_logs`. (commit: 7c329b1)
- [2026-05-12 18:48] Decisão: drafts do `/meta-test` persistem localmente (`localStorage`) nesta fase para evitar schema/persistência de usuário no DB antes de definir auth/ownership. (commit: 378296d)
- [2026-05-12 18:54] Decisão: Creative Flow começa com upload local (backend serve `/uploads/*` + tabela `creative_assets`) para evidência operacional sem integrar storage externo nesta fase. (commits: 1101817, 649a800)
- [2026-05-12 18:59] Decisão: persistir Creative como draft local (`creative_drafts`) vinculado a `generated_campaign_id` + asset opcional, para evoluir criação REAL gradualmente sem exigir Meta creative de imediato. (commits: 07757eb, 6ca9629)
- [2026-05-12 19:02] Decisão: associar Ad ↔ Creative local por referência (`generated_ads.creative_draft_id`) para rastreabilidade e futura criação REAL baseada no draft. (commits: 1fa8d8f, 5a6e520)
- [2026-05-12 19:03] Decisão: preview operacional é local e simples (texto + mídia via `/uploads`), suficiente para troubleshooting antes de integrar preview real da Meta. (commit: f8689c5)
- [2026-05-12 19:05] Decisão: variações futuras começam com duplicação de `creative_drafts` (sem abstrações), permitindo iterar copy/mídia rapidamente no lab. (commits: ba2322f, 41c1d13)
- [2026-05-13 13:17] Decisão: publicação de Creative REAL (AdCreative) é feita via backend (`POST /api/meta/creative-drafts/:id/publish`), exigindo `destination_url` no draft; `META_PAGE_ID` é obrigatório (ou body `pageId`); `META_INSTAGRAM_ACTOR_ID` é opcional; se houver asset local, o backend faz upload para Meta (`adimages`) e usa `image_hash`. (commit: cac550e)
- [2026-05-14 20:07] Decisão: endpoints `/api/meta/status` e `/api/meta/validate` devem funcionar mesmo sem DB (modo troubleshooting via `META_ACCESS_TOKEN` env), sem expor token no frontend. (commit: 2eabf2d)
- [2026-05-14 20:07] Decisão: `docker-compose.yml` suporta override de portas do host por env (`DB_HOST_PORT`/`BACKEND_HOST_PORT`/`FRONTEND_HOST_PORT`), mantendo defaults (5433/3001/5173). (commit: bb1c792)

## Blockers

Última atualização: [2026-05-17 11:58]

- Execução com DB/stack depende do daemon do Docker estar rodando (`docker compose up -d`). Ver `RUNBOOK.md`.
- Para validar P4/P5 (Creative/Ad REAL) é necessário `META_PAGE_ID` (env) ou `pageId` no `/meta-test` + token com acesso a uma Page (no momento, nenhuma Page foi listada via Graph com o token atual).
  - Evidência (ambiente atual): `GET /api/meta/status` → `has_access_token=true` e `has_page_id=false`; `POST /api/meta/validate` OK; `GET /api/meta/pages?metaAdAccountId=act_259174718403969` → `my_pages=[]` e `promote_pages=[]`; permissões incluem `pages_show_list` (ver `GET /api/meta/diagnostics`).
  - Mitigação: `/api/meta/pages` agora tenta também `me/businesses` + `owned_pages` para descobrir `pageId` (commit: c67e164), e o `/meta-test` exibe sugestões de `pageId` quando houver (commit: a4e302e).
  - Mitigação: `/api/meta/pages` tenta também descobrir o `business` do Ad Account (`act_*`) e listar `owned_pages` desse business (commit: 204e1b3); `/meta-test` inclui isso nas sugestões (commit: ba67fc3).
  - Mitigação: endpoint read-only `GET /api/meta/pages/:id` + botão “Validar Page ID” no `/meta-test` (commits: 6ccabf6, bd1969e).
  - Mitigação: `docker-compose.yml` faz passthrough de `META_PAGE_ID`/`META_INSTAGRAM_ACTOR_ID` para o backend (commit: b1c3d72).
  - Mitigação: `/api/meta/pages` agora suporta paginação (cursor `after`) e `?limit=` para reduzir “falso vazio” em tokens com muitas páginas/businesses (commit: d54a77b).

## Risks

Última atualização: [2026-05-12 19:07]

- Frontend usa backend parcialmente (países/campanhas/financeiro); ainda há telas baseadas em mocks (ex: ROI) e risco de divergência até completar a integração.
- Tokens Meta: riscos de segurança/expiração (refresh fora do escopo por enquanto; provider `stub` existe para desenvolvimento).
- Risco operacional: campanhas reais agora podem ser criadas via Meta Marketing API; durante desenvolvimento, toda criação deve permanecer obrigatoriamente com `status: PAUSED`.
- Risco de execução: `objective` pode estar ausente (UI ainda não define `objective_key` por padrão); o endpoint exige `objective` via body quando não houver objetivo no banco.
- O formulário atual "Nova Campanha" concentra responsabilidades de Campaign/AdSet/Ad em um único fluxo, aumentando complexidade operacional e de manutenção.
- Creative REAL: criação de AdCreative e upload de imagem para a Meta exigem parâmetros externos (ex: `page_id`, `instagram_actor_id`, requisitos de mídia) ainda não definidos no lab.

## Technical Debt

Última atualização: [2026-05-15 17:07]

- Frontend: `frontend/src/pages/MetaPausedTest.jsx` foi reduzido e teve seções extraídas, mas ainda concentra handlers/payloads. Próximo passo: extrair actions por entidade (Campaign/AdSet/Ad) para reduzir risco de regressão.
- Frontend: padrão de `actions/` por entidade em `frontend/src/pages/metaTest/actions/*` (Creative/AdSet/Ad/Campaign) para reduzir complexidade incrementalmente.
- Frontend: `actions/*` reutilizam helpers centrais (`normalizeNonEmptyString`) de `frontend/src/pages/metaTest/metaTestUtils.js` para reduzir duplicação e drift.
- Frontend: ausência de um padrão compartilhado de alerts/toasts (cada tela implementa manualmente).
- Legado: fluxo “Nova Campanha” segue monolítico e tende a acumular responsabilidades; manter compatível e migrar capacidades úteis para `/meta-test` (P7).

## Known Problems

Última atualização: [2026-05-09 15:06]

- Se o Docker daemon não estiver rodando, DB/API ficam indisponíveis (UI cai em `FALLBACK` e endpoints podem falhar). Ver `RUNBOOK.md` em `### Setup rápido (Docker + DB)`.
- Meta REAL depende de token presente no backend; sem token, o lab opera apenas em `STUB` (esperado).

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
