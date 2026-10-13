# Console Payload Builder Specification

## Purpose

One payload contract and one builder (`buildConsolePayload`, in `innfo-core/src/console/`) used by the export CLI, so every console's slots come from a single path. Behavior already built in commit `6f905b1e` (meta fields, element ids, per-element hash, matrices, `feedbackState` shape) is restated as the contract; the gaps are the requirements marked NEW GAP.
## Requirements
### Requirement: Single Payload Builder

`buildConsolePayload` MUST be the only payload builder. The CLI (`scripts/export-console.mjs`) MUST delegate to it and MUST NOT hand-build payloads. The result MUST carry both slots: `schema` (for `innfo-schema`) and `model` (for `innfo-model`, holding `meta`, `elements` and `matrices`). `relations` MUST be emitted per element as `el.relations: {field, target, targetLabel}[]` (intra-model wikilink targets only), because the runtime reads it per element; there is no model-level `relations`. `element.markers` MUST be a map and `schema.markers` a list of definitions. The runtime reads `schema.concepts` as an array and matrix `rows`/`cols`, so the builder MUST emit array schema slots (via `buildConsoleSchemaSlot`) and matrices with `rows` and `cols` (and MAY emit the additive `head` metadata). The CLI MUST serialize the slots with `serializeConsoleSlot` (two-space JSON with `<` escaped as `<`). The CLI MUST obtain its `schema` slot from the shared console schema resolver (capability `console-schema-resolution`).
(Previously: the CLI and the `compile_model_console` procedure both delegated to it, the procedure through the `build_console_payload` MCP tool; a golden test compared the two.)

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

(Removed 2026-10-13: the `MODIFIED: Payload Meta` requirement was dropped. Removing
`meta.feedbackState` (the verdict-ledger read) is owned by
`2026-10-13-s2c-retire-legacy-provenance`. The spine contributes only the ADDED per-model
`sha256`/`citationsResolvedAt` state below.)

### Requirement: Payload Meta

`meta` MUST carry `modelId`, `title`, `modelVersion`, `sha256`, `generated` and `feedbackState`. `modelId` MUST be the domaiNN-relative POSIX path minus the `_NN.md`/`.md` suffix and MUST survive a version bump. `sha256` MUST be the portable sha256 of the raw source content. `feedbackState` MUST be `[{id, source, element_id, status, version}]` derived from effective ledger statuses, and MUST be read from `<domaiNN root>/feedback-ledger.jsonl` (empty when absent) by both paths. NEW GAP: the procedure path currently emits none of `modelId`, `sha256` or `feedbackState`.

#### Scenario: Both paths emit full meta

- GIVEN a console built by the CLI and one built by the procedure
- WHEN their `meta` is read
- THEN both carry `modelId`, `sha256` and `feedbackState`

#### Scenario: Id survives version bump

- GIVEN a model built at `V_1-0-0` and again at `V_1-0-1`
- WHEN both payloads are built
- THEN `meta.modelId` is identical

#### Scenario: Verdict reaches the console

- GIVEN a ledger whose latest entry for an item is `applied`
- WHEN the console is built by either path
- THEN `meta.feedbackState` lists that item as `applied`

### Requirement: Element Ids and Hashes

Every element MUST carry `id = slugify(concept + ' ' + name)`, made unique in document order (a duplicate receives `-1`, `-2`), and `hash`, the first 16 hex characters of the sha256 of the canonical JSON of `{concept, name, description, fields, markers}`. The as-built id scheme MUST NOT change. The hash MUST NOT change on a version-only edit and MUST change when a field changes.

#### Scenario: Hash tracks content only

- GIVEN a model edited only in its version
- WHEN rebuilt
- THEN every element `hash` is unchanged

#### Scenario: Duplicate names

- GIVEN two elements with the same concept and name
- WHEN built
- THEN the second id carries the `-1` suffix

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

`ConsolePayloadMatrix` MUST accept an optional `head` object carrying per-header
identity metadata so a renderer can draw row and column headers as knowledge-unit
badges instead of escaped plain text:

```
head?: {
  rows: Record<string, { label?: string; concept?: string; kind?: "element" | "marker" }>
  cols: Record<string, { label?: string; concept?: string; kind?: "element" | "marker" }>
}
```

`rows` and `cols` MUST remain `string[]` (the header keys, in document order) so
existing consumers and fixtures are unaffected; `head` is additive. For the
reserved `item-markers matrix`, column headers MUST carry `kind: "marker"` (columns
are Markers); for a free matrix, row headers carry the `source` concept and column
headers the `target` concept with `kind: "element"`. When `head` is absent, a
renderer MUST fall back to plain-text headers and MUST NOT throw.

#### Scenario: Free matrix headers carry concepts
- GIVEN a free matrix with `source: "Problems"` and `target: "Value Propositions"`
- WHEN the payload is built
- THEN `head.cols[<col>].concept` is the target concept and `kind` is `element`
- AND `head.rows[<row>].concept` is the source concept

#### Scenario: item-markers columns are markers
- GIVEN the reserved `item-markers matrix`
- WHEN the payload is built
- THEN every `head.cols[<col>].kind` is `marker`

#### Scenario: Additive and optional
- GIVEN a matrix built without header metadata
- WHEN a renderer draws it
- THEN row and column headers render as plain text and nothing throws

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

