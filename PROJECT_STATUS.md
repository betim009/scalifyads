# PROJECT_STATUS — Campaign Builder

Última atualização: [2026-05-26 13:05]

## 1. Resumo executivo

O Campaign Builder já passou da fase de prova técnica: existe um **fluxo operacional guiado** para criação REAL/STUB (com login interno e credenciais Meta por usuário) e um console técnico (`/meta-test`) para troubleshooting/auditoria. O foco agora é **produtividade operacional** (lote + templates + repetição rápida) para preparar uma entrega controlada ao cliente, mantendo guardrails (**tudo REAL nasce `PAUSED`**).

## 2. Estado atual em uma frase

“O sistema permite operar criação REAL em lote via `/campaign-flow`, com login interno e credenciais por usuário, mantendo tudo `PAUSED` e usando `/meta-test` como laboratório técnico.”

## 3. O que já está funcional

- Frontend React/Vite (SPA).
- Backend Node/Express.
- Banco Postgres (migrations + seed).
- Docker (stack db/backend/frontend).
- `/meta-test` como console operacional (fluxo principal para validação).
- `/campaign-flow` como fluxo guiado inicial (operação limpa) — validado manualmente em modo REAL + suporte a criação em lote por país (P20).
- Login interno simples + perfil (`/login`, `/profile`) para vincular credenciais Meta por usuário (token sempre no backend; UI exibe apenas `...XXXX`).
- Integração Meta REAL (Marketing API via backend; token nunca no frontend).
- Fallback STUB (para desenvolvimento e persistência sem credenciais).
- Logs operacionais (incluindo persistência em `ops_logs` quando DB está habilitado).
- Templates (campaign/country/creative/copy) para acelerar fluxo no `/meta-test`.
- `/roi-operacional` (P22): ROI mínimo operacional com receita manual + ações seguras (pausar/editar orçamento com confirmação).
- Workflow operacional (ops_state + eventos/checkpoints).
- Scheduler/automação leve (opt-in por env; endpoints de status).
- Páginas legais para publicação do app Meta (privacy/terms/data deletion) + deploy SPA.
- App Meta publicado/aceito.
- Forma de pagamento configurada na Ad Account (revalidado após resolver blocker de billing).
- Fluxo REAL completo validado (Campaign REAL → AdSet REAL → Creative REAL → Ad REAL).

## 4. Fluxo REAL validado

| Item | Status |
| --- | --- |
| Campaign REAL | OK |
| AdSet REAL | OK |
| Creative REAL | OK |
| Ad REAL | OK |
| Preview | OK |
| Persistência DB | OK |
| Graph read | OK |
| Status PAUSED | OK |

## 5. Evidências principais

Fontes: `PLANS.md` (estado atual) + `RUNBOOK.md` (playbooks e registros operacionais). **Não incluir token.**

- `meta_campaign_id`: `120246780124490596` (evidência REAL registrada no runbook).
- `meta_adset_id`: `120246780152480596` (evidência REAL registrada no runbook; effective pode iniciar como `IN_PROCESS`).
- `meta_creative_id`: `1322965599841590` (Creative REAL revalidado após app publicado).
- `meta_ad_id`: `120247685122480596` (Ad REAL criado com `status=PAUSED`).
- `status=PAUSED` (criação REAL forçada em backend; evidência em Graph).
- `effective_status=IN_PROCESS` (aplicável no Ad, durante processamento inicial).
- Commit de evidência recente: `4ae8eb7` — “Revalidar P5: Ad REAL (PAUSED)”.

## 6. O que ainda não significa produção

Apesar do fluxo REAL estar validado, isto **ainda não é produção**. Ainda faltam, no mínimo:

- autenticação completa;
- hardening de segurança;
- rotação de credenciais;
- permissões/roles multiusuário;
- monitoramento;
- testes automatizados;
- política final de deploy;
- revisão de UX para cliente final;
- controle de ativação para evitar gastos.

## 7. Próxima fase recomendada

- Consolidar operação rápida (P11/P20/P21) como base operacional estável.
- Próxima evolução: **P22 — ROI operacional mínimo** (sem dashboard avançado):
  - gasto (Meta) + receita manual (primeira versão);
  - lucro/prejuízo + ROI;
  - ações operacionais seguras (pausar/editar orçamento com confirmação).
- Depois: P23 (revisão UX operacional) → P24 (plano de entrega controlada ao cliente).

## 8. Riscos atuais

- Risco de gasto se algum item for ativado (ex.: criar/alterar para `ACTIVE`).
- Dependência de credenciais Meta (token e permissões).
- Dependência de billing/forma de pagamento da Ad Account.
- Uso do token atual apenas para teste controlado (não é estratégia de produção).
- Necessidade de manter **PAUSED obrigatório** em todas as criações durante validação.

## 9. Decisão operacional atual

- Não trocar token agora.
- Usar o token atual somente no backend para validação controlada.
- Trocar credenciais futuramente antes de produção (rotação planejada).
- Nunca enviar token ao frontend.
- Nunca commitar token.
