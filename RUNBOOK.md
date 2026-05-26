# RUNBOOK — Execução, validação e troubleshooting

## Governança (fonte única de operações)

Última atualização: [2026-05-08 08:48]

- Regra de timestamps (padrão e obrigatoriedade): ver `PLANS.md` em `## Regras de Atualização (OBRIGATÓRIO)`.
- Backlog ativo (único): ver `PLANS.md` em `## Backlog Ativo (ÚNICO)`.
- Este documento existe apenas para execução/validação/troubleshooting (sem checklists históricos competindo com o backlog).
- Conteúdo legado e fases antigas: ver `ARCHIVE.md` em `## RUNBOOK (legado) — não executar`.

## PLAYBOOKS ATUAIS

Última atualização: [2026-05-08 08:48]

### Deploy — Hostinger (Frontend SPA + páginas legais)

Última atualização: [2026-05-20 19:33]

Objetivo:
publicar o frontend React/Vite com rotas SPA funcionando via URL direta (sem `404`) e expor páginas legais públicas exigidas para publicação do App Meta.

Pré-requisitos:

- Domínio com HTTPS ativo (ex.: `https://seudominio.com`)
- Acesso ao `public_html/` (Hostinger File Manager ou FTP)

Build (local):

```bash
cd frontend
npm run build
```

O build deve gerar `frontend/dist/` com:

- `index.html`
- `assets/`
- `.htaccess` (SPA rewrite)

Deploy (Hostinger):

1) Enviar **todo o conteúdo** de `frontend/dist/` para `public_html/`.
2) Confirmar que o arquivo `public_html/.htaccess` existe no servidor.
3) Abrir as rotas diretamente no navegador (aba anônima) e dar refresh:
   - `https://seudominio.com/politica-de-privacidade`
   - `https://seudominio.com/termos-de-uso`
   - `https://seudominio.com/exclusao-de-dados`
4) Verificar headers via `curl` (esperado: `200`):

```bash
curl -I https://seudominio.com/politica-de-privacidade
curl -I https://seudominio.com/termos-de-uso
curl -I https://seudominio.com/exclusao-de-dados
```

Notas:

- Se o site estiver em subpasta (ex.: `https://dominio.com/app/`), ajuste o `RewriteBase` no `.htaccess`.
- As páginas legais são estáticas e não dependem de backend/login.

Preenchimento no painel Meta (App):

- Domínio do aplicativo: `seudominio.com`
- URL da Política de Privacidade: `https://seudominio.com/politica-de-privacidade`
- URL dos Termos de Serviço: `https://seudominio.com/termos-de-uso`
- URL de Exclusão de Dados do Usuário: `https://seudominio.com/exclusao-de-dados`

### Guardrails Meta (OBRIGATÓRIO)

Última atualização: [2026-05-08 08:48]

- **PAUSED obrigatório (dev):** toda criação REAL via backend deve forçar `status=PAUSED` (mesmo que o client envie outro valor).
- **Token nunca no frontend:** token fica apenas no backend (env `META_ACCESS_TOKEN` ou via `POST /api/meta/tokens`).
- **Fluxo atual:** `/meta-test` é o laboratório operacional para evoluir Campaign → AdSet → Ad (o fluxo “Nova Campanha” é legado/compatibilidade).

### P19 — Login interno + credenciais Meta por usuário

Última atualização: [2026-05-26 10:00]

Objetivo:
habilitar autenticação interna simples e permitir que cada usuário configure suas credenciais Meta **sem expor token no frontend**.

Credenciais iniciais (dev):

- username: `beto`
- password: `beto123`

Fluxo (UI):

1) Subir stack + migrations + seed:
   - `docker compose up -d`
   - `docker compose exec backend npm run migrate`
   - `docker compose exec backend npm run seed`
2) Abrir `http://localhost:5173/login` e logar.
3) Abrir `http://localhost:5173/profile` e salvar:
   - `meta_ad_account_id` (ex.: `act_<id>`)
   - `meta_page_id` (para publish do Creative REAL)
   - `meta_access_token` (token fica apenas no backend; UI mostra só `...XXXX`)
4) Operar:
   - `http://localhost:5173/campaign-flow`
   - `http://localhost:5173/meta-test`

Notas:

- Sessão usa cookie `HttpOnly` (não acessível via JS).
- Endpoints `/api/meta/*` exigem login (cookie) quando o DB está habilitado.

### P20 — `/campaign-flow` em lote (múltiplos países)

Última atualização: [2026-05-26 10:25]

Objetivo:
executar criação em lote no `/campaign-flow`, gerando **uma estrutura por país** (Campaign → AdSet → Creative → Ad), mantendo tudo `PAUSED` no modo `REAL`.

Pré-requisitos:

- Login OK (`/login`) e credenciais Meta salvas no `/profile` (token fica só no backend).
- DB habilitado e migrations aplicadas:
  - `docker compose exec backend npm run migrate`
  - `docker compose exec backend npm run seed`

Fluxo (UI):

1) Abrir `http://localhost:5173/campaign-flow`.
2) Ativar “Criação em lote”.
3) Selecionar múltiplos países.
4) Revisão → (se `REAL`) marcar confirmação explícita → executar.

Resultado esperado:

- Um resultado por país (OK/ERRO).
- Falha em um país **não interrompe** os próximos.
- Botão “Abrir /meta-test” por país para troubleshooting.

### P22 — ROI operacional mínimo (`/roi-operacional`)

Última atualização: [2026-05-26 13:05]

Objetivo:
operar decisões simples por campanha usando **gasto (Meta)** + **receita manual** → lucro/prejuízo/ROI, com ações seguras (nunca `ACTIVE`).

Pré-requisitos:

- Login OK (`/login`).
- DB habilitado e migrations aplicadas.
- Métricas de gasto disponíveis em `campaign_metrics` (ex.: via sync/scheduler já existentes).

Fluxo (UI):

1) Abrir `http://localhost:5173/roi-operacional`.
2) Selecionar data (default D-1).
3) Informar **receita manual** por campanha → clicar **Salvar**.
4) Revisar lucro/prejuízo e ROI.
5) Ações:
   - **Pausar** (campanha específica) → exige confirmação.
   - **Pausar negativos** (massa) → exige confirmação e continua mesmo se 1 item falhar.
   - **Orçamento** (AdSet) → exige confirmação e mantém `PAUSED`.

Troubleshooting:

- Se alguma ação REAL falhar, abrir `/meta-test` para diagnóstico (token nunca no frontend).

### P24 — Entrega controlada ao cliente (operação gradual)

Última atualização: [2026-05-26 13:40]

Objetivo:
entregar o Campaign Builder para uso real **com segurança**, mantendo guardrails (**REAL sempre `PAUSED`**) e reduzindo risco operacional.

Princípios (obrigatório):

- Começar pequeno → validar → ajustar → repetir → só depois escalar volume.
- Nunca criar `ACTIVE` e nunca ativar automaticamente.
- Token Meta sempre no backend; nunca no frontend/logs/docs.
- Se algo der errado, **parar, registrar e diagnosticar** (não improvisar).

Checklist de entrega (antes do cliente usar):

- [ ] Stack OK: `docker compose up -d`
- [ ] Backend OK: `curl http://localhost:3001/healthz`
- [ ] DB OK: `docker compose exec backend npm run migrate` + `docker compose exec backend npm run seed`
- [ ] Login OK: abrir `http://localhost:5173/login` e logar
- [ ] Perfil OK: `http://localhost:5173/profile`
  - salvar `meta_ad_account_id`
  - salvar `meta_page_id` (se for usar Creative REAL)
  - salvar `meta_access_token` (token fica apenas no backend; UI mostra `...XXXX`)
- [ ] Guardrails: confirmar que tudo REAL continua `PAUSED` (sem opção `ACTIVE` no UI)
- [ ] Build frontend: `cd frontend && npm run build`

Roteiro operacional inicial (primeiro dia / primeiro lote):

1) Criar 1 campanha (STUB) no `/campaign-flow` para validar o fluxo e entendimento.
2) Criar 1 campanha (REAL) no `/campaign-flow`:
   - revisar Etapa 4
   - marcar confirmação explícita do REAL
   - confirmar no Ads Manager que nasceu `PAUSED`
3) Criar lote pequeno (2–3 países) no `/campaign-flow`:
   - validar que erro em 1 país não interrompe os próximos
   - usar “Abrir /meta-test” só para diagnóstico quando necessário
4) ROI mínimo:
   - abrir `/roi-operacional`
   - preencher receita manual e validar lucro/prejuízo/ROI
   - usar “Pausar negativos” apenas com confirmação explícita

Rotina diária mínima (operação):

- Revisar `/roi-operacional` (D-1) e registrar decisões (pausar/ajustar orçamento) com confirmação.
- Manter volume controlado (não criar “muitas campanhas” sem revisão).
- Se uma ação REAL falhar:
  - abrir `/meta-test` para evidência e troubleshooting;
  - capturar mensagem objetiva de erro (sem token);
  - registrar no `PLANS.md` como incidente/bloqueio operacional.

### P25 — Países e idiomas da operação (base operacional)

Última atualização: [2026-05-26 15:45]

Objetivo:
configurar no `/profile` quais países o usuário opera e qual idioma principal por país (sem tradução automática).

Validação rápida (UI):

1) Abrir `http://localhost:5173/profile`.
2) Em “Países e idiomas da operação”:
   - adicionar um país (ex.: `BR`) e selecionar idioma (ex.: `Português`).
   - adicionar outro país (ex.: `AE`) e selecionar idioma (ex.: `Árabe`).
3) Abrir `http://localhost:5173/campaign-flow`.
4) Ativar lote e confirmar:
   - lista de países segue o perfil;
   - aviso aparece se não houver países configurados;
   - nomes do lote usam o país correto (ex.: `AdSet • BR` vs `AdSet • AE`).

### P26 — Templates multilíngues com LibreTranslate

Última atualização: [2026-05-26 16:30]

Pré-requisitos:

- DB habilitado + login interno funcionando.
- Países e idiomas configurados no `/profile` (P25).

Subir LibreTranslate (Docker Compose):

- `docker compose up -d libretranslate`
- Se a porta `5000` estiver em uso no host, sobrescreva no `.env`:
  - `LIBRETRANSLATE_HOST_PORT` (ex.: `5005`)

Configuração:

- Backend usa `LIBRETRANSLATE_URL`.
  - Default local (host): `http://localhost:5000`
  - No `docker-compose.yml` (backend → container): default `http://libretranslate:5000`

Validar LibreTranslate (host):

- `curl -s -X POST http://localhost:${LIBRETRANSLATE_HOST_PORT:-5000}/translate -H 'Content-Type: application/json' -d '{"q":"Olá mundo","source":"auto","target":"en","format":"text"}'`

Gerar traduções (UI):

1) Logar em `http://localhost:5173/login`.
2) Configurar países/idiomas em `http://localhost:5173/profile`.
3) Criar (ou selecionar) template base em `http://localhost:5173/templates`.
4) Clicar “Gerar traduções”.
5) Revisar/editar `primaryText`, `headline`, `description` por país e clicar “Salvar alterações”.

Validar uso no lote (`/campaign-flow`):

1) Em `/templates`, clicar “Usar no /campaign-flow”.
2) No `/campaign-flow`, executar lote.
3) Esperado:
   - quando existir variação para o país (idioma do `/profile`), o texto do Creative Draft usa a tradução.
   - quando faltar variação, aparece confirmação para usar o texto BASE (sem bloquear a execução).

Troubleshooting:

- Erro ao gerar traduções:
  - confirmar `LIBRETRANSLATE_URL` no backend;
  - confirmar que `libretranslate` está de pé: `curl http://localhost:5000`;
  - se o template não foi salvo após mudar “Country codes”, salvar antes de gerar traduções.

### Demo operacional controlada

Última atualização: [2026-05-25 18:57]

Roteiro completo (passo-a-passo + exemplos + checklists):

- `DEMO_SCRIPT.md`

Checklist de segurança (pré-demo / pós-demo):

- `SAFETY_CHECKLIST.md`

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

### Workflow — Ops state (dev)

Última atualização: [2026-05-19 09:49]

- Atualizar `ops_state` (workflow local) de uma `generated_campaign`:
  - `POST /api/generated-campaigns/<generated_campaign_uuid>/ops-state` (body: `{ "opsState": "draft" | "validated" | "published" }`)

### Workflow — Histórico (dev)

Última atualização: [2026-05-19 10:13]

- Listar eventos do histórico (workflow/publicação): `GET /api/generated-campaigns/<generated_campaign_uuid>/events?limit=50`
- Criar checkpoint manual (workflow): `POST /api/generated-campaigns/<generated_campaign_uuid>/checkpoints`
  - Body: `{ "label": "Validado", "note": "opcional" }`

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

### Campaign Templates — Estrutura base (dev)

Última atualização: [2026-05-19 10:17]

- Listar templates: `GET /api/campaign-templates?limit=50`
- Criar template a partir de uma `generated_campaign` selecionada: `POST /api/campaign-templates/from-generated/<generated_campaign_uuid>` (body opcional: `{ "name": "..." }`)
- Remover template: `DELETE /api/campaign-templates/<template_uuid>`

### Country Templates — Templates de países (dev)

Última atualização: [2026-05-19 09:46]

- Listar templates: `GET /api/country-templates?limit=50`
- Criar template: `POST /api/country-templates` (body: `{ "name": "LATAM", "codes": ["BR","AR"] }`)
- Remover template: `DELETE /api/country-templates/<template_uuid>`

### Templates operacionais — uso atual (console `/meta-test`)

Última atualização: [2026-05-26 14:10]

Estado atual:

- Templates já existem e são operados pelo console `/meta-test` (Campaign/Country/Creative Templates).
- Templates também podem ser aplicados diretamente no `/campaign-flow` (fluxo guiado), para reduzir preenchimento manual e acelerar lote.
- Templates operacionais do cliente agora têm uma página dedicada: `/templates` (gerenciamento) + aplicação no `/campaign-flow`.

Procedimento (hoje):

1) Criar/gerenciar templates no `/meta-test`:
   - Campaign Templates
   - Country Templates
   - Creative Templates
2) (Opcional) Aplicar templates no `/campaign-flow`:
   - Etapa 1: selecionar **Campaign Template** → clicar **Aplicar** (prefill de `name/objective/ad account` + nomes base).
   - (Se lote) Etapa 1: ativar “Criar em lote” → selecionar **Country Template** → clicar **Aplicar** (prefill de países).
   - Etapa 3: selecionar **Creative Template** → clicar **Aplicar** (prefill de copy/URL/CTA).
3) Após executar e criar `generated_campaign`, salvar como template quando fizer sentido:
   - Em “Etapa 5 — Resultado”, clicar **Salvar como template** (gera Campaign Template via backend).
4) Em caso de erro no `/campaign-flow`, abrir `/meta-test` pelo botão “Abrir /meta-test” e seguir o troubleshooting.

Procedimento (cliente / operação):

1) Abrir `http://localhost:5173/templates` para criar/editar/excluir templates operacionais.
2) Selecionar um template e clicar **Usar no /campaign-flow** (abre o wizard com prefill).
3) Executar no `/campaign-flow` com as confirmações (REAL exige confirmação explícita; tudo nasce `PAUSED`).

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
  - revalidar o cenário após a publicação do App Meta (não assumir que o subcode ainda é válido sem nova tentativa real);
  - se persistir, conferir modo do app + roles/permissões (admin/developer/tester) e dependências de Page/Ad Account.
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

### Playbook — Validação manual via `/campaign-flow` (P18)

Última atualização: [2026-05-26 09:40]

Objetivo:
validar o fluxo guiado “limpo” em modo `REAL`, preservando guardrails (**tudo `PAUSED`**, nunca `ACTIVE`) e mantendo o `/meta-test` como laboratório técnico/debug.

Pré-requisitos:

- Stack no ar: `docker compose up -d`
- Backend OK: `curl http://localhost:3001/healthz`
- Token no backend:
  - `curl http://localhost:3001/api/meta/status` (esperado: `hasAccessToken=true`)
  - `curl -X POST http://localhost:3001/api/meta/validate -H 'Content-Type: application/json' -d '{}'`
- Page ID disponível (para publish do Creative REAL):
  - preferir `META_PAGE_ID` no backend **ou** informar `pageId` no formulário do `/campaign-flow`.

Fluxo (UI):

1) Abrir `http://localhost:5173/campaign-flow`.
2) Selecionar modo `REAL (sempre PAUSED)` e preencher:
   - `metaAdAccountId` (`act_<id>`)
   - `objective` (ex.: `OUTCOME_TRAFFIC`)
   - `countryCode` (ex.: `BR`)
3) Preencher AdSet (budget/optimization/billing).
4) Preencher Criativo (mínimo: `primaryText`, `destinationUrl`, `ctaType`; `pageId` quando necessário).
5) Revisão → clicar em **Criar tudo (PAUSED)**.

Resultado esperado:

- IDs retornados (quando aplicável): `meta_campaign_id`, `meta_adset_id`, `meta_creative_id`, `meta_ad_id`.
- Tudo criado como `PAUSED` no modo `REAL`.
- Em caso de erro, usar o botão **Abrir /meta-test (debug)** para troubleshooting.

### Registros operacionais (cronológico)

Esta seção deve ser atualizada sempre que:

- Algo não for implementado pelo Codex
- Um bug for encontrado
- Um fluxo estiver incompleto

[2026-05-18 14:46]

- Progresso (P4/P5 — Creative/Ad REAL): token valida e Pages retornam via Graph, mas publish do Creative REAL falha com `error_subcode=1885183` (“app em modo de desenvolvimento”).
  - Evidência: `POST /api/meta/validate` OK; `GET /api/meta/pages?metaAdAccountId=act_*` retorna Page(s); `POST /api/meta/creative-drafts/:id/publish` retorna subcode 1885183.
  - Ação: colocar o App Meta em modo público (Live) e/ou ajustar roles do app para permitir criação de AdCreative/Ad.

[2026-05-24 11:04]

- App Meta publicado com sucesso (páginas legais + deploy) e painel da Meta aceitou a publicação do app.
- Decisão operacional atual: usar o token atual no backend para teste controlado (sem trocar agora; token não vai ao frontend e não entra no Git/logs).
- Próxima ação: revalidar Creative REAL e Ad REAL via `/meta-test` e registrar evidências (PAUSED, persistência no DB, leitura via Graph).
  - Evidências (backend sem expor token):
    - `GET /api/meta/status` → `ok=true`, `has_access_token=true`, `has_page_id=true`, `db_enabled=false`
    - `POST /api/meta/validate {}` → `ok=true` (Graph `/me`)

[2026-05-26 09:40]

- P18 (`/campaign-flow`) validado manualmente em modo `REAL` com sucesso.
- Guardrails preservados: toda criação REAL permaneceu `PAUSED` (nunca `ACTIVE`).
- `/meta-test` permanece preservado como laboratório técnico/debug.
    - `GET /api/meta/diagnostics` → permissões evidenciadas (ex.: `ads_management`, `pages_show_list`)
- Bloqueio atual nesta máquina: Docker daemon indisponível → `db_enabled=false` impede P4/P5 REAL via `creative_drafts`/persistência.

[2026-05-24 13:00]

- Contexto: forma de pagamento configurada no Ad Account `act_259174718403969` (bloqueio `error_subcode=1359188` removido).
- Token/segurança: sem troca de token; token permanece apenas no backend; nenhuma credencial em logs/docs.
- P5 (Ad REAL mínimo) revalidado com sucesso (tudo `PAUSED`):
  - `POST /api/meta/ads` (REAL) com `generatedCampaignId=59ac9e05-59a3-41ee-aee7-b7c4e93f33ed` + `creativeDraftId=1a989682-9326-4010-940e-875945a0c8de` (fallback `creative_id_source=draft`)
  - Resultado: `meta_ad_id=120247685122480596`, `status=PAUSED` (`effective_status=IN_PROCESS`)
  - Persistência DB: update em `generated_campaigns.meta_ad_id` + insert em `generated_ads` (`run_mode=REAL`, `status=PAUSED`)
  - Leitura Graph (via backend): `GET /api/meta/ads/120247685122480596` → `ok=true`
  - Preview (se disponível): `GET /api/meta/ads/120247685122480596/previews?adFormat=DESKTOP_FEED_STANDARD` → `ok=true` (iframe retornado)

[2026-05-24 11:12]

- Ambiente: Docker voltou a operar; DB habilitado no backend (`db_enabled=true`).
- P4 (Creative REAL) revalidado com sucesso após publicação do App Meta:
  - `POST /api/meta/creative-drafts/:id/publish` → `ok=true` (sem `error_subcode=1885183`)
  - `GET /api/meta/creatives/:id` → `ok=true`
- P5 (Ad REAL) ainda bloqueado por cobrança no Ad Account:
  - `POST /api/meta/ads` (REAL) → erro `error_subcode=1359188` / `error_user_title="Nenhuma forma de pagamento"`

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


[2026-05-24 HH:mm]

- App Meta publicado com sucesso após criação/deploy das páginas legais:
  - `/politica-de-privacidade`
  - `/termos-de-uso`
  - `/exclusao-de-dados`
- Decisão operacional: não trocar token agora; usar o token atual no backend para validar P4/P5 REAL.
- Próxima ação: revalidar Creative REAL e Ad REAL pelo `/meta-test`.

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
