# DEMO_SCRIPT — Demo operacional controlada (REAL sempre PAUSED)

Última atualização: [2026-05-25 18:57]

Objetivo:
demonstrar o fluxo REAL completo **com segurança** e **sem improviso**, criando na Meta uma estrutura completa:

Campaign REAL → AdSet REAL → Creative REAL → Ad REAL

Regras obrigatórias (durante toda a demo):

- Não criar objetos `ACTIVE`.
- Toda criação REAL deve permanecer `PAUSED`.
- Não trocar token agora.
- Token nunca vai para o frontend.
- Não commitar credenciais.
- Não imprimir token em logs.
- Não remover fallback `STUB`.

Referências:

- Checklist de segurança: `SAFETY_CHECKLIST.md`
- Playbooks e comandos: `RUNBOOK.md`
- Fluxo passo-a-passo (com exemplos): `OPERATING_FLOW.md`
- Operação limpa (cliente): `/campaign-flow` e `/roi-operacional` (debug via `/meta-test`)

## Checklist — Antes de iniciar (2 minutos)

- [ ] Stack no ar: `docker compose up -d`
- [ ] Backend OK: `curl http://localhost:3001/healthz`
- [ ] Meta status: `curl http://localhost:3001/api/meta/status` (esperado: `has_access_token=true`)
- [ ] Token está **apenas no backend** (env `META_ACCESS_TOKEN` ou salvo via `/api/meta/tokens`)
- [ ] Ter em mãos:
  - `metaAdAccountId` (`act_<id>`)
  - `pageId` (ou `META_PAGE_ID` no backend)
- [ ] Lembrar: no Ads Manager, no fim, tudo deve estar `PAUSED` e com gasto `R$ 0,00`

## Dados sugeridos (copiar/colar)

- Campaign name: `DEMO • Campaign Builder • BR • 2026-05-25`
- AdSet name: `DEMO • AdSet • BR • ABO`
- Ad name: `DEMO • Ad • PAUSED • 2026-05-25`
- primaryText: `Teste controlado do Campaign Builder. Não ativar.`
- headline: `Demo — Anúncio PAUSED`
- description: `Fluxo REAL validado via backend.`
- destinationUrl: `https://example.com/?utm_source=demo&utm_medium=meta&utm_campaign=campaign-builder`

## Roteiro (10–15 minutos)

### 1) Abrir o console operacional

- Abrir `http://localhost:5173/meta-test`
- Confirmar no topo (status):
  - DB (se aplicável)
  - META ready (token presente no backend)
  - Modo `REAL` selecionado

### 2) Validar token via backend (opcional, mas recomendado)

- No `/meta-test`, executar “Validar token (Graph /me)”
- Evidência esperada: JSON `ok=true` e `me.id` presente

### 3) Criar Campaign REAL (PAUSED)

- Preencher `metaAdAccountId` (`act_<id>`)
- Informar nome e objetivo
- Criar Campaign

Evidência esperada:

- `meta_campaign_id` retornado
- `status=PAUSED` (confirmar em Graph quando disponível)

### 4) Criar AdSet REAL (PAUSED)

- Selecionar a `generatedCampaign` recém-criada
- Preencher nome + budget + billing/optimization
- Criar AdSet

Evidência esperada:

- `meta_adset_id` retornado
- `status=PAUSED` (effective pode iniciar como `IN_PROCESS`)

### 5) Criar Creative Draft

- Criar um draft com os textos e `destinationUrl`
- Confirmar que o draft foi persistido (id UUID)

### 6) Publicar Creative REAL

- Garantir que `pageId` está disponível (input ou env `META_PAGE_ID` no backend)
- Publicar Creative REAL

Evidência esperada:

- `meta_creative_id` retornado e persistido
- Graph read do Creative OK

### 7) Criar Ad REAL (PAUSED)

- Usar `creativeDraftId` (se o draft já tem `meta_creative_id`)
- Criar Ad REAL

Evidência esperada:

- `meta_ad_id` retornado
- `status=PAUSED`
- `creative_id_source` (body|draft) aparece para troubleshooting

### 8) Graph read + Preview (quando disponível)

- Consultar Graph para Campaign/AdSet/Ad
- Consultar preview do Creative e do Ad (snippet HTML/iframe; pode demorar até ~24h para ficar disponível)

### 9) Conferir Ads Manager (controle final)

- Abrir Ads Manager
- Confirmar:
  - Campaign/AdSet/Ad estão `PAUSED`
  - gasto/valor usado permanece `R$ 0,00`

## Checklist — Depois da demo (2 minutos)

- [ ] Confirmar no Ads Manager: tudo `PAUSED` e gasto `R$ 0,00`
- [ ] Registrar evidências (sem token):
  - `meta_campaign_id`, `meta_adset_id`, `meta_creative_id`, `meta_ad_id`
  - status/effective_status
  - preview (se houver)
- [ ] Se algo falhou:
  - registrar o erro objetivo (mensagem + subcode)
  - registrar no `PLANS.md` (P15) e seguir para próxima ação segura
