# Delta for changeset-apply-engine

## ADDED Requirements

### Requirement: Proposal immutability

Applying a changeset MUST NOT alter the proposed change blocks. The sealed proposal is
the user's input; after a successful apply its change blocks MUST be byte-identical to
the input, and `verifyProposalSha` MUST still return `true`. Execution facts
(`status`, `applied_at`, `models`, and a `status::`/`resolution::`/`resolved_slug::`
annotation where needed) MUST be recorded without rewriting the proposed content —
in frontmatter and a dedicated trailing outcome section. No apply-time outcome MUST be
written to a JSON ledger (a change-log JSON is an explicit non-goal).

#### Scenario: Proposed blocks are preserved
- GIVEN a sealed changeset with changes `c-01` and `c-02`
- WHEN it is applied
- THEN `c-01` and `c-02` blocks are byte-identical to the input
- AND `verifyProposalSha` returns `true`
- AND the outcome is present in the frontmatter and outcome section only

### Requirement: Evidence citation on applied changes

When a change is backed by evidence, the apply engine MUST leave the change citing that
evidence: the `sources::` of the change MUST point at the source (or the target field's
rewritten citation MUST chain through the change to the source). A change with no
evidence MUST end the chain at itself; the engine MUST NOT emit a citation it cannot
resolve.

#### Scenario: The lineage chain closes
- GIVEN a change backed by `sources/import/dataset.csv@m-001`
- WHEN it is applied
- THEN the change carries a citation to that row
- AND walking `field → change → source` resolves end to end
