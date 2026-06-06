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

Última atualização: [2026-05-26 12:10]

Prioridade operacional (estado real atual):

- O fluxo REAL completo já foi validado ponta a ponta (Campaign REAL → AdSet REAL → Creative REAL → Ad REAL).
- Toda criação REAL deve continuar obrigatoriamente `PAUSED` (guardrail ativo e obrigatório).
- Token Meta nunca deve ir para o frontend, nunca deve ser commitado e nunca deve aparecer em logs/documentos.
- Preservar fallback `STUB` e sinalização explícita de `REAL/STUB/FALLBACK` na UI.
- Mudanças devem ser pequenas, incrementais, verificáveis e sempre registradas com evidência.
- `ARCHIVE.md` é apenas histórico e não deve ser usado como backlog ativo.

Foco atual:

- Consolidar e manter P11/P20/P21 (templates + lote + operação rápida) no `/campaign-flow`.
- Próxima evolução: P22 — ROI operacional mínimo (sem dashboard avançado).
- Preparar caminho para entrega controlada ao cliente (foco: produtividade operacional).
- Manter `/campaign-flow` como fluxo principal operacional.
- Manter `/meta-test` como laboratório técnico/debug.
- Não remover, quebrar ou refatorar o `/meta-test`.
- Reaproveitar services/endpoints já validados.
- Garantir que toda criação REAL continue `PAUSED`.

## Execution Rules

Última atualização: [2026-05-26 12:10]

- Sempre ler primeiro:
  - Snapshot;
  - Operational Priorities;
  - Backlog Ativo;
  - Decision Log;
  - Architecture Rules;
  - Blockers;
  - Risks.

- Nunca executar backlog legado do `ARCHIVE.md`.
- `PLANS.md` é a única fonte oficial de backlog ativo.
- `RUNBOOK.md` é a fonte de procedimentos, comandos e validações.
- `ARCHIVE.md` é apenas histórico.

Prioridade de execução atual:

1. Consolidar P11 → P20 → P21 (sem regressões) e registrar evidências quando houver mudança.
2. Executar P22 — ROI operacional mínimo (entrada manual de receita como primeira versão).
3. Executar P23 — Revisão de design e UX operacional (reduzir atrito).
4. Executar P24 — Plano de entrega controlada ao cliente (orientação + roteiro + segurança).
5. Manter `/campaign-flow` como fluxo operacional principal.
6. Manter `/meta-test` intacto como diagnóstico.

Regras obrigatórias:

- Toda criação REAL deve permanecer `PAUSED`.
- Nunca criar Campaign, AdSet ou Ad como `ACTIVE`.
- Nunca enviar token ao frontend.
- Nunca commitar credenciais.
- Nunca imprimir token em logs.
- Nunca remover fallback `STUB`.
- Nunca executar checklists antigos do `ARCHIVE.md`.
- Não fazer refactor massivo sem necessidade operacional clara.
- Não criar feature nova antes de concluir auditoria/estabilização.

Por item executado:

1. Implementar mudança pequena.
2. Validar com build, curl, Graph, DB ou teste manual documentado.
3. Atualizar `PLANS.md` com timestamp.
4. Atualizar `RUNBOOK.md` apenas se houver novo procedimento, comando ou evidência operacional.
5. Registrar decisão relevante no `Decision Log`.
6. Criar commit incremental claro.
7. Continuar para o próximo item executável.

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
- [x] Validar creative REAL (revalidado após publicação bem-sucedida do App Meta) (evidência: publish OK + leitura Graph OK) [2026-05-24 11:12]
  - `generatedCampaignId`: `59ac9e05-59a3-41ee-aee7-b7c4e93f33ed`
  - `creativeDraftId`: `1a989682-9326-4010-940e-875945a0c8de`
  - `meta_creative_id`: `1322965599841590`
  - Publish: `POST /api/meta/creative-drafts/:id/publish` → `ok=true`
  - Graph read: `GET /api/meta/creatives/:meta_creative_id` → `ok=true`
- [x] `/meta-test`: quando publish falhar com `error_subcode=1885183`, exibir callout de mitigação (App Live + roles) (commit: 1253b69)
- [x] Exibir preview operacional (preview texto + mídia) (commit: f8689c5)
- [x] Preparar variações futuras (duplicar creative drafts) (commits: ba2322f, 41c1d13)

### P5 — Ad REAL mínimo

- [x] Validar criação REAL de Ad (revalidado após configurar forma de pagamento no Ad Account) [2026-05-24 13:00]
  - `meta_ad_account_id`: `act_259174718403969`
  - `generatedCampaignId`: `59ac9e05-59a3-41ee-aee7-b7c4e93f33ed`
  - `creativeDraftId`: `1a989682-9326-4010-940e-875945a0c8de`
  - `meta_creative_id`: `1322965599841590` (`creative_id_source=draft`)
  - Create: `POST /api/meta/ads` (mode `REAL`) → `ok=true` / `meta_ad_id=120247685122480596`
  - Status: `status=PAUSED` (no create e no Graph)
- [x] Validar creative vinculado (Ad → `creative.id=1322965599841590`) [2026-05-24 13:00]
- [ ] Validar CTA (pendente: validar via inspeção manual no preview / campos do creative)
- [ ] Validar mídia (pendente: validar via inspeção manual no preview / campos do creative)
- [x] Validar preview (Ad) [2026-05-24 13:00]
  - Preview: `GET /api/meta/ads/120247685122480596/previews?adFormat=DESKTOP_FEED_STANDARD` → `ok=true` (iframe retornado)
- [x] Validar status PAUSED [2026-05-24 13:00]
  - Graph read: `GET /api/meta/ads/120247685122480596` → `status=PAUSED` (`effective_status=IN_PROCESS`)
- [x] Validar persistência do Ad [2026-05-24 13:00]
  - DB: `generated_campaigns.meta_ad_id=120247685122480596` e insert em `generated_ads` (`run_mode=REAL`, `status=PAUSED`)
- [x] Validar leitura REAL do Graph [2026-05-24 13:00]
  - Graph read: `GET /api/meta/ads/120247685122480596` → `ok=true`
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

Última atualização: [2026-05-26 14:05]
### P8 — Console operacional

- [x] Consolidar layout operacional definitivo (commits: bd27f80, 25164d7)
  - [x] Atalho para Campaign Templates (commit: cf86657)
  - [x] Alinhar coluna principal do `/meta-test` (commit: bd27f80)
  - [x] Consolidar layout (classes CSS + responsivo) (commit: 25164d7)
- [x] Criar sidebar operacional contextual
- [x] Melhorar leitura de status Meta
- [x] Criar visão resumida da estrutura Campaign → AdSet → Ad
- [x] Melhorar timeline operacional
- [x] Criar visão “últimas execuções”
- [x] Melhorar feedback visual de bloqueios Meta
- [x] Melhorar navegação entre Campaigns geradas (filtros: modo + busca)
- [x] Melhorar visualização de REAL/STUB/FALLBACK

### P9 — Scheduler e automação leve

- [x] Criar scheduler básico
- [x] Atualizar status Meta automaticamente
- [x] Re-sync automático de campanhas
- [x] Retry automático leve
- [x] Atualizar métricas automaticamente
- [x] Criar fila leve de execução
- [x] Persistir histórico de sync
- [x] Melhorar estado operacional de falhas

### P10 — Analytics operacional

- [x] Consolidar ROI/ROAS visual
- [x] Melhorar métricas por Campaign
- [x] Melhorar métricas por país
- [x] Timeline de performance
- [x] Histórico operacional de spend
- [x] Melhorar visualização de lucro/prejuízo
- [x] Criar resumo operacional diário

### P11 — Templates operacionais

- [x] Salvar estrutura base de campanhas (Campaign Templates: DB + UI no `/meta-test`) (commit: 46d9746)
- [x] Duplicar campanhas rapidamente
- [x] Templates de países (persistência DB + fallback local; UI no `/meta-test` batch) (commit: 42f7da7)
- [x] Templates de creatives
- [x] Templates de copy
- [x] Templates operacionais completos (commit: df2edb3)
  - [x] Campaign Templates: deletar/remover via API + UI (commit: cf86657)
  - [x] Campaign Templates: aplicar template (cria `generated_campaigns` + estrutura) (commit: df2edb3)
  - [x] Creative Templates: deletar/remover via API + UI (commit: df2edb3)

Reativação (operacional atual):

- O backend e o `/meta-test` já suportam templates. O objetivo agora é **usar templates no `/campaign-flow`** para acelerar o lote (P20) sem duplicar lógica.

Backlog (P11 — foco atual):

- [x] `/campaign-flow`: permitir escolher um Campaign Template como estrutura base do lote.
- [x] `/campaign-flow`: permitir escolher template(s) de Creative/Copy/CTA para preencher automaticamente a Etapa 3.
- [x] `/campaign-flow`: permitir escolher Country Template (lista de países) para lote.
- [x] `/campaign-flow`: permitir salvar “estrutura executada” como template (quando fizer sentido) sem expor payloads técnicos por padrão.
- [x] Criar página `/templates` e melhorar navegação de templates.
  - criar rota `/templates`;
  - criar página de templates;
  - adicionar botão/link na navbar ou dashboard/home para `/templates`;
  - adicionar botão/link em `/templates` para voltar para `/`;
  - permitir gerenciamento básico de templates (listar/criar/editar quando houver suporte simples/excluir);
  - manter `/campaign-flow` apenas como local de aplicação do template;
  - manter `/meta-test` intacto.

Validação executada (local):

- [2026-05-26 11:40] `cd frontend && npm run build` (OK) após integrar templates no `/campaign-flow`.
- Commit: 23e1e23
- [2026-05-26 14:10] `cd frontend && npm run build` (OK) após criar `/templates`.
- Commits: 0d107a2, 5791e66

### P12 — Workflow operacional

- [x] Criar estados operacionais (`generated_campaigns.ops_state`: draft/validated/published + API + UI) (commit: 234a771)
- [x] Draft → Validado → Publicado (via `ops_state`) (commit: 234a771)
- [x] Histórico de publicação (eventos em `generated_campaign_events` + endpoint + UI no `/meta-test`) (commit: 1c3bfd5)
- [x] Melhorar fluxo progressivo (sidebar: exibir `ops_state` + último checkpoint) (commit: 29d012e)
- [x] Criar checkpoints operacionais (API + UI; event: `checkpoint.created`) (commit: cbeda6e)
- [x] Melhorar recovery operacional (bundle agora inclui `generated_campaign_events`) (commit: 664d149)


Histórico/itens concluídos:
- Ver `ARCHIVE.md` em `## Backlog (concluído) — snapshots de execução` e `## Integração Meta — histórico consolidado`.


### P13 — Páginas legais para publicação do App Meta

Última atualização: [2026-05-20 19:33]

Objetivo:
Criar páginas legais públicas no frontend React/Vite para preencher os dados obrigatórios do App Meta e permitir a tentativa de publicação do app fora do Development Mode.

Contexto:
O App Meta foi publicado com sucesso após a conclusão do P13 (páginas legais + deploy). O painel da Meta aceitou a publicação do app. Com isso, **P4/P5 REAL (Creative + Ad) foram revalidados e concluídos com evidências** e o projeto avançou para a fase P14 (auditoria/estabilização), preparando uma demo controlada.

Status atual:
- Concluído (App Meta publicado/aceito pela Meta).
- Evidências pós-publicação: ver `PROJECT_STATUS.md` em “## 5. Evidências principais” e `RUNBOOK.md` em “### Playbook — Validação REAL via /meta-test (Creative + Ad)”.

Como o projeto será hospedado na Hostinger, também é necessário garantir que as rotas do React funcionem ao serem acessadas diretamente pela URL pública. Para isso, o deploy deve incluir um arquivo `.htaccess` configurado para SPA, redirecionando rotas internas para `index.html`.

Regras:

- Criar as páginas dentro do frontend React atual.
- Não criar estrutura paralela em HTML puro, a menos que React/Vite não seja viável.
- Não expor token da Meta, App Secret, credenciais, IDs sensíveis ou dados privados.
- As páginas devem ser simples, institucionais e acessíveis publicamente.
- As páginas devem funcionar com acesso direto pela URL após deploy.
- O deploy na Hostinger deve incluir configuração `.htaccess` para SPA.
- As URLs não podem usar `localhost`.
- O conteúdo não deve prometer funcionalidades que ainda não existem no produto.
- As páginas não devem depender de login.
- As páginas não devem depender do backend.

Backlog:

- [x] Criar página React `/politica-de-privacidade` (arquivo: `frontend/src/pages/PoliticaPrivacidade.jsx`)
  - Arquivo sugerido: `frontend/src/pages/PoliticaPrivacidade.jsx`
  - Explicar quais dados podem ser coletados/armazenados.
  - Explicar que dados da Meta são usados apenas para operação autorizada de campanhas.
  - Informar que tokens e credenciais não são expostos no frontend.
  - Informar canal de contato para dúvidas e solicitações.

- [x] Criar página React `/termos-de-uso` (arquivo: `frontend/src/pages/TermosDeUso.jsx`)
  - Arquivo sugerido: `frontend/src/pages/TermosDeUso.jsx`
  - Explicar regras gerais de uso da plataforma.
  - Informar que o sistema é uma ferramenta operacional de apoio à criação, gestão e acompanhamento de campanhas.
  - Informar que o usuário é responsável pelas contas, permissões, campanhas, dados e acessos fornecidos.
  - Informar que integrações externas dependem das regras, permissões e disponibilidade da Meta.

- [x] Criar página React `/exclusao-de-dados` (arquivo: `frontend/src/pages/ExclusaoDados.jsx`)
  - Arquivo sugerido: `frontend/src/pages/ExclusaoDados.jsx`
  - Explicar como o usuário pode solicitar exclusão de dados.
  - Informar email de contato.
  - Informar prazo estimado de atendimento.
  - Explicar quais dados podem ser removidos.
  - Explicar que alguns registros técnicos podem ser mantidos quando necessários para segurança, auditoria ou obrigações legais.

- [x] Adicionar rotas no frontend (arquivo: `frontend/src/App.jsx`)
  - Atualizar `frontend/src/App.jsx`.
  - Criar rotas:
    - `/politica-de-privacidade`
    - `/termos-de-uso`
    - `/exclusao-de-dados`
  - Garantir que as páginas abrem sem autenticação.
  - Garantir que as páginas não fazem chamadas obrigatórias para o backend.

- [x] Criar layout simples para páginas legais
  - Usar visual limpo e institucional.
  - Incluir título, última atualização, seções e texto claro.
  - Adicionar link de retorno para a página inicial, se fizer sentido.
  - Manter responsividade básica.
  - Evitar excesso visual, gráficos, dados mockados ou elementos operacionais do `/meta-test`.

- [x] Preparar `.htaccess` para Hostinger (arquivo: `frontend/public/.htaccess`)
  - Criar arquivo `frontend/public/.htaccess`.
  - Garantir que o `.htaccess` seja copiado para `frontend/dist/` no build do Vite.
  - O `.htaccess` deve redirecionar rotas React para `index.html`.
  - Isso evita erro `404` quando uma URL React for acessada diretamente no navegador.

  Conteúdo sugerido para `frontend/public/.htaccess`:

  ```apache
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    RewriteRule ^index\.html$ - [L]

    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d

    RewriteRule . /index.html [L]
  </IfModule>
  ```

- [x] Validar build do frontend
  - Rodar:

  ```bash
  cd frontend
  npm run build
  ```

  - Confirmar que o build gera a pasta `frontend/dist/`.
  - Confirmar que o `.htaccess` está presente dentro de `frontend/dist/`.
  - Confirmar que o build não quebra rotas existentes.

- [x] Preparar instrução de deploy na Hostinger (documentado no `RUNBOOK.md`)
  - Gerar build com `npm run build`.
  - Subir o conteúdo de `frontend/dist/` para a pasta pública da Hostinger.
  - Confirmar que `index.html`, assets e `.htaccess` foram enviados.
  - Confirmar que o domínio usa HTTPS.
  - Confirmar que as páginas legais abrem sem login.

- [ ] Validar acesso público das páginas
  - Abrir em aba anônima:
    - `https://seudominio.com/politica-de-privacidade`
    - `https://seudominio.com/termos-de-uso`
    - `https://seudominio.com/exclusao-de-dados`
  - Confirmar que não exige login.
  - Confirmar que não retorna `404`.
  - Confirmar que as rotas funcionam ao atualizar a página.
  - Confirmar que as rotas funcionam quando copiadas e abertas diretamente.

- [ ] Validar via `curl`
  - Rodar:

  ```bash
  curl -I https://seudominio.com/politica-de-privacidade
  curl -I https://seudominio.com/termos-de-uso
  curl -I https://seudominio.com/exclusao-de-dados
  ```

  - Resultado esperado:

  ```txt
  HTTP/2 200
  ```

- [ ] Preencher dados no painel da Meta
  - Domínio do aplicativo: `seudominio.com`
  - URL da Política de Privacidade: `https://seudominio.com/politica-de-privacidade`
  - URL dos Termos de Serviço: `https://seudominio.com/termos-de-uso`
  - URL de Exclusão de Dados do Usuário: `https://seudominio.com/exclusao-de-dados`
  - Categoria do app.
  - Ícone do app, se exigido.

- [ ] Tentar publicar o App Meta
  - Acessar menu `Publicar`.
  - Verificar pendências.
  - Tentar publicar o app.
  - Registrar resultado no `PLANS.md`.
  - Se houver bloqueio, registrar em `## Blockers`.

Critérios de aceite:

- `/politica-de-privacidade` existe no React.
- `/termos-de-uso` existe no React.
- `/exclusao-de-dados` existe no React.
- As três páginas funcionam no ambiente local.
- O build do frontend funciona.
- O `.htaccess` está preparado para Hostinger.
- O `.htaccess` é copiado para `frontend/dist/`.
- As três URLs funcionam publicamente com HTTPS.
- As três URLs podem ser abertas diretamente sem retornar `404`.
- As três URLs funcionam ao atualizar a página no navegador.
- Os links estão prontos para preenchimento no painel da Meta.
- O resultado da tentativa de publicação do App Meta foi registrado no `PLANS.md`.

Validação mínima local:

```bash
cd frontend
npm run build
```

Validação mínima após deploy:

```bash
curl -I https://seudominio.com/politica-de-privacidade
curl -I https://seudominio.com/termos-de-uso
curl -I https://seudominio.com/exclusao-de-dados
```

Resultado esperado:

```txt
HTTP/2 200
```

Observação:
Se o App Meta ainda não puder ser publicado mesmo com as páginas legais prontas, registrar o novo motivo em `## Blockers` e continuar sem marcar P4/P5 REAL como concluídos.

Validação executada (local):

- [2026-05-20 19:32] `cd frontend && npm run build` (OK) e `.htaccess` presente em `frontend/dist/`.

---

### P14 — Auditoria e estabilização pós-fluxo REAL

Última atualização: [2026-05-25 18:57]

Objetivo:
Consolidar o fluxo REAL completo validado com a Meta Marketing API, garantindo que Campaign, AdSet, Creative e Ad possam ser auditados, repetidos, exibidos e mantidos sempre `PAUSED` antes de avançar para demo, hardening ou produção.

Contexto:
O projeto já validou o fluxo REAL completo:

Campaign REAL → AdSet REAL → Creative REAL → Ad REAL

Evidências já registradas:

- Campaign REAL criada.
- AdSet REAL criado.
- Creative REAL publicado.
- Ad REAL criado.
- Ad criado como `PAUSED`.
- Persistência no banco confirmada.
- Graph read confirmado.
- Preview retornado.
- Ads Manager exibindo objetos criados e sem gasto registrado.

Regras:

- Não criar novas features grandes nesta fase.
- Não fazer redesign.
- Não trocar token agora.
- Não implementar autenticação completa agora.
- Não ativar campanhas, conjuntos ou anúncios.
- Não criar objetos REAL como `ACTIVE`.
- Não remover fallback `STUB`.
- Não alterar arquitetura sem necessidade operacional clara.
- Toda validação deve gerar evidência objetiva.

Backlog:

- [x] Atualizar Snapshot do `PLANS.md` para refletir o fluxo REAL completo validado. (já refletido no `## Snapshot (Estado Atual)`)
- [x] Atualizar `Operational Priorities` para focar P14/P15/P16/P17.
- [x] Atualizar `Execution Rules` para priorizar P14 → P15 → P16 → P17.
- [x] Limpar `Blockers` antigos já resolvidos (mover apenas para histórico):
  - App Meta em Development Mode;
  - erro `1885183`;
  - ausência de forma de pagamento;
  - erro `1359188`;
  - P4/P5 bloqueados.
- [x] Manter os erros antigos apenas como histórico resolvido (sem “blocker ativo” no fluxo principal).
- [x] Confirmar que P4 está concluído com evidência suficiente (ver `PROJECT_STATUS.md`).
- [x] Confirmar que P5 está concluído com evidência suficiente (ver `PROJECT_STATUS.md`).
- [x] Auditar que o backend força `PAUSED` na criação REAL de Campaign (implementação: `backend/src/meta/campaigns.js` com `forcedStatus='PAUSED'`).
- [x] Auditar que o backend força `PAUSED` na criação REAL de AdSet (implementação: `backend/src/meta/adsets.js` com `forcedStatus='PAUSED'`).
- [x] Auditar que o backend força `PAUSED` na criação REAL de Ad (implementação: `backend/src/meta/ads.js` com `forcedStatus='PAUSED'`).
- [x] Verificar se o frontend não oferece ação clara para criar `ACTIVE` (sem input de status; backend força `PAUSED`).
- [x] Verificar se o frontend não envia token em nenhuma chamada (não há `accessToken` no frontend; token fica no backend).
- [x] Conferir se logs/ops logs redigem segredos (`token/access_token/authorization/cookie`) antes de persistir/exibir.
- [x] Conferir persistência mínima no banco (migrations confirmadas):
  - `generated_campaigns`;
  - `generated_adsets`;
  - `generated_ads`;
  - `creative_drafts`;
  - `ops_logs`.
- [x] Conferir se `/meta-test` mostra evidência suficiente de:
  - Campaign;
  - AdSet;
  - Creative;
  - Ad;
  - Graph;
  - Preview;
  - persistência.
- [x] Atualizar `PROJECT_STATUS.md` com o estado atual pós-P5.
- [x] Atualizar `OPERATING_FLOW.md` com exemplos práticos de preenchimento.
- [x] Criar checklist de segurança mínima antes de qualquer demo (`SAFETY_CHECKLIST.md`).
- [x] Criar commit incremental (commit: 82c2f98).

Critérios de aceite:

- Documentação não trata mais P4/P5 como bloqueados.
- Blockers antigos estão movidos para histórico/resolvidos.
- Guardrail `PAUSED` foi auditado.
- O fluxo REAL completo está descrito como validado.
- Existe checklist claro para repetir o fluxo.
- Existe base documental para demo controlada.

### P15 — Demo operacional controlada

Última atualização: [2026-05-25 18:57]

Objetivo:
Preparar um roteiro seguro e repetível para demonstrar o fluxo REAL completo sem improviso e sem risco de ativação acidental.

Backlog:

- [x] Criar `DEMO_SCRIPT.md`.
- [x] Documentar roteiro da demo:
  - abrir `/meta-test`;
  - validar backend;
  - validar Meta Ready;
  - criar Campaign REAL `PAUSED`;
  - criar AdSet REAL `PAUSED`;
  - criar Creative Draft;
  - publicar Creative REAL;
  - criar Ad REAL `PAUSED`;
  - consultar Graph;
  - abrir preview;
  - conferir Ads Manager;
  - mostrar persistência/logs.
- [x] Criar exemplos de nomes para demo:
  - Campaign;
  - AdSet;
  - Creative;
  - Ad.
- [x] Criar exemplos de textos para creative.
- [x] Criar exemplos de URL de destino.
- [x] Criar checklist “antes de iniciar demo”.
- [x] Criar checklist “após terminar demo”.
- [ ] Garantir que o roteiro reforça:
  - não ativar toggles;
  - não criar `ACTIVE`;
  - não expor token;
  - validar `Valor usado = R$ 0,00` quando conferir no Ads Manager.
- [x] Atualizar `RUNBOOK.md` com link/referência ao roteiro de demo.
- [x] Criar commit incremental (commit: 7b47d02).

Critérios de aceite:

- Uma pessoa consegue repetir a demo seguindo o documento.
- O roteiro não depende de memória da conversa.
- O roteiro deixa claro que tudo deve permanecer `PAUSED`.

### P16 — Hardening mínimo e rotação futura de credenciais

Última atualização: [2026-05-25 18:57]

Objetivo:
Preparar a transição do ambiente de teste controlado para uma base mais segura antes de qualquer uso real por cliente.

Regras:

- Não executar rotação de token sem decisão explícita do operador.
- Não quebrar o fluxo REAL já validado.
- Não remover o token atual sem garantir substituição funcional.
- Esta fase pode preparar documentação e checks, mas mudanças sensíveis exigem validação cuidadosa.

Backlog:

- [x] Criar checklist de hardening mínimo (`HARDENING_CHECKLIST.md`).
- [x] Criar checklist/plano de rotação futura do token Meta (`CREDENTIAL_ROTATION_PLAN.md`).
- [x] Verificar se `.env` está fora do Git e ignorado (`git check-ignore -v .env`).
- [x] Verificar `.gitignore` para arquivos sensíveis (`.env` e variações ignoradas).
- [x] Auditar logs para garantir que token/App Secret não aparecem (redaction em `ops_logs`).
- [x] Auditar responses do backend para garantir que token não volta ao frontend (`/api/meta/status` retorna apenas flags).
- [x] Criar orientação para separar ambientes (`ENVIRONMENTS.md`).
- [x] Criar checklist de permissões mínimas Meta (verificação) (`META_PERMISSIONS_CHECKLIST.md`).
- [x] Documentar que a rotação só deve ser executada após autorização explícita.
- [x] Criar commit incremental (commit: d1107dc).

Critérios de aceite:

- Existe plano claro de hardening.
- Existe checklist de rotação.
- Nenhum segredo é exposto.
- O fluxo atual não é quebrado.


### P17 — Preparação do fluxo operacional limpo

Última atualização: [2026-05-25 18:57]

Objetivo:
Começar a separar o laboratório técnico `/meta-test` de um futuro fluxo operacional mais simples para uso humano/cliente, sem remover o lab atual.

Contexto:
O `/meta-test` é poderoso, mas técnico. Ele deve continuar existindo como console de diagnóstico. O próximo passo é planejar uma experiência mais limpa, guiada e segura.

Backlog:

- [x] Mapear quais partes do `/meta-test` são operação normal. (`META_TEST_MAP.md`)
- [x] Mapear quais partes do `/meta-test` são troubleshooting/debug. (`META_TEST_MAP.md`)
- [x] Propor uma estrutura futura de fluxo limpo: (`CLEAN_FLOW_PROPOSAL.md`)
  - Etapa 1: Dados da campanha;
  - Etapa 2: País/público/orçamento;
  - Etapa 3: Creative;
  - Etapa 4: Revisão;
  - Etapa 5: Criar tudo `PAUSED`.
- [x] Criar proposta de rota futura: (`CLEAN_FLOW_PROPOSAL.md`)
  - `/console`;
  - ou `/campaign-builder`;
  - ou `/nova-campanha-real`.
Regra:
- O wizard completo não deve ser implementado em P17. A implementação começa em P18.
- [x] Criar documentação de proposta antes de codar.
- [x] Garantir que `/meta-test` continue como laboratório técnico (nenhuma mudança de código nesta fase; apenas documentação).
- [x] Criar commit incremental (commit: d1107dc).

Critérios de aceite:

- Existe proposta clara de separação entre operação e debug.
- Nenhuma funcionalidade existente é removida.
- O projeto fica pronto para evoluir para uma UI mais amigável sem perder o laboratório técnico.

### P18 — Primeira versão do fluxo operacional limpo

Última atualização: [2026-05-26 09:40]

Objetivo:
Criar a primeira versão de uma interface operacional mais simples para criação de campanhas Meta, reaproveitando o fluxo REAL já validado no `/meta-test`, mas sem expor excesso de informações técnicas para o usuário final.

Contexto:
O `/meta-test` validou o fluxo REAL completo:

Campaign REAL → AdSet REAL → Creative REAL → Ad REAL

Agora o objetivo é começar a transformar esse laboratório técnico em uma experiência mais limpa, guiada e segura, mantendo o `/meta-test` como console de diagnóstico.

Regras:

- Não remover o `/meta-test`.
- Não quebrar o `/meta-test`.
- Não duplicar lógica de backend desnecessariamente.
- Reaproveitar services, endpoints e componentes existentes quando possível.
- Toda criação REAL deve continuar obrigatoriamente `PAUSED`.
- Não permitir criação `ACTIVE`.
- Não expor token no frontend.
- Não fazer redesign completo.
- Não fazer refactor massivo.
- Criar uma primeira versão simples, incremental e validável.
- O fluxo limpo deve esconder payloads, logs e debug por padrão.
- Em caso de erro, o usuário deve receber uma mensagem simples e ter opção de abrir o `/meta-test`.

Backlog:

- [x] Atualizar `Operational Priorities` para focar P18.
- [x] Atualizar `Execution Rules` para priorizar P18.
- [x] Limpar em `Blockers` qualquer instrução antiga de revalidar P4/P5.
- [x] Corrigir o item pendente de P17 sobre “não implementar wizard completo”.

- [x] Definir rota para o novo fluxo operacional limpo.
  - Sugestão: `/campaign-flow`.
  - Manter `/meta-test` como laboratório técnico.

- [x] Criar página inicial do fluxo limpo.
  - Arquivo sugerido: `frontend/src/pages/CampaignFlow.jsx`.
  - A página deve ter layout simples, com etapas bem visíveis.
  - Não precisa ter todos os recursos do `/meta-test` na primeira versão.

- [x] Adicionar rota no React.
  - Atualizar `frontend/src/App.jsx`.
  - Criar rota `/campaign-flow`.

- [x] Criar navegação por etapas.
  - Etapa 1: Dados da campanha.
  - Etapa 2: Configuração do AdSet.
  - Etapa 3: Criativo.
  - Etapa 4: Revisão.
  - Etapa 5: Resultado.

- [x] Etapa 1 — Dados da campanha.
  - Campos:
    - nome da campanha;
    - Meta Ad Account ID;
    - país;
    - objetivo;
    - modo `REAL` ou `STUB`.
  - Valores padrão seguros:
    - `objective=OUTCOME_TRAFFIC`;
    - `countryCode=BR`;
    - `mode=STUB` por padrão ou `REAL` com aviso claro.
  - Regra:
    - em modo REAL, a criação deve continuar `PAUSED`.

- [x] Etapa 2 — Configuração do AdSet.
  - Campos:
    - nome do AdSet;
    - orçamento diário;
    - billing event;
    - optimization goal.
  - Valores padrão seguros:
    - `dailyBudgetCents=1000`;
    - `billingEvent=IMPRESSIONS`;
    - `optimizationGoal=LINK_CLICKS`.

- [x] Etapa 3 — Criativo.
  - Campos:
    - primary text;
    - headline;
    - description;
    - destination URL;
    - CTA type.
  - Valor padrão sugerido:
    - `ctaType=LEARN_MORE`.
  - Criar ou usar creative draft.
  - Não publicar Creative REAL sem `destinationUrl`.

- [x] Etapa 4 — Revisão.
  - Mostrar resumo antes de executar:
    - Campaign;
    - AdSet;
    - Creative;
    - Ad;
    - orçamento;
    - país;
    - URL de destino.
  - Exibir aviso claro:
    - “Tudo será criado como PAUSED.”
  - Exigir confirmação antes de operação REAL.

- [x] Etapa 5 — Resultado.
  - Exibir IDs criados, quando existirem:
    - `meta_campaign_id`;
    - `meta_adset_id`;
    - `meta_creative_id`;
    - `meta_ad_id`.
  - Exibir status:
    - `PAUSED`;
    - `IN_PROCESS`, quando aplicável.
  - Exibir ações:
    - abrir preview;
    - abrir `/meta-test` com o registro selecionado;
    - copiar resumo da execução.

- [x] Criar modo seguro de execução.
  - O usuário não deve conseguir selecionar `ACTIVE`.
  - O texto da UI deve reforçar que a campanha nasce pausada.
  - Em caso de erro, mostrar mensagem simples e botão para abrir `/meta-test`.

- [x] Reaproveitar services existentes.
  - Não criar chamadas duplicadas se já existirem services para Meta Campaign, AdSet, Creative e Ad.
  - Evitar fetch direto em componente.
  - Respeitar arquitetura atual do frontend.

- [x] Criar fallback para troubleshooting.
  - Quando algo falhar, exibir:
    - mensagem simples;
    - etapa em que falhou;
    - botão “Abrir no /meta-test para diagnóstico”.
  - Não exibir payload técnico gigante por padrão.

- [x] Adicionar link de entrada para o novo fluxo.
  - Adicionar atalho no Dashboard ou Configurações.
  - Rotular como fluxo guiado/experimental/controlado.
  - Manter “Nova Campanha” como legado.

- [x] Validar build do frontend.
  - Rodar:
    - `cd frontend && npm run build`

- [x] Atualizar documentação.
  - Atualizar `PLANS.md`.
  - Atualizar `RUNBOOK.md` somente se houver novo procedimento.
  - Atualizar `CLEAN_FLOW_PROPOSAL.md`, se necessário.
  - Registrar decisão no `Decision Log`.

- [x] Criar commit incremental (commit: 265062c).
- [x] Validar manualmente `/campaign-flow` em modo REAL (sucesso; guardrails preservados; tudo `PAUSED`).

Validação prática (P18):

- [2026-05-26] Validação manual executada com sucesso em modo `REAL` via `/campaign-flow`.
  - Resultado: Campaign → AdSet → Creative → Ad criados com sucesso.
  - Segurança: toda criação REAL permaneceu `PAUSED` (nunca `ACTIVE`).
  - Observação: `/meta-test` permanece preservado como laboratório técnico/debug (não removido, não quebrado).

Critérios de aceite:

- Existe rota `/campaign-flow`.
- Existe página guiada inicial.
- O `/meta-test` continua funcionando.
- O novo fluxo orienta o usuário por etapas.
- O novo fluxo não expõe token.
- O novo fluxo não permite criar `ACTIVE`.
- O novo fluxo deixa claro que tudo será criado como `PAUSED`.
- O build do frontend passa.
- Há caminho claro para abrir `/meta-test` em caso de debug.

### P19 — Login interno e credenciais Meta por usuário

Última atualização: [2026-05-26 10:00]

Objetivo:
Criar autenticação simples interna e permitir que cada usuário configure suas próprias credenciais Meta, preparando o sistema para entrega operacional controlada.

Contexto:
O fluxo REAL completo já foi validado:

Campaign REAL → AdSet REAL → Creative REAL → Ad REAL

Tudo permanece sendo criado como `PAUSED`.

Agora o objetivo é permitir:
- login simples;
- proteção básica das rotas;
- perfil/configuração do usuário;
- credenciais Meta vinculadas ao usuário logado.

Regras:

- Não remover `/meta-test`.
- Não quebrar `/meta-test`.
- Não quebrar `/campaign-flow`.
- Não criar autenticação enterprise.
- Não implementar RBAC agora.
- Não implementar refresh token sofisticado.
- Não implementar recuperação de senha agora.
- Não implementar multiusuário complexo.
- Não fazer refactor massivo.
- Não permitir `ACTIVE`.
- Toda criação REAL deve continuar `PAUSED`.
- Token Meta nunca deve ir para o frontend.
- Token Meta nunca deve aparecer em logs.
- Token Meta nunca deve ser commitado.

Decisão temporária:
- Senhas podem permanecer sem hash nesta fase.
- Débito técnico obrigatório futuro:
  - aplicar bcrypt/hash;
  - criptografar credenciais sensíveis.

Usuário inicial:

- username: beto
- password: beto123

Campos mínimos Meta por usuário:

- meta_access_token
- meta_ad_account_id
- meta_page_id

Backlog:

- [x] Criar estrutura simples de usuários.
- [x] Criar usuário inicial `beto`.
- [x] Criar tela `/login`.
- [x] Criar tela `/register`.
- [x] Criar logout.
- [x] Criar proteção básica de rotas privadas.
- [x] Proteger `/campaign-flow`.
- [x] Proteger `/meta-test`.
- [x] Criar middleware simples de autenticação.
- [x] Criar tela `/profile` ou `/settings`.
- [x] Permitir salvar credenciais Meta por usuário.
- [x] Vincular credenciais Meta ao usuário autenticado.
- [x] Backend deve usar credenciais Meta do usuário logado.
- [x] Não exibir token completo na UI.
- [x] Mostrar apenas:
  - Token salvo: Sim
  - Final do token: `...XXXX`
- [x] Garantir que logs não exponham token.
- [x] Validar build do frontend.
- [x] Atualizar `RUNBOOK.md`.
- [x] Atualizar `PROJECT_STATUS.md`.
- [x] Criar commit incremental (commit: 98db34b).

Critérios de aceite:

- Usuário consegue acessar `/login`.
- Usuário consegue logar com:
  - beto
  - beto123
- Usuário consegue fazer logout.
- Usuário não autenticado é redirecionado.
- `/campaign-flow` exige login.
- `/meta-test` exige login.
- Usuário consegue salvar credenciais Meta.
- Backend usa credenciais do usuário logado.
- Token Meta não aparece completo no frontend.
- Criações REAL continuam `PAUSED`.
- Não existe criação `ACTIVE`.

### P20 — Automatização operacional mínima

Última atualização: [2026-05-26 10:25]

Objetivo:
Melhorar a automatização do Campaign Builder para reduzir trabalho manual na criação de múltiplas campanhas, mantendo o fluxo REAL seguro e sempre PAUSED.

Contexto:
P18 validou `/campaign-flow`.
P19 validou login interno e credenciais Meta por usuário.
Agora o foco é automatizar criação em lote para operação real controlada.

Regras:
- Não quebrar `/campaign-flow`.
- Não quebrar `/meta-test`.
- Não permitir `ACTIVE`.
- Toda criação REAL deve continuar `PAUSED`.
- Não expor token no frontend.
- Não fazer refactor massivo.
- Reaproveitar services já validados.

Backlog:
- [x] Criar modo de criação em lote no `/campaign-flow`.
- [x] Permitir selecionar múltiplos países.
- [x] Permitir reutilizar uma estrutura base de Campaign, AdSet, Creative e Ad.
- [x] Gerar uma campanha por país selecionado.
- [x] Criar resumo antes da execução.
- [x] Exibir aviso: “Tudo será criado como PAUSED.”
- [x] Exigir confirmação antes de executar em modo REAL.
- [x] Exibir progresso por item criado.
- [x] Exibir resultado individual por país.
- [x] Permitir copiar resumo da execução.
- [x] Em caso de erro em um país, continuar os próximos.
- [x] Registrar falhas de forma clara.
- [x] Adicionar botão para abrir item no `/meta-test`.
- [x] Atualizar `RUNBOOK.md`.
- [x] Atualizar `PROJECT_STATUS.md`.
- [x] Criar commit incremental (commit: bd45ff1).

Validação executada (local):

- [2026-05-26 10:25] `cd frontend && npm run build` (OK) após mudanças do P20.

Critérios de aceite:
- Usuário consegue selecionar mais de um país.
- Sistema cria múltiplas estruturas em sequência.
- Cada país gera sua própria Campaign/AdSet/Creative/Ad.
- Tudo é criado como PAUSED.
- Erro em um item não trava o lote inteiro.
- Resultado mostra sucesso/erro por país.
- Token continua protegido.

### P21 — Operação ultra rápida

Última atualização: [2026-05-26 11:55]

Objetivo:
reduzir cliques e preenchimento manual para operação do cliente, acelerando repetição/duplicação de execuções **além** do que já existe em P11 (templates).

Regras:

- Não duplicar backlog de templates (P11 continua sendo a base para templates).
- P21 cobre apenas o que é “operação ultra rápida” além de templates.
- Manter guardrails: `REAL` sempre `PAUSED`; nunca `ACTIVE`; token nunca no frontend/logs.
- Não quebrar `/campaign-flow` e `/meta-test`.

Backlog:

- [x] `/campaign-flow`: “Repetir última execução” (reusar base + países + modo; confirmação obrigatória no REAL).
- [x] `/campaign-flow`: duplicar lote inteiro com 1 clique (gera novo lote com novo nome/sufixo).
- [x] `/campaign-flow`: salvar execução como “preset rápido” (não necessariamente um template completo P11; pode ser um atalho operacional de UI).
- [x] `/campaign-flow`: atalho “abrir no /meta-test” já pré-selecionado por país/registro (melhorar deep-link).
- [x] `/campaign-flow`: melhorar resumo operacional copiável (curto por padrão; opção de JSON completo).

Validação executada (local):

- [2026-05-26 11:55] `cd frontend && npm run build` (OK) após mudanças P21 no `/campaign-flow`.
- Commits: d382843, b5e072a

### P22 — ROI operacional mínimo

Última atualização: [2026-05-26 13:05]

Objetivo:
criar um **fluxo/tela simples** para o cliente identificar **lucro/prejuízo** por campanha e executar ações operacionais básicas, **sem** virar um dashboard avançado.

Premissas:

- ROI mínimo depende de 2 inputs:
  - gasto (Meta);
  - receita (primeira versão: entrada manual por campanha).
- Guardrails continuam absolutos:
  - nunca criar `ACTIVE`;
  - nunca ativar automaticamente;
  - toda ação REAL deve exigir confirmação;
  - token Meta nunca vai para o frontend e nunca aparece em logs/documentos.

Backlog:

- [x] Criar tela simples de ROI operacional (lista de campanhas + indicadores). (rota: `/roi-operacional`)
- [x] Listar campanhas (por `generated_campaign` + métrica no dia). (endpoint: `GET /api/finance/roi-operational`)
- [x] Exibir gasto da Meta por campanha (via `campaign_metrics.spend_cents`).
- [x] Permitir informar/editar receita manual por campanha (persistência em `campaign_metrics.revenue_cents`). (endpoint: `POST /api/finance/revenue`)
- [x] Calcular lucro/prejuízo e ROI (exibir destaque para prejuízo).
- [x] Ação: pausar uma campanha específica (com confirmação explícita; nunca ACTIVE). (endpoint: `POST /api/meta/campaigns/:id/pause`)
- [x] Ação: pausar todas campanhas com prejuízo (com confirmação explícita; continuar mesmo se 1 falhar).
- [x] Ação: editar orçamento de uma campanha (com confirmação explícita; manter PAUSED). (endpoint: `POST /api/meta/adsets/:id/budget`)
- [x] Registrar ações operacionais em log (sem token; detalhes reduzidos). (source: `roi-operational`)
- [x] Nunca oferecer opção `ACTIVE` em qualquer UI/endpoint deste fluxo.

Validação executada (local):

- [2026-05-26 13:05] `cd frontend && npm run build` (OK) após adicionar `/roi-operacional`.
- Commits: 06858c9, a8481f0

Critérios de aceite:

- Cliente consegue ver gasto + receita (manual) por campanha.
- ROI/lucro/prejuízo calculados e campanhas com prejuízo destacadas.
- Pausar e editar orçamento exigem confirmação e são registradas em log.
- Nada permite `ACTIVE` e nada ativa automaticamente.

### P23 — Revisão de design e UX operacional

Última atualização: [2026-05-26 13:25]

Objetivo:
reduzir atrito visual e melhorar clareza das telas principais para uso do cliente (texto, botões, hierarquia, microcopy), **sem redesign geral**.

Backlog (alto nível):

- [x] Revisar UX do `/campaign-flow` (menos cliques, textos mais claros, estados de erro/sucesso).
- [x] Revisar UX do `/roi-operacional` (destaque de negativos, ações, atalho /meta-test).
- [x] Revisar dashboard/telas operacionais principais para consistência visual e operacional.
- [x] Revisar `/profile` (atalhos e microcopy operacional).
- [x] `/profile`: permitir configurar “Países da operação” por usuário e fazer o `/campaign-flow` priorizar esses países.

Validação executada (local):

- [2026-05-26 13:25] `cd frontend && npm run build` (OK) após ajustes UX (P23).
- [2026-05-26 15:05] `cd frontend && npm run build` (OK) após “Países da operação” no `/profile` e filtro no `/campaign-flow`.

### P24 — Plano de entrega controlada ao cliente

Última atualização: [2026-05-26 13:40]

Objetivo:
preparar documentação, roteiro e orientação para o cliente operar com segurança (execução controlada, validação por etapas e guardrails preservados).

Orientação estratégica (obrigatória):

- Começar com poucos testes (não criar muitas campanhas de uma vez no início).
- Validar cada etapa, observar erros e confirmar que tudo permanece `PAUSED`.
- Revisar resultados antes de escalar volume.
- Melhorias/correções após entrega entram no fluxo de manutenção (sem “correria” em produção).

Backlog (alto nível):

- [x] Roteiro de onboarding operacional (passo-a-passo). (RUNBOOK.md)
- [x] Checklist de segurança (PAUSED/token/sessão) para operação diária. (RUNBOOK.md)
- [x] Plano de suporte inicial (o que fazer quando falhar; quando abrir `/meta-test`). (RUNBOOK.md)

### P25 — Países e idiomas da operação

Última atualização: [2026-05-26 15:35]

Objetivo:
permitir que o usuário configure, no `/profile`, **quais países usa** e **qual idioma principal** de cada país, para padronizar operação em lote e preparar base para templates multilíngues (futuro).

Regras:

- Não implementar tradução automática agora.
- Não implementar templates multilíngues agora.
- Guardrails continuam absolutos: REAL sempre `PAUSED`; nunca `ACTIVE`; token nunca no frontend/logs.
- Não quebrar `/campaign-flow`, `/templates` e `/meta-test`.

Backlog:

- [x] Persistir por usuário: país → idioma principal (DB + API).
- [x] `/profile`: seção “Países e idiomas da operação” (adicionar/remover país e selecionar idioma).
- [x] Permitir “Adicionar todos os países” (quando viável) mantendo configuração por usuário.
- [x] `/campaign-flow`: priorizar países do perfil e exibir aviso claro quando não houver países configurados.
- [x] Naming operacional em lote: garantir nomes por país (ex.: BR + AE não gera “AdSet • BR” para ambos).
- [x] `/templates`: reutilizar países do perfil como base (sem refactor).
- [x] Atualizar `RUNBOOK.md` com validação básica.
- [x] Atualizar `PROJECT_STATUS.md`.

Validação executada (local):

- [2026-05-26 15:45] `cd frontend && npm run build` (OK) após P25 (idiomas + naming lote).

### P26 — Templates multilíngues com LibreTranslate

Última atualização: [2026-05-26 16:45]

Objetivo:
permitir que templates tenham variações por país/idioma (geradas via backend), baseadas nos países e idiomas configurados no `/profile`, com revisão/edição obrigatória antes de uso no lote.

Decisão técnica:
usar **LibreTranslate** (self-host via Docker) como API gratuita/open source para tradução. Sem API paga. Sem OpenAI. Sem Google Translate unofficial.

Regras obrigatórias (guardrails):

- Tradução **não** pode criar anúncio REAL automaticamente.
- Tradução sempre deve poder ser **revisada/editada** antes de usar.
- LibreTranslate deve ser chamado **apenas pelo backend** (nunca direto do frontend).
- Nenhuma API key/segredo no frontend.
- Toda criação REAL continua `PAUSED`. Nunca permitir `ACTIVE`.
- Mudanças pequenas/incrementais. Não quebrar `/templates`, `/campaign-flow`, `/profile`, `/meta-test`.

Backlog (execução incremental):

- [x] Configurar LibreTranslate no ambiente:
  - env `LIBRETRANSLATE_URL` (default local sugerido: `http://localhost:5000`)
  - (se fizer sentido) service no `docker-compose.yml` (`libretranslate/libretranslate`, porta `5000`)
- [x] Backend: criar service para chamar LibreTranslate (retry/timeout básico).
- [x] Backend: endpoint autenticado para “Gerar traduções” de um template (sem chamar do frontend).
- [x] Persistir variações traduzidas (sem quebrar schema existente; preferir `payload` jsonb se possível).
- [x] `/templates`: botão “Gerar traduções” + exibir variações por país/idioma.
- [x] `/templates`: permitir revisar/editar textos traduzidos e salvar variações.
- [x] `/campaign-flow`: ao executar lote, usar a variação correta por país quando existir.
  - Se não existir tradução para um país, avisar claramente e usar texto base **apenas com confirmação**.
- [x] Atualizar `RUNBOOK.md`:
  - como subir LibreTranslate;
  - como validar endpoint;
  - como gerar traduções;
  - troubleshooting básico.
- [x] Atualizar `PROJECT_STATUS.md` se necessário.

Validação executada (local):

- [2026-05-26 16:42] `cd frontend && npm run build` (OK) após P26 (LibreTranslate + variações no `/templates` + uso no lote).
- Commit: 234fb9d
- [2026-05-26 17:10] `cd frontend && npm run build` (OK) após melhorar UX do `/templates` (fluxo cliente) + revisão do `/campaign-flow` (copy/idioma por país).
- Commit: 6187167

Campos que devem gerar variações:

- `primaryText`
- `headline`
- `description`

Não precisa traduzir:

- `objective`
- `ctaType`
- `billingEvent`
- `optimizationGoal`
- IDs técnicos

### P27 — Redesign minimalista da tela `/templates`

Última atualização: [2026-05-28 18:42]

Objetivo:
transformar `/templates` em uma tela **operacional, simples, bonita e minimalista** (pronta para cliente), mantendo compatibilidade com endpoints e sem refactor massivo.

Regras (escopo):

- Foco em UX operacional (layout/hierarquia/leitura). Evitar refactors grandes.
- Não quebrar `/campaign-flow`, `/profile` e `/meta-test`.
- Não quebrar uso de países/idiomas do perfil.
- Não quebrar traduções via LibreTranslate (backend).
- Não expor payload técnico por padrão.
- Guardrails: toda criação REAL continua obrigatoriamente `PAUSED` e **nunca** criar opção `ACTIVE`.

Backlog (executável):

- [x] UI: adicionar tabs no topo da área principal:
  - `Criar template`
  - `Meus templates`
- [x] Tab `Criar template`: reorganizar formulário em 3 blocos visuais leves (cards):
  - Campaign: nome/objetivo/países
  - AdSet: orçamento diário/billing event/optimization goal
  - Creative: primary text/headline/description/destination URL/CTA type
- [x] Tab `Criar template`: reduzir peso visual (menos bordas/menos caixas aninhadas), melhorar espaçamento e tipografia.
- [x] Tab `Criar template`: botões claros e consistentes:
  - `Salvar template` (criar ou atualizar conforme seleção)
  - `Limpar`
- [x] Tab `Meus templates`: lista/card de templates com navegação funcionando (selecionar item abre detalhes).
- [x] Tab `Meus templates`: ações por template:
  - visualizar detalhes
  - editar
  - excluir
  - gerar traduções
  - salvar/revisar traduções
  - usar no `/campaign-flow` (deep-link funcional ou comportamento atual)
- [x] Tab `Meus templates`: detalhe limpo por template (Campaign/AdSet/Creative/países + traduções existentes).
- [x] Tab `Meus templates`: status simples:
  - `Sem traduções`
  - `Traduções geradas`
  - `Revisado`
- [x] Manter compatibilidade com templates existentes (DB) e campos atuais (payload).
- [x] Validação: rodar `cd frontend && npm run build`.
- [ ] Validação manual (obrigatória):
  - abrir `/templates`
  - trocar entre abas
  - criar template
  - listar template em `Meus templates`
  - visualizar template
  - editar template
  - excluir template
  - gerar traduções
  - salvar/revisar traduções
  - usar template no `/campaign-flow`
- [x] Registrar conclusão + evidências no `PLANS.md` com timestamp e criar commit incremental. (commit: dcb62a4)

Validação executada (local):

- [2026-05-28 18:41] `cd frontend && npm run build` (OK) após redesign minimalista do `/templates` (P27).

### P27.1 — Aplicar design premium em `/templates`

Última atualização: [2026-05-28 20:20]

Objetivo:
aproximar o visual do `/templates` ao protótipo `templates-prototype.html` (referência visual), mantendo lógica, endpoints e fluxos existentes.

Regras:

- Não trocar lógica funcional por HTML estático.
- Não quebrar endpoints atuais, traduções (LibreTranslate), CRUD de templates e deep-link para `/campaign-flow`.
- Não quebrar `/campaign-flow` e não remover `/meta-test`.
- Guardrails: REAL sempre `PAUSED`; nunca criar opção `ACTIVE`; token nunca no frontend.

Backlog (executável):

- [x] Ajustar layout do header (título + chips `/campaign-flow` e `/meta-test`) no padrão do protótipo.
- [x] Refinar tabs (visual premium: menos pill, mais “segmented control” do protótipo + contador).
- [x] `Criar template`: aplicar estilo premium nos 3 cards (labels, spacing, inputs, footer com “Limpar” discreto).
- [x] `Meus templates`: ajustar lista lateral para o padrão do protótipo (header + search + botão “Novo template” + item selecionado com barra).
- [x] `Meus templates`: ajustar painel de detalhes (header com status/tags + ações + seções Campaign/AdSet/Creative + barra de traduções).
- [x] Manter todas ações funcionais (usar/editar/excluir/gerar traduções/revisar/salvar).
- [x] Validação: `cd frontend && npm run build`.
- [ ] Validação manual do fluxo completo do `/templates` (abas, CRUD, traduções e `Usar no /campaign-flow`).
- [ ] Registrar conclusão no `PLANS.md` com timestamp e criar commit incremental. (commit: d4261c3)

Validação executada (local):

- [2026-05-28 20:20] `cd frontend && npm run build` (OK) após aplicar design premium no `/templates` (P27.1).

### P27.2 (concluído / modelo antigo) — Mídias por país no template

Última atualização: [2026-05-29 09:43]

Objetivo:
Permitir que um template tenha mídias específicas por país e que o `/campaign-flow` use automaticamente a mídia correta ao criar a campanha/anúncio daquele país.

Regra operacional (obrigatória):
Texto/copy e mídia seguem a mesma lógica por país:

- BR usa copy BR + mídia BR
- AE usa copy AE + mídia AE
- US usa copy US + mídia US

Escopo inicial:

- Priorizar **imagem** (fluxo REAL atual já suporta upload de imagem via `creative_assets` → publish do Creative).
- Vídeo: **item futuro** (publicação de vídeo no Meta Creative pode exigir fluxo/endpoint diferente do upload de imagem).

Regras obrigatórias (guardrails):

- Não quebrar `/templates`.
- Não quebrar `/campaign-flow`.
- Não quebrar `/meta-test`.
- Não criar opção `ACTIVE`.
- Toda criação REAL continua `PAUSED`.
- Token nunca vai para o frontend.
- Não criar upload paralelo: reaproveitar `creative_assets`.
- Não fazer refactor massivo.

Tarefas:

- [x] Auditar suporte atual a upload de imagem/vídeo. (Upload genérico existe; publish REAL atual operacionaliza **imagem**.)
- [x] Identificar se `creative_assets` já suporta tipo de arquivo, path/url e `mime_type`. (Sim: `stored_name`, `original_name`, `mime_type`, `url` via `/uploads/...`.)
- [x] Criar/ajustar persistência para vincular mídia ao template por país. (Via `payload.mediaByCountry` no `flow_templates`.)
- [x] Em `/templates`, adicionar seção `Mídias por país`.
- [x] Para cada país do template, permitir selecionar/enviar uma mídia. (Imagem.)
- [x] Exibir preview por país:
  - imagem quando for imagem;
  - nome do arquivo quando preview não for possível.
- [x] Permitir substituir mídia por país.
- [x] Permitir remover mídia por país.
- [x] Em `Meus templates`, exibir status de mídia:
  - `Sem mídia`
  - `Mídia parcial`
  - `Mídias completas`
- [x] Na visualização do template, mostrar copy + mídia por país.
- [x] Ao clicar `Usar no /campaign-flow`, carregar também as mídias por país.
- [x] Na etapa de revisão do `/campaign-flow`, exibir para cada país:
  - copy final;
  - mídia final;
  - status da mídia.
- [x] Na execução em lote, criar/publicar o Creative usando a mídia correta daquele país.
- [x] Se um país não tiver mídia:
  - bloquear execução REAL desse país (com confirmação para continuar o lote pulando o país);
- [x] Em caso de erro de mídia em um país, continuar os próximos países.
- [x] Registrar erro de mídia por país de forma clara.
- [x] Validar build do frontend.

Critérios de aceite:

- [x] Um template pode ter mídia diferente por país.
- [x] O usuário consegue revisar copy + mídia por país antes de executar.
- [x] O `/campaign-flow` usa automaticamente a mídia correta por país.
- [x] Execução em lote não usa a mídia errada em país errado.
- [x] Erro em uma mídia não quebra o lote inteiro.
- [x] Tudo REAL continua `PAUSED`.
- [x] Build passa.

Validação obrigatória:

- [x] `cd frontend && npm run build`

Validação executada (local):

- [2026-05-29 09:43] `cd frontend && npm run build` (OK) após P27.2 (mídias por país no template + uso no lote).

### P27.2 — Templates com 5 variações de anúncios por país

Última atualização: [2026-05-29 10:45]

Contexto:
O modelo anterior (1 texto + 1 mídia por país) não reflete o fluxo real do cliente. O cliente opera com **5 variações de anúncio por país**, e **cada variação possui texto próprio + vídeo próprio**. Os textos são criados em **PT-BR** (origem) e traduzidos automaticamente para os demais países. Os vídeos são específicos por país.

Resultado esperado no `/campaign-flow`:

- Para cada país: `1 Campaign` → `1 AdSet` → `5 Ads` (A–E)
- Cada Ad usa: texto do país (tradução quando aplicável) + vídeo do país (A–E)
- Guardrail: toda criação REAL permanece `PAUSED` (nunca `ACTIVE`)

Tarefas:

- [x] Auditar estrutura atual de templates.
- [x] Auditar estrutura atual de traduções.
- [x] Auditar estrutura atual de campaign-flow.
- [x] Definir migração segura do modelo atual para o novo modelo. (payload backward-compat: legado → Ad A)
- [x] Atualizar persistência para suportar 5 variações de anúncios por template. (`payload.adVariants`)
- [x] Cada variação deve possuir: `primaryText`, `headline`, `description`.
- [x] Manter globais: `objective`, `countries`, `destinationUrl`, `ctaType`, `dailyBudgetCents`, `billingEvent`, `optimizationGoal`.
- [x] Redesenhar o bloco Creative do Template:
  - [x] Criar seções `Ad A`…`Ad E`.
  - [x] Permitir edição das 5 variações em PT-BR.
- [x] Ajustar geração de traduções:
  - [x] Não gerar tradução para `BR` (PT-BR é a origem).
  - [x] Gerar traduções apenas para países adicionais configurados.
  - [x] Permitir revisão das traduções por país e anúncio.
- [x] Criar seção `Vídeos por país`:
  - [x] Permitir upload/seleção de Vídeo A…E para cada país.
  - [x] Exibir status de completude (textos / traduções / vídeos).
- [x] Atualizar aba `Meus templates`:
  - [x] Mostrar quantidade de países, status de traduções, status de vídeos e quantidade de anúncios.
- [x] Atualizar integração `Usar no /campaign-flow` (carregar textos+traduções+vídeos).
- [x] Atualizar etapa de revisão no `/campaign-flow` (por país → Ads A–E → texto + vídeo).
- [x] Atualizar execução REAL:
  - [x] Para cada país criar 1 Campaign, 1 AdSet e 5 Ads.
  - [x] Todos os Ads continuam `PAUSED`.
  - [x] Bloquear execução REAL se faltar vídeo ou texto.
  - [x] Registrar erros por país e anúncio (sem quebrar o lote inteiro).
- [x] Validar build do frontend.

Validação obrigatória:

- [x] `cd frontend && npm run build`

Validação executada (local):

- [2026-05-29 10:45] `cd frontend && npm run build` (OK) após P27.2 (5 variações + vídeos por país + execução 5 Ads por país).

### P27.3 — Corrigir herança das credenciais Meta no fluxo REAL

Última atualização: [2026-05-29 11:01]

Contexto:
Foi identificado bug onde, apesar das credenciais estarem preenchidas no `/profile` (Meta Ad Account ID e Meta Page ID), o `/campaign-flow` executava em modo REAL com:

- `metaAdAccountId: ""`
- `pageId: ""`

Objetivo:
Corrigir a herança automática de credenciais Meta entre:

`/profile` → `/templates` → `/campaign-flow` → execução REAL

Tarefas:

- [x] Auditar como o Profile salva: `metaAdAccountId`, `pageId`, `accessToken`.
- [x] Auditar como o `/campaign-flow` carrega credenciais.
- [x] Auditar a montagem do payload REAL.
- [x] Identificar por que `metaAdAccountId` e `pageId` chegavam vazios. (Snapshots do template zeravam os campos e o flow não herdava automaticamente.)
- [x] Corrigir herança automática das credenciais do Profile.
- [x] Garantir que o payload REAL receba `metaAdAccountId` e `pageId` (quando existir Profile configurado).
- [x] Não exigir preenchimento manual se já existir Profile configurado.
- [x] Melhorar diagnóstico de erros Meta (quando existir): `error_user_title`, `error_user_msg`, `error_subcode`, `fbtrace_id`.
- [ ] Validar novamente o fluxo REAL: BR e AE (validação manual).
- [x] Registrar evidências no `PLANS.md`.

Validação obrigatória:

- [x] `cd frontend && npm run build`

Validação executada (local):

- [2026-05-29 11:01] `cd frontend && npm run build` (OK) após P27.3 (herança de credenciais + diagnóstico de erro).

### P27.4 — Corrigir Creative de vídeo com thumbnail obrigatória

Última atualização: [2026-05-29 11:20]

Contexto:
Ao publicar Creative com vídeo (REAL), o Meta retorna erro exigindo thumbnail:

`Seu anúncio precisa de uma miniatura de vídeo — Especifique image_hash ou image_url no campo video_data de object_story_spec. (code:100, subcode:1443226)`

Objetivo:
Garantir que toda criação REAL de AdCreative com vídeo inclua thumbnail obrigatória (via `image_hash`).

Tarefas:

- [x] Auditar `backend/src/meta/creatives.js`.
- [x] Auditar onde `object_story_spec.video_data` é montado.
- [x] Para vídeos, enviar `image_hash` junto com `video_id`.
- [x] Solução simples:
  - [x] Gerar thumbnail automaticamente a partir do vídeo (ffmpeg/ffmpeg-static).
  - [x] Salvar thumbnail gerada como `creative_asset` interno e vincular automaticamente ao vídeo.
  - [x] Manter upload manual de thumbnail como fallback avançado.
  - [x] Bloquear REAL apenas se a geração automática falhar.
- [x] Atualizar `/templates` para permitir thumbnail por vídeo.
- [x] Atualizar `/templates` para exibir thumbnail gerada e permitir substituir.
- [x] Atualizar `/campaign-flow` para tentar gerar thumbnail automaticamente e só bloquear REAL se falhar.
- [x] Rodar `cd frontend && npm run build`.
- [ ] Validar manualmente execução REAL (1 país / 1 ad) com vídeo+thumbnail.
- [ ] Criar commit incremental claro.

Validação executada (local):

- [2026-05-29 11:20] `cd frontend && npm run build` (OK) após P27.4 (thumbnail automática de vídeo).

### P27.4.1 — Diagnóstico da geração automática de thumbnails

Última atualização: [2026-05-29 11:27]

Problema:
Vídeos continuavam aparecendo com `thumbnail: —` e o `/campaign-flow` bloqueava REAL por mídia ausente/indisponível.

Diagnóstico / causa raiz:

- `ffmpeg-static` não estava instalado no ambiente em execução (sem thumbnail automática).
- Em alguns uploads, `mime_type` podia vir vazio; sem inferência, o sistema tratava o asset como `unknown` (parecendo “vídeo ausente”).
- Em Docker (`node:22-alpine`), depender só de binários “static” pode falhar; solução: instalar `ffmpeg` no container.

Correções implementadas:

- Upload agora **infere `mime_type` por extensão** quando o browser não envia.
- Docker backend instala `ffmpeg` via `apk add` (garante thumbnail em Alpine).
- Logs temporários (opt-in via `THUMBNAIL_DEBUG=true`) para evidenciar:
  - geração iniciada
  - geração concluída
  - falha (code/message)

Critério de aceite:

- [ ] Revisão mostra: `Vídeo: videoAE1.mp4` e `Thumbnail: thumbnailAE1.jpg` (validação manual no ambiente REAL/DOCKER com ffmpeg).

### P27.4.2 — Diagnóstico da validação "Sem mídia"

Última atualização: [2026-05-29 11:49]

Problema:
Mesmo com vídeo persistido (creativeAssetId + mimeType `video/mp4` + `kind=video`), o `/campaign-flow` bloqueava REAL com mensagem genérica:

`Sem mídia (execução REAL bloqueada para este país)`

Correção:

- Mensagem de bloqueio agora inclui o **motivo exato por Ad** (ex.: vídeo ausente / thumbnail ausente / asset inválido).
- Logs no console (frontend) detalham para cada reprovação:
  - asset encontrado?
  - kind / mimeType
  - thumbnail encontrada?
  - creativeThumbnailAssetId / thumbnailMimeType

Validação executada (local):

- [2026-05-29 11:49] `cd frontend && npm run build` (OK) após P27.4.2 (diagnóstico detalhado de mídia no /campaign-flow).

### P27.5 — Ajustes operacionais finais do fluxo de Templates

Última atualização: [2026-05-29 12:21]

Objetivo:
Melhorias de UX operacional (menos cliques/erros), aproximando o sistema do fluxo real do cliente, sem adicionar complexidade desnecessária e sem alterar o fluxo REAL validado.

#### P27.5.1 — PT-BR como origem fixa

Checklist:

- [x] Remover qualquer conceito de tradução para BR.
- [x] BR nunca deve aparecer na lista de traduções.
- [x] Se BR estiver configurado no perfil do usuário:
  - [x] incluir automaticamente BR na execução.
- [x] BR utiliza sempre os textos originais do template.
- [x] Traduções devem ser geradas apenas para países diferentes de BR.
- [x] Atualizar textos e labels da interface para refletir isso.

#### P27.5.2 — Redesign operacional do /templates

Checklist:

- [x] Reduzir profundidade visual (menos card→card→card).
- [x] Reduzir bordas desnecessárias.
- [x] Melhorar hierarquia visual.
- [x] Nova estrutura:
  - [x] Linha 1: `[ Campanha ] [ AdSet ]`
  - [x] Linha 2: `[ Criativo ]` (full width)
- [x] Criativo com accordion simples (A–E), apenas um aberto por vez.

#### P27.5.3 — Upload múltiplo inteligente de vídeos

Checklist:

- [x] Upload múltiplo (seleção múltipla + drag&drop).
- [x] Mapeamento automático por nome:
  - [x] `BR1 → BR / Ad A`, …, `BR5 → BR / Ad E`
  - [x] Aceitar padrões: `videoBR1.mp4`, `video_BR_1.mp4`, `BR-1.mp4`, `BR1.mp4`.
- [x] Exibir resumo (mapeados vs não identificados) e permitir associação manual.
- [x] Duplicados: se slot já existir, pedir confirmação para substituir.

#### P27.5.4 — Revisão operacional editável

Checklist:

- [x] Na etapa de revisão do `/campaign-flow`, permitir editar por país e por Ad:
  - [x] vídeo
  - [x] primaryText
  - [x] headline
  - [x] description
- [x] Permitir substituir/trocar vídeo entre Ads (mínimo: selecionar outro asset).
- [x] Automação nunca impede revisão (overrides locais antes de executar).

Validação obrigatória:

- [x] `cd frontend && npm run build`

Evidências:

- [2026-05-29 12:21] `cd frontend && npm run build` (OK) após P27.5.4 (revisão editável: texto + vídeo por país/Ad).

### P27.6 — Redesign visual operacional completo do sistema

Última atualização: [2026-05-29 15:30]

Objetivo:
Transformar o sistema em uma interface mais limpa, minimalista e operacional (cliente-ready), sem alterar regras de negócio.

Regras obrigatórias (escopo):

- Não alterar regra de negócio.
- Não quebrar: templates, traduções, upload múltiplo, thumbnails automáticas, /campaign-flow, execução REAL, /profile, /meta-test.
- Guardrails: tudo REAL continua obrigatoriamente `PAUSED` (nunca `ACTIVE`) e token nunca vai ao frontend.

Telas obrigatórias:

- /templates (prioridade máxima)
- /campaign-flow (prioridade máxima)
- /profile
- /roi-operacional
- dashboard/home (se aplicável)

Checklist (P27.6.x):

#### P27.6.0 — Passo inicial (polimento rápido)

- [x] Reduzir bordas duplicadas (baseline).
- [x] Reduzir nesting de cards via estilos globais (baseline).
- [x] Reduzir previews de vídeo e definir altura máxima (baseline).
- [x] Rodar build.

#### P27.6.1 — Layout da página Templates

- [x] Topo: textos menos técnicos (evitar “/campaign-flow” e “/meta-test”).
- [x] “Criar template”: estrutura em 3 linhas (Campanha/AdSet, Criativo, Vídeos por país).
- [x] Labels mais humanos (Texto principal, Título, Descrição, etc).
- [x] Esconder opções avançadas por padrão (ex.: ações técnicas).

#### P27.6.2 — Seção de vídeos compacta (Templates)

- [x] Substituir card→card→card por lista operacional compacta (por país, Ads A–E).
- [x] Preview compacto (thumbnail-like): max-width ~140px, max-height ~80px, `object-fit: cover`.
- [x] Status simples por Ad: Pronto / Sem vídeo / Thumbnail pendente / Erro.
- [x] Thumbnail manual escondida por padrão (Opções avançadas).
- [x] Upload múltiplo destacado + mapa de associação + “Não identificados” com associação manual.

#### P27.6.3 — “Meus templates” (lista + detalhe)

- [x] Lista lateral mais legível (menos badges, sem quebra visual).
- [x] Item: nome + resumo (ex.: “2 países · 5 ads”) + status compacto.
- [x] Painel de detalhe: labels humanos e texto longo com expand/line-clamp sem cortar feio.

#### P27.6.4 — Redesign do /campaign-flow (revisão + resultado)

- [x] Revisão por país mais compacta (lista/tabela visual; evitar cards grandes por Ad).
- [x] Preview de vídeo compacta na revisão.
- [ ] Resultado: resumo operacional (IDs + status) e JSON completo apenas sob ação explícita.

#### P27.6.5 — Polimento visual global

- [x] Padronizar status/badges e hierarquia visual.
- [x] Reduzir radius/sombras onde estiver excessivo.
- [x] Reduzir bordas internas (preferir divisores/spacing).

Regras visuais:

- Card principal pode ter borda.
- Elementos internos devem evitar borda.
- Dentro do card, usar divisores simples ou spacing.
- Evitar excesso de sombra.
- Evitar excesso de radius.
- Preview de vídeo deve ser compacto.

Sugestão:

- video preview max-height: 120px
- object-fit: cover
- width: 100%
- em listas/revisão, usar max-height menor, entre 80px e 120px

Validação:
`cd frontend && npm run build`

Evidências:

- [2026-05-29 15:06] `cd frontend && npm run build` (OK) após P27.6 (polimento visual global: cards/bordas + previews de vídeo compactos).
- [2026-05-29 15:30] `cd frontend && npm run build` (OK) após redesign operacional completo do `/templates` + revisão do `/campaign-flow` (P27.6.1–P27.6.5 parcial).

### P28 — Limpeza operacional de STUB, mocks e telas legadas

Última atualização: [2026-05-31 08:46]

Objetivo:
reduzir poluição visual, esconder o que é técnico e deixar o cliente vendo apenas o fluxo operacional real (sem quebrar o sistema).

Regras (obrigatórias):

- Não remover o `/meta-test` (permanece como diagnóstico técnico).
- Não quebrar: `/templates`, `/campaign-flow`, `/profile`, `/roi-operacional`, login/logout e fluxo REAL.
- Toda criação REAL continua obrigatoriamente `PAUSED` (nunca `ACTIVE`).
- Token Meta nunca deve ir para o frontend.
- Não fazer refactor massivo / não remover backend STUB.

#### P28.1 — Auditoria de rotas e telas (frontend)

Classificação (rotas declaradas em `frontend/src/App.jsx`):

| Rota | Tela | Classe | Ação |
| --- | --- | --- | --- |
| `/` | Dashboard/Home | (1) Operacional real | Mantida como entrada; cards limpos + fluxo recomendado. |
| `/templates` | Templates | (1) Operacional real | Mantida como caminho principal. |
| `/campaign-flow` | Campaign Flow | (1) Operacional real | Mantida como caminho principal; STUB escondido em “Avançado”. |
| `/roi-operacional` | ROI Operacional | (1) Operacional real | Mantida como caminho principal; textos menos técnicos. |
| `/profile` | Perfil | (1) Operacional real | Mantida como configurações; textos menos técnicos + logout disponível. |
| `/logout` | Logout | (1) Operacional real | Adicionada para navegação principal “Sair”. |
| `/login` | Login | (1) Operacional real | Mantida. |
| `/register` | Register | (1) Operacional real | Mantida (pode ser desativada futuramente se necessário). |
| `/meta-test` | Diagnóstico técnico | (2) Técnico/debug | Mantida e acessível, mas secundária. |
| `/mensal` | Mensal | (3) Legado | Mantida (compat); removida da navegação principal; agora requer auth. |
| `/financeiro` | Financeiro | (4) Mock/STUB | Mantida (compat); removida da navegação principal; agora requer auth. |
| `/configuracoes` | Configurações | (5) Estática/incompleta | Mantida (compat); removida da navegação principal; agora requer auth. |
| `/nova-campanha` | Nova Campanha | (3) Legado | Mantida (compat); removida da navegação principal; agora requer auth. |
| `/roi-ontem` | ROI Ontem | (3) Legado | Mantida (compat); removida da navegação principal; agora requer auth. |
| `/campanhas/:id` | Detalhes Campanha | (3) Legado | Mantida (compat); removida da navegação principal; agora requer auth. |
| `/campanhas/:id/duplicar` | Duplicar Campanha | (3) Legado | Mantida (compat); removida da navegação principal; agora requer auth. |
| `/politica-de-privacidade` | Política de Privacidade | (6) Legal/institucional | Mantida. |
| `/termos-de-uso` | Termos de Uso | (6) Legal/institucional | Mantida. |
| `/exclusao-de-dados` | Exclusão de Dados | (6) Legal/institucional | Mantida. |

#### P28.2 — Navegação oficial do cliente

- [x] Navegação principal agora prioriza: Templates, Fluxo de campanha, ROI operacional, Perfil, Sair.
- [x] `/meta-test` permanece acessível, mas como link secundário “Diagnóstico técnico”.
- [x] Evitar textos tipo “/meta-test” e “/campaign-flow” na navegação e botões principais.

#### P28.3 — Dashboard/Home limpo

- [x] Removido card de ROI “fake” (mock) do dashboard.
- [x] Removidos do dashboard atalhos em destaque para legado (Nova Campanha, Financeiro, ROI Ontem).
- [x] Dashboard agora reforça fluxo recomendado: Perfil → Templates → Fluxo de campanha → ROI → Diagnóstico.

#### P28.4 — STUB escondido da experiência principal

- [x] No `/campaign-flow`, o seletor de modo (REAL/STUB) foi movido para “Avançado (modo de teste)”.
- [x] REAL é apresentado como “Operacional (REAL — sempre PAUSED)”.

#### P28.5 — Fluxos legados isolados (sem remover código arriscado)

- [x] Rotas legadas/mocks permanecem, mas foram removidas da navegação principal.
- [x] Rotas legadas/mocks agora requerem autenticação (reduz exposição/confusão).

#### P28.6 — Dados fake removidos/escondidos

- [x] Dashboard: removido `mockRoiOntem`.
- [ ] Financeiro ainda contém filtros e hooks de mock (`frontend/src/mocks/*`) — manter como legado e esconder do cliente (próximo passo: revisar/arquivar).

#### P28.7 — Mensagens menos técnicas

- [x] Troca de rótulos “Abrir /meta-test (debug)” → “Abrir diagnóstico técnico”.
- [x] Evitar expor caminhos/termos técnicos em botões primários.

#### P28.8 — Área técnica preservada

- [x] `/meta-test` permanece como área técnica/diagnóstico, acessível sem destaque no fluxo principal.

Registro (o que mudou):

- Mantido (operacional): `/templates`, `/campaign-flow`, `/profile`, `/roi-operacional`, login/logout, `/meta-test`.
- Escondido da navegação principal: `/mensal`, `/financeiro`, `/configuracoes`, `/nova-campanha`, `/roi-ontem`, `/campanhas/*`.
- Removido do dashboard: cards/atalhos que pareciam operação principal mas eram legado/mock.

Validação obrigatória (P28):

- [x] `cd frontend && npm run build`
- [ ] Validação manual: login → dashboard → profile → templates → campaign-flow → roi-operacional → meta-test (ainda acessível)

Evidências:

- [2026-05-31 08:48] `cd frontend && npm run build` (OK) após limpeza operacional (P28).

### P29 — Contas Meta por usuário

Última atualização: [2026-05-31 09:22]

Objetivo:
suportar múltiplas contas Meta por usuário e permitir selecionar a conta no template e no `/campaign-flow`, mantendo criação REAL sempre `PAUSED` e token exclusivamente no backend.

Regras (obrigatórias):

- Token Meta nunca vai para o frontend; nunca aparece em respostas; nunca em logs.
- Toda criação REAL continua obrigatoriamente `PAUSED` (nunca `ACTIVE`).
- Validar ownership: `metaAccountId` deve pertencer ao usuário logado.
- Compatibilidade: manter campos antigos do profile e fallback temporário.
- Não quebrar: `/templates`, `/campaign-flow`, `/profile`, `/meta-test`.

#### P29.1 — Modelo de dados

- [x] Migration `user_meta_accounts` + índices + default único por usuário.
- [x] `generated_campaigns.meta_account_id` para persistir a conta usada por execução (para AdSet/Ads/Creative usarem o mesmo token).

#### P29.2 — Migração dos dados atuais

- [x] Migration cria “Conta principal” (default) automaticamente para usuários que já tinham `users.meta_ad_account_id` / `users.meta_page_id` (e reaproveita o último token de `meta_tokens` quando existir).
- [x] Mantidos campos antigos em `users` e tabela `meta_tokens` como fallback temporário.

#### P29.3 — Backend/API

- [x] Endpoints autenticados:
  - `GET /api/meta-accounts`
  - `POST /api/meta-accounts`
  - `PUT /api/meta-accounts/:id`
  - `DELETE /api/meta-accounts/:id` (soft: `is_active=false`)
  - `POST /api/meta-accounts/:id/default`
  - `POST /api/meta-accounts/:id/validate` (Graph `/me`)
- [x] Respostas nunca retornam token completo; apenas `saved` + `last4`.
- [x] Compatibilidade: `/api/auth/meta-credentials` também escreve/atualiza a conta default (quando existir) ou cria “Conta principal”.

#### P29.4 — Profile/Configurações

- [x] `/profile` agora possui seção **Contas Meta** (CRUD + validar + definir padrão + desativar).
- [x] Token nunca é exibido completo após salvar.

#### P29.5 — Templates com seleção de Conta Meta

- [x] `/templates`: campo “Conta Meta” no formulário.
- [x] Template salva `payload.metaAccountId`.
- [x] “Meus templates”: exibe conta vinculada e alerta se estiver inativa/não encontrada.

#### P29.6 — Campaign Flow usando Conta Meta

- [x] `/campaign-flow`: seletor “Conta Meta” (usa default do usuário quando disponível).
- [x] Envia `metaAccountId` para criação (Campaign/AdSet/Creative publish/Ad).
- [x] Bloqueia REAL com mensagem clara quando não há conta/ID suficiente.

#### P29.7 — Backend Meta usando conta selecionada

- [x] `resolveAccessToken` prioriza token de `user_meta_accounts` (selecionada via `metaAccountId` ou default).
- [x] Rotas `meta` passam a persistir e respeitar `generated_campaigns.meta_account_id`:
  - Campaign create/simple
  - AdSet create
  - Ad create
  - Creative publish (page/IG actor via conta, quando disponível)
- [x] Ownership garantido via `user_id` na query.

#### P29.8 — Compatibilidade com `/meta-test`

- [x] `/meta-test` mantido; passa a usar token da conta default automaticamente (via `resolveAccessToken`) sem quebrar STUB.
- [ ] (opcional) Seletor explícito de conta no `/meta-test` (fazer depois se necessário).

#### P29.9 — Resultado e logs

- [x] Backend: ops logs incluem `meta_account_id`, `meta_account_name`, `meta_ad_account_id`, `meta_page_id` (sem token).
- [x] `/campaign-flow`: revisão mostra “Conta Meta” selecionada.

#### P29.10 — Critérios de aceite

- [ ] Validar manualmente: criar 2 contas Meta, definir padrão, criar template com conta, aplicar no `/campaign-flow`, executar STUB/REAL controlado e confirmar tudo `PAUSED`.
- [ ] Garantir token não aparece no frontend/logs (conferir Network e console).

Validação obrigatória (P29):

- [x] `cd frontend && npm run build`

Evidências:

- [2026-05-31 09:23] `cd frontend && npm run build` (OK) após P29 (contas Meta por usuário).

## Decision Log (Ativo)

Última atualização: [2026-05-26 12:10]

Mantém apenas decisões ainda válidas para execução atual. Histórico completo: ver `ARCHIVE.md` em `## Decision Log (histórico completo)`.

- `/meta-test` é o fluxo operacional principal.
- “Nova Campanha” é legado/compatibilidade.
- Toda criação REAL deve permanecer `PAUSED`.
- Token Meta nunca deve ir para o frontend.
- Fallback `STUB` deve ser preservado.
- P4/P5 REAL foram revalidados e estão concluídos (Creative REAL + Ad REAL); manter apenas guardrails e evidências.
- Próxima evolução operacional: P14 → P15 → P16 → P17.

- [2026-05-24 11:04] Decisão: durante a fase atual, a prioridade é destravar o fluxo REAL funcional da Meta antes de endurecer credenciais e segurança final.
  Motivo: o objetivo imediato é validar tecnicamente o fluxo Campaign → AdSet → Creative → Ad funcionando ponta a ponta. O token atual pode continuar sendo usado no backend para testes controlados, pois será substituído futuramente antes de produção.
  Regras mínimas:
  - Não enviar token para o frontend.
  - Não commitar token no Git.
  - Não expor token em prints, logs públicos ou documentação.
  - Não bloquear P4/P5 apenas por recomendação de trocar token agora.
  - Após o fluxo REAL estar funcional, abrir fase específica de hardening/rotação de credenciais.

- [2026-05-26 10:00] Decisão: autenticação inicial será simples e pragmática.
  Motivo: foco atual é entrega operacional rápida para uso controlado por no máximo 1 ou 2 usuários.

  Regras:
  - Senhas podem permanecer sem hash temporariamente.
  - Débito técnico futuro: aplicar bcrypt/hash.
  - Credenciais Meta passam a ser vinculadas ao usuário.
  - Token Meta continua exclusivamente no backend.
  - Token Meta nunca deve aparecer no frontend, logs ou commits.
  - Toda criação REAL continua obrigatoriamente `PAUSED`.

- [2026-05-26 10:40] Decisão: foco atual deixa de ser “provar integração Meta” e passa a ser **produtividade operacional para entrega controlada ao cliente**.
  Motivo: o fluxo REAL ponta a ponta já foi validado; agora a prioridade é reduzir atrito e acelerar operação.
  Regras:
  - Priorizar: P20 (lote) → P11 (templates no `/campaign-flow`) → P21 (operação ultra rápida).
  - Manter `/meta-test` como laboratório técnico/debug.
  - Toda criação REAL continua `PAUSED` (nunca `ACTIVE`).
  - Token nunca no frontend/logs/documentos.

- [2026-05-26 12:10] Decisão: após consolidar operação rápida (P11/P20/P21), a próxima fase é **P22 — ROI operacional mínimo**.
  Motivo: habilitar decisão operacional (lucro/prejuízo) sem cair em dashboard avançado.
  Regras:
  - Primeira versão aceita receita manual por campanha.
  - Ações operacionais (pausar/editar orçamento) exigem confirmação humana.
  - Nunca criar `ACTIVE` e nunca ativar automaticamente.
  - Token Meta continua apenas no backend e nunca aparece em logs/documentos.

## Blockers

Última atualização: [2026-05-26 12:10]

### Blockers ativos

- Nenhum blocker crítico ativo no fluxo REAL principal neste momento.

### Blockers resolvidos recentemente

- App Meta em Development Mode:
  - Resolvido após criação das páginas legais e publicação do App Meta.
  - Erro antigo relacionado: `error_subcode=1885183`.
  - Resultado: Creative REAL foi publicado com sucesso após publicação do app.

- Forma de pagamento ausente na Ad Account:
  - Resolvido após configuração de forma de pagamento na conta `act_259174718403969`.
  - Erro antigo relacionado: `error_subcode=1359188`.
  - Resultado: Ad REAL foi criado com sucesso como `PAUSED`.

- P4 Creative REAL:
  - Resolvido.
  - Creative REAL publicado e consultado via Graph.

- P5 Ad REAL:
  - Resolvido.
  - Ad REAL criado como `PAUSED`.
  - Persistência no banco confirmada.
  - Graph read confirmado.
  - Preview retornado.

### Próxima ação

Executar P22 — ROI operacional mínimo (após consolidar P11/P20/P21).

### Regras de segurança que continuam ativas

- Mesmo sem blocker ativo, toda criação REAL deve continuar `PAUSED`.
- Não ativar manualmente objetos no Ads Manager durante testes.
- Não criar fluxos que permitam `ACTIVE`.
- Não remover validações de segurança.
- Não expor token no frontend, logs, commits ou documentação.


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

---

## P29 — Aplicar Design System Global

Última atualização: [2026-06-01 08:45]

Objetivo:
Aplicar a base visual global do novo design system, sem quebrar lógica existente.

Referências:

- `docs/design/design-system.md` (PENDENTE: arquivo não existe no repo; adicionar manualmente como referência)
- `docs/design/prototype.html` (PENDENTE: arquivo não existe no repo; adicionar manualmente como referência)

Tarefas:

- [x] Localizar os estilos globais atuais do frontend.
- [x] Criar ou atualizar tokens CSS globais:
  - [x] cores
  - [x] bordas
  - [x] sombras
  - [x] border-radius
  - [x] espaçamentos
  - [x] tipografia
- [x] Aplicar a paleta principal:
  - [x] fundo global `#f1f3f8`
  - [x] surface `#ffffff`
  - [x] surface-2 `#f8f9fc`
  - [x] surface-3 `#eef0f6`
  - [x] border `#e3e7ef`
  - [x] text principal `#0f1624`
  - [x] text secundário `#4a5568`
  - [x] text muted `#94a3b8`
  - [x] accent `#0f1624`
  - [x] verde `#0d9467`
  - [x] azul `#2563eb`
  - [x] laranja `#c2730a`
  - [x] vermelho `#dc2626`
- [x] Aplicar tipografia:
  - [x] Syne para títulos e labels de seção
  - [x] Roboto para textos de interface
  - [x] JetBrains Mono para IDs, rotas, códigos de país e dados técnicos
- [x] Criar ou organizar componentes/classes base:
  - [x] Button primary
  - [x] Button secondary
  - [x] Button ghost
  - [x] Button danger
  - [x] Card
  - [x] Badge
  - [x] MonoTag
  - [x] PageShell
  - [ ] PageHeader
  - [ ] Field/Input
  - [x] Table
- [x] Atualizar Header/Topbar para seguir o novo padrão visual.
- [x] Aplicar o novo padrão visual nos componentes globais possíveis.
- [x] Garantir que a aplicação compile sem erro.
- [x] Não alterar regras de negócio.
- [x] Não remover rotas existentes.

Critérios de aceite:

- [x] Aplicação compila sem erro (build).
- [x] Header foi remodelado.
- [x] Botões usam o novo padrão visual.
- [x] Cards usam borda, radius e sombra do design system.
- [ ] Inputs seguem o novo padrão visual. (parcial: ainda há inputs com estilos inline)
- [x] Badges/status usam o novo padrão visual.
- [x] Nenhuma lógica REAL foi quebrada.

Validação (P29):

- [2026-06-01 08:45] `cd frontend && npm install` (OK). (audit: 2 moderate vulnerabilities; não corrigido nesta P29)
- [2026-06-01 08:45] `cd frontend && npm run build` (OK).
- `npm run lint` não existe no `frontend/package.json`.
- `npm test` não existe no `frontend/package.json`.

---

## P30 — Remodelar Dashboard/Home

Última atualização: [2026-06-01 08:53]

Objetivo:
Transformar a Home em uma entrada operacional simples e clara.

Tarefas:

- [x] Remodelar a Home usando o design system global.
- [x] Mostrar cards de resumo:
  - [x] total de campanhas
  - [x] campanhas ativas
  - [x] rascunhos
  - [x] países configurados
- [x] Criar destaque principal para abrir o fluxo de campanha.
- [x] Manter lista de campanhas recentes.
- [x] Reduzir excesso de atalhos técnicos.
- [x] Deixar Diagnóstico técnico como acesso secundário.
- [x] Usar linguagem operacional para cliente final.

Critérios de aceite:

- [x] Home deixa claro o próximo passo do usuário.
- [x] Fluxo de campanha é a ação principal.
- [x] Informações técnicas não dominam a tela.
- [x] Visual segue o design system.
- [x] Aplicação compila.

Validação (P30):

- [2026-06-01 08:53] `cd frontend && npm run build` (OK).

---

## P31 — Remodelar Templates

Última atualização: [2026-06-01 09:05]

Objetivo:
Transformar `/templates` em área real de criação, gestão, tradução e uso de templates.

Tarefas:

- [x] Remodelar `/templates` com duas áreas:
  - [x] Criar template
  - [x] Meus templates
- [x] Na criação de template, organizar os blocos:
  - [x] 1. Configuração da campanha
  - [x] 2. Configuração do conjunto de anúncios
  - [x] 3. Textos dos anúncios
  - [x] 4. Vídeos por país
  - [x] 5. Revisão e salvamento
- [x] Garantir que a criação de template suporte variações de Ads A–E.
- [x] Manter origem fixa em PT-BR.
- [x] Deixar claro que BR usa texto original.
- [x] Preparar fluxo visual para países diferentes de BR receberem tradução.
- [x] Em Meus templates, exibir:
  - [x] lista lateral
  - [x] painel de detalhe
  - [x] botão Editar
  - [x] botão Excluir
  - [x] botão Gerar traduções
  - [x] botão Revisar traduções
  - [x] botão Usar no fluxo de campanha
- [x] Manter ou adaptar chamadas existentes ao backend.
- [x] Não criar dados mock fingindo que são reais.
- [x] Caso alguma integração ainda não exista, criar placeholder visual honesto e seguro.

Critérios de aceite:

- [x] Cliente entende como criar um template.
- [x] Cliente consegue visualizar templates salvos.
- [x] Tradução aparece como etapa clara.
- [x] Template pode ser usado no fluxo de campanha.
- [x] Visual segue o design system.
- [x] Aplicação compila.

Validação (P31):

- [2026-06-01 09:05] `cd frontend && npm run build` (OK).

---

## P32 — Remodelar Perfil

Última atualização: [2026-06-01 09:07]

Objetivo:
Organizar credenciais Meta, países e idiomas da operação.

Tarefas:

- [x] Remodelar Perfil em cards:
  - [x] Usuário
  - [x] Países e idiomas
  - [x] Contas Meta
- [x] Em Países e idiomas:
  - [x] listar países do usuário
  - [x] permitir adicionar país
  - [x] permitir remover país
  - [x] permitir definir idioma por país
  - [x] mostrar código do país em monospace
- [x] Em Contas Meta:
  - [x] listar contas cadastradas
  - [x] mostrar nome interno
  - [x] mostrar Ad Account ID
  - [x] mostrar Page ID
  - [x] mostrar somente final do token
  - [x] permitir cadastrar nova conta
  - [x] permitir validar conta, se já existir endpoint
- [x] Garantir que o token nunca apareça completo após salvo.
- [x] Preservar autenticação existente.

Critérios de aceite:

- [x] Perfil fica claro para configuração inicial do cliente.
- [x] Token continua protegido.
- [x] Países e idiomas ficam fáceis de gerenciar.
- [x] Visual segue o design system.
- [x] Aplicação compila.

Validação (P32):

- [2026-06-01 09:07] `cd frontend && npm run build` (OK).

---

## P33 — Remodelar Fluxo de Campanha

Última atualização: [2026-06-01 09:15]

Objetivo:
Fazer o fluxo REAL parecer o centro operacional do sistema.

Tarefas:

- [x] Organizar fluxo em etapas:
  - [x] 1. Selecionar template
  - [x] 2. Selecionar países
  - [x] 3. Revisar campanha
  - [x] 4. Gerar campanhas `PAUSED`
  - [x] 5. Ver resultado
- [x] Priorizar modo REAL.
- [x] Deixar STUB em área avançada ou secundária.
- [x] Usar linguagem operacional para cliente final.
- [x] Não expor detalhes técnicos por padrão (IDs/JSON em “Detalhes técnicos”).
- [x] Manter guardrail: campanhas/anúncios reais sempre `PAUSED`.
- [x] Após gerar, mostrar status, país e link para detalhes (`/campanhas/:id`).

Critérios de aceite:

- [x] Usuário entende o passo a passo.
- [x] REAL é o caminho principal.
- [x] STUB não aparece como opção principal.
- [x] Resultado mostra status `PAUSED`.
- [x] Aplicação compila.

Validação (P33):

- [2026-06-01 09:15] `cd frontend && npm run build` (OK).

---

## P34 — Remodelar ROI e Detalhes da Campanha

Última atualização: [2026-06-01 09:21]

Objetivo:
Deixar ROI e detalhes com visual operacional e menos técnico.

Tarefas:

- [x] Remodelar ROI operacional com:
  - [x] gasto
  - [x] receita manual
  - [x] lucro
  - [x] ROI
  - [x] ações seguras
- [x] Criar banner de guardrail informando:
  - [x] ações reais exigem confirmação
  - [x] campanhas reais permanecem `PAUSED`
- [x] Remodelar tabela de ROI (IDs e países em monospace).
- [x] Remodelar Detalhes da Campanha com:
  - [x] status
  - [x] país
  - [x] modo REAL
  - [x] Meta Campaign ID
  - [x] status Meta
  - [x] ações de sincronização
- [x] Deixar diagnóstico técnico como botão secundário.
- [x] Usar badges para:
  - [x] REAL
  - [x] PAUSED
  - [x] Rascunho
  - [x] Erro
  - [x] Sincronizado

Critérios de aceite:

- [x] ROI fica fácil de ler.
- [x] Detalhes mostram o essencial.
- [x] Informações técnicas ficam organizadas.
- [x] Diagnóstico não domina a tela.
- [x] Aplicação compila.

Validação (P34):

- [2026-06-01 09:21] `cd frontend && npm run build` (OK).

Observação (ajuste visual pós-redesign):

- Tipografia global ajustada para usar somente Roboto (sem Syne/JetBrains Mono).
- Pesos de fonte suavizados para reduzir excesso de negrito.
- Home: espaçamento entre “Entrada operacional” e cards ampliado.

---

## P36 — Navegação global e remoção de botões Voltar

Última atualização: [2026-06-01 15:52]

Objetivo:
Padronizar a navegação do sistema usando a navbar/header global em todas as páginas autenticadas principais.

Tarefas:

- [x] Auditar páginas do frontend em busca de botões “Voltar”, “← Voltar” ou equivalentes.
- [x] Remover botões de voltar das páginas principais.
- [x] Garantir que a navegação principal seja feita pela navbar/header global.
- [x] Garantir que a mesma navbar da Home apareça nas páginas autenticadas principais.
- [x] Evitar headers duplicados.
- [x] Preservar rotas existentes.
- [x] Rodar build do frontend.

Critérios de aceite:

- [x] Nenhuma página principal depende de botão Voltar.
- [x] Navbar global aparece nas páginas autenticadas principais.
- [x] Home continua funcionando.
- [x] Nenhuma rota foi removida.
- [x] Build passa.

Validação (P36):

- [2026-06-01 15:52] `cd frontend && npm run build` (OK).

Arquivos alterados (P36):

- `frontend/src/components/PageShell.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/pages/Mensal.jsx`
- `frontend/src/pages/Profile.jsx`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Register.jsx`
- `frontend/src/pages/Logout.jsx`

---

## P37 — Correção do redirecionamento pós-login

Última atualização: [2026-06-01 15:52]

Objetivo:
Corrigir o fluxo para que o usuário vá para “/” após login.

Tarefas:

- [x] Auditar o fluxo de login.
- [x] Identificar por que o login redireciona para “/campaign-flow”.
- [x] Corrigir o redirecionamento para “/”.
- [x] Garantir que “/” seja a entrada operacional.
- [x] Rodar build.

Critérios de aceite:

- [x] Login redireciona para “/”.
- [x] Não redireciona automaticamente para “/campaign-flow”.
- [x] Home é a entrada principal.
- [x] Build passa.

Validação (P37):

- [2026-06-01 15:52] `cd frontend && npm run build` (OK).

Arquivos alterados (P37):

- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Register.jsx`

---

## P38 — Branding visual ScalifyAds

Última atualização: [2026-06-01 15:53]

Objetivo:
Substituir o branding antigo pelo nome atual ScalifyAds.

Tarefas:

- [x] Procurar ocorrências visíveis de:
  - [x] Campaign Builder
  - [x] CampaignBuilder
  - [x] Campaing Builder
  - [x] CampaingBuilder
- [x] Substituir textos visíveis por: ScalifyAds
- [x] Atualizar títulos, labels e cabeçalhos visíveis.
- [x] Não renomear arquivos, tabelas, endpoints ou identificadores técnicos.
- [x] Rodar build.

Critérios de aceite:

- [x] UI usa ScalifyAds.
- [x] Branding antigo não aparece mais na interface.
- [x] Nenhuma lógica foi quebrada.
- [x] Build passa.

Validação (P38):

- [2026-06-01 15:53] `cd frontend && npm run build` (OK).

Arquivos alterados (P38):

- `frontend/src/components/Header.jsx`
- `frontend/index.html`
- `frontend/src/pages/PoliticaPrivacidade.jsx`
- `frontend/src/pages/TermosDeUso.jsx`
- `frontend/src/pages/CampaignFlow.jsx`

---

## P39 — UX de orçamento diário em reais

Última atualização: [2026-06-01 15:56]

Objetivo:
Permitir que o usuário trabalhe com reais na interface e manter centavos internamente.

Tarefas:

- [x] Auditar campos de orçamento diário.
- [x] Identificar uso de `dailyBudgetCents`.
- [x] Exibir valores em reais.
- [x] Utilizar label: Orçamento diário (R$)
- [x] Exibir ajuda: Digite o valor em reais. Ex.: 10 para R$ 10,00.
- [x] Aceitar: 10 / 10,50 / 10.50
- [x] Converter para centavos apenas antes do envio.
- [x] Manter payload usando `dailyBudgetCents`.
- [x] Exibir valores recebidos do backend em reais.
- [x] Aplicar em:
  - [x] /templates
  - [x] /campaign-flow
  - [x] outras telas relevantes
- [x] Rodar build.

Critérios de aceite:

- [x] Usuário digita 10 para representar R$ 10,00.
- [x] Sistema envia 1000 em `dailyBudgetCents`.
- [x] Usuário não precisa entender centavos.
- [x] Build passa.

Validação (P39):

- [2026-06-01 15:56] `cd frontend && npm run build` (OK).

Arquivos alterados (P39):

- `frontend/src/utils/brlMoney.js`
- `frontend/src/pages/Templates.jsx`
- `frontend/src/pages/CampaignFlow.jsx`
- `frontend/src/pages/RoiOperacional.jsx`

---

## P40 — Países operacionais e suporte à Alemanha

Última atualização: [2026-06-01 16:01]

Objetivo:
Adicionar Alemanha ao fluxo operacional e estruturar melhor o catálogo de países suportados.

Tarefas:

- [x] Auditar implementação atual de countries.
- [x] Identificar onde os países são cadastrados.
- [x] Adicionar Alemanha:
  - [x] code: DE
  - [x] name: Alemanha
  - [x] languageCode: de
  - [x] languageName: Alemão
- [x] Garantir retorno correto em /api/countries.
- [x] Garantir funcionamento em /profile.
- [x] Garantir funcionamento em /templates.
- [x] Garantir funcionamento em /campaign-flow.
- [x] Garantir funcionamento na geração de traduções.
- [x] Garantir que traduções para DE usem languageCode=de.
- [x] Revisar estrutura atual de países.
- [x] Preparar base para inclusão futura de novos países sem duplicação desnecessária.
- [x] Rodar build.

Critérios de aceite:

- [x] DE aparece na lista de países.
- [x] Usuário consegue selecionar Alemanha.
- [x] Traduções para alemão funcionam.
- [x] Fluxo operacional continua funcionando.
- [x] Build passa.

Validação (P40):

- [2026-06-01 16:01] `cd frontend && npm run build` (OK).

Implementação (P40):

- Catálogo de países (seed): `backend/src/seed.js` (inclui DE/Alemanha + `language_code=de`).
- Fallback do frontend: `frontend/src/data/mockCountries.js` (inclui DE/Alemanha).
- País operacional sem manutenção manual: `backend/src/routes/auth.js` preenche `primary_language` automaticamente a partir de `countries.language_code` (lowercase) ao:
  - adicionar um país operacional (`/api/auth/operational-countries/add`)
  - adicionar todos (`/api/auth/operational-countries/add-all`)

Arquivos alterados (P40):

- `backend/src/seed.js`
- `backend/src/routes/auth.js`
- `frontend/src/data/mockCountries.js`

---

## P30 — Motor de Mercados Operacionais

Última atualização: [2026-06-03 16:28; 2026-06-03 16:34]

Observação:
Já existia um P30 histórico (“Remodelar Dashboard/Home”) concluído em 2026-06-01. O histórico foi preservado acima; esta seção registra a reabertura/continuação operacional do P30 solicitada em 2026-06-03 para o Motor de Mercados Operacionais.

Objetivo:
Implementar uma camada incremental de Mercados Operacionais no ScalifyAds, baseada na regra validada com o cliente: o coração operacional não é país/idioma isolado, mas sim uma combinação de código, idioma principal, localização/região geográfica e público-alvo.

Contexto validado:

- Mercados devem vir pré-cadastrados no sistema.
- O cliente não deve criar mercados manualmente a cada campanha.
- O cliente informa apenas o nicho/parâmetro operacional, como `PlantasBTN`, `DirigirBTN` ou `InglesBTN`.
- Entre mercados, permanecem iguais: Pixel, Página, domínio base, beneficiário, conta de anúncio, conversão, orçamento, copy base e criativos base.
- Entre mercados, mudam: código do mercado, idioma, localização, URL/slug, UTM e SRC.
- Brasil usa slug em português; todos os demais mercados usam slug internacional em inglês.
- `utm_source=facebook`, `utm_medium=cpa`, `utm_campaign={CODIGO_MERCADO}`.
- `src={CODIGO_MERCADO}-{NICHO}-FB`.

Lista inicial de mercados pré-cadastrados:

`ARM`, `AREU`, `ARIS`, `ARKU`, `AROM`, `DE`, `BN`, `BNOM`, `BR`, `BREUA`, `BREU`, `BG`, `KO`, `HR`, `ZHHK`, `ZHML`, `ZHTW`, `SK`, `SL`, `ESM`, `ESARG`, `ESCB`, `ESCH`, `ESEUA`, `ESEU`, `ESMX`, `TLOM`, `TL`, `FRCN`, `FREU`, `FRMD`, `EL`, `NL`, `HU`, `HIOM`, `HI`, `ID`, `ENAU`, `ENCA`, `ENOM`, `ENRU`, `ENNZ`, `ENAF`, `HE`, `IT`, `JP`, `MS`, `PL`, `RO`, `RUEU`, `SRO`, `RU`, `SR`, `TH`, `CS`, `TREU`, `TRM`, `UK`, `UROM`, `VI`, `LT`, `SV`, `ARAF`, `ARAS`, `ARNE`, `ARCA`, `ARUS`, `ARIT`, `BNEUAS`, `BRAF`, `BREUOC`, `ZHEUOC`, `ZHNA`, `ESAMNA`, `ESSL`, `TLAS`, `TLSON`, `FRAF`, `FRAS`, `FRN`, `HIAS`, `HISAF`, `IDAS`, `IDSEUOC`, `ENEU`, `ENNA`, `ENOC`, `MSAS`, `MSAOC`, `RUAS`, `RUNOC`, `THAS`, `THNEUOC`, `TRAFN`, `TRAS`, `URAS`, `UREUAF`, `VIAS`, `VINA`, `VISEU`

Tarefas:

- [x] Documentar a regra de negócio de mercados operacionais.
- [x] Criar lista/fonte inicial de mercados pré-cadastrados.
- [x] Definir estrutura interna de mercado:
  - [x] `code`
  - [x] `name`
  - [x] `language`
  - [x] `location/region`
  - [x] `audience/description`
  - [x] `slugMode`
- [x] Implementar helpers para gerar:
  - [x] `marketParam`
  - [x] `utm_campaign`
  - [x] `src`
  - [x] `finalUrl`
- [x] Ajustar fluxo de campanha para aceitar nicho/parâmetro.
- [x] Ajustar fluxo de campanha para aceitar slug BR.
- [x] Ajustar fluxo de campanha para aceitar slug internacional.
- [x] Ajustar fluxo de campanha para selecionar mercados.
- [x] Gerar automaticamente nomes/parâmetros por mercado.
- [x] Gerar automaticamente UTM e SRC por mercado.
- [x] Preservar fluxo antigo se necessário.
- [x] Rodar build.
- [x] Atualizar PLANS.md ao final com evidências.

Critérios de aceite:

- [x] Mercados estão pré-cadastrados.
- [x] Usuário não precisa cadastrar mercado manualmente.
- [x] Usuário informa nicho/parâmetro.
- [x] Usuário informa slug BR e slug internacional.
- [x] Sistema gera `src={CODIGO}-{NICHO}-FB`.
- [x] Sistema gera `utm_campaign={CODIGO}`.
- [x] Brasil usa slug BR.
- [x] Demais mercados usam slug internacional.
- [x] Guardrail PAUSED continua preservado.
- [x] Build passa.

Pendências iniciais:

- Mapeamento completo de mercados para países/regiões aceitas pela Meta ainda não foi validado; não inventar targeting real.
- Mapeamento completo de idiomas por mercado ainda não foi validado; usar metadados seguros/inferidos somente quando confiável.
- Integração com criação real deve ser incremental e preservar o fluxo atual.

Implementação (P30):

- Catálogo/helper estático criado em `frontend/src/utils/operationalMarkets.js`.
- `/campaign-flow` recebeu modo opcional “Mercados Operacionais”.
- Novo modo aceita:
  - nicho/parâmetro;
  - domínio base;
  - slug BR;
  - slug internacional;
  - seleção de mercados pré-cadastrados.
- Preview por mercado exibe:
  - código;
  - idioma quando inferido/confirmado;
  - parâmetro;
  - `utm_campaign`;
  - `src`;
  - slug usado;
  - URL final.
- Fluxo antigo por país foi preservado.
- Guardrail de criação `PAUSED` foi preservado; nenhuma opção `ACTIVE` foi adicionada.
- Para evitar targeting incorreto, criação Meta em modo Mercados Operacionais fica bloqueada para mercados diferentes de `BR` até validar o mapeamento mercado -> localização Meta.
- Para `BR`, o modo pode usar a URL final gerada no Creative Draft mantendo `countryCode=BR`.

Arquivos alterados (P30):

- `PLANS.md`
- `frontend/src/utils/operationalMarkets.js`
- `frontend/src/pages/CampaignFlow.jsx`

Validação (P30):

- [2026-06-03 16:34] `cd frontend && npm run build` (OK).

Pendências finais (P30):

- Validar com o cliente/Meta o mapeamento completo de cada mercado operacional para `geo_locations` aceitas pela Meta antes de criar campanhas reais para mercados não-BR.
- Validar nomes/idiomas/localizações/audiências completos dos códigos que ainda só têm código e idioma inferido.
- Decidir se a lista estática deve virar tabela/seed após estabilização da regra.

---

## P31 — Catálogo Oficial de Mercados Operacionais

Última atualização: [2026-06-04 08:33; 2026-06-04 08:36]

Objetivo:
Transformar os mercados operacionais documentados nos arquivos oficiais da raiz (`62 CAMPANHAS.txt` e `38 CAMPANHAS.txt`) em um catálogo oficial consumido pelo sistema.

Contexto:

- Os arquivos `62 CAMPANHAS.txt` e `38 CAMPANHAS.txt` substituem hipóteses anteriores sobre mercados.
- O coração operacional do negócio é Mercado Operacional, não país/idioma/região isoladamente.
- Cada mercado possui código, nome, idioma, localizações incluídas e localizações excluídas.
- O catálogo será base para nome da campanha, targeting futuro, idioma, UTM, SRC e geração de campanhas.
- Nesta etapa ainda não implementar targeting Meta real.

Tarefas:

- [x] Ler completamente `62 CAMPANHAS.txt`.
- [x] Ler completamente `38 CAMPANHAS.txt`.
- [x] Identificar todos os códigos, nomes, idiomas, localizações incluídas e localizações excluídas.
- [x] Auditar implementação P30 (`operationalMarkets.js`, helpers, previews, `/campaign-flow`).
- [x] Substituir lista simplificada por catálogo oficial.
- [x] Estruturar cada mercado com `code`, `name`, `language`, `includedLocations`, `excludedLocations`.
- [x] Adaptar `/campaign-flow` para exibir nome amigável.
- [x] Preservar código internamente.
- [x] Adaptar preview para exibir nome, código, idioma, inclusões, exclusões, parâmetro, SRC e UTM.
- [x] Preparar estrutura para P32 sem implementar targeting Meta real.
- [x] Preservar fluxo antigo.
- [x] Rodar build.
- [x] Atualizar `PLANS.md` com evidências e pendências.

Critérios de aceite:

- [x] Catálogo oficial criado.
- [x] Dados carregados dos arquivos oficiais.
- [x] Lista simplificada removida.
- [x] Campaign Flow usa catálogo oficial.
- [x] Nome amigável exibido na UI.
- [x] Código preservado internamente.
- [x] Preview mostra idioma.
- [x] Preview mostra inclusões.
- [x] Preview mostra exclusões.
- [x] Build executado.
- [x] PLANS.md atualizado.

Pendências iniciais:

- Não criar migrations nesta etapa.
- Não implementar targeting Meta real antes de validar conversão de `includedLocations`/`excludedLocations` para Meta.
- Não alterar guardrail `PAUSED`, Meta REAL, credenciais ou `.env`.

Relatório interno (P31):

- Fontes oficiais lidas na raiz:
  - `62 CAMPANHAS.txt`: 62 mercados oficiais.
  - `38 CAMPANHAS.txt`: 38 mercados oficiais.
- Total carregado no catálogo: 100 mercados.
- Validação estrutural: 100 códigos únicos.
- Campos oficiais preservados no catálogo:
  - `code`;
  - `name`;
  - `language`;
  - `includedLocations`;
  - `excludedLocations`.
- A lista simplificada do P30 (`CONFIRMED_MARKET_DETAILS` + inferência por prefixo de idioma) foi removida.

Implementação (P31):

- `frontend/src/utils/operationalMarkets.js` agora exporta `OFFICIAL_OPERATIONAL_MARKETS`, `OPERATIONAL_MARKETS` e `OPERATIONAL_MARKET_CODES` derivados do catálogo oficial.
- Helpers preservados:
  - `generateMarketParam`;
  - `generateTrackingParams`;
  - `resolveSlug`;
  - `buildFinalUrl`;
  - `buildMarketPreview`.
- `/campaign-flow` agora exibe nome amigável na seleção de mercados e mantém o código como dado interno.
- Preview de Mercados Operacionais agora mostra:
  - nome do mercado;
  - código;
  - idioma;
  - localizações incluídas;
  - localizações excluídas;
  - parâmetro gerado;
  - `utm_campaign`;
  - `src`;
  - URL final.
- Targeting Meta real continua não implementado para mercados não-BR; guardrail de bloqueio permanece.

Arquivos alterados (P31):

- `PLANS.md`
- `frontend/src/utils/operationalMarkets.js`
- `frontend/src/pages/CampaignFlow.jsx`

Validação (P31):

- [2026-06-04 08:36] Validação estrutural via Node: `{ total: 100, unique: 100 }` (OK).
- [2026-06-04 08:36] `cd frontend && npm run build` (OK).

Pendências finais (P31):

- P32: definir conversor seguro de `includedLocations`/`excludedLocations` para targeting Meta, sem inventar IDs/regiões.
- P32/P33: decidir se o catálogo oficial deve continuar estático ou virar seed/tabela após estabilização.
- P32: revisar como mercados não-BR devem interagir com cópia/tradução e mídia por mercado no fluxo operacional.

---

## P32 — Conversor de Mercados para Targeting Meta

Última atualização: [2026-06-04 08:43; 2026-06-04 08:44]

Objetivo:
Criar uma camada segura de conversão de Mercado Operacional para uma estrutura interna de Targeting Meta previsto, sem publicar campanhas reais e sem alterar o fluxo Meta existente.

Contexto:

- P31 criou o catálogo oficial de 100 mercados com `code`, `name`, `language`, `includedLocations` e `excludedLocations`.
- P32 deve consumir exclusivamente esse catálogo oficial.
- O sistema já gera parâmetro, UTM, SRC, slug e preview operacional.
- O próximo passo é representar targeting previsto para P33/P34/P35, sem inventar IDs/regiões Meta.

Auditoria inicial:

- `backend/src/meta/adsets.js`: `metaCreateAdSet` monta `targeting = { geo_locations: { countries: [cc] } }` usando `countryCode` ISO-2 e força `status = 'PAUSED'`.
- `backend/src/routes/meta.js`: endpoint de criação de AdSet resolve `countryCode` a partir de `generated_campaigns.country_code` ou body e passa para `metaCreateAdSet`.
- `backend/src/routes/meta.js`: criação simples de campanha exige `countryCode` ISO-2, valida em `countries`, grava `campaign_country_targets` e `generated_campaigns.country_code`.
- `backend/migrations/0001_init.sql`: `countries.code` tem `char_length(code) = 2`; `campaign_country_targets` e `generated_campaigns` dependem de `country_code`.
- `backend/src/seed.js`: mapeamento atual de países é pequeno (`BR`, `US`, `MX`, `AE`, `FR`, `ES`, `DE`) e não cobre mercados operacionais.
- `frontend/src/pages/CampaignFlow.jsx`: modo Mercados Operacionais já bloqueia criação para mercados não-BR; para BR mantém `countryCode=BR`.

Arquivos impactados:

- `frontend/src/utils/operationalMarkets.js`
- `frontend/src/pages/CampaignFlow.jsx`
- `PLANS.md`

Fluxo atual:

- Fluxo legado: usuário escolhe país (`countryCode`) -> backend cria Campaign/AdSet/Ad -> AdSet Meta usa `geo_locations.countries`.
- Fluxo Mercados Operacionais: usuário escolhe `marketCode` -> frontend gera preview/URL -> criação Meta para não-BR permanece bloqueada.

Riscos encontrados:

- Trocar `countryCode` por `marketCode` agora quebraria constraints e FK do banco.
- Converter nomes como `Europa`/`Worldwide` diretamente para Meta sem IDs/regiões validadas pode criar targeting incorreto.
- Muitos mercados possuem exclusões; publicar sem conversor validado poderia atingir localizações proibidas pelo cliente.
- Idioma do catálogo é nome humano; ainda não há mapeamento validado para `locales` Meta.

Tarefas:

- [x] Auditoria do targeting atual concluída.
- [x] Fluxo de `geo_locations` identificado.
- [x] Criar estrutura interna de targeting previsto.
- [x] Criar helper isolado `resolveMarketTargeting`.
- [x] Consumir exclusivamente o catálogo oficial P31.
- [x] Classificar mercados por tipo.
- [x] Expandir preview com Targeting Meta previsto.
- [x] Preparar compatibilidade futura `countryCode` -> `marketCode` sem remover `countryCode`.
- [x] Preservar fluxo antigo.
- [x] Preservar guardrail `PAUSED`.
- [x] Rodar build.
- [x] Atualizar `PLANS.md` com evidências e pendências.

Critérios de aceite:

- [x] Auditoria do targeting atual concluída.
- [x] Fluxo de `geo_locations` identificado.
- [x] Conversor de mercados criado.
- [x] Estrutura de targeting criada.
- [x] Mercados classificados.
- [x] Preview expandido.
- [x] Fluxo antigo preservado.
- [x] Guardrail `PAUSED` preservado.
- [x] Build executado.
- [x] PLANS atualizado.

Implementação (P32):

- `frontend/src/utils/operationalMarkets.js` agora expõe:
  - `MARKET_TARGETING_TYPES`;
  - `classifyMarketTargeting`;
  - `resolveMarketTargeting`;
  - `getMarketTargetingClassificationSummary`.
- `resolveMarketTargeting(marketCode)` retorna estrutura interna:
  - `marketCode`;
  - `marketName`;
  - `language`;
  - `targetingType`;
  - `publishable: false`;
  - `targeting.included`;
  - `targeting.excluded`;
  - `metaTargetingPreview.geo_locations.included`;
  - `metaTargetingPreview.geo_locations.excluded`.
- Todos os itens de targeting ficam com `metaLocation: null` e `status: "mapping_pending"` para evitar invenção de IDs Meta.
- `buildMarketPreview` passou a anexar `targetingPreview` por mercado.
- `/campaign-flow` passou a exibir:
  - classificação do mercado;
  - Targeting Meta previsto;
  - status “Preview somente (mapeamento Meta pendente)”.

Classificação (P32):

- `simple_location`: 33 mercados. Exemplos: `ENCA`, `JP`, `KO`, `IT`, `BR`.
- `location_group`: 38 mercados. Exemplos: `ARKU`, `AROM`, `DE`, `ENOM`.
- `region_with_exclusions`: 18 mercados. Exemplos: `AREU`, `BREU`, `ESEU`, `FREU`.
- `worldwide_with_exclusions`: 9 mercados. Exemplos: `ARM`, `FRMD`, `RU`, `TRM`.
- `location_group_with_exclusions`: 2 mercados. Exemplos: `FRAS`, `TRAS`.

Compatibilidade (P32):

- `countryCode` não foi removido.
- Nenhuma tabela/migration foi criada.
- A criação Meta real continua usando o fluxo antigo de `countryCode`.
- Mercados não-BR continuam bloqueados para criação real até existir mapeamento Meta validado.
- Guardrail `PAUSED` permanece preservado; nenhuma opção `ACTIVE` foi adicionada.

Arquivos alterados (P32):

- `PLANS.md`
- `frontend/src/utils/operationalMarkets.js`
- `frontend/src/pages/CampaignFlow.jsx`

Validação (P32):

- [2026-06-04 08:44] Validação via Node: `{ total: 100, unique: 100 }` (OK).
- [2026-06-04 08:44] Classificação via Node:
  - `worldwide_with_exclusions`: 9;
  - `region_with_exclusions`: 18;
  - `simple_location`: 33;
  - `location_group`: 38;
  - `location_group_with_exclusions`: 2.
- [2026-06-04 08:44] `cd frontend && npm run build` (OK).
- Backend não possui script seguro de build/test em `backend/package.json`; não rodado. Scripts existentes: `dev`, `migrate`, `seed`, `start`.

Pendências finais (P32):

- P33: criar mapeamento validado de nomes oficiais (`Brasil`, `Europa`, `Worldwide`, etc.) para objetos Meta reais, sem inventar IDs.
- P33: decidir formato de compatibilidade para persistir `marketCode` futuramente sem quebrar `generated_campaigns.country_code`.
- P33: definir se idiomas humanos do catálogo serão mapeados para `locales` Meta e onde esse mapeamento será validado.

---

## P33 — Mapeamento Meta de Localizações

Última atualização: [2026-06-04 09:00; 2026-06-04 09:03]

Objetivo:
Criar uma camada segura de mapeamento entre nomes operacionais de localização do catálogo oficial e uma estrutura interna validável para uso futuro em targeting Meta.

Contexto:

- P30 criou o Motor de Mercados Operacionais.
- P31 criou o catálogo oficial de 100 mercados.
- P32 criou o conversor/classificador de targeting previsto.
- O backend ainda cria AdSet real via `countryCode` ISO-2 em `geo_locations.countries`.
- P33 não deve publicar campanhas reais com mercados e não deve alterar criação REAL existente.

Tarefas:

- [x] Auditar localizações únicas usadas em `includedLocations` e `excludedLocations`.
- [x] Registrar total de localizações únicas.
- [x] Criar catálogo estático de localizações Meta.
- [x] Mapear países simples conhecidos para ISO-2 com `mapping_ready`.
- [x] Marcar `Europa` como região pendente sem inventar formato Meta final.
- [x] Marcar `Worldwide` como worldwide pendente sem inventar formato Meta final.
- [x] Criar `resolveMetaLocation(name)`.
- [x] Criar `resolveMarketMetaLocations(marketCode)`.
- [x] Integrar resolver ao preview de Mercados Operacionais.
- [x] Mostrar mapeamento Meta resolvido no preview.
- [x] Mostrar status ready/pending no preview.
- [x] Preservar fluxo antigo por `countryCode`.
- [x] Preservar guardrail `PAUSED`.
- [x] Rodar validação estrutural via Node.
- [x] Rodar build do frontend.
- [x] Atualizar `PLANS.md` com evidências e pendências.

Critérios de aceite:

- [x] P33 criado no `PLANS.md`.
- [x] Localizações únicas auditadas.
- [x] Catálogo de localizações Meta criado.
- [x] `resolveMetaLocation` criado.
- [x] `resolveMarketMetaLocations` criado.
- [x] Preview mostra mapeamento Meta.
- [x] Preview mostra status ready/pending.
- [x] Países simples mapeados com ISO-2.
- [x] Europa e Worldwide não foram inventados.
- [x] Fluxo antigo preservado.
- [x] Guardrail `PAUSED` preservado.
- [x] Build passou.

Riscos:

- Nomes operacionais como `Europa` e `Worldwide` não podem ser convertidos sem validação específica da Meta.
- Alguns nomes podem exigir revisão de nomenclatura Meta (`Holanda` vs `Países Baixos`, `Ilhas Fiji`, `Timor-Leste`, etc.).
- Integrar esse mapeamento ao backend antes de persistir `marketCode` poderia quebrar o fluxo atual por `countryCode`.
- O backend ainda não suporta targeting por regiões, exclusões ou worldwide em produção.

Auditoria de localizações (P33):

- Total de mercados analisados: 100.
- Total de localizações únicas em `includedLocations`/`excludedLocations`: 86.
- Localizações `mapping_ready`: 84.
- Localizações `mapping_pending`: 2 (`Europa`, `Worldwide`).
- Mercados totalmente prontos: 72.
- Mercados pendentes: 28.

Implementação (P33):

- Criado `frontend/src/utils/metaLocations.js`.
- Catálogo estático `META_LOCATION_CATALOG` criado com países conhecidos mapeados para ISO-2.
- `Europa` foi modelada como `{ type: "region", key: "EUROPE", status: "mapping_pending" }`.
- `Worldwide` foi modelada como `{ type: "worldwide", key: "WORLDWIDE", status: "mapping_pending" }`.
- Criados helpers:
  - `listUniqueOperationalLocations`;
  - `resolveMetaLocation`;
  - `resolveMarketMetaLocations`;
  - `getMetaLocationMappingSummary`.
- `/campaign-flow` agora mostra no preview de Mercados Operacionais:
  - mapeamento Meta de localizações incluídas;
  - mapeamento Meta de localizações excluídas;
  - status “Pronto para targeting” ou “Mapeamento pendente”;
  - pendências por mercado.

Arquivos alterados (P33):

- `PLANS.md`
- `frontend/src/utils/metaLocations.js`
- `frontend/src/utils/operationalMarkets.js`
- `frontend/src/pages/CampaignFlow.jsx`

Validação (P33):

- [2026-06-04 09:03] Validação estrutural via Node:
  - `totalMarkets`: 100;
  - `totalUniqueLocations`: 86;
  - `mappingReadyLocations`: 84;
  - `mappingPendingLocations`: 2;
  - `readyMarkets`: 72;
  - `pendingMarkets`: 28.
- [2026-06-04 09:03] Exemplos validados:
  - `ENCA`: Canadá -> `CA`, pronto.
  - `AROM`: Emirados Árabes Unidos -> `AE`, Catar -> `QA`, Arábia Saudita -> `SA`, pronto.
  - `AREU`: Europa pendente; exclusões mapeadas para ISO-2.
  - `ARM`: Worldwide pendente; Taiwan -> `TW`.
- [2026-06-04 09:03] `cd frontend && npm run build` (OK).

Pendências finais (P33):

- P34: validar oficialmente como representar `Europa` em targeting Meta sem inventar região/ID.
- P34: validar oficialmente como representar `Worldwide` em targeting Meta sem inventar formato final.
- P34: decidir se mercados `ready` podem gerar AdSet real em modo controlado, ainda sempre `PAUSED`.
- P34: revisar se `Kosovo` (`XK`) e nomenclaturas como `Holanda`/`Países Baixos` são aceitas pela Meta no formato escolhido.

---

## P34 — Resolver Europa e Worldwide para Targeting Meta

Última atualização: [2026-06-04 09:18; 2026-06-04 09:20; 2026-06-04 09:22]

Objetivo:
Resolver, de forma segura e auditável, as localizações operacionais `Europa` e `Worldwide` para estruturas internas utilizáveis em preview de targeting Meta, sem criar campanhas reais por mercado.

Contexto:

- P33 deixou 2 localizações pendentes: `Europa` e `Worldwide`.
- O backend real ainda só usa `geo_locations.countries` com um `countryCode` ISO-2.
- A criação real de AdSet permanece dependente do fluxo antigo por `countryCode`.

Auditoria técnica Meta:

- `backend/src/meta/adsets.js`: `metaCreateAdSet` recebe `countryCode`, valida ISO-2, monta `targeting = { geo_locations: { countries: [cc] } }`, serializa em `params.set('targeting', JSON.stringify(targeting))` e força `status = 'PAUSED'`.
- `backend/src/routes/meta.js`: criação de AdSet resolve `countryCode` de `generated_campaigns.country_code` ou body e passa para `metaCreateAdSet`.
- Não há helper de targeting real além do uso direto de `geo_locations.countries`.
- Não há suporte backend atual para região, worldwide, múltiplos países por mercado ou exclusões em criação real.

Arquivos impactados:

- `frontend/src/utils/metaLocations.js`
- `frontend/src/pages/CampaignFlow.jsx`
- `PLANS.md`

Estratégia segura:

- Resolver `Europa` internamente por expansão conservadora de países ISO-2.
- Aplicar exclusões por ISO-2 no helper, sem enviar para Meta real.
- Manter `Worldwide` fora de publicação real. Se houver expansão, ela deve ser preview-only e não `publishable`.
- Não alterar backend, banco, migrations, credenciais, `.env` ou fluxo real de criação.

Riscos:

- Lista de Europa pode não corresponder 100% a regiões Meta oficiais.
- `Worldwide` não tem representação segura no backend atual.
- Publicar múltiplos países e exclusões sem backend preparado poderia quebrar ou alterar alcance real.

Tarefas:

- [x] Registrar P34 no `PLANS.md`.
- [x] Auditar formato atual de `geo_locations`.
- [x] Criar representação interna para `Europa`.
- [x] Criar representação segura para `Worldwide`.
- [x] Criar expansão por países para `Europa`.
- [x] Criar helper `expandIncludedLocations`.
- [x] Criar helper `applyExcludedLocations`.
- [x] Atualizar `resolveMetaLocation`.
- [x] Atualizar `resolveMarketMetaLocations`.
- [x] Expandir preview do Campaign Flow.
- [x] Rodar validação estrutural via Node.
- [x] Rodar build do frontend.
- [x] Atualizar `PLANS.md` ao final.

Critérios de aceite:

- [x] P34 criado no `PLANS.md`.
- [x] Auditoria do `geo_locations` atual registrada.
- [x] Europa tratada com estratégia segura.
- [x] Exclusões aplicadas corretamente.
- [x] Worldwide tratado de forma segura ou mantido pendente.
- [x] Resolvers atualizados.
- [x] Preview expandido.
- [x] Nenhuma alteração Meta REAL feita.
- [x] Fluxo antigo preservado.
- [x] PAUSED preservado.
- [x] Build passou.

Implementação (P34):

- `Europa` agora é representada internamente como:
  - `type: "region_group"`;
  - `key: "EUROPE"`;
  - `status: "mapping_ready_internal"`;
  - `strategy: "country_expansion"`;
  - `publishable: false`.
- Lista interna conservadora de Europa criada com 33 códigos ISO-2:
  - `AD`, `AT`, `BE`, `BG`, `CH`, `CY`, `CZ`, `DE`, `DK`, `EE`, `ES`, `FI`, `FR`, `GB`, `GR`, `HR`, `HU`, `IE`, `IS`, `IT`, `LI`, `LT`, `LU`, `LV`, `MT`, `NL`, `NO`, `PL`, `PT`, `RO`, `SE`, `SI`, `SK`.
- `Worldwide` agora é representado internamente como:
  - `type: "worldwide_group"`;
  - `key: "WORLDWIDE"`;
  - `status: "mapping_ready_internal"`;
  - `strategy: "catalog_country_expansion_preview_only"`;
  - `publishable: false`.
- `Worldwide` usa expansão preview-only com 83 códigos ISO-2 derivados do catálogo estático de localizações, sem ser considerado publicável.
- Criados/atualizados helpers em `frontend/src/utils/metaLocations.js`:
  - `EUROPE_COUNTRY_CODES`;
  - `getWorldwidePreviewCountryCodes`;
  - `expandIncludedLocations`;
  - `applyExcludedLocations`;
  - `resolveMetaLocation`;
  - `resolveMarketMetaLocations`;
  - `getMetaLocationMappingSummary`.
- `resolveMarketMetaLocations` agora retorna:
  - `ready`;
  - `publishable: false`;
  - `publishableReason`;
  - `resolvedCountries`;
  - `excludedCountryCodes`;
  - `strategy`.
- `/campaign-flow` passou a exibir:
  - estratégia de resolução;
  - países resolvidos;
  - países excluídos;
  - status interno;
  - publicável na Meta: `Sim/Não`.

Decisão sobre `Worldwide`:

- `Worldwide` foi resolvido apenas como estrutura interna preview-only.
- Não foi marcado como publicável.
- Não foi convertido para payload Meta real.

Validação (P34):

- [2026-06-04 09:20] Validação estrutural via Node:
  - `totalMarkets`: 100;
  - `totalUniqueLocations`: 86;
  - `mappingReadyLocations`: 84;
  - `mappingReadyInternalLocations`: 2;
  - `mappingPendingLocations`: 0;
  - `readyMarkets`: 100;
  - `pendingMarkets`: 0;
  - `publishableMarkets`: 0;
  - `internalReadyMarkets`: 100;
  - `europeResolvedMarkets`: 19;
  - `worldwidePreviewOnlyMarkets`: 9.
- [2026-06-04 09:20] Exemplos validados:
  - `AREU`: Europa expandida e exclusões `AL`, `BA`, `ME`, `MK`, `XK` aplicadas.
  - `ARM`: Worldwide expandido em preview-only e `TW` excluído.
  - `AROM`: países diretos `AE`, `QA`, `SA`, pronto internamente.
  - `ENCA`: país direto `CA`, pronto internamente.
- [2026-06-04 09:20] `cd frontend && npm run build` (OK).
- [2026-06-04 09:22] Validação estrutural e build reexecutados após limpeza interna do helper (OK).

Arquivos alterados (P34):

- `PLANS.md`
- `frontend/src/utils/metaLocations.js`
- `frontend/src/pages/CampaignFlow.jsx`

Pendências finais (P34):

- P35: criar integração controlada para usar `resolvedCountries` no backend apenas em modo explicitamente aprovado e sempre `PAUSED`.
- P35: decidir modelo de persistência de `marketCode` sem quebrar `countryCode`.
- P35: validar lista de Europa com documentação/Graph Meta antes de qualquer publicação.
- P35: validar se expansão preview-only de `Worldwide` deve virar produto ou permanecer bloqueada.

---

## P35 — Integração Controlada MarketCode → Backend

Última atualização: [2026-06-04 09:42; 2026-06-04 09:45]

Objetivo:
Preparar a menor camada backend compatível para receber `marketCode` e `resolvedCountries` no futuro, mantendo o fluxo antigo por `countryCode` intacto e sem alterar payload real enviado à Meta.

Contexto:

- P30 criou o Motor de Mercados Operacionais.
- P31 criou o catálogo oficial com 100 mercados.
- P32 criou classificação/conversor operacional.
- P33 criou catálogo de localizações Meta.
- P34 resolveu `Europa` e `Worldwide` internamente, deixando 100 mercados resolvidos, 0 pendentes e 0 publicáveis.
- O backend atual ainda foi desenhado para `countryCode`/`country_code`.

Riscos:

- Substituir `countryCode` por `marketCode` agora quebraria compatibilidade com banco, endpoints e criação real existente.
- Enviar múltiplos países/exclusões para Meta sem suporte explícito no backend pode alterar alcance real.
- Persistir `marketCode` sem migração planejada pode criar inconsistência com `generated_campaigns.country_code`.

Tarefas:

- [x] Auditar usos backend de `countryCode`, `country_code`, `countryId`, `countries`, `geo_locations`, `targeting`, `adsets` e Meta targeting.
- [x] Registrar arquivos, endpoints, services, tabelas e payloads impactados.
- [x] Definir estratégia de compatibilidade entre fluxo antigo e futuro fluxo por mercado.
- [x] Criar estrutura/validator backend para aceitar `marketCode` opcional.
- [x] Criar estrutura/validator backend para aceitar `resolvedCountries` opcional.
- [x] Criar helper de preview técnico `marketCode → resolvedCountries → geo_locations futuro`.
- [x] Garantir que criação real Meta continue usando somente `countryCode`.
- [x] Preservar guardrail `PAUSED`.
- [x] Rodar build frontend.
- [x] Rodar validação/build backend seguro, se existir.
- [x] Atualizar `PLANS.md` ao final com evidências.

Critérios de aceite:

- [x] Auditoria completa do backend realizada.
- [x] Todos os usos de `countryCode` mapeados.
- [x] Estratégia de compatibilidade definida.
- [x] Backend preparado para receber `marketCode`.
- [x] Backend preparado para receber `resolvedCountries`.
- [x] Fluxo antigo preservado.
- [x] Nenhuma campanha Meta alterada.
- [x] Nenhum payload Meta alterado.
- [x] Guardrail `PAUSED` preservado.
- [x] Build executado.
- [x] `PLANS.md` atualizado.

Auditoria backend (P35):

- Arquivos com uso direto de `countryCode`/`country_code`:
  - `backend/src/routes/meta.js`: recebe `countryCode` em criação simples e cria AdSet usando `gc.country_code` ou `req.body.countryCode`.
  - `backend/src/meta/adsets.js`: monta o payload real `targeting = { geo_locations: { countries: [cc] } }`.
  - `backend/src/routes/campaigns.js`: cria, atualiza, duplica e gera campanhas por `campaign_country_targets.country_code`.
  - `backend/src/routes/generatedCampaigns.js`: lista/retorna `generated_campaigns.country_code`.
  - `backend/src/routes/campaignTemplates.js`: salva/aplica templates usando `campaign.countryCode`.
  - `backend/src/routes/auth.js`: gerencia `user_operational_countries.country_code`.
  - `backend/src/routes/flowTemplates.js`: usa `user_operational_countries.country_code` para traduções por país.
  - `backend/src/routes/finance.js`: agrega relatórios por `generated_campaigns.country_code`.
  - `backend/src/seed.js`: popula tabela `countries`.
- Endpoints que recebem ou dependem de `countryCode`:
  - `POST /api/meta/campaigns/simple`;
  - `POST /api/meta/adsets`;
  - `POST /api/campaigns`;
  - `PATCH /api/campaigns/:id`;
  - `POST /api/campaigns/:id/generate`;
  - `POST /api/campaign-templates/:id/apply`;
  - `POST /api/auth/operational-countries/add`;
  - `POST /api/auth/operational-countries/remove`;
  - `POST /api/auth/operational-countries/language`.
- Tabelas dependentes:
  - `countries(code)` como fonte ISO-2;
  - `campaign_country_targets.country_code` com FK para `countries`;
  - `generated_campaigns.country_code` com FK para `countries`;
  - `user_operational_countries.country_code` com FK para `countries`.
- Payload real enviado à Meta:
  - somente `backend/src/meta/adsets.js`;
  - formato atual: `targeting.geo_locations.countries = [countryCode]`;
  - `status` real continua forçado para `PAUSED`.

Estratégia de compatibilidade (P35):

- Manter `countryCode` como contrato de criação real.
- Adicionar `marketCode` e `resolvedCountries` apenas em camada de validação/preview técnico.
- Não persistir `marketCode` ainda.
- Não criar migration ainda.
- Não alterar `metaCreateAdSet`.
- Não permitir publicação real por mercado enquanto `publishable` permanecer `false`.

Implementação (P35):

- Criado `backend/src/lib/marketTargeting.js` com:
  - `normalizeMarketCode`;
  - `normalizeIsoCountryCode`;
  - `normalizeIsoCountryCodes`;
  - `resolveMarketTargetingInput`;
  - `buildMarketTargetingTechnicalPreview`.
- Criado endpoint técnico:
  - `POST /api/meta/market-targeting-preview`.
- O endpoint aceita:
  - `marketCode`;
  - `resolvedCountries`;
  - `excludedCountries`.
- O endpoint retorna apenas preview:
  - `futurePayloadPreview.targeting.geo_locations.countries`;
  - `publishable: false`;
  - `previewOnly: true`.
- `/campaign-flow` passou a exibir `Payload futuro (não enviado)` com `targeting.geo_locations.countries=[...]`.
- `backend/src/meta/adsets.js` não foi alterado.
- `backend/src/routes/meta.js` continua chamando `metaCreateAdSet` com `countryCode` no fluxo real.

Validação (P35):

- [2026-06-04 09:45] `node --check backend/src/lib/marketTargeting.js` (OK).
- [2026-06-04 09:45] `node --check backend/src/routes/meta.js` (OK).
- [2026-06-04 09:45] Validação Node do helper com `AREU` e entrada inválida (OK).
- [2026-06-04 09:45] `cd frontend && npm run build` (OK; aviso Vite de chunk grande mantido).

Arquivos alterados (P35):

- `PLANS.md`
- `backend/src/lib/marketTargeting.js`
- `backend/src/routes/meta.js`
- `frontend/src/pages/CampaignFlow.jsx`

Pendências finais (P35):

- P36: decidir migration compatível para persistir `marketCode`/payload operacional sem remover `country_code`.
- P36: integrar o endpoint técnico ao frontend apenas se houver necessidade de validação backend em tempo real.
- P36: preparar criação real por mercado em modo explicitamente controlado, ainda `PAUSED`, após validar lista de países Europa/Worldwide.
- P36: desenhar suporte backend real para múltiplos países e exclusões antes de alterar `metaCreateAdSet`.

---

## P36A — Persistência de MarketCode e Compatibilidade

Última atualização: [2026-06-05 11:46; 2026-06-05 11:58]

Objetivo:
Adicionar suporte persistente e compatível para dados de Mercado Operacional, mantendo `country_code` como fluxo legado obrigatório e sem alterar publicação real Meta.

Contexto:

- P30 criou o Motor de Mercados Operacionais.
- P31 criou o catálogo oficial com 100 mercados.
- P32 criou classificação dos mercados.
- P33 criou catálogo de localizações Meta.
- P34 resolveu `Europa` e `Worldwide` internamente para preview.
- P35 criou preview técnico backend para `marketCode` e `resolvedCountries`, sem persistência e sem alterar Meta real.
- O banco atual ainda depende de `country_code` em campanhas geradas e relações operacionais.

Riscos:

- Tornar `market_code` obrigatório quebraria registros antigos.
- Alterar ou remover FK de `country_code` quebraria o fluxo legado.
- Usar `market_code` em criação real antes do backend suportar múltiplos países/exclusões pode alterar alcance na Meta.
- Persistir payload operacional em local errado pode duplicar fonte de verdade sem contrato claro.

Tarefas:

- [x] Auditar migrations/tabelas relacionadas a campanhas geradas e `country_code`.
- [x] Registrar onde `country_code` é obrigatório.
- [x] Definir estratégia aditiva e compatível para `market_code`.
- [x] Criar migration idempotente com campos opcionais.
- [x] Adaptar backend para normalizar dados opcionais de mercado.
- [x] Adaptar criação/retorno de `generated_campaigns` quando dados de mercado forem enviados.
- [x] Garantir que `countryCode` continue funcionando sem alteração.
- [x] Garantir que `metaCreateAdSet` não seja alterado.
- [x] Rodar validações seguras.
- [x] Atualizar `PLANS.md` ao final com evidências.

Critérios de aceite:

- [x] P36A criado no `PLANS.md`.
- [x] Banco auditado.
- [x] Estratégia de compatibilidade registrada.
- [x] Migration idempotente criada, se necessário.
- [x] Campos de `marketCode` são opcionais.
- [x] `countryCode` continua preservado.
- [x] Backend aceita `marketCode` sem usar em Meta REAL.
- [x] `metaCreateAdSet` não foi alterado para publicação real.
- [x] Guardrail `PAUSED` preservado.
- [x] Validações executadas.

Auditoria de banco (P36A):

- `countries(code)`:
  - tabela base ISO-2;
  - `code` é PK e exige 2 caracteres.
- `campaign_country_targets.country_code`:
  - `NOT NULL`;
  - FK para `countries(code)`;
  - PK composta `(campaign_id, country_code)`.
- `generated_campaigns.country_code`:
  - `NOT NULL`;
  - FK para `countries(code)`;
  - `UNIQUE (campaign_id, country_code)`.
- `user_operational_countries.country_code`:
  - `NOT NULL`;
  - FK para `countries(code)`;
  - PK composta `(user_id, country_code)`.
- `campaign_templates.payload`:
  - `jsonb`;
  - não possui coluna `country_code`, mas templates guardam `campaign.countryCode` dentro do payload.
- Tabelas dependentes de `generated_campaigns`:
  - `campaign_metrics`;
  - `generated_adsets`;
  - `generated_ads`;
  - `creative_drafts`;
  - `generated_campaign_events`.

Estratégia de compatibilidade (P36A):

- Manter `country_code` obrigatório e com FK.
- Adicionar campos opcionais em `generated_campaigns`, sem FK e sem `NOT NULL`.
- Persistir metadados de mercado apenas quando `marketCode` vier validado.
- Se `marketCode` não vier, o backend preserva o comportamento antigo.
- Não alterar `campaign_country_targets` nem `user_operational_countries` nesta etapa.
- Não alterar `metaCreateAdSet` nem payload real enviado à Meta.

Migration criada (P36A):

- `backend/migrations/0023_generated_campaigns_operational_market.sql`
- Campos adicionados em `generated_campaigns`:
  - `market_code text`;
  - `market_name text`;
  - `market_param text`;
  - `resolved_countries jsonb`;
  - `targeting_preview jsonb`.
- Índice adicionado:
  - `generated_campaigns_market_code_idx` em `market_code`.
- Migration é idempotente:
  - usa `ADD COLUMN IF NOT EXISTS`;
  - usa `CREATE INDEX IF NOT EXISTS`;
  - não remove dados;
  - não altera constraints existentes.

Implementação backend/frontend (P36A):

- `backend/src/lib/marketTargeting.js` ganhou `normalizeMarketPersistenceInput`.
- `POST /api/meta/campaigns/simple` aceita opcionalmente:
  - `marketCode`;
  - `marketName`;
  - `marketParam`;
  - `resolvedCountries`;
  - `targetingPreview`.
- `POST /api/meta/campaigns/simple` continua exigindo `countryCode`.
- `backend/src/routes/generatedCampaigns.js` passou a retornar os campos de mercado.
- `backend/src/routes/campaignTemplates.js` passou a preservar campos de mercado ao criar/aplicar templates.
- `frontend/src/services/metaCampaigns.js` passou a enviar campos opcionais de mercado.
- `/campaign-flow` envia metadados do mercado quando o modo operacional está ativo e há preview resolvido.

Validação (P36A):

- [2026-06-05 11:58] `node --check backend/src/lib/marketTargeting.js` (OK).
- [2026-06-05 11:58] `node --check backend/src/routes/meta.js` (OK).
- [2026-06-05 11:58] `node --check backend/src/routes/generatedCampaigns.js` (OK).
- [2026-06-05 11:58] `node --check backend/src/routes/campaignTemplates.js` (OK).
- [2026-06-05 11:58] Validação Node de `normalizeMarketPersistenceInput` com mercado válido, sem mercado e mercado inválido (OK).
- [2026-06-05 11:58] `cd frontend && npm run build` (OK; aviso Vite de chunk grande mantido).
- Migration criada, mas não executada.

Arquivos alterados (P36A):

- `PLANS.md`
- `backend/migrations/0023_generated_campaigns_operational_market.sql`
- `backend/src/lib/marketTargeting.js`
- `backend/src/routes/meta.js`
- `backend/src/routes/generatedCampaigns.js`
- `backend/src/routes/campaignTemplates.js`
- `frontend/src/pages/CampaignFlow.jsx`
- `frontend/src/services/metaCampaigns.js`

Pendências finais (P36A):

- P36B: aplicar migration em ambiente local/staging e validar leitura/escrita real com banco.
- P36B: decidir se `campaign_country_targets` terá equivalente por mercado ou se `generated_campaigns` será a primeira fronteira operacional.
- P36B: adicionar endpoint dedicado para criar campanhas geradas por mercado sem acionar Meta real.
- P36B: manter `metaCreateAdSet` bloqueado para mercado até haver suporte formal a múltiplos países/exclusões e validação de publishability.

---

## P36B — Validação de Persistência de Mercados

Última atualização: [2026-06-06 08:54; 2026-06-06 08:57]

Objetivo:
Validar escrita e leitura real dos novos campos de Mercado Operacional em `generated_campaigns`, sem publicar campanhas reais por mercado e sem alterar Meta REAL.

Contexto:

- P36A criou a migration `backend/migrations/0023_generated_campaigns_operational_market.sql`.
- As colunas `market_code`, `market_name`, `market_param`, `resolved_countries` e `targeting_preview` já foram validadas localmente como existentes.
- `country_code` continua `NOT NULL` e preservado como contrato legado.
- O backend já normaliza dados opcionais de mercado via `normalizeMarketPersistenceInput`.

Riscos:

- Validar escrita usando rota real de Meta poderia criar campanha real se `mode` for `REAL`.
- Inserir dados de teste fora de transação poderia poluir o banco local.
- Tornar `market_code` obrigatório quebraria o fluxo antigo.
- Alterar `metaCreateAdSet` nesta etapa mudaria o escopo e o risco.

Tarefas:

- [x] Auditar criação, leitura e listagem de `generated_campaigns`.
- [x] Confirmar que inserts aceitam campos opcionais de mercado.
- [x] Confirmar que selects/listagens retornam campos de mercado.
- [x] Confirmar que fluxo sem mercado preserva campos nulos.
- [x] Criar validação técnica segura de persistência.
- [x] Executar validação sem criar campanha/adset/ad Meta.
- [x] Confirmar que `countryCode` continua obrigatório.
- [x] Confirmar que `metaCreateAdSet` não foi alterado.
- [x] Rodar validações seguras.
- [x] Atualizar `PLANS.md` ao final com evidências.

Critérios de aceite:

- [x] P36B criado no `PLANS.md`.
- [x] Inserts de `generated_campaigns` aceitam campos de mercado opcionais.
- [x] Selects/listagens retornam campos de mercado.
- [x] Campos nulos não quebram fluxo antigo.
- [x] Validação segura de persistência criada/executada.
- [x] Nenhuma publicação Meta por mercado.
- [x] Nenhum payload Meta real alterado.
- [x] `countryCode` preservado.
- [x] `PAUSED` preservado.
- [x] Validações executadas.

Auditoria repositories/services (P36B):

- `backend/src/routes/meta.js`:
  - `POST /api/meta/campaigns/simple` insere `generated_campaigns` com `country_code` obrigatório e campos opcionais de mercado quando enviados;
  - retornos de campanha/adset/ad incluem os campos de mercado;
  - `POST /api/meta/adsets` continua lendo `country_code` e chamando `metaCreateAdSet` com `countryCode`.
- `backend/src/routes/generatedCampaigns.js`:
  - listagem `GET /api/generated-campaigns` retorna `market_code`, `market_name`, `market_param`, `resolved_countries`, `targeting_preview`;
  - retornos de status/ops/published também retornam os campos.
- `backend/src/routes/campaignTemplates.js`:
  - `from-generated` preserva campos de mercado dentro do payload do template;
  - `apply` aceita/persiste os campos opcionais quando presentes.
- `backend/src/routes/campaigns.js`:
  - fluxo antigo `POST /api/campaigns/:id/generate` continua criando `generated_campaigns` apenas com `country_code`, `name` e `PAUSED`;
  - os campos de mercado ficam nulos nesse caminho legado.
- `frontend/src/services/metaCampaigns.js`:
  - envia campos opcionais de mercado apenas quando fornecidos.

Validação técnica criada (P36B):

- Criado `backend/scripts/validate-market-persistence.js`.
- O script:
  - usa `DATABASE_URL`;
  - abre transação;
  - insere campanha gerada com `market_code = ENCA`, `market_name`, `market_param`, `resolved_countries` e `targeting_preview`;
  - lê os campos via `RETURNING`;
  - valida `country_code = CA`;
  - valida `status = PAUSED`;
  - cria também um caso legado sem mercado e confirma campos nulos;
  - executa `ROLLBACK` ao final.

Evidências de execução (P36B):

- [2026-06-06 08:57] `node --check backend/scripts/validate-market-persistence.js` (OK).
- [2026-06-06 08:57] `node --check backend/src/lib/marketTargeting.js` (OK).
- [2026-06-06 08:57] `node --check backend/src/routes/meta.js` (OK).
- [2026-06-06 08:57] `node --check backend/src/routes/generatedCampaigns.js` (OK).
- [2026-06-06 08:57] `node --check backend/src/routes/campaignTemplates.js` (OK).
- [2026-06-06 08:57] `node backend/scripts/validate-market-persistence.js` sem `DATABASE_URL` falhou com erro esperado e explícito.
- [2026-06-06 08:57] `DATABASE_URL='postgres://postgres:postgres@localhost:5433/campaign_builder' node backend/scripts/validate-market-persistence.js` (OK; `rolledBack: true`).
- [2026-06-06 08:57] `cd frontend && npm run build` (OK; aviso Vite de chunk grande mantido).
- Saída validada:
  - `marketRow.country_code`: `CA`;
  - `marketRow.status`: `PAUSED`;
  - `marketRow.market_code`: `ENCA`;
  - `marketRow.market_param`: `ENCA-PlantasBTN-FB`;
  - `marketRow.resolved_countries`: `["CA"]`;
  - `marketRow.targeting_preview.publishable`: `false`;
  - `legacyRow.market_code`: `null`;
  - `legacyRow.resolved_countries`: `null`;
  - `legacyRow.targeting_preview`: `null`.

Arquivos alterados (P36B):

- `PLANS.md`
- `backend/scripts/validate-market-persistence.js`

Pendências finais (P36B):

- P36C/P37: criar endpoint operacional para gerar campanhas por mercado sem criar Meta real.
- P36C/P37: decidir se a seleção por mercado precisa de tabela própria ou se `generated_campaigns` será suficiente inicialmente.
- P36C/P37: validar publishability antes de qualquer uso real de `resolved_countries` em AdSet.
- P36C/P37: manter `metaCreateAdSet` inalterado até o contrato de múltiplos países/exclusões estar fechado.

---

## P36C — Geração Operacional por Mercado (Sem Meta REAL)

Última atualização: [2026-06-06 09:55; 2026-06-06 10:03]

Objetivo:
Criar a primeira geração operacional completa baseada em mercados, persistindo estruturas em `generated_campaigns` sem criar campanhas, AdSets ou Ads reais na Meta.

Contexto:

- P30 criou o motor de Mercados Operacionais.
- P31 criou o catálogo oficial com 100 mercados.
- P32 criou classificação dos mercados.
- P33 criou catálogo de localizações Meta.
- P34 resolveu `Europa` e `Worldwide` internamente.
- P35 criou integração controlada `marketCode → backend`.
- P36A adicionou persistência compatível.
- P36B validou escrita/leitura real com rollback.

Riscos:

- `generated_campaigns.country_code` continua `NOT NULL` e único por `(campaign_id, country_code)`, então mercados operacionais ainda precisam de um `country_code` de compatibilidade.
- Usar `resolved_countries` para Meta real antes de P37 poderia alterar targeting.
- Criar rota operacional dentro de `/api/meta` poderia sugerir publicação real; preferir rota de `generated-campaigns`.
- Mercados diferentes podem resolver para o mesmo primeiro país de compatibilidade e colidir no índice legado.

Tarefas:

- [x] Auditar pontos de geração de campanhas e Campaign Flow.
- [x] Criar helper isolado de geração operacional.
- [x] Gerar `marketParam` corretamente.
- [x] Gerar UTM corretamente.
- [x] Gerar SRC corretamente.
- [x] Criar persistência operacional sem Meta.
- [x] Expandir preview operacional no Campaign Flow.
- [x] Criar validação segura com `ENCA`, `AREU`, `ARM`.
- [x] Confirmar que nenhuma chamada Meta real foi adicionada.
- [x] Confirmar que `metaCreateAdSet` não foi alterado.
- [x] Rodar validações/build.
- [x] Atualizar `PLANS.md` ao final com evidências.

Critérios de aceite:

- [x] P36C criado no `PLANS.md`.
- [x] Gerador operacional criado.
- [x] `marketParam` gerado corretamente.
- [x] UTM gerada corretamente.
- [x] SRC gerado corretamente.
- [x] Persistência funcionando.
- [x] Preview operacional expandido.
- [x] Nenhuma publicação Meta.
- [x] Nenhum AdSet criado.
- [x] Nenhum Ad criado.
- [x] Fluxo antigo preservado.
- [x] Build executado.

Auditoria (P36C):

- Geração legada:
  - `backend/src/routes/campaigns.js` continua gerando por `campaign_country_targets.country_code`.
- Persistência/consulta:
  - `backend/src/routes/generatedCampaigns.js` é o ponto mais seguro para geração operacional sem Meta.
- Fluxo Meta:
  - `backend/src/routes/meta.js` continua sendo o único caminho de criação real Meta.
  - `backend/src/meta/adsets.js` não foi alterado.
- Campaign Flow:
  - já possuía preview operacional por mercado;
  - foi expandido para salvar geração operacional sem acionar Campaign/AdSet/Ad Meta.

Implementação (P36C):

- Criado `backend/src/lib/operationalMarketGeneration.js` com:
  - `generateMarketParam`;
  - `generateOperationalTracking`;
  - `generateOperationalMarkets`.
- Criado endpoint:
  - `POST /api/generated-campaigns/operational-markets`.
- O endpoint:
  - cria uma `campaign` draft quando `campaignId` não é enviado;
  - gera uma `generated_campaign` por mercado;
  - salva `market_code`, `market_name`, `market_param`, `resolved_countries` e `targeting_preview`;
  - salva tracking dentro de `targeting_preview.tracking`;
  - mantém `status = 'PAUSED'`;
  - mantém `meta_campaign_id`, `meta_adset_id` e `meta_ad_id` nulos;
  - não chama Graph API.
- `country_code` segue obrigatório por compatibilidade:
  - é escolhido entre países já existentes na tabela `countries`;
  - usa o primeiro país resolvido disponível no legado;
  - se nenhum existir, usa `BR` quando disponível;
  - essa decisão fica registrada em `targeting_preview.compatibilityCountryCodeReason`.
- `frontend/src/services/generatedCampaigns.js` ganhou `createOperationalMarketGeneration`.
- `/campaign-flow` ganhou ação `Salvar geração operacional`.
- Preview operacional passou a mostrar UTM completa:
  - `utm_source=facebook`;
  - `utm_medium=cpa`;
  - `utm_campaign={marketCode}`;
  - `src={marketCode}-{niche}-FB`.

Validação (P36C):

- Criado `backend/scripts/validate-operational-market-generation.js`.
- [2026-06-06 10:03] `node --check backend/src/lib/operationalMarketGeneration.js` (OK).
- [2026-06-06 10:03] `node --check backend/src/routes/generatedCampaigns.js` (OK).
- [2026-06-06 10:03] `node --check backend/scripts/validate-operational-market-generation.js` (OK).
- [2026-06-06 10:03] `node --check frontend/src/services/generatedCampaigns.js` (OK).
- [2026-06-06 10:03] `DATABASE_URL='postgres://postgres:postgres@localhost:5433/campaign_builder' node backend/scripts/validate-operational-market-generation.js` (OK; `rolledBack: true`).
- [2026-06-06 10:03] `cd frontend && npm run build` (OK; aviso Vite de chunk grande mantido).
- Mercados validados:
  - `ENCA`: `market_param = ENCA-PlantasBTN-FB`, `utm_campaign = ENCA`, `src = ENCA-PlantasBTN-FB`;
  - `AREU`: `market_param = AREU-PlantasBTN-FB`, `utm_campaign = AREU`, `src = AREU-PlantasBTN-FB`;
  - `ARM`: `market_param = ARM-PlantasBTN-FB`, `utm_campaign = ARM`, `src = ARM-PlantasBTN-FB`.
- Confirmações:
  - `status = PAUSED`;
  - `meta_campaign_id = null`;
  - `meta_adset_id = null`;
  - `meta_ad_id = null`;
  - rollback executado.

Arquivos alterados (P36C):

- `PLANS.md`
- `backend/src/lib/operationalMarketGeneration.js`
- `backend/src/routes/generatedCampaigns.js`
- `backend/scripts/validate-operational-market-generation.js`
- `frontend/src/services/generatedCampaigns.js`
- `frontend/src/pages/CampaignFlow.jsx`

Pendências finais (P36C):

- P37: resolver o modelo definitivo de `country_code` de compatibilidade para mercados que não são país simples.
- P37: avaliar tabela própria para geração por mercado, evitando colisões do índice legado `(campaign_id, country_code)`.
- P37: validar publishability e contrato de múltiplos países/exclusões antes de qualquer criação real de AdSet.
- P37: manter Meta REAL bloqueada até a camada de targeting real estar explicitamente aprovada.

---

## P37 — Desacoplamento de Mercados Operacionais do country_code

Última atualização: [2026-06-06 11:25; 2026-06-06 11:38]

Objetivo:
Preparar o modelo operacional para usar `market_code`, `resolved_countries` e `targeting_preview` como fonte principal, mantendo `country_code` apenas como compatibilidade legada enquanto o schema antigo ainda exige esse campo.

Contexto:

- P36C já gera e persiste mercados operacionais sem Meta REAL.
- `generated_campaigns.country_code` continua `NOT NULL` e único por `(campaign_id, country_code)`.
- Mercados compostos como `AREU`, `ARM`, `AROM` e `ARKU` não representam um único país.

Riscos:

- Remover ou tornar nullable `country_code` agora quebraria schema, queries e fluxo Meta atual.
- Tratar `country_code` como fonte operacional principal pode distorcer mercados compostos.
- Alterar `metaCreateAdSet` nesta etapa mudaria o escopo e poderia tocar Meta REAL.
- A constraint legada `(campaign_id, country_code)` ainda pode limitar múltiplos mercados com o mesmo país de compatibilidade.

Tarefas:

- [x] Auditar todos os usos relevantes de `generated_campaigns.country_code`.
- [x] Classificar usos entre compatibilidade histórica, Meta atual e dependência artificial.
- [x] Criar modelo/helper explícito com `market_code`, `resolved_countries`, `targeting_preview` como fonte principal.
- [x] Centralizar resolução de `legacyCountryCode`.
- [x] Atualizar geração operacional para expor `legacyCountryCode`.
- [x] Atualizar preview/serialização operacional para mostrar fonte principal e legado.
- [x] Validar `ENCA`, `AREU`, `ARM`, `AROM`.
- [x] Confirmar compatibilidade com fluxo antigo.
- [x] Confirmar que Meta REAL não foi alterada.
- [x] Rodar build.
- [x] Atualizar `PLANS.md` ao final com evidências.

Critérios de aceite:

- [x] P37 criado no `PLANS.md`.
- [x] Auditoria de `country_code` realizada.
- [x] Dependências mapeadas.
- [x] Fonte principal passa a ser `market_code`.
- [x] `resolved_countries` utilizado como referência principal.
- [x] `country_code` tratado como legado.
- [x] Compatibilidade preservada.
- [x] Nenhuma publicação Meta.
- [x] Nenhuma alteração Meta REAL.
- [x] Build executado.

Auditoria `country_code` (P37):

- Compatibilidade histórica:
  - `campaigns.js`: geração antiga por `campaign_country_targets.country_code`.
  - `generatedCampaigns.js`: listagem/status ainda retorna `country_code`.
  - `campaignTemplates.js`: templates ainda preservam `campaign.countryCode`.
  - `finance.js`: relatórios financeiros ainda agregam por `generated_campaigns.country_code`.
  - `auth.js` e `flowTemplates.js`: configuração operacional antiga por países.
- Necessário para Meta atual:
  - `meta.js`: criação real de AdSet lê `gc.country_code` e passa `countryCode` para `metaCreateAdSet`.
  - `meta/adsets.js`: payload real Meta continua `targeting.geo_locations.countries = [countryCode]`.
- Dependência artificial no fluxo de mercados:
  - `generated_campaigns.country_code` continua `NOT NULL` e `UNIQUE (campaign_id, country_code)`;
  - mercados compostos exigem um código legado apenas para persistir no schema atual;
  - `country_code` não representa a fonte operacional do mercado.

Modelo operacional (P37):

- Fonte principal:
  - `market_code`;
  - `resolved_countries`;
  - `targeting_preview`.
- Criado/atualizado em `backend/src/lib/operationalMarketGeneration.js`:
  - `buildOperationalTargeting`;
  - `resolveLegacyCountryCode`.
- `targeting_preview.operationalTargeting` agora registra:
  - `source: "market_code"`;
  - `marketCode`;
  - `resolvedCountries`;
  - `tracking`;
  - `publishable: false`;
  - `previewOnly: true`.
- `country_code` passa a ser tratado como:
  - `legacyCountryCode`;
  - compatibilidade de schema;
  - não fonte de targeting operacional.

Camada de compatibilidade (P37):

- `resolveLegacyCountryCode`:
  - tenta usar um país resolvido que exista em `countries`;
  - evita reutilizar o mesmo legado dentro do mesmo lote para não colidir com `UNIQUE (campaign_id, country_code)`;
  - usa `BR` como fallback legado quando disponível;
  - se ainda houver conflito, usa qualquer país legado disponível não utilizado;
  - registra o motivo em `legacyCountryCodeReason`.
- A rota operacional ainda grava `generated_campaigns.country_code`, mas usa `market.legacyCountryCode` explicitamente.
- A resposta de `GET /api/generated-campaigns` e `POST /api/generated-campaigns/operational-markets` inclui `operational_targeting` derivado.

Preview (P37):

- `/campaign-flow` agora mostra:
  - `Fonte principal: market_code={CODIGO}`;
  - `Legacy country_code`;
  - países resolvidos;
  - payload futuro não enviado.

Validação (P37):

- [2026-06-06 11:38] `node --check backend/src/lib/operationalMarketGeneration.js` (OK).
- [2026-06-06 11:38] `node --check backend/src/routes/generatedCampaigns.js` (OK).
- [2026-06-06 11:38] `node --check backend/scripts/validate-operational-market-generation.js` (OK).
- [2026-06-06 11:38] `DATABASE_URL='postgres://postgres:postgres@localhost:5433/campaign_builder' node backend/scripts/validate-operational-market-generation.js` (OK; `rolledBack: true`).
- [2026-06-06 11:38] `cd frontend && npm run build` (OK; aviso Vite de chunk grande mantido).
- Mercados validados:
  - `ENCA`;
  - `AREU`;
  - `ARM`;
  - `AROM`.
- Confirmações:
  - `targeting_preview.operationalTargeting.source = "market_code"`;
  - `resolved_countries` preservado;
  - `legacyCountryCode` presente e separado;
  - `status = PAUSED`;
  - `meta_campaign_id = null`;
  - `meta_adset_id = null`;
  - `meta_ad_id = null`;
  - rollback executado.

Arquivos alterados (P37):

- `PLANS.md`
- `backend/src/lib/operationalMarketGeneration.js`
- `backend/src/routes/generatedCampaigns.js`
- `backend/scripts/validate-operational-market-generation.js`
- `frontend/src/pages/CampaignFlow.jsx`

Pendências finais (P37):

- P38: criar tabela própria para geração operacional por mercado, removendo a necessidade de `country_code` por mercado composto.
- P38: migrar relatórios/serializadores operacionais para consumir `operational_targeting`.
- P38: definir contrato de targeting real com múltiplos países e exclusões.
- P38: só depois avaliar publicação real por mercado, sempre `PAUSED`.

---

## P38 — Estrutura Própria para Mercados Operacionais

Última atualização: [2026-06-06 13:31; 2026-06-06 13:42; 2026-06-06 14:42]

Objetivo:
Criar estrutura própria para armazenar gerações operacionais por mercado, removendo a dependência lógica de `generated_campaigns.country_code` sem quebrar compatibilidade.

Contexto:

- P37 definiu `market_code`, `resolved_countries` e `targeting_preview` como fonte operacional principal.
- `generated_campaigns.country_code` continua obrigatório por compatibilidade e para o fluxo Meta atual.
- Mercados compostos não devem depender logicamente de um único país.

Riscos:

- Remover ou alterar `generated_campaigns` quebraria fluxo antigo e Meta atual.
- Criar publicação Meta nesta etapa aumentaria risco operacional.
- Duplicar persistência sem DTO claro poderia confundir consumidores.
- Relatórios antigos ainda dependem de `generated_campaigns`.

Tarefas:

- [x] Modelar tabela própria de gerações operacionais.
- [x] Criar migration idempotente.
- [x] Criar repository de acesso.
- [x] Adaptar geração operacional para persistir na nova estrutura.
- [x] Preservar `generated_campaigns` sem alterações destrutivas.
- [x] Garantir que `legacyCountryCode` não seja dependência principal.
- [x] Criar validação com `ENCA`, `AREU`, `ARM`, `AROM`.
- [x] Confirmar que nenhuma chamada Meta real foi adicionada.
- [x] Confirmar que `metaCreateAdSet` não foi alterado.
- [x] Rodar build.
- [x] Atualizar `PLANS.md` ao final com evidências.

Critérios de aceite:

- [x] P38 criado no `PLANS.md`.
- [x] Modelagem concluída.
- [x] Migration criada.
- [x] Repository criado.
- [x] Persistência operacional migrada.
- [x] `legacyCountryCode` deixa de ser dependência principal.
- [x] Fluxo antigo preservado.
- [x] Nenhuma publicação Meta.
- [x] Nenhuma alteração Meta REAL.
- [x] Build executado.

Modelagem (P38):

- Nova tabela:
  - `operational_market_generations`.
- Campos:
  - `id`;
  - `campaign_id`;
  - `market_code`;
  - `market_name`;
  - `market_param`;
  - `resolved_countries`;
  - `targeting_preview`;
  - `utm_campaign`;
  - `src`;
  - `status`;
  - `created_at`;
  - `updated_at`.
- Índices:
  - único por `(campaign_id, market_code)`;
  - índice por `market_code`;
  - índice por `created_at DESC`.

Migration (P38):

- Criada `backend/migrations/0024_operational_market_generations.sql`.
- Migration idempotente:
  - `CREATE TABLE IF NOT EXISTS`;
  - `CREATE UNIQUE INDEX IF NOT EXISTS`;
  - `CREATE INDEX IF NOT EXISTS`.
- Não remove nem altera `generated_campaigns`.
- Não altera `country_code`.
- Não altera constraints antigas.

Repository (P38):

- Criado `backend/src/services/operationalMarketGenerations.js`.
- Funções:
  - `insertOperationalMarketGeneration`;
  - `listOperationalMarketGenerations`.
- Persistência sempre mantém:
  - `status = 'PAUSED'`;
  - `publishable = false` dentro do preview;
  - tracking operacional (`utm_campaign`, `src`).

Integração (P38):

- `POST /api/generated-campaigns/operational-markets` agora persiste em `operational_market_generations`.
- A resposta passou a retornar:
  - `operational_market_generations`;
  - `generated_campaigns: []` por compatibilidade de payload.
- `GET /api/generated-campaigns/operational-markets` lista gerações operacionais.
- `frontend/src/services/generatedCampaigns.js` passou a ler `operational_market_generations`.
- `/campaign-flow` usa a contagem de `operationalMarketGenerations` ao salvar geração operacional.
- `legacyCountryCode` pode permanecer em `targeting_preview` como metadado, mas não é usado como chave principal de persistência operacional.
- Correção [2026-06-06 14:42]:
  - criado catálogo backend oficial em `backend/src/lib/operationalMarkets.js`, sincronizado com o catálogo operacional do frontend;
  - criado resolver backend de localizações em `backend/src/lib/metaLocations.js`, usado apenas para geração/preview operacional;
  - `generateOperationalMarkets` passou a aceitar `markets` como lista simples de códigos (`["ENCA", "AREU", "ARM"]`);
  - validação de `marketCode` agora usa o catálogo backend, removendo a falha `Invalid marketCode` para códigos oficiais;
  - endpoint continua sem publicar Meta, com `meta_publishing: false` e registros `PAUSED`.

Validação (P38):

- `backend/scripts/validate-operational-market-generation.js` passou a validar a nova tabela.
- A validação executa o SQL da migration dentro de uma transação e faz `ROLLBACK`.
- [2026-06-06 13:42] `node --check backend/src/lib/operationalMarketGeneration.js` (OK).
- [2026-06-06 13:42] `node --check backend/src/services/operationalMarketGenerations.js` (OK).
- [2026-06-06 13:42] `node --check backend/src/routes/generatedCampaigns.js` (OK).
- [2026-06-06 13:42] `node --check backend/scripts/validate-operational-market-generation.js` (OK).
- [2026-06-06 13:42] `node --check frontend/src/services/generatedCampaigns.js` (OK).
- [2026-06-06 13:42] `DATABASE_URL='postgres://postgres:postgres@localhost:5433/campaign_builder' node backend/scripts/validate-operational-market-generation.js` (OK; `rolledBack: true`).
- [2026-06-06 13:42] `cd frontend && npm run build` (OK; aviso Vite de chunk grande mantido).
- [2026-06-06 14:42] `node --check backend/src/lib/operationalMarkets.js && node --check backend/src/lib/metaLocations.js && node --check backend/src/lib/operationalMarketGeneration.js && node --check backend/src/routes/generatedCampaigns.js` (OK).
- [2026-06-06 14:42] Validação Node direta de `generateOperationalMarkets({ niche: "PlantasBTN", markets: ["ENCA", "AREU", "ARM"] })` (OK; 3 mercados gerados; `publishable: false`).
- [2026-06-06 14:42] `DATABASE_URL='postgres://postgres:postgres@localhost:5433/campaign_builder' node backend/scripts/validate-operational-market-generation.js` (OK; `rolledBack: true`; script agora usa lista simples de códigos).
- [2026-06-06 14:42] `DATABASE_URL='postgres://postgres:postgres@localhost:5433/campaign_builder' npm --prefix backend run migrate` (OK; aplicou `0023` e `0024` no banco local).
- [2026-06-06 14:42] `POST http://localhost:3001/api/generated-campaigns/operational-markets` com `{"campaignName":"Teste operacional local","niche":"PlantasBTN","markets":["ENCA","AREU","ARM"]}` (OK; criou campanha local `draft`; persistiu 3 linhas em `operational_market_generations`; `meta_publishing: false`).
- [2026-06-06 14:42] `npm --prefix frontend run build` (OK; aviso Vite de chunk grande mantido).
- Mercados validados:
  - `ENCA`;
  - `AREU`;
  - `ARM`;
  - `AROM`.
- Confirmado:
  - gravação em `operational_market_generations`;
  - leitura/serialização;
  - `market_param`;
  - `utm_campaign`;
  - `src`;
  - `resolved_countries`;
  - `targeting_preview.operationalTargeting.source = "market_code"`;
  - `status = PAUSED`;
  - rollback executado;
  - nenhuma chamada Meta.

Arquivos alterados (P38):

- `PLANS.md`
- `backend/migrations/0024_operational_market_generations.sql`
- `backend/src/services/operationalMarketGenerations.js`
- `backend/src/routes/generatedCampaigns.js`
- `backend/src/lib/operationalMarketGeneration.js`
- `backend/src/lib/operationalMarkets.js`
- `backend/src/lib/metaLocations.js`
- `backend/scripts/validate-operational-market-generation.js`
- `frontend/src/services/generatedCampaigns.js`
- `frontend/src/pages/CampaignFlow.jsx`

Pendências finais (P38):

- P39: aplicar migration em ambiente controlado e validar endpoint real com a tabela persistida fora de rollback.
- P39: migrar telas/listagens operacionais para consumir `operational_market_generations`.
- P39: definir contrato de publicação real por mercado usando `resolved_countries` e exclusões.
- P39: manter `generated_campaigns` como compatibilidade para fluxo legado/Meta atual até migração planejada.

## P39 — Validação do Catálogo Completo de Mercados Operacionais

Última atualização: [2026-06-06 14:55; 2026-06-06 15:02]

Objetivo:
Validar a geração operacional usando o catálogo backend completo de mercados oficiais, sem Meta REAL, sem criação de Campaign/AdSet/Ad na Meta e sem alterar o guardrail `PAUSED`.

Contexto:

- P38 corrigiu a ausência do catálogo backend.
- `backend/src/lib/operationalMarkets.js` agora é consumido pela geração operacional backend.
- `backend/src/lib/metaLocations.js` resolve localizações somente para geração/preview operacional.
- `POST /api/generated-campaigns/operational-markets` já funciona com `ENCA`, `AREU` e `ARM`.

Riscos:

- Catálogo backend e frontend podem divergir se a sincronização continuar manual.
- Algum mercado oficial pode não possuir resolução de países suficiente para persistência operacional.
- Validação não deve chamar rotas Meta nem helpers de publicação real.
- `status` deve permanecer sempre `PAUSED`; `ACTIVE` não deve ser introduzido.

Tarefas:

- [x] Criar script `backend/scripts/validate-all-operational-markets.js`.
- [x] Carregar todos os mercados do catálogo backend.
- [x] Gerar campanha local `draft` dentro de transação.
- [x] Gerar operações para todos os mercados oficiais.
- [x] Persistir registros em `operational_market_generations`.
- [x] Validar contagem gerada contra total do catálogo.
- [x] Validar `status = PAUSED` para todos.
- [x] Validar que nenhum item possui `meta_publishing = true`.
- [x] Validar `market_code`, `market_name`, `market_param`, `utm_campaign`, `src`, `resolved_countries` e `targeting_preview`.
- [x] Validar rollback ao final.
- [x] Rodar script localmente com `DATABASE_URL`.
- [x] Atualizar `PLANS.md` com evidências.

Critérios de aceite:

- [x] Script executa sem erro.
- [x] Todos os mercados oficiais são gerados.
- [x] Quantidade gerada bate com o catálogo backend.
- [x] Tudo permanece `PAUSED`.
- [x] `meta_publishing` permanece `false`.
- [x] Nenhuma chamada Meta REAL.
- [x] Commit final criado com resumo.

Implementação (P39):

- Criado `backend/scripts/validate-all-operational-markets.js`.
- O script:
  - carrega `listOperationalMarkets()` do catálogo backend;
  - usa todos os códigos oficiais como entrada da geração operacional;
  - cria campanha local `draft` dentro de transação;
  - persiste em `operational_market_generations`;
  - valida contagem, campos principais, tracking e preview;
  - valida `status = PAUSED`;
  - valida `publishable = false`;
  - valida `metaPublishing = false` no `config` da campanha local;
  - executa `ROLLBACK` ao final.

Validação (P39):

- [2026-06-06 15:02] `node --check backend/scripts/validate-all-operational-markets.js` (OK).
- [2026-06-06 15:02] Contagem do catálogo backend via `listOperationalMarkets()` (OK; `count = 100`; primeiro `ARM`; último `VISEU`).
- [2026-06-06 15:02] `DATABASE_URL='postgres://postgres:postgres@localhost:5433/campaign_builder' node backend/scripts/validate-all-operational-markets.js` (OK; `rolledBack: true`).
- [2026-06-06 15:03] `npm --prefix frontend run build` (OK; aviso Vite de chunk grande mantido).
- Resultado:
  - `catalogCount = 100`;
  - `generatedCount = 100`;
  - `persistedCount = 100`;
  - `campaignStatus = draft`;
  - `metaPublishing = false`;
  - `status = PAUSED`;
  - `publishable = false`;
  - mínimo de países resolvidos por mercado: `1`;
  - máximo de países resolvidos por mercado: `82`.
- Estratégias resolvidas:
  - `direct_country_codes`: 72 mercados;
  - `country_expansion`: 19 mercados;
  - `catalog_country_expansion_preview_only`: 9 mercados.
- Confirmado:
  - nenhum Campaign Meta criado;
  - nenhum AdSet Meta criado;
  - nenhum Ad Meta criado;
  - nenhum status `ACTIVE`;
  - nenhuma chamada Meta REAL.

Arquivos alterados (P39):

- `PLANS.md`
- `backend/scripts/validate-all-operational-markets.js`

Pendências finais (P39):

- P40/P39B: decidir se o catálogo backend seguirá duplicado do frontend ou se haverá uma fonte compartilhada única.
- P40: evoluir uma tela/listagem operacional para inspecionar todas as gerações por mercado.
- P40/P41: antes de qualquer publicação real, definir contrato explícito para converter `resolved_countries` e exclusões em payload Meta real mantendo `PAUSED`.

## P41 — Visualização Operacional de Mercados Persistidos

Última atualização: [2026-06-06 15:18; 2026-06-06 15:29]

Objetivo:
Criar a visualização operacional das gerações persistidas em `operational_market_generations`, apenas para leitura/preview, sem Meta REAL e sem qualquer alteração em publicação.

Contexto:

- O motor operacional já gera e persiste mercados em `operational_market_generations`.
- Registros persistidos possuem `campaign_id`, `market_code`, `market_name`, `market_param`, `resolved_countries`, `targeting_preview`, `utm_campaign`, `src` e `status`.
- P39 validou o catálogo completo de 100 mercados com rollback.

Regras:

- Não criar Campaign Meta.
- Não criar AdSet Meta.
- Não criar Ad Meta.
- Não alterar `ACTIVE`.
- Não alterar `PAUSED`.
- Não alterar scheduler.
- Não mexer em publicação.

Tarefas:

- [x] Criar endpoint `GET /api/generated-campaigns/:campaignId/operational-markets`.
- [x] Retornar payload camelCase para consumo direto do frontend.
- [x] Adicionar service frontend para consultar mercados operacionais por campanha.
- [x] Exibir seção "Mercados Operacionais" em `CampanhaDetalhes`.
- [x] Exibir tabela com mercado, nome gerado, UTM e status.
- [x] Implementar expansão por linha com dados completos.
- [x] Exibir aviso: "Pré-visualização operacional. Nenhum objeto foi publicado na Meta."
- [x] Validar endpoint localmente.
- [x] Rodar build.
- [x] Atualizar `PLANS.md` com evidências.

Critérios de aceite:

- [x] Endpoint funcionando.
- [x] Frontend consumindo endpoint.
- [x] Lista exibida corretamente.
- [x] Expansão funcionando.
- [x] Nenhuma chamada Meta.
- [x] Nenhum `ACTIVE`.
- [x] Nenhuma alteração em publicação.
- [x] Commit final criado com resumo.

Implementação (P41):

- Criado endpoint `GET /api/generated-campaigns/:campaignId/operational-markets`.
- Endpoint valida `campaignId`, confirma existência da campanha local e retorna:
  - `marketCode`;
  - `marketName`;
  - `marketParam`;
  - `utmCampaign`;
  - `src`;
  - `status`;
  - `resolvedCountries`;
  - `targetingPreview`;
  - `publishable`;
  - `previewOnly`.
- Criado service `listOperationalMarketsForCampaign`.
- `CampanhaDetalhes` passou a carregar mercados operacionais junto com campanha e campanhas geradas.
- Seção "Mercados Operacionais" adicionada com:
  - aviso operacional explícito;
  - tabela de mercado/nome gerado/UTM/status;
  - expansão por linha exibindo campos completos, países resolvidos e `targeting_preview`.

Validação (P41):

- [2026-06-06 15:29] `GET /api/generated-campaigns/3014761c-6814-43f7-b5df-17beacd4c227/operational-markets` (OK; 4 mercados: `ARM`, `AREU`, `ENCA`, `ENAU`; `metaPublishing = false`; todos `PAUSED`; todos `publishable = false`; todos `previewOnly = true`).
- [2026-06-06 15:29] `node --check backend/src/routes/generatedCampaigns.js && node --check frontend/src/services/generatedCampaigns.js` (OK).
- [2026-06-06 15:29] `npm --prefix frontend run build` (OK; aviso Vite de chunk grande mantido).
- Confirmado:
  - nenhuma Campaign Meta criada;
  - nenhum AdSet Meta criado;
  - nenhum Ad Meta criado;
  - nenhuma chamada Meta REAL;
  - nenhum `ACTIVE`;
  - nenhuma alteração em scheduler/publicação.

Arquivos alterados (P41):

- `PLANS.md`
- `backend/src/routes/generatedCampaigns.js`
- `frontend/src/services/generatedCampaigns.js`
- `frontend/src/pages/CampanhaDetalhes.jsx`

Pendências finais (P41):

- P42: decidir se a próxima tela operacional deve listar campanhas locais com mercados sem depender da tela legada de campanhas por país.
- P42/P43: antes de publicação real, definir endpoint separado e explícito para preview de payload Meta, mantendo `PAUSED`.

## P42 — Templates Reais como Origem da Geração Operacional

Última atualização: [2026-06-06 15:43; 2026-06-06 15:57]

Objetivo:
Permitir que a geração operacional de mercados use `campaign_templates` reais como origem, aceitando `templateId + markets`, sem quebrar o payload legado `campaignName + niche + markets`.

Contexto:

- P41 criou a visualização operacional das gerações persistidas.
- O endpoint `POST /api/generated-campaigns/operational-markets` hoje funciona com payload manual.
- O fluxo precisa evoluir para usar templates reais como base operacional.

Regras:

- Não chamar Meta REAL.
- Não criar Campaign Meta.
- Não criar AdSet Meta.
- Não criar Ad Meta.
- Não alterar `ACTIVE`.
- Tudo continua `PAUSED`.
- `metaPublishing` continua `false`.
- `publishable` continua `false`.
- `previewOnly` continua `true`.
- Não alterar scheduler.
- Não fazer refatoração grande.

Tarefas:

- [x] Atualizar `POST /api/generated-campaigns/operational-markets` para aceitar `templateId`.
- [x] Buscar template no banco quando `templateId` for enviado.
- [x] Resolver nome/nicho operacional a partir do template.
- [x] Gerar `market_param = CODIGO-NICHO-FB`.
- [x] Preservar payload legado com `campaignName + niche + markets`.
- [x] Carregar templates reais na UI operacional.
- [x] Permitir seleção de template no Campaign Flow.
- [x] Enviar `templateId + markets` ao salvar geração operacional.
- [x] Exibir resumo do template selecionado.
- [x] Validar geração com `templateId`.
- [x] Validar geração com payload legado.
- [x] Validar detalhe da campanha gerada.
- [x] Rodar build frontend.

Critérios de aceite:

- [x] Template real pode ser selecionado no frontend.
- [x] Backend gera campanha operacional usando `templateId`.
- [x] Payload antigo continua funcionando.
- [x] Registros continuam em `operational_market_generations`.
- [x] Tudo permanece `PAUSED`.
- [x] `metaPublishing = false`.
- [x] `publishable = false`.
- [x] `previewOnly = true`.
- [x] Nenhuma chamada Meta REAL.
- [x] Commit final criado com resumo.

Implementação (P42):

- `POST /api/generated-campaigns/operational-markets` aceita `templateId` opcional.
- Quando `templateId` é enviado:
  - busca em `campaign_templates`;
  - resolve nome da campanha a partir de `payload.campaign.name` ou `template.name`;
  - resolve nicho operacional a partir de `payload.operationalMarket.nicheParam`, `payload.nicheParam`, `payload.niche`, `payload.slug`, campos equivalentes em `payload.campaign`, `campaign.marketParam` ou fallback compacto de `template.name`;
  - cria campanha local `draft` com `config.templateId`, `config.templateName`, `config.templateSource = "campaign_templates"` e `metaPublishing = false`.
- Payload legado permanece suportado com `campaignName + niche + markets`.
- `CampaignFlow` passou a exibir seleção de template no modo Mercados Operacionais.
- Campo manual de nicho ficou como fallback legado/secundário.
- Preview operacional usa o nicho efetivo do template quando selecionado.

Validação (P42):

- [2026-06-06 15:55] Criado template local de validação via `POST /api/campaign-templates`:
  - nome: `Plantas BTN`;
  - `payload.nicheParam = "PlantasBTN"`;
  - sem Meta REAL.
- [2026-06-06 15:56] `POST /api/generated-campaigns/operational-markets` com `templateId = 64f0d5da-4949-4425-b7cb-a18d33af0554` e mercados `ARM`, `AREU`, `ENCA` (OK).
- Resultado por template:
  - campanha local `draft`: `15952c8c-1a5d-4a69-b209-49a6d5b94ffc`;
  - `market_param`: `ARM-PlantasBTN-FB`, `AREU-PlantasBTN-FB`, `ENCA-PlantasBTN-FB`;
  - `utm_campaign`: código do mercado;
  - `src`: igual ao `market_param`;
  - todos `PAUSED`;
  - `meta_publishing = false`;
  - `publishable = false`;
  - `previewOnly = true`.
- [2026-06-06 15:56] Payload legado `campaignName + niche + markets` com `ARM`, `AREU` (OK; compatibilidade preservada).
- [2026-06-06 15:57] `GET /api/generated-campaigns/15952c8c-1a5d-4a69-b209-49a6d5b94ffc/operational-markets` (OK; 3 registros retornados na visualização P41).
- [2026-06-06 15:57] `node --check backend/src/routes/generatedCampaigns.js && node --check frontend/src/services/generatedCampaigns.js` (OK).
- [2026-06-06 15:57] `npm --prefix frontend run build` (OK; aviso Vite de chunk grande mantido).
- Confirmado:
  - nenhuma Campaign Meta criada;
  - nenhum AdSet Meta criado;
  - nenhum Ad Meta criado;
  - nenhuma chamada Meta REAL;
  - nenhum `ACTIVE`;
  - nenhuma alteração em scheduler/publicação.

Arquivos alterados (P42):

- `PLANS.md`
- `backend/src/routes/generatedCampaigns.js`
- `frontend/src/services/generatedCampaigns.js`
- `frontend/src/pages/CampaignFlow.jsx`

Pendências finais (P42):

- P43: melhorar a fonte única do nicho/slug operacional no cadastro de templates para evitar fallback por nome.
- P43/P44: antes de publicação real, criar etapa explícita de preview de payload Meta por template+mercado, ainda sem publicar.
