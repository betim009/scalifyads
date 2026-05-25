# CREDENTIAL_ROTATION_PLAN — Rotação futura de credenciais Meta (planejado)

Última atualização: [2026-05-25 18:57]

Objetivo:
documentar um plano seguro para rotação futura de credenciais (token/permissões) **sem executar agora**.

Regras:

- Não executar rotação nesta fase sem autorização explícita.
- Não remover o token atual do ambiente local.
- Não enviar token ao frontend.
- Não commitar credenciais.
- Toda criação REAL deve permanecer `PAUSED`.

## Pré-condições (antes de rodar a rotação)

- [ ] Ter um token novo válido (gerado/fornecido pelo operador)
- [ ] Saber qual ambiente será alterado (local/teste/produção futura)
- [ ] Ter uma janela de teste controlada (ideal: sem demo ao mesmo tempo)
- [ ] Ter `META_AD_ACCOUNT_ID` e `META_PAGE_ID` disponíveis para validação

## Passo-a-passo (execução futura)

1) **Backup operacional (sem segredos)**
   - registrar evidências atuais (IDs `meta_*`, status, checklists) se necessário

2) **Atualizar somente o backend**
   - colocar o novo token no backend (preferência: `.env` local ignorado pelo Git, ou secret manager no deploy futuro)
   - reiniciar backend

3) **Validações rápidas (obrigatórias)**
   - `curl http://localhost:3001/healthz`
   - `curl http://localhost:3001/api/meta/status`
   - `curl -X POST http://localhost:3001/api/meta/validate -H 'Content-Type: application/json' -d '{}'`

4) **Validação STUB (controle)**
   - no `/meta-test`, criar STUB e confirmar persistência local/DB (não depende de permissões Meta)

5) **Validação REAL (controlada, sempre PAUSED)**
   - seguir `DEMO_SCRIPT.md` (apenas até confirmar criação e Graph read)
   - conferir Ads Manager: tudo `PAUSED`, gasto `R$ 0,00`

6) **Registro e rollback**
   - se falhar: registrar erro objetivo e reverter para o token anterior (se apropriado)

## Nota sobre permissões mínimas

As permissões exatas dependem do tipo de operação (criar Campaign/AdSet/Creative/Ad, ler insights, listar pages).
Antes de produção, consolidar uma lista mínima por endpoint e validar via `GET /api/meta/diagnostics`.

