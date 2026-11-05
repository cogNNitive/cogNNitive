# conntent-model-catalog Specification

## Purpose
TBD - created by archiving change 2026-11-02-video-script-v1. Update Purpose after archive.
## Requirements
### Requirement: Blueprint Ships A Dated Reference Catalog

The bluepriNNt MUST ship a catalog as kNNowledge with three Concepts. `Provider` carries `name` and `api_base`. `Model` carries a unique slug, its `provider`, `api_id`, one `capability` (`tts`, `image`, `avatar` or `video`), `controls` (a subset of `speed`, `emotion`, `size`, `resolution`), `sizes` (for image models), `adapter`, `price`, `price_unit` (`per_1k_chars`, `per_image` or `per_second`), `price_date` and `status` (`active` or `blocked`). `Voice` carries `model`, `voice_id` and `language`. The catalog MUST NOT contain two entries for the same model.

#### Scenario: Catalog validates

- GIVEN the shipped catalog
- WHEN it is validated against the blueprint
- THEN every Model has a capability, price, price unit, price date and adapter and no model is duplicated

#### Scenario: Unpriced model in the reference catalog

- GIVEN a catalog Model with no price
- WHEN the catalog is validated
- THEN validation fails naming the model

#### Scenario: Id spelling is reconciled

- GIVEN a script naming `wavespeed/z-image/turbo` while the catalog model is `wavespeed-ai/z-image/turbo`
- WHEN the script is checked
- THEN `unknown-model` names the id and no silent alias is applied

### Requirement: The DomaiNN Overlay Allowlists Models And Overrides Prices

A domaiNN MUST be able to hold one overlay document `model-catalog_NN.md` whose `Model` elements set `allowed`, `price`, `price_date` and `price_source:: invoice`, merged per Model slug with the overlay winning. A Model defined only in the overlay MUST declare every Model field and name an existing adapter. A model not allowed by the overlay MUST NOT be used by any run. The domaiNN MUST use one currency, and every price in the merged catalog MUST use it.

#### Scenario: Override beats reference price

- GIVEN a catalog price of 0.01 and an overlay invoice price of 0.012 for the same model
- WHEN the merged catalog is read
- THEN the model's price is 0.012 with `price_source` `invoice` and the overlay date

#### Scenario: Disallowed model is refused before spend

- GIVEN a scene resolving a catalog model the overlay does not allow
- WHEN `produce` runs
- THEN it fails before any charge naming the model and the allowlist

#### Scenario: Overlay-only model is complete

- GIVEN an overlay Model absent from the reference catalog that omits `adapter`
- WHEN the merged catalog is built
- THEN it fails naming the model and the missing field

### Requirement: One Merged Catalog Feeds Every Consumer

The spend guard, the cost estimator, the console picklists and the intent adapters MUST read the same merged catalog (reference catalog plus overlay). No model id, price, allowlist or capability MUST be defined in engine code or in a guard file, and capability MUST come from the Model's declared capability, never from matching a substring of the id.

#### Scenario: Consumers agree

- GIVEN the merged catalog
- WHEN the guard allowlist, the estimator's priced models and a picklist are compared
- THEN the sets of allowed models are equal

#### Scenario: Capability is declared, not guessed

- GIVEN an avatar model whose id contains no known vendor string
- WHEN the engine selects its request mode
- THEN the mode follows the declared adapter and controls of the Model

#### Scenario: No literals in code

- GIVEN the engine and skill scripts
- WHEN they are searched for catalog model ids and price constants
- THEN none is found outside test fixtures

### Requirement: Unpriced Allowed Models Block, Unknown Models Fail

A run MUST fail before any spend when a resolved model is not in the merged catalog (`unknown-model`), is not allowed, is `status:: blocked`, or has no price after merging (`unpriced-model`). The engine MUST NOT apply a fallback rate.

#### Scenario: Allowed but unpriced

- GIVEN an allowed model with no price after merging
- WHEN `produce` runs
- THEN it fails with `unpriced-model` naming the model
- AND no fallback rate is used and nothing is spent

#### Scenario: Unknown model

- GIVEN a scene resolving `acme/new-model` absent from the merged catalog
- WHEN the estimate is built
- THEN it fails with `unknown-model`

#### Scenario: Blocked status

- GIVEN a Model with `status:: blocked`
- WHEN a scene resolves it
- THEN the run fails before spend naming the model

### Requirement: Stale Prices Warn And Never Block

Every priced line of an estimate MUST state the price, its source (`blueprint` or `invoice`) and its `price_date`. The catalog MUST carry a `stale_after_days` value (default 90). A price older than that MUST produce a staleness warning in the estimate and in the Series view, and MUST NOT stop a run.

#### Scenario: Provenance shown

- GIVEN an estimate with one blueprint-priced and one invoice-priced model
- WHEN it is printed
- THEN each line shows price, source and date

#### Scenario: Stale price warns

- GIVEN a model price dated 120 days ago and `stale_after_days` 90
- WHEN the estimate is printed
- THEN that line carries a staleness warning and the estimate is still produced

### Requirement: Intent Adapters Translate Intent Fields

Each Model MUST name an adapter (`scripts/adapters/<id>.mjs`) exporting its `controls` and a `translate(intent, model)` function that turns the intent fields (`voice_speed`, `voice_emotion`, `image_size`, and the avatar resolution) into provider parameters. A test MUST assert that each adapter's `controls` equal the Model's declared `controls`. A non-default intent value for a control the resolved model does not declare MUST fail at estimate, before any spend, with `unsupported-control` naming the field and the model. Intent values MUST NOT be passed raw to a provider.

#### Scenario: Speed is translated

- GIVEN a TTS model declaring `speed` and a scene resolving `voice_speed:: 1.1`
- WHEN the request is built
- THEN it carries the provider's own speed parameter derived by the adapter

#### Scenario: Control not declared

- GIVEN a TTS model declaring no `emotion` control and a scene resolving `voice_emotion:: calm`
- WHEN the estimate is built
- THEN it fails with `unsupported-control` naming `voice_emotion` and the model
- AND no request is made

#### Scenario: Default value needs no control

- GIVEN a model declaring no `speed` control and a scene resolving no `voice_speed`
- WHEN the estimate is built
- THEN no error is reported

#### Scenario: Adapter and catalog agree

- GIVEN an adapter whose `controls` differ from the catalog Model's
- WHEN the contract test runs
- THEN it fails naming the model

### Requirement: infinitetalk Is An Active Allowed Avatar Model

`infinitetalk` MUST stay in the reference catalog as an active avatar model. The engine MUST allow it through the normal catalog path and MUST NOT emit a warning or a block for it. A domaiNN MAY still exclude it through the overlay allowlist like any other model.

#### Scenario: No warning while active

- GIVEN `infinitetalk` with `status:: active` and an `avatar` Layer that resolves it
- WHEN `produce` runs
- THEN no warning names the model and the run continues

#### Scenario: Overlay may still exclude it

- GIVEN a domaiNN overlay that does not allow `infinitetalk` and an `avatar` Layer that resolves it
- WHEN `produce` runs
- THEN the guard refuses the run before spend, like any other disallowed model

