# Console Payload Builder Specification

## Purpose

One payload contract and one builder (`buildConsolePayload`, in `innfo-core/src/console/`) shared by the export CLI and the `compile_model_console` procedure, so a console is identical regardless of its producer. Behavior already built in commit `6f905b1e` (meta fields, element ids, per-element hash, matrices, `feedbackState` shape) is restated as the contract; the gaps are the requirements marked NEW GAP.
## Requirements
### Requirement: Single Payload Builder

`buildConsolePayload` MUST be the only payload builder. The CLI
(`scripts/export-console.mjs`) and the `compile_model_console` procedure MUST both
delegate to it and MUST NOT hand-build payloads. The procedure MUST reach it
through a `build_console_payload` MCP tool backed by the workspace
`SourceResolver`. The result MUST carry both slots: `schema` (for `innfo-schema`)
and `model` (for `innfo-model`, holding `meta`, `elements` and `matrices`).
`relations` MUST be emitted per element as `el.relations: {field, target,
targetLabel}[]` (intra-model wikilink targets only), because both runtimes read it
per element; there is no model-level `relations`. `element.markers` MUST be a map
and `schema.markers` a list of definitions in every producer. Both runtimes read
`schema.concepts` as an array and the viewer reads matrix `rows`/`cols`, so the
builder MUST emit array schema slots (via `buildConsoleSchemaSlot`) and matrices
with `rows` and `cols` (and MAY emit the additive `head` metadata). The
`build_console_payload` tool MUST return the slots as serialized strings
(`serializeConsoleSlot`: two-space JSON with `<` escaped as `<`) plus the output
path; the CLI MUST use the same serializer. The CLI MUST obtain its `schema` slot
from the shared console schema resolver (capability `console-schema-resolution`),
replacing the current no-op `parent_spec` schema branch; the MCP tool MUST obtain
its `schema` slot from the same shared path.

#### Scenario: CLI and procedure agree (golden test)

- GIVEN one fixture domaiNN with citations and a ledger
- WHEN the CLI (real process) and the `build_console_payload` tool each produce the slots
- THEN the `innfo-schema` and `innfo-model` slot text extracted from the CLI HTML equals the tool's slot strings, after normalizing `meta.generated` and `meta.citationsResolvedAt`
- AND the surrounding HTML is NOT required to be identical (the shells differ by design)

#### Scenario: Byte-identical schema slot

- GIVEN one model
- WHEN the CLI and the `build_console_payload` tool build it
- THEN both take the `schema` slot from the shared resolver
- AND the two `schema` slots are byte-identical

#### Scenario: Relations are emitted

- GIVEN a model containing relations
- WHEN either path builds the payload
- THEN each element carries `relations` with its intra-model targets, and no `model.relations` exists

#### Scenario: Slot text is script-safe

- GIVEN a citation excerpt containing `</script>`
- WHEN the slots are serialized
- THEN the slot text contains no literal `<`

#### Scenario: Procedure holds no payload logic

- GIVEN `compile_model_console_NN.md`
- WHEN scanned for hand-built JSON contracts
- THEN none remain; it only calls the tool and fills both slots

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

The payload MUST emit citations as the per-field map `el.citations: { "<citationFieldName>": ResolvedCitation[] }` plus `meta.citationsResolvedAt`, the shape consumed by the model viewer and required by living spec `console-field-citations`. The flat-array shape MUST NOT be emitted. A test MUST assert that the CLI output and the procedure output carry the same shape, and that the model viewer renders icons from the builder output.

#### Scenario: Viewer consumes builder output

- GIVEN a payload built with a resolver for an element with a `sources` field
- WHEN the model viewer renders it
- THEN the origin icon appears, with no shape conversion

#### Scenario: No resolver

- GIVEN a build without a resolver
- WHEN the payload is built
- THEN it succeeds, elements carry no `citations`, and nothing throws

### Requirement: Pure Citation Logic in innfo-core, Injected Resolver

Pure citation logic (`resolveCitation`, `classifyOrigin`, excerpt building and the helpers around them) MUST live only in `innfo-core`. `innfo-mcp` MUST import it and MUST NOT keep copies; the private copies in `resolve-sources.ts` MUST be deleted. File reading MUST be an injected resolver, so the builder does no filesystem or MCP access. The CLI MUST inject a filesystem-backed resolver (`createFsSourceResolver`, in core); the MCP tool MUST inject the workspace `SourceResolver`, whose lookup algorithm is the same core function plus miss-time suggestions. Citation fields are chosen by name or by schema `type:: citation`, in core.

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

