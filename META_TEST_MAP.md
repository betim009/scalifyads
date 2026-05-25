# META_TEST_MAP — Operação normal vs troubleshooting (`/meta-test`)

Última atualização: [2026-05-25 18:57]

Objetivo:
mapear o que é **operação normal** (fluxo do dia-a-dia de validação/demo) versus o que é **troubleshooting** no console `/meta-test`, para orientar a evolução do “fluxo operacional limpo” sem quebrar o laboratório técnico.

## Operação normal (fluxo REAL controlado)

Usar principalmente estas seções (ordem típica):

- `BackendStatusSection` — validar DB/META ready (sem token no frontend)
- `StepCampaignSection` — criar Campaign (REAL/STUB; REAL sempre `PAUSED`)
- `StepAdSetSection` — criar AdSet (REAL/STUB; REAL sempre `PAUSED`)
- `CreativeDraftsSection` / `CreativeAssetsSection` — criar draft + (opcional) asset
- `CreativeRealAcceptanceCard` — publish do Creative REAL (AdCreative)
- `StepAdSection` — criar Ad REAL (sempre `PAUSED`) + previews
- `GraphRefreshSection` — Graph reads (Campaign/AdSet/Ad) para evidência
- `GeneratedStructureSection` / `MetaStructureSummaryCard` — evidenciar estrutura (Campaign → AdSet → Ad)

Evidências esperadas ao final:

- IDs `meta_*` (campaign/adset/creative/ad)
- status `PAUSED` em cada criação
- Graph read OK
- preview OK quando disponível

## Troubleshooting / Diagnóstico (usar quando necessário)

Seções e utilidades:

- `ModeStatusCard` — flags e dicas operacionais (Page/IG actor/config)
- `OpsLogsSection` / `OpsLogsDbSection` — logs operacionais (com redaction de segredos)
- `PausedMetaCampaignsSection` — listar campanhas `PAUSED` existentes no Ads Manager via backend
- `CampaignBatchSection` — batch por país (útil, mas não é essencial para demo mínima)
- `CampaignTemplatesSection` / `GeneratedCampaignEventsSection` — aceleração/recovery e histórico

## Diretriz de evolução (P17)

- Operação normal deve migrar para um fluxo mais “limpo” (guiado) no futuro.
- Troubleshooting permanece no `/meta-test` (console técnico) para suporte e auditoria.
- O `/meta-test` não deve ser quebrado nem removido.

