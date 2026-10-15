# Typed Source References

## Purpose

Typed source references follow the base change's single `parseCitation` and add a third unit kind, JSON Pointer. Paths are workspace-relative with no default prefix, and unit dispatch is exhaustive over unit kinds.
## Requirements
### Requirement: Single shared source-reference parser

`@cognnitive/innfo-core` MUST expose `parseCitation(value)` and `slugifyHeading(text)`. `innfo-mcp` and the console runtime MUST consume them. The structured result MUST carry either a workspace-relative `path` or an extension-less `model_slug`, and an optional `unit`. The `unit.kind` MUST be one of:
- `header` (`{ kind: 'header', slug: string }`) for Markdown headings (`.md`).
- `row` (`{ kind: 'row', row: number, column?: string }`) for CSV rows/cells (`.csv`).
- `pointer` (`{ kind: 'pointer', pointer: string }`) for JSON Pointers (`.json`).
- `element` (`{ kind: 'element', slug: string }`) for semantic model elements (`model_slug@slug`). Subunits MAY specify an element field (`model_slug@slug&field`).
- `matrix` (`{ kind: 'matrix', matrixSlug: string, rowSlug?: string, colSlug?: string }`) for semantic model matrices and matrix cells (`model_slug@matrix&row&col`).

When a citation target lacks a file extension and conforms to the slug format `[a-z0-9]+(?:-[a-z0-9]+)*`, it MUST be parsed as a model slug reference rather than a file path. A value with no `@` MUST parse as a document-level citation with no `unit`. No default prefix MUST be added to paths or model slugs. Existing path-based citations (`.md`, `.csv`, `.json`) MUST continue to parse identically without breaking changes.

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

When `recursiveParse` normalizes an element declaring a field named `sources` (case-insensitive, scalar or list) or any field whose schema type is `citation`, the resulting `ModelNode` MUST carry a `sources` array of every parsed citation and MUST emit one `Relationship` per citation with `origin: "source"`. Every dispatch over `unit.kind` across `@cognnitive/innfo-core` (`workspaceSources.ts`, `unitResolve.ts`, `sourceRef.ts`, `console/citations.ts`) MUST be an exhaustive `switch` over all 5 unit kinds (`header`, `row`, `pointer`, `element`, `matrix`) ending in `assertNever`. Any missing unit kind in the dispatch MUST produce a compile-time TypeScript error. The unit test suite `exhaustiveUnitKind.test.ts` and test fixtures `ok.ts` and `missing-case.ts` MUST cover `element` and `matrix` unit kinds.

(Previously: Every dispatch over unit.kind was constrained to an exhaustive switch over 'header', 'row', and 'pointer'.) (Previously: the editor `FilePreviewModal.vue` dispatch was also covered.)

#### Scenario: Model element citation typed onto the graph
- GIVEN an element declaring `sources:: [strategy-model@market-fit]`
- WHEN the model is parsed by `recursiveParse`
- THEN `ModelNode.sources` contains the citation pointing to `strategy-model@market-fit`
- AND an `origin: "source"` relationship is emitted

#### Scenario: Exhaustive dispatch compilation test
- GIVEN a function dispatching over `KnowledgeUnit.kind`
- WHEN handlers for `header`, `row`, `pointer`, `element`, and `matrix` are present
- THEN compilation succeeds
- AND removing either `element` or `matrix` causes TypeScript compilation to fail at `assertNever`

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

### Requirement: Semantic Model Citation Target Resolution

When resolving citations that target a `model_slug`, `innfo-core` and workspace validators MUST resolve the target against workspace models declaring matching `model_slug` in frontmatter or matching the model stem name. If the target model cannot be resolved, an error diagnostic MUST be emitted. If the model is found but the referenced element slug or matrix slug does not exist, an anchor diagnostic MUST be emitted naming the unresolved slug.

#### Scenario: Citation to existing model element resolves cleanly
- GIVEN a workspace containing a model with `model_slug: sales-plan` containing element slug `q4-target`
- AND an element citing `sales-plan@q4-target`
- WHEN workspace source validation executes
- THEN the citation resolves successfully without diagnostics

#### Scenario: Citation to nonexistent model slug emits diagnostic
- GIVEN an element citing `missing-model@some-element`
- AND no model in the workspace declares `model_slug: missing-model`
- WHEN workspace source validation executes
- THEN a diagnostic reporting the missing model target is emitted

#### Scenario: Citation to nonexistent element slug emits diagnostic
- GIVEN a workspace containing model `sales-plan`
- AND an element citing `sales-plan@nonexistent-slug`
- WHEN workspace source validation executes
- THEN an anchor-resolution diagnostic reporting the unresolved element slug is emitted

