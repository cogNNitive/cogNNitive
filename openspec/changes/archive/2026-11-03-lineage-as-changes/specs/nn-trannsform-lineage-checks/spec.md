# nn-trannsform-lineage-checks Specification (delta: capability removed)

## REMOVED Requirements

### Requirement: lineage-check delegates citation validation to innfo-core
(Reason: `lineage-check.js` loses its record checks (`--lineage --check` is deleted). Citation validation over the evidence of applied changes lives in innfo-core; sidecar sha, subject mismatch and orphaned sidecar checks are kept and surfaced by `check_domain` and preflight.)
(Migration: none — legacy out of scope. See `computed-lineage-view` and `change-provenance`.)

### Requirement: Legacy inference removed from generation
(Reason: there is no generation of a record, so there is nothing left to infer or remove.)
(Migration: none — legacy out of scope.)

### Requirement: Archive flow is removed from lineage checks
(Reason: lineage checks over a record no longer exist. Orphaned sidecars are still reported without moving, archiving or deleting anything.)
(Migration: none — legacy out of scope. See "Integrity diagnostics survive without a record" in `computed-lineage-view`.)

### Requirement: Automatic Impact Detection on Scan
(Reason: this requirement only delegated to `dynamic-sources-impact-check`, which remains the owner of scan-time impact detection. The checker is re-sourced from the evidence index and pinned by `evidence_sha256`, described in `computed-lineage-view`.)
(Migration: none. The behavior stays in `dynamic-sources-impact-check`; its fixtures must be rebuilt through changes.)
