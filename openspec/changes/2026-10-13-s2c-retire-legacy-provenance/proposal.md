# Proposal: S2c — retire legacy provenance (feedback JSON, verdict ledger, Agent Modification)

## Intent

Slice S2c of `refactor/stable-identity-and-changesets`, now unblocked by the archived
S2a. With the changeset established as the single provenance medium (D8), the parallel
feedback machinery is redundant and is retired per D15:

- The console (and docx) **feedback JSON export** — `serializeFeedback`,
  `buildFeedbackFilename`, `feedback.schema.json`.
- **`feedback-ledger.jsonl`** and its engine (`feedback-ledger.ts`, `feedbackStateFor`).
- The MCP tools **`evaluate_feedback_items` / `record_feedback_verdict`**
  (`feedback-verdict.ts`).
- The **Agent Modification** provenance blocks (`agentModification.ts`; the
  `## NN Agent Modification` origin handling in `citations.ts`).
- The `source_type: feedback` import and the `reconcile_feedback` procedure.

The one non-trivial work item: the console's review-state (stale-feedback banner and
reviewed badges) currently reads the ledger (`meta.feedbackState`). It MUST be
re-pointed at the changesets before the ledger is removed.

## Scope

### In Scope
- Retire the feedback JSON export, the ledger, the two MCP tools, the Agent Modification
  blocks, and the feedback import path.
- Re-point console review-state from `feedbackState`/ledger to the changeset-derived
  data (per-element `history`, D2).
- Delete the retired specs' requirements (`feedback-verdict-ledger`,
  `agent-modification-provenance`).

### Out of Scope
- The changeset document model / apply engine (S1, S2a, S2b, and the consolidated
  `2026-10-13-changeset-first-class-and-lineage`).
- Removing the `changes` console view (a different change).

## Capabilities

### Removed Capabilities
- `feedback-verdict-ledger`
- `agent-modification-provenance`

### Modified Capabilities
- `innfo-console-feedback`: the JSON export path is removed; the modal keeps only the
  changeset export.
- `console-payload-builder`: `meta.feedbackState` is removed; review-state is derived
  from `changes`.
- `review-workflow`: the reviewed/stale surfaces read changesets, not a ledger.

## Approach

Delete the feedback path end to end, then add a changeset-derived review-state. Because
`apply_change` never wrote the ledger (only `record_feedback_verdict` did), removing the
writer and the two tools removes the only producers; the console then derives reviewed
state from `changes/*_md` exactly as `element.history` already does.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/console/feedback-ledger.ts` | Removed | ledger engine |
| `iNNfo/packages/innfo-core/src/agentModification.ts` | Removed | Agent Modification block parsing |
| `iNNfo/packages/innfo-core/src/console/citations.ts` | Modified | drop `AGENT_MODIFICATION_CONCEPT` origin |
| `iNNfo/packages/innfo-core/src/console/payload-builder.ts` | Modified | drop `meta.feedbackState` |
| `iNNfo/packages/innfo-mcp/src/tools/feedback-verdict.ts` | Removed | the two MCP tools |
| `iNNfo/packages/innfo-mcp/src/server.ts` | Modified | deregister the two tools |
| `iNNfo/specs/bluepriNNts/console/feedback.schema.json` | Removed | feedback schema |
| `iNNfo/specs/bluepriNNts/workspace/procedures/reconcile_feedback_NN.md` | Removed | feedback procedure |
| `iNNfo/specs/bluepriNNts/console/*` (runtime + ui-kit) | Modified | drop feedback export; review-state from changes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Console loses reviewed/stale state | High | Re-point to changesets in the same change; test the banner |
| A domain ships `feedback-ledger.jsonl` | Low | Ignored if present; no schema break |
| Docx feedback import still referenced | Med | Grep the import path; remove it and its procedure |

## Rollback Plan

Isolated to the feedback path. If review-state regresses, revert the console runtime
files only (the ledger may be temporarily reinstated) while the deletions stay.

## Success Criteria

- [ ] No code references `feedback-ledger`, `feedbackState`, `evaluate_feedback_items`,
      `record_feedback_verdict`, `feedback.schema.json`, or `reconcile_feedback`.
- [ ] The console review-state (stale banner, reviewed badges) derives from `changes`.
- [ ] The Agent Modification origin no longer exists in `citations.ts`.
- [ ] `node scripts/verify.js` and the affected package tests are green.
