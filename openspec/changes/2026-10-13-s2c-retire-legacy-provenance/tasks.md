# Tasks: S2c — retire legacy provenance

`openspec/config.yaml` is `strict_tdd: true`: each group leads with its test. Every task
names the requirement it serves as `[capability: Requirement]`. Pre-condition: #1C
(`2026-10-13-console-changes-view-and-slug-ids`) is applied on `dev`.

## Review Workload Forecast

| Item | Value |
|------|-------|
| Estimated changed lines | ~250 added / ~3,000 deleted (code, tests, fixtures, docs) |
| 400-line budget risk | Low for review (deletions dominate), High by raw count |
| Chained PRs recommended | Yes — S2c-1 = groups 1–3 (re-point consumers, console export, ledger); S2c-2 = groups 4–6 (tools, import, Agent Modification); S2c-3 = groups 7–8 (skills, docs, release) |
| Decision needed before apply | No |

## 1. Re-point consumers (S2c-1)

- [ ] 1.1 TEST (`iNNfo/packages/innfo-core/tests/console-review*.test.ts`): an element whose
      `history` has an applied change shows an `applied` badge; a conflicted change shows
      `conflict`; a proposed changeset in `changes` targeting it shows `proposed`; a local
      draft shows no badge; no ledger exists. [console-review-mode: Verdict Badges]
- [ ] 1.2 `review.js`: replace `verdictsByElement(feedbackState)` (`:318-319`,
      `:1191-1193`) with badges from `element.history` and `payload.changes`; rebuild the
      console bundle. [console-review-mode: Verdict Badges]
- [ ] 1.3 TEST (`iNNfo/packages/innfo-mcp/src/tools/resolve-sources.spec.ts`,
      `iNNfo/packages/innfo-core/tests/console-citations*.test.ts`): a citation of
      `changes/<f>@## NN Change: c-01` with `author:: ClaudeCode` has `origin: "agent"`;
      with `author:: Maria Lopez` `origin: "human"`; a plain heading `origin: "document"`;
      no result ever has `origin: "reviewer"`. [citation-source-resolution: Citation origin
      classification] [source-sidecar: `is_synthetic` is not stored]
- [ ] 1.4 `console/citations.ts` and `resolve-sources.ts` (`:14`, `:30`): classify origin
      from the cited change block's `author`; remove `AGENT_MODIFICATION_CONCEPT` and the
      feedback-source branch. [citation-source-resolution: Citation origin classification]

## 2. Retire the console feedback JSON export (S2c-1)

- [ ] 2.1 TEST (`test/console-export.test.mjs:182-217`, `console-feedback-ui.test.ts`): the
      export modal offers only the changeset preview, download and copy; download and copy
      bytes are identical; the offline copy fallback works. [innfo-console-feedback: Export
      Modal] [review-workflow: Standardized Review JSON Export (REMOVED)]
- [ ] 2.2 Delete the feedback branch of `composeExport`, `serializeFeedback`,
      `buildFeedbackFilename`, `validateFeedback`, `iNNfo/specs/bluepriNNts/console/feedback.schema.json`,
      `test/feedback-validators-parity.test.mjs`, `test/fixtures/feedback/**`,
      `iNNfo/packages/innfo-core/tests/console-feedback.test.ts`; rebuild the bundle.
      [innfo-console-feedback: Feedback JSON Schema (REMOVED)]

## 3. Retire the ledger (S2c-1)

- [ ] 3.1 TEST (`iNNfo/packages/innfo-core/tests/console-payload*.test.ts`): built payloads
      have no `meta.feedbackState`; a domain with a `feedback-ledger.jsonl` file exports the
      same bytes as without it. [console-payload-builder: Payload Meta]
      [console-export-cli: Root Ledger Input (REMOVED)]
- [ ] 3.2 Delete `console/feedback-ledger.ts` and its `console/index.ts` export,
      `tests/feedback-ledger.test.ts`, `meta.feedbackState` in `ConsolePayloadMeta` and
      `buildConsolePayload`, the ledger read in `scripts/export-console.mjs:600-604`, the
      `scripts/lib/legacy-write-guard.js:61` entry; regenerate
      `console-payload.generated.cjs`. [console-payload-builder: Payload Meta]
      [feedback-verdict-ledger: Ledger Location and Format (REMOVED)]
      [feedback-verdict-ledger: Latest Entry Wins (REMOVED)]
      [feedback-verdict-ledger: Stale Detection and Reconfirmation (REMOVED)]
      [feedback-verdict-ledger: Triage Lives Only in the Ledger (REMOVED)]

## 4. Retire the MCP tools and the procedure (S2c-2)

- [ ] 4.1 TEST (`iNNfo/packages/innfo-mcp/src/server.spec.ts`): the tool list contains
      neither `evaluate_feedback_items` nor `record_feedback_verdict`.
      [feedback-verdict-ledger: Writes Go Through a Validating Tool (REMOVED)]
- [ ] 4.2 Delete `innfo-mcp/src/tools/feedback-verdict.ts` and `feedback-verdict.spec.ts`;
      deregister both tools in `server.ts`. [feedback-verdict-ledger: Writes Go Through a
      Validating Tool (REMOVED)] [feedback-verdict-ledger: sourcePath containment (REMOVED)]
      [feedback-verdict-ledger: Feedback Sources Stay Immutable (REMOVED)]
- [ ] 4.3 Delete `iNNfo/specs/bluepriNNts/workspace/procedures/reconcile_feedback_NN.md`;
      remove it from the workspace template package listing and procedure catalog; bump
      that template's `template_version`; `verify.js` template inventory green.
      [innfo-console-feedback: Reconcile Feedback Procedure (REMOVED)]

## 5. Retire the feedback import and the change-log library (S2c-2)

- [ ] 5.1 TEST (`skills/nn-sources/test/unit/test-scanner.js`, replacing the cases at
      `:235-243`): a `.json` under `sources/import/feedback/` is cognitivized as a plain
      JSON source; no sidecar records a feedback source type.
      [source-normalization-pipeline: Removal of Legacy Slack/Teams JSON Parser]
      [source-normalization-pipeline: Feedback JSON Ingestion (REMOVED)]
- [ ] 5.2 `skills/nn-sources/scripts/lib/normalizer.js:75` (delete the feedback source-type
      branch), `scripts/lib/scanner-converters.js:355` (delete the feedback routing),
      `scripts/scanner.js` (delete the `import/feedback/` route).
      [source-normalization-pipeline: Feedback JSON Ingestion (REMOVED)]
      [innfo-console-feedback: Normalized Feedback Anchors (REMOVED)]
- [ ] 5.3 Delete `skills/nn-sources/scripts/lib/change-log.js`,
      `skills/nn-sources/test/unit/test-change-log.js` and its entry in
      `skills/nn-sources/test/run.js`. [changeset-document-model: Changesets are the only
      change record]

## 6. Retire the Agent Modification block (S2c-2)

- [ ] 6.1 TEST (`iNNfo/packages/innfo-core/tests/exports.test.ts`): `buildAgentModificationBlock`
      and `AgentModificationContext` are not exported from `index.ts` or `browser.ts`.
      [agent-modification-provenance: Agent Modification Block Builder (REMOVED)]
- [ ] 6.2 Delete `agentModification.ts`, `agentModification.spec.ts` and the exports at
      `index.ts:173-174`, `browser.ts:81-82`; rebuild innfo-core and the innfo-mcp bundle.
      [agent-modification-provenance: Agent Modification Block Builder (REMOVED)]
      [agent-modification-provenance: Canonical Block Field Contract (REMOVED)]
      [agent-modification-provenance: Successful apply_change Results Carry the Modification Block (REMOVED)]

## 7. Skills and docs (S2c-3)

- [ ] 7.1 `skills/nn-innfo/SKILL.md`: delete the two tool rows (`:361-362`), the section
      "Agent Modification lineage (MANDATORY on every successful apply_change)" (`:455-457`)
      and the paste instruction (`:526`).
      [agent-modification-provenance: nn-innfo Mandates Verbatim Block Paste (REMOVED)]
- [ ] 7.2 `skills/nn-sources/SKILL.md`: delete section 2a-1 (`:233-240`) and the feedback
      line at `:450`. [source-normalization-pipeline: Feedback JSON Ingestion (REMOVED)]
- [ ] 7.3 Docs: `docs/innfo/documentation/innfo-mcp.md:35-36`, `reviewer-guide.md:37,60`,
      `lifecycle-walkthrough.md:137`, `templates.md:43` describe the changeset review flow
      only. [changeset-document-model: Changesets are the only change record]
- [ ] 7.4 Grep guard (`test/no-legacy-provenance.test.mjs`): the symbols listed in the
      proposal's Success Criteria appear nowhere outside write-once `_V_x-y-z_` files,
      `openspec/changes/archive/` and this change's spec deltas.
      [changeset-document-model: Changesets are the only change record]

## 8. Release and verification (S2c-3)

- [ ] 8.1 `npm run typecheck`; `npm test` for `innfo-core` and `innfo-mcp`;
      `npm --prefix skills/nn-sources test`; `node scripts/verify.js`. [all requirements]
- [ ] 8.2 After the `dev → main` batch, following `.agents/skills/nn-dev-release/SKILL.md`:
      tag `innfo-mcp-v<next>` (tools removed), `innfo-console-v<next>` (bundle and shells),
      `skills-v<next>` (`nn-innfo`, `nn-sources`), `blueprints-v<next>` (workspace template
      without `reconcile_feedback`). [all requirements]
