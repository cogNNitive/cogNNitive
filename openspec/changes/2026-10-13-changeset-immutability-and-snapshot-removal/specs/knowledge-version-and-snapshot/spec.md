# Delta for knowledge-version-and-snapshot

## REMOVED Requirements

### Requirement: Snapshot Archival to `kNNowledge/archive/`

**Reason**: Nothing reads the snapshot: `kNNowledge/archive/` appears only in path-exclusion lists. The prior field origin it was meant to keep is now recorded in the changeset chain (`replaced_sources::`, `field-citation-provenance`), and git keeps the file history.

**Migration**: None. Live model writes stay atomic (staging `.tmp` + rename). Existing `kNNowledge/archive/` folders in test domains are inert and excluded; they may be deleted by hand.

## MODIFIED Requirements

### Requirement: Deep `archive` Directory Exclusion

The path exclusion checker `isExcludedPath` in `innfo-core/src/naming/contract.ts` MUST inspect all path segments and return `true` if any segment equals `'archive'` or `'staging'`. Any directory named `archive` at any nesting depth (e.g. `sources/archive/`, `deeply/nested/archive/`) MUST be completely excluded from:
- Semantic model discovery (`findKnowledgeFiles`)
- Workspace graph indexing
- Active knowledge validation
- Document catalogs

No tool writes into an `archive` directory; the exclusion keeps hand-kept or historical folders such as `sources/archive/` invisible. (Previously: the exclusion was justified by the apply engine's `kNNowledge/archive/` snapshots.)

#### Scenario: Deep archive paths excluded at any depth
- GIVEN paths:
  - `kNNowledge/archive/sales_V_0-1-0_20261007T120005Z_changes_NN.md`
  - `sources/archive/legacy_data.csv`
  - `workspace/subfolder/archive/notes_NN.md`
- WHEN `isExcludedPath` evaluates each path
- THEN it returns `true` for all of them

#### Scenario: Hand-kept archive is not discovered as live knowledge
- GIVEN a model file under `sources/archive/`
- WHEN workspace knowledge discovery runs
- THEN the file is ignored and omitted from candidate models
