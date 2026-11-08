# conntent-model-catalog Delta Spec

Source decisions: D4, D5, D19, F5 (Slice 2: Cascade).

## MODIFIED Requirements

### Requirement: Blueprint Ships A Dated Reference Catalog

The bluepriNNt MUST ship a catalog as kNNowledge with three Concepts. `Provider` carries `name` and `api_base`. `Model` carries a unique slug, its `provider`, `api_id`, one `capability` (`tts`, `image` or `avatar`), `controls` (a subset of `speed`, `emotion`, `size`, `resolution`), `sizes` (for image models), `adapter`, `price`, `price_unit` (`per_1k_chars`, `per_image` or `per_second`), `price_date` and `status` (`active` or `blocked`). `Voice` carries a unique slug, `model`, `voice_id` and a required `language` (ISO 639-1 lowercase two-letter code). The catalog MUST NOT contain two entries for the same model, and a `Model` with `capability:: video` MUST be rejected (see "Video Capability Is Not Supported Yet").
(Previously: `capability` also accepted `video`, and `Voice.language` was not stated as required or as a language code.)

#### Scenario: Catalog validates
- GIVEN the shipped catalog
- WHEN it is validated against the blueprint
- THEN every Model has a capability, price, price unit, price date and adapter, every Voice has a language, and no model is duplicated

#### Scenario: Unpriced model in the reference catalog
- GIVEN a catalog Model with no price
- WHEN the catalog is validated
- THEN validation fails naming the model

#### Scenario: Voice without a language
- GIVEN a catalog Voice with no `language`
- WHEN the catalog is validated
- THEN validation fails naming the Voice and the field

#### Scenario: Voice language is not a language code
- GIVEN a catalog Voice with `language: Spanish`
- WHEN the catalog is validated
- THEN validation fails naming the Voice and stating the ISO 639-1 form

#### Scenario: Duplicate Voice slug
- GIVEN two catalog Voices with the slug `lucas-es`
- WHEN the catalog is validated
- THEN validation fails naming the slug

#### Scenario: Id spelling is reconciled
- GIVEN a script naming `wavespeed/z-image/turbo` while the catalog model is `wavespeed-ai/z-image/turbo`
- WHEN the script is checked
- THEN `unknown-model` names the id and no silent alias is applied

## ADDED Requirements

### Requirement: Video Capability Is Not Supported Yet

A catalog or overlay `Model` with `capability:: video` MUST be rejected when the merged catalog is built, with `unsupported-capability` ("generated video clips are not supported yet"), naming the model. A scene whose resolved model has that capability MUST fail before any spend with the same code. The reference catalog MUST contain no model of capability `video`, the cost estimator MUST NOT price video clips (no per-clip line and no `0.030` constant), and the capability list MUST NOT be extended without a change to this specification.

#### Scenario: Overlay declares a video model
- GIVEN an overlay `Model` with `capability:: video`
- WHEN the merged catalog is built
- THEN it fails with `unsupported-capability` naming the model

#### Scenario: Reference catalog has no video model
- GIVEN the shipped reference catalog
- WHEN its Models are listed by capability
- THEN none has the capability `video`

#### Scenario: Estimate has no clip line
- GIVEN a domaiNN whose Layers carry media prompts
- WHEN the estimate is built
- THEN it contains lines for TTS, image and avatar only and no line priced per clip

#### Scenario: Scene resolves to a video model
- GIVEN an image Layer whose `image_model` resolves to a model of capability `video` via a stale overlay
- WHEN `produce` runs
- THEN it fails with `unsupported-capability` before any spend

### Requirement: Voices Carry A Language And Must Match The Episode

A `Voice` MUST be selected by slug through the `voice` field (directly or through a Character, see `conntent-character`). A run MUST fail before any spend with `voice-language-mismatch` when a scene's resolved Voice `language` differs from the scene's resolved `language`, with `unknown-voice` when the slug is absent from the merged catalog, and with `missing-voice` when no Voice resolves. The merged catalog MUST NOT select a Voice by `voice_id` alone.

#### Scenario: Matching language
- GIVEN `language:: es` and `voice:: lucas-es` with `language: es`
- WHEN the pre-compile check runs
- THEN no voice finding is reported

#### Scenario: Mismatch stops the run
- GIVEN `language:: en` and `voice:: lucas-es`
- WHEN `produce` runs
- THEN it fails with `voice-language-mismatch` naming `lucas-es`, `es` and `en`, and nothing is spent

#### Scenario: Unknown voice
- GIVEN `voice:: nobody`
- WHEN the pre-compile check runs
- THEN it fails with `unknown-voice` naming `nobody`

#### Scenario: Raw voice id is not a voice
- GIVEN `voice:: 4f2a9c` that is a provider `voice_id` and no Voice slug
- WHEN the pre-compile check runs
- THEN it fails with `unknown-voice`

### Requirement: The Reference Catalog Ships Voices For English And Spanish

The reference catalog MUST ship at least one active `Voice` with `language: en` and at least one with `language: es` for each shipped TTS model that declares them, so an episode in either language validates against the catalog alone. The ids and prices are catalog data and MUST NOT be defined in engine code.

#### Scenario: Both languages are available
- GIVEN the shipped catalog
- WHEN its Voices are grouped by `language`
- THEN `en` and `es` each have at least one Voice

#### Scenario: Spanish episode against the shipped catalog
- GIVEN `language:: es` and `voice` naming a shipped Spanish Voice
- WHEN the pre-compile check runs
- THEN no voice finding is reported

### Requirement: No Spend Guard File

The set of models a domaiNN may use MUST come only from the merged catalog (reference catalog plus `model-catalog_NN.md`). A file `video-guard.json` MUST NOT be read, written or described by the engine, the skill or the specs, and its presence in a domaiNN MUST be reported as `legacy-layout` (see `conntent-folder-contract`).

#### Scenario: Guard file is not read
- GIVEN a domaiNN with `video-guard.json` allowing a model the overlay does not allow
- WHEN a scene resolves that model
- THEN the run fails because the overlay does not allow it, and the guard file is reported as `legacy-layout`

#### Scenario: No code path reads the guard
- GIVEN the scripts of the skill
- WHEN they are searched for `video-guard`
- THEN the only matches are the rejection message and its test
