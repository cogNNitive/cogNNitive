# Typed Source References

## Purpose

Typed source references follow the base change's single `parseCitation` and add a third unit kind, JSON Pointer. Paths are workspace-relative with no default prefix, and unit dispatch is exhaustive over unit kinds.

## Requirements

### Requirement: Single shared source-reference parser

`@cognnitive/innfo-core` MUST expose `parseCitation(value)` and `slugifyHeading(text)`. `innfo-editor` and `innfo-mcp` MUST consume them. The structured result MUST carry the workspace-relative `path` and an optional `unit` whose `kind` is one of `header`, `row`, or `pointer` (`{kind:'pointer', pointer}` is the new third kind). `kind` MUST be derived from the target file extension (`.md` to `header`, `.csv` to `row`, `.json` to `pointer`). A value with no `@` MUST parse as a file-level citation with no `unit`. No default prefix MUST be added to `path`.

#### Scenario: Editor and core agree on a slug
- GIVEN the heading text `Visión Estratégica`
- WHEN `slugifyHeading` runs in innfo-core and via the editor re-export
- THEN both return `vision-estrategica`

#### Scenario: Path is kept as written
- GIVEN the value `sources/import/clientA/report.md@## Market overview`
- WHEN `parseCitation` runs
- THEN the result has `path` `sources/import/clientA/report.md` and a `header` unit

#### Scenario: JSON citation
- GIVEN the value `sources/import/feedback/f.json@/items/0/text`
- WHEN `parseCitation` runs
- THEN the result has a `pointer` unit with `pointer` `/items/0/text`

#### Scenario: Line-range anchor is rejected
- GIVEN the value `report.md@L12-L45`
- WHEN `parseCitation` runs
- THEN it returns a failure result and does not throw

#### Scenario: src-NNN wrapper is rejected
- GIVEN the value `src-007 report.md@## Intro`
- WHEN `parseCitation` runs
- THEN it returns a failure result

### Requirement: Source fields are typed onto the graph

When `recursiveParse` normalises an element declaring a field named `sources` (case-insensitive, scalar or list), or any field whose schema type is `citation`, the resulting `ModelNode` MUST carry a `sources` array of every value that parsed as a citation and MUST emit one `Relationship` per citation with `origin: "source"`. Values that do not parse MUST surface as diagnostics. Every dispatch over `unit.kind` (`workspaceSources.ts`, `unitResolve.ts`, `sourceRef.ts`, `console/citations.ts`, and the editor's `FilePreviewModal.vue`) MUST be an exhaustive `switch` ending in `assertNever`: a new `unit.kind` that is not handled MUST be a compile-time error, and a unit kind the validator cannot handle MUST NOT be silently ignored. The editor's duplicate citation serializer MUST be deleted in favor of the core one.

#### Scenario: Element with two source pointers
- GIVEN an element with `sources:: [sources/import/interview.md@## Clients, sources/import/notes.md@## Priorities]`
- WHEN the model is parsed
- THEN `ModelNode.sources` has two entries and two `origin: "source"` relationships exist

#### Scenario: Graph consumers skip source edges
- GIVEN a relationship with `origin: "source"` whose `targetId` is a path
- WHEN a consumer resolves relationship targets by node id
- THEN source edges are skipped without a dangling-node error

#### Scenario: Schema-typed citation field
- GIVEN a field `price_source:: type:: citation` valued `sources/import/pricing.csv@R3&price`
- WHEN the model is parsed
- THEN `ModelNode.sources` includes that citation

#### Scenario: Round-trip stays byte-identical
- GIVEN a model with `sources::`, a `type:: citation` field, and a JSON Pointer citation
- WHEN parsed and re-serialized
- THEN the output is byte-identical to the input

#### Scenario: Exhaustive dispatch
- GIVEN the union of `unit.kind` values
- WHEN the validator's dispatch is type-checked and unit-tested
- THEN every kind has a handler, and adding a kind without a handler fails compilation

### Requirement: Workspace-scoped source validation

`innfo-core` MUST expose `validateWorkspaceSources(result, resolver)` returning `ReferenceDiagnostic[]`, and the innfo-mcp `validate` tool MUST include its diagnostics. A unit citation (`@`) whose target is a binary raw file MUST produce an error diagnostic with code `KU_BINARY_TARGET` that names the sidecar path to cite instead. A citation to a sidecar of a text-native file MUST produce an anchor diagnostic because that sidecar has no body.

#### Scenario: Dangling source file
- GIVEN `sources:: sources/import/missing.md@## Intro` and no such file
- WHEN validation runs
- THEN an `error` names `sources/import/missing.md`

#### Scenario: Missing heading
- GIVEN `sources:: sources/import/report.md@## Nonexistent` and no such heading
- WHEN validation runs
- THEN an anchor-resolution diagnostic is emitted

#### Scenario: Binary raw cited directly
- GIVEN `sources:: sources/import/report.pdf@## Summary`
- WHEN validation runs
- THEN a `KU_BINARY_TARGET` error states the citation must target `sources/import/report.pdf_sidecar_NN.md`

#### Scenario: Binary cited through its sidecar
- GIVEN `sources:: sources/import/report.pdf_sidecar_NN.md@## Summary` and a sidecar body with `## Summary`
- WHEN validation runs
- THEN no diagnostic is emitted

#### Scenario: Unresolved JSON Pointer
- GIVEN `sources:: sources/import/f.json@/items/9/text` and a file with only three items
- WHEN validation runs
- THEN a `KU_UNKNOWN_POINTER` diagnostic is emitted

#### Scenario: JSON target is not valid JSON
- GIVEN `sources:: sources/import/broken.json@/items/0` and a file that does not parse
- WHEN validation runs
- THEN a `KU_INVALID_JSON` diagnostic is emitted

#### Scenario: MCP validate surfaces diagnostics
- GIVEN a workspace with a dangling `sources::`
- WHEN the MCP `validate` tool runs
- THEN the response includes the error
