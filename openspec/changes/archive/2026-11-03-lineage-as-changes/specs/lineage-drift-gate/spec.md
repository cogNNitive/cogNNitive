# lineage-drift-gate Specification (delta: capability removed)

## REMOVED Requirements

### Requirement: Managed sections must equal a fresh projection
(Reason: the managed sections and the `LINEAGE_DRIFT` gate are deleted with the record. Drift is now "replaying the applied changes does not reproduce the file".)
(Migration: none — legacy out of scope. Replaced by `EDITED_WITHOUT_RECORD` and `UNIT_WITHOUT_RECORD` in `change-provenance`.)

### Requirement: Only managed sections are compared
(Reason: there are no managed sections. The drift fold compares knowledge units, with explicit side-effect rules.)
(Migration: none — legacy out of scope. See "Drift means the replay does not reproduce the file" in `change-provenance`.)

### Requirement: Three run sites
(Reason: the sites were `lineage-drift-guard.js` in `verify.js`, `lineage-check.js` and `check_domain.lineage`. The guard step, its fixture and the `lineage` field are deleted.)
(Migration: none — legacy out of scope. Drift runs in `validate_knowledge` and `check_domain` (`provenance` field), with a strict full-replay mode for CI.)

### Requirement: The gate is read-only and tolerates absence
(Reason: no gate over a record exists. The replacement diagnostics are read-only and omitted when no changeset context is available.)
(Migration: none — legacy out of scope.)

### Requirement: Comparison is deterministic across platforms
(Reason: determinism now comes from the shared comparator over changes and the canonical typed comparison of units, not from normalizing record text.)
(Migration: none — legacy out of scope. See "One shared deterministic comparator" in `change-provenance`.)
