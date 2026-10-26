# Delta for cognnitive-video-engine

Scope: cost estimation and the spend guard resolve models through the cascade; the guard is
gate-only and never selects.

## MODIFIED Requirements

### Requirement: Interactive Provider Consultation and Cost Estimation

The system MUST provide an asset cost estimator and provider pricing catalog
(`asset-cost-estimator.mjs`). Prior to asset synthesis, the engine MUST calculate per-scene
character counts, image layer requirements, unit pricing for selected image and voiceover
providers, and present an itemized per-scene and total budget estimation table for user approval.
Every model id the estimator uses MUST come from the single Model Selection Cascade resolver; the
estimator MUST NOT pick a model from a hardcoded default outside that resolver, and MUST report
the scope each resolved model came from.
(Previously: model ids were read from CLI flags with a hardcoded `DEFAULT_MODELS` fallback.)

#### Scenario: Script parsed and estimated by scene

- GIVEN a validated video script
- WHEN `asset-cost-estimator.mjs` is executed
- THEN it outputs an itemized table with per-scene durations, image counts, character counts, unit rates, and grand total in USD ($)
- AND each model id used is reported with the scope that supplied it

#### Scenario: The cascade is the only selector

- GIVEN a script with a video-level `template::`
- WHEN the estimator resolves the TTS/image models
- THEN it uses the cascade and never a bare hardcoded default

## ADDED Requirements

### Requirement: Spend Guard Is Gate-Only

The spend guard (`video-guard.json` + `SpendGuard`) MUST gate spend: it decides whether a resolved
model is allowed and whether the run fits the budget and daily cap. It MUST NOT select a model id.
An optional `defaults` block in `video-guard.json` MAY supply the `workspace` scope of the cascade.

#### Scenario: Blocked resolved model is refused before spend

- GIVEN a resolved model whose id is not in `allowedModels`
- WHEN `compile` runs
- THEN the whole run is refused before the first charge with a named error

#### Scenario: Guard never selects

- GIVEN the guard module
- WHEN it is inspected
- THEN it returns only allow/deny and budget verdicts, never a model id

#### Scenario: Workspace default participates in the cascade

- GIVEN `video-guard.json` declaring `defaults.tts`
- WHEN no more specific scope sets a TTS model
- THEN the engine uses the workspace default
