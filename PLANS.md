# ExecPlan — Frontend do Campaign Builder baseado no Figma e no XLSX

Este ExecPlan é um documento vivo.

Ele deve ser mantido atualizado pelo agente durante a execução. Sempre que uma etapa for concluída, o agente deve marcar o item correspondente em `Progress`, registrar decisões relevantes em `Decision Log`, registrar descobertas inesperadas em `Surprises & Discoveries` e atualizar o estado real do projeto antes de encerrar a resposta.

Documentos relacionados:

- `RUNBOOK.md` — procedimentos operacionais (execução, validação, troubleshooting).
- `ARCHIVE.md` — histórico integral (worklog, fases concluídas, Decision Log completo, Surprises & Discoveries, specs e inventário).

## Purpose / Big Picture

Construir primeiro o frontend do sistema **Campaign Builder**, uma aplicação web que substitui a planilha operacional usada pelo cliente para criar, visualizar, organizar e acompanhar campanhas de anúncios.

O objetivo inicial deste ExecPlan é entregar uma interface fiel ao Figma, com telas navegáveis e dados simulados, preparando o projeto para futura integração com backend, banco de dados e API da Meta Ads.

O resultado visível esperado nesta primeira fase é:

- Uma tela principal de dashboard com cards de métricas.
- Uma listagem de campanhas.
- Uma tela financeira com filtros, cards de métricas e gráfico.
- Uma tela de configurações com países e idiomas fixos.
- Navegação entre as telas.
- Componentização organizada.
- Dados mockados baseados no XLSX e no Figma.
- Estrutura preparada para futura conexão com API real.

O objetivo final do produto, além desta primeira fase, é transformar o XLSX que hoje funciona como “sistema manual” do cliente em uma aplicação completa, com frontend, backend, banco de dados, integração com Meta Ads API, geração de campanhas, leitura de métricas e automação baseada em ROI.



## Progress

Última atualização: [2026-05-06 17:15]

- [x] Entendimento inicial: o XLSX era usado como sistema manual do cliente.
- [x] Entendimento inicial: o Figma representa a futura interface do sistema.
- [x] Entendimento inicial: o projeto tem relação com campanhas de anúncios e API da Meta.
- [x] Criar ou revisar a estrutura do projeto frontend.
- [x] Instalar e validar dependências necessárias.
- [x] Criar layout base da aplicação.
- [x] Criar navegação entre telas.
- [x] Implementar Dashboard.
- [x] Implementar listagem de campanhas.
- [x] Implementar tela Financeiro.
- [x] Implementar tela Configurações.
- [x] Criar dados mockados baseados no XLSX.
- [x] Componentizar cards, botões, listas, filtros e seções.
- [x] Validar responsividade mínima.
- [x] Revisar fidelidade visual com o Figma.
- [x] Registrar pendências para backend e Meta Ads API.
- [x] Atualizar este ExecPlan com tudo que foi feito.
- [x] Auditoria: padronizar referências de caminho `screens/Desktop/*` → `screens/desktop/*` (case-sensitive) para refletir o repo real.
- [x] Escrever dentro do arquivo na raiz `SOBRE.md` o que voce entendeu o que é o projeto. E qual o fluxo do projeto. E o que o projeto faz.

### Fase 2 — Correções críticas (em andamento)

- [x] P1 — Corrigir inputs (Nova Campanha)
- [x] P2 — Separar Home de Mensal
- [x] P3 — Substituir emojis por Material UI Icons
- [x] P4 — Corrigir escala/tipografia global
- [x] P5 — Completar tela Nova Campanha fiel ao design
- [x] P6 — Adicionar mocks comportamentais

### Fase 3 — Estrutura Full Stack (em andamento)

- [x] P1 — Reorganizar estrutura do projeto (mover frontend para `frontend/`)
- [x] P2 — Iniciar backend (criar `backend/` com servidor base + healthcheck)
- [x] P3 — Refinar mocks do frontend (métricas do Dashboard derivadas dos mocks)
- [x] P4 — Iniciar modelagem do banco (Postgres + migrations + seed)
- [x] P5 — Configurar Docker (docker-compose)

### Fase 4 — Integração Real, ROI e Automação (em andamento)

- [x] P1 — Modelagem real do banco (tabelas base via migrations SQL)
- [x] P2 — Iniciar fluxo operacional real (APIs REST + persistência)



## Backlog Ativo (Fase 4+)

### FASE 4 — Integração Real, ROI e Automação

> Esta fase transforma o projeto de frontend mockado
> para um sistema operacional real integrado com Meta Ads API.

#### [P1] Modelagem real do banco

- [x] Criar tabela `users`
- [x] Criar tabela `campaigns`
- [x] Criar tabela `generated_campaigns`
- [x] Criar tabela `countries`
- [x] Criar tabela `campaign_metrics`
- [x] Criar tabela `financial_reports`
- [x] Criar tabela `ad_accounts`
- [x] Criar tabela `business_managers`
- [x] Criar tabela `automation_rules`
- [x] Criar tabela `automation_logs`
- [x] Criar tabela `meta_tokens`

---

#### [P2] Fluxo operacional real da campanha

- [x] Definir fluxo completo da campanha
- [x] Definir como campanhas são geradas
- [x] Definir como campanhas serão duplicadas
- [x] Definir como campanhas serão publicadas
- [x] Definir persistência no banco
- [ ] Definir sincronização com Meta Ads

MVP (definição atual):

- Fonte de verdade: Postgres (tabelas `campaigns`, `campaign_country_targets`, `generated_campaigns`).
- Criar campanha: `POST /api/campaigns` (status inicial `draft`) + targets (`countryCodes`).
- Duplicar campanha: `POST /api/campaigns/:id/duplicate` (cria nova campanha em `draft` copiando targets).
- Gerar campanhas por país: `POST /api/campaigns/:id/generate` (upsert em `generated_campaigns` por target).
- Publicar (por enquanto): `POST /api/generated-campaigns/:id/mark-published` (marca `meta_campaign_id` e status `ACTIVE`).
- Ativação/pausa manual (stub): `POST /api/generated-campaigns/:id/status` (altera `status` localmente).

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




## Decisões Ativas (Arquiteturais/Operacionais)

- Decisão: organizar o frontend pensando em integração futura.
  Motivo: mesmo que o primeiro foco seja visual, o projeto final terá backend, banco de dados e API externa.

- Decisão: tratar o XLSX como referência de regra de negócio.
  Motivo: ele era usado pelo cliente como sistema manual, então suas abas, colunas e campos indicam como o cliente trabalha hoje.

- Decisão: manter este documento como fonte de verdade durante o desenvolvimento.
  Motivo: o agente não deve depender de contexto anterior da conversa. Tudo que for necessário para continuar o trabalho deve estar registrado aqui.

- Decisão: criar `src/mocks/` com hooks comportamentais na Fase 2.
  Motivo: o frontend deve ter interatividade real (filtros que filtram, períodos que mudam dados) mesmo sem backend. Hooks de mock centralizam essa lógica e facilitam a futura substituição por chamadas reais de API.


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

- [2026-05-06 17:15] Decisão: expor uma API REST mínima no backend (`/api/*`) para materializar o fluxo operacional de campanhas (criar/duplicar/gerar/publicar stub) antes da integração real com a Meta Ads API.
  Motivo: permitir persistência real já na Fase 4 (P2), mantendo a integração com a Meta (P3) como etapa separada.

## Bloqueios Ativos

- [2026-05-06 17:15] Não foi possível validar o Postgres via Docker neste ambiente: `docker compose up` falha por não conseguir conectar ao Docker daemon. Ação: iniciar o Docker Desktop/daemon e rodar `docker compose up` para aplicar migrations/seed e testar as rotas `/api/*` com DB real.
- [2026-05-06 14:15] Decisão: configurar Docker via `docker-compose.yml` (Postgres + backend + frontend) usando imagens `node:22-alpine`, com Postgres exposto em `5433` no host.
  Motivo: reduzir conflito com Postgres local (`5432`) e manter setup reproduzível sem Dockerfiles por enquanto.

Observação importante:

O token da Meta Ads API nunca deve ficar no frontend. A integração real deve passar por backend próprio.


## Context and Orientation

O projeto se chama, visualmente, **Campaign Builder**.

A aplicação deve substituir um XLSX usado pelo cliente como sistema manual para campanhas de anúncios.

O sistema tem relação com campanhas de anúncios, provavelmente Meta Ads, não Google AdSense. O termo “AdSense” pode ter sido usado de maneira genérica pelo cliente para se referir a anúncios, mas a interface e a necessidade de API indicam conexão com Meta Ads API.

O XLSX possui abas que ajudam a entender o sistema atual:

- `Observação`: contém instruções sobre objetivo de campanha.
- `VISUALIZAÇÃO`: parece representar uma visão exportada ou organizada de campanhas.
- `BOTÃO`: parece conter dados relacionados à geração/criação de campanhas.
- `Parametro`: parece conter parâmetros usados para salvar ou montar campanhas.
- `Preencher`: parece conter dados que o cliente preenchia manualmente, como textos principais, nome da campanha, domínio e permalink.

Pontos identificados no XLSX:

- Existem objetivos de campanha como:
  - Tráfego / Traffic
  - Leads / Outcome Leads
  - Vendas / Outcome Sales
- Existem campanhas com nomes em formato parecido com:
  - `Ingles [ARABE-MUNDO]`
  - `Ingles [ARABE-EUROPA]`
  - `Ingles [ALEMANHA]`
- Existem parâmetros de campanha no formato:
  - `ARM-KDramaBTN-FB`
  - `AREU-KDramaBTN-FB`
  - `DE-KDramaBTN-FB`
- Existem textos de anúncio, domínio e permalink na aba de preenchimento.

As imagens do Figma mostram principalmente estas telas:

1. Dashboard principal.
2. Dashboard principal sem a barra superior do Figma.
3. Tela Financeiro.
4. Tela Configurações.
5. Continuação da tela Configurações.

### Estrutura de Design (IMPORTANTE)

Existe uma pasta na raiz do projeto chamada:

    screens/

Essa pasta contém as referências visuais oficiais do projeto.

Estrutura:

    screens/
        desktop/
            home/
            configuracoes/
            financeiro/
            mensal/
            nova-campanha
            roi
        mobile/
            home/
            configuracoes/
            financeiro/
            mensal/

Dentro de cada pasta de página existem imagens que representam o design esperado.

Regras:

- Sempre consultar essas imagens antes de implementar qualquer tela.
- O Figma e as imagens da pasta `screens` são a fonte de verdade do design.
- O objetivo NÃO é criar UI livre, e sim reproduzir fielmente o padrão visual.
- Desktop é prioridade nesta fase.
- Mobile deve ser adaptado posteriormente com base nas versões Mobile disponíveis.

Observação:

Se houver divergência entre implementação e design, o design deve prevalecer.

### Fonte de Regra de Negócio (XLSX)

Existe um arquivo XLSX na raiz do projeto.

Este arquivo NÃO é apenas um exemplo.

Ele representa o sistema manual que o cliente utilizava.

Regras:

- O XLSX é a principal referência de regra de negócio.
- Todas as telas devem refletir os dados e lógica presentes nele.
- Os nomes de campanhas, objetivos, parâmetros e textos devem ser derivados dele.
- Nenhuma lógica deve ser inventada sem antes verificar o XLSX.

Abas importantes identificadas:

- Observação → contém definição de objetivos de campanha
- VISUALIZAÇÃO → visão geral de campanhas
- BOTÃO → dados relacionados à criação de campanhas
- Parametro → parâmetros usados nas campanhas
- Preencher → dados preenchidos manualmente (texto, domínio, permalink)

Exemplo de regra importante:

Usuário escolhe:
"Leads"

Sistema deve converter para:
"OUTCOME_LEADS" (formato da Meta Ads API)

Observação:

Nesta primeira fase (frontend), o XLSX NÃO deve ser lido diretamente pelo código.

Ele deve ser usado como referência para criação dos dados mockados.



## Arquitetura Atual (Estado real do repo)

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
- Fase 4: backend com API REST mínima em `/api/*` (countries/objectives/campaigns/generated-campaigns) para fluxo real de campanhas (persistência + geração/duplicação/publicação stub).
