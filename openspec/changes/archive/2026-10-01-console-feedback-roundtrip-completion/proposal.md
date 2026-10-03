# Proposal: Console feedback round-trip completion

Change A of 3 (**this** -> `2026-10-01-console-ui-kit` -> `2026-10-01-console-review-ux`).
It finishes the archived plan `archive/2026-09-30-console-feedback-roundtrip`, rebased on HEAD `fc925f8a`. Commit `6f905b1e` built the backend pieces: `innfo-core/src/console/{payload-builder,citations,feedback-ledger}.ts`, the `console-payload.generated.cjs` mirror, `console-shell-guard.js` and `reconcile_feedback_NN.md`. Those are reused here, not redone. The tasks.md of `2026-10-01-console-unified-review-pipeline` cannot be trusted: it marks 14/14 tasks done, and several are not.

## Why

The reviewer loop (console -> feedback JSON -> reconcile -> regenerated console) is still broken. Facts were re-verified in code on 2026-10-01; paths are under `iNNfo/specs/bluepriNNts/` unless rooted.

| # | Gap | Evidence |
|---|---|---|
| 1 | The live export is not schema-conformant | The modal goes `downloadReviewExport` -> `buildReviewDoc` (`console/innfo-runtime.js:611`, `$schema console-review-v1` :659). It has no `meta`, and `field` sits at the top level. `buildExportDoc` (:451) and `validateFeedback` (:471) are only called from tests. Both the schema and `nn-trannsform` reject the export. |
| 2 | The schema carries aliases and a reviewer verdict | `feedback.schema.json` still has `knowledge` (:34), `knowledge_version` (:39) and `session_label` (:69). The item requires `status` (:84, :118). There is no `base_hash`. |
| 3 | `model_console.html` cannot export feedback | No code creates the feedback UI. The bundle only looks up `#innfo-banner` and `#innfo-export-*`. `scripts/lib/console-shell-guard.js:216` hard-codes an exemption for `model_console.html`, with no `legacy:` marker and no ledger entry. |
| 4 | Two payload paths diverge | `compile_model_console_NN.md` hand-builds JSON (per-field citation map, `relations`, no `modelId`/`sha256`/`hash`/`feedbackState`). `buildConsolePayload` emits a citations array and no `relations`. `scripts/export-console.mjs` passes no resolver (:481) and silently falls back to `fallbackBuildPayload` (:85, :486), which uses name-only ids. The cjs mirror is neither a `console_assets` entry nor drift-checked in `verify.js`. |
| 5 | The ledger is in the wrong place, and staleness is never computed | `reconcile_feedback_NN.md` (:24, :108, :175) and the exporter (:458-460) use `sources/import/feedback/ledger.jsonl`, but feedback sources are immutable citable files. `target_hash` and `stale` are types only. Reconcile checks the version, not the content. |
| 6 | Duplicate procedures | `{business,metrics}/procedures/apply_feedback_NN.md` still exist and are referenced by `metrics/procedures/create_timeline_NN.md`, `skills/nn-trannsform/SKILL.md`, `docs/`, and `innfo-core/tests/metrics-console-feedback.test.ts`. |
| 7 | `#fb-001` citations cannot resolve | `scanner-converters.js:414` emits `### fb-001 (kind, status)`. |
| 8 | Duplicated citation logic | `innfo-mcp/src/tools/resolve-sources.ts:179-383` keeps private copies of `classifyOrigin`, `extractExcerpt` and the other citation helpers, which also exist in core `citations.ts`. |

## What Changes

- **Schema**:
  - Drop item `status` and the `knowledge`, `knowledge_version` and `session_label` aliases.
  - Add optional item `base_hash`.
  - Align the three validators: the schema, the bundle's `validateFeedback`, and `nn-trannsform`'s `validateFeedbackJson`. They are checked against one labeled corpus.
  - `layer`, `severity`, `target_hash` and `stale` live only in the ledger.
- **Export**:
  - The modal runs `buildExportDoc` -> `validateFeedback` -> download, and `field` goes to `target.field`.
  - On validation errors the modal lists them and does not download.
  - `buildReviewDoc`, `validateReviewDoc` and the console-review-v1 format are deleted.
  - The reviewer status `<select>` (`innfo-runtime.js:2248`) and `updateDraftStatus` are removed.
- **Injected feedback UI**:
  - When `feedback-export` is declared, `InnfoConsole` injects an idempotent root with `innfo-feedback-*` ids. These ids do not clash with the procedure stepper's `#innfo-export-modal`.
  - The needs-registry `feedback-export` anchors become `[]`.
  - The old anchors are removed from `artifact_shell.html` and `metrics/assets/timeline.html`.
  - The guard exemption at :216 is deleted.
- **One payload**:
  - `buildConsolePayload` becomes the only builder, used by both the procedure and the CLI. The golden test requires identical output, ignoring `generated`.
  - It gains `relations`. It adopts a single citation shape: the per-field map required by living spec `console-field-citations` is the candidate.
  - The CLI's silent fallback becomes a loud error.
  - The cjs is listed in `console_assets` and gets a `--check` drift step in `verify.js`.
  - `meta.feedbackState` is read from the ledger.
  - The as-built element-id scheme stays.
- **Ledger**:
  - Moves to `<domaiNN>/feedback-ledger.jsonl`.
  - A pure core function marks an item `stale` when its `base_hash` or `target_hash` differs from the current element hash. Applying a stale item needs explicit reviewer confirmation.
  - `reconcile_feedback_NN.md` gets the new path and a content-hash staleness step.
- **Deletions**:
  - Both `apply_feedback_NN.md` files, plus every live reference to them.
  - The citation copies in `resolve-sources.ts`, which will import core instead.
- **nn-trannsform**: emits the heading `### fb-001` plus a `- **Kind**:` bullet, with no status. `SKILL.md`, `reviewer-guide.md` and `templates.md` are updated.

## Capabilities

### New Capabilities
- `console-payload-builder`: one builder, CLI and procedure parity, loud failure.
- `feedback-verdict-ledger`: root ledger, latest-wins, stale detection, `feedbackState`.

These two are absent from `openspec/specs/` at HEAD. If the in-flight unified-pipeline archive syncs them first, they become deltas.

### Modified Capabilities
- `innfo-console-feedback`: conformant export, no aliases or item `status`, `base_hash`, injected UI, single reconcile procedure.
- `innfo-console-runtime`: `feedback-export` no longer needs shell anchors.
- `console-export-cli`: no fallback, root ledger, resolver injection.
- `console-field-citations`: one citation shape across both paths.

## Approach

The core stays pure and the adapters stay thin:
- **MCP**: a `build_console_payload` tool backed by the workspace `SourceResolver`. The compile procedure calls it.
- **CLI**: uses the cjs mirror and injects a resolver.
- **Bundle**: only consumes the payload.

Strict TDD applies: every gap gets a red test first, including the golden parity test, the stale-confirmation refusal, a double boot producing exactly one root, and corpus parity.

## Departures from the archived design

| Archived | Now | Why |
|---|---|---|
| D16 `reconcile_console_feedback_NN.md` | Keep `reconcile_feedback_NN.md` | Already shipped; avoids churn |
| `src/feedback/ledger.ts`, `parseLedger`, `now`/`modelPath` options | Keep the as-built module, names and options | Avoids churn |
| D14 UI styled with change-2 tokens | Minimal CSS classes; B re-skins | Chain order is now A -> B |
| Status `<select>` removed by review-ux | Removed here | Item `status` leaves the export, so the select would edit dead data |
| Drop `feedback-export` from `procedure_console.html` | Moot | It does not declare it |
| D17 three MCP tools | One payload tool is certain; ledger tools are open | YAGNI |

## Affected Areas

| Area | Impact |
|---|---|
| `console/{feedback.schema.json,innfo-runtime.js,needs-registry.json,artifact_shell.html}`, bundle, cjs | Modified |
| `metrics/assets/timeline.html`, `metrics/procedures/create_timeline_NN.md` | Modified |
| `workspace/procedures/{compile_model_console,reconcile_feedback}_NN.md` | Modified |
| `{business,metrics}/procedures/apply_feedback_NN.md` | Removed |
| `innfo-core/src/console/*`, `innfo-mcp/src/tools/*` | Modified/New |
| `scripts/{export-console.mjs,verify.js}`, `scripts/lib/console-shell-guard.js` | Modified |
| `skills/nn-trannsform/**`, `docs/innfo/documentation/*`, `test/console-review.test.mjs` | Modified |

## Release coupling

All versions are verified in `manifest/source.yaml`. Refs come from `sync-versions.mjs`/`channel-refs.js` and are never hand-edited.

| Channel | Release | Contents |
|---|---|---|
| `innfo-console` | 0.6.0 -> `innfo-console-v0.7.0` | New bundle; shell pins; cjs asset. HEAD has already drifted from the v0.6.0 tag. |
| `blueprints` | 0.19.1 -> `blueprints-v0.20.0` | Procedure edits and deletions, with `blueprint_version` bumps |
| `skills` | 2.8.1 -> `skills-v2.9.0` | `nn-trannsform` |
| `innfo-mcp` | 0.12.0 -> `innfo-mcp-v0.13.0` | New tool. Today's bundle tree-shakes the console code out (0 hits), so this release is needed only because of the tool. A published bundle is never overwritten. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Changing the citation shape breaks the model viewer | Med | Pick the shape the viewer already reads; DOM test |
| CLI resolver duplicates MCP resolver logic | Med | Design decides between moving the resolver core and a fs-only shim |
| Releases drift across 4 channels | Med | One batch; `check-integrity.js`; `--release` rehearsal |
| Clash with the in-flight unified-pipeline archive | Low | Touch nothing under that directory |

## Rollback

Before `main`: revert the slice commits on `dev`. After release: re-pin to `innfo-console-v0.6.0`, `blueprints-v0.19.1`, `skills-v2.8.1` and `innfo-mcp-v0.12.0`. The ledger is additive.

## Review Workload Forecast

The estimate is about 2,200 changed lines, excluding the generated bundle and cjs.
Decision needed before apply: Yes
Chained PRs recommended: Yes
400-line budget risk: High

Slices (ask-on-risk):

| Slice | Contents | Lines |
|---|---|---|
| A1 | Schema, validators, corpus, nn-trannsform heading | ~350 |
| A2 | Core: `relations`, citation shape, stale logic, cjs and `--check` | ~400 |
| A3 | CLI: loud failure, resolver, root ledger, asset entry | ~300 |
| A4 | MCP tool, `resolve-sources` dedup, thin compile procedure | ~400 |
| A5 | Bundle: export, injected UI, select removal, anchors, guard | ~400 |
| A6 | Reconcile fix, `apply_feedback` deletion, docs, release | ~350 |

## Success Criteria

- [ ] A real console export validates against the schema and `nn-trannsform --scan`.
- [ ] Unchanged `model_console.html` markup exports feedback, and the guard has no exemption.
- [ ] CLI and MCP payloads deep-equal on a fixture domain.
- [ ] Reconcile writes only `<domaiNN>/feedback-ledger.jsonl`, refuses a stale apply without confirmation, and leaves every feedback source byte-identical.
- [ ] `#fb-001` resolves; zero `apply_feedback`, `console-review-v1` and `knowledge*` hits outside the archive.

## Proposal question round

These were not asked directly (executor context). The defaults below need user review:

1. Should a `rejected` verdict be reopenable by appending `pending`? Default: yes.
2. Should reconcile write the ledger through an MCP append tool or through procedure prose? Default: decided in design.
3. Should A release on its own, or batch with B and C into a single `innfo-console` bump? Default: one batch.
4. Should the legacy test fixtures that contain `apply_feedback` be kept as historical domains? Default: keep them, and update only the live test.
5. Should `reconcile_artifact_feedback` (DOCX) write to the same ledger now? Default: later.
