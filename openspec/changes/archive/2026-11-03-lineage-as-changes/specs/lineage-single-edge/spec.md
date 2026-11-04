# lineage-single-edge Specification (delta: capability removed)

## REMOVED Requirements

### Requirement: Every derived file writes `sources` exactly once, inside itself
(Reason: files no longer declare upstream inside themselves. The single edge is the `evidence` of the change that set a value or produced an artifact.)
(Migration: none — legacy out of scope. See `artifact-production-change` and `change-provenance`.)

### Requirement: A bare path is a valid file-level citation
(Reason: the rule moves with the citation, which exists only as change evidence. A bare path remains a valid evidence entry and `parseCitation` still returns it as a file-level citation.)
(Migration: none — legacy out of scope. See `citation-parser-resolver`.)

### Requirement: CSV/JSON `sources` is optional
(Reason: CSV `sources` columns and JSON `sources` keys are no longer read as lineage.)
(Migration: none — legacy out of scope.)

### Requirement: Legacy edge mechanisms are removed
(Reason: superseded by a stricter rule: the only edge mechanism is change evidence, and `sources::` and `type:: citation` are banned in kNNowledge.)
(Migration: none — legacy out of scope. See "Citations exist only as change evidence" in `document-citations`.)

### Requirement: Node role derives from the naming contract
(Reason: restated without the record. Role comes from the naming contract; an artifact node is a timestamped family member or the target of `produce_artifact`; a changeset is a node with role `changeset`.)
(Migration: none — legacy out of scope. See "Artifact inventory and upstream" and "Changeset nodes and live edges" in `computed-lineage-view`.)

### Requirement: Terminal artifacts carry traceability as content or none
(Reason: every non-regenerable artifact now needs a `produce_artifact` record, or `ARTIFACT_WITHOUT_RECORD` fires. Regenerable views are exempt.)
(Migration: none — legacy out of scope. See `artifact-production-change`.)

### Requirement: Staleness uses existing mechanisms only
(Reason: carried over unchanged in substance to `computed-lineage-view`, with unit-level hops pinned by `evidence_sha256`.)
(Migration: none — legacy out of scope. See "Staleness uses existing mechanisms only" in `computed-lineage-view`.)
