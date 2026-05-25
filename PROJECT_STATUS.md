# PROJECT_STATUS — Campaign Builder

Última atualização: [2026-05-25 18:57]

## 1. Resumo executivo

O Campaign Builder deixou de ser apenas um protótipo: hoje existe um **MVP operacional** com **integração REAL validada ponta a ponta** com a Meta Marketing API. O sistema já consegue criar e registrar evidências de uma estrutura completa (Campaign → AdSet → Creative → Ad), com guardrail obrigatório de segurança (**tudo nasce PAUSED**), além de leitura via Graph e preview quando disponível.

## 2. Estado atual em uma frase

“O sistema já consegue criar, via backend, uma estrutura REAL completa na Meta: Campaign, AdSet, Creative e Ad, mantendo tudo PAUSED e persistindo evidências no banco.”

## 3. O que já está funcional

- Frontend React/Vite (SPA).
- Backend Node/Express.
- Banco Postgres (migrations + seed).
- Docker (stack db/backend/frontend).
- `/meta-test` como console operacional (fluxo principal para validação).
- Integração Meta REAL (Marketing API via backend; token nunca no frontend).
- Fallback STUB (para desenvolvimento e persistência sem credenciais).
- Logs operacionais (incluindo persistência em `ops_logs` quando DB está habilitado).
- Templates (campaign/country/creative/copy) para acelerar fluxo no `/meta-test`.
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

- P14 — Auditoria e estabilização pós-fluxo REAL
- P15 — Demo operacional controlada
- P16 — Hardening e rotação de credenciais
- P17 — Preparação do fluxo operacional limpo

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
