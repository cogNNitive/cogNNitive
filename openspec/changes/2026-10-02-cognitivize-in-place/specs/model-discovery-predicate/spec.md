# Model Discovery Predicate (Delta)

## Purpose

The shared discoverable-model predicate becomes the contract predicate in `nn-naming-contract`, used by every consumer. It excludes sidecars.

## MODIFIED Requirements

### Requirement: Single Shared Discoverable-Model Predicate

`collectModels()` MUST call the one contract predicate (`isModelCandidate`), and `isReconcilableModel()` MUST keep only its manifest self-reference check on top of it. The predicate MUST require the `_NN.md` filename pattern, a role of `knowledge` (so sidecars, lineage records, and catalog documents are excluded), frontmatter indicating a model (`level: 3` and a resolvable `parent_spec`), and a path that is not excluded (`isExcludedPath`). `discoverModels.ts` MUST delete its local filename and non-knowledge regexes. No other module MAY define a filename pattern for `_NN.md`.
(Previously: required `NN_FILENAME_RE` and the frontmatter test; sidecars did not exist and `NON_KNOWLEDGE_SPEC_RE` lived in `discoverModels.ts`.)

#### Scenario: Non-NN markdown file excluded
- GIVEN a `README.md`
- WHEN the predicate evaluates it
- THEN it is excluded

#### Scenario: NN-suffixed model file included
- GIVEN `kNNowledge/Client_business_NN.md` with `level: 3` and a resolvable `parent_spec`
- WHEN the predicate evaluates it
- THEN it is included

#### Scenario: NN-suffixed non-model file excluded
- GIVEN an `_NN.md` file with mismatched `level` or `parent_spec`
- WHEN the predicate evaluates it
- THEN it is excluded

#### Scenario: Sidecar excluded
- GIVEN `sources/import/report.pdf_sidecar_NN.md` with `level: 3` and a resolvable `parent_spec`
- WHEN the predicate evaluates it
- THEN it is excluded

### Requirement: list_models Honors root and Returns Only Discoverable Models

`list_models` and the MCP `list_knowledge` tool MUST return only files satisfying the contract predicate, honor an explicit `root`, and MUST NOT return READMEs, CHANGELOGs, fixtures, openspec proposal files, or sidecars.
(Previously: did not mention `list_knowledge` or sidecars.)

#### Scenario: Monorepo-root scan excludes irrelevant files
- GIVEN `list_models` called with `root` at the monorepo root
- WHEN the scan runs
- THEN only files matching the predicate are returned

#### Scenario: Explicit root scope still honored
- GIVEN a narrower `root`
- WHEN the scan runs
- THEN only discoverable models under it are returned

#### Scenario: Sidecars absent from MCP listing
- GIVEN a workspace containing sidecars
- WHEN `list_knowledge` runs
- THEN no sidecar is listed
