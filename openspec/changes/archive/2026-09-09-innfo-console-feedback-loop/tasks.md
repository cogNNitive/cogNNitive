# Tasks: innfo-console Feedback Loop

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 console → PR2 thin → PR3 scan → PR4 docs/verify |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + runtime + blueprint | PR 1 | Base: dev; with tests |
| 2 | Thin 3 assets onto blueprint | PR 2 | Base: PR 1; no inline runtime |
| 3 | Scan branch + frontmatter | PR 3 | Base: PR 2; fixtures |
| 4 | Procedures, docs, E2E | PR 4 | Base: PR 3; file:// + E2E |

## Phase 1: Console Package Foundation

- [x] 1.1 RED: Vitest schema rejects `kind: rewrite`, bad filename/timestamp/slug cases
- [x] 1.2 GREEN: Create `iNNfo/specs/templates/console/feedback.schema.json` (meta + items)
- [x] 1.3 RED: Vitest slugify/filename/timestamp unit cases for export naming
- [x] 1.4 GREEN: Implement slug/filename/timestamp helpers in `console/innfo-runtime.js`
- [x] 1.5 Verify Phase 1: lint, typecheck, format:check, test

## Phase 2: Runtime Core + Blueprint Shell

- [x] 2.1 RED: Vitest runtime hydrate rail/search/cards/matrices/hash + needs[] gating cases
- [x] 2.2 GREEN: Implement UMD `window.InnfoConsole` core in `console/innfo-runtime.js` (no fetch/module)
- [x] 2.3 GREEN: Add needs[] lazy loader + localStorage drafts to `console/innfo-runtime.js`
- [x] 2.4 RED: Blueprint slot/config render cases (needs[], innfo-schema/innfo-model)
- [x] 2.5 GREEN: Create `console/artifact_blueprint.html` with header banner + Export modal
- [x] 2.6 Verify Phase 2: lint, typecheck, format:check, test; scan `fetch(`/`type=module`

## Phase 3: Asset Thinning

- [x] 3.1 RED: no-inline-runtime scan cases for `master/model_viewer/projections.html`
- [x] 3.2 GREEN: Thin `business/assets/master.html` onto blueprint (needs[] + slots only)
- [x] 3.3 GREEN: Thin `*/assets/model_viewer.html` onto blueprint via `#innfo-schema/#innfo-model`
- [x] 3.4 GREEN: Thin `metrics/assets/projections.html` onto blueprint (MODEL_DATA/DEPS/FORMULAS slots)
- [x] 3.5 Verify Phase 3: lint, typecheck, format:check, test + runtime scan

## Phase 4: Feedback Pipeline / Scan

- [x] 4.1 RED: Node runner cases routing `import/feedback/*.json` to `convertFeedbackJson`
- [x] 4.2 GREEN: Branch `scanner-converters.js convertOkFormat` to feedback vs generic JSON; remove `convertChatJson`
- [x] 4.3 GREEN: Emit `source_type: feedback`, `is_synthetic: true` in `scanner-core.js`; skip-and-report invalid
- [x] 4.4 Verify Phase 4: scanner unit + `test.ps1` fixtures, lint/typecheck/format

## Phase 5: Procedures / Skill Docs

- [x] 5.1 GREEN: Create `*/procedures/apply_feedback_NN.md` (staleness, preview, apply, validate, bump, regenerate)
- [x] 5.2 GREEN: Update `compile_*_NN.md`, `create_projections_NN.md` to emit `{Model}_V_{v}_console.html`
- [x] 5.3 GREEN: Update `actioNN/skills/nn-trannsform/SKILL.md` with feedback branch + frontmatter contract
- [x] 5.4 Verify Phase 5: lint, typecheck, format:check, test

## Phase 6: Verification

- [x] 6.1 file:// smoke: thinned consoles offline + online
- [x] 6.2 E2E export→scan→apply→bump→regenerate + abort case
- [x] 6.3 Final gate: lint, typecheck, format:check, coverage, runtime scan
