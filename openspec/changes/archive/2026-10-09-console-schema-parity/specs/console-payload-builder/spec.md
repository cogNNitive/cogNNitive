# Delta for console-payload-builder

## MODIFIED Requirements

### Requirement: Single Payload Builder

`buildConsolePayload` MUST be the only payload builder. The CLI (`scripts/export-console.mjs`) and the `compile_model_console` procedure MUST both delegate to it and MUST NOT hand-build payloads. The procedure MUST reach it through a `build_console_payload` MCP tool backed by the workspace `SourceResolver`. The result MUST carry both slots: `schema` (for `innfo-schema`) and `model` (for `innfo-model`, holding `meta`, `elements` and `matrices`). `relations` MUST be emitted per element as `el.relations: {field, target, targetLabel}[]` (intra-model wikilink targets only), because both runtimes read it per element; there is no model-level `relations`. This is NEW GAP: today the builder emits none. `element.markers` MUST be a map and `schema.markers` a list of definitions in every producer. Both runtimes read `schema.concepts` as an array and the viewer reads matrix `rows`/`cols`, so the builder MUST emit array schema slots (via `buildConsoleSchemaSlot`) and matrices with `rows` and `cols`. The `build_console_payload` tool MUST return the slots as serialized strings (`serializeConsoleSlot`: two-space JSON with `<` escaped as `<`) plus the output path; the CLI MUST use the same serializer. The CLI MUST obtain its `schema` slot from the shared console schema resolver (capability `console-schema-resolution`), replacing the current no-op `parent_spec` schema branch; the MCP tool MUST obtain its `schema` slot from the same shared path. (Previously: the CLI's `parent_spec` branch was a no-op that always emitted a derived stub, so the two producers could diverge.)

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
