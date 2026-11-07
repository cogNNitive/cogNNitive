# external-watch-roots Delta Spec

## REMOVED Requirements

### Requirement: On-demand scan classifies external changes
**Reason**: External Watch Roots are replaced by Synchronization (see `synchronization-concept` and `synchronization-landing`). Refresh is explicit and mirrors files instead of classifying them.
**Migration**: None. No shipped domaiNN declares the block.

### Requirement: Watch roots are read-only and imports are write-once
**Reason**: Replaced by `synchronization-landing` (read-only origin, write-once copies).
**Migration**: None.

### Requirement: Session-start digest is read-only and decision-gated
**Reason**: The digest and its decision cache are deleted; refresh happens only on explicit demand.
**Migration**: None.

### Requirement: The router can detect declared watch roots
**Reason**: The `watch_roots` probe key is deleted (see `synchronization-legacy-removal`).
**Migration**: None.

### Requirement: Watch roots are declared in the domaiNN entrypoint
**Reason**: Origins are declared as Synchronization elements in the sources model.
**Migration**: None. A leftover block raises a validation error that points to Synchronization.
