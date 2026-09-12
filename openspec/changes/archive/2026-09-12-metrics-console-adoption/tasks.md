# Tasks: Metrics Console Adoption (Amendment — Runtime Charts + Timeline Rename)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~800–1200 (hand-authored ≈400; balance = regenerated bundle + sample console vendor diffs) |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR (work-unit commits internally) |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Amendment decision resolved: single-pr-default with maintainer-approved size:exception (2026-09-11) — bulk of the diff is generated/vendored (uPlot bundle regen, sample console regen), hand-authored core ≈400 lines, so the prior ask-on-risk/pending forecast is superseded.

### Suggested Work Units (commits within the single PR)

| Unit | Goal | Notes |
|------|------|-------|
| 1 | Runtime charts capability (Phase 0) | runtime + registry + bundle regen; tests with code |
| 2 | Timeline artifact rename + harness (Phase 1) | renames + spec frontmatter + harness charts checks |
| 3 | Pilot regen + verify (Phases 2–3) | Ghostbusters console + test updates + lint/test gate |

## Carried Over — Prior Apply Record (11/11 [x], validated against this amendment)

> Original numbering retained. All were applied in the prior run; the amendment extends, renames, or re-runs the relevant ones.

- [x] 1.1 RED: meta→`innfo-model` map + pure-data series guard — VALID; axis-field coverage extended by 0.1
- [x] 1.2 RED: gate probe open/closed paths; inline stays canonical — VALID
- [x] 1.3 GREEN: retarget `MODEL_DATA.template.json` to `innfo-model` + `series{}` + months cap — VALID
- [x] 2.1 GREEN: thin `assets/projections.html` to slots-only — VALID; file renamed to `timeline.html` in 1.1 below
- [x] 2.2 GREEN: update `create_projections_NN.md` (gate, generation, snapshot, feedback) — VALID; renamed to `create_timeline_NN.md` in 1.2 below
- [x] 2.3 GREEN: Apply Feedback replaces Version-And-Archive — VALID
- [x] 3.1 GREEN: extend `verify.harness.js` (meta-key, pure-data, inline rejection) — VALID; charts checks added in 1.5–1.6 below
- [x] 3.2 GREEN: regenerate Ghostbusters console — SUPERSEDED by 2.1 below (redo with `charts` + timeline naming)
- [x] 3.3 GREEN: round-trip export→`--scan`→Apply Feedback + patch bump — VALID (re-verified in 3.2 below)
- [x] 4.1 GREEN: lint/typecheck/format:check/test — VALID (re-run in 3.1 below)
- [x] 4.2 GREEN: harness zero pageerrors, fail-fast names; cleanup — VALID (re-run in 3.2–3.3 below)

## Phase 0: Runtime Extension (shared console capability)

- [x] 0.1 RED: unit tests for series→uPlot mapping (`innfo-model.series{chartId}` → uPlot series; x-axis months window from `meta.months`/`historyMonths`/`startMonth`/`startYear`) + pure-data guard on mapping input (Spec: Series-as-Data, Shared Console Charts Capability)
- [x] 0.2 RED: registry test asserting `needs-registry.json` registers `charts` resolving to the renderer (Spec: Charts from a declarative need)
- [x] 0.3 GREEN: add `renderCharts` to `console/innfo-runtime.js` — reads pure data only, boot gate `hasNeed(config,'charts')`, missing series → skip chart + console warning, no eval (Spec: Missing series degrades gracefully)
- [x] 0.4 GREEN: register `charts` in `console/needs-registry.json`; regenerate `console/innfo-console.bundle.js` via `scripts/build-console-bundle.mjs` (vendored uPlot, no eval, pure data); reconcile registry `runtime` pin vs blueprint bundle reference (Design: bundle-vs-runtime reconciliation)

## Phase 1: Rename Artifact (Projections → Timeline)

- [x] 1.1 Rename `metrics/assets/projections.html` → `assets/timeline.html` (displayed name "Timeline", layout id `timeline-layout`); declare `charts` in `needs[]`; drop "charts backlog" comment (Spec: Timeline Rename, Thinned Console Artifact Shape)
- [x] 1.2 Rename `metrics/procedures/create_projections_NN.md` → `create_timeline_NN.md` (work id Create Timeline; fix parent/next/wiki references) (Spec: Timeline Rename)
- [x] 1.3 Update `metrics/spec_NN.md` frontmatter: `create-projections`→`create-timeline`, `projections-layout`→`timeline-layout` ("Timeline HTML Layout", path `assets/timeline.html`), harness name; body prose Projections→Timeline (Spec: Model remains valid after the rename)
- [x] 1.4 Update gate/procedure wording claiming "no charts capability — backlog" to declare `charts` + minimal set (`concept-rail`, `fulltext-search`, `matrix-grids`, `hash-routing`, `reference-popup`; `feedback-export` conditional) (Spec: Thinned Console Artifact Shape)
- [x] 1.5 Update `verify.harness.js` INLINE_RUNTIME_MARKERS handling so uPlot lives only in the vendored bundle (scan targets console HTML, never the bundle); change `--check-slots`/render FILE default → `timeline.html` (Spec: Inline runtime rejected)
- [x] 1.6 Extend `verify.harness.js` contract helpers: `charts` capability declared in `needs[]` AND present in registry; series shape per declared `meta.charts[].id`; sweep remaining Projections references (`apply_feedback_NN.md` regen step, harness header) → Timeline (Spec: Harness and Sample Verification)

## Phase 2: Pilot Regeneration

- [x] 2.1 Regenerate `samples/Ghostbusters_V_0-1-0_console.html` from `timeline.html` (`timeline-layout`): `needs[]` = `charts` + minimal set; refresh vendored `innfo-console.bundle.js` copy next to sample (Spec: Console generated as timeline)
- [x] 2.2 Update `metrics-console-*.test.ts` suites for the rename + charts contract: gate/feedback tests point at `create_timeline_NN.md`; slot tests reference `timeline.html`; harness suite asserts charts capability resolution + series-shape-per-chartId + zero pageerrors (Spec: Harness passes on sample console)
- [x] 2.3 Re-run round-trip export→`--scan`→Apply Feedback through renamed procedure; assert staleness block + patch bump still hold (Spec: Stale feedback blocked)

## Phase 3: Verification + Cleanup

- [x] 3.1 Run `npm --prefix iNNfo run lint`, `typecheck`, `format:check` (new drift only), `test` on renamed tree (Spec: Harness Verification) — lint 0 errors; typecheck clean; format:check 141 pre-existing dirty, zero new drift (MODEL_DATA edit clean); innfo-core 707 passed/1 skipped (all 5 metrics-console suites green); innfo-editor 663 passed/2 skipped; innfo-mcp 229 passed + server.spec.ts suite fails on concurrent WIP (`__INNFO_MCP_VERSION__` define not wired into vitest.config.ts — foreign in-flight change, not this change's tree)
- [x] 3.2 Run harness on pilot: zero pageerrors, uPlot charts render from `series`, malformed-slot fails fast naming the missing key (`--check-slots` + file:// render on Ghostbusters timeline console) (Spec: Malformed slot payload fails fast) — `--check-slots` SLOTS OK on pilot; malformed fixture SLOTS FAIL naming `generated_at`; file:// render: banner/19 cards/4 matrices/2 uPlot charts, `pageerrors: none` (CHROME_EXE system Chrome); `--probe` gate open (pins reachable + smoke + chartsRegistered)
- [x] 3.3 Remove scratch consoles/feedback JSONs; confirm no stray projections-named artifacts remain outside git history (Rollback: cleanup) — no scratch files in tree (git clean apart from change edits); malformed temp fixture removed; feedback JSONs are TRACKED test fixtures (metrics-console-feedback.test.ts) — kept; no projections-named files remain; sweep added MODEL_DATA.template.json `_comment` ("Create Projections"→"Create Timeline"); business/spec_NN.md prose references (out of scope) flagged for maintainer