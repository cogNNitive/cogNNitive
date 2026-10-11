# console-payload-builder Specification (delta)

## ADDED Requirements

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

## MODIFIED Requirements

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
