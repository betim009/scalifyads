# ARCHIVE — Histórico e registros

Este arquivo contém apenas histórico e contexto legado.

Para execução atual:

- Backlog e estado atual: `PLANS.md`
- Procedimentos e comandos: `RUNBOOK.md`

Última atualização: [2026-05-08 08:48]

## Governança do arquivo (HISTÓRICO PURO)

Última atualização: [2026-05-08 08:48]

Regras (para evitar backlog fantasma e drift):

- Este arquivo contém **histórico**. Não é backlog ativo.
- Qualquer item com `[ ]` aqui deve ser tratado como **SNAPSHOT DE ÉPOCA / OBSOLETO** (não executar).
- Backlog ativo único: `PLANS.md` em `## Backlog Ativo (ÚNICO)`.
- Runbook operacional atual: `RUNBOOK.md` em `## PLAYBOOKS ATUAIS`.

Conteúdo movido para cá em [2026-05-08 08:48]:

- Logs e seções “diário” que estavam em `PLANS.md` (Progress/Surprises/Outcomes).
- Bootstrap/checklists históricos que estavam em `RUNBOOK.md` (agora ficam sob `## RUNBOOK (legado) — não executar`).

## Integração Meta — histórico consolidado

Última atualização: [2026-05-08 08:48]

Este bloco preserva histórico consolidado da primeira integração REAL (Campaign/AdSet/Ad + `/meta-test`) e sua evolução.

Snapshots detalhados (incluindo listas antigas com `[x]/[ ]`): ver `## Backlog (concluído) — snapshots de execução`.

## Backlog (concluído) — snapshots de execução

Última atualização: [2026-05-08 08:48]

> SNAPSHOT DE ÉPOCA — NÃO USAR COMO BACKLOG ATIVO.  
> Fonte de verdade do backlog atual: `PLANS.md`.

### Snapshot — `PLANS.md` / `## Backlog Ativo (ÚNICO)` (2026-05-07)

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

Última atualização: [2026-05-07 22:44]

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
- [x] Remover dependência de fluxos antigos (manter compatibilidade enquanto migra)
- [x] Permitir criar Campaign diretamente pela UI (campos mínimos)
- [x] Permitir gerar automaticamente Campaigns independentes por país (batch)
- [x] Exibir claramente:
  - REAL
  - STUB
  - FALLBACK
- [x] Preparar UI/serviços para criação de AdSet (sem implementar full)
- [x] Preparar UI/serviços para criação de Ad (sem implementar full)
- [x] Adicionar criação REAL de AdSet
- [x] Adicionar criação REAL de Ad
- [x] Exibir estrutura Meta:
  - Campaign
  - AdSet
  - Ad
- [x] Persistir:
  - meta_campaign_id
  - meta_adset_id
  - meta_ad_id
- [x] Adicionar logs operacionais básicos
- [ ] Preparar futura substituição da página "Nova Campanha"


## PLANS (legado) — logs movidos do ExecPlan

Última atualização: [2026-05-08 08:48]

Este conteúdo foi removido de `PLANS.md` para manter o plano curto e executável. Preservado aqui como histórico.

### Progress (sessão atual)

Última atualização: [2026-05-07 22:44]

- Migração adicionada para persistir campos `meta_*` em `generated_campaigns`.
- Backend implementado para criação real de campanha (`POST /api/meta/campaigns`) com regra obrigatória `status: PAUSED` e persistência.
- Backend implementado para consulta (`GET /api/meta/campaigns/:id`).
- Frontend atualizado para exibir `STUB`/`REAL`, `meta_campaign_id` e status real da Meta.
- Página isolada adicionada para testar criação REAL via UI: `/meta-test` (sem token no frontend).
- `mark-published` corrigido para não alterar status local indevidamente.
- Backend: endpoint `POST /api/meta/campaigns/simple` adicionado para criação REAL/`STUB` com campos mínimos (modo seguro `PAUSED`) + persistência local.
- Frontend: `/meta-test` simplificado para fluxo progressivo (Campaign) e exibição explícita de REAL/STUB/FALLBACK.
- Backend: criação incremental de AdSet/Ad (REAL/STUB, sempre `PAUSED`) com persistência em `generated_campaigns`.
- Frontend: `/meta-test` habilitado para criar AdSet/Ad e exibir evidência de persistência (IDs/status).
- Frontend: `/meta-test` ganhou painel de status do backend/token (`/api/meta/status` + `/api/meta/validate`), validação de `act_...` e botão para consultar status da Campaign via Graph (`GET /api/meta/campaigns/:id`).
- Frontend: `/meta-test` ganhou batch de criação de Campaigns por país (REAL/STUB, sempre `PAUSED`) + painel de evidência de persistência local (`generated_campaigns`).
- Frontend: `/meta-test` ganhou logs operacionais básicos (timeline) e um bloco explícito de estrutura Meta (Campaign → AdSet → Ad).

### Surprises & Discoveries

Última atualização: [2026-05-07 22:44]

- Para criação de campanha via Marketing API, o payload inclui `special_ad_categories` (mesmo vazio) e deve sempre forçar `status=PAUSED` no backend em dev.
- O “país” não existe como entidade nativa na Campaign da Meta: no produto, ele é parte do **modelo operacional** (mapeado em `generated_campaigns.country_code`) e é aplicado de forma real no nível de AdSet (targeting).

### Outcomes & Retrospective

Última atualização: [2026-05-07 22:44]

- O projeto deixa de ser apenas simulação para criação de campanhas: existe caminho real end-to-end via backend, mantendo segurança operacional com `PAUSED`.
- Direção arquitetural consolidada: abandonar evolução como “formulário gigante” e migrar para fluxo progressivo baseado em entidades Meta reais, com `/meta-test` como laboratório principal.
- A `/meta-test` agora expõe “modo operacional” de forma explícita (RUN MODE / DATA / META READY) e prepara incrementalmente o caminho para AdSet/Ad sem quebrar o fluxo antigo.
- A `/meta-test` já executa batch de Campaigns independentes por país e mostra evidência de persistência local (DB) para validar `meta_campaign_id` e status Meta.
- A `/meta-test` agora cria AdSet/Ad (REAL/STUB, sempre `PAUSED`) e persiste IDs/status no Postgres para auditoria operacional.
- A `/meta-test` agora registra logs operacionais básicos (sem token) e deixa explícito o modelo de domínio Meta (Campaign → AdSet → Ad) para guiar evolução incremental.


## RUNBOOK (legado) — não executar

Última atualização: [2026-05-08 08:48]

Este conteúdo existia em `RUNBOOK.md` e foi movido para cá para não competir com os playbooks atuais.

### Concrete Steps

Última atualização: [2026-05-04 22:30]

O agente deve seguir estes passos concretos.

### 1. Inspecionar o projeto

Executar comandos equivalentes:

    ls
    find . -maxdepth 2 -type f | sort
    cat frontend/package.json
    cat backend/package.json

Se o projeto for grande, evitar listar `node_modules`.

### 2. Identificar stack

Verificar se o projeto usa:

- React + Vite
- Next.js
- TypeScript ou JavaScript
- Tailwind
- CSS comum
- MUI
- React Router
- Recharts ou outra biblioteca de gráfico

Registrar a descoberta no `Surprises & Discoveries`.

### 3. Instalar dependências somente se necessário

Se não existir roteamento e o projeto for React comum, avaliar instalar:

    npm install react-router-dom

Se não existir biblioteca de gráfico e for necessário usar Recharts:

    npm install recharts

Não instalar bibliotecas desnecessárias.

### 4. Criar dados mockados

Criar arquivos em `src/data` ou pasta equivalente:

    mockCountries.js
    mockCampaigns.js
    mockFinancial.js

Esses arquivos devem centralizar os dados usados nas telas.

### 5. Criar componentes reutilizáveis

Criar componentes pequenos e claros:

    Header
    MetricCard
    ActionCard
    CampaignCard
    StatusBadge
    FilterButton
    CountriesList
    SettingRow

Evitar duplicação visual.

### 6. Criar páginas

Criar páginas:

    Dashboard
    Financeiro
    Configuracoes

Conectar navegação entre elas.

### 7. Aplicar estilo global

Criar ou ajustar CSS global para:

- Reset básico.
- Fonte limpa.
- Container centralizado.
- Grid responsivo.
- Cards.
- Botões.
- Badges.
- Estados visuais.

### 8. Validar localmente

Executar:

    npm install
    npm run dev

Se existir script diferente, usar o script correto do projeto.

### 9. Revisar visual

Comparar com as imagens do Figma:

- Espaçamento.
- Hierarquia visual.
- Cards.
- Títulos.
- Botões.
- Lista de campanhas.
- Tela financeiro.
- Tela configurações.

Não precisa ficar pixel perfect, mas deve ficar visualmente próximo.

### 10. Atualizar este ExecPlan

Antes de finalizar, atualizar:

- `Progress`
- `Surprises & Discoveries`
- `Decision Log`
- `Outcomes & Retrospective`, se a fase terminar
- `Artifacts and Notes`

### 11. Versionamento com Git (OBRIGATÓRIO)

A cada tarefa concluída, o agente deve:

1. Adicionar alterações:
    
    git add .

2. Criar commit claro e descritivo:
    
    git commit -m "feat: implementa dashboard com cards de métricas"

3. Enviar para o repositório remoto:
    
    git push

Regras:

- Nunca acumular muitas alterações sem commit.
- Cada commit deve representar uma unidade clara de progresso.
- Usar prefixos:
  - feat: nova funcionalidade
  - fix: correção
  - refactor: melhoria interna
  - style: ajuste visual
- O histórico de commits deve permitir entender a evolução do projeto.

Observação:

O versionamento faz parte da validação do progresso.  
Uma tarefa só é considerada concluída após commit e push.

### Regra de Git para todas as fases

Última atualização: [2026-05-06 11:18]

A cada item P concluído:

1. Executar validação mínima
2. Atualizar PLANS.md
3. Executar:

    git add .
    git commit -m "tipo: mensagem clara"
    git push

Nenhum item pode ser marcado como concluído sem commit e push.



### Validation and Acceptance

### Fase 1 — Critérios (concluída)

- [x] A aplicação abre sem erro.
- [x] O Dashboard está implementado.
- [x] A tela Financeiro está implementada.
- [x] A tela Configurações está implementada.
- [x] Os botões principais navegam corretamente.
- [x] Os dados estão mockados em arquivos separados.
- [x] O visual está próximo ao Figma.
- [x] O layout está minimamente responsivo.
- [x] O código está componentizado.
- [x] Sem dependência obrigatória de backend.
- [x] Este ExecPlan está atualizado.

### Fase 5 — Critérios (Full Stack / Integração)

Última atualização: [2026-05-06 17:55]

- [ ] `docker compose up` sobe `db`, `backend` e `frontend` sem erro (Postgres healthcheck ok).
- [ ] Backend responde `GET http://localhost:3001/healthz` com `200`.
- [ ] Backend responde `GET http://localhost:3001/api` com `{ ok: true }`.
- [ ] Com DB ativo, `GET http://localhost:3001/api/countries` responde `200` com lista.
- [ ] Fluxo mínimo no backend funciona com DB:
  - `POST /api/campaigns` cria campanha
  - `POST /api/campaigns/:id/generate` cria/atualiza `generated_campaigns`
  - `POST /api/generated-campaigns/:id/mark-published` define `meta_campaign_id`
- [ ] Sync Meta (stub ou real) executa e grava em `campaign_metrics`:
  - `POST /api/meta/sync/generated-campaigns/:id` retorna `{ ok: true, sync: ... }`
  - Verificar gravação via query no Postgres (ex: `SELECT * FROM campaign_metrics ORDER BY metric_date DESC LIMIT 5;`)

### Fase 2 — Critérios de aceite

A Fase 2 será considerada concluída quando TODOS os itens abaixo estiverem verificados:

Última atualização: [2026-05-05 14:57]

#### Ícones (P3)

- [x] `@mui/icons-material` instalado e buildando sem erro
- [x] Nenhum emoji usado como ícone de UI (emojis de flag de país são permitidos temporariamente)
- [x] Todos os botões de ação do design usam ícone MUI quando aplicável
- [x] StatusBadge usa ícones MUI para cada status

#### Escala / Tipografia (P4)

- [x] `font-size` base do body definido como `14px` no `global.css`
- [x] Títulos de página não ultrapassam `22px`
- [x] Cards com padding proporcional (16–24px) conforme Figma
- [x] Layout visualmente comparável ao Figma (não pixel-perfect, mas proporcional)

#### Home vs Mensal (P2)

- [x] Rota `/` renderiza a página Home (Dashboard) baseada em `screens/desktop/home/`
- [x] Rota `/mensal` renderiza a página Mensal baseada em `screens/desktop/mensal/`
- [x] Botão "Mensal" na navbar navega para `/mensal` (não é a página atual)
- [x] As duas páginas são visualmente distintas conforme design

#### Inputs (P1)

- [x] Todos os campos editáveis de `NovaCampanha.jsx` aceitam digitação
- [x] Nenhum input editável está bloqueado ou somente leitura
- [x] Estado do formulário é mantido ao navegar entre campos

#### Nova Campanha (P5)

- [x] Todos os campos/seções visíveis no design estão presentes (steps 1–5 + sidebar)
- [x] Seções incluem: Configuração, Link e Parâmetros, Copy Base (variações), Orçamento/Programação, Upload
- [x] Botões principais do design existem (Publicar / Salvar como rascunho) e possuem ação mockada
- [x] Botão `Voltar` retorna ao fluxo anterior (fallback para `/mensal`)

#### Mocks Comportamentais (P6)

- [x] Pasta `src/mocks/` existe com hooks documentados
- [x] Clicar em período (Hoje/Ontem/7dias/30dias) muda valores dos cards do Financeiro
- [x] Botão Filtrar na Home filtra a lista de campanhas por algum critério
- [x] Interações não causam erros no build e não devem gerar erros no console

---

### Checklist visual do Dashboard (Fase 1 — referência)

- [x] Header com logo, título e subtítulo.
- [x] Botões superiores.
- [x] Card `Total de campanhas`.
- [x] Card `Campanhas ativas`.
- [x] Card `Rascunhos`.
- [x] Card `ROI (Ontem)`.
- [x] Card `Países configurados`.
- [x] Card `Criar Nova Campanha`.
- [x] Card `Financeiro & Relatórios`.
- [x] Card `ROI - Dia Anterior`.
- [x] Seção `Suas Campanhas`.
- [x] Card da campanha `DirigirBTN4`.

### Checklist visual do Financeiro (Fase 1 — referência)

- [x] Botão voltar.
- [x] Título e subtítulo.
- [x] Filtros de conta, BM e período.
- [x] Cards financeiros.
- [x] Gráfico de gastos.
- [x] Link `Ver relatório completo`.

### Checklist visual de Configurações (Fase 1 — referência)

- [x] Botão voltar.
- [x] Título e subtítulo.
- [x] Lista de países.
- [x] Códigos dos países.
- [x] Badges de idioma.
- [x] Aviso de países fixos.
- [x] Outras configurações.
- [x] Badges `Ativo`.

### 12. Analisar XLSX antes de implementar

Antes de implementar qualquer tela ou dado mockado, o agente deve:

- Abrir o arquivo XLSX na raiz
- Identificar:
  - Campos relevantes
  - Estrutura das campanhas
  - Parâmetros utilizados
  - Objetivos de campanha
- Mapear esses dados para:
  - mockCampaigns.js
  - mockCountries.js
  - mockFinancial.js

Regra:

Nenhum dado mockado deve ser inventado sem base no XLSX.

Se houver dúvida, registrar em Surprises & Discoveries.



### Idempotence and Recovery

O agente deve trabalhar de forma segura.

Regras:

- Não apagar arquivos existentes sem necessidade.
- Não reescrever o projeto inteiro se já houver estrutura útil.
- Não misturar backend nesta primeira fase, exceto se já existir algo que precise ser preservado.
- Não colocar token da Meta no frontend.
- Não criar integração real com Meta Ads API nesta fase.
- Não depender do XLSX em runtime nesta fase.
- Usar dados mockados para representar o XLSX.
- Se uma biblioteca falhar, registrar o problema e usar solução simples.
- Se o projeto não compilar, corrigir antes de avançar.
- Se houver conflito com arquitetura existente, preservar o padrão do projeto e registrar a decisão.

Para recuperação:

- Se uma alteração quebrar a aplicação, voltar ao último estado funcional.
- Se o gráfico causar problema, substituir temporariamente por placeholder visual.
- Se a navegação causar problema, manter navegação por estado local ou links simples até resolver.
- Se CSS global afetar outras telas, isolar estilos por componente ou página.



### Troubleshooting

- [2026-05-06 14:15] Validação do `docker compose up` não foi possível neste ambiente: Docker daemon inacessível (erro de socket). O `docker-compose.yml` foi criado, mas precisa ser validado em máquina com Docker Desktop/daemon ativo.

## Purpose / Big Picture

Última atualização: [2026-05-04 22:30]

Explica o objetivo e o resultado visível.



## Worklog (cronológico)

## Data Progress

Última atualização: [2026-05-06 17:55]

- [2026-05-04] Entendimento do projeto baseado no XLSX
- [2026-05-04] Definição do escopo do frontend
- [x] [2026-05-04 22:10] Entendimento do XLSX como sistema
- [x] [2026-05-05 09:33] Auditoria do repositório (estado real + screens + XLSX)
- [x] [2026-05-05 09:35] Criar estrutura do projeto (Vite + React + pasta `src/`)
- [x] [2026-05-05 09:36] `npm install` + `npm run build` (projeto compila)
- [x] [2026-05-05 09:37] Layout base (Header + estilos globais + container/cards)
- [x] [2026-05-05 09:40] Navegação SPA (React Router) entre Dashboard/Financeiro/Configurações
- [x] [2026-05-05 09:42] Implementação inicial do Dashboard (métricas + cards de ação + card de campanha)
- [x] [2026-05-05 09:43] Seção “Suas Campanhas” (listagem visual + ações Filtrar/Ordenar)
- [x] [2026-05-05 09:46] Implementação inicial do Financeiro (filtros + métricas + gráfico + tabela)
- [x] [2026-05-05 09:48] Implementação inicial de Configurações (países fixos + outras configs)
- [x] [2026-05-05 09:50] Dados mockados em `src/data/*` (campanhas/paises/financeiro)
- [x] [2026-05-05 09:51] Componentização extra (Financeiro: filtros/metric cards/export button)
- [x] [2026-05-05 09:53] Ajustes de responsividade (grids + overflow da tabela do Financeiro)
- [x] [2026-05-05 09:54] Revisão de fidelidade visual (comparação com `screens/desktop/*`)
- [x] [2026-05-05 09:55] Registro de pendências (backend/db/Meta Ads API + telas futuras)
- [x] [2026-05-05 09:55] ExecPlan atualizado e consistente com o código atual
- [x] [2026-05-05 14:57] P4 — Ajuste de escala tipográfica e espaçamentos globais (base 14px + refinamentos)
- [x] [2026-05-05 14:57] P5 — Tela Nova Campanha completada conforme `screens/desktop/nova-campanha/*` (steps 1–5 + sidebar)
- [x] [2026-05-05 14:57] P6 — Mocks comportamentais (período no Financeiro + filtro/ordenação na Home + selects reais)
- [x] [2026-05-06 11:52] Fase 3 (P1) — Movido o frontend para `frontend/` e validado `npm run build`
- [x] [2026-05-06 12:04] Auditoria: padronizado o ExecPlan para usar `screens/desktop/*` e `screens/mobile/*` (corrige referências `screens/Desktop/*`).
- [x] [2026-05-06 12:23] Fase 3 (P3) — Refinados mocks do Dashboard: métricas calculadas a partir de `frontend/src/data/*` (sem números hardcoded).
- [x] [2026-05-06 12:35] Fase 3 (P1) — Limpeza da raiz: removidos `dist/` e `node_modules/` da raiz (não necessários após mover frontend/backend).
- [x] [2026-05-06 13:59] Documento `SOBRE.md` preenchido (visão geral do projeto, fluxo e como rodar).
- [x] [2026-05-06 14:12] Fase 3 (P4) — Iniciada modelagem do banco (Postgres): migrations SQL + seed + scripts `npm run migrate`/`npm run seed` no backend.
- [x] [2026-05-06 14:15] Fase 3 (P5) — Ambiente Docker adicionado (Postgres + backend + frontend) com comandos documentados em `README.md`.
- [x] [2026-05-06 17:36] Fase 4+ — Definida sincronização com Meta Ads: rotas `/api/meta/*` + sync manual de métricas diárias para `campaign_metrics` (Meta Graph + fallback `stub`).
- [x] [2026-05-06 17:55] Refactor documental: `PLANS.md` reduzido para estado atual + backlog ativo único; histórico isolado em `ARCHIVE.md` e procedimentos em `RUNBOOK.md`.



## Backlogs e execuções concluídas

## Pending Work (Pendências)

Última atualização: [2026-05-06 14:15]

⚠️ SNAPSHOT DE ÉPOCA (histórico) — NÃO USAR COMO BACKLOG ATIVO.  
Fonte de verdade do backlog atual: `PLANS.md` em `## Backlog Ativo (ÚNICO)`.

Esta seção preserva as pendências registradas naquele momento,
mesmo que parte delas já tenha sido implementada depois.

### Funcionalidades pendentes (Fase 1 — concluídas)

- [x] Ao clicar em `+ Nova Campanha` ir para tela de nova campanha
- [x] Ao clicar em `Ver ROI (ontem)` ir para tela de ROI
- [x] Os botoes precisam de ter um Refinamento de UI/UX - hover cursor pointer
- [x] Cria a pagina `Mensal` e ao clicar no botao mensal navegar para essa pagina

### Problemas identificados (Fase 1 — concluídos)

- [x] Botões apenas visuais (sem ação)
- [x] Falta de rotas para algumas telas
- [x] Componentes não reutilizados corretamente

### Ajustes visuais (Fase 1 — concluídos)

- [x] Ajustar/Refinar o design. A impressão ao analisar o design é que todos components e textos estão com o dobro do tamanho, peso da fonte...

---

### FASE 2 — Correções e melhorias prioritárias

> Estas tarefas corrigem problemas reais identificados após a entrega da Fase 1.
> Todas são OBRIGATÓRIAS antes de considerar o frontend pronto.

#### [P1] BUG CRÍTICO: Inputs de Nova Campanha não funcionam

- [x] Auditar `src/pages/NovaCampanha.jsx` — identificar todos os `<input>` e `<textarea>` sem `value`/`onChange`
- [x] Converter cada campo para input controlado com `useState`
- [x] Garantir que o usuário consegue digitar em todos os campos do formulário
- [x] Validar: nenhum campo deve estar "congelado" ou somente leitura
- [x] Commit: `fix: corrige inputs controlados em NovaCampanha`

Causa provável: inputs com `value` sem `onChange` — React bloqueia a edição.

---

#### [P2] BUG CRÍTICO: Confusão HOME vs MENSAL

O Codex confundiu as telas HOME e MENSAL porque o botão "Mensal" aparece visualmente ativo no Figma da tela principal. Ele interpretou a HOME como sendo a página MENSAL. Isso está ERRADO.

Regra correta:
- `/` → Rota da HOME (Dashboard principal — `screens/desktop/home/`)
- `/mensal` → Rota separada MENSAL (`screens/desktop/mensal/`)
- O botão "Mensal" na navbar navega para `/mensal`, não é a página atual

Tarefas:
- [x] Consultar imagens em `screens/desktop/home/` e `screens/desktop/mensal/` para entender a diferença visual
- [x] Corrigir a rota `/` para renderizar o Dashboard correto (Home) — não deve ser redirecionado para `/mensal`
- [x] Corrigir `src/pages/Mensal.jsx` para refletir fielmente o design de `screens/desktop/mensal/`
- [x] Garantir que a navegação da navbar distingue Home de Mensal
- [x] Commit: `fix: separa rotas home e mensal conforme design`

---

#### [P3] ÍCONES: Substituir emojis por Material UI Icons

O projeto usa emojis como ícones provisórios. Isso deve ser substituído por Material UI Icons para consistência profissional.

Tarefas:
- [x] Instalar: `npm install @mui/icons-material @mui/material @emotion/react @emotion/styled`
- [x] Criar lista de mapeamento: qual emoji/ícone atual → qual MUI Icon substitui
- [x] Substituir emojis em:
  - Header (ícone de globo → `PublicIcon`)
  - Botões de ação (`+ Nova Campanha` → `AddIcon`, `Ver Financeiro` → `BarChartIcon`, etc.)
  - Cards de campanha (flags de países → `FlagIcon` ou flags reais via componente)
  - StatusBadge (`Publicado` → `CheckCircleIcon` verde, `Rascunho` → `EditIcon` cinza)
  - Botões de filtro/ordenar (`FilterListIcon`, `SortIcon`)
  - Botão Voltar → `ArrowBackIcon`
- [x] Padronizar tamanho de ícones: `fontSize="small"` como padrão, `fontSize="medium"` para destaques
- [x] Commit: `feat: substitui emojis por Material UI Icons`

Mapeamento aplicado (resumo):
- Globo/flags UI → `PublicIcon` / flags mantidas como emoji temporariamente
- Check/ok → `TaskAltIcon` / status → `CheckCircleIcon`
- Info → `InfoOutlinedIcon`
- Pin → `PushPinIcon`
- Ações/olho/pausa → `TrendingUpIcon` / `VisibilityIcon` / `PauseCircleOutlineIcon`

---

#### [P4] ESCALA / TIPOGRAFIA: Corrigir proporções visuais

O layout atual tem componentes e fontes aparentemente 2x maiores que o Figma.

Tarefas:
- [x] Definir e aplicar base tipográfica em `src/styles/global.css`:
  - `font-size` base: `14px` (body)
  - `h1`: `22px` / `font-weight: 600`
  - `h2`: `18px` / `font-weight: 600`
  - `h3`: `15px` / `font-weight: 500`
  - Textos secundários: `12px`
  - Labels/badges: `11px`
- [x] Revisar `padding` e `margin` dos componentes principais. Base: grid de 8px (`4px`, `8px`, `16px`, `24px`, `32px`)
- [x] Revisar larguras de cards — contidas por `.container` e grids
- [x] Comparar visualmente telas principais com `screens/desktop/*` após ajuste
- [x] Commit: `style: corrige escala tipográfica e espaçamentos conforme Figma`

---

#### [P5] TELA NOVA CAMPANHA: Implementar fiel ao design

A tela `nova-campanha` está incompleta. Não reflete o design do Figma.

Tarefas:
- [x] Consultar TODAS as imagens em `screens/desktop/nova-campanha/`
- [x] Mapear cada seção visível no design (steps 1–5 + sidebar)
- [x] Implementar Step 1 — Configuração (Nome, BM, Conta de anúncio, ID da Página, Pixel, Beneficiário)
- [x] Implementar Step 2 — Link e Parâmetros (Domínio, Slug, URL final, Tracking automático, Parâmetro Nicho + campos gerados)
- [x] Implementar Step 3 — Copy Base (Biblioteca por Nicho + variações de Texto/Título/Descrição)
- [x] Implementar Step 4 — Orçamento e Programação (orçamento, tipo, datas/horários, rodar continuamente)
- [x] Implementar Step 5 — Upload de Vídeos (dropzone + seleção de arquivos)
- [x] Implementar Sidebar (Resumo Automático + Publicar + Salvar como rascunho + Diferenciais)
- [x] Garantir que TODOS os campos editáveis do formulário são editáveis (ver [P1])
- [x] Aplicar layout fiel ao design (grid 2 colunas + cards)
- [x] Commit: `feat: completa tela nova-campanha conforme Figma`

---

#### [P6] MOCKS COMPORTAMENTAIS: Tornar o frontend "vivo"

Atualmente o UI é estático — filtros não fazem nada, seleções não mudam estado visual.

Tarefas:
- [x] Criar pasta `src/mocks/`
- [x] Criar `src/mocks/useCampaignFilters.js` — hook que simula filtro por status/tipo
- [x] Criar `src/mocks/usePeriodFilter.js` — hook que simula seleção de período no Financeiro (Hoje/Ontem/7dias/30dias) e retorna dados diferentes por período
- [x] Criar `src/mocks/useFormState.js` — hook genérico de formulário controlado
- [x] Conectar `PeriodPills` ao `usePeriodFilter` — ao clicar, os cards de métricas mudam de valor
- [x] Conectar botões "Filtrar" e "Ordenar" da Home — ao clicar, aplicar filtro real na lista de campanhas
- [x] Conectar `SelectLike` (Conta / BM) — ao selecionar, valor deve persistir visualmente
- [x] Objetivo: usuário interage com a tela e vê resposta visual sem backend
- [x] Commit: `feat: adiciona mocks comportamentais e interatividade ao frontend`

---

### FASE 3 — Estrutura Full Stack, Backend, Banco e Docker

> Esta fase inicia após a Fase 2.
> Objetivo: organizar o projeto como aplicação full stack,
> preparar backend, banco de dados, Docker e corrigir mocks do frontend.
#### [P1] Reorganizar estrutura do projeto

- [x] Criar diretório `frontend/`
- [x] Mover o frontend atual da raiz para `frontend/`
- [x] Ajustar caminhos, scripts e imports quebrados
- [x] Garantir que o frontend continua buildando
- [x] Commit: `refactor: move frontend para diretorio dedicado`
- [x] Verificar as pastas na raiz que nao ha necessidade de existir.
- [x] Senao houver necessidade de existir deletar as pastas. (Removidos: `dist/` e `node_modules/` da raiz)

#### [P2] Iniciar backend

- [x] Criar diretório `backend/`
- [x] Criar estrutura inicial de pastas
- [x] Criar servidor base
- [x] Criar rota health check
- [x] Preparar conexão futura com banco
- [x] Commit: `feat: inicia estrutura base do backend`

#### [P3] Refinar mocks do frontend

- [x] Auditar mocks existentes
- [x] Corrigir inconsistências entre campanhas e dashboard
- [x] Garantir que métricas sejam calculadas a partir dos mocks
- [x] Evitar números fixos desconectados dos dados
- [x] Commit: `fix: corrige consistencia dos mocks do dashboard`

#### [P4] Iniciar modelagem do banco de dados

- [x] Analisar telas existentes
- [x] Analisar mocks
- [x] Analisar XLSX
- [x] Propor entidades principais
- [x] Criar migrations iniciais
- [x] Criar seeders iniciais
- [x] Commit: `feat: inicia modelagem do banco de dados`

#### [P5] Configurar Docker

- [x] Criar `docker-compose.yml`
- [x] Configurar serviço do frontend
- [x] Configurar serviço do backend
- [x] Configurar serviço do banco
- [x] Definir portas sem conflito
- [x] Criar comandos documentados para subir, parar, retomar e reiniciar
- [x] Criar comando para limpar apenas o banco
- [x] Commit: `feat: adiciona ambiente docker`

---

### FASE 4 — Integração Real, ROI e Automação

> Esta fase transforma o projeto de frontend mockado
> para um sistema operacional real integrado com Meta Ads API.
>
> OBSOLETO (histórico): esta seção é um snapshot antigo e contém checklists com `[ ]`.
> Não tratar como backlog ativo. A fonte única de backlog ativo é `PLANS.md`.

#### [P1] Modelagem real do banco

- [ ] Criar tabela `users`
- [ ] Criar tabela `campaigns`
- [ ] Criar tabela `generated_campaigns`
- [ ] Criar tabela `countries`
- [ ] Criar tabela `campaign_metrics`
- [ ] Criar tabela `financial_reports`
- [ ] Criar tabela `ad_accounts`
- [ ] Criar tabela `business_managers`
- [ ] Criar tabela `automation_rules`
- [ ] Criar tabela `automation_logs`
- [ ] Criar tabela `meta_tokens`

---

#### [P2] Fluxo operacional real da campanha

- [ ] Definir fluxo completo da campanha
- [ ] Definir como campanhas são geradas
- [ ] Definir como campanhas serão duplicadas
- [ ] Definir como campanhas serão publicadas
- [ ] Definir persistência no banco
- [ ] Definir sincronização com Meta Ads

---

#### [P3] Integração Meta Ads API

- [ ] Configurar autenticação Meta
- [ ] Configurar Access Token
- [ ] Configurar App Secret
- [ ] Criar serviço de campanhas
- [ ] Criar serviço de insights
- [ ] Criar serviço de métricas
- [ ] Criar serviço de ativação/pausa
- [ ] Criar sincronização de campanhas

---

#### [P4] Engine de ROI

- [ ] Definir fórmula oficial de ROI
- [ ] Definir origem da receita
- [ ] Definir origem dos custos
- [ ] Criar cálculo de ROI por campanha
- [ ] Criar histórico de ROI
- [ ] Criar serviço de atualização automática

---

#### [P5] Automação de campanhas

- [ ] Criar regras de automação
- [ ] Criar agendador de automações
- [ ] Criar worker de processamento
- [ ] Criar lógica de aumento de orçamento
- [ ] Criar lógica de pausa automática
- [ ] Criar logs de automação

---

#### [P6] Sistema de sincronização

- [ ] Criar sincronização periódica
- [ ] Atualizar métricas automaticamente
- [ ] Atualizar status das campanhas
- [ ] Atualizar gastos
- [ ] Atualizar ROI
- [ ] Criar retry para falhas da API

---

#### [P7] Segurança e autenticação

- [ ] Criar autenticação JWT
- [ ] Criar refresh token
- [ ] Criar middleware de autenticação
- [ ] Criar permissões de usuário
- [ ] Proteger rotas privadas
- [ ] Proteger tokens da Meta

---

#### [P8] Infraestrutura de filas

- [ ] Configurar Redis
- [ ] Configurar BullMQ
- [ ] Criar fila de criação de campanhas
- [ ] Criar fila de sincronização
- [ ] Criar fila de automação

---

#### [P9] Observabilidade e logs

- [ ] Criar sistema de logs
- [ ] Criar logs de erro
- [ ] Criar logs de automação
- [ ] Criar logs de integração Meta
- [ ] Criar rastreabilidade de campanhas
- [ ] Criar monitoramento


### Observação

Esta seção deve ser atualizada sempre que:

- Algo não for implementado pelo Codex
- Um bug for encontrado
- Um fluxo estiver incompleto



## Surprises & Discoveries (log)

## Surprises & Discoveries

- O XLSX não é apenas uma base de dados complementar. Ele representa o fluxo operacional que o cliente já usava como sistema manual.
- O Figma não deve ser tratado como uma tela isolada. Ele representa a primeira versão visual de um produto que substituirá uma planilha operacional.
- O projeto não é apenas um CRUD. Ele tende a envolver automação, relatórios, regras de campanha e integração externa com a Meta Ads API.
- As informações de países, idiomas, objetivos de campanha e nomes de campanha precisam ser tratadas como regras importantes, não como textos soltos de interface.

Última atualização: [2026-05-06 14:15]

- [2026-05-04] O XLSX era o sistema principal do cliente
- [2026-05-04] O projeto não é apenas CRUD, envolve automação
- [2026-05-05 09:33] Repositório ainda não tem projeto frontend (sem `package.json`/`src`); contém apenas `.git`, `PLANS.md`, `PLANS.design.md`, `README.md`, `screens/` e `projeto_escopo.xlsx`.
- [2026-05-05 09:33] Screens Desktop incluem tabela “Detalhamento por Campanha” no Financeiro (além de filtros/cards/gráfico); ExecPlan anterior mencionava apenas gráfico.
- [2026-05-05 09:33] XLSX tem abas: `Observação`, `VISUALIZAÇÃO`, `BOTÃO`, `Parametro`, `Preencher`; campanhas do XLSX aparecem como “Ingles [PAÍS/REGIÃO]” e o exemplo visual “DirigirBTN4” não aparece no arquivo.
- [2026-05-05 09:36] `npm install` reportou 2 vulnerabilidades moderadas via `npm audit` (não corrigido ainda para evitar alterações não relacionadas).
- [2026-05-05 12:59] A seção `Pending Work` estava com data futura `[2026-05-05 23:00]` em relação ao horário real do sistema (corrigido para refletir o estado atual).
- [2026-05-05 13:01] Arquivos locais de prompt (`PROMPT.*.txt`) estavam na raiz e apareciam como untracked; adicionados ao `.gitignore` para evitar commits acidentais.
- [2026-05-05 00:00] ERRO DE INTERPRETAÇÃO (Codex — Fase 1): o botão “Mensal” aparece visualmente ativo no Figma da tela HOME, o que levou o Codex a tratar a HOME como sendo a página MENSAL. As duas são páginas distintas: `screens/desktop/home/` ≠ `screens/desktop/mensal/`. A rota `/` deve ser a Home; `/mensal` deve ser a Mensal. A decisão de redirecionar `/` para `/mensal` foi um erro e deve ser revertida.
- [2026-05-05 00:00] O projeto usa emojis como substitutos de ícones — isso foi uma decisão temporária (Fase 1) que deve ser resolvida na Fase 2 com Material UI Icons.
- [2026-05-05 00:00] Inputs de `NovaCampanha.jsx` não respondem à digitação — provável uso de `value` sem `onChange` (inputs controlados quebrados).
- [2026-05-05 00:00] Layout visual está com escala aproximadamente 2x o esperado — fonte base provavelmente não foi definida corretamente em `global.css`, e os componentes herdaram tamanhos do browser default.
- [2026-05-05 14:19] A pasta de design no repo está em `screens/desktop/*` e `screens/mobile/*` (não `screens/Desktop/*`), então ao seguir o ExecPlan é necessário ajustar o caminho conforme a estrutura real.
- [2026-05-05 14:33] `@mui/icons-material` no projeto não possui alguns nomes sugeridos no plano (ex: `PersonOutline`, `PauseCircleOutline`); foi necessário ajustar para variantes existentes (ex: `PersonOutlined`, `PauseCircleOutlined`) mantendo a API interna em `src/styles/icons.js`.
- [2026-05-05 14:57] O design completo de `Nova Campanha` inclui steps 3–5 (Copy Base, Orçamento/Programação, Upload + sidebar); a seção [P5] foi atualizada e implementada conforme `screens/desktop/nova-campanha/*`.
- [2026-05-06 11:18] Divergência local detectada: o arquivo de design `screens/desktop/home/Captura de Tela 2026-05-05 às 08.25.14.png` estava removido no working tree; arquivo restaurado para preservar a fonte de verdade visual.
- [2026-05-06 11:52] Após iniciar a Fase 3 (P1), o frontend deixou de ficar na raiz: todos os caminhos do app agora são relativos a `frontend/` (ex: `src/*` → `frontend/src/*`), e comandos passam a ser executados em `frontend/`.
- [2026-05-06 12:04] O ExecPlan ainda tinha referências `screens/Desktop/*` em trechos do documento; padronizado para `screens/desktop/*` e `screens/mobile/*` para refletir o repo real (case-sensitive).
- [2026-05-06 12:08] Não existia `backend/` no repo; iniciado backend como pacote Node/Express independente em `backend/` com `GET /healthz`.
- [2026-05-06 12:23] Inconsistência detectada: o Dashboard tinha métricas hardcoded (`Total de campanhas`, `Rascunhos`, `ROI (Ontem)`) enquanto `frontend/src/data/mockCampaigns.js` tinha dados divergentes; corrigido para derivar métricas dos mocks e alinhar `mockCampaigns` ao design (1 campanha publicada).
- [2026-05-06 12:35] Foram encontrados artefatos locais na raiz (`dist/` e `node_modules/`) que não são necessários após a separação em `frontend/` e `backend/`; removidos para manter a raiz limpa.
- [2026-05-06 13:59] `SOBRE.md` existia na raiz, mas estava vazio; preenchido para orientar rapidamente o objetivo, fluxo e como rodar o projeto.
- [2026-05-06 14:12] XLSX validado via leitura local: abas (`Observação`, `VISUALIZAÇÃO`, `BOTÃO`, `Parametro`, `Preencher`) e colunas típicas de bulk export/import da Meta confirmadas (ex: `Campaign Objective`, `Campaign Status`).
- [2026-05-06 14:15] Validação do `docker compose up` não foi possível neste ambiente: Docker daemon inacessível (erro de socket). O `docker-compose.yml` foi criado, mas precisa ser validado em máquina com Docker Desktop/daemon ativo.



## Decision Log (histórico completo)

## Decision Log

- Decisão: iniciar pelo frontend.
  Motivo: o cliente já possui telas no Figma, e a primeira entrega precisa transformar o conceito visual em uma aplicação navegável.

- Decisão: usar dados mockados na primeira fase.
  Motivo: ainda não é necessário depender da Meta Ads API nem do backend para validar a experiência visual e o fluxo do sistema.

- Decisão: organizar o frontend pensando em integração futura.
  Motivo: mesmo que o primeiro foco seja visual, o projeto final terá backend, banco de dados e API externa.

- Decisão: tratar o XLSX como referência de regra de negócio.
  Motivo: ele era usado pelo cliente como sistema manual, então suas abas, colunas e campos indicam como o cliente trabalha hoje.

- Decisão: manter este documento como fonte de verdade durante o desenvolvimento.
  Motivo: o agente não deve depender de contexto anterior da conversa. Tudo que for necessário para continuar o trabalho deve estar registrado aqui.

- Decisão: iniciar o projeto com React + Vite + React Router.
  Motivo: o repositório está sem frontend e a estrutura proposta no ExecPlan (páginas/componentes) se encaixa bem em SPA com roteamento.

- Decisão: usar os textos/números do design como mock inicial quando não existirem equivalentes diretos no XLSX (registrando a divergência).
  Motivo: o design é a fonte de verdade visual e o XLSX não contém o exemplo “DirigirBTN4” nem as métricas financeiras agregadas exibidas nas telas.

- Decisão: usar emojis para flags e ícones no mock inicial.
  Motivo: reduzir dependências e acelerar fidelidade visual; pode ser trocado por ícones/asset próprios depois.

- Decisão: implementar o gráfico do Financeiro com SVG simples (sem biblioteca externa) nesta fase.
  Motivo: reduzir dependências e manter o build estável enquanto a fidelidade visual é validada.

- Decisão: tornar `/mensal` a rota principal e redirecionar `/` para `/mensal`.
  Motivo: o design e o `Pending Work` tratam “Mensal” como uma página; manter o dashboard acessível via essa rota evita ambiguidade.
  ⚠️ REVISADA [2026-05-05]: Esta decisão foi um ERRO. HOME e MENSAL são páginas distintas. A rota `/` deve ser a Home (Dashboard), e `/mensal` deve ser a tela Mensal separada. Ver [P2] em Pending Work.

- Decisão: criar o componente `PageShell` para padronizar headers/containers de páginas.
  Motivo: reduzir duplicação e manter consistência visual entre telas.

- Decisão: reduzir o tamanho padrão de títulos (`.pageTitle`) para melhorar a proporção com o design.
  Motivo: feedback do `Pending Work` indicava tipografia/escala visual acima do esperado.
  ⚠️ INCOMPLETA [2026-05-05]: Apenas títulos foram ajustados. A escala global (body, paddings, grids) ainda precisa ser revisada. Ver [P4] em Pending Work.
  ✅ CONCLUÍDA [2026-05-05 14:57]: Base tipográfica + espaçamentos revisados em `src/styles/global.css`.

- Decisão: instalar `@mui/icons-material` na Fase 2 para substituir emojis por ícones reais.
  Motivo: emojis foram usados como solução temporária na Fase 1. Material UI Icons é a biblioteca padrão definida para este projeto.

- Decisão: criar `src/mocks/` com hooks comportamentais na Fase 2.
  Motivo: o frontend deve ter interatividade real (filtros que filtram, períodos que mudam dados) mesmo sem backend. Hooks de mock centralizam essa lógica e facilitam a futura substituição por chamadas reais de API.


Última atualização: [2026-05-06 14:15]

- [2026-05-04] Decisão: iniciar pelo frontend
  Motivo: validar interface antes da API

- [2026-05-04] Decisão: usar dados mockados
  Motivo: desacoplar da Meta API inicialmente

- [2026-05-05 13:45] Decisão: converter campos de `NovaCampanha` para inputs controlados (useState) e selects reais.
  Motivo: garantir edição do formulário e eliminar campos “congelados”.

- [2026-05-05 14:19] Decisão: restaurar `/` como Home e implementar `/mensal` como página separada conforme `screens/desktop/mensal/*`.
  Motivo: corrigir a confusão Home vs Mensal descrita no [P2] e manter as duas rotas visualmente distintas.

- [2026-05-05 14:33] Decisão: centralizar ícones em `src/styles/icons.js` usando Material UI Icons e normalizar nomes conforme disponibilidade do pacote.
  Motivo: substituir emojis por ícones consistentes sem espalhar imports diretos de `@mui/icons-material` pelo projeto.

- [2026-05-05 14:57] Decisão: aplicar base tipográfica/spacing via CSS global e remover overrides de título em páginas.
  Motivo: corrigir a sensação de “2x maior” e manter consistência entre telas.

- [2026-05-05 14:57] Decisão: tornar `SelectLike` um `<select>` real e centralizar interatividade mock em `src/mocks/*`.
  Motivo: permitir seleção persistente sem backend e preparar substituição futura por API.

- [2026-05-06 11:18] Decisão: preservar `screens/` como fonte de verdade visual e restaurar qualquer asset removido acidentalmente.
  Motivo: evitar perda de referência de design e manter rastreabilidade das telas durante refactors.

- [2026-05-06 11:52] Decisão: mover o frontend para `frontend/` (Fase 3 — P1) para preparar a evolução full stack com `backend/` e Docker.
  Motivo: isolar responsabilidades e evitar refactors maiores quando o backend for iniciado.
- [2026-05-06 12:04] Decisão: padronizar a documentação para usar os caminhos reais do repo (`screens/desktop/*` e `screens/mobile/*`) e evitar referências com case incorreto.
  Motivo: o filesystem é case-sensitive em muitos ambientes; referências incorretas geram divergência entre ExecPlan e estrutura real.
- [2026-05-06 12:08] Decisão: iniciar o backend com Node 22 + Express em `backend/` (package isolado), com `GET /healthz` e `PORT=3001` por padrão.
  Motivo: manter o projeto simples neste início, facilitar Docker futuro e permitir healthcheck imediato sem introduzir ORM/banco prematuramente.
- [2026-05-06 12:23] Decisão: remover métricas hardcoded do Dashboard e calcular `Total/Ativas/Rascunhos/Países` a partir de `frontend/src/data/*`; centralizar o ROI (Ontem) em mock compartilhado com a página `RoiOntem`.
  Motivo: reduzir divergências entre UI e mocks e evitar números “soltos” desconectados dos dados.
- [2026-05-06 12:35] Decisão: manter a raiz do repo enxuta após a separação full stack, removendo artefatos locais `dist/` e `node_modules/` da raiz.
  Motivo: evitar confusão (build/deps devem existir apenas em `frontend/` e `backend/`) e reduzir ruído no ambiente local.
- [2026-05-06 13:59] Decisão: manter um documento curto (`SOBRE.md`) na raiz para orientar rapidamente o objetivo do produto, fluxos e como rodar.
  Motivo: facilitar onboarding e reduzir dependência de contexto fora do `PLANS.md`.
- [2026-05-06 14:12] Decisão: iniciar o banco com Postgres + migrations SQL versionadas (runner simples em Node + `pg`) e seed idempotente para países/objetivos.
  Motivo: evitar dependência de ORM prematura, manter evolução incremental e garantir repetibilidade em ambiente Docker.
- [2026-05-06 14:15] Decisão: configurar Docker via `docker-compose.yml` (Postgres + backend + frontend) usando imagens `node:22-alpine`, com Postgres exposto em `5433` no host.
  Motivo: reduzir conflito com Postgres local (`5432`) e manter setup reproduzível sem Dockerfiles por enquanto.

Última atualização: [2026-05-18 17:26]
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
- [2026-05-17 14:40] Decisão: “Nova Campanha” permanece em manutenção/compatibilidade; novas capacidades devem ser implementadas no `/meta-test` com evidência operacional e sem duplicar lógica no legado.
- [2026-05-18 16:18] Decisão: permitir deep-link para o `/meta-test` com prefill via query params (`name`, `pageId`, `destinationUrl`) para reduzir atrito do fluxo legado, sem expor token no frontend. (commit: dc152a3)
- [2026-05-18 17:07] Decisão: no `/meta-test`, detectar `error_subcode=1885183` no card global de erro e exibir orientação acionável (App Live + roles) para reduzir atrito de troubleshooting no P4/P5. (commit: 1253b69)
- [2026-05-18 17:12] Decisão: permitir deep-link para o `/meta-test` pré-selecionar `generated_campaign_id` (query param) e expor atalho “Abrir /meta-test” na tabela de `Campanha Detalhes` para continuidade operacional sem duplicar UI. (commits: 8ae538f, 757af11)
- [2026-05-18 17:14] Decisão: isolar ações de compatibilidade (legado) em `Campanha Detalhes` atrás de UI colapsável para reduzir ruído operacional e manter `/meta-test` como fluxo evolutivo. (commit: 21c05dc)
- [2026-05-18 17:26] Decisão: documentar deep-links do `/meta-test` no `RUNBOOK.md` para reduzir erro operacional ao retomar fluxo (prefill e preselect por `generatedCampaignId`). (commit: 09f5432)
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
- [2026-05-18 15:02] Decisão: adicionar endpoints read-only de preview (Graph) para Creative/Ad (`/api/meta/*/:id/previews`, `ad_format`) e expor no `/meta-test` como evidência HTML copiável (token permanece apenas no backend). (commit: 893321b)
- [2026-05-18 15:09] Decisão: no `/meta-test`, além de copiar o HTML do preview, extrair e expor a URL do `iframe` como link “Abrir preview” (nova aba) para validação operacional mais rápida.

## Outcomes & Retrospective (histórico)

## Outcomes & Retrospective

Última atualização: [2026-05-06 14:15]

Entregue até aqui (frontend):

- SPA React + Vite rodando e buildando (sem backend).
- Navegação entre `Dashboard (Mensal)`, `Financeiro` e `Configurações`.
- Dashboard com cards de métricas, cards de ação e listagem visual de campanhas.
- Financeiro com filtros visuais, cards de métricas, gráfico (SVG) e tabela de detalhamento.
- Configurações com países fixos e “Outras Configurações”.
- Dados mockados centralizados em `frontend/src/data/`.
- Fase 3: frontend isolado em `frontend/` (build validado).
- Fase 3: backend iniciado em `backend/` com `GET /healthz` (healthcheck).
- Fase 3: banco iniciado com migrations/seed no backend (Postgres via `DATABASE_URL`).
- Fase 3: ambiente Docker adicionado (Postgres + backend + frontend) via `docker-compose.yml`.
- Fase 3: mocks do Dashboard refinados para evitar números hardcoded.
- Documentação: `SOBRE.md` preenchido para orientação rápida.

Pendências imediatas (frontend):

- Substituir emojis por ícones/asset definitivos, se necessário para fidelidade.
- Refinar “Mensal” (se existir tela própria no design).

Pendências imediatas (full stack):

- Evoluir integração backend↔banco (endpoints e queries reais) conforme telas e API da Meta.

Ao final da primeira fase, preencher esta seção com:

- O que foi entregue.
- Quais telas ficaram prontas.
- Quais componentes foram criados.
- O que ficou pendente.
- O que precisa ser feito antes da integração com backend.
- Quais decisões técnicas foram validadas.
- Quais problemas surgiram durante a implementação.



## Specs de UI (referência textual)

### Dashboard

A tela principal possui:

- Logo com ícone de globo.
- Título: `Campaign Builder`.
- Subtítulo: `Automação global de campanhas`.
- Botões superiores:
  - `Conta Global`
  - `Mensal`
  - `Financeiro`
  - `Configurações`

Cards de métricas:

- `Total de campanhas`: 1
- `Campanhas ativas`: 1
- `Rascunhos`: 0
- `ROI (Ontem)`: 132%
- `Países configurados`: 6

Cards de ação:

- `Criar Nova Campanha`
  - Texto: `Crie campanhas globais em minutos com automação inteligente`
  - Informações:
    - `Automação completa`
    - `6 países simultâneos`
  - Botão: `Nova Campanha`

- `Financeiro & Relatórios`
  - Texto: `Acompanhe gastos, performance e métricas em tempo real`
  - Informações:
    - `Dados da Meta Ads API`
    - `Análises detalhadas`
  - Botão: `Ver Financeiro`

- `ROI - Dia Anterior`
  - Texto: `Decisões baseadas em lucro real - Escale ou desative`
  - Informações:
    - `ROI por campanha`
    - `Otimização 1 clique`
  - Botão: `Ver ROI (Ontem)`

Seção de campanhas:

- Título: `Suas Campanhas`
- Botões:
  - `Filtrar`
  - `Ordenar`
- Card de campanha:
  - Nome: `DirigirBTN4`
  - Status: `Publicado`
  - Tipo: `Global`
  - Informação: `6 campanhas geradas`
  - Data: `Criado em 2026-04-24`
  - Países: Brasil, EUA, México, Emirados, França, Espanha
  - Botões:
    - `Ver Detalhes`
    - `Duplicar`

### Tela Financeiro

A tela financeiro possui:

- Botão `Voltar`
- Título: `Financeiro`
- Subtítulo: `Acompanhe os gastos e performance das campanhas`

Filtros:

- Conta de anúncio:
  - `Global Account`
- Business Manager:
  - `Main BM`
- Período:
  - `Hoje`
  - `Ontem`
  - `7 dias`
  - `30 dias`

Cards de métricas:

- `Gasto Total`: `R$ 35.902,08`
- `CPM Médio`: `R$ 8,88`
- `Cliques Totais`: `208.811`
- `Impressões`: `4.042.748`
- `CPC Médio`: `R$ 0,41`

Seção de gráfico:

- Título: `Gráfico de Gastos`
- Subtítulo: `Evolução diária dos gastos`
- Link/botão: `Ver relatório completo`
- Gráfico de linha com evolução de gastos.

### Tela Configurações

A tela configurações possui:

- Botão `Voltar`
- Título: `Configurações`
- Subtítulo: `Gerencie os países e idiomas do sistema`

Card `Países fixos do sistema`:

- Descrição: `Esses países serão usados para gerar campanhas automaticamente`
- Lista:
  - Brasil — Código: BR — Idioma: PT
  - EUA — Código: US — Idioma: EN
  - México — Código: MX — Idioma: ES
  - Emirados — Código: AE — Idioma: AR
  - França — Código: FR — Idioma: FR
  - Espanha — Código: ES — Idioma: ES

Mensagem:

- `A configuração de países será editável em versões futuras. Por enquanto, esses países estão fixos no sistema.`

Card `Outras Configurações`:

- `Tradução automática` — Ativo
- `Detecção de idioma` — Ativo
- `Modo de publicação` — Ativo

O sistema NÃO deve ser tratado apenas como um dashboard.

O objetivo real do produto é funcionar como uma plataforma operacional de automação de campanhas Meta Ads.

O frontend representa apenas a camada visual.

O núcleo do sistema será:

- Integração Meta Ads API
- Banco de dados
- Engine de ROI
- Sistema de automação
- Sincronização de métricas
- Regras automáticas de decisão

Última atualização: [2026-05-04 22:30]



## Plano original (bootstrap)

## Plan of Work

Última atualização: [2026-05-05 00:00]

A primeira fase deve ser feita em camadas.

### Fase 1 — Auditoria rápida do projeto atual

Antes de criar arquivos, o agente deve verificar:

- Se já existe projeto frontend.
- Qual stack está sendo usada.
- Se existe React, Vite, Next ou outro framework.
- Se já existe Tailwind, CSS Modules, SCSS, MUI ou outra biblioteca.
- Se existem rotas configuradas.
- Se existem componentes reaproveitáveis.
- Se existe padrão de pastas.

O agente deve registrar no `Surprises & Discoveries` qualquer diferença entre o projeto real e este plano.

### Fase 2 — Estrutura do frontend

Criar ou organizar estrutura semelhante a:

- `src/App.jsx`
- `src/main.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Financeiro.jsx`
- `src/pages/Configuracoes.jsx`
- `src/components/Header.jsx`
- `src/components/MetricCard.jsx`
- `src/components/ActionCard.jsx`
- `src/components/CampaignCard.jsx`
- `src/components/FilterBar.jsx`
- `src/components/CountriesList.jsx`
- `src/components/StatusBadge.jsx`
- `src/data/mockCampaigns.js`
- `src/data/mockCountries.js`
- `src/data/mockFinancial.js`
- `src/styles/global.css`

Se o projeto já tiver outra estrutura válida, não destruir a estrutura existente. Adaptar mantendo coerência.

### Fase 3 — Layout base

Criar um layout limpo, claro e próximo ao Figma:

- Fundo branco ou cinza muito claro.
- Cards brancos com borda leve.
- Tipografia forte nos títulos.
- Espaçamento generoso.
- Botões com estilo preto/branco.
- Destaques em verde para status positivo e ROI.
- Destaques em azul na tela financeiro.
- Sem excesso de gradientes.
- Sem excesso de border-radius.
- Visual profissional, limpo e parecido com SaaS.

### Fase 4 — Dashboard

Implementar:

- Cabeçalho.
- Navegação superior.
- Cards de métricas.
- Cards de ação.
- Seção `Suas Campanhas`.
- Card da campanha `DirigirBTN4`.
- Botões de filtro e ordenar apenas visuais nesta primeira fase.
- Botões de navegação:
  - `Ver Financeiro` deve abrir tela Financeiro.
  - `Configurações` deve abrir tela Configurações.
  - `Ver ROI (Ontem)` pode abrir uma seção futura ou, por enquanto, exibir placeholder visual.

### Fase 5 — Financeiro

Implementar:

- Header da página com voltar.
- Filtros visuais.
- Cards financeiros.
- Gráfico de gastos.
- Botão/link `Ver relatório completo`.

O gráfico pode ser feito com biblioteca já existente no projeto. Se não houver biblioteca, usar Recharts ou uma implementação simples em SVG/CSS.

### Fase 6 — Configurações

Implementar:

- Header da página com voltar.
- Lista de países fixos.
- Badges de idioma.
- Card de aviso.
- Card de outras configurações.
- Badges `Ativo`.

### Fase 7 — Dados mockados

Criar dados simulados em arquivos separados.

Exemplo de campanhas:

- Nome: `DirigirBTN4`
- Status: `Publicado`
- Escopo: `Global`
- Quantidade gerada: 6
- Data: `2026-04-24`
- Países: BR, US, MX, AE, FR, ES

Exemplo de países:

- Brasil / BR / PT
- EUA / US / EN
- México / MX / ES
- Emirados / AE / AR
- França / FR / FR
- Espanha / ES / ES

Exemplo financeiro:

- Gasto total: 35902.08
- CPM médio: 8.88
- Cliques totais: 208811
- Impressões: 4042748
- CPC médio: 0.41
- Série do gráfico: últimos 7 dias.

### Fase 8 — Responsividade

A tela deve funcionar minimamente em:

- Desktop.
- Tablet.
- Mobile.

No mobile:

- Cards devem empilhar.
- Botões superiores podem quebrar linha.
- Listas devem continuar legíveis.
- Campanha deve mostrar botões abaixo das informações.

### Fase 9 — Registro de pendências

Ao final, registrar em `Artifacts and Notes` o que ainda precisa ser feito:

- Backend.
- Banco de dados.
- Autenticação.
- Integração com Meta Ads API.
- Importação ou leitura estruturada do XLSX.
- Tela de criação de campanha.
- Tela de detalhes da campanha.
- Regras de ROI.
- Publicação/pausa automática.
- Tratamento de tokens e permissões da Meta.

---

### Fase 4 — Banco de Dados

- Modelar entidades
- Criar migrations
- Criar seeders
- Validar relacionamentos

---

### Fase 5 — Integração Meta

- Autenticação
- Leitura de contas
- Leitura de campanhas
- Criação de campanhas
- Atualização de campanhas

---

### Fase 6 — ROI

- Cálculo
- Histórico
- Métricas
- Relatórios

---

### Fase 7 — Automação

- Regras
- Workers
- Filas
- Scheduler



## Execução detalhada (Fase 2 — legado)

## FASE 2 — Correções críticas e melhorias de qualidade

> Fase 2 inicia APÓS a Fase 1 estar entregue. O objetivo é corrigir problemas encontrados na Fase 1 e elevar a qualidade do frontend antes de qualquer integração de backend.
> Ordem de execução sugerida: P1 → P2 → P3 → P4 → P5 → P6

### F2-Fase 1 — Corrigir inputs (P1)

1. Abrir `src/pages/NovaCampanha.jsx`
2. Listar todos os `<input>`, `<textarea>`, `<select>`
3. Para cada campo sem state:
   - Adicionar `const [valor, setValor] = useState('')`
   - Adicionar `value={valor}` e `onChange={e => setValor(e.target.value)}`
4. Testar digitação em cada campo
5. Commit: `fix: corrige inputs controlados em NovaCampanha`

### F2-Fase 2 — Separar Home de Mensal (P2)

1. Consultar `screens/desktop/home/` → entender o que é exclusivo da Home
2. Consultar `screens/desktop/mensal/` → entender o que é exclusivo do Mensal
3. Em `src/App.jsx`, garantir:
   - `<Route path="/" element={<Dashboard />} />` (sem redirect)
   - `<Route path="/mensal" element={<Mensal />} />`
4. Implementar `Mensal.jsx` baseado no design de `screens/desktop/mensal/`
5. Garantir que o Header/navbar mostra botão "Mensal" que navega para `/mensal`
6. Commit: `fix: separa rotas home e mensal conforme design`

### F2-Fase 3 — Instalar e aplicar Material UI Icons (P3)

1. `npm install @mui/icons-material @mui/material @emotion/react @emotion/styled`
2. Verificar que o build continua funcionando (`npm run build`)
3. Criar arquivo `src/styles/icons.js` com mapeamento de ícones usados no projeto:
   ```js
   export { PublicIcon, AddIcon, BarChartIcon, SettingsIcon,
            ArrowBackIcon, FilterListIcon, SortIcon,
            CheckCircleIcon, EditIcon, ContentCopyIcon } from '@mui/icons-material'
   ```
4. Substituir emojis em cada componente — um componente por vez
5. Commit: `feat: substitui emojis por Material UI Icons`

### F2-Fase 4 — Corrigir escala e tipografia (P4)

1. Abrir `src/styles/global.css`
2. Definir variáveis CSS:
   ```css
   :root {
     --font-size-xs: 11px;
     --font-size-sm: 12px;
     --font-size-base: 14px;
     --font-size-md: 15px;
     --font-size-lg: 18px;
     --font-size-xl: 22px;
     --space-1: 4px;
     --space-2: 8px;
     --space-3: 16px;
     --space-4: 24px;
     --space-5: 32px;
   }
   ```
3. Aplicar `font-size: var(--font-size-base)` no `body`
4. Revisar cada componente que usa tamanhos hardcoded — substituir por variáveis
5. Comparar visualmente com `screens/desktop/*` após cada ajuste
6. Commit: `style: aplica escala tipográfica baseada em grid 8px`

### F2-Fase 5 — Completar tela Nova Campanha (P5)

1. Consultar todas as imagens em `screens/desktop/nova-campanha/`
2. Identificar todos os campos visíveis
3. Implementar layout completo da tela (não layout livre)
4. Garantir que todos os campos são controlados (P1 resolvido antes)
5. Adicionar validação básica: campos obrigatórios não podem estar vazios ao submeter
6. Ação de submit: console.log dos dados + toast visual de confirmação mockado
7. Commit: `feat: completa tela nova-campanha fiel ao Figma`

### F2-Fase 6 — Adicionar mocks comportamentais (P6)

1. Criar `src/mocks/usePeriodFilter.js`:
   - Retorna dados de métricas diferentes por período selecionado
   - Períodos: 'hoje', 'ontem', '7dias', '30dias'
2. Criar `src/mocks/useCampaignFilters.js`:
   - Filtra array de campanhas por status (Publicado / Rascunho / Todos)
3. Conectar `PeriodPills` ao `usePeriodFilter` na tela Financeiro
4. Conectar botão Filtrar na Home ao `useCampaignFilters`
5. Commit: `feat: adiciona interatividade com hooks de mock comportamental`



## Artifacts and Notes (inventário histórico)

## Artifacts and Notes

Última atualização: [2026-05-06 14:15]

### Documentação de orientação

    SOBRE.md
    README.md
    docker-compose.yml

### Arquivos existentes (Fase 1 — entregues)

    frontend/src/App.jsx
    frontend/src/main.jsx
    frontend/src/pages/Dashboard.jsx
    frontend/src/pages/Financeiro.jsx
    frontend/src/pages/Configuracoes.jsx
    frontend/src/pages/Mensal.jsx           ← corrigido na Fase 2 (Home vs Mensal)
    frontend/src/pages/NovaCampanha.jsx     ← completo na Fase 2 (inputs + steps 1–5)
    frontend/src/pages/RoiOntem.jsx
    frontend/src/pages/CampanhaDetalhes.jsx
    frontend/src/pages/CampanhaDuplicar.jsx
    frontend/src/components/Header.jsx
    frontend/src/components/BackLink.jsx
    frontend/src/components/MetricCard.jsx
    frontend/src/components/ActionCard.jsx
    frontend/src/components/CampaignCard.jsx
    frontend/src/components/StatusBadge.jsx
    frontend/src/components/SpendLineChart.jsx
    frontend/src/components/RoiLineChart.jsx
    frontend/src/components/SelectLike.jsx
    frontend/src/components/PeriodPills.jsx
    frontend/src/components/FinanceMetricCard.jsx
    frontend/src/components/ExportButton.jsx
    frontend/src/components/PageShell.jsx
    frontend/src/data/mockCampaigns.js
    frontend/src/data/mockCountries.js
    frontend/src/data/mockFinancial.js
    frontend/src/data/mockMonthly.js
    frontend/src/data/mockRoiOntem.js
    frontend/src/styles/global.css

### Arquivos entregues na Fase 2

    frontend/src/mocks/usePeriodFilter.js    ← hook: simula dados por período
    frontend/src/mocks/useCampaignFilters.js ← hook: filtra campanhas por status
    frontend/src/mocks/useFormState.js       ← hook genérico de formulário controlado
    frontend/src/mocks/README.md             ← documentação de mocks
    frontend/src/styles/icons.js             ← mapeamento centralizado de ícones MUI

### Backend (Fase 3 — P2)

    backend/package.json
    backend/package-lock.json
    backend/src/server.js
    backend/src/routes/health.js
    backend/src/db.js
    backend/src/migrate.js
    backend/src/seed.js
    backend/migrations/0001_init.sql

### Referências externas

    screens/desktop/*  → fonte de verdade do design
    projeto_escopo.xlsx → fonte de verdade de regra de negócio

Pendências do produto completo:

- Criar backend.
- Criar banco de dados.
- Modelar campanhas.
- Modelar países.
- Modelar métricas.
- Modelar contas de anúncio.
- Modelar Business Managers.
- Criar autenticação.
- Criar tela real de criação de campanha.
- Criar tela de detalhes da campanha.
- Criar importação ou mapeamento do XLSX.
- Criar integração com Meta Ads API.
- Criar serviço para buscar insights da Meta.
- Criar serviço para criar campanhas na Meta.
- Criar serviço para pausar/ativar campanhas.
- Criar cálculo real de ROI.
- Criar logs de automação.
- Criar tratamento seguro de tokens.
- Criar permissões de usuário.

Observação importante:

O token da Meta Ads API nunca deve ficar no frontend. A integração real deve passar por backend próprio.



## Interfaces and Dependencies (arquitetura alvo/rascunhos)

## Interfaces and Dependencies

### Frontend

Primeiro foco deste ExecPlan.

Possível stack esperada:

- React
- Vite
- JavaScript
- CSS comum, SCSS, Tailwind ou MUI, dependendo do projeto real
- React Router, se necessário
- Recharts, se necessário para gráfico

### Backend futuro

Ainda não implementar nesta fase.

Responsabilidades futuras:

- Receber comandos do frontend.
- Salvar campanhas.
- Salvar países e idiomas.
- Salvar métricas financeiras.
- Conversar com Meta Ads API.
- Proteger tokens.
- Executar regras de automação.
- Expor endpoints para dashboard e relatórios.

### Banco de dados futuro

Possíveis tabelas futuras:

- `users`
- `ad_accounts`
- `business_managers`
- `campaigns`
- `generated_campaigns`
- `countries`
- `campaign_objectives`
- `campaign_metrics`
- `financial_reports`
- `automation_rules`
- `automation_logs`
- `meta_tokens`

### API da Meta Ads futura

A API da Meta deve ser usada futuramente para:

- Criar campanhas.
- Criar conjuntos de anúncios.
- Criar anúncios.
- Buscar métricas.
- Buscar gasto.
- Buscar impressões.
- Buscar cliques.
- Buscar CPC.
- Buscar CPM.
- Pausar campanhas.
- Ativar campanhas.
- Ajustar orçamento.

### Contratos futuros entre frontend e backend

Exemplos de endpoints futuros:

    GET /api/dashboard/summary
    GET /api/campaigns
    GET /api/campaigns/:id
    POST /api/campaigns
    POST /api/campaigns/:id/duplicate
    GET /api/financial/summary
    GET /api/financial/spend-chart
    GET /api/settings/countries
    GET /api/settings/options
    POST /api/meta/sync-insights
    POST /api/meta/campaigns
    PATCH /api/meta/campaigns/:id/status

### Dados que vieram do XLSX

O XLSX deve ser analisado com calma em fase futura para mapear:

- Quais campos viram tabelas.
- Quais campos viram formulários.
- Quais campos viram parâmetros de campanha.
- Quais campos são fixos.
- Quais campos são editáveis.
- Quais valores precisam ser traduzidos para valores aceitos pela Meta Ads API.

### Regra de segurança

Nunca colocar no frontend:

- Token da Meta.
- App Secret.
- Chaves privadas.
- Credenciais de cliente.
- Dados sensíveis de conta de anúncio.

Tudo isso deve ficar no backend ou em variáveis de ambiente seguras no servidor.

### Serviços futuros obrigatórios

O sistema dependerá futuramente de:

- Meta Ads API
- Sistema de filas
- Banco de dados PostgreSQL
- Serviço de automação
- Serviço de sincronização
- Serviço de cálculo de ROI

---

### Fluxo operacional futuro

Frontend
↓
Backend API
↓
Fila de processamento
↓
Meta Ads API
↓
Banco de dados
↓
Engine de ROI
↓
Sistema de automação
