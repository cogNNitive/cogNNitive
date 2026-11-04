# Delta for citation-parser-resolver

Living spec read: `openspec/specs/citation-parser-resolver/spec.md`. This spec keeps ownership of citations of raw files (markdown heading, CSV row, JSON Pointer). Citations of kNNowledge units move to the unified grammar (`unified-reference-grammar`), and path-plus-anchor citations of `_NN.md` kNNowledge or changeset documents (the form `<path>@## NN Change: c-09`) are removed. Unchanged: one filesystem source resolver, the `#slug` legacy read path inside innfo-core, artifact frontmatter and console meta validation, the lineage projection export, and JSON Pointer as a unit kind.

Overlap: `lineage-as-changes` also edits this living spec. This delta is written against the living spec and MUST be rebased onto the merged `lineage-as-changes` text before archive.

Scope assumption (see risks in the change return): "citation of a kNNowledge unit" means a citation whose target is a kNNowledge model or one of its units; "raw file" means any other path.

## MODIFIED Requirements

### Requirement: innfo-core exports one `parseCitation`

innfo-core MUST export a single `parseCitation(value)` returning a structured citation (`path` and an optional `unit` whose `kind` is `header`, `row`, or `pointer`; a CSV `row` may carry a `subunit`) for the canonical `@` grammar of raw files: markdown heading anchors, CSV `RowID&column`, and JSON Pointer. A value whose target is a kNNowledge unit MUST be parsed by the unified grammar (`<hierarchical-id>[@<slug>[&<field>]]`) and returned as a kNNowledge unit address, not as a path. `parseCitation` MUST be the only consumer-facing parser and serializer; no consumer outside innfo-core MAY implement citation parsing or serialization.
(Previously: a bare path to a kNNowledge file was a valid file-level citation, and `kNNowledge/...@## <Heading>` was a valid heading citation.)

#### Scenario: Markdown heading citation
- GIVEN `sources/import/interview.md@## Clients`
- WHEN `parseCitation` runs
- THEN it returns path `sources/import/interview.md` and a `header` unit `Clients`

#### Scenario: CSV citation
- GIVEN `sources/import/prices.csv@R12&price`
- WHEN `parseCitation` runs
- THEN it returns row `R12` and subunit `price`

#### Scenario: JSON Pointer citation
- GIVEN `sources/import/data.json@/items/0/name`
- WHEN `parseCitation` runs
- THEN it returns a `pointer` unit with `pointer` `/items/0/name`

#### Scenario: kNNowledge unit citation uses the unified grammar
- GIVEN `villabotijos-today/pepper-mapache@00-gancho`
- WHEN `parseCitation` runs
- THEN it returns a kNNowledge unit address with model `villabotijos-today/pepper-mapache` and element `00-gancho`

#### Scenario: Path to a kNNowledge file is not a citation
- GIVEN `kNNowledge/Client_business_NN.md`
- WHEN `parseCitation` runs
- THEN it returns a failure naming the unified grammar to use
- AND it does not throw

#### Scenario: Malformed citation
- GIVEN `sources/import/a.md@L10-L20`
- WHEN `parseCitation` runs
- THEN it returns a failure result and does not throw

### Requirement: Citation paths are workspace-relative with no implicit prefix

`resolveUnitPath` MUST accept any domaiNN-relative path to a `md`, `csv`, or `json` file that is not a kNNowledge or changeset `_NN.md` document, with no implicit `sources/nn/` prefix and no branches for retired folders. A path under a retired folder (`sources/nn/`, `sources/original/`, `sources/export/`, `export/`, `models/`) simply does not exist and so dangles (`KU_DANGLING_FILE`); the legacy layout detector, not the resolver, explains why. A path under `sources/archive/` that still exists on disk resolves as a plain path. A unit citation aimed at a binary raw file MUST yield `KU_BINARY_TARGET` with a suggestion to cite `<file>.<ext>_sidecar_NN.md`. A path under `staging/` is an excluded path and is not citable. A path to a kNNowledge or changeset `_NN.md` document, with or without an anchor, MUST yield a diagnostic naming the unified grammar instead of resolving.
(Previously: `kNNowledge/` paths with heading anchors resolved as plain paths.)

#### Scenario: `kNNowledge/` path is rejected with a pointer to the grammar
- GIVEN `kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients`
- WHEN `resolveUnitPath` runs
- THEN it does not resolve
- AND the diagnostic names the form as removed and points to `<hierarchical-id>@<slug>`

#### Scenario: Import path resolves
- GIVEN `sources/import/a.md@## Intro`
- WHEN `resolveUnitPath` runs
- THEN it resolves to that file

#### Scenario: Retired prefixes dangle
- GIVEN `sources/nn/a.md@## Intro` and `models/Client_NN.md@## NN Stakeholders: Enterprise Clients` and no such files
- WHEN `resolveUnitPath` runs on each
- THEN neither resolves and the validator reports `KU_DANGLING_FILE` for each, with no special removed-prefix message

#### Scenario: Archive snapshot still resolves
- GIVEN an existing `sources/archive/metrics/V1/metrics.md` with a heading `## Totals`
- WHEN `sources/archive/metrics/V1/metrics.md@## Totals` is resolved
- THEN it resolves as a plain path

#### Scenario: Binary raw target
- GIVEN `sources/import/report.pdf@## Summary`
- WHEN the validator runs
- THEN it reports `KU_BINARY_TARGET` suggesting `sources/import/report.pdf_sidecar_NN.md`

## ADDED Requirements

### Requirement: The `@## NN Change:` citation form is not parsed

No code path MUST parse `<path>@## NN Change: <id>` as a citation: the form is removed, and the parser MUST NOT accept it. How a change record is cited instead (for example through a hierarchical id of the changeset document) is a design decision; until then such a value is a malformed citation.

#### Scenario: Change-heading citation fails
- GIVEN `changes/lc_tutorias_20261012T173127Z_changes_NN.md@## NN Change: c-09`
- WHEN `parseCitation` runs
- THEN it returns a failure naming the form as removed
