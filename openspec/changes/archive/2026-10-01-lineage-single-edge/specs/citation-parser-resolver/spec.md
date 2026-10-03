# Citation Parser and Resolver (Delta, new capability + deltas to document-citations, citation-source-resolution)

## Purpose

One citation parser and one filesystem source resolver, both exported by innfo-core. No consumer re-implements them.

## ADDED Requirements

### Requirement: innfo-core exports one `parseCitation`

innfo-core MUST export a single `parseCitation(value)` that returns a structured citation (`path`, `anchor`, `subunit?`, `kind`) for the canonical `@` grammar (markdown heading anchors and CSV `RowID&col`). It MUST replace the `parseKnowledgeUnitRef ?? parseSourceRef` pair as the consumer-facing entry point. No consumer outside innfo-core MAY implement its own citation parsing.

#### Scenario: Markdown heading citation
- GIVEN the value `sources/nn/interview.md@## Clients`
- WHEN `parseCitation` runs
- THEN it returns path `sources/nn/interview.md` and heading anchor `Clients`

#### Scenario: CSV citation
- GIVEN the value `sources/nn/prices.csv@R12&price`
- WHEN `parseCitation` runs
- THEN it returns path `sources/nn/prices.csv`, row `R12`, subunit `price`

#### Scenario: Bare path is a file-level citation
- GIVEN the value `kNNowledge/Client_NN.md`
- WHEN `parseCitation` runs
- THEN it returns the path with no unit anchor and no `KU_DEPRECATED_HASH` warning

#### Scenario: Malformed citation
- GIVEN the value `sources/nn/a.md@L10-L20` (line range)
- WHEN `parseCitation` runs
- THEN it returns a failure result and does not throw

### Requirement: One filesystem source resolver

innfo-core MUST provide exactly one filesystem source resolver (`console/fs-source-resolver.ts` `createFsSourceResolver`). `innfo-mcp`'s `createWorkspaceSourceResolver` (`innfo-mcp/src/tools/validate.ts`) MUST be removed, and MCP `validate` and `resolve_sources` MUST use the core resolver. MCP `resolve_sources` output shape and behavior MUST be unchanged.

#### Scenario: MCP uses the core resolver
- GIVEN the repository after this change
- WHEN `createWorkspaceSourceResolver` is searched
- THEN no definition or reference exists

#### Scenario: `resolve_sources` behavior unchanged
- GIVEN a citation `sources/nn/interview.md@## Clients` over an existing file
- WHEN `resolve_sources` is called
- THEN the result matches the shape defined in `citation-source-resolution` (`path`, `anchor`, `exists`, `field`, `origin`, ...)

### Requirement: `#slug` is a legacy read path inside innfo-core only

innfo-core MAY parse `path#slug` citations solely to keep write-once specs and frozen samples readable. Each such parse MUST emit the `KU_DEPRECATED_HASH` warning. `#slug` citations MUST NOT be written by any producer, and no consumer outside innfo-core MAY parse them. The read path MUST carry a `legacy:lineage-single-edge/<id>` marker and a `legacy-ledger.yaml` entry with a removal condition.

#### Scenario: Legacy slug is readable with a warning
- GIVEN a frozen sample with `sources:: sources/nn/a.md#intro`
- WHEN `validateWorkspaceSources` runs
- THEN the reference resolves and a `KU_DEPRECATED_HASH` warning is reported

#### Scenario: Producers never emit `#slug`
- GIVEN any producer (console procedure, nn-trannsform, editor mutation)
- WHEN it writes a citation
- THEN the written value uses `@` grammar

#### Scenario: Ledger guard
- GIVEN the legacy read path in innfo-core
- WHEN `node scripts/lib/legacy-ledger-guard.js` runs
- THEN every `legacy:lineage-single-edge/*` marker has exactly one ledger entry and vice versa

### Requirement: `kNNowledge/` is the only model path prefix

`resolveUnitPath` MUST accept `sources/nn/`, `sources/export/`, and `kNNowledge/` only, and MUST reject `models/`. The validator MUST report a dedicated `KU_MALFORMED` message for `models/` stating that it was removed and `kNNowledge/` must be used.

#### Scenario: `kNNowledge/` resolves
- GIVEN `kNNowledge/Client_NN.md@## NN Stakeholders: Enterprise Clients`
- WHEN `resolveUnitPath` runs
- THEN it resolves to that file

#### Scenario: `models/` is rejected
- GIVEN `models/Client_NN.md@## NN Stakeholders: Enterprise Clients`
- WHEN `resolveUnitPath` runs
- THEN it does not resolve and the validator reports a diagnostic for the unsupported prefix

### Requirement: Artifact frontmatter and console meta citations are validated

`validateWorkspaceSources` MUST validate citations found in markdown artifact frontmatter `sources:` and in console `innfo-model.meta.sources`, with the same diagnostics as kNNowledge body `sources::`.

#### Scenario: Dangling artifact citation
- GIVEN `export/report.md` with frontmatter `sources: [sources/nn/missing.md@## Intro]` and no such file
- WHEN `validateWorkspaceSources` runs
- THEN a `KU_DANGLING_FILE` error is reported for the artifact

#### Scenario: Console meta citation validated
- GIVEN a console whose `innfo-model.meta.sources` cites a heading that does not exist
- WHEN `validateWorkspaceSources` runs
- THEN an anchor-resolution diagnostic is reported

### Requirement: Lineage projection is an innfo-core export

innfo-core MUST export the lineage projection function (parsed workspace to record view sections) as public API with unit tests. Relative imports MUST carry `.js` (NodeNext).

#### Scenario: Projection export is importable from Node ESM
- GIVEN the built innfo-core package
- WHEN a Node ESM script imports the projection from the package entry
- THEN the import succeeds

