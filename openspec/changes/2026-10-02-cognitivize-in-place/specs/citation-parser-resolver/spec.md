# Citation Parser and Resolver (Delta against the base-change capability)

Note: `citation-parser-resolver` is introduced by the in-flight change `2026-10-01-lineage-single-edge`. Treat that delta as the current text; this delta supersedes it after the base change is archived.

## Purpose

One parser and one filesystem resolver gain JSON Pointer as a third unit kind and drop the retired folder prefixes. Exhaustive unit dispatch means no unit kind is silently ignored.

## RENAMED Requirements

- FROM: `### Requirement: `kNNowledge/` is the only model path prefix`
- TO: `### Requirement: Citation paths are workspace-relative and retired prefixes are rejected`

## MODIFIED Requirements

### Requirement: innfo-core exports one `parseCitation`

innfo-core MUST export a single `parseCitation(value)` returning a structured citation (`path`, optional `unit` with `kind`, `anchor`, and optional `subunit`) for the canonical `@` grammar: markdown heading anchors, CSV `RowID&column`, and JSON Pointer. It MUST be the only consumer-facing parser; no consumer outside innfo-core MAY implement citation parsing.
(Previously: heading and CSV only.)

#### Scenario: Markdown heading citation
- GIVEN `sources/import/interview.md@## Clients`
- WHEN `parseCitation` runs
- THEN it returns path `sources/import/interview.md` and a heading unit `Clients`

#### Scenario: CSV citation
- GIVEN `sources/import/prices.csv@R12&price`
- WHEN `parseCitation` runs
- THEN it returns row `R12` and subunit `price`

#### Scenario: JSON Pointer citation
- GIVEN `sources/import/data.json@/items/0/name`
- WHEN `parseCitation` runs
- THEN it returns a `json-pointer` unit with anchor `/items/0/name`

#### Scenario: Bare path is a file-level citation
- GIVEN `kNNowledge/Client_business_NN.md`
- WHEN `parseCitation` runs
- THEN it returns the path with no unit and no `KU_DEPRECATED_HASH` warning

#### Scenario: Malformed citation
- GIVEN `sources/import/a.md@L10-L20`
- WHEN `parseCitation` runs
- THEN it returns a failure result and does not throw

### Requirement: One filesystem source resolver

innfo-core MUST provide exactly one filesystem source resolver (`createFsSourceResolver`). innfo-mcp `validate` and `resolve_sources` MUST use it. The resolver MUST dispatch on `unit.kind` exhaustively (heading, CSV row, JSON Pointer) and MUST resolve against the cited file as written; it MUST NOT redirect a citation to a different member of a family. The `resolve_sources` output shape MUST be unchanged except for the added `json-pointer` kind.
(Previously: heading and CSV only.)

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

### Requirement: Citation paths are workspace-relative and retired prefixes are rejected

`resolveUnitPath` MUST treat the citation path as workspace-relative with no default prefix. It MUST reject `sources/nn/`, `sources/original/`, `sources/export/`, `sources/archive/`, `export/`, `models/`, and `staging/`. The validator MUST report a dedicated `KU_MALFORMED` message for each rejected prefix stating it was removed (or, for `staging/`, that scratch files are not citable).
(Previously: accepted `sources/nn/`, `sources/export/`, and `kNNowledge/` only, with a dedicated message for `models/`.)

#### Scenario: `kNNowledge/` resolves
- GIVEN `kNNowledge/Client_business_NN.md@## NN Stakeholders: Enterprise Clients`
- WHEN `resolveUnitPath` runs
- THEN it resolves to that file

#### Scenario: Import path resolves
- GIVEN `sources/import/a.md@## Intro`
- WHEN `resolveUnitPath` runs
- THEN it resolves to that file

#### Scenario: Retired prefixes are rejected
- GIVEN `sources/nn/a.md@## Intro` and `models/Client_NN.md@## NN Stakeholders: Enterprise Clients`
- WHEN `resolveUnitPath` runs on each
- THEN neither resolves and the validator reports a removed-prefix `KU_MALFORMED` message for each

### Requirement: Artifact frontmatter and console meta citations are validated

`validateWorkspaceSources` MUST validate citations in markdown artifact frontmatter `sources:` and in console `innfo-model.meta.sources`, with the same diagnostics as kNNowledge body `sources::`.

#### Scenario: Dangling artifact citation
- GIVEN `artifacts/report_20261002T101500Z.md` with frontmatter `sources: [sources/import/missing.md@## Intro]` and no such file
- WHEN `validateWorkspaceSources` runs
- THEN a `KU_DANGLING_FILE` error is reported for the artifact

#### Scenario: Console meta citation validated
- GIVEN a console whose `innfo-model.meta.sources` cites a missing heading
- WHEN `validateWorkspaceSources` runs
- THEN an anchor-resolution diagnostic is reported

## ADDED Requirements

### Requirement: JSON Pointer is a unit kind

For `.json` targets the portion after `@` MUST be a JSON Pointer (RFC 6901): empty or beginning with `/`, with `~0` and `~1` escapes. For `json-pointer` units the character `&` MUST NOT be a subunit separator; the whole anchor is the pointer. A pointer MUST resolve only when it addresses an existing value in the parsed document; the array end marker `-` and indexes with leading zeros MUST NOT resolve. An unresolved pointer MUST yield an anchor-resolution diagnostic. A pointer on a non-`.json` target MUST be a malformed-citation diagnostic.

#### Scenario: Resolves
- GIVEN `{"items":[{"name":"a"}]}` at `sources/import/d.json`
- WHEN `sources/import/d.json@/items/0/name` is validated
- THEN it resolves

#### Scenario: Escapes
- GIVEN a key `a/b` and a key `m~n`
- WHEN the pointers `/a~1b` and `/m~0n` are validated
- THEN both resolve

#### Scenario: Ampersand is part of the pointer
- GIVEN a key `R&D`
- WHEN `sources/import/d.json@/R&D` is validated
- THEN it resolves and no subunit is parsed

#### Scenario: Missing and past-end pointers
- GIVEN an array with two items
- WHEN `@/items/2` and `@/items/-` are validated
- THEN each yields an anchor-resolution diagnostic

#### Scenario: Pointer on a markdown file
- GIVEN `sources/import/a.md@/items/0`
- WHEN validated
- THEN a malformed-citation diagnostic is reported
