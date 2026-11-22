# Delta for changeset-atomicity

A changeset applies change by change: a conflicted change is skipped and the rest lands as `partially_applied`. That is the wrong shape for a batch that means one decision — a run start writes a model, its header and one row per step, and a half-written run is worse than no run. This change adds one generic primitive: a changeset may declare `atomic: true`, and then it applies wholly or not at all. It is not procedure-specific; any producer that needs all-or-nothing writes its own changesets with the same flag.

The declaration is part of the proposal, sealed into `proposal_sha`, so atomicity cannot be flipped after review without breaking the seal. The field is declared on the `changes` bluepriNNt and published in iNNfo.

## ADDED Requirements

### Requirement: A changeset may declare itself atomic

A changeset frontmatter MAY declare `atomic: true`, and the `changes` bluepriNNt MUST declare `atomic` as a boolean field of the `Change` concept.

A `atomic` value that is not a boolean MUST be reported as `CHANGESET_FRONTMATTER_INVALID` at parse time.
An absent or `false` value MUST keep the partial-apply behavior.

#### Scenario: An atomic changeset is declared
- GIVEN a changeset whose frontmatter declares `atomic: true`
- WHEN the changeset is parsed
- THEN its frontmatter carries `atomic: true`

#### Scenario: A non-boolean atomic value is rejected
- GIVEN a changeset whose frontmatter declares `atomic: "true"`
- WHEN the changeset is parsed
- THEN it is rejected with `CHANGESET_FRONTMATTER_INVALID` naming `atomic`

### Requirement: Atomicity is sealed into the proposal

The `proposal_sha` seal MUST cover the `atomic` declaration, and an explicit `atomic: false` MUST seal the same as an absent declaration.

A changeset sealed as non-atomic MUST NOT become atomic through an edit that leaves the seal unchanged.

#### Scenario: Flipping atomicity breaks the seal
- GIVEN a changeset sealed without `atomic`
- WHEN the frontmatter is edited to declare `atomic: true` and applied
- THEN the apply rejects it with `PROPOSAL_TAMPERED`

#### Scenario: Explicit false is not noise
- GIVEN two identical changes, one sealed with `atomic: false` and one sealed with no declaration
- WHEN both seals are computed
- THEN they are equal

### Requirement: An atomic changeset applies wholly or not at all

When an atomic changeset has at least one conflicted change, every change of the changeset MUST be recorded as `conflict`, no model write MUST occur, and the changeset status MUST be `conflict`.

The recorded reason MUST name `ATOMIC_CHANGESET_CONFLICT` and MUST name the original failure that conflicted the first change.
When an atomic changeset has no conflicted change, every change MUST apply and the changeset status MUST be `applied`.

#### Scenario: One conflicted change writes nothing
- GIVEN an atomic changeset with one change that applies and one whose `from` does not match
- WHEN the changeset is applied
- THEN no change of the changeset is written
- AND the changeset status is `conflict`
- AND every change's resolution names `ATOMIC_CHANGESET_CONFLICT` and the failed precondition

#### Scenario: An atomic changeset with no conflict applies
- GIVEN an atomic changeset whose every change can apply
- WHEN the changeset is applied
- THEN every change is written
- AND the changeset status is `applied`

### Requirement: A non-atomic changeset keeps applying its clean subset

A changeset without `atomic: true` MUST keep partitioning its changes, applying the clean subset and recording the rest as conflicts.

#### Scenario: The existing partial-apply path is unchanged
- GIVEN a changeset without `atomic` carrying one applicable change and one whose `from` does not match
- WHEN the changeset is applied
- THEN the clean change is written
- AND the changeset status is `partially_applied`
