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

The payload MUST emit citations as the per-field map `el.citations: { "<fieldName>": ResolvedCitation[] }` plus a resolution timestamp (`meta.citationsResolvedAt`, and per model in `meta.models`), the shape consumed by the runtime and required by living spec `console-field-citations`. The entries MUST be the resolved evidence of the origin change (see "Payload history and origin per unit"), not values of model fields. The flat-array shape MUST NOT be emitted. A test MUST assert that the runtime renders icons from the builder output.
(Previously: the map was built from fields of the element named `sources` or typed `citation`.)

#### Scenario: Runtime consumes builder output
- GIVEN a payload built with a resolver for an element whose field has an applied change with evidence
- WHEN `nnConsole` renders it
- THEN the origin icon appears, with no shape conversion

#### Scenario: No resolver
- GIVEN a build without a resolver
- WHEN the payload is built
- THEN it succeeds, elements carry no `citations`, and nothing throws

### Requirement: Pure Citation Logic in innfo-core, Injected Resolver

Pure citation logic (`resolveCitation`, `classifyOrigin`, excerpt building and the helpers around them) MUST live only in `innfo-core`. `innfo-mcp` MUST import it and MUST NOT keep copies; the private copies in `resolve-sources.ts` MUST be deleted. File reading MUST be an injected resolver, so the builder does no filesystem or MCP access. The CLI MUST inject a filesystem-backed resolver (`createFsSourceResolver`, in core). The citations to resolve MUST be the evidence entries of origin changes; selecting fields by name `sources` or by schema `type:: citation` MUST NOT exist.
(Previously: citation fields were chosen by name or by schema `type:: citation`, in core.)

#### Scenario: Single implementation
- GIVEN the repository after this change
- WHEN `classifyOrigin` and `extractExcerpt` definitions are counted
- THEN each exists exactly once, in `innfo-core`

#### Scenario: Behavior preserved
- GIVEN the existing `resolve-sources` suite
- WHEN run after the dedup
- THEN it passes, with its fixtures expressed as applied changes

#### Scenario: CLI resolves citations
- GIVEN a domaiNN whose element's field has an applied change citing a source file
- WHEN the CLI exports it
- THEN the console carries the resolved citation with no network or MCP session

#### Scenario: No field-name selection
- GIVEN the repository after this change
- WHEN searched for code selecting citation fields by name `sources` or schema type `citation` in the console path
- THEN none exists

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
- THEN the `nn-schema` slot's `fields` is a non-empty array whose entries each carry `concept`, `name` and `type`
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
- THEN those elements carry non-empty `fields.tags` in the `nn-model` slot

### Requirement: Procedure Catalog Link Is Emitted

The payload MUST emit the link between a `Procedure` and its executable workflow as a
relation. For every `Procedure` element whose document declares a `procedure_model::`
value, the payload MUST emit a `relation` (`field: "procedure_model"`) whose target is the
root `Work` element of the named model, resolved per document. When the target cannot be
resolved, the payload MUST NOT emit a dangling relation and MUST NOT fail the build; the
view reports the missing link per `innfo-console-runtime` "Procedure Tab Shows The Catalog
Entry".

The `Procedure` concept MUST declare `procedure_model` as a `reference` field
(`target_concepts:: [Work]`), so the relation is model-legal and survives validation.

#### Scenario: Relation emitted

- GIVEN a document with a `Procedure` whose `procedure_model::` names a model that holds a root `Work`
- WHEN the payload is built
- THEN the `Procedure` element carries a `procedure_model` relation targeting that root `Work`'s id

#### Scenario: Unresolved link is omitted, not dangling

- GIVEN a `Procedure` whose `procedure_model::` names a model with no root `Work`
- WHEN the payload is built
- THEN no `procedure_model` relation is emitted for it
- AND the build succeeds

#### Scenario: No name-convention join is required

- GIVEN a `Procedure` named `Generate Cosicah Video` and its root `Work` named `Generate Cosicah Video Workflow`
- WHEN a view joins the catalog with the execution tree
- THEN it uses the emitted relation, not the name similarity between the two elements

### Requirement: Payload history and origin per unit

`buildConsolePayload` MUST derive history and origin from the applied changes with `deriveValueHistory` and `deriveFieldOrigin` (production callers, ordered by the shared comparator of `change-provenance`, filtered to `status === 'applied'`, after the epoch cut, matched by `resolved_target` and model-scoped). It MUST accept the parsed changesets as an input (no filesystem or MCP access inside the builder). Each element MUST carry, per field with an applied change, `history` (the ordered applied changes) and `origin`; elements MUST also carry an element-level history. Each non-empty matrix cell MUST carry `history` and `origin` as well. `meta.sources` MUST NOT be emitted. Review state MUST still be listed from the full `changes` collection (all statuses) by the runtime.

#### Scenario: Field history is derived, applied only
- GIVEN a field with an applied change `c-01`, a conflicted change `c-02` and an applied change `c-03`
- WHEN the payload is built
- THEN the field's `history` is `[c-01, c-03]` and `origin` is the evidence of `c-03`

#### Scenario: Cell history and origin
- GIVEN a matrix cell set by an applied `update_matrix_cell`
- WHEN the payload is built
- THEN the cell carries `history` with that change and `origin` with its evidence

#### Scenario: Empty cell has none
- GIVEN an empty matrix cell
- WHEN the payload is built
- THEN the cell carries no `history` and no `origin`

#### Scenario: No meta.sources
- GIVEN any payload
- WHEN `meta` is read
- THEN it has no `sources` key

#### Scenario: Slug reuse does not inherit
- GIVEN an element removed and a new one created with the same slug
- WHEN the payload is built
- THEN the new element's histories contain only changes after the removal

### Requirement: Precomputed File Inventory in Console Payload

The payload builder (`buildConsolePayload` in `nn-core` and domain assembly in `scripts/export-console.mjs`) MUST precompute a `files` object under `model.files` in the console payload.

The `files` structure MUST contain:
1. `inventory`: An array of file descriptors covering workspace content across `sources/` (including `sources/import/`, `sources/assets/`, `sources/evidence/`, `sources/conversations/`), `assets/`, `evidence/`, `artifacts/`, `conversations/`, watch roots, and imported domain snapshots. Each entry MUST carry:
   - `id`: Unique POSIX path relative to the workspace root.
   - `path`: POSIX relative path.
   - `category`: Exactly one of `'watch_root' | 'source' | 'imported_domain' | 'asset' | 'evidence' | 'artifact'`.
   - `size`: Size in bytes.
   - `sha256`: Full 64-character lowercase hex SHA-256 of the file bytes.
   - `mimeType`: Detected MIME type string.
   - `mtime` (optional): ISO 8601 last-modified timestamp.
   - `sidecar` (optional): Status object `{ path: string; exists: boolean; valid: boolean; sourceFile?: string; sha256?: string; sha256Matches?: boolean; sourceFormat?: string; author?: string; normalizedAt?: string; error?: string }`.
   - `citationsCount`: Number of knowledge unit citations targeting this file.
   - `excerptCount`: Number of those citations that carry an excerpt.
   - `changesCount`: Number of changeset records referencing this file as evidence.
   - `uncited`: Boolean, true for a source-like file (`source` or `imported_domain`) with `citationsCount === 0` and `changesCount === 0`.
   - `snippet` (optional): Bounded text excerpt (see the Payload Bloat Invariant).
   - `snippetTruncated` (optional): Boolean, true when the excerpt was cut.
2. `watchRoots`: An array of watch directory descriptors (`{ path: string; status: 'active' | 'idle' | 'offline'; fileCount: number; lastSync?: string }`). `lastSync` MUST be derived from the newest observed mtime under the root, never from wall-clock time.
3. `stats`: Aggregate workspace file statistics (see "Precomputed Gap Metrics and Sidecar Validation").
4. `lineage`: Reverse lineage mapping (see "Artifact Reverse Lineage Precomputation").

Categorization MUST follow the real workspace layout: `sources/import/` holds imported source documents, media under `sources/assets/` is an `asset`, and a foreign domain snapshot lives under `imported/`, `.domains/` or `domains/import/`.

Non-content exclusions: sidecar documents, console build outputs (`domaiNN_console*.html`, `artifacts/<id>_console/`, `artifacts/<id>_view/`) and append-only `.jsonl`/`.ndjson` logs MUST NOT appear as inventory entries. Console outputs would embed the console inside itself; logs are application state.

Payload Bloat Invariant:
The builder MUST NOT serialize full raw contents for tracked files. A text preview (`snippet`) MUST be an excerpt capped at the citation excerpt cap (`EXCERPT_CHAR_CAP`, 500 characters) and bounded by a global preview budget. Binary and image files MUST NOT be inlined in any form.

Determinism Invariant:
Two exports of an unchanged workspace MUST produce byte-identical `model.files` payloads.

#### Scenario: Export CLI builds model.files slot
- GIVEN a domain workspace with sources, assets, changes, and artifacts
- WHEN `export-console.mjs` generates the console payload
- THEN `payload.model.files` exists
- AND `payload.model.files.inventory` lists tracked workspace files with their categories, sizes, and hashes

#### Scenario: File categorization
- GIVEN a file located in `sources/import/factura.pdf`
- WHEN the file inventory is assembled
- THEN its `category` is `"source"`
- AND `sources/assets/logo.png` has category `"asset"`
- AND a file in `artifacts/report.html` has category `"artifact"`

#### Scenario: Raw contents are not inlined
- GIVEN a 5 MB image asset in `assets/diagram.png`
- WHEN the file entry is serialized
- THEN `entry.size` is `5242880`
- AND no base64, raw byte payload or text snippet is attached to the entry

#### Scenario: Binary digests hash bytes
- GIVEN a binary file whose bytes are not valid UTF-8
- WHEN its digest is computed
- THEN `entry.sha256` equals the SHA-256 of the raw bytes

#### Scenario: Sidecar documents are never inventory entries
- GIVEN `sources/import/spec.md_sidecar_NN.md`
- WHEN the inventory is assembled
- THEN no entry has that path
- AND the entry for `sources/import/spec.md` carries the sidecar status

### Requirement: Artifact Reverse Lineage Precomputation

The payload builder MUST precompute the reverse lineage mapping for all artifacts in `payload.model.files.lineage`:
```ts
lineage: Record<string, {
  artifactId: string
  artifactPath: string
  unitIds: string[]
  changesetIds: string[]
  sourcePaths: string[]
}>
```

The mapping MUST be computed across four tiers:
1. `Artifact to Units`: Derived from artifact frontmatter, generated manifest mappings, or address comments embedded in the artifact.
2. `Units to Changes`: Derived from unit `history` and domain `changes` records.
3. `Changes/Units to Sources`: Derived from unit citations (`el.citations`) and change evidence citations (`c.evidence`).

When a link in the lineage chain cannot be resolved (e.g., an artifact references a unit that does not cite an original source), the builder MUST record the available tiers without failing the build and MUST NOT emit fabricated links.

#### Scenario: Multi-tier reverse lineage is resolved
- GIVEN an artifact `artifacts/executive-summary.html` built from unit `initiative-pricing`
- AND unit `initiative-pricing` has history from changeset `2026-10-01-pricing`
- AND changeset `2026-10-01-pricing` cites evidence `sources/market-survey.csv`
- WHEN the payload builder computes the lineage
- THEN `lineage["artifacts/executive-summary.html"]` carries `unitIds: ["initiative-pricing"]`, `changesetIds: ["2026-10-01-pricing"]`, and `sourcePaths: ["sources/market-survey.csv"]`

#### Scenario: Missing upstream link degrades gracefully
- GIVEN an artifact derived from a unit with no citations and no changeset history
- WHEN the reverse lineage is precomputed
- THEN `lineage[artifactId].unitIds` contains the unit id
- AND `lineage[artifactId].sourcePaths` is an empty array
- AND the build succeeds

### Requirement: Precomputed Gap Metrics and Sidecar Validation

The payload builder MUST calculate workspace health and gap metrics and expose them under `payload.model.files.stats`:
- `totalFiles`: Total count of files in the inventory.
- `totalBytes`: Combined byte count across inventory files.
- `categoryCounts`: Record mapping each category name to its file count.
- `storageByCategory`: Record mapping each category name to its combined byte size.
- `sourceCoverageRate`: Number between `0.0` and `1.0` representing cited source-like files over total source-like files.
- `uncitedSourceCount`: Count of source-like files with `uncited === true`.
- `sidecarMissingCount`: Count of source-like files with no sidecar.
- `sidecarInvalidCount`: Count of sidecars that exist but fail frontmatter validation.
- `sidecarMismatchCount`: Count of valid sidecars whose recorded digest no longer matches the file.
- `excerptCount`: Total number of citations that carry an excerpt.

Sidecar Convention and Resilience:
A sidecar is the canonical `<file>.<ext>_sidecar_NN.md` document (see the naming contract). Its YAML frontmatter MUST declare `source_file` and a 64-character `sha256`; the builder MUST verify that digest against the computed file digest and expose the verdict as `sidecar.sha256Matches`. When a sidecar is malformed, the builder MUST NOT throw or abort the build: it MUST record `sidecar.valid: false` with `sidecar.error` and increment `sidecarInvalidCount`.

#### Scenario: Gap metrics calculated across sources and sidecars
- GIVEN five source-like files, where two are uncited
- WHEN the payload stats are computed
- THEN `stats.uncitedSourceCount` is `2`
- AND `stats.sourceCoverageRate` is `0.6`

#### Scenario: Stale sidecar digest is surfaced
- GIVEN a source file whose sidecar records a digest that no longer matches the file
- WHEN `export-console.mjs` runs
- THEN the build succeeds
- AND the entry records `sidecar.valid: true` and `sidecar.sha256Matches: false`
- AND `stats.sidecarMismatchCount` is incremented

#### Scenario: Malformed sidecar recorded without build failure
- GIVEN a sidecar document `sources/note.md_sidecar_NN.md` with no frontmatter
- WHEN `export-console.mjs` runs
- THEN the build finishes with success
- AND `stats.sidecarInvalidCount` is incremented
- AND the file entry for `sources/note.md` records `sidecar.valid: false` and `sidecar.error`

