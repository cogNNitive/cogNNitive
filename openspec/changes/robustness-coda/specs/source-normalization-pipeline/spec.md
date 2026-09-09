# Delta for source-normalization-pipeline

## MODIFIED Requirements

### Requirement: Doubtful-Pair Review Queue

Every doubtful or unmatched pair MUST enter a review queue. Reviewers confirm or reject each queued pair through the recorded confirm path, and no source SHALL be dropped without a recorded decision. Undecided pairs MUST remain queued across sessions; cross-session persistence stays caller-owned and no store is added by this change.

(Previously: confirm path was covered but not pinned, and caller-owned persistence was unstated.)

#### Scenario: Reviewer confirms a doubtful pair

- GIVEN doubtful pairs waiting in the queue
- WHEN a reviewer confirms one
- THEN the link is recorded together with the decision

#### Scenario: Reviewer rejects a doubtful pair

- GIVEN a doubtful pair waiting in the queue
- WHEN a reviewer rejects it
- THEN the rejection is recorded together with the decision
- AND the source is marked decided, never silently dropped

#### Scenario: Undecided pairs stay queued

- GIVEN a review session ending with pairs undecided
- WHEN the queue is inspected
- THEN undecided pairs remain queued
- AND none are treated as excluded
