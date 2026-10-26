# Tasks: Overlays As Intent

Strict TDD: every GREEN task is preceded by a RED task. Skill suite root:
`iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/` (`S` = `scripts/`, `T` = `test/`).
Depends on change `video-hyperframes-renderer` (emitter + `<!-- nn-overlay-host -->` anchor).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (hand-written) | ~650-850 (S ~350-450; T ~250; spec ~150; docs ~40) |
| Estimated changed lines (generated, counted separately) | none |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
400-line budget risk: Medium

## Sequencing

Blocked by `video-hyperframes-renderer` (unit 1) for the overlay host anchor. Slice 3 (narration
captions) is independent of slices 1-2 and could land first.

## 1. Overlay blocks default

- [ ] 1.1 RED: `T/overlay-blocks.test.mjs` — `resolveOverlayBlock` maps each `type::` to the default registry block with the right variables; `title` → kinetic/stagger, `caption` → static, `b-roll` → media clip with `fit`/`zoomIn`
- [ ] 1.2 GREEN: `S/overlay-blocks.mjs` per Seam 2; wire into the emitter's `<!-- nn-overlay-host -->`
- [ ] 1.3 RED: `T/scene-project.test.mjs` — a 2-scene fixture with all six overlay types emits blocks and `hyperframes check --json` = 0 errors (skip-with-warning when the CLI is absent)
- [ ] 1.4 REFACTOR: confirm no React overlay code remains referenced (was removed in `video-hyperframes-renderer` unit 6)

## 2. Series / scene escape

- [ ] 2.1 RED: with a `seriesFrame` declaring a custom block for `lower-third`, the emitted overlay uses that block; a `sceneBlock` wins over `seriesFrame`
- [ ] 2.2 GREEN: implement the precedence `sceneBlock > seriesFrame > registry default`; add a series frame fixture
- [ ] 2.3 RED: an unknown block id referenced by a series frame fails loudly with a named error before render

## 3. Narration subtitles leave the model

- [ ] 3.1 RED: a `Layer` of `type:: caption` with arbitrary text emits a **static** overlay at its position — never a narration captions host
- [ ] 3.2 RED: with the video-level narration-captions feature enabled, a single root captions host (`data-track-kind="captions"`) is emitted from narration + timings; with it disabled (default), none is emitted
- [ ] 3.3 GREEN: implement the global captions host; the compiler path for `caption` stays static
- [ ] 3.4 RED+GREEN: `S/lib/knowledge-model.mjs` / compiler guard — a `caption` Layer whose intent is narration is not a supported shape (documented); no `Layer` produces narration subtitles
- [ ] 3.5 REFACTOR: `rg "narration.*caption|caption.*narration" S/` has no Layer-sourced path

## 4. Verification

- [ ] 4.1 `node --test` per suite, then `npm run verify:fast`
- [ ] 4.2 Regenerate any affected fixtures; commit in work units on `dev`
- [ ] 4.3 Bump `blueprint_version` (skill `version` already bumped by `video-hyperframes-renderer`); release via `nn-dev-release`
