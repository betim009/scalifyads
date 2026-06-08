# P58 - Validacao operacional final e sincronizacao de status Meta

Data: 2026-06-08

## Pipeline validado

Template

↓

Mercado operacional

↓

Campaign Meta REAL

↓

AdSet Meta REAL

↓

Creative Meta REAL

↓

Ad Meta REAL

O ciclo operacional foi validado com o mercado `ENCA` usando a linha:

- `operational_market_generation_id`: `aa36d50e-3120-4e48-aa8b-58f81a481f33`
- `market_code`: `ENCA`
- `market_param`: `ENCA-PlantasBTN-FB`
- `generated_campaign_id`: `41d063c6-8a5c-4098-a0bd-b24297eed781`

## Objetos reais criados

Objetos Meta reais validados:

- Campaign ID: `120248719385340596`
- AdSet ID: `120248719401030596`
- Creative ID: `1741627617191004`
- Ad ID: `120248721507440596`

O P58 nao criou novos objetos Meta. A sincronizacao executada fez apenas leituras Graph dos IDs acima e persistiu status locais.

## Sincronizacao de status

Antes do P58, o P57 havia registrado uma divergencia transitória:

- Graph do Ad: `configured_status=PAUSED`, `effective_status=PENDING_REVIEW`
- Persistencia local do Ad: `effective_status=IN_PROCESS`

Foi criada sincronizacao manual:

- servico: `backend/src/services/operationalMetaStatusSync.js`
- endpoint: `POST /api/operational-market-generations/:id/sync-meta-status`
- script: `backend/scripts/sync-operational-meta-status.js`
- validador rollback: `backend/scripts/validate-operational-status-sync.js`

Escopo da sincronizacao:

- le `generated_campaigns`, `generated_adsets`, `creative_drafts` e `generated_ads`;
- busca status reais no Graph por `meta_campaign_id`, `meta_adset_id`, `meta_creative_id` e `meta_ad_id`;
- atualiza apenas status/objetivo locais;
- nao chama endpoints de criacao;
- nao altera scheduler;
- nao altera delivery para `ACTIVE`.

Campos persistidos:

- `generated_campaigns.meta_status`
- `generated_campaigns.meta_effective_status`
- `generated_campaigns.meta_objective`
- `generated_campaigns.meta_adset_status`
- `generated_campaigns.meta_adset_effective_status`
- `generated_campaigns.meta_ad_status`
- `generated_campaigns.meta_ad_effective_status`
- `generated_adsets.configured_status`
- `generated_adsets.effective_status`
- `creative_drafts.meta_status`
- `generated_ads.configured_status`
- `generated_ads.effective_status`

## Status finais

Resultado da sincronizacao real:

```json
{
  "ok": true,
  "created": {
    "campaign": false,
    "adSet": false,
    "creative": false,
    "ad": false
  },
  "fetched": {
    "campaign": true,
    "adSet": true,
    "creative": true,
    "ad": true
  },
  "statuses": {
    "campaign": {
      "configured_status": "PAUSED",
      "effective_status": "PAUSED"
    },
    "adSet": {
      "configured_status": "PAUSED",
      "effective_status": "PAUSED"
    },
    "creative": {
      "meta_status": "ACTIVE"
    },
    "ad": {
      "configured_status": "PAUSED",
      "effective_status": "PAUSED"
    }
  }
}
```

Validacao Graph final:

- Campaign `120248719385340596`: `status=PAUSED`, `effective_status=PAUSED`, `objective=OUTCOME_AWARENESS`
- AdSet `120248719401030596`: `status=PAUSED`, `effective_status=PAUSED`
- Creative `1741627617191004`: `status=ACTIVE`
- Ad `120248721507440596`: `status=PAUSED`, `configured_status=PAUSED`, `effective_status=PAUSED`

Validacao local final:

- `generated_campaigns.meta_status = PAUSED`
- `generated_campaigns.meta_effective_status = PAUSED`
- `generated_campaigns.meta_adset_status = PAUSED`
- `generated_campaigns.meta_adset_effective_status = PAUSED`
- `generated_campaigns.meta_ad_status = PAUSED`
- `generated_campaigns.meta_ad_effective_status = PAUSED`
- `generated_adsets.configured_status = PAUSED`
- `generated_adsets.effective_status = PAUSED`
- `creative_drafts.status = meta_published`
- `creative_drafts.meta_status = ACTIVE`
- `generated_ads.configured_status = PAUSED`
- `generated_ads.effective_status = PAUSED`

Observacao sobre Creative: `ACTIVE` e o status do objeto Creative no Graph, nao delivery de Ad. A entrega continua bloqueada porque Campaign, AdSet e Ad permanecem `PAUSED`.

## Atualizacao de telas

Foram atualizadas exibicoes existentes para explicitar:

- `configured_status`
- `effective_status`
- status Meta do Creative quando sincronizado

Locais ajustados:

- `frontend/src/pages/metaTest/GeneratedCampaignsSection.jsx`
- `frontend/src/pages/metaTest/GeneratedStructureSection.jsx`
- `frontend/src/pages/metaTest/CreativeDraftsSection.jsx`

## Pendencias conhecidas

ARM:

- Targeting ARM inclui Singapura.
- A Meta exige requisito de compliance relacionado a `SINGAPORE_UNIVERSAL`.
- O pipeline nao deve tentar criar AdSet ARM ate a pendencia de compliance estar totalmente resolvida em ambiente real.

OFFSITE_CONVERSIONS:

- A conta usada nos testes nao possui Pixel, Custom Conversion ou evento offsite valido.
- Otimizacoes como `OFFSITE_CONVERSIONS` continuam bloqueadas sem `promoted_object` valido.
- O teste ENCA foi validado com `optimizationGoal=REACH` para evitar dependência de Pixel.

## Conclusao

O ciclo operacional minimo foi validado end-to-end:

- Template/mercado operacional gerou `ENCA-PlantasBTN-FB`.
- Campaign REAL foi criada em `PAUSED`.
- AdSet REAL foi criado em `PAUSED`.
- Creative REAL foi criado e reutilizado.
- Ad REAL foi criado com `configured_status=PAUSED`.
- Status reais foram sincronizados e persistidos localmente.
- Nenhum objeto novo foi criado no P58.
- Nenhum `ACTIVE` de delivery foi introduzido.
- Scheduler nao foi alterado.

O pipeline operacional ENCA esta validado para publicacao controlada em `PAUSED`. A proxima etapa segura e tratar pendencias externas antes de ampliar mercados ou objetivos: Pixel/conversoes para `OFFSITE_CONVERSIONS` e compliance de Singapura para ARM.
