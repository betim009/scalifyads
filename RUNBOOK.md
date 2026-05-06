# RUNBOOK — Execução, validação e troubleshooting

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


### Observação

Esta seção deve ser atualizada sempre que:

- Algo não for implementado pelo Codex
- Um bug for encontrado
- Um fluxo estiver incompleto

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
- Automação MVP (manual):
  - Rodar executor (dry-run): `curl -X POST http://localhost:3001/api/automation/run -H 'Content-Type: application/json' -d '{"dryRun":true}'`
  - Rodar executor (persistindo logs): `curl -X POST http://localhost:3001/api/automation/run -H 'Content-Type: application/json' -d '{}'`



## Concrete Steps

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



## Troubleshooting

- [2026-05-06 14:15] Validação do `docker compose up` não foi possível neste ambiente: Docker daemon inacessível (erro de socket). O `docker-compose.yml` foi criado, mas precisa ser validado em máquina com Docker Desktop/daemon ativo.
