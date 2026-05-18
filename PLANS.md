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

Última atualização: [2026-05-18 19:33]

- Manter `/meta-test` como fluxo prioritário e estável (não quebrar o lab).
- Segurança Meta: toda criação REAL permanece obrigatoriamente `PAUSED` e token nunca vai ao frontend.
- Preservar fallback `STUB` e sinalização explícita de `REAL/STUB/FALLBACK` na UI para evitar “dado falso”.
- Mudanças pequenas e verificáveis (evidência via curl/DB quando aplicável) com commit incremental + timestamps.

FOCO ATUAL:
- P8 Console operacional
- P9 Scheduler e automação leve
- P10 Analytics operacional
- P11 Templates operacionais
- P12 Workflow operacional

P4/P5:
- Continuar apenas no que for possível sem depender do App Meta em Live Mode.
- Não marcar validações REAL finais como concluídas enquanto existir o bloqueio `error_subcode=1885183`.

GOVERNANÇA CONTÍNUA:
- P6 governança deve continuar sendo aplicada durante todos os progress.

NÃO FAZER AGORA:
- redesign completo
- troca de design system
- microsserviços
- evitar refactor massivo sem necessidade operacional clara
- evitar mover arquitetura estável apenas por estética

GOVERNANÇA CONTÍNUA:
- P6 governança deve continuar sendo aplicada continuamente durante todos os progress

## Execution Rules

Última atualização: [2026-05-18 19:33]

- Sempre ler primeiro: Snapshot, Operational Priorities, Backlog Ativo, Decision Log, Architecture Rules, Blockers e Risks.
- Nunca executar backlog legado do `ARCHIVE.md` (histórico apenas).
- Prioridade de execução:
  - Primeiro: concluir qualquer item aberto de P4/P5 que não dependa do bloqueio externo da Meta.
  - Depois: executar P8 → P9 → P10 → P11 → P12.
  - P6 deve ser aplicado continuamente.
- Se um item depender do App Meta em Live Mode, registrar blocker e seguir para o próximo item executável.
- Não parar a execução apenas porque P4/P5 possuem validações REAL bloqueadas externamente.
- Sempre priorizar `/meta-test`; “Nova Campanha” é legado e deve apenas ser mantido compatível.
- Guardrails Meta: criação REAL sempre `PAUSED`; token nunca no frontend; nunca remover fallback `STUB`.
- Por item: implementar incrementalmente → validar → atualizar docs/timestamps → marcar progresso no `PLANS.md` → registrar decisão relevante → commit incremental claro.

## Backlog Ativo (ÚNICO)

Última atualização: [2026-05-18 19:41]

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
- [ ] Validar creative REAL (BLOCKED: `error_subcode=1885183` / App Meta em Dev Mode; requer Live Mode + roles) (prep: `force republish` no UI + evidência imediata do publish; validação REAL ainda pendente) (commits: 98cc5c0, 8bed865)
- [x] `/meta-test`: quando publish falhar com `error_subcode=1885183`, exibir callout de mitigação (App Live + roles) (commit: 1253b69)
- [x] Exibir preview operacional (preview texto + mídia) (commit: f8689c5)
- [x] Preparar variações futuras (duplicar creative drafts) (commits: ba2322f, 41c1d13)

### P5 — Ad REAL mínimo

- [ ] Validar criação REAL de Ad (BLOCKED: `error_subcode=1885183` / App Meta em Dev Mode; requer Live Mode + roles)
- [ ] Validar creative vinculado (BLOCKED: depende de criação REAL do Ad)
- [ ] Validar CTA (BLOCKED: depende de criação REAL do Ad)
- [ ] Validar mídia (BLOCKED: depende de criação REAL do Ad)
- [ ] Validar preview (BLOCKED: depende de criação REAL do Ad)
- [ ] Validar status PAUSED (BLOCKED: depende de criação REAL do Ad)
- [ ] Validar persistência do Ad (BLOCKED: depende de criação REAL do Ad)
- [ ] Validar leitura REAL do Graph (BLOCKED: depende de criação REAL do Ad)
- [x] `/meta-test`: checklist operacional P5 (evidência copiável em JSON) (commit: 9c0eea5)
- [x] `/meta-test`: checklist P5 evidencia dependências (Campaign/AdSet) + próximos passos (anchors) (commit: 3736f9a)
- [x] `/meta-test`: previews (Graph) para Creative/Ad (`/api/meta/*/:id/previews`, HTML/iframe) (commit: 893321b)
- [x] `/meta-test`: extrair URL do `iframe` do preview e oferecer “Abrir preview” (nova aba)
- [x] Backend: `POST /api/meta/ads` (REAL) aceita `creativeDraftId` e usa `creative_drafts.meta_creative_id` como fallback quando `creativeId` estiver ausente (commit: 8996bdd)
- [x] `/meta-test`: Etapa 3 (Ad) sugere/usa `meta_creative_id` do draft quando `creativeId` estiver vazio (commit: 10ec7d1)
- [x] `RUNBOOK.md`: atualizar exemplos P5 (Ad REAL) para `creativeId` opcional via draft (commit: ac709af)
- [x] Backend: erro acionável quando `creativeId` faltar (menciona fallback via `creativeDraftId.meta_creative_id`)
- [x] Backend: `POST /api/meta/ads` responde `creative_id_source` (`body|draft|null`) para troubleshooting do P5
- [x] `/meta-test`: exibir `creative_id_source` no resultado/log ao criar Ad (facilita troubleshooting)
- [x] `/meta-test`: evidência P5 inclui `creative_id_source` + `creativeId` efetivo (JSON copiável)

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
- [x] Remover responsabilidades excessivas
  - [x] `/meta-test`: centralizar helpers de clipboard (`copyTextToClipboard`/`copyJsonToClipboard`) e remover duplicação de `navigator.clipboard.writeText` (commit: f80e2c9)
  - [x] `/meta-test`: extrair actions de status/pages (status/validate/diagnostics + pages list/validate) para reduzir responsabilidades do `MetaPausedTest.jsx` (commit: 54ed7af)
  - [x] `/meta-test`: extrair actions de Graph refresh (Campaign/AdSet/Ad) para reduzir responsabilidades do `MetaPausedTest.jsx` (commit: 1c81c7c)
  - [x] `/meta-test`: extrair seção “Graph (REAL) — atualizar status” em componente dedicado (`GraphRefreshSection`) (commit: c662d64)
- [x] Migrar partes úteis para `/meta-test`
  - Deep-link de `Campanha Detalhes` → `/meta-test?generatedCampaignId=...` + auto-select do registro no console (commits: 8ae538f, 757af11)
- [x] Isolar partes obsoletas
  - `Campanha Detalhes`: colapsar ações avançadas (legado) por padrão e manter `/meta-test` como caminho principal (commit: 21c05dc)
- [x] Melhorar compatibilidade temporária
  - Deep-link `/nova-campanha` → `/meta-test` com prefill (`name`, `pageId`, `destinationUrl`) via query params (sem token no frontend). (commit: dc152a3)
- [x] Criar estratégia de substituição gradual
  - Definição: `/meta-test` é o fluxo evolutivo; “Nova Campanha” fica apenas em modo manutenção/compatibilidade.
  - Regras: novas capacidades vão para `/meta-test`; correções no legado só quando bloquearem operação.
  - Caminho incremental (sem refactor massivo):
    - 1) Antes de portar algo: reproduzir no legado e capturar evidência mínima (payload esperado).
    - 2) Implementar no `/meta-test` com guardrails (REAL sempre `PAUSED`, token só no backend) + evidência copiável.
    - 3) Se necessário, manter “ponte” no legado via link/atalho para o console (evitar duplicar lógica).
    - 4) Marcar no backlog o item portado e manter checklist de paridade (por entidade: Campaign/AdSet/Ad/Creative).
    - 5) Quando houver paridade suficiente, reduzir superfície do legado (ocultar ações avançadas por padrão).
- [x] Evitar duplicação operacional
  - Legado mantém “ponte” (deep-links) para o `/meta-test` e isola ações avançadas por padrão (commits: dc152a3, 8ae538f, 757af11, 21c05dc)

## Backlog Ativo — Próxima Fase Operacional

Última atualização: [2026-05-18 19:49]
### P8 — Console operacional

- [ ] Consolidar layout operacional definitivo
- [x] Criar sidebar operacional contextual
- [ ] Melhorar leitura de status Meta
- [ ] Criar visão resumida da estrutura Campaign → AdSet → Ad
- [ ] Melhorar timeline operacional
- [x] Criar visão “últimas execuções”
- [x] Melhorar feedback visual de bloqueios Meta
- [x] Melhorar navegação entre Campaigns geradas (filtros: modo + busca)
- [x] Melhorar visualização de REAL/STUB/FALLBACK

### P9 — Scheduler e automação leve

- [ ] Criar scheduler básico
- [ ] Atualizar status Meta automaticamente
- [ ] Re-sync automático de campanhas
- [ ] Retry automático leve
- [ ] Atualizar métricas automaticamente
- [ ] Criar fila leve de execução
- [ ] Persistir histórico de sync
- [ ] Melhorar estado operacional de falhas

### P10 — Analytics operacional

- [ ] Consolidar ROI/ROAS visual
- [ ] Melhorar métricas por Campaign
- [ ] Melhorar métricas por país
- [ ] Timeline de performance
- [ ] Histórico operacional de spend
- [ ] Melhorar visualização de lucro/prejuízo
- [ ] Criar resumo operacional diário

### P11 — Templates operacionais

- [ ] Salvar estrutura base de campanhas
- [ ] Duplicar campanhas rapidamente
- [ ] Templates de países
- [ ] Templates de creatives
- [ ] Templates de copy
- [ ] Templates operacionais completos

### P12 — Workflow operacional

- [ ] Criar estados operacionais
- [ ] Draft → Validado → Publicado
- [ ] Histórico de publicação
- [ ] Melhorar fluxo progressivo
- [ ] Criar checkpoints operacionais
- [ ] Melhorar recovery operacional


Histórico/itens concluídos:
- Ver `ARCHIVE.md` em `## Backlog (concluído) — snapshots de execução` e `## Integração Meta — histórico consolidado`.


## Decision Log (Ativo)

Última atualização: [2026-05-18 17:26]

Mantém apenas decisões ainda válidas para execução atual. Histórico completo: ver `ARCHIVE.md` em `## Decision Log (histórico completo)`.

- `/meta-test` é o fluxo operacional principal.
- “Nova Campanha” é legado/compatibilidade.
- Toda criação REAL deve permanecer `PAUSED`.
- Token Meta nunca deve ir para o frontend.
- Fallback `STUB` deve ser preservado.
- P4/P5 REAL dependem do desbloqueio do App Meta em Live Mode.
- Próxima evolução operacional: P8 → P9 → P10 → P11 → P12.

## Blockers

Última atualização: [2026-05-18 14:46]

- Execução com DB/stack depende do daemon do Docker estar rodando (`docker compose up -d`). Ver `RUNBOOK.md`.
- P4/P5 (Creative/Ad REAL) bloqueados ao publicar Creative REAL: Meta retorna `error_subcode=1885183` (“app em modo de desenvolvimento”) no `POST /api/meta/creative-drafts/:id/publish`.
  - Evidência (ambiente atual): `POST /api/meta/validate` OK; `GET /api/meta/status` indica `has_page_id=true`; `GET /api/meta/pages?metaAdAccountId=act_*` retorna Page(s) e `GET /api/meta/pages/:id` valida leitura.
  - Mitigação (fora do código): colocar o App Meta em modo público (Live) e/ou garantir que o usuário/token esteja em roles adequados do app (admin/developer/tester) para permitir criação de AdCreative/Ad.


### Meta Dev Mode / Creative REAL / Ad REAL

Status atual:
- Campaign REAL validado
- AdSet REAL validado
- META_ACCESS_TOKEN configurado
- META_PAGE_ID configurado
- META_AD_ACCOUNT_ID configurado
- `/api/meta/status` validado
- Fluxo progressivo operacional funcionando

Bloqueio atual:
- `error_subcode=1885183`
- App Meta ainda em `Development Mode`

Impacto:
- Creative REAL parcialmente bloqueado
- Ad REAL parcialmente bloqueado
- P4/P5 REAL não podem ser concluídos com evidência final ainda

Regras:
- Não marcar P4/P5 REAL como concluídos sem evidência REAL
- Não inventar validações
- Continuar evolução operacional normalmente

Próxima ação futura:
- mover App Meta para `Live Mode`
- revisar permissões/roles
- retomar validações REAL finais

## Risks

Última atualização: [2026-05-12 19:07]

- Frontend usa backend parcialmente (países/campanhas/financeiro); ainda há telas baseadas em mocks (ex: ROI) e risco de divergência até completar a integração.
- Tokens Meta: riscos de segurança/expiração (refresh fora do escopo por enquanto; provider `stub` existe para desenvolvimento).
- Risco operacional: campanhas reais agora podem ser criadas via Meta Marketing API; durante desenvolvimento, toda criação deve permanecer obrigatoriamente com `status: PAUSED`.
- Risco de execução: `objective` pode estar ausente (UI ainda não define `objective_key` por padrão); o endpoint exige `objective` via body quando não houver objetivo no banco.
- O formulário atual "Nova Campanha" concentra responsabilidades de Campaign/AdSet/Ad em um único fluxo, aumentando complexidade operacional e de manutenção.
- Creative REAL: criação de AdCreative e upload de imagem para a Meta exigem parâmetros externos (ex: `page_id`, `instagram_actor_id`, requisitos de mídia) ainda não definidos no lab.

## Technical Debt

Última atualização: [2026-05-18 14:46]

- `/meta-test`: centralizar parsing de erro (`error.details` vs `body`) em helper (`extractErrorDetails`) para reduzir duplicação e risco de drift.
- `/meta-test`: `extractErrorDetails` agora tem fallback acionável quando não houver `body` (inclui `status/message/name`) para reduzir “erro vazio” no troubleshooting. (commit: bfeb654)
- `/meta-test`: banner de erro global agora prioriza `error_user_msg`/`error_user_title` (Meta Graph) quando disponível, reduzindo “Invalid parameter” genérico.
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
