# Typed Source References

## Purpose

Typed source references follow the base change's single `parseCitation` and add a third unit kind, JSON Pointer. Paths are workspace-relative with no default prefix, and unit dispatch is exhaustive over unit kinds.
## Requirements
### Requirement: Single shared source-reference parser

`@cognnitive/innfo-core` MUST expose `parseCitation(value)` and `slugifyHeading(text)`. `innfo-mcp` and the console runtime MUST consume them. The structured result MUST carry either a workspace-relative `path` or an extension-less `knowledge_slug`, and an optional `unit`. The `unit.kind` MUST be one of:
- `header` (`{ kind: 'header', slug: string }`) for Markdown headings (`.md`).
- `row` (`{ kind: 'row', row: number, column?: string }`) for CSV rows/cells (`.csv`).
- `pointer` (`{ kind: 'pointer', pointer: string }`) for JSON Pointers (`.json`).
- `element` (`{ kind: 'element', slug: string }`) for semantic model elements (`knowledge_slug@slug`). Subunits MAY specify an element field (`knowledge_slug@slug&field`).
- `matrix` (`{ kind: 'matrix', matrixSlug: string, rowSlug?: string, colSlug?: string }`) for semantic model matrices and matrix cells (`knowledge_slug@matrix&row&col`).

When a citation target lacks a file extension and conforms to the model id format `[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*` (the file stem of `kNNowledge/<stem>_NN.md`, which keeps its case and may contain underscores and hyphens, for example `cognnitive_repository` or `Client_business`), it MUST be parsed as a model id reference rather than a file path. Heading, element, matrix and row slugs keep the lowercase slug format `[a-z0-9]+(?:-[a-z0-9]+)*`. A value with no `@` MUST parse as a document-level citation with no `unit`. No default prefix MUST be added to paths or model slugs. Existing path-based citations (`.md`, `.csv`, `.json`) MUST continue to parse identically without breaking changes.

(Previously: The parser required citation targets to be workspace-relative file paths with explicit file extensions, and the unit kind was strictly derived from file extensions into one of 'header', 'row', or 'pointer'.) (Previously: `innfo-editor` was also a required consumer.)

#### Scenario: Parse model element citation
- GIVEN the citation string `core-business@revenue-growth`
- WHEN `parseCitation` executes
- THEN the result has target `core-business` as model slug
- AND the unit is of kind `element` with slug `revenue-growth`

#### Scenario: Parse model element field citation
- GIVEN the citation string `core-business@revenue-growth&target_value`
- WHEN `parseCitation` executes
- THEN the result has target `core-business` as model slug
- AND the unit is of kind `element` with slug `revenue-growth`
- AND the subunits array contains `target_value`

#### Scenario: Parse matrix cell citation
- GIVEN the citation string `portfolio@coverage-matrix&security&compliance`
- WHEN `parseCitation` executes
- THEN the result has target `portfolio` as model slug
- AND the unit is of kind `matrix` with `matrixSlug: "coverage-matrix"`, `rowSlug: "security"`, and `colSlug: "compliance"`

#### Scenario: Existing Markdown heading citation remains unchanged
- GIVEN the citation string `sources/import/clientA/report.md@## Market overview`
- WHEN `parseCitation` executes
- THEN the result has `path` `sources/import/clientA/report.md` and a `header` unit with slug `market-overview`

#### Scenario: Existing JSON Pointer citation remains unchanged
- GIVEN the citation string `sources/import/data/f.json@/items/0/text`
- WHEN `parseCitation` executes
- THEN the result has `path` `sources/import/data/f.json` and a `pointer` unit `/items/0/text`

### Requirement: Source fields are typed onto the graph

When `recursiveParse` and the graph builder normalize a workspace, the resulting `ModelNode` MUST carry a `sources` array computed from the live evidence of the applied changes that target the node's units (see `computed-lineage-view`), and MUST emit one `Relationship` per live evidence entry with `origin: "source"`. Field values MUST NOT be read for citations: a field named `sources` or typed `citation` is banned in kNNowledge (`document-citations`). Every dispatch over `unit.kind` across `@cognnitive/innfo-core` (`workspaceSources.ts`, `unitResolve.ts`, `sourceRef.ts`, `console/citations.ts`) MUST be an exhaustive `switch` over all 5 unit kinds (`header`, `row`, `pointer`, `element`, `matrix`) ending in `assertNever`. Any missing unit kind in the dispatch MUST produce a compile-time TypeScript error. The unit test suite `exhaustiveUnitKind.test.ts` and test fixtures `ok.ts` and `missing-case.ts` MUST cover `element` and `matrix` unit kinds.

(Previously: the node `sources` and the `origin: "source"` relationships were read from a `sources` field or any `citation`-typed field of the element.)

#### Scenario: Model element citation typed onto the graph
- GIVEN an applied `update_field` on element `market-fit` with `evidence:: [strategy-model@revenue-growth]`
- WHEN the graph is built
- THEN `ModelNode.sources` of `market-fit` contains the citation pointing to `strategy-model@revenue-growth`
- AND an `origin: "source"` relationship is emitted

#### Scenario: Superseded evidence is not an edge
- GIVEN a later change on the same field with other evidence
- WHEN the graph is built
- THEN only the later evidence is an edge

#### Scenario: Exhaustive dispatch compilation test
- GIVEN a function dispatching over `KnowledgeUnit.kind`
- WHEN handlers for `header`, `row`, `pointer`, `element`, and `matrix` are present
- THEN compilation succeeds
- AND removing either `element` or `matrix` causes TypeScript compilation to fail at `assertNever`

### Requirement: Workspace-scoped source validation

`innfo-core` MUST expose `validateWorkspaceSources(result, resolver)` returning `ReferenceDiagnostic[]`, and the innfo-mcp `validate` tool MUST include its diagnostics. The citation sites MUST be the `evidence` entries of applied changes (file-level `sources:` frontmatter and `sources::` fields are not sites). A unit citation (`@`) whose target is a binary raw file MUST produce an error diagnostic with code `KU_BINARY_TARGET` that names the sidecar path to cite instead. A citation to a sidecar of a text-native file MUST produce an anchor diagnostic because that sidecar has no body. Anchor failures MUST be enforced only when the change's stamped `evidence_sha256` matches (`change-provenance`).

#### Scenario: Dangling source file
- GIVEN an applied change with `evidence:: sources/import/missing.md@## Intro` and no such file
- WHEN validation runs
- THEN an `error` names `sources/import/missing.md`

#### Scenario: Missing heading
- GIVEN an applied change with `evidence:: sources/import/report.md@## Nonexistent`, a matching stamped sha and no such heading
- WHEN validation runs
- THEN an anchor-resolution diagnostic is emitted

#### Scenario: Binary raw cited directly
- GIVEN an evidence entry `sources/import/report.pdf@## Summary`
- WHEN validation runs
- THEN a `KU_BINARY_TARGET` error states the citation must target `sources/import/report.pdf_sidecar_NN.md`

#### Scenario: Binary cited through its sidecar
- GIVEN an evidence entry `sources/import/report.pdf_sidecar_NN.md@## Summary` and a sidecar body with `## Summary`
- WHEN validation runs
- THEN no diagnostic is emitted

#### Scenario: Unresolved JSON Pointer
- GIVEN an evidence entry `sources/import/f.json@/items/9/text` and a file with only three items
- WHEN validation runs
- THEN a `KU_UNKNOWN_POINTER` diagnostic is emitted

#### Scenario: JSON target is not valid JSON
- GIVEN an evidence entry `sources/import/broken.json@/items/0` and a file that does not parse
- WHEN validation runs
- THEN a `KU_INVALID_JSON` diagnostic is emitted

#### Scenario: MCP validate surfaces diagnostics
- GIVEN a workspace with an applied change whose evidence dangles
- WHEN the MCP `validate` tool runs
- THEN the response includes the error

### Requirement: Semantic Model Citation Target Resolution

When resolving citations that target a `knowledge_slug`, `innfo-core` and workspace validators MUST resolve the target against workspace models declaring matching `knowledge_slug` in frontmatter or matching the model stem name. If the target model cannot be resolved, an error diagnostic MUST be emitted. If the model is found but the referenced element slug or matrix slug does not exist, an anchor diagnostic MUST be emitted naming the unresolved slug.

#### Scenario: Citation to existing model element resolves cleanly
- GIVEN a workspace containing a model with `knowledge_slug: sales-plan` containing element slug `q4-target`
- AND an element citing `sales-plan@q4-target`
- WHEN workspace source validation executes
- THEN the citation resolves successfully without diagnostics

#### Scenario: Citation to nonexistent model slug emits diagnostic
- GIVEN an element citing `missing-model@some-element`
- AND no model in the workspace declares `knowledge_slug: missing-model`
- WHEN workspace source validation executes
- THEN a diagnostic reporting the missing model target is emitted

#### Scenario: Citation to nonexistent element slug emits diagnostic
- GIVEN a workspace containing model `sales-plan`
- AND an element citing `sales-plan@nonexistent-slug`
- WHEN workspace source validation executes
- THEN an anchor-resolution diagnostic reporting the unresolved element slug is emitted

### Requirement: Domain pointers are `address` fields

Fields that point from a unit to another unit or file (including `conflicts::`) MUST be declared `type:: address`. `conflicts::` MUST NOT use the citation grammar of `sources::`; its value MUST be a canonical unit address. The conflict diagnostic `SRC_CONFLICT_FLAGGED` MUST be derived from the `address` field. `address` fields are syntax-checked only (`references.ts`); resolving a dangling address and wiring `address` fields into graph edges are NOT part of this change, which accepts the loss of anchor checks (`KU_*`) for pointers moved from `citation` to `address`.

#### Scenario: Conflict pointer is an address
- GIVEN an element with `conflicts:: strategy@goal-2`
- WHEN the validator runs
- THEN the value is parsed as an address and `SRC_CONFLICT_FLAGGED` is reported for the pair

#### Scenario: Citation grammar is rejected in conflicts
- GIVEN `conflicts:: sources/import/a.md@## Intro`
- WHEN the validator runs
- THEN a malformed-address diagnostic is reported

#### Scenario: Accepted gap is documented
- GIVEN an `address` field pointing at a nonexistent unit
- WHEN the validator runs
- THEN only syntax is checked and no `KU_*` diagnostic is produced
