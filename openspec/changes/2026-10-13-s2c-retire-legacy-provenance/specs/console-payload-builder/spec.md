# Delta for console-payload-builder

## MODIFIED Requirements

### Requirement: Payload Meta

`meta` MUST carry `modelId`, `title`, `modelVersion`, `sha256` and `generated`.
`meta.feedbackState` MUST NOT be emitted. `modelId` MUST be the domaiNN-relative POSIX
path minus the `_NN.md`/`.md` suffix and MUST survive a version bump. `sha256` MUST be
the portable sha256 of the raw source content. Review state (reviewed / stale) MUST be
derived by the runtime from the `changes` collection and each draft's `base_hash`, not
from a ledger. (Previously: `meta.feedbackState` was required, read from
`feedback-ledger.jsonl`.)

#### Scenario: No feedbackState in meta
- GIVEN a built console payload
- WHEN `meta` is read
- THEN it has no `feedbackState` property
- AND `element.history` still lists the applied changes
