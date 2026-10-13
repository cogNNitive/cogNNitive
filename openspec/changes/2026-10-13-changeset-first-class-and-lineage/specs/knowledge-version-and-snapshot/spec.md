# Delta for knowledge-version-and-snapshot

## REMOVED Requirements

### Requirement: Snapshot Archival to `kNNowledge/archive/`

**Reason**: The snapshot is dead weight. A full copy of the prior model was written to
`kNNowledge/archive/` on every applying changeset, but nothing in the codebase reads it:
it appears only in path-exclusion lists. The claim that earlier field origins "live in
the archived snapshot" is recoverable by a human reading the file but is not available to
any tool. With the changeset chain (each change records `from` → `to`) plus git, a
per-apply model snapshot is redundant.

**Migration**: None. Live model writes remain atomic (staging `.tmp` + rename). Existing
`kNNowledge/archive/` directories in throwaway test domains may be deleted; the deep
`archive`/`staging` exclusion in `isExcludedPath` STAYS (still required for
`sources/archive/`).

#### Scenario: Applying a changeset writes no snapshot
- GIVEN a domain with no `kNNowledge/archive/` directory
- WHEN a changeset mutating a model is applied
- THEN no file is created under `kNNowledge/archive/`
- AND the mutated model is written at its invariant `kNNowledge/<stem>_NN.md` path

#### Scenario: Deep archive exclusion is unaffected
- GIVEN `sources/archive/legacy_data.csv`
- WHEN `isExcludedPath` evaluates it
- THEN it returns `true`
