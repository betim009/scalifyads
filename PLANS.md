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

Última atualização: [2026-05-26 16:30]

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

- [ ] Configurar LibreTranslate no ambiente:
  - env `LIBRETRANSLATE_URL` (default local sugerido: `http://localhost:5000`)
  - (se fizer sentido) service no `docker-compose.yml` (`libretranslate/libretranslate`, porta `5000`)
- [ ] Backend: criar service para chamar LibreTranslate (retry/timeout básico).
- [ ] Backend: endpoint autenticado para “Gerar traduções” de um template (sem chamar do frontend).
- [ ] Persistir variações traduzidas (sem quebrar schema existente; preferir `payload` jsonb se possível).
- [ ] `/templates`: botão “Gerar traduções” + exibir variações por país/idioma.
- [ ] `/templates`: permitir revisar/editar textos traduzidos e salvar variações.
- [ ] `/campaign-flow`: ao executar lote, usar a variação correta por país quando existir.
  - Se não existir tradução para um país, avisar claramente e usar texto base **apenas com confirmação**.
- [ ] Atualizar `RUNBOOK.md`:
  - como subir LibreTranslate;
  - como validar endpoint;
  - como gerar traduções;
  - troubleshooting básico.
- [ ] Atualizar `PROJECT_STATUS.md` se necessário.

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
