# lineage-record-sync Specification (delta: capability removed)

## REMOVED Requirements

### Requirement: View sections come from one innfo-core projection
(Reason: there is no persisted record to render sections into. The projection survives as the computed view `projectLineage`.)
(Migration: none — legacy out of scope. Behavior moves to `computed-lineage-view`.)

### Requirement: The record is a single living `_cogNNitive_NN.md` file
(Reason: the persisted lineage record and the role `lineage-record` are deleted; provenance is the changeset chain.)
(Migration: none — legacy out of scope. A stray `*_cogNNitive_NN.md` is classified as `knowledge`.)

### Requirement: Consoles and artifacts appear with real upstream lineage
(Reason: upstream is no longer read from artifact-declared `sources` or console `meta.sources`. Artifact upstream is the evidence of `produce_artifact`; consoles are regenerable views without an upstream edge.)
(Migration: none — legacy out of scope. Behavior moves to `computed-lineage-view` and `artifact-production-change`.)

### Requirement: View fields are typed `citation`
(Reason: no record view fields exist, and `citation` exists only as change `evidence`.)
(Migration: none — legacy out of scope.)

### Requirement: Hand-authored blocks pass through
(Reason: no tool regenerates a record. The one hand-authored block that mattered, `## NN External Watch Roots:`, moves to the domaiNN entrypoint.)
(Migration: none — legacy out of scope. See `external-watch-roots`.)

### Requirement: Procedure runs are appended under Procedures, never replaced
(Reason: the run journal is dropped. Artifact-producing runs are recorded as `produce_artifact` changes. Journal entries for scripted scan, cognitivize and import runs are dropped on purpose: sidecar `normalized_at`/`normalized_by` and git record the same facts.)
(Migration: none — legacy out of scope. See `artifact-production-change`.)
