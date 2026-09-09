# Tasks: LLM context efficiency

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350–450 (incl. tests) |
| Review budget (iNNfo/AGENTS.md) | **800 lines** — NOT 400 |
| Budget risk vs 800 lines | Low |
| Commits on `dev` recommended | Yes, 4 commit-sized units |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending — commits on `dev`; `main` absorbs batches, no per-change PRs |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units (commit-sized, on `dev`)

| Unit | Goal | Notes |
|------|------|-------|
| 1 | Capped slice queries (list-read, query-units, server) | Commit 1; tests in |
| 2 | Intent field + differential verify prompts | Commit 2; needs unit 1 |
| 3 | Counters + scorer (2 new files) | Commit 3; needs unit 2 |
| 4 | Skill text + benchmark | Commit 4; needs unit 3 |

## Phase 1: Capped slice queries

- [x] 1.1 RED: failing Vitest in `list-read.spec.ts` for slice params covering "Surgical edit reads slices only" + "Override for wide context".
- [x] 1.2 GREEN: implement `concept/element/max_lines=150/override_reason` + `truncated` flag in `list-read.ts`; passthrough in `server.ts`.
- [x] 1.3 RED: failing Vitest in `query-units.spec.ts` for `max_values_chars` cap covering slice-only scenario.
- [x] 1.4 GREEN + REFACTOR: implement `max_values_chars` in `query-units.ts`; clean up both units.
- [x] 1.5 Verify: `npm --prefix iNNfo run test|lint|typecheck` green; zero NEW drift (format:check informational, NOT a gate).

## Phase 2: Intent router + verify prompts

- [x] 2.1 RED: failing tests for optional `intent:` no-op default + override precedence ("Declared intent governs the call", "Operator overrides a wrong intent", "Call spanning two intents").
- [x] 2.2 GREEN: add `intent:/override_intent:` passthrough in `server.ts`; caller-side verify builder `{exit,new_errors,verdict,log_path}` for "Re-validation carries new errors only" + "Clean run carries the verdict only"; `validate.ts` thin/none.
- [x] 2.3 REFACTOR + verify: `test|lint|typecheck` green; zero NEW prettier drift (format:check NOT a gate).

## Phase 3: Counters + scorer

- [x] 3.1 Decide counter JSONL location (workspace `.cogNNitive/` vs temp); must not pollute tree; record choice.
- [x] 3.2 RED: failing node-runner tests for `usage-counters.js` append + per-intent tallies ("Budget concentrated in few coach calls", "Before-vs-after benchmark recorded").
- [x] 3.3 GREEN + REFACTOR: create `nn-trannsform/scripts/lib/usage-counters.js` (dependency-free JSONL append).
- [x] 3.4 RED: failing node-runner tests for `scorePairs` threshold + never-drop ("Confident pairs link automatically", "Unmatched source is queued, never dropped").
- [x] 3.5 GREEN + REFACTOR: create `nn-trannsform/scripts/lib/score-matcher.js` with `threshold=0.7`; calibrate on fixtures, change only with evidence.
- [x] 3.6 Verify: `test|lint|typecheck` green; zero NEW prettier drift (format:check NOT a gate).

## Phase 4: Skill text + benchmark

- [x] 4.1 Update `nn-innfo/SKILL.md`: `intent:` field, slice-first, differential-verify, budgets.
- [x] 4.2 Update `nn-trannsform/SKILL.md`: scored pipeline step + review-queue procedure ("Reviewer confirms a doubtful pair", "Undecided pairs stay queued").
- [x] 4.3 Run one-promotion before-vs-after benchmark; record per-intent calls/tokens + measured reduction.
- [x] 4.4 Final verify: `test|lint|typecheck` green; zero NEW prettier drift (format:check NOT a gate).
