# P55G - Compliance regional de Singapura no AdSet operacional

## Contexto

No P55F, as tentativas REAL de criar AdSet sem Pixel foram bloqueadas pela Meta quando o targeting ARM incluiu Singapura (`SG`):

```text
Valor necessario para categorias regulamentadas regionais: SINGAPORE_UNIVERSAL
```

Campo indicado pela Meta:

```text
compliance_section
```

Nenhum AdSet, Creative, Ad ou `ACTIVE` foi criado no P55F.

## Correcao

O fluxo operacional de AdSet agora detecta `SG` no payload final:

```json
{
  "geo_locations": {
    "countries": ["AE", "...", "SG", "..."]
  }
}
```

Quando `SG` esta presente, o service operacional envia:

```json
{
  "compliance_section": "SINGAPORE_UNIVERSAL"
}
```

## Arquivos alterados

- `backend/src/services/operationalMarketAdSetPublisher.js`
- `backend/src/meta/adsets.js`
- `backend/scripts/validate-operational-publish-adset.js`

## Compatibilidade

Fluxo legado preservado:

```text
countryCode unico -> metaCreateAdSet
```

`metaCreateAdSet` so serializa `compliance_section` quando o campo e recebido. Chamadores legados que nao passam `complianceSection` continuam com o mesmo comportamento anterior.

## Validacao sem Meta REAL

Script:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5433/campaign_builder \
node backend/scripts/validate-operational-publish-adset.js
```

Validacoes cobertas:

- ARM inclui `SG` no targeting operacional;
- ARM envia `complianceSection = SINGAPORE_UNIVERSAL` para o stub;
- `metaCreateAdSet` serializa `compliance_section = SINGAPORE_UNIVERSAL`;
- targeting continua sem `excluded_countries`;
- AdSet continua `PAUSED`;
- nenhum Creative e criado;
- nenhum Ad e criado;
- duplicidade continua bloqueada.

## Guardrails

P55G nao executou Meta REAL.

Nao foi criado:

- AdSet;
- Creative;
- Ad;
- `ACTIVE`.

Scheduler nao foi alterado.

## Proximo passo

Repetir o teste REAL controlado do P55F para ARM com a mesma Campaign, criando no maximo 1 AdSet `PAUSED`.
