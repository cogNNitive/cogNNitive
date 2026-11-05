# Decision: keep changeset apply all-or-none

Date: 2026-11-05
Status: accepted

## Decision

A changeset is applied atomically. A mutation or post-mutation validation
failure rejects the whole run and writes nothing; the file stays `proposed` and
can be retried once the workspace changes. Per-change skipping is **not**
implemented.

Precondition conflicts are the one existing partial path: those changes are
recorded as `conflict`, the rest apply, and the changeset ends
`partially_applied`. That is a property of the live model, not a failure of the
proposal.

## Why

The all-or-none contract is what every consumer of the engine relies on:

- `proposal_sha` seals the whole proposal. A run that applies a subset leaves a
  seal that describes something nobody applied.
- The "unit of reconciliation is the group" rule (`nn-update`) depends on it:
  half a blueprint group moving is exactly the skew the flow exists to prevent.
- A rejected-but-unrecorded run is retryable by design. A partially applied one
  is not: the operator has to work out which changes landed.

The pressure to skip comes from large backfills where a handful of elements are
malformed. The right answer there is to fix the addresses (issue 491) or split
the changeset, not to weaken atomicity for every caller.

## What would change our mind

A real consumer that cannot split its changeset and cannot fix the offending
address. If that appears, the shape is an explicit opt-in
(`allow_partial: true`) that records `partially_applied` plus one `rejected`
change per failure, never a silent default.
