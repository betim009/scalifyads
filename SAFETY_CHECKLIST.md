# SAFETY_CHECKLIST — Operação REAL (PAUSED) e demo segura

Última atualização: [2026-05-25 18:57]

Objetivo:
garantir que qualquer execução REAL (incluindo demo) seja **controlada**, **repetível** e **sem risco de ativação/acesso indevido**, mantendo o guardrail obrigatório de **tudo nascer `PAUSED`**.

Regras obrigatórias (não-negociáveis):

- Não criar objetos `ACTIVE` (Campaign/AdSet/Ad).
- Toda criação REAL deve permanecer `PAUSED`.
- Não trocar token agora.
- Não enviar token ao frontend.
- Não commitar credenciais.
- Não imprimir token em logs.
- Não remover fallback `STUB`.
- Não quebrar `/meta-test`.

## Checklist — Antes de executar qualquer REAL

- [ ] Stack no ar (se for usar DB): `docker compose up -d`
- [ ] Backend OK: `curl http://localhost:3001/healthz`
- [ ] Meta status OK: `curl http://localhost:3001/api/meta/status`
  - esperado: `has_access_token=true` (REAL) e **nenhum token retornado**
- [ ] Token **somente no backend**:
  - env `META_ACCESS_TOKEN` **ou** token salvo via `POST /api/meta/tokens`
  - confirmar que o frontend não possui nenhum `VITE_*` com token
- [ ] Guardrail `PAUSED` auditado:
  - backend força `PAUSED` na criação REAL (mesmo se o client tentar outro status)
- [ ] Campos operacionais prontos:
  - `META_AD_ACCOUNT_ID` conhecido (formato `act_<id>`)
  - `META_PAGE_ID` disponível (env no backend ou input no publish do Creative)
- [ ] Ads Manager (controle de risco):
  - garantir que nenhum item será ativado manualmente durante a execução
  - confirmar que o operador sabe onde checar “Valor gasto”/Spend e manter `R$ 0,00`

## Checklist — Durante a execução REAL

- [ ] Registrar evidências copiáveis (IDs e responses) no `/meta-test`
- [ ] Conferir `status=PAUSED` em cada criação (Campaign/AdSet/Ad)
- [ ] Conferir Graph read (via backend) após cada etapa
- [ ] Não capturar/colocar token em prints/notes

## Checklist — Depois da execução REAL (ou demo)

- [ ] Confirmar no Ads Manager: tudo `PAUSED` e sem gasto
- [ ] Salvar evidências:
  - IDs `meta_*` relevantes
  - status/effective_status quando aplicável
  - preview (quando disponível) e Graph snapshots
- [ ] Se houve falha operacional:
  - registrar erro objetivo (mensagem + `error_subcode` quando existir)
  - registrar em `PLANS.md` (P14/P15) e apontar próxima ação segura

