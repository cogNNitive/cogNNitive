# lineage-version-status Specification (delta: capability removed)

## REMOVED Requirements

### Requirement: `# NN Sources` lists every family member with version metadata
(Reason: there is no stored list. Version rank and `superseded_by` are computed from names by `familyOf`/`compareMembers`.)
(Migration: none — legacy out of scope. See "Source and model inventory" in `computed-lineage-view`.)

### Requirement: Family members are validated by `--check`
(Reason: with no list, an unlisted member or a dangling `superseded_by` cannot occur, so those checks are obsolete. `--check` is deleted from nn-sources. Sidecar sha, subject mismatch and orphaned sidecar checks are kept, decoupled from the record.)
(Migration: none — legacy out of scope. See "Integrity diagnostics survive without a record" in `computed-lineage-view`.)

### Requirement: New lineage records reference current spec versions
(Reason: no lineage record is created, and the `cogNNitive` bluepriNNt is removed.)
(Migration: none — legacy out of scope.)

### Requirement: Workspace-Conforming Lineage Records Are Excluded from Manifest Reconciliation
(Reason: the role `lineage-record` does not exist. A stray `*_cogNNitive_NN.md` falls to `knowledge`, and `workspace`-blueprint documents keep their existing non-navigation classification.)
(Migration: none — legacy out of scope.)
