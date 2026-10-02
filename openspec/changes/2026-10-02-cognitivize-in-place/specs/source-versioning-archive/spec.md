# Source Versioning Archive (Delta: capability removed)

## Purpose

`sources/archive/` existed because a raw file at a stable path was mutable. Under write-once families every version has its own immutable path and co-located sidecar, so the archive disappears. The V-chain becomes the family ordered by name (see `nn-naming-contract`, `write-once-artifacts`, `lineage-version-status`).

## REMOVED Requirements

### Requirement: Snapshot-on-change preserves the previous normalized version
(Reason: a changed source now becomes a new suffixed family member; the previous member is never overwritten, so no snapshot is needed.)
(Migration: the nn-upgrade rewriter reports existing `sources/archive/` content and never deletes it without consent; see `workspace-template-upgrade`.)

### Requirement: Snapshots are hash-idempotent
(Reason: replaced by generic dedup against the latest family member in `write-once-artifacts`.)
(Migration: none.)

### Requirement: `sources/archive/` is excluded from every walk
(Reason: the folder is no longer part of the layout; the runtime does not resolve it.)
(Migration: none; the legacy detector is the only code that mentions it, under a `legacy:cognitivize-in-place/*` marker.)

### Requirement: Orphaned sources are archived only with explicit consent
(Reason: archive-and-delete of orphans is replaced by the consent-gated GC planner and by orphan-sidecar reporting in `generic-source-integrity-audit`.)
(Migration: orphan sidecars are reported; deletion only through the GC apply step with user consent.)
