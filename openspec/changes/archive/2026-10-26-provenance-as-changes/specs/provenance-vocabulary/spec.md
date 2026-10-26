# provenance-vocabulary Specification

## MODIFIED Requirements

### Requirement: Documentation uses only Source / Citation / Lineage

The provenance feature area MUST keep exactly three nouns — **Source**, **Citation**, **Lineage** — plus the change-level field name **`evidence`**. A change's justification field MUST be named `evidence` (not `sources`). Documentation, skill prose and every user-facing console string MUST describe the pipeline with these terms and MUST NOT reintroduce `sources` as the change's field name, nor `replaced_sources`, `provenance` as a standalone concept, `traceability`, `grounding`, or `3-tier lineage`.

(Previously: the change's field was named `sources`, shared with the reserved kNNowledge `sources::` property.)

#### Scenario: Change field is named evidence
- GIVEN the `changes` blueprint and the change parser
- WHEN the change's justification field is read
- THEN it is named `evidence`

#### Scenario: Retired term absent
- GIVEN the repository after this change
- WHEN searched for `replaced_sources`
- THEN hits exist only in archived changes and permanent history
