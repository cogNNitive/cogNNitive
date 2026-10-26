# Tasks: HyperFrames Renderer

Strict TDD: every GREEN task is preceded by a RED task. Skill suite root:
`iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/` (`S` = `scripts/`,
`T` = `test/`). Targeted runner: `node --test <file>`; broad: `npm run verify:fast`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (hand-written) | ~1300-1600 (S ~700-900 add, ~350 del; T ~450; spec ~200; docs ~60) |
| Estimated changed lines (generated, counted separately) | none (no bundle) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (units 1-2: emitter + transitions) → PR 2 (units 3-5: probe + render driver + provisioner) → PR 3 (unit 6: retire Remotion + estimator bugfix) |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Project emitter + mapping | PR 1 | Golden files; includes golden emission test |
| 2 | Transitions | PR 1 | Pure module, unit tests |
| 3 | Duration probe | PR 2 | `ffprobe` + fallback |
| 4 | Render driver + preview | PR 2 | Lazy HF CLI, no `@remotion` |
| 5 | `ensure-hyperframes` + frontmatter | PR 2 | replaces `ensure-engine` |
| 6 | Retire Remotion + estimator bugfix | PR 3 | delete files; `asset-cost-estimator.mjs` guard |

## Sequencing

Slices 3-5 (`video-overlays-as-intent`, `video-model-cascade`, `video-draft-tools`) are
separate changes; this change must land first because they assume the emitter exists and
leaves the `<!-- nn-overlay-host -->` anchor. The estimator bugfix (unit 6.4) is independent
and may land first as its own commit.

## 1. Project emitter

- [ ] 1.1 RED: `T/scene-project.test.mjs` — given a fixture manifest (2 scenes, 1 narration + music audio, 1 image layer, 1 transition), `emitHyperframesProject` writes `index.html`, `compositions/<slug>.html` per scene, `hyperframes.json`; assert root `data-duration` equals `totalDurationInSeconds`, one host per scene with the right `data-start`/`data-duration`, and **all** audio as root `<audio>` with unique ids
- [ ] 1.2 RED: determinism — emitting twice yields byte-identical files; layer order follows `layer_level` via `z-index`
- [ ] 1.3 GREEN: `S/scene-project.mjs` — `emitHyperframesProject(manifest, plan)`; string templating, no HF import; root audio (D-HF3); staged `assets/<name>` paths; `<!-- nn-overlay-host -->` anchor per scene
- [ ] 1.4 RED: project validity — `npx hyperframes check --json` on the emitted project reports 0 errors (skip-with-warning when the CLI is absent; the test never fails silently on CI)
- [ ] 1.5 REFACTOR: extract the scene-host and audio-element builders; confirm the emitter is the only HF-placement authority

## 2. Transitions

- [ ] 2.1 RED: `T/scene-transition.test.mjs` — `sceneTransitionFragment` returns an opacity tween for `fade`, an x tween for `slide-left`/`slide-right`, a `clip-path` tween for `wipe`, and no tween for `none`; the tween targets a child wrapper, never the clip
- [ ] 2.2 GREEN: `S/scene-transition.mjs` per Seam 2; wire the fragment into the scene host markup
- [ ] 2.3 RED: end-to-end — a manifest with `transition:: fade` renders an output where the transition is present (assert the emitted GSAP call + `check` 0); a `none` scene has no tween

## 3. Duration probe

- [ ] 3.1 RED: `T/media-duration.test.mjs` — `probeDuration` returns `{ seconds, source: 'ffprobe' }` from a fixture wav/mp3 via a stubbed `run`; returns `source: 'provider'` when `ffprobe` is absent and a provider duration is given; returns `{ seconds: 0, source: 'unknown', error }` on failure; never throws
- [ ] 3.2 GREEN: `S/lib/media-duration.mjs`; replace `probeAudioDuration`'s `@remotion/media-parser` path in `S/asset-synthesizer.mjs` and `S/synthesize-avatar.mjs`
- [ ] 3.3 REFACTOR: `rg "@remotion/media-parser" S/` returns nothing

## 4. Render driver and preview

- [ ] 4.1 RED: `T/video-engine-cli.test.mjs` — `renderVideo` with a stubbed CLI runner emits the project then invokes `hyperframes render`; a non-zero exit throws `VideoRenderError` with no FFmpeg fallback; `--allow-mock` writes the mock only when the runner is absent
- [ ] 4.2 GREEN: `S/hyperframes-render.mjs` (`tryHyperframesRender`) + rewire `renderVideo`; `previewVideo` returns the Studio URL from `hyperframes preview`
- [ ] 4.3 REFACTOR: delete `tryRemotionRender`, `resolveRemotionEntryPoint`, `COMPOSITION_ID` (Remotion); keep `--allow-mock`

## 5. Runtime provisioner

- [ ] 5.1 RED: `T/ensure-hyperframes.test.mjs` — `--check` exits 1 when the pinned CLI is absent (stubbed resolver), 0 when present; install path is consent-gated and idempotent; no `@remotion` string
- [ ] 5.2 GREEN: `S/ensure-hyperframes.mjs`; delete `S/ensure-engine.mjs`
- [ ] 5.3 GREEN: `S/SKILL.md` frontmatter drops `engine: @remotion/renderer`, adds the HF pin; rename the renderer references in prose; bump `version`

## 6. Retire Remotion + standalone bugfix

- [ ] 6.1 Delete `S/remotion-entry.tsx`, `S/ScriptRoot.tsx`, `S/scene/**.tsx`, `S/scene/overlay-animation.mjs` (moves to the overlays change); keep what the compiler still needs
- [ ] 6.2 `rg "@remotion|remotion" S/ test/ SKILL.md` returns only intentional, historical notes
- [ ] 6.3 RED+GREEN: `T/video-script-skill.test.mjs` / existing suites updated for the HF flow; `node scripts/verify.js` green
- [ ] 6.4 RED+GREEN (standalone): `T/asset-cost-estimator.test.mjs` — invoking the estimator through a symlinked/junction path runs `main()` (guard uses `fs.realpathSync`); fix `S/asset-cost-estimator.mjs:552`
- [ ] 6.5 Verification: `node --test` per suite, then `npm run verify:fast`; `npm run check:versions`; bump `blueprint_version` + release via `nn-dev-release`
