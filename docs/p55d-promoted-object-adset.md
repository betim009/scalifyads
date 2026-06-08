# P55D - promoted_object para AdSet OFFSITE_CONVERSIONS

## Contexto

No P55C, a repeticao REAL do AdSet operacional confirmou que o erro de `geo_locations.excluded_countries` foi resolvido. A Meta passou a bloquear a criacao por outro requisito:

```text
Selecione um objeto promovido para seu conjunto de anuncios.
```

Erro Graph:

```json
{
  "code": 100,
  "error_subcode": 1815430
}
```

Isso ocorre porque `optimizationGoal = OFFSITE_CONVERSIONS` exige `promoted_object`.

## Auditoria do fluxo antigo

Busca local por:

- `promoted_object`
- `promotedObject`
- `pixel_id`
- `custom_event_type`
- `OFFSITE_CONVERSIONS`

Resultado: o fluxo antigo de `metaCreateAdSet` nao tratava `promoted_object`. Ele enviava:

- `campaign_id`;
- `daily_budget`;
- `billing_event`;
- `optimization_goal`;
- `targeting`;
- `status = PAUSED`;
- lances opcionais.

Nao havia resolucao local de Pixel, Conversion Event ou Custom Conversion.

## Endpoint operacional

`POST /api/operational-market-generations/:id/publish-adset`

Payload para `OFFSITE_CONVERSIONS`:

```json
{
  "dailyBudgetCents": 1000,
  "billingEvent": "IMPRESSIONS",
  "optimizationGoal": "OFFSITE_CONVERSIONS",
  "promotedObject": {
    "pixel_id": "123456789012345",
    "custom_event_type": "PURCHASE"
  },
  "confirmPublishPausedAdSet": true
}
```

Tambem sao aceitos campos equivalentes dentro de `promotedObject`, como:

- `custom_conversion_id`;
- `offsite_conversion_event_id`;
- `pixel_rule`;
- `pixel_aggregation_rule`.

Para `OFFSITE_CONVERSIONS`, a validacao local exige pelo menos uma destas formas:

- `pixel_id` + `custom_event_type`;
- `custom_conversion_id`;
- `offsite_conversion_event_id`.

## Comportamento por optimizationGoal

`OFFSITE_CONVERSIONS`:

- `promotedObject` e obrigatorio;
- sem `promotedObject`, o endpoint retorna erro local 400;
- com objeto incompleto, o endpoint retorna erro local 400;
- com objeto valido, o service passa `promotedObject` para `metaCreateAdSet`.

Outros objetivos:

- `promotedObject` continua opcional;
- o fluxo segue para as validacoes existentes;
- o fluxo legado por `countryCode` continua preservado.

## Helper Meta

`metaCreateAdSet` agora aceita:

```js
promotedObject: {
  pixel_id: '123456789012345',
  custom_event_type: 'PURCHASE'
}
```

O helper serializa no payload Graph:

```json
{
  "promoted_object": {
    "pixel_id": "123456789012345",
    "custom_event_type": "PURCHASE"
  }
}
```

O helper continua forçando:

```json
{
  "status": "PAUSED"
}
```

## Guardrails

P55D nao executou Meta REAL.

Nao foi criado:

- AdSet;
- Creative;
- Ad;
- `ACTIVE`.

Scheduler nao foi alterado.

## Validacao sem Meta REAL

Script:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5433/campaign_builder \
node backend/scripts/validate-operational-publish-adset.js
```

O script valida:

- `OFFSITE_CONVERSIONS` sem `promotedObject` bloqueia localmente;
- `OFFSITE_CONVERSIONS` com `promotedObject` chega ao stub;
- o stub recebe `pixel_id`;
- o stub recebe `custom_event_type`;
- objetivo nao-OFFSITE sem `promotedObject` nao e bloqueado por essa regra;
- `metaCreateAdSet` serializa `promoted_object`;
- `metaCreateAdSet` continua forçando `PAUSED`;
- payload de targeting continua sem `excluded_countries`;
- nenhum Creative ou Ad e criado;
- duplicidade continua bloqueada.

## Conclusao

P55D prepara o endpoint para a proxima repeticao REAL controlada. O proximo teste deve continuar restrito a 1 mercado e 1 AdSet `PAUSED`, usando `promotedObject` valido para a conta Meta.
