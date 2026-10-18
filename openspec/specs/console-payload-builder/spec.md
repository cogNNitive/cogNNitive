# Console Payload Builder Specification

## Purpose

One payload contract and one builder (`buildConsolePayload`, in `innfo-core/src/console/`) used by the export CLI, so every console's slots come from a single path. Behavior already built in commit `6f905b1e` (meta fields, element ids, per-element hash, matrices, `feedbackState` shape) is restated as the contract; the gaps are the requirements marked NEW GAP.
## Requirements
### Requirement: Single Payload Builder

`buildConsolePayload` MUST be the only payload builder. The CLI (`scripts/export-console.mjs`) MUST delegate to it and MUST NOT hand-build payloads.

The payload contract is extended with unit identity facts:
- `meta.domain`: an object `{ title, address, modelCount, sourceCount }` where `address` equals `"domaiNN_NN.md"`.
- `meta.models[]`: each entry carries `family` (the slugified blueprint family name).
- Schema definitions (`schema.concepts`, `schema.fields`, `schema.matrices`) MUST carry `declaredBy: { family, version, location }`.
- Domain schema de-duplication MUST use the composite key `(family, name)` (instead of bare name), ensuring definitions retain their declaring blueprint identity and version.
- `matrices[]` MUST carry `slug` (the matrix slug).

(Previously: `meta.domain` had no `address`, definitions did not carry `declaredBy`, and de-duplication was by bare name.)

#### Scenario: Domain descriptor carries address and counts
- GIVEN a domain with two models and three sources
- WHEN the domain payload is assembled
- THEN `meta.domain.address` is `"domaiNN_NN.md"`
- AND `meta.domain.modelCount` is `2` and `sourceCount` is `3`

#### Scenario: Schema definitions retain declaredBy
- GIVEN bluepriNNt `"business"` declaring concept `"Goal"` and field `"owner"`
- WHEN the schema slot is built
- THEN `concept.declaredBy.family` is `"business"`
- AND `field.declaredBy.family` is `"business"`

#### Scenario: Multi-blueprint field definitions survive dedup
- GIVEN two included bluepriNNts each declaring a field of the same name under their respective concepts
- WHEN domain schema de-duplication runs
- THEN both definitions are preserved with their distinct `declaredBy` bluepriNNts

---

### Requirement: Payload Meta

`meta` MUST carry `modelId`, `title`, `modelVersion`, `sha256` and `generated` (the console spine removed the procedure path). `modelId` MUST be the domaiNN-relative POSIX path minus the `_NN.md`/`.md` suffix and MUST survive a version bump. `modelVersion` MUST be the model's real `knowledge_version`. `sha256` MUST be the portable sha256 of the raw source content. `meta` MUST NOT carry review verdicts: review state is derived by the runtime from `element.history` and the domain `changes` collection. (Previously: `meta.feedbackState` was required, read from `feedback-ledger.jsonl`.)

#### Scenario: CLI emits full meta
- GIVEN a console built by the CLI
- WHEN its `meta` is read
- THEN it carries `modelId`, `modelVersion`, `sha256` and `generated`
- AND it does not carry `feedbackState`

#### Scenario: Id survives version bump
- GIVEN a model built at `V_1-0-0` and again at `V_1-0-1`
- WHEN both payloads are built
- THEN `meta.modelId` is identical

### Requirement: Element Ids and Hashes

Every element MUST carry `id = element.slug`, the frozen immutable element slug, and `hash`, the first 16 hex characters of the sha256 of canonical JSON `{concept, name, description, fields, markers}`.

In addition:
- `element.canonicalUnit` is RENAMED to `element.location` (carrying the human-readable header location, e.g. `"file_NN.md@## NN Concept: Name"`).
- `element.unitSlug` is REMOVED without backwards-compatibility alias.
- Normalization of drafts MUST assign `draft.address`, the canonical unit address targeting the element or value.

(Previously: the location property was named `canonicalUnit`, and `unitSlug` was emitted on elements.)

#### Scenario: Location replaces canonicalUnit
- GIVEN an element in the parsed model
- WHEN the payload element is built
- THEN `element.location` is populated with the human location
- AND `element.canonicalUnit` is undefined
- AND `element.unitSlug` is undefined

#### Scenario: Normalized draft has canonical address
- GIVEN a draft targeting element `"element-1b"` with field `"photo"` in model `"strategy"`
- WHEN the draft is normalized
- THEN `draft.address` is `"strategy@element-1b&photo"`

---

### Requirement: Single Citation Shape

The payload MUST emit citations as the per-field map `el.citations: { "<citationFieldName>": ResolvedCitation[] }` plus a resolution timestamp (`meta.citationsResolvedAt`, and per model in `meta.models`), the shape consumed by the runtime and required by living spec `console-field-citations`. The flat-array shape MUST NOT be emitted. A test MUST assert that the runtime renders icons from the builder output.
(Previously: the consumer was the model viewer, and a test compared CLI and procedure output.)

#### Scenario: Runtime consumes builder output
- GIVEN a payload built with a resolver for an element with a `sources` field
- WHEN `InnfoConsole` renders it
- THEN the origin icon appears, with no shape conversion

#### Scenario: No resolver
- GIVEN a build without a resolver
- WHEN the payload is built
- THEN it succeeds, elements carry no `citations`, and nothing throws

### Requirement: Pure Citation Logic in innfo-core, Injected Resolver

Pure citation logic (`resolveCitation`, `classifyOrigin`, excerpt building and the helpers around them) MUST live only in `innfo-core`. `innfo-mcp` MUST import it and MUST NOT keep copies; the private copies in `resolve-sources.ts` MUST be deleted. File reading MUST be an injected resolver, so the builder does no filesystem or MCP access. The CLI MUST inject a filesystem-backed resolver (`createFsSourceResolver`, in core). Citation fields are chosen by name or by schema `type:: citation`, in core.
(Previously: the MCP tool also injected the workspace `SourceResolver`.)

#### Scenario: Single implementation
- GIVEN the repository after this change
- WHEN `classifyOrigin` and `extractExcerpt` definitions are counted
- THEN each exists exactly once, in `innfo-core`

#### Scenario: Behavior preserved
- GIVEN the existing `resolve-sources` suite
- WHEN run after the dedup
- THEN it passes unchanged

#### Scenario: CLI resolves citations
- GIVEN a domaiNN whose element cites a source file
- WHEN the CLI exports it
- THEN the console carries the resolved citation with no network or MCP session

### Requirement: Mirror Is Shipped and Drift-Checked

The CJS mirror `console/console-payload.generated.cjs` MUST be listed in the manifest `console_assets`, and `verify.js` MUST run the mirror `--check`, failing and naming the file when it is stale relative to `innfo-core` sources. Any change to `console/index.ts` — including the new resolver exports the CLI requires — MUST be accompanied by a rebuilt mirror so `verify.js` remains green. (Previously: did not state that new `console/index.ts` exports require a mirror rebuild.)

#### Scenario: Stale mirror detected

- GIVEN a mirror out of date with `innfo-core` sources
- WHEN `verify.js` runs
- THEN it fails naming `console-payload.generated.cjs`

#### Scenario: Resolver export mirrored

- GIVEN `console/index.ts` exports the shared schema resolver
- WHEN the mirror is rebuilt and `verify.js` runs
- THEN the mirror `--check` passes and the mirror exposes the resolver to the CLI

### Requirement: Matrix Header Metadata

`ConsolePayloadMatrix` MUST provide a `head` object carrying per-header identity metadata:
```ts
head?: {
  rows: Record<string, { label?: string; concept?: string; slug?: string; kind?: "element" | "marker" }>
  cols: Record<string, { label?: string; concept?: string; slug?: string; kind?: "element" | "marker" }>
}
```

For free matrices, `slug` MUST be populated with the header element's frozen slug. When no slug exists, it falls back to `slugifyHeading(label)`.

(Previously: `head` entries carried `label`, `concept`, `kind`, but did not require `slug`.)

#### Scenario: Header element slug emitted
- GIVEN a free matrix whose row represents element `"Strategy A"` with slug `"strategy-a"`
- WHEN the matrix payload is built
- THEN `head.rows["Strategy A"].slug` is `"strategy-a"`
- AND `head.rows["Strategy A"].kind` is `"element"`

### Requirement: Per-model state in meta.models

For a domain payload (assembled by `scripts/export-console.mjs`), each entry of `meta.models` MUST carry that model's `modelId`, `title`, `modelVersion`, `sha256` (portable sha256 of the raw source content) and `citationsResolvedAt` (set when at least one citation was resolved for that model). These values come from the core builder's per-model `payload.model.meta` and MUST NOT be discarded during assembly. The same entries MUST appear for a scoped payload, restricted to the scoped models.

#### Scenario: Entries carry the hash
- GIVEN a domaiNN with models A and B
- WHEN the domain payload is built
- THEN `meta.models` has an entry for A with its `sha256`
- AND B's entry has its own `sha256`

#### Scenario: Scoped payload keeps only scoped entries
- GIVEN the same domaiNN scoped to model A
- WHEN the payload is built
- THEN `meta.models` has exactly A's entry with the same `sha256` as in the unscoped payload

#### Scenario: Citation timestamp per model
- GIVEN only model A has resolved citations
- WHEN the domain payload is built
- THEN A's entry has `citationsResolvedAt` and B's does not

### Requirement: No MCP console-build tool and no console compile procedure

The system MUST NOT expose a `build_console_payload` MCP tool, MUST NOT ship a `compile_model_console` procedure, and MUST NOT ship a console shell that only that procedure used. Console payloads MUST be produced only through `buildConsolePayload` by `scripts/export-console.mjs`.

#### Scenario: Tool not registered
- GIVEN the `innfo-mcp` server
- WHEN its tools are listed
- THEN `build_console_payload` is absent

#### Scenario: No live references
- GIVEN the repository after this change
- WHEN searched for `build_console_payload` and `compile_model_console`
- THEN hits exist only in archived changes and permanent history

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

