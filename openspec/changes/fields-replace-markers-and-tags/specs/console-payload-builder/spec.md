# Delta for Console Payload Builder

## MODIFIED Requirements

### Requirement: Single Payload Builder

`buildConsolePayload` MUST be the only payload builder. The CLI (`scripts/export-console.mjs`) MUST delegate to it and MUST NOT hand-build payloads. The result MUST carry both slots: `schema` (for `innfo-schema`) and `model` (for `innfo-model`, holding `meta`, `elements` and `matrices`). `relations` MUST be emitted per element as `el.relations: {field, target, targetLabel}[]` (intra-model wikilink targets only), because the runtime reads it per element; there is no model-level `relations`. The payload MUST NOT carry markers: no `element.markers` and no `schema.markers`. The runtime reads `schema.concepts` as an array and matrix `rows`/`cols`, so the builder MUST emit array schema slots (via `buildConsoleSchemaSlot`) and matrices with `rows` and `cols` (and MAY emit the additive `head` metadata). The CLI MUST serialize the slots with `serializeConsoleSlot` (two-space JSON with `<` escaped as `<`). The CLI MUST obtain its `schema` slot from the shared console schema resolver (capability `console-schema-resolution`).
(Previously: `element.markers` MUST be a map and `schema.markers` a list of definitions.)

#### Scenario: CLI builds through the builder
- GIVEN one fixture domaiNN
- WHEN the CLI exports it
- THEN the `innfo-schema` and `innfo-model` slots equal the builder's serialized output after normalizing `meta.generated` and `meta.citationsResolvedAt`

#### Scenario: Relations are emitted
- GIVEN a model containing relations
- WHEN the payload is built
- THEN each element carries `relations` with its intra-model targets, and no `model.relations` exists

#### Scenario: Slot text is script-safe
- GIVEN a citation excerpt containing `</script>`
- WHEN the slots are serialized
- THEN the slot text contains no literal `<`

#### Scenario: No marker keys in the payload
- GIVEN any fixture domaiNN
- WHEN the payload is built
- THEN no element has a `markers` key and `schema` has no `markers` key

### Requirement: Element Ids and Hashes

Every element MUST carry `id = element.slug`, the frozen, immutable element slug (`stable-element-identity`), and `hash`, the first 16 hex characters of the sha256 of the canonical JSON of `{concept, name, description, fields}`. `fields` are the element's OWN field values, including an own `tags` value; inherited concept-level values MUST NOT enter the hash. The canonical JSON MUST contain no `markers` key. The builder MUST NOT derive an id from the concept or name: when any element of the model has no explicit (frozen) slug, `buildConsolePayload` MUST fail with `UNFROZEN_MODEL`, naming the model and telling the user to freeze its slugs (the `freeze_slugs` operation or `migrate-domain.js --freeze-slugs`). The hash MUST NOT change on a version-only edit and MUST change when an own field changes. (Previously: the hash input was `{concept, name, description, fields, markers}` with tags excluded; `id = slugify(concept + ' ' + name)` was the older id rule. All pre-change hashes are intentionally invalidated once.)

#### Scenario: Id equals the frozen slug
- GIVEN an element with `slug:: element-1b`
- WHEN the payload is built
- THEN `element.id` is `element-1b`

#### Scenario: Duplicate names keep distinct ids
- GIVEN two elements of one concept named `Customer` with slugs `customer` and `customer-2`
- WHEN built
- THEN their ids are `customer` and `customer-2`

#### Scenario: An unfrozen model is rejected
- GIVEN a model with an element lacking `slug::`
- WHEN the payload is built
- THEN the build fails with `UNFROZEN_MODEL` naming the model and the freeze remedy
- AND no payload is produced

#### Scenario: Hash tracks content only
- GIVEN a model edited only in its version
- WHEN rebuilt
- THEN every element `hash` is unchanged

#### Scenario: Hash has no markers
- GIVEN an element
- WHEN its canonical hash input is inspected
- THEN it holds exactly `concept`, `name`, `description` and `fields`

#### Scenario: Own tags move the hash
- GIVEN an element built without `tags` and again with an own `tags:: [ai]`
- WHEN both payloads are built
- THEN the two hashes differ

#### Scenario: Inherited values do not move the hash
- GIVEN an element built twice, once without and once with a concept-level `tags:: [core]` on its concept
- WHEN both payloads are built
- THEN both elements have the same `hash`
- AND that hash equals `hashParsedElement` for the node

### Requirement: Matrix Header Metadata

`ConsolePayloadMatrix` MUST accept an optional `head` object carrying per-header
identity metadata so a renderer can draw row and column headers as knowledge-unit
badges instead of escaped plain text:

```
head?: {
  rows: Record<string, { label?: string; concept?: string; kind?: "element" }>
  cols: Record<string, { label?: string; concept?: string; kind?: "element" }>
}
```

`rows` and `cols` MUST remain `string[]` (the header keys, in document order) so
existing consumers and fixtures are unaffected; `head` is additive. For a free matrix,
row headers carry the `source` concept and column headers the `target` concept with
`kind: "element"`. The `"marker"` kind no longer exists. When `head` is absent, a
renderer MUST fall back to plain-text headers and MUST NOT throw.
(Previously: for the reserved `item-markers matrix`, column headers carried `kind: "marker"`.)

#### Scenario: Free matrix headers carry concepts
- GIVEN a free matrix with `source: "Problems"` and `target: "Value Propositions"`
- WHEN the payload is built
- THEN `head.cols[<col>].concept` is the target concept and `kind` is `element`
- AND `head.rows[<row>].concept` is the source concept

#### Scenario: No marker kind
- GIVEN any payload
- WHEN every `head` entry is inspected
- THEN none has `kind: "marker"`

#### Scenario: Additive and optional
- GIVEN a matrix built without header metadata
- WHEN a renderer draws it
- THEN row and column headers render as plain text and nothing throws

### Requirement: Declared Field Definitions in the Schema Slot

`buildConsoleSchemaSlot` MUST emit `schema.fields` as a flat array with one entry per declared field, flattened from `schema.concepts[].fields` (after `*` and list targets are expanded, so one entry per concept), where each entry carries `concept` (the owning concept name), `name`, `type` and, when declared, `options`, `target_concepts`, `target_blueprint`, `description`, `widget`, `widgetConfig` and the multi-value flag `multiple`. The domain payload assembled by `scripts/export-console.mjs` MUST aggregate these arrays across models, de-duplicated by the pair (`concept`, `name`) with the first definition winning (the same order in which concepts are de-duplicated), and MUST NOT emit `schema.fields` as an object keyed by field name. A test MUST export a real fixture domaiNN whose bluepriNNt declares typed fields and assert on the exported slot; a hand-built schema object MUST NOT be the only evidence. (S3b P0-1.)
(Previously: entries carried only `concept`, `name`, `type`, `options`, `target_concepts`, `target_blueprint`.)

#### Scenario: Concept fields are flattened with their concept
- GIVEN a bluepriNNt schema whose concept `Initiative` declares `stage` (`type: select`, `options: [idea, build]`) and `owner` (`type: reference`, `target_concepts: [Person]`)
- WHEN `buildConsoleSchemaSlot` builds the slot
- THEN `schema.fields` contains `{ concept: "Initiative", name: "stage", type: "select", options: ["idea", "build"] }`
- AND it contains `{ concept: "Initiative", name: "owner", type: "reference", target_concepts: ["Person"] }`

#### Scenario: Same field name in two concepts is kept twice
- GIVEN concept `Task` declares `status` as `select` and concept `Note` declares `status` as `string`
- WHEN the slot is built
- THEN `schema.fields` has two `status` entries, one with `concept: "Task"` and one with `concept: "Note"`

#### Scenario: Domain export carries the declared fields (regression)
- GIVEN a fixture domaiNN of two models whose bluepriNNts declare typed fields
- WHEN `export-console.mjs --domain` exports it
- THEN the `innfo-schema` slot's `fields` is a non-empty array whose entries each carry `concept`, `name` and `type`
- AND it is not an object keyed by field name (today it is `{}`)

#### Scenario: Duplicate definition across models keeps the first
- GIVEN two models of the same bluepriNNt that both declare (`Task`, `status`)
- WHEN the domain payload is assembled
- THEN `schema.fields` holds exactly one (`Task`, `status`) entry

#### Scenario: Star Field is expanded per concept
- GIVEN a bluepriNNt with concepts `Goal` and `Risk` and a `tags` Field with `concept:: *`
- WHEN the slot is built
- THEN `schema.fields` holds one `tags` entry for `Goal` and one for `Risk`, each with `type: "select"` and its multi-value flag

#### Scenario: Widget metadata is exposed
- GIVEN a Field `complexity` with `widget: scale` and `widget_config` `{"min":0,"max":100,"step":5}`
- WHEN the slot is built
- THEN its entry carries `widget: "scale"` and `widgetConfig` with those keys

## REMOVED Requirements

### Requirement: Element Tags in the Payload

(Reason: `tags` is no longer a derived payload property computed by `parseTagList`; it is an ordinary Field value and is hashed when own.)
(Migration: "Element Field Values and Inheritance in the Payload" below.)

## ADDED Requirements

### Requirement: Element Field Values and Inheritance in the Payload

Every payload element MUST carry its own field values in `fields` (the only values that enter `hash`), including `tags` when present, with multi-valued Fields as arrays. Concept-level values inherited by the element MUST be exposed separately and labelled as inherited, as `inherited{field: {value, from}}`, where `from` is the provenance concept and the entry holds only the concept values the element does not already have (multi-valued) or a value only when the element has none (single-valued). Each concept entry MUST also expose its own concept-level values. Multi-valued effective values MUST follow union semantics and single-valued ones override semantics (capability `field-value-model`). Payload `fields` MUST NOT contain inherited values.

#### Scenario: Own tags reach the payload
- GIVEN an element with `tags:: [pricing, ai]`
- WHEN the payload is built
- THEN `fields.tags` holds `pricing` and `ai`

#### Scenario: Inherited values are labelled with provenance
- GIVEN concept `Goals` with `tags:: [core]` and an element of it with `tags:: [ai]`
- WHEN the payload is built
- THEN the element's own `fields.tags` is `[ai]`
- AND a separately labelled inherited entry holds `core` with provenance concept `Goals`

#### Scenario: Concept exposes its own values
- GIVEN the same concept
- WHEN the payload concept entry is read
- THEN it lists `tags = [core]`

#### Scenario: A real export carries field values (regression)
- GIVEN a fixture domaiNN whose elements carry `tags::`
- WHEN `export-console.mjs --domain` exports it
- THEN those elements carry non-empty `fields.tags` in the `innfo-model` slot
