# Delta for changeset-apply-engine

## ADDED Requirements

### Requirement: Proposal-time evidence citation

At intake, after the proposal is sealed or its seal verified and before Phase 1, the apply engine MUST resolve the `sources` citation of every change with the workspace citation resolver (resolved against the domain root, so `sources/`, `kNNowledge/` and `changes/` targets are all valid). If any citation does not resolve to an existing file and anchor, the engine MUST reject the whole changeset with `CITATION_UNRESOLVED`, listing each offending change id and citation; it MUST release the lock and write nothing. The engine MUST NOT add, remove or rewrite a change's `sources::` line at any point; the D20 citation rewrite applies to model fields only.

#### Scenario: An unresolvable citation rejects the changeset
- GIVEN a changeset whose change `c-02` has `sources:: sources/import/missing.md@## Needs`
- WHEN `apply_change` runs
- THEN it fails with `CITATION_UNRESOLVED` naming `c-02` and the citation
- AND no model, changeset or temporary file is written
- AND `changes/.lock` is released

#### Scenario: A resolving citation is left untouched
- GIVEN a changeset whose change `c-01` has `sources:: sources/import/dataset.csv@m-001` and the row exists
- WHEN `apply_change` applies it
- THEN the change applies
- AND the `sources::` line of `c-01` in the written-back changeset is byte-identical to the input
