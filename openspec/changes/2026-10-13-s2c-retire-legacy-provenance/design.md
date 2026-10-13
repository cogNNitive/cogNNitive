# Design: S2c — retire legacy provenance

## Why the ledger can go

The console review-state reads `meta.feedbackState`, built by `feedbackStateFor(ledger)`
from `<domain>/feedback-ledger.jsonl`. The only writer of that ledger is the MCP tool
`record_feedback_verdict`, called by the `reconcile_feedback` procedure from a reviewer
feedback JSON. `apply_change` never wrote the ledger. So deleting the writer + the two
tools + the JSON import removes every producer; nothing else depends on the file.

## Re-pointing review-state to changesets

- `element.history` is already computed from `changes/*_changes_NN.md`
  (`attachChangesetHistory`). Reviewed/changed state per element becomes: an element with
  an applied change in a changeset is "reviewed"; a draft whose `base_hash` differs from
  the element (`isTargetChanged`) is "stale" — already the console's rule
  (`review.js`). The ledger's `feedbackState` is deleted; the runtime derives both from
  the payload's `changes` + per-draft `base_hash`.
- `meta.feedbackState` is removed from `ConsolePayloadMeta`.

## Deletion order (safety)

1. Add the changeset-derived review-state first (keeps the console working).
2. Delete the console feedback-JSON export (`composeExport` feedback branch,
   `serializeFeedback`, `buildFeedbackFilename`).
3. Delete the ledger engine + `feedbackStateFor` + `meta.feedbackState`.
4. Delete the two MCP tools + their `server.ts` registration.
5. Delete `feedback.schema.json`, the `reconcile_feedback` procedure, the
   `source_type: feedback` import, and `agentModification.ts`.
6. Remove the `## NN Agent Modification` origin from `citations.ts`.

## Cross-cutting

- `strict_tdd: true`: each deletion is guarded by a test asserting the symbol is gone and
  the console still renders reviewed/stale state from changesets.
- Regenerate `console-payload.generated.cjs` and the console bundle; `verify.js` gates.
