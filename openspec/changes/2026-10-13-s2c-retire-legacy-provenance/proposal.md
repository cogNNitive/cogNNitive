# Proposal: S2c — retire legacy provenance (feedback JSON, verdict ledger, Agent Modification, change-log)

## Intent

Slice S2c of `refactor/stable-identity-and-changesets`. Changesets are the only mechanism
that changes data and the only change record (D8, D15). The parallel machinery is retired
with no tolerant read and no fallback:

- the console **feedback JSON export** (`serializeFeedback`, `buildFeedbackFilename`,
  `validateFeedback`, `feedback.schema.json`) and the `source_type: feedback` import in
  `nn-sources`;
- **`feedback-ledger.jsonl`** and its engine (`feedback-ledger.ts`, `feedbackStateFor`,
  `FEEDBACK_LEDGER_FILENAME`, `meta.feedbackState`);
- the MCP tools **`evaluate_feedback_items` / `record_feedback_verdict`**
  (`feedback-verdict.ts`) and the `reconcile_feedback` procedure;
- the **Agent Modification** block (`agentModification.ts`, its exports, the
  `AGENT_MODIFICATION_CONCEPT` origin in `console/citations.ts` and `resolve-sources.ts`)
  and the `nn-innfo` paste mandate that is already false (`SKILL.md:455-457`);
- the orphan **change-log** library in `nn-sources` (`scripts/lib/change-log.js`).

What replaces them (stated, intended): the console exports a changeset (already the case);
review state shown in the console comes from changesets — badges from `element.history`
(applied / conflict) and from proposed changesets in the `changes` collection (#1C);
staleness is per draft (`base_hash`). Reviewer verdicts `pending`, `rejected` and `stale`
disappear: a proposal is reviewed by applying or not applying its changeset. Citation
origin (agent / human) comes from the `author` of the cited changeset change; the
`reviewer` origin disappears.

## Scope

### In Scope
- Delete the code, schema, procedure, tools, tests, fixtures and docs listed in `tasks.md`.
- Re-point console verdict badges and citation origin to changesets.
- Delta specs for every living requirement that mandates a retired piece.

### Out of Scope
- The changeset model, apply engine and console ids (#1A to #1C, applied before this).
- Renaming the console identifiers `feedback-export` (need) and `innfo-feedback-*` (DOM
  ids) that now host the changeset export (dependency file, question 5).
- Existing domains: any `feedback-ledger.jsonl`, feedback JSON or Agent Modification block
  in a user domain is left untouched on disk and is not read by any tool. User data is
  never deleted (it lives in sha-checked Sources).

## Capabilities

### Removed Capabilities (every requirement REMOVED by exact name)
- `feedback-verdict-ledger`
- `agent-modification-provenance`

### Modified Capabilities
- `console-payload-builder`: `Payload Meta` without `feedbackState`.
- `console-export-cli`: `Root Ledger Input` REMOVED.
- `innfo-console-feedback`: JSON schema, reconcile procedure and feedback anchors REMOVED;
  `Export Modal` exports changesets only.
- `review-workflow`: `Standardized Review JSON Export` REMOVED.
- `console-review-mode`: `Verdict Badges` derive from changesets.
- `citation-source-resolution`: origin from the cited change's author.
- `source-sidecar`: authorship from changeset changes; no feedback sidecars.
- `source-normalization-pipeline`: feedback ingestion REMOVED.
- `changeset-document-model`: new requirement — changesets are the only change record.

## Approach

Test-first deletion in the safe order of `design.md`: re-point the consumers (badges,
origin) first, then delete producers (tools, procedure, import), then the engine and the
block, then specs and docs. Generated mirrors and bundles are rebuilt in the same groups.

## Dependencies

After the console spine (`single-console-shell`: it ADDs `console-payload-builder` "Per-model
state in meta.models" and drops its `Payload Meta`, `Verdict Badges` and `Reconcile Feedback
Procedure` deltas to this change) and #1C (`changes` collection, slug ids; #1C and this change
both modify `console-payload-builder` and `console-export-cli`, on different requirements).
Before S3 and S6. S6 also modifies
`console-review-mode` (ADDED `New element draft`) and `console-export-cli` (status, tree,
selective compilation, write-once) — no requirement is modified by both.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/{agentModification.ts,console/feedback-ledger.ts,console/citations.ts,index.ts,browser.ts}` | Removed / Modified | block, ledger, origin, exports |
| `iNNfo/packages/innfo-mcp/src/tools/{feedback-verdict.ts,resolve-sources.ts}`, `src/server.ts` | Removed / Modified | two tools; origin |
| `iNNfo/specs/bluepriNNts/console/{feedback.schema.json,review.js,innfo-runtime.js,ui-kit.js}` | Removed / Modified | schema; JSON export; badges |
| `iNNfo/specs/bluepriNNts/workspace/procedures/reconcile_feedback_NN.md` | Removed | procedure (unversioned file) |
| `scripts/export-console.mjs`, `scripts/lib/legacy-write-guard.js` | Modified | ledger read; guard entry |
| `skills/nn-innfo/SKILL.md`, `skills/nn-sources/**` | Modified / Removed | tools table, paste mandate; feedback import; change-log |
| tests and fixtures listed in `tasks.md` | Removed / Modified | |
| `docs/innfo/documentation/{innfo-mcp,reviewer-guide,lifecycle-walkthrough,templates}.md` | Modified | |

Release impact: removing two MCP tools and changing `resolve_sources` needs an
`innfo-mcp-v*` release; the console runtime and schema removal need `innfo-console-v*`;
`nn-innfo` / `nn-sources` need `skills-v*`; removing `reconcile_feedback_NN.md` from the
workspace template package needs a `template_version` bump and a `blueprints-v*` release.
No published write-once `_V_x-y-z_` file is edited.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Console loses its review badges | Med | Badges re-pointed and tested before the ledger is deleted |
| A remaining import of a deleted symbol | Med | `typecheck`, the gated suites and a grep guard |
| A doc keeps teaching the paste mandate or the feedback loop | Med | Grep guard over `docs/` and `skills/` |

## Rollback Plan

Revert the slice commits before the release tags; after the tags, roll forward.

## Success Criteria

- [ ] No code, test, doc or skill outside write-once files and `openspec/changes/archive/`
      references `feedback-ledger`, `feedbackState`, `evaluate_feedback_items`,
      `record_feedback_verdict`, `feedback.schema.json`, `reconcile_feedback`,
      `agentModification`, `AGENT_MODIFICATION_CONCEPT` or `change-log.js`.
- [ ] Console verdict badges derive from changesets; citation origin from change authors.
- [ ] `node scripts/verify.js`, `npm run typecheck` and the package tests are green.
