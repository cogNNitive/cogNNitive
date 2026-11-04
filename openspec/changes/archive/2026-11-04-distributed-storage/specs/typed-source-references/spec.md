# Delta for typed-source-references

Living spec read: `openspec/specs/typed-source-references/spec.md`. Replaced: the model-id format in the parser (a flat stem pattern) and the resolution of a model citation by `knowledge_slug` or stem. Both become hierarchical-id resolution (`hierarchical-identity`, `unified-reference-grammar`). Unchanged: `Source fields are typed onto the graph` and `Workspace-scoped source validation` (raw-file citations). Overlap: `lineage-as-changes` also edits this living spec; rebase this delta onto its merged text before archive.

## MODIFIED Requirements

### Requirement: Single shared source-reference parser

`@cognnitive/innfo-core` MUST expose `parseCitation(value)` and `slugifyHeading(text)`. `innfo-mcp` and the console runtime MUST consume them. The structured result MUST carry either a workspace-relative `path` (raw files) or a hierarchical model id (kNNowledge units), and an optional `unit`. The `unit.kind` MUST be one of:
- `header` (`{ kind: 'header', slug: string }`) for Markdown headings (`.md`).
- `row` (`{ kind: 'row', row: number, column?: string }`) for CSV rows/cells (`.csv`).
- `pointer` (`{ kind: 'pointer', pointer: string }`) for JSON Pointers (`.json`).
- `element` (`{ kind: 'element', slug: string }`) for semantic model elements (`<model-id>@slug`). Subunits MAY specify an element field (`<model-id>@slug&field`).
- `matrix` (`{ kind: 'matrix', matrixSlug: string, rowSlug?: string, colSlug?: string }`) for semantic model matrices and matrix cells (`<model-id>@matrix&row&col`).

When a citation target lacks a file extension and conforms to the hierarchical id format (one or more segments separated by the id separator, each matching `[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*`), it MUST be parsed as a model id reference rather than a file path. The parser does not look at the filesystem; whether the id names an existing model is decided by workspace validation. Heading, element, matrix and row slugs keep the lowercase slug format `[a-z0-9]+(?:-[a-z0-9]+)*`. A value with no `@` MUST parse as a document-level citation with no `unit`. No default prefix MUST be added to paths or model ids. Existing raw-file citations (`.md`, `.csv`, `.json`) MUST continue to parse identically.
(Previously: the model id was the file stem of `kNNowledge/<stem>_NN.md` matching `[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*`, and `knowledge_slug@slug` was the model citation.)

#### Scenario: Parse model element citation
- GIVEN the citation string `villabotijos-today/pepper-mapache@00-gancho`
- WHEN `parseCitation` executes
- THEN the result has target `villabotijos-today/pepper-mapache` as model id
- AND the unit is of kind `element` with slug `00-gancho`

#### Scenario: Parse model element field citation
- GIVEN the citation string `villabotijos-today/pepper-mapache@00-gancho-presenter&asset`
- WHEN `parseCitation` executes
- THEN the result has target `villabotijos-today/pepper-mapache` as model id
- AND the unit is of kind `element` with slug `00-gancho-presenter`
- AND the subunits array contains `asset`

#### Scenario: Parse matrix cell citation
- GIVEN the citation string `portfolio/coverage@coverage-matrix&security&compliance`
- WHEN `parseCitation` executes
- THEN the result has target `portfolio/coverage` as model id
- AND the unit is of kind `matrix` with `matrixSlug: "coverage-matrix"`, `rowSlug: "security"`, and `colSlug: "compliance"`

#### Scenario: Existing Markdown heading citation remains unchanged
- GIVEN the citation string `sources/import/clientA/report.md@## Market overview`
- WHEN `parseCitation` executes
- THEN the result has `path` `sources/import/clientA/report.md` and a `header` unit with slug `market-overview`

#### Scenario: Existing JSON Pointer citation remains unchanged
- GIVEN the citation string `sources/import/data/f.json@/items/0/text`
- WHEN `parseCitation` executes
- THEN the result has `path` `sources/import/data/f.json` and a `pointer` unit `/items/0/text`

### Requirement: Semantic Model Citation Target Resolution

When resolving citations that target a model, `innfo-core` and workspace validators MUST resolve the target by hierarchical id against the models of the domaiNN. Resolution by `knowledge_slug`, by filename stem, or by title MUST NOT exist. If the target model cannot be resolved, an error diagnostic MUST be emitted listing candidate ids that share the given last segment. If the model is found but the referenced element slug or matrix slug does not exist, an anchor diagnostic MUST be emitted naming the unresolved slug.
(Previously: the target resolved against `knowledge_slug` in frontmatter or the model stem name.)

#### Scenario: Citation to existing model element resolves cleanly
- GIVEN a model `villabotijos-today/pepper-mapache` containing element slug `00-gancho`
- AND an element citing `villabotijos-today/pepper-mapache@00-gancho`
- WHEN workspace source validation executes
- THEN the citation resolves successfully without diagnostics

#### Scenario: Citation to nonexistent model emits diagnostic
- GIVEN an element citing `villabotijos-today/missing@00-gancho`
- AND no model has that id
- WHEN workspace source validation executes
- THEN a diagnostic reporting the missing model target is emitted

#### Scenario: Citation by bare slug lists candidates
- GIVEN `villabotijos-today/intro` and `innteresante/intro` and a citation `intro@00-gancho`
- WHEN workspace source validation executes
- THEN a diagnostic lists both ids as candidates
- AND the citation resolves to neither

#### Scenario: Citation to nonexistent element slug emits diagnostic
- GIVEN a workspace containing model `villabotijos-today/pepper-mapache`
- AND an element citing `villabotijos-today/pepper-mapache@nonexistent-slug`
- WHEN workspace source validation executes
- THEN an anchor-resolution diagnostic reporting the unresolved element slug is emitted
