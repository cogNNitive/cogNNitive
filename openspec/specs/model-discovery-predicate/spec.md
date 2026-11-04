# Model Discovery Predicate Specification

## Purpose

The shared discoverable-model predicate becomes the contract predicate in `nn-naming-contract`, used by every consumer. It excludes sidecars.

## Requirements

### Requirement: Single Shared Discoverable-Model Predicate

`collectModels()` MUST call the one contract predicate (`isModelCandidate`), and `isReconcilableModel()` MUST keep only its manifest self-reference check on top of it. The predicate MUST require the `_NN.md` filename pattern, a role of `knowledge` (so sidecars, lineage records, and catalog documents are excluded), frontmatter indicating a model (`level: 3` and a resolvable `parent_spec`), and a path that is not excluded (`isExcludedPath`). `discoverModels.ts` MUST delete its local filename and non-knowledge regexes. No other module MAY define a filename pattern for `_NN.md`.

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

### Requirement: Discovered models are classified against declared placements

After discovery, each model MUST be classified as an instance model (its root concept is distributed) or a compact model, using the bluepriNNt declarations. Classification MUST NOT change which files discovery returns, and MUST NOT depend on the folder name. A discovered model that violates its declared placement MUST still be returned, carrying the classification and the placement finding.

#### Scenario: Instance model is classified
- GIVEN `series/villabotijos-today/assets/pepper-mapache/pepper-mapache_video-script_NN.md` with a Video root and `Video` declared distributed
- WHEN discovery and classification run
- THEN the model is returned as an instance model of concept `Video`

#### Scenario: Compact model is classified
- GIVEN `LC_programas_Tutorias_NN.md` whose concepts declare no storage
- WHEN discovery and classification run
- THEN it is returned as a compact model

#### Scenario: Misplaced instance is still returned
- GIVEN a Video instance model under `kNNowledge/`
- WHEN `list_knowledge` runs
- THEN it is listed and carries a placement finding

#### Scenario: Per-instance folder alone does not classify
- GIVEN a model in a folder of its own whose concept declares no storage
- WHEN classification runs
- THEN it is classified compact
