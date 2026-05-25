# ENVIRONMENTS — Separação de ambientes (local / teste / produção futura)

Última atualização: [2026-05-25 18:57]

Objetivo:
reduzir risco operacional e facilitar hardening/rotação futura separando claramente **onde** cada credencial/configuração vive.

Princípios:

- Segredos (tokens/keys) nunca vão para o frontend e nunca vão para o Git.
- O backend é a única camada que conhece credenciais Meta.
- Durante validação e demo: toda criação REAL permanece `PAUSED`.

## Ambiente: Local (dev/ops)

Uso:
desenvolvimento e validações controladas via `/meta-test`.

Configuração sugerida:

- `.env` local (ignorado pelo Git)
- `docker-compose.yml` lê env vars do host para o container do backend

Validação mínima:

- `curl http://localhost:3001/healthz`
- `curl http://localhost:3001/api/meta/status`
- `curl -X POST http://localhost:3001/api/meta/validate -H 'Content-Type: application/json' -d '{}'`

## Ambiente: Teste (demo controlada)

Uso:
demo com roteiro e checklist, sem improviso.

Regras extras:

- Executar apenas com `DEMO_SCRIPT.md` + `SAFETY_CHECKLIST.md`
- Registrar evidências sem segredos (IDs `meta_*`, status, previews quando disponíveis)

## Produção futura (não-implementado)

Objetivo:
uso por cliente/usuários finais com governança e segurança.

Direções (documentação apenas; não implementar agora):

- armazenar segredos via secret manager do provedor (ou equivalente)
- autenticação/roles
- auditoria e observabilidade
- separação de tokens por usuário/conta/tenant (quando aplicável)

