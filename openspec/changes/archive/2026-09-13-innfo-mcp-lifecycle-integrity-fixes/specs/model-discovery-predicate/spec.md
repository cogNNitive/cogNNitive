# Model Discovery Predicate Specification

## Purpose

`innfo-core` had two independent, divergent predicates deciding what counts
as a discoverable iNNfo model: `collectModels()` in `helpers.ts` (extension +
ignored-directory filter only) and `isReconcilableModel()` in
`workspace/discoverModels.ts` (filename pattern + frontmatter filter). This
spec establishes ONE shared predicate used by both call sites.

## Requirements

### Requirement: Single Shared Discoverable-Model Predicate

`collectModels()` and `isReconcilableModel()` MUST share one predicate
function deciding whether a file is a discoverable iNNfo model. The predicate
MUST require the `_NN.md` filename suffix (`NN_FILENAME_RE`) and MUST require
the parsed frontmatter to indicate a model document (`level: 3` and a
resolvable `parent_spec`), not merely an ignored-directory-and-extension
filter.

#### Scenario: Non-NN markdown file excluded

- GIVEN a `.md` file that does not match `NN_FILENAME_RE` (e.g. a `README.md`)
- WHEN the shared predicate evaluates it
- THEN the file is excluded from discovery

#### Scenario: NN-suffixed model file included

- GIVEN a file matching `NN_FILENAME_RE` with `level: 3` and a resolvable `parent_spec`
- WHEN the shared predicate evaluates it
- THEN the file is included as a discoverable model

#### Scenario: NN-suffixed non-model file excluded

- GIVEN a file matching `NN_FILENAME_RE` but whose frontmatter is not a model (missing/mismatched `level` or `parent_spec`)
- WHEN the shared predicate evaluates it
- THEN the file is excluded from discovery

### Requirement: list_models Honors root and Returns Only Discoverable Models

`list_models` called with `root` at the monorepo root MUST return only files
satisfying the shared discoverable-model predicate. It MUST NOT return
READMEs, CHANGELOGs, fixtures, or openspec proposal files, and MUST continue
to honor an explicit `root` scope as before.

#### Scenario: Monorepo-root scan excludes irrelevant files

- GIVEN `list_models` is called with `root` set to the monorepo root
- WHEN the scan runs
- THEN only `_NN.md` model files matching the shared predicate are returned
- AND no READMEs, CHANGELOGs, fixtures, or openspec proposals appear in the result

#### Scenario: Explicit root scope still honored

- GIVEN `list_models` is called with a `root` narrower than the monorepo root
- WHEN the scan runs
- THEN only discoverable models under that `root` are returned
