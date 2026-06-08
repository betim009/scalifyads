# P58 - Checklist final de entrega

Data: 2026-06-08

## Entregue

✓ Templates operacionais

✓ Traducoes por mercado

✓ `operational_market_generations`

✓ Preview de publicacao operacional

✓ Campaign Meta REAL em `PAUSED`

✓ Targeting operacional ENCA

✓ AdSet Meta REAL em `PAUSED`

✓ Creative Meta REAL

✓ Ad Meta REAL em `PAUSED`

✓ Persistencia local em `generated_campaigns`

✓ Persistencia local em `generated_adsets`

✓ Persistencia local em `creative_drafts`

✓ Persistencia local em `generated_ads`

✓ Sincronizacao manual de status Meta

✓ Exibicao de `configured_status`

✓ Exibicao de `effective_status`

✓ Nenhum scheduler alterado

✓ Nenhum objeto criado como `ACTIVE`

## Objetos ENCA validados

✓ Campaign: `120248719385340596`

✓ AdSet: `120248719401030596`

✓ Creative: `1741627617191004`

✓ Ad: `120248721507440596`

## Status final

✓ Campaign `configured_status/status = PAUSED`

✓ Campaign `effective_status = PAUSED`

✓ AdSet `configured_status/status = PAUSED`

✓ AdSet `effective_status = PAUSED`

✓ Ad `configured_status/status = PAUSED`

✓ Ad `effective_status = PAUSED`

✓ Creative `meta_status = ACTIVE`

Observacao: o status `ACTIVE` do Creative e status do objeto criativo no Graph. Ele nao representa delivery ativo.

## Pendencias

□ Pixel real para objetivos de conversao

□ Custom Conversion ou evento offsite valido

□ `promoted_object` real para `OFFSITE_CONVERSIONS`

□ Compliance ARM/Singapura em ambiente real

□ Validacao ARM apos compliance

□ Validacao AREU real

□ Estrategia de lote operacional apos guardrails por unidade estarem maduros

□ Politica de reprocessamento quando Graph retornar `PENDING_REVIEW` ou `IN_PROCESS`

## Guardrails mantidos

✓ Criacao individual por mercado

✓ Confirmacao explicita nos endpoints reais

✓ Status obrigatorio `PAUSED`

✓ Sem criacao automatica em lote

✓ Sem remocao de guardrails antigos

✓ Sem alteracao de scheduler

✓ P58 fez apenas leitura Graph e persistencia local de status
