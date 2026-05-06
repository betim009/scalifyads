# ExecPlan — Frontend do Campaign Builder baseado no Figma e no XLSX

Este ExecPlan é um documento vivo.

Ele deve ser mantido atualizado pelo agente durante a execução. Sempre que uma etapa for concluída, o agente deve marcar o item correspondente em `Progress`, registrar decisões relevantes em `Decision Log`, registrar descobertas inesperadas em `Surprises & Discoveries` e atualizar o estado real do projeto antes de encerrar a resposta.

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

## Purpose / Big Picture

Última atualização: [2026-05-04 22:30]

Explica o objetivo e o resultado visível.

## Progress

Última atualização: [2026-05-06 11:52]

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

### Fase 2 — Correções críticas (em andamento)

- [x] P1 — Corrigir inputs (Nova Campanha)
- [x] P2 — Separar Home de Mensal
- [x] P3 — Substituir emojis por Material UI Icons
- [x] P4 — Corrigir escala/tipografia global
- [x] P5 — Completar tela Nova Campanha fiel ao design
- [x] P6 — Adicionar mocks comportamentais

## Data Progress

Última atualização: [2026-05-06 11:52]

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
- [x] [2026-05-05 09:54] Revisão de fidelidade visual (comparação com `screens/Desktop/*`)
- [x] [2026-05-05 09:55] Registro de pendências (backend/db/Meta Ads API + telas futuras)
- [x] [2026-05-05 09:55] ExecPlan atualizado e consistente com o código atual
- [x] [2026-05-05 14:57] P4 — Ajuste de escala tipográfica e espaçamentos globais (base 14px + refinamentos)
- [x] [2026-05-05 14:57] P5 — Tela Nova Campanha completada conforme `screens/Desktop/nova-campanha/*` (steps 1–5 + sidebar)
- [x] [2026-05-05 14:57] P6 — Mocks comportamentais (período no Financeiro + filtro/ordenação na Home + selects reais)
- [ ] [2026-05-06 11:52] Fase 3 (P1) — Movido o frontend para `frontend/` e validado `npm run build` (commit pendente)

## Pending Work (Pendências)

Última atualização: [2026-05-06 11:52]

Esta seção lista tudo que ainda NÃO foi implementado,
mesmo que não esteja explicitamente no Progress.

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
- `/` → Rota da HOME (Dashboard principal — `screens/Desktop/home/`)
- `/mensal` → Rota separada MENSAL (`screens/Desktop/mensal/`)
- O botão "Mensal" na navbar navega para `/mensal`, não é a página atual

Tarefas:
- [x] Consultar imagens em `screens/Desktop/home/` e `screens/Desktop/mensal/` para entender a diferença visual
- [x] Corrigir a rota `/` para renderizar o Dashboard correto (Home) — não deve ser redirecionado para `/mensal`
- [x] Corrigir `src/pages/Mensal.jsx` para refletir fielmente o design de `screens/Desktop/mensal/`
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
- [x] Comparar visualmente telas principais com `screens/Desktop/*` após ajuste
- [x] Commit: `style: corrige escala tipográfica e espaçamentos conforme Figma`

---

#### [P5] TELA NOVA CAMPANHA: Implementar fiel ao design

A tela `nova-campanha` está incompleta. Não reflete o design do Figma.

Tarefas:
- [x] Consultar TODAS as imagens em `screens/Desktop/nova-campanha/`
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
- [ ] Commit: `refactor: move frontend para diretorio dedicado`

#### [P2] Iniciar backend

- [ ] Criar diretório `backend/`
- [ ] Criar estrutura inicial de pastas
- [ ] Criar servidor base
- [ ] Criar rota health check
- [ ] Preparar conexão futura com banco
- [ ] Commit: `feat: inicia estrutura base do backend`

#### [P3] Refinar mocks do frontend

- [ ] Auditar mocks existentes
- [ ] Corrigir inconsistências entre campanhas e dashboard
- [ ] Garantir que métricas sejam calculadas a partir dos mocks
- [ ] Evitar números fixos desconectados dos dados
- [ ] Commit: `fix: corrige consistencia dos mocks do dashboard`

#### [P4] Iniciar modelagem do banco de dados

- [ ] Analisar telas existentes
- [ ] Analisar mocks
- [ ] Analisar XLSX
- [ ] Propor entidades principais
- [ ] Criar migrations iniciais
- [ ] Criar seeders iniciais
- [ ] Commit: `feat: inicia modelagem do banco de dados`

#### [P5] Configurar Docker

- [ ] Criar `docker-compose.yml`
- [ ] Configurar serviço do frontend
- [ ] Configurar serviço do backend
- [ ] Configurar serviço do banco
- [ ] Definir portas sem conflito
- [ ] Criar comandos documentados para subir, parar, retomar e reiniciar
- [ ] Criar comando para limpar apenas o banco
- [ ] Commit: `feat: adiciona ambiente docker`

### Observação

Esta seção deve ser atualizada sempre que:

- Algo não for implementado pelo Codex
- Um bug for encontrado
- Um fluxo estiver incompleto

## Surprises & Discoveries

- O XLSX não é apenas uma base de dados complementar. Ele representa o fluxo operacional que o cliente já usava como sistema manual.
- O Figma não deve ser tratado como uma tela isolada. Ele representa a primeira versão visual de um produto que substituirá uma planilha operacional.
- O projeto não é apenas um CRUD. Ele tende a envolver automação, relatórios, regras de campanha e integração externa com a Meta Ads API.
- As informações de países, idiomas, objetivos de campanha e nomes de campanha precisam ser tratadas como regras importantes, não como textos soltos de interface.

Última atualização: [2026-05-06 11:52]

- [2026-05-04] O XLSX era o sistema principal do cliente
- [2026-05-04] O projeto não é apenas CRUD, envolve automação
- [2026-05-05 09:33] Repositório ainda não tem projeto frontend (sem `package.json`/`src`); contém apenas `.git`, `PLANS.md`, `PLANS.design.md`, `README.md`, `screens/` e `projeto_escopo.xlsx`.
- [2026-05-05 09:33] Screens Desktop incluem tabela “Detalhamento por Campanha” no Financeiro (além de filtros/cards/gráfico); ExecPlan anterior mencionava apenas gráfico.
- [2026-05-05 09:33] XLSX tem abas: `Observação`, `VISUALIZAÇÃO`, `BOTÃO`, `Parametro`, `Preencher`; campanhas do XLSX aparecem como “Ingles [PAÍS/REGIÃO]” e o exemplo visual “DirigirBTN4” não aparece no arquivo.
- [2026-05-05 09:36] `npm install` reportou 2 vulnerabilidades moderadas via `npm audit` (não corrigido ainda para evitar alterações não relacionadas).
- [2026-05-05 12:59] A seção `Pending Work` estava com data futura `[2026-05-05 23:00]` em relação ao horário real do sistema (corrigido para refletir o estado atual).
- [2026-05-05 13:01] Arquivos locais de prompt (`PROMPT.*.txt`) estavam na raiz e apareciam como untracked; adicionados ao `.gitignore` para evitar commits acidentais.
- [2026-05-05 00:00] ERRO DE INTERPRETAÇÃO (Codex — Fase 1): o botão “Mensal” aparece visualmente ativo no Figma da tela HOME, o que levou o Codex a tratar a HOME como sendo a página MENSAL. As duas são páginas distintas: `screens/Desktop/home/` ≠ `screens/Desktop/mensal/`. A rota `/` deve ser a Home; `/mensal` deve ser a Mensal. A decisão de redirecionar `/` para `/mensal` foi um erro e deve ser revertida.
- [2026-05-05 00:00] O projeto usa emojis como substitutos de ícones — isso foi uma decisão temporária (Fase 1) que deve ser resolvida na Fase 2 com Material UI Icons.
- [2026-05-05 00:00] Inputs de `NovaCampanha.jsx` não respondem à digitação — provável uso de `value` sem `onChange` (inputs controlados quebrados).
- [2026-05-05 00:00] Layout visual está com escala aproximadamente 2x o esperado — fonte base provavelmente não foi definida corretamente em `global.css`, e os componentes herdaram tamanhos do browser default.
- [2026-05-05 14:19] A pasta de design no repo está em `screens/desktop/*` e `screens/mobile/*` (não `screens/Desktop/*`), então ao seguir o ExecPlan é necessário ajustar o caminho conforme a estrutura real.
- [2026-05-05 14:33] `@mui/icons-material` no projeto não possui alguns nomes sugeridos no plano (ex: `PersonOutline`, `PauseCircleOutline`); foi necessário ajustar para variantes existentes (ex: `PersonOutlined`, `PauseCircleOutlined`) mantendo a API interna em `src/styles/icons.js`.
- [2026-05-05 14:57] O design completo de `Nova Campanha` inclui steps 3–5 (Copy Base, Orçamento/Programação, Upload + sidebar); a seção [P5] foi atualizada e implementada conforme `screens/desktop/nova-campanha/*`.
- [2026-05-06 11:18] Divergência local detectada: o arquivo de design `screens/desktop/home/Captura de Tela 2026-05-05 às 08.25.14.png` estava removido no working tree; arquivo restaurado para preservar a fonte de verdade visual.
- [2026-05-06 11:52] Após iniciar a Fase 3 (P1), o frontend deixou de ficar na raiz: todos os caminhos do app agora são relativos a `frontend/` (ex: `src/*` → `frontend/src/*`), e comandos passam a ser executados em `frontend/`.

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


Última atualização: [2026-05-06 11:52]

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

## Outcomes & Retrospective

Última atualização: [2026-05-06 11:52]

Entregue nesta fase (frontend):

- SPA React + Vite rodando e buildando (sem backend).
- Navegação entre `Dashboard (Mensal)`, `Financeiro` e `Configurações`.
- Dashboard com cards de métricas, cards de ação e listagem visual de campanhas.
- Financeiro com filtros visuais, cards de métricas, gráfico (SVG) e tabela de detalhamento.
- Configurações com países fixos e “Outras Configurações”.
- Dados mockados centralizados em `frontend/src/data/`.
- Fase 3 (em andamento): frontend isolado em `frontend/` (build validado).

Pendências imediatas (frontend):

- Substituir emojis por ícones/asset definitivos, se necessário para fidelidade.
- Refinar “Mensal” (se existir tela própria no design).

Ao final da primeira fase, preencher esta seção com:

- O que foi entregue.
- Quais telas ficaram prontas.
- Quais componentes foram criados.
- O que ficou pendente.
- O que precisa ser feito antes da integração com backend.
- Quais decisões técnicas foram validadas.
- Quais problemas surgiram durante a implementação.

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
        Desktop/
            home/
            configuracoes/
            financeiro/
            mensal/
            nova-campanha
            roi
        Mobile/
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

Última atualização: [2026-05-04 22:30]

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

1. Consultar `screens/Desktop/home/` → entender o que é exclusivo da Home
2. Consultar `screens/Desktop/mensal/` → entender o que é exclusivo do Mensal
3. Em `src/App.jsx`, garantir:
   - `<Route path="/" element={<Dashboard />} />` (sem redirect)
   - `<Route path="/mensal" element={<Mensal />} />`
4. Implementar `Mensal.jsx` baseado no design de `screens/Desktop/mensal/`
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
5. Comparar visualmente com `screens/Desktop/*` após cada ajuste
6. Commit: `style: aplica escala tipográfica baseada em grid 8px`

### F2-Fase 5 — Completar tela Nova Campanha (P5)

1. Consultar todas as imagens em `screens/Desktop/nova-campanha/`
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

## Concrete Steps

Última atualização: [2026-05-04 22:30]

O agente deve seguir estes passos concretos.

### 1. Inspecionar o projeto

Executar comandos equivalentes:

    ls
    find . -maxdepth 2 -type f | sort
    cat package.json

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

## Validation and Acceptance

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

## Idempotence and Recovery

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

## Artifacts and Notes

Última atualização: [2026-05-06 11:52]

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
    frontend/src/styles/global.css

### Arquivos entregues na Fase 2

    frontend/src/mocks/usePeriodFilter.js    ← hook: simula dados por período
    frontend/src/mocks/useCampaignFilters.js ← hook: filtra campanhas por status
    frontend/src/mocks/useFormState.js       ← hook genérico de formulário controlado
    frontend/src/mocks/README.md             ← documentação de mocks
    frontend/src/styles/icons.js             ← mapeamento centralizado de ícones MUI

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
