# META_PERMISSIONS_CHECKLIST — Permissões mínimas (verificação)

Última atualização: [2026-05-25 18:57]

Objetivo:
ter um checklist prático para verificar, com segurança, se o token atual (e futuros tokens) têm permissões suficientes para operar o fluxo REAL (sempre `PAUSED`) e para troubleshooting.

Regras:

- Não expor token em logs/prints/docs.
- Não enviar token ao frontend.
- Sempre validar permissões via backend.

## Verificação via backend (recomendado)

- `GET /api/meta/diagnostics`
  - retorna `me.permissions` (quando disponível) e ajuda a entender bloqueios de Page/roles
- `POST /api/meta/validate`
  - valida Graph `/me` para sanity check do token

## Checklist por capacidade (operacional)

- [ ] Criar Campaign REAL (PAUSED): `POST /api/meta/campaigns` / `POST /api/meta/campaigns/simple`
- [ ] Criar AdSet REAL (PAUSED): `POST /api/meta/adsets`
- [ ] Publicar Creative REAL (AdCreative): `POST /api/meta/creative-drafts/:id/publish`
  - depende de Page/IG actor quando aplicável
- [ ] Criar Ad REAL (PAUSED): `POST /api/meta/ads`
- [ ] Graph reads:
  - `GET /api/meta/campaigns/:id`
  - `GET /api/meta/adsets/:id`
  - `GET /api/meta/ads/:id`
  - previews:
    - `GET /api/meta/creatives/:id/previews`
    - `GET /api/meta/ads/:id/previews`
- [ ] Páginas (para obter `pageId`):
  - `GET /api/meta/pages?...`

## Observação (escopos/permissões)

Os nomes exatos de permissões/escopos podem variar conforme a política/versão e o tipo de operação.
Antes de qualquer uso mais amplo, consolidar uma lista mínima real (por endpoint) a partir de:

- `GET /api/meta/diagnostics` (permissões retornadas)
- erros reais observados (mensagem + subcode)
- documentação oficial da Meta (fora do escopo desta execução)

