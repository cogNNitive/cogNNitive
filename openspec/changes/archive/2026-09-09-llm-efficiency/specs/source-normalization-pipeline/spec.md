# Delta for Source Normalization Pipeline

## ADDED Requirements

### Requirement: Scored Source-to-Element Matching

Normalized sources MUST be matched to model elements with a recorded score per
pair. Pairs at or above the match threshold link automatically; pairs below it
MUST NOT link silently. Scoring MUST run outside the hot reasoning loop, so
reviewer attention is spent on doubtful pairs only.

#### Scenario: Confident pairs link automatically

- GIVEN normalized sources and model elements
- WHEN scoring completes
- THEN each pair carries a recorded score
- AND pairs at or above threshold link automatically

#### Scenario: Unmatched source is queued, never dropped

- GIVEN a source scoring below threshold for every element
- WHEN matching completes
- THEN the source is queued for review
- AND it is NOT silently excluded

### Requirement: Doubtful-Pair Review Queue

Every doubtful or unmatched pair MUST enter a review queue. Reviewers confirm
or reject each queued pair, and no source SHALL be dropped without a recorded
decision. Undecided pairs remain queued across sessions.

#### Scenario: Reviewer confirms a doubtful pair

- GIVEN doubtful pairs waiting in the queue
- WHEN a reviewer confirms one
- THEN the link is recorded together with the decision

#### Scenario: Undecided pairs stay queued

- GIVEN a review session ending with pairs undecided
- WHEN the queue is inspected
- THEN undecided pairs remain queued
- AND none are treated as excluded
