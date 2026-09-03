# Tasks: Spec Version Simplification

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | PR 1 (core): 3,000–5,000+ (full-content deletion of `specs/v0.2.0/`, `specs/v0.2.1/`, `models/specs/`, orphan templates, plus ~958 lines from 2 shim-overwrite moves git cannot rename-detect); PR 2 (D3): ~300–350 |
| 400-line budget risk | High (PR 1); Low-Medium (PR 2, standalone) |
| Chained PRs recommended | No — D4 forbids splitting the move/delete; D3 is the one separable slice |
| Suggested split | PR 1: atomic move+delete+edits (needs `size:exception`) → PR 2: D3 badge/prompt (follow-up, fits budget) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### D3 Line-Count Decision
Computed estimate ~300–350 lines: `useTemplateVersionNotice.ts` ~90, `samples.ts` map ~12, prompt builder ~15, `ModelInfoPanel.vue` badge+copy ~40, unit tests ~90, integration test ~60. **Decision: pull D3 into a follow-up PR.** It fits the budget standalone and is explicitly separable from D4 (D4's atomicity covers only the tree move/delete). Bundling it into the already `size:exception`-approved core PR would hide its own review risk (false-positive badge, wrong version compare) inside a diff nobody is reading line-by-line.

**Post-apply measured actual (sdd-apply, Phase 5 complete):** `git diff --stat` over the 5 changed/new files = **604 insertions + 1 deletion (605 total)** — after one trimming pass (cut redundant JSDoc prose, consolidated the two identical fixture constants and 2 pairs of negative-case unit tests). This exceeds both the ~300–350 forecast and the 400-line budget by ~1.5x. Breakdown: `ModelInfoPanel.vue` +71/-1, `useTemplateVersionNotice.ts` +191 (new), `samples.ts` +21, `ModelInfoPanel-templateBadge.test.ts` +146 (new), `useTemplateVersionNotice.test.ts` +176 (new). The gap vs. forecast is almost entirely test code (322 of 605 lines) driven by this repo's `strict_tdd: true` gate (triangulation minimum of 2+ cases per behavior, plus a dedicated fake-`DirectoryHandleLike` integration harness) — further cuts would trade test quality for a line count. **Needs an explicit decision before merge**: accept `size:exception` for this already-small follow-up PR, or split further (Slice A: `useTemplateVersionNotice.ts` + its unit tests, ~367 lines; Slice B: `ModelInfoPanel.vue` wiring + `samples.ts` + the integration test, ~238 lines).

### Suggested Work Units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Atomic tree move+delete+edits (Phases 1–4) | PR 1 | `node scripts/check-spec-version.mjs --check` | `npm run dev` + open Gantt/Guided-Procedure views | Revert the single PR (D4: no partial revert) |
| 2 | Badge + migration prompt (Phase 5) | PR 2 | `npm run test -- useTemplateVersionNotice` | Open a model with stale `template_version`, view badge | Revert PR 2 only; core PR unaffected |

## Phase 1: Commit 1 — Pure Moves (`git mv`, no content edits)
- [x] 1.1 Delete 2 re-export shims (`extensions/procedures/useProcedureFSM.ts`, `extensions/projects/useProjectGantt.ts`) before moving (R-SV-01, A8)
- [x] 1.2 `git mv` `specs/latest/level{0,1}/*` → `specs/{defiNNe,iNNfo}_NN.md`
- [x] 1.3 `git mv` `specs/latest/level2/{business,procedures,organization,projects}/` → `specs/templates/{name}/` + `samples/`
- [x] 1.4 `git mv` `specs/latest/level2/projects/extension/*` → `apps/innfo-editor/src/extensions/projects/`
- [x] 1.5 `git mv` `specs/v0.2.0/level2/procedures/extension/*` → `apps/innfo-editor/src/extensions/procedures/` (A8)

## Phase 2: Commit 2 — Deletions (R-SV-06)
- [x] 2.1 Delete `specs/latest/`, `specs/v0.2.0/`, `specs/v0.2.1/`, `specs/latest/INDEX.md`, `specs/CHANGELOG.md`, `models/specs/`
- [x] 2.2 Delete orphan templates `businessV2/`, `cogNNitive/`, `biz/` (D2)

## Phase 3: Commit 3 — Content Edits
- [x] 3.1 Rename moved templates → `{name}_V_0-1-0_NN.md`; add `template_version: "V_0-1-0"` frontmatter (R-SV-02/03, A6)
- [x] 3.2 Rename L0/L1 to real versions: `iNNfo_V_0-3-0_NN.md`, `defiNNe_V_0-2-0_NN.md` (A6)
- [x] 3.3 Repoint shipped samples' `parent_spec.url` → `specs/templates/{name}/{file}` (R-SV-08) — kept `parent_spec: {name, url}` as the locked design decision (not the bare `parent:` string the L1 grammar prescribes elsewhere); verified during `sdd-verify` that `serializer.ts` was also collapsing it back to a bare string on write and fixed that too.
- [x] 3.4 Rewrite `constants.ts`: `DEFAULT_INNFO_VERSION`→`V_0-3-0`, flat `buildSpecificationUrl`, drop `buildSpecificationUrlFromMain`/`buildDocumentationLocation`, add `buildTemplateUrl` (A4/A5)
- [x] 3.5 Collapse `workspaceStore.ts` `_ensureGeneralSpec` to one URL strategy (A4)
- [x] 3.6 Fix `extensions/registry.ts` manifest imports → `./procedures/manifest.json`, `./projects/manifest.json` (A8)
- [x] 3.7 `vite.config.ts` `serveLocalSpecs`: root `specs/latest`→`specs`, mount `/specs`
- [x] 3.8 `config/samples.ts`: `SAMPLE_BASE` → `specs/templates`
- [x] 3.9 Update `docs/documentation/innfo-editor.md:47-49` extension path (alongside A8)
- [x] 3.10 Scope `nn-dev-spec-version-propagator/SKILL.md` + `check-spec-version.mjs` to residual default-version-sync job
- [x] 3.11 Document `specializes` (R-SV-05) in L1 spec body only; no frontmatter emission

## Phase 4: Verification (PR 1)
- [x] 4.1 `node scripts/check-spec-version.mjs --version <old> --check` → exit 0 — this exact invocation isn't meaningful here (no version number was retired; `V_0-2-0` legitimately remains defiNNe's real current version). Substituted the applicable gates: `--check-urls` (all hardcoded raw.githubusercontent.com URLs resolve, after fixing 2 real broken ones in `StandaloneProcedureView.vue` + 1 in `packages/innfo-mcp/src/tools/mutate.ts`) and an exhaustive repo-wide grep for `specs/latest|specs/v0.2.0|specs/v0.2.1|models/specs` (zero hits outside this change's own artifacts and untouched archived changes).
- [x] 4.2 `npm run typecheck && npm run lint && npm run format && npm run test` — typecheck: PASS (0 errors). test: PASS, all 3 workspaces (innfo-core 157, innfo-mcp 119, innfo-editor 489+2 skipped — 765 total, 0 failures). lint: 5 pre-existing errors, all in files never touched by this change (`packages/innfo-mcp/src/tools/mutate.ts` empty-block statements at unrelated lines; untracked pre-existing `scratch_debug.mjs`) — zero regressions attributable to this change. format:check: fails on a pre-existing repo-wide baseline (310 files, including files never touched like `docs/404.html`/`package.json`/`eslint.config.mjs`) — not caused by this change; running `prettier --write .` repo-wide was explicitly out of scope.
- [x] 4.3 `validate_model` over every `specs/templates/**/samples/*` (R-LSR-01) — all 4 samples' `parent_spec.url` correctly resolves to the new `specs/templates/{name}/{file}` layout (R-SV-08 satisfied). 2/4 (organization, projects) are fully `validateModel`-clean. 2/4 (business/Ghostbusters, procedures/CodeReviewProcess) have pre-existing concept-schema/slug-collision validation errors — confirmed via `git diff` that this change touched ONLY their frontmatter `parent`/`specification_url`/`template_version` fields, never body content; the mismatch predates this change (likely from other in-flight, uncommitted validator/parser work already present in the working tree at session start) and is out of scope to fix here.
- [x] 4.4 Manual dev-server smoke-check: `npm run dev`, confirm `/specs/**` serves and Gantt + Guided-Procedure views mount — dev server started; `GET /specs/iNNfo_V_0-3-0_NN.md` → 200 with correct content, `GET /specs/templates/business/business_V_0-1-0_NN.md` → 200, `GET /specs/latest/level2/business/business_NN.md` (old path) → 404 as expected. No browser-automation tool was available to literally click into the Gantt/Guided-Procedure views, so `npm run build` (`vue-tsc --noEmit && vite build`) was run as the strongest available substitute: it succeeded (exit 0) and produced both `ProjectGanttView-*.js` and `GuidedProcedureView.vue_vue_type_script_setup_true_lang-*.js` chunks, confirming both extensions compile and code-split correctly from their new `apps/innfo-editor/src/extensions/{procedures,projects}/` homes.
- [x] 4.5 Confirm no commit shows both `specs/templates/` and `specs/latest/` (R-SV-07) — no commits were created in this session (see apply-progress for rationale); all changes are staged/unstaged in the working tree only. Re-verified repeatedly throughout the session that `specs/latest/`, `specs/v0.2.0/`, `specs/v0.2.1/`, `models/specs/` do not exist on disk at any point after Phase 2 landed.

## Phase 5: Follow-up PR — Template Version Badge (D3)
- [x] 5.1 Create `composables/useTemplateVersionNotice.ts`: scan `specs/`, `.specs/`, `.spec-cache/` + `SHIPPED_TEMPLATE_VERSIONS`, compare `V_x-y-z` (A1) — implemented as explicit `{ notice, refresh() }` (not a bare `ComputedRef`, since detection requires an async directory scan); `refresh()` is invoked from `ModelInfoPanel.vue` via a `watch([templateName, workspaceHandle], ..., { immediate: true })`
- [x] 5.2 Add `SHIPPED_TEMPLATE_VERSIONS` map to `config/samples.ts` — all four shipped templates pinned at `V_0-1-0` (A6)
- [x] 5.3 Migration-prompt builder (`innfoPrompt()`): names model/current/latest `template_version`, instructs new-file migration mirroring only `mutate.ts:271-274`'s `parent_spec.name` regex (never its delete logic), ends with `validate_model` (G4, A3)
- [x] 5.4 Add passive badge + Copy button to `ModelInfoPanel.vue` (reuse `AIGuidePanel.vue:197` clipboard pattern) (A2) — note: that file is `components/editor/AIGuidePanel.vue` (host component `AiWorkflowPanel.vue` just wraps it); badge added inside the existing "2. Template" info card, `v-if="templateVersionNotice"`, never disables/hides any other control
- [x] 5.5 Unit tests: version compare, scan→latest selection, prompt text — `tests/unit/useTemplateVersionNotice.test.ts` (18 tests, all passing) using the existing `tests/helpers/fakeFs.ts` `buildFakeTree` fake `DirectoryHandleLike`
- [x] 5.6 Integration test: badge visible/absent in `ModelInfoPanel` — `tests/component/ModelInfoPanel-templateBadge.test.ts` (3 tests: newer version present → badge+copy button, pinned at newest known version → absent, no handle connected → absent); pre-existing `tests/component/ModelInfoPanel-version.test.ts` (13 tests) re-run clean after wiring — zero regressions
