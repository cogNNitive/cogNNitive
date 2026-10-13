# Delta for console-payload-builder

## MODIFIED Requirements

### Requirement: Payload Meta

`meta` MUST carry `modelId`, `title`, `modelVersion`, `sha256` and `generated`, in both the CLI and the procedure path. `modelId` MUST be the domaiNN-relative POSIX path minus the `_NN.md`/`.md` suffix and MUST survive a version bump. `modelVersion` MUST be the model's real `knowledge_version`. `sha256` MUST be the portable sha256 of the raw source content. `meta` MUST NOT carry review verdicts: review state is derived by the runtime from `element.history` and the domain `changes` collection. (Previously: `meta.feedbackState` was required, read from `feedback-ledger.jsonl`.)

#### Scenario: Both paths emit full meta
- GIVEN a console built by the CLI and one built by the procedure
- WHEN their `meta` is read
- THEN both carry `modelId`, `modelVersion`, `sha256` and `generated`
- AND neither carries `feedbackState`

#### Scenario: Id survives version bump
- GIVEN a model built at `V_1-0-0` and again at `V_1-0-1`
- WHEN both payloads are built
- THEN `meta.modelId` is identical
