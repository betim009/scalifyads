# HARDENING_CHECKLIST — Hardening mínimo (pré-produção / pós-demo)

Última atualização: [2026-05-25 18:57]

Objetivo:
ter um checklist mínimo e executável de hardening antes de ampliar o uso (mesmo que ainda não seja produção).

Regras desta fase:

- Não trocar token agora.
- Não remover o token atual do ambiente local.
- Não enviar token ao frontend.
- Não commitar credenciais.
- Não imprimir token em logs.
- Não quebrar `/meta-test`.

## 1) Segredos no Git (obrigatório)

- [ ] Confirmar que `.env` está ignorado:
  - `git check-ignore -v .env` (deve apontar regra em `.gitignore`)
- [ ] Confirmar que não existe token/versionado no repo:
  - `git grep -n \"META_ACCESS_TOKEN\" -- . ':!*.example'` (não pode revelar valor real)
  - procurar também por `access_token`, `Authorization`, `Bearer`
- [ ] Revisar arquivos “locais” que não devem ir para Git:
  - prints/screenshots no root
  - dumps/exports de DB
  - logs

## 2) Frontend: superfície de segredo e ativação

- [ ] Confirmar que o frontend não usa/armazena token:
  - nenhum `accessToken` em `frontend/src`
  - nenhum `VITE_*` com token
- [ ] Confirmar que a UI não oferece criação `ACTIVE` (e que o backend força `PAUSED`)

## 3) Backend: guardrails e respostas

- [ ] Confirmar guardrail `PAUSED` forçado no backend:
  - Campaign: `backend/src/meta/campaigns.js`
  - AdSet: `backend/src/meta/adsets.js`
  - Ad: `backend/src/meta/ads.js`
- [ ] Confirmar que endpoints de status/diagnostics não retornam token:
  - `GET /api/meta/status` (somente boolean flags)
- [ ] Confirmar redaction em logs persistidos:
  - `ops_logs.details` deve redigir `token/access_token/authorization/cookie`

## 4) Operação (controle de risco)

- [ ] Demo/execução REAL sempre usa o roteiro e o checklist:
  - `DEMO_SCRIPT.md`
  - `SAFETY_CHECKLIST.md`
- [ ] Conferir Ads Manager: tudo `PAUSED`, gasto `R$ 0,00`
