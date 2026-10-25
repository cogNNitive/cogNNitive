# citation-parser-resolver Specification

## Purpose

One parser and one filesystem resolver gain JSON Pointer as a third unit kind and drop the retired folder prefixes. Exhaustive unit dispatch means no unit kind is silently ignored.

## Requirements

### Requirement: innfo-core exports one `parseCitation`

innfo-core MUST export a single `parseCitation(value)` returning a structured citation (`path` and an optional `unit` whose `kind` is `header`, `row`, or `pointer`; a CSV `row` may carry a `subunit`) for the canonical `@` grammar: markdown heading anchors, CSV `RowID&column`, and JSON Pointer. It MUST be the only consumer-facing parser and serializer; no consumer outside innfo-core MAY implement citation parsing or serialization.

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

#### Scenario: Bare path is a file-level citation
- GIVEN `kNNowledge/Client_business_NN.md`
- WHEN `parseCitation` runs
- THEN it returns the path with no unit and no `KU_DEPRECATED_HASH` warning

#### Scenario: Malformed citation
- GIVEN `sources/import/a.md@L10-L20`
- WHEN `parseCitation` runs
- THEN it returns a failure result and does not throw

### Requirement: One filesystem source resolver

innfo-core MUST provide exactly one filesystem source resolver (`createFsSourceResolver`). innfo-mcp `validate` and `resolve_sources` MUST use it. The resolver MUST dispatch on `unit.kind` exhaustively (`header`, `row`, `pointer`; an `assertNever` default) and MUST resolve against the cited file as written; it MUST NOT redirect a citation to a different member of a family. The `resolve_sources` output shape MUST be unchanged except for the added `pointer` kind; the reported `kind` of a target is `model` if and only if its role is `knowledge`.

#### Scenario: MCP uses the core resolver
- GIVEN the repository after this change
- WHEN `createWorkspaceSourceResolver` is searched
- THEN no definition or reference exists

#### Scenario: `resolve_sources` for a heading
- GIVEN `sources/import/interview.md@## Clients` over an existing file
- WHEN `resolve_sources` is called
- THEN the result has `path`, `anchor`, `exists`, `field`, and `origin` as defined in `citation-source-resolution`

#### Scenario: Citation to an older member is not redirected
- GIVEN `sources/import/p_20261001T090000Z.md@## A` and a newer member `p_20261002T101500Z.md`
- WHEN the resolver runs
- THEN it resolves in the older member's bytes

### Requirement: `#slug` is a legacy read path inside innfo-core only

innfo-core MAY parse `path#slug` citations solely to keep write-once specs and frozen samples readable. Each such parse MUST emit the `KU_DEPRECATED_HASH` warning. `#slug` citations MUST NOT be written by any producer, and no consumer outside innfo-core MAY parse them.

#### Scenario: Legacy slug is readable with a warning
- GIVEN a frozen sample with `sources:: sources/import/a.md#intro`
- WHEN `validateWorkspaceSources` runs
- THEN the reference resolves and a `KU_DEPRECATED_HASH` warning is reported

#### Scenario: Producers never emit `#slug`
- GIVEN any producer (console procedure, nn-trannsform, editor mutation)
- WHEN it writes a citation
- THEN the written value uses `@` grammar

### Requirement: Citation paths are workspace-relative with no implicit prefix

`resolveUnitPath` MUST accept any domaiNN-relative path to a `md`, `csv`, or `json` file, with no implicit `sources/nn/` prefix and no branches for retired folders. A path under a retired folder (`sources/nn/`, `sources/original/`, `sources/export/`, `export/`, `models/`) simply does not exist and so dangles (`KU_DANGLING_FILE`); the legacy layout detector, not the resolver, explains why. A path under `sources/archive/` that still exists on disk resolves as a plain path. A unit citation aimed at a binary raw file MUST yield `KU_BINARY_TARGET` with a suggestion to cite `<file>.<ext>_sidecar_NN.md`. A path under `staging/` is an excluded path and is not citable.

#### Scenario: `kNNowledge/` resolves
- GIVEN `kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients`
- WHEN `resolveUnitPath` runs
- THEN it resolves to that file

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

### Requirement: Artifact frontmatter and console meta citations are validated

`validateWorkspaceSources` MUST validate citations in markdown artifact frontmatter `sources:` and in console `nn-model.meta.sources`, with the same diagnostics as kNNowledge body `sources::`.

#### Scenario: Dangling artifact citation
- GIVEN `artifacts/report_20261002T101500Z.md` with frontmatter `sources: [sources/import/missing.md@## Intro]` and no such file
- WHEN `validateWorkspaceSources` runs
- THEN a `KU_DANGLING_FILE` error is reported for the artifact

#### Scenario: Console meta citation validated
- GIVEN a console whose `nn-model.meta.sources` cites a missing heading
- WHEN `validateWorkspaceSources` runs
- THEN an anchor-resolution diagnostic is reported

### Requirement: Lineage projection is an innfo-core export

innfo-core MUST export the lineage projection function (parsed workspace to record view sections) as public API with unit tests. Relative imports MUST carry `.js` (NodeNext).

#### Scenario: Projection export is importable from Node ESM
- GIVEN the built innfo-core package
- WHEN a Node ESM script imports the projection from the package entry
- THEN the import succeeds

### Requirement: JSON Pointer is a unit kind

For `.json` targets the portion after `@` MUST be a JSON Pointer (RFC 6901) held in the unit `{kind:'pointer', pointer}` in raw (escaped) form: it MUST begin with `/` and use `~0` and `~1` escapes; the empty pointer is the file-level citation. `pointer` units have no subunits. A literal `&` inside a key MUST be written `%26` and is decoded by the existing segment decoder. A pointer MUST resolve only when it addresses an existing value in the parsed document; the array end marker `-` and indexes with leading zeros MUST NOT resolve. An unresolved pointer MUST yield `KU_UNKNOWN_POINTER`. A target that does not parse as JSON MUST yield `KU_INVALID_JSON`. A pointer on a non-`.json` target MUST be a malformed-citation diagnostic.

#### Scenario: Resolves
- GIVEN `{"items":[{"name":"a"}]}` at `sources/import/d.json`
- WHEN `sources/import/d.json@/items/0/name` is validated
- THEN it resolves

#### Scenario: Escapes
- GIVEN a key `a/b` and a key `m~n`
- WHEN the pointers `/a~1b` and `/m~0n` are validated
- THEN both resolve

#### Scenario: Ampersand is percent-encoded and no subunit exists
- GIVEN a key `R&D`
- WHEN `sources/import/d.json@/R%26D` is validated
- THEN it resolves and no subunit is parsed

#### Scenario: Missing and past-end pointers
- GIVEN an array with two items
- WHEN `@/items/2` and `@/items/-` are validated
- THEN each yields `KU_UNKNOWN_POINTER`

#### Scenario: Invalid JSON target
- GIVEN `sources/import/bad.json` that does not parse
- WHEN `sources/import/bad.json@/items/0` is validated
- THEN `KU_INVALID_JSON` is reported

#### Scenario: Pointer on a markdown file
- GIVEN `sources/import/a.md@/items/0`
- WHEN validated
- THEN a malformed-citation diagnostic is reported
