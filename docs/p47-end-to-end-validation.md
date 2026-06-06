# P47 - End-to-End Operational Flow Validation

Date: 2026-06-06

## Objective

Validate the complete operational flow using only existing system capabilities:

Campaign Template -> translations by market -> operational market generation -> campaign operational detail.

This validation did not publish anything to Meta and did not create Meta Campaigns, AdSets, or Ads.

## Scope

Markets validated:

- ARM
- AREU
- ENCA
- ENAU

Niche validated:

- PlantasBTN

## Steps Executed

1. Created a temporary Campaign Template through the existing API:
   - `POST /api/campaign-templates`

2. Confirmed the template payload contained:
   - `payload.niche = "PlantasBTN"`
   - `payload.adVariants` with 2 variants

3. Generated translations by market through the existing endpoint:
   - `POST /api/campaign-templates/:templateId/translations-by-market/generate`
   - payload: `{ "markets": ["ARM", "AREU", "ENCA", "ENAU"], "overwrite": true }`

4. Confirmed persistence in:
   - `payload.translationsByMarket.ARM`
   - `payload.translationsByMarket.AREU`
   - `payload.translationsByMarket.ENCA`
   - `payload.translationsByMarket.ENAU`

5. Generated operational campaign markets through the existing endpoint:
   - `POST /api/generated-campaigns/operational-markets`
   - payload: `{ "templateId": "...", "markets": ["ARM", "AREU", "ENCA", "ENAU"] }`

6. Confirmed the response created local operational records only:
   - `operational_market_generations`
   - `generated_campaigns = []`
   - `meta_publishing = false`

7. Opened the operational detail through the existing endpoint:
   - `GET /api/generated-campaigns/:campaignId/operational-markets`

8. Validated each market row:
   - `marketCode`
   - `marketName`
   - `marketParam`
   - `utmCampaign`
   - `src`
   - `status`
   - `resolvedCountries`
   - `targetingPreview`
   - `publishable`
   - `previewOnly`

9. Queried `operational_market_generations` directly to confirm persisted values.

10. Deleted the temporary validation records from the local database after the test:
   - `operational_market_generations`
   - `campaigns`
   - `campaign_templates`

## Results

Template validation:

- Campaign Template created successfully.
- `payload.adVariants` existed and contained 2 variants.
- `payload.translationsByMarket` was generated for all 4 requested markets.

Translation validation:

- ARM generated with Arabic market language.
- AREU generated with Arabic market language.
- ENCA generated with English market language.
- ENAU generated with English market language.
- Existing overwrite behavior was exercised with `overwrite=true`.

Operational generation validation:

| Market | Market name | Market param | UTM campaign | SRC | Status | Resolved countries | Publishable | Preview only |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| ARM | Árabe Mundo | ARM-PlantasBTN-FB | ARM | ARM-PlantasBTN-FB | PAUSED | 82 | false | true |
| AREU | Árabe Europa | AREU-PlantasBTN-FB | AREU | AREU-PlantasBTN-FB | PAUSED | 33 | false | true |
| ENCA | Inglês Canadá | ENCA-PlantasBTN-FB | ENCA | ENCA-PlantasBTN-FB | PAUSED | 1 | false | true |
| ENAU | Inglês Austrália | ENAU-PlantasBTN-FB | ENAU | ENAU-PlantasBTN-FB | PAUSED | 1 | false | true |

Guardrail validation:

- `status = PAUSED` for every operational market generation.
- `publishable = false` for every operational market generation.
- `previewOnly = true` for every operational market generation.
- `metaPublishing = false` in the detail endpoint.
- `meta_publishing = false` in the generation response.
- `generated_campaigns = []`.
- No Meta endpoint was called during the validation.
- No Meta Campaign was created.
- No Meta AdSet was created.
- No Meta Ad was created.
- No `ACTIVE` state was introduced by this validation.

## Evidence

Validation command executed locally with the running Docker services:

```sh
node --input-type=module
```

The validation script used only:

- `POST /api/campaign-templates`
- `POST /api/campaign-templates/:templateId/translations-by-market/generate`
- `POST /api/generated-campaigns/operational-markets`
- `GET /api/generated-campaigns/:campaignId/operational-markets`
- direct local DB cleanup after validation

Observed response summary:

```json
{
  "ok": true,
  "markets": ["ARM", "AREU", "ENCA", "ENAU"],
  "adVariants": 2,
  "translationsByMarket": ["AREU", "ARM", "ENAU", "ENCA"],
  "metaPublishing": false,
  "metaPublishingCreateResponse": false,
  "generatedCampaignsRows": 0
}
```

## Inconsistencies Found

No blocking inconsistency was found in the validated flow.

Non-blocking observations:

- The operational translation UI exists under `Campaign Templates (DB)` in the technical/diagnostic area, while `/templates` still primarily manages `flow_templates`.
- This is acceptable for the current incremental stage, but the operational user journey would be clearer if Campaign Templates and Flow Templates are unified or clearly separated in the navigation.
- Some market languages remain intentionally unsupported by automatic LibreTranslate generation until a safe target language policy is defined.

## Suggested Corrections

Recommended next steps:

- P48: decide whether `/templates` should become the main operational surface for Campaign Templates.
- P48/P49: define the final policy for unsupported translation languages.
- Before first real Meta publication by market, add an explicit publish-readiness checklist that still keeps default `PAUSED`.

## Final Checklist

- [x] Campaign Template created or selected.
- [x] `payload.adVariants` confirmed.
- [x] Translations generated for ARM, AREU, ENCA, ENAU.
- [x] `payload.translationsByMarket` persisted.
- [x] Operational flow executed with the same template.
- [x] Markets ARM, AREU, ENCA, ENAU selected.
- [x] Operational campaign generated.
- [x] `operational_market_generations` created.
- [x] Campaign operational detail opened.
- [x] `marketCode` validated.
- [x] `marketName` validated.
- [x] `marketParam` validated.
- [x] `utmCampaign` validated.
- [x] `src` validated.
- [x] `status` validated.
- [x] `resolvedCountries` validated.
- [x] `targetingPreview` validated.
- [x] `status = PAUSED`.
- [x] `publishable = false`.
- [x] `previewOnly = true`.
- [x] `metaPublishing = false`.
- [x] No Meta REAL call.
- [x] No Meta Campaign created.
- [x] No Meta AdSet created.
- [x] No Meta Ad created.
- [x] No `ACTIVE`.
