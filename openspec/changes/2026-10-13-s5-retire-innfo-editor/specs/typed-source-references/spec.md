# Delta for typed-source-references

## MODIFIED Requirements

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
