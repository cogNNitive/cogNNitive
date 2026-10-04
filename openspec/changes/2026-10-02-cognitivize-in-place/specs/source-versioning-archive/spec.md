# Source Versioning Archive (Delta: capability removed)

## Purpose

`sources/archive/` existed because a raw file at a stable path was mutable. Under write-once families every version has its own immutable path and co-located sidecar, so the archive disappears. The V-chain becomes the family ordered by name (see `nn-naming-contract`, `write-once-artifacts`, `lineage-version-status`).

## REMOVED Requirements

### Requirement: Snapshot-on-change preserves the previous normalized version
(Reason: a changed source now becomes a new suffixed family member; the previous member is never overwritten, so no snapshot is needed.)
(Migration: the nn-upgrade rewriter leaves existing `sources/archive/` content in place, reports it and the citations into it, and never deletes it; see `workspace-template-upgrade`.)

### Requirement: Snapshots are hash-idempotent
(Reason: replaced by generic dedup against the latest family member in `write-once-artifacts`.)
(Migration: none.)

### Requirement: `sources/archive/` is excluded from every walk
(Reason: the folder is no longer part of the layout; no ingest or projection code walks it. Existing snapshots are inert files excluded from the family version chain, and a citation into one still resolves as a plain path.)
(Migration: none; the legacy detector is the only code that mentions the folder, under a `legacy:cognitivize-in-place/*` marker, and the migration report warns about every citation that targets it; see `workspace-template-upgrade`.)

### Requirement: Orphaned sources are archived only with explicit consent
(Reason: archive-and-delete of orphans is replaced by the consent-gated GC planner and by orphan-sidecar reporting in `generic-source-integrity-audit`.)
(Migration: orphan sidecars are reported; deletion only through the GC apply step with user consent.)
