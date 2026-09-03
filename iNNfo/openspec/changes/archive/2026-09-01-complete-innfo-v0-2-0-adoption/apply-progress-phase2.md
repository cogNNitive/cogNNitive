# Apply Progress — Phase 2 / PR 2 (constants, samples map, sample URLs, version.ts)

**Change**: `complete-innfo-v0-2-0-adoption`
**Batch**: Phase 2 only (Work Unit 2). Branch `feat/business-template-decomposition`. No commit/push/PR.
**Mode**: Strict TDD (Vitest). Test runner needed `NODE_OPTIONS=--max-old-space-size=8192 --pool=forks --poolOptions.forks.singleFork=true` — the default worker heap OOMs on this machine (transient `Fatal process out of memory: Zone`).

## Task status

| Task | Status | Evidence |
|---|---|---|
| 2.1 RED — `constants.test.ts` (4 assertions) | DONE | 4/4 failed: `V_0-1-0` received vs `V_0-2-0` expected; `buildTemplateUrl` URL still `procedures_V_0-1-0_NN.md` |
| 2.2 GREEN — `constants.ts:13,19` → `'V_0-2-0'` | DONE | re-ran 2.1 → 4/4 pass |
| 2.3 RED — `shipped-template-versions.test.ts` (2 assertions) | DONE | 2/2 failed: `business` expected `V_0-1-0` vs `V_0-2-0` on disk; missing map keys `[analysis, blank, business-model, cogNNitive, innovation]` |
| 2.4 GREEN — `samples.ts` `SHIPPED_TEMPLATE_VERSIONS` → 9 slugs per O3 | DONE | re-ran 2.3 → 2/2 pass |
| 2.5 RED — new case in `useTemplateVersionNotice.test.ts` (`procedures_V_0-1-0`, no handle → `latest==='V_0-2-0'`) | DONE | RED shown by temporarily reverting `samples.ts` to baseline map: new case failed (`expected null not to be null`), other 18 cases passed. Restored map. |
| 2.6 GREEN + no-regression | **BLOCKED** | New case passes after 2.4. BUT task 2.6's own criterion ("confirm no other case in that file regresses") FAILS — see Regressions below. STOP-and-report per orchestrator instruction; no test rewritten. |
| 2.7 RED — `sample-urls.test.ts` (3 assertions) | DONE | `_V_0-2-0_` assertion failed listing all 10 `_V_0-1-0_` starter URLs; extraction + path-exists assertions passed |
| 2.8 GREEN — re-point 10 starter-sample URLs `_V_0-1-0_`→`_V_0-2-0_` | DONE | `HomeView.vue` 62/71/79/176, `SetupWizard.vue` 53/62/70, `useWorkspaceScaffolding.ts` 248/253/258. Re-ran 2.7 → 3/3 pass |
| 2.9 — `version.ts` comment-only, dangling section refs | DONE | replaced `§8` (L2), `§8.1` ×3 (L8, L40, L~77), `§8.2` (L~95) with `iNNfo V_0-2-0 — "Identity & Naming"` (real heading, L273 of `iNNfo_V_0-2-0_NN.md`). Kept `e.g. V_0-1-0` format examples at L6 + `formatVersionString` comment. Orchestrator said `§8.1 ×2` but 3 existed — fixed all 3 per the stated goal. Not TDD-gated. |
| 2.10 — audit-only, bare `V_0-1-0` source literals | DONE | `v0-1-0-source-audit.md` written. 23 sites / 20 files. 0 fixes in PR 2. 18 KEEP. 5 KEEP+FOLLOW-UP flagged (`innfo-core/parser/serializer.ts:28`; `innfo-mcp/tools/mutate.ts:849/853/854` + doc mirror `server.ts:213`; `StandaloneProcedureView.vue:71-77`; `SetupWizard.vue:217`; `FilePreviewModal.vue:181`). |
| 2.11 — golden snapshot zero-diff | DONE | `recursiveParser.models.golden` 7/7 pass, `crlf-fidelity.golden` 2/2 pass (in isolation). `git status --porcelain apps/innfo-editor/tests/golden/` EMPTY → zero diff on `recursiveParser.models.golden.test.ts.snap`. Not run with `-u`. |
| 2.12 — full `lint && typecheck && format:check && test` gate | **BLOCKED** | Not green. PR 2 adds 0 lint/type/format violations. See below. |

## Files changed by PR 2

| File | Action | Change |
|---|---|---|
| `apps/innfo-editor/src/utils/constants.ts` | Modified | `DEFAULT_INNFO_VERSION` + `DEFAULT_TEMPLATE_VERSION` → `'V_0-2-0'` (both stay scalar) |
| `apps/innfo-editor/src/config/samples.ts` | Modified | `SHIPPED_TEMPLATE_VERSIONS` → 9 slugs (O3 target map) |
| `apps/innfo-editor/src/utils/version.ts` | Modified | comment-only: 5 dangling `§8*` refs → `iNNfo V_0-2-0 — "Identity & Naming"` |
| `apps/innfo-editor/src/views/HomeView.vue` | Modified | 4 starter-sample URLs `_V_0-1-0_`→`_V_0-2-0_` |
| `apps/innfo-editor/src/components/layout/SetupWizard.vue` | Modified | 3 starter-sample URLs `_V_0-1-0_`→`_V_0-2-0_` |
| `apps/innfo-editor/src/composables/useWorkspaceScaffolding.ts` | Modified | 3 starter-sample URLs `_V_0-1-0_`→`_V_0-2-0_` |
| `apps/innfo-editor/tests/unit/constants.test.ts` | Created | TDD gate for D3 constants (4 tests, green) |
| `apps/innfo-editor/tests/unit/shipped-template-versions.test.ts` | Created | disk-integrity guard for the map (2 tests, green) |
| `apps/innfo-editor/tests/unit/sample-urls.test.ts` | Created | starter-sample URL guard (3 tests, green) |
| `apps/innfo-editor/tests/unit/useTemplateVersionNotice.test.ts` | Modified | +1 badge-fires case (green); 2 pre-existing cases now RED (see Regressions) |
| `openspec/changes/complete-innfo-v0-2-0-adoption/v0-1-0-source-audit.md` | Created | task 2.10 audit record |

Diff stat (tracked): `apps/innfo-editor` src+test = 7 files, +40 / -21. Plus 3 new test files (~140 lines) + audit doc.

## Regressions introduced by PR 2 (task 2.4) — DESIGN O5 SCOPE GAP

`SHIPPED_TEMPLATE_VERSIONS` now maps `business`/`organization`/`procedures`/`projects` → `V_0-2-0`. Five pre-existing tests assert the OLD map reality with `business_V_0-1-x` / `organization` fixtures:

1. `tests/unit/useTemplateVersionNotice.test.ts` → `sets notice when the workspace scan finds a newer template version` — expects `notice.latest === 'V_0-1-2'`, now gets `'V_0-2-0'` (bundled map wins).
2. `tests/unit/useTemplateVersionNotice.test.ts` → `leaves notice null when the model already pins the newest known version` — fixture pins `business_V_0-1-0` + workspace has `business_V_0-1-0_NN.md`; expects `null`, now gets a notice (bundled `business: V_0-2-0` is genuinely newer).
3-5. `tests/component/ModelInfoPanel-templateBadge.test.ts` ×3 — same root cause via the component.

`useTemplateVersionNotice.ts` and `ModelInfoPanel.vue` are behaviourally CORRECT per design D3 (a model pinned below the shipped `template_version` SHOULD get the staleness badge). The five fixtures are now factually stale. Design O4/O5 analysed only the map ADDITIONS (`analysis`/`business-model`/`blank`/`cogNNitive`/`innovation` — inert) and named `procedures` as "the intended behaviour change"; it never analysed the `business`/`organization`/`projects` `V_0-1-0`→`V_0-2-0` CHANGE colliding with existing fixtures. O5 listed both test files as "run, do not rewrite" / "add a case".

**Not fixed here** — outside O3/O5 scope, orchestrator said STOP-and-report if `useTemplateVersionNotice` needs changes beyond the map. Requires a design amendment to O5: update the 5 stale fixtures (re-point to a slug absent from `SHIPPED_TEMPLATE_VERSIONS`, or bump the fixture versions to reflect that `business` now ships `V_0-2-0`).

## Pre-existing failures (NOT PR 2 — confirmed by git-stashing PR 2 edits and re-running)

- `npm run lint`: 14 errors — `packages/innfo-core/src/resolver.ts` (11), `packages/innfo-mcp/src/tools/spec.ts` (3). Not in PR 2 changeset.
- `npm run typecheck`: 3 errors — `apps/innfo-editor/src/components/editor/SearchResultsView.vue` (2), `src/model/recursiveSerializer.ts` (1). Not in PR 2 changeset.
- `npm run format:check`: 266 unformatted files repo-wide (HEAD versions of PR 2's touched files already fail). PR 2's 3 new test files are prettier-clean.
- `innfo-editor` test suite baseline (Phase-1-only): 7 failures — `tests/golden/roundtrip.models.golden.test.ts` ×4, `tests/unit/recursiveSerializer.test.ts` ×2, `tests/golden/crlf-fidelity.golden.test.ts` ×1.
- `innfo-core` 230/230 GREEN; `innfo-mcp` 130/130 GREEN.

## Next

`sdd-verify` cannot pass task 2.12 as-is. Recommend: orchestrator/design amends O5 to unblock the 5 stale fixtures (2.6 + 2.12 no-regression), then re-run the gate. Pre-existing lint/typecheck/format/golden failures are out of this change's scope and should be tracked separately.
