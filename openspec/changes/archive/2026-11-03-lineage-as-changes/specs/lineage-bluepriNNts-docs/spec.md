# lineage-bluepriNNts-docs Specification (delta: capability removed)

## REMOVED Requirements

### Requirement: cogNNitive bluepriNNt matches the projection output
(Reason: the `cogNNitive` bluepriNNt described the record and is removed from the catalog, `manifest/source.yaml`, the canonical registry and `FROZEN_NAMES`. This is a `templates-v*` re-pin release event.)
(Migration: none — legacy out of scope. The published `cogNNitive_V_0-2-1_NN.md` is write-once and is not edited.)

### Requirement: domaiNN drops `kNNowledge.derived_from`
(Reason: already landed. The field no longer exists and no requirement is needed for the absence of a removed record field.)
(Migration: none — legacy out of scope.)

### Requirement: Artifacts catalog bluepriNNt is kept as a discovery index
(Reason: unrelated to the record and unaffected by this change. The artifacts catalog stays as shipped, without `sources` or `produced_by`.)
(Migration: none. No behavior changes; the catalog remains listed in `manifest/source.yaml` and the canonical registry.)

### Requirement: Documentation describes the shipped system
(Reason: the documented system changes. The documentation requirements are re-stated in `provenance-vocabulary`, and the rewrite is delivered in the docs slice of this change.)
(Migration: none — legacy out of scope. See `provenance-vocabulary`.)

### Requirement: Scope boundaries
(Reason: superseded by this change's scope: published `_V_x-y-z_` files are still never edited, but affected shipped samples are published as new versions and this change includes a `templates-v*` re-pin and a new L1 spec version.)
(Migration: none — legacy out of scope.)
