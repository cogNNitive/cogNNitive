# Delta for workspace-sources-resolution

Scope: source visibility is the union of the referring document's own scope and its
ancestor scopes, bounded by `isolate` and the domaiNN root.

## MODIFIED Requirements

### Requirement: Dynamic Source Root Resolution for Nested Workspaces

When validating a citation in a document, the resolver MUST resolve the workspace-relative
path against the `sources/` directories of the scopes in the document's chain, nearest
scope first, and MUST accept the first one in which the cited file exists. The chain is
bounded by the domaiNN root and by any `isolate` scope; `sources/` directories of scopes
outside the chain, including sibling scopes, MUST NOT be consulted. A citation path MUST be
written in full from the scope root; the resolver MUST NOT add a default prefix.
(Previously: the resolver used only the nearest ancestor directory that contains a
`sources/` directory, falling back to the enclosing workspace root; a file missing from
that one directory was dangling even if an ancestor scope held it.)

#### Scenario: Nested document resolves a local sub-workspace source

- GIVEN `subproject/kNNowledge/Finance_business_NN.md` declaring `sources:: sources/import/budget.md@## Intro`
- AND the file `subproject/sources/import/budget.md` exists with that heading
- WHEN `validateWorkspaceSources` runs with a disk-backed resolver
- THEN the citation resolves to `subproject/sources/import/budget.md` without `KU_DANGLING_FILE`

#### Scenario: Nested document falls back to the root workspace

- GIVEN `subproject/kNNowledge/Finance_business_NN.md` with no `subproject/sources/` directory
- AND `sources/import/shared_policy.md` at the root
- AND the document declares `sources:: sources/import/shared_policy.md@## Overview`
- WHEN `validateWorkspaceSources` runs
- THEN the citation resolves to the root file without `KU_DANGLING_FILE`

#### Scenario: Nearer scope has sources but not the file

- GIVEN a document in scope `alpha`, `alpha/sources/import/other.md`, and `sources/import/shared_policy.md` at the root
- AND the document cites `sources/import/shared_policy.md@## Overview`
- WHEN `validateWorkspaceSources` runs
- THEN the citation resolves to the root file without `KU_DANGLING_FILE`

#### Scenario: Nearest copy wins

- GIVEN `sources/import/policy.md` at the root and `alpha/sources/import/policy.md` in scope `alpha`
- AND a document in `alpha` cites `sources/import/policy.md@## Overview`
- WHEN `validateWorkspaceSources` runs
- THEN the citation resolves to `alpha/sources/import/policy.md`

#### Scenario: Isolate bounds visibility

- GIVEN scope `legacy` with `isolate: true` and `sources/import/shared_policy.md` only at the domaiNN root
- AND a document in `legacy` cites `sources/import/shared_policy.md@## Overview`
- WHEN `validateWorkspaceSources` runs
- THEN `KU_DANGLING_FILE` is reported

#### Scenario: Sibling scope sources are invisible

- GIVEN `beta/sources/import/notes.md` and a document in sibling scope `alpha` citing `sources/import/notes.md@## Intro`
- WHEN `validateWorkspaceSources` runs
- THEN `KU_DANGLING_FILE` is reported

#### Scenario: No implicit prefix

- GIVEN a citation `budget.md@## Intro` and a file `sources/import/budget.md`
- WHEN `validateWorkspaceSources` runs
- THEN `KU_DANGLING_FILE` is reported because `budget.md` does not exist at any scope root in the chain

## Out of scope

Per-scope ingestion (a `sources/` scanner or `importRaw` writing into a sub-scope) is
deferred. See the proposal's Deferred table
(`openspec/changes/2026-10-28-contextual-resolution/proposal.md`).
