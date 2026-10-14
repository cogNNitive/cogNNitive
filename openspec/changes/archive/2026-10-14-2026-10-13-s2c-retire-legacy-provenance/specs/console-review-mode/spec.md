# Delta for console-review-mode

## MODIFIED Requirements

### Requirement: Verdict Badges

Elements targeted by changeset changes MUST show a kit `StatusBadge` per change status, with count: `applied` and `conflict` derived from `element.history` (applied and partially applied changesets), and `proposed` derived from the proposed changesets of the domain payload's `changes` collection. Badges MUST derive only from changesets, never from local drafts, and MUST be visible with review mode off. Entries whose element no longer exists MUST NOT render. Statuses MUST NOT be settable from the console. No other verdict state exists: `pending`, `rejected` and `stale` reviewer verdicts are retired with the verdict ledger, and per-draft staleness is shown on the draft ("target changed"), not as a badge. (Previously: badges were derived from `meta.feedbackState`, read from the verdict ledger.)

#### Scenario: Applied badge
- GIVEN `element.history` lists one applied change targeting an element
- WHEN rendered
- THEN that element shows an `applied` StatusBadge with count 1

#### Scenario: Proposed badge
- GIVEN a proposed changeset in the payload `changes` collection with a change targeting an element
- WHEN rendered
- THEN that element shows a `proposed` StatusBadge

#### Scenario: Draft is not a status
- GIVEN a local draft and no changeset targeting the element
- WHEN rendered
- THEN no status badge appears

#### Scenario: Orphan entry
- GIVEN a change targeting a missing element
- WHEN rendered
- THEN nothing is rendered for it and no error is thrown

#### Scenario: Badges in a scoped console
- GIVEN an applied change targeting an element, rendered in a whole-domaiNN console and in a console scoped to its model
- WHEN badges render
- THEN both consoles show the same `applied` StatusBadge for that element
