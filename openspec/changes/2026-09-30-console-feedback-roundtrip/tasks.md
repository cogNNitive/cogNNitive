# Tasks: Console feedback round-trip

Change 3 of 4. Requires changes 1 (`console-cleanup-and-lint`) and 2 (`console-design-tokens-and-ui-kit`) applied. Strict TDD: every slice starts with RED tests, proven able to fail before GREEN. Paths: `CONSOLE` = `iNNfo/specs/bluepriNNts/console`, `CORE` = `iNNfo/packages/innfo-core`, `MCP` = `iNNfo/packages/innfo-mcp`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2,000-2,600 excluding generated bundle/CJS mirror/registry (S1 450-550, S2 750-900, S3 400-550, S4 450-600) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (export + ledger) -> PR 2 (payload builder) -> PR 3 (bundle UI) -> PR 4 (reconcile + release) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Conformant export, validators, schema cleanup, ledger module | PR 1 | Base = change 2's last branch (or tracker). Standalone; S2 needs ledger types |
| 2 | `buildConsolePayload`, MCP tools, CLI, thin procedure | PR 2 | Base = PR 1. Largest slice; split S2b (CLI + mirror) if over budget |
| 3 | Injected feedback UI, lint exception removal | PR 3 | Base = PR 2 |
| 4 | `reconcile_console_feedback`, deletions, release | PR 4 | Base = PR 3. Tags only after merge to `main` |

Load `chained-pr` and `work-unit-commits` before PR creation. One work-unit commit per behavior (tests + code + docs together), conventional commits, no AI attribution.

## Phase 0: Pre-apply gates (manual; record each answer in apply-progress)

- [ ] 0.1 Confirm changes 1 and 2 are applied: `scripts/lib/console-shell-guard.js` carries the `legacy:console/model-console-feedback-anchors` exception, `console/ui-kit.js` exists, `scripts/lib/console-bundle.js` exists. Read the versions they bumped in `manifest/source.yaml`.
- [ ] 0.2 Gate (open risk): does editing `workspace/procedures/compile_model_console_NN.md` or adding `reconcile_console_feedback_NN.md` need a `blueprint_version`/`template_version` bump, a `manifest/source.yaml` entry, or an editor `SHIPPED_TEMPLATE_VERSIONS` entry? Read the template-version guard in `scripts/verify.js` and `workspace_spec_NN.md` (frozen). Outcome decides tasks 2.12 and 4.4.
- [ ] 0.3 Gate: is `feedback-export` in `procedure_console.html` dropped? Verify the stepper delivers no feedback UI (bundle `#innfo-export-modal` is the stepper's own). Outcome decides 3.8.
- [ ] 0.4 Gate: duplicate-listener check. List which of the three script tags (CDN, mirror, vendored) execute per shell, and whether modules boot more than once. Outcome drives the RED test in 3.1.
- [ ] 0.5 Gate: after first generating the CJS mirror (2.9), inspect the esbuild metafile; the mirror MUST NOT include `canonical-registry.ts`. If it does, cut the import at `innfo-core/src/console/index.ts` before proceeding.
- [ ] 0.6 Run `npm --workspace=@cognnitive/innfo-core run build` before any `innfo-mcp` test in this change (dist staleness breaks MCP tests). Preflight-touching tests: re-run with empty `USERPROFILE` and `HOME` before trusting green.

## Phase 1: Slice 1 - Conformant export, validators, ledger module (PR 1)

- [ ] 1.1 RED: `test/fixtures/feedback/{valid,invalid}/*.json` labeled corpus (alias `knowledge`, `session_label`, item `status`, `kind: rewrite`, top-level `field`, valid with `target.field` + `base_hash`).
- [ ] 1.2 RED: replace `test/console-review.test.mjs` with schema-conformance tests: export passes `validateFeedback`, has `target.field`; `buildReviewDoc`/`console-review-v1` absent.
- [ ] 1.3 RED: `CORE/tests/feedback-ledger.test.ts` (latest wins, reopen, `applied` over `stale` refused without `confirm_stale`, parse errors carry the line, serialized line equals a literal). Literal expected values only.
- [ ] 1.4 RED: nn-trannsform tests: normalized output is `### fb-001` + `- **Kind**:`; `#fb-001` resolves via `resolveHeadingSection`; validator agrees with the corpus.
- [ ] 1.5 GREEN: `CONSOLE/feedback.schema.json`: delete `knowledge`, `knowledge_version`, `session_label`; drop item `status`; add optional `base_hash`; leave `$id`.
- [ ] 1.6 GREEN: `CONSOLE/innfo-runtime.js`: `draftToItem`, `buildExportDoc` (meta `source_knowledge` = modelId, `source_sha256`), call `validateFeedback` in the modal, block download and list errors; delete `buildReviewDoc`, `validateReviewDoc`, `REVIEW_FILENAME_PATTERN`.
- [ ] 1.7 GREEN: `skills/nn-trannsform/scripts/lib/scanner-converters.js` heading + validator alignment; update its `SKILL.md`.
- [ ] 1.8 GREEN: `CORE/src/feedback/ledger.ts` (`LedgerEntry`, `parseLedger`, `serializeLedgerEntry`, `effectiveVerdicts`, `feedbackStateFor`); `.js` import specifiers; export from the package index.
- [ ] 1.9 Prove red: revert 1.5 and 1.6 separately; the corpus and modal tests MUST fail. Restore.
- [ ] 1.10 Docs: `docs/innfo/documentation/reviewer-guide.md:37` and `templates.md:42` drop `console-review-v1`, describe the schema-conformant export.
- [ ] 1.11 Rebuild bundle (`npm run build:console`), then gates: `npm run lint`, `npm run typecheck`, `npm run test`, `node scripts/verify.js`, `node scripts/check-integrity.js`.

## Phase 2: Slice 2 - Payload builder, MCP tools, CLI, thin procedure (PR 2)

- [ ] 2.1 RED: `CORE/tests/console-payload.test.ts`: id `problems-paranormal-infestation` and duplicate `-1`; `modelId` literal `kNNowledge/biz/Ghostbusters`; `modelId` equal across a version bump while `sha256` differs; element `hash` stable on version-only edit, changed on field edit; wikilink relations; `markers` map vs `schema.markers` list; no resolver -> no citations.
- [ ] 2.2 RED: `CORE/tests/console-citations.test.ts` (moved logic) and keep `resolve-sources.spec.ts` unchanged as the regression guard.
- [ ] 2.3 RED: `MCP` tests for `build_console_payload` (`<`-escaped slot strings, both slots), `feedback_items_status`, `record_feedback_verdict` (first N lines byte-identical, feedback file hashes unchanged, `confirm_stale` refusal).
- [ ] 2.4 RED: golden test: CLI slots deep-equal `build_console_payload` slots on a temp fixture domain (minus `generated`); an MCP-built console reports `fresh` in `--status`.
- [ ] 2.5 RED: drift test: `build-console-payload.mjs --check` exits 1 against a stale `--out` (real process, proven red).
- [ ] 2.6 GREEN: `CORE/src/console/citations.ts` (move `resolveCitation`, `classifyOrigin`, excerpt logic from `resolve-sources.ts:179-386`); `MCP/src/tools/resolve-sources.ts` imports it.
- [ ] 2.7 GREEN: `CORE/src/console/payload.ts` and `index.ts` per design contract (`.js` specifiers; injected `SourceResolver`; `computeSha256`).
- [ ] 2.8 GREEN: `MCP/src/tools/build-console-payload.ts`, ledger tools, register in `server.ts`.
- [ ] 2.9 GREEN: `scripts/build-console-payload.mjs` (esbuild neutral cjs node20, `--check`) -> `CONSOLE/console-payload.generated.cjs`; add `verify.js` step.
- [ ] 2.10 GREEN: `scripts/export-console.mjs` requires the mirror from `consoleDir`; delete hand parsing; fix stale logic to content-hash.
- [ ] 2.11 GREEN: `manifest/source.yaml` new `console_assets` entry `innfo-console-payload` (same `ref_key`); verify standalone run (R-EXP-02) in a dir with only exporter, shell, bundle, mirror.
- [ ] 2.12 GREEN: thin `workspace/procedures/compile_model_console_NN.md` (calls tool, fills both slots); apply gate 0.2 outcome.
- [ ] 2.13 Gates: `npm --workspace=@cognnitive/innfo-core test`, MCP tests after core build, lint, typecheck, `npm run test`, `verify.js`, `check-integrity.js`.

## Phase 3: Slice 3 - Bundle-injected feedback UI (PR 3)

- [ ] 3.1 RED (`@vitest-environment jsdom`, not happy-dom): unchanged `model_console.html` + boot x2 yields exactly one `[data-innfo-feedback-root]` and one `#innfo-feedback-open`; modal opens; export has `target.field`; invalid meta -> `createObjectURL` never called (stub proven red by disabling the guard).
- [ ] 3.2 RED: undeclared `feedback-export` injects nothing; single delegated `[data-innfo-suggest]` listener fires once; stepper `#innfo-export-modal` unaffected.
- [ ] 3.3 RED: console-shell guard test: `model_console.html` passes without exception; stale exception/marker/ledger entry is an error.
- [ ] 3.4 GREEN: `innfo-runtime.js` `ensureFeedbackUi(doc)`, `feedback.isEnabled(doc)`, delegated suggest; styled with change-2 tokens and `StatusBadge`.
- [ ] 3.5 GREEN: `render-model-viewer.js` passes `suggest: true` to `ElementCard`.
- [ ] 3.6 GREEN: remove `#innfo-banner`/`#innfo-export-*` markup and CSS from `artifact_shell.html` and `metrics/assets/timeline.html`.
- [ ] 3.7 GREEN: `needs-registry.json` `feedback-export: []`; delete the `ANCHOR_EXCEPTIONS` entry, the `legacy:console/*` marker in `model_console.html`, and its `legacy-ledger.yaml` entry.
- [ ] 3.8 GREEN: `procedures/assets/procedure_console.html` drops `feedback-export` (per 0.3).
- [ ] 3.9 Offline scan: no `fetch(` or `type=module` added. Rebuild bundle; gates: lint, typecheck, `npm run test`, `verify.js` (incl. `legacy-ledger-guard`), `check-integrity.js`.

## Phase 4: Slice 4 - Reconcile procedure, deletions, release (PR 4)

- [ ] 4.1 RED: `CORE/tests/metrics-console-feedback.test.ts` and blueprint scans: no `apply_feedback_NN.md` anywhere; all references point to `reconcile_console_feedback`; metrics regenerates via `create_timeline`, others via `compile_model_console`; Staleness Report present.
- [ ] 4.2 RED: verdict survives regeneration (`meta.feedbackState` still `applied`); feedback source hashes unchanged.
- [ ] 4.3 GREEN: create `workspace/procedures/reconcile_console_feedback_NN.md`; delete `business/procedures/apply_feedback_NN.md` and `metrics/procedures/apply_feedback_NN.md`; update `metrics/procedures/create_timeline_NN.md`, both `spec_NN.md` references, and `docs/innfo/documentation/lifecycle-walkthrough.md:136`.
- [ ] 4.4 GREEN: bump versions per gate 0.2; register in editor `SHIPPED_TEMPLATE_VERSIONS` if required; run `generate-canonical-registry.mjs`.
- [ ] 4.5 Gates: lint, typecheck, `npm run test`, `verify.js`, `check-integrity.js`.

## Phase 5: Release (after PR 4 merged to `dev`; follow `nn-dev-release`, but its text is stale - use real tags)

- [ ] 5.1 Bump `innfo-mcp/package.json` minor above current; run `node scripts/sync-versions.mjs`; rebuild innfo-core then the MCP bundle.
- [ ] 5.2 Bump all `console_assets` (incl. `innfo-console-payload`) to the next minor above the highest shipped by changes 1-2; `npm run build:console`; `check:console-bundle`.
- [ ] 5.3 Bump `channels.stable.refs` `blueprints` (next above changes 1-2's value) and `skills` (from `2.8.1`, `nn-trannsform` version bumped); never hand-edit derived refs.
- [ ] 5.4 Gate: `verify.js`, `check-integrity.js`, `sync-versions.mjs --check`, detached-worktree `--release` rehearsal (`git worktree add --detach <tmp> <sha>`).
- [ ] 5.5 After `git push origin dev:main` (merge commit), tag on `origin/main`: `innfo-mcp-v*`, `innfo-console-v*`, `blueprints-v*`, `skills-v*`; run `verify.js --release`.

## Amendments from change 4 (console-review-ux)

- [ ] am.1 The `suggest` option on `ElementCard` and the delegated `[data-innfo-suggest]` listener (tasks 3.2, 3.4, 3.5) are replaced by change 4's review controller (`InnfoReview`, `innfo:rendered` event). Do not build them; if already built, change 4 slice 2a removes them. The ElementCard Suggest button does not ship; `suggest: true` is not passed from `render-model-viewer.js`.
- [ ] am.2 Console exports carry no `status` (schema item `status` removed in 1.5). Change 4's drafts and items never carry it, and its tests assert the key is absent. `draftToItem` lands in change 4's `review.js`; task 1.6 may keep it in `innfo-runtime.js` meanwhile, and change 4 slice 1 moves it.
