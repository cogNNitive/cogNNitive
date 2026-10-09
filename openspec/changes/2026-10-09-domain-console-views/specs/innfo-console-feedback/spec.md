# Delta for innfo-console-feedback

## MODIFIED Requirements

### Requirement: Feedback JSON Schema

Export files MUST validate against the feedback schema. `meta` MUST carry `source_knowledge`, `source_knowledge_version` (`V_x-y-z`), `artifact`, `artifact_version`, `exported_at` (ISO-8601 with seconds), `author`, `feedback_slug` and `viewer`, and MAY carry `source_sha256`. Each `items[]` entry MUST carry `id` (`fb-NNN`), `kind` (`correction`|`comment`|`new`|`delete`) and `target` (`element_id`/`concept`/`element`/`field`/`matrix`; `field` MUST be under `target`, never top-level), with `original`/`proposed`/`comment` as applicable. Items MUST NOT carry `status`, `layer` or `severity`. Console-exported items MUST carry `base_hash` (the element `hash` the draft was made against); an item anchored to a field row MUST carry `target.field`, and one anchored to a card MUST omit it. The names `knowledge`, `knowledge_version`, `session_label` and `source_model*` MUST NOT appear. Filenames MUST match `{PrimaryModel}_V_{version}_{slug}_feedback_{YYYYMMDD-HHMMSS}.json`, where `{PrimaryModel}` is the model slug: `meta.model_slug` when present, else the slugified model identifier, else the slugified title. When the slug would contain no Latin alphanumerics, it MUST be `model-<8 hex>` derived deterministically from the title. `{PrimaryModel}` MUST match `^[A-Za-z0-9-]+$` and MUST NOT be the human title.
(Previously: the console passed the human title to the filename builder, which rejected titles with spaces, so export failed.)

#### Scenario: Valid export validates
- GIVEN a console with draft suggestions and identifier `round-2`
- WHEN exported
- THEN the file validates, uses `target.field` where applicable, carries `base_hash`, and matches the filename pattern

#### Scenario: Malformed item rejected
- GIVEN an item with `kind: rewrite`
- WHEN validated
- THEN validation fails naming the offending `id`

#### Scenario: Field anchor exports target.field
- GIVEN a correction drafted on field `owner` of element `e1`
- WHEN exported
- THEN the item has `target.field: "owner"` and no top-level `field`

#### Scenario: Exported items carry no status
- GIVEN any draft created in the console
- WHEN exported
- THEN the item has no `status` key and carries `base_hash`

#### Scenario: Filename from slug, not title
- GIVEN a model titled `Acme Pricing Model` with `meta.model_slug` `acme-pricing`
- WHEN exported
- THEN the filename starts with `acme-pricing_V_` and the download succeeds

#### Scenario: Non-Latin title falls back to a hashed slug
- GIVEN two models with different non-Latin titles and no slug
- WHEN each is exported
- THEN each filename starts with a distinct `model-<8 hex>` and matches `^[A-Za-z0-9-]+$`

## ADDED Requirements

### Requirement: Live draft count

The draft count MUST be shown consistently in the pending banner, the Review tab badge and the Review panel, and MUST update on every draft save or delete without a reload. Updating it MUST NOT remount the element cards.

#### Scenario: Count updates on save
- GIVEN a console with zero drafts
- WHEN a draft is saved
- THEN the banner, the Review tab badge and the Review panel all show `1`

#### Scenario: Count updates on delete
- GIVEN one draft
- WHEN it is deleted from the Review panel
- THEN all three surfaces show `0`

#### Scenario: Cards are not remounted
- GIVEN a rendered element card
- WHEN a draft is saved
- THEN the same card node is still in the DOM and keeps focus on its control
