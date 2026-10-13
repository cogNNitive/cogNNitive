# Tasks: S2c — retire legacy provenance

`strict_tdd: true`: each group leads with its test.

## 1. Changeset-derived review-state (do first)

- [ ] 1.1 TEST: an element with an applied change shows "reviewed"; a stale draft
      (`base_hash` differs) shows "stale" — with no ledger present.
- [ ] 1.2 Console runtime derives reviewed/stale from `changes` + `base_hash`; remove
      the `feedbackState` read.
- [ ] 1.3 Remove `meta.feedbackState` from `ConsolePayloadMeta` and `buildConsolePayload`.

## 2. Retire the console feedback JSON export

- [ ] 2.1 TEST: the export modal offers only the changeset download/copy.
- [ ] 2.2 Delete the feedback branch of `composeExport`, `serializeFeedback`,
      `buildFeedbackFilename`, `validateFeedback`.

## 3. Retire the ledger engine

- [ ] 3.1 Delete `feedback-ledger.ts`; remove its `console/index.ts` export.
- [ ] 3.2 Delete `feedback.schema.json`.
- [ ] 3.3 Rebuild `console-payload.generated.cjs`.

## 4. Retire the MCP tools + procedure

- [ ] 4.1 Delete `feedback-verdict.ts`; deregister `evaluate_feedback_items` /
      `record_feedback_verdict` in `server.ts`.
- [ ] 4.2 Delete `reconcile_feedback_NN.md` and the `source_type: feedback` import path.
- [ ] 4.3 TEST: the tool list no longer contains the two tools.

## 5. Retire Agent Modification provenance

- [ ] 5.1 Delete `agentModification.ts`; remove `AGENT_MODIFICATION_CONCEPT` /
      `classifyOrigin` handling from `citations.ts`.
- [ ] 5.2 TEST: no citation resolves to an `agent-modification` origin.

## 6. Specs + verification

- [ ] 6.1 REMOVE the `feedback-verdict-ledger` and `agent-modification-provenance`
      specs; MODIFY `innfo-console-feedback`, `console-payload-builder`, `review-workflow`.
- [ ] 6.2 `npm run typecheck` + `node scripts/verify.js` + `npm test`.
- [ ] 6.3 Regenerate the TestLab console; confirm the review tab and banner.
