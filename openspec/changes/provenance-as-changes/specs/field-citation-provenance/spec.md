# field-citation-provenance Specification

## MODIFIED Requirements

### Requirement: Field Citation Provenance Rewriting on Mutation (D20)

The apply engine MUST NOT rewrite any companion citation on a model field. `update_field` and `add_element` MUST leave the element's citations untouched; a knowledge unit MUST NOT carry a citation that points at a change. The change's `evidence` is the sole provenance of the mutation, and a field's origin is derived from the change chain by `target`.

(Previously: `update_field`/`add_element` wrote the companion `<field>_source` citation so it cited the applied change, and listed it in the element's `sources::`.)

#### Scenario: No companion citation is written
- GIVEN an element `Vision` with field `statement`
- WHEN a changeset change `c-01` mutates `statement`
- THEN the element gains no `statement_source` citation
- AND the element's `sources::` is unchanged

### Requirement: Bidirectional Auditability and Lineage Walk

Historical lineage MUST be derived from the change chain alone: for a `target`, the changes are ordered by `applied_at` and their `from`/`to` reconstruct the value timeline; each hop's origin is its `author` and `evidence`. `replaced_sources` MUST NOT exist and MUST NOT be required to walk history. No model snapshot is consulted.

(Previously: the walk continued through `replaced_sources` from a field's current citation to earlier changes or a Source.)

#### Scenario: History walks the ordered chain
- GIVEN changes `c1`, `c2`, `c4` targeting `pricing@sku-42&precio`, applied in that order
- WHEN the field's history is inspected
- THEN the walk visits `c1`, `c2`, `c4` by `applied_at` and ends at the earliest change's evidence
- AND no `replaced_sources` is read
- AND no file under `kNNowledge/archive/` is read

## REMOVED Requirements

### Requirement: Replaced Sources Annotation

(Removed: the per-change `replaced_sources::` execution annotation. The previous origin is recoverable from the ordered change chain; the annotation is redundant.)
