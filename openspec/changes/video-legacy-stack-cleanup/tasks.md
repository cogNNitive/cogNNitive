# Tasks: Video Legacy Stack Cleanup

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,670 (S1 ~300, S2 ~360 delete-only, S3 ~190 PASS / 0 FAIL, S4a ~170, S4b ~650 + lockfile) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | S1 -> S2 -> S3 -> S4a -> S4b (each its own PR) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Hard prerequisite: `video-series-extension-points` and `blueprint-dependency-lifecycle` merged into `dev` before any apply (shared files: compiler, CLI, SKILL.md, `sharp` declaration).

Paths: `SKILL` = `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/`; `PKG` = `iNNfo/specs/bluepriNNts/video-script/`; `BP` = `PKG/spec_NN.md`; tests in `SKILL/test/` run with `node --test <file>`; gate with `node scripts/verify.js --only=video`, full `node scripts/verify.js` per slice.

### Suggested Work Units

| Unit | Goal | Likely PR | Depends on |
|------|------|-----------|------------|
| S1 | Rename compiler, delete dead fields/ease bug/tools, residue guard | PR 1 | prerequisite |
| S2 | Delete the clip assembler (`assemble-video.mjs`) | PR 2 | S1 |
| S3 | Provider clips cached as delivered (spike-gated) | PR 3 | S1 |
| S4a | Fold `thumbnail-v1.mjs` into `render-thumbnail.mjs` | PR 4 | S1 |
| S4b | Thumbnail as a composition still; drop `sharp` (spike-gated) | PR 5 | S4a |

Each slice is revertible alone (revert its commits; the bumps stay valid). S3 and S4b are gated by spikes with written keep/delete outcomes.

## Slice 1: Rename, dead fields, ease fix, preview removal (spec: skill No Legacy Renderer Residue, Scene Transitions Emit A GSAP Ease, Render Step Uses The HyperFrames Pipeline; design D1, D2, D3, D4, D6)

- [ ] 1.1 RED `SKILL/test/scene-transition-ease.test.mjs`: a Scene with `transition:: fade` compiles to a tween carrying `ease: 'power2.out'`, and no emitted file contains `bezier(` (RED on today's compiler). Covers "Scene Transitions Emit A GSAP Ease".
- [ ] 1.2 GREEN `git mv scripts/remotion-scene-compiler.mjs scripts/scene-compiler.mjs`; rename `RemotionSceneCompiler` -> `SceneCompiler`; typedefs `CompositionManifest`/`SceneTrack`; update the 5 importers (`video-engine-cli.mjs:23`, `asset-cost-estimator.mjs:15`, `synthesize-avatar.mjs:33`, tests), `nn-mcp/src/tools/spec.spec.ts:622` and `test/video-script-contract-additions.test.mjs` in the same commit.
- [ ] 1.3 GREEN delete dead code: the `renderer` column (`:48-58`), `sceneType` (`:523-524,546`), the `easing`/`bezier(` assignment (`:529`; `scene-transition.mjs` default `power2.out` applies), the unread overlay `config` keys (re-checked against `overlay-blocks.mjs:55-57` after sibling S6), and the `bundle-*` reporter cases (`video-engine-cli.mjs:608-613`).
- [ ] 1.4 GREEN delete `previewVideo`, its command branch, usage line and test (`video-engine-cli.mjs:581-588`); an unknown command prints usage listing only `compile` and `render`. Covers "Removed command is refused".
- [ ] 1.5 GREEN delete `scripts/render-vertical.mjs`; drop it from `SKILL.md:82,129` and `references/cost-guardrails.md`; scrub Remotion text in the placeholder SVG (`asset-synthesizer.mjs:737,743`) and comments (`lib/faststart.mjs:4`, `lib/media-duration.mjs`, `lib/avatar-jobs.mjs`, `scripts/lib/loopback.js:11`). Covers "Removed tools are gone".
- [ ] 1.6 RED `SKILL/test/no-legacy-renderer.test.mjs` walks the skill tree (skipping itself) for `/remotion/i`; delete the per-file asserts (`ensure-hyperframes.test.mjs:60`, `asset-synthesizer.test.mjs:52`, `video-engine-cli.test.mjs:161-166`). Covers "Skill tree is free of Remotion text" and "Manifest carries no dead fields".
- [ ] 1.7 Retire `openspec/specs/remotion-video-scenes` (its requirements are REMOVED in this change's delta; delete the living capability at archive).
- [ ] 1.8 Bump `SKILL/SKILL.md` version (minor) and `BP` `blueprint_version` (minor); `node scripts/blueprint-catalog.mjs --release-tag <current>`; commit `catalog.json`.
- [ ] 1.9 `node scripts/verify.js --only=video`; manual `hyperframes check --json` = 0 errors on one fixture.

## Slice 2: Delete the clip assembler (spec: skill Render Step Uses The HyperFrames Pipeline; design D-file table S2)

- [ ] 2.1 Delete `scripts/assemble-video.mjs`, `test/assemble-video.test.mjs`, `SKILL.md` step 6b and the "assemble"/"concat clips" description trigger words.
- [ ] 2.2 File-absence test: neither `assemble-video.mjs` nor its test exists; nothing references it.
- [ ] 2.3 Bump + `node scripts/blueprint-catalog.mjs`; `node scripts/verify.js --only=video`.

## Slice 3: Provider clips cached as delivered (spike-gated, time-box 1h; spec: skill Provider Clips Are Cached As Delivered; design D8)

- [ ] 3.1 Spike per design "S3 (moov-at-end)": render one raw WaveSpeed clip (moov after mdat) through HyperFrames; PASS = exit 0, no timeout, duration within 1 frame, no freeze over the clip span. Record the verdict under "Spike Outcome".
- [ ] 3.2 PASS: delete `lib/faststart.mjs`, the marker retry and its prose (`asset-synthesizer.mjs:20,539-558`, `synthesize-avatar.mjs:39,247`, `video-engine-cli.mjs:32,175,417`), `SKILL.md` step 5b and `references/cost-guardrails.md` prose. FAIL: only fix the stale comment (no code change) and drop the delta requirement before archive.
- [ ] 3.3 PASS: RED->GREEN no-`faststart`-import test; no `.needs-faststart` marker is written. `render-formats.mjs` `+faststart` stays (design D8).
- [ ] 3.4 Bump + `node scripts/blueprint-catalog.mjs`; `node scripts/verify.js --only=video`.

## Slice 4: One thumbnail tool (S4a always; S4b spike-gated; spec: two-phase-thumbnail REQ-2, skill Blueprint-Ships Draft Authoring Tools; design D5)

- [x] 4.1 S4a GREEN: fold `thumbnail-v1.mjs` (series-title default) into `render-thumbnail.mjs` as `--series`; delete `thumbnail-v1.mjs` + its test; update `SKILL.md` rows and the `two-phase-thumbnail` requirement text.
- [x] 4.2 S4a RED->GREEN test: with `--series <dir>` and no `--subtitle`/`--badge`, both read the Series `title`; `render-thumbnail.mjs` is the only Phase B tool. Covers "One thumbnail tool" and "Series title fills subtitle and badge".
- [ ] 4.3 Spike per design "S4 (still)": try `hyperframes snapshot`, else a 1-frame render + `ffmpeg -frames:v 1`. PASS = exact size, crisp text at 320px, byte-identical on two runs, under 20 s. Record the verdict under "Spike Outcome".
- [ ] 4.4 S4b PASS: rewrite `render-thumbnail.mjs` to emit and render a one-frame composition through the pinned CLI; drop `sharp` from the skill `package.json` (after the lifecycle change) and root `devDependencies`; `npm install --package-lock-only`; keep `scripts/types/transform.d.ts` (design D7). FAIL: revert delta item 3 to the previous wording and drop the "No sharp" scenario.
- [x] 4.5 Bump + `node scripts/blueprint-catalog.mjs`; `node scripts/verify.js --only=video`; full `node scripts/verify.js`.

## Success Criteria (from proposal)

- [ ] `rg -i remotion` finds no match under `SKILL/` except the guard test.
- [ ] A scene transition emits a valid GSAP ease (RED-then-GREEN).
- [ ] The CLI exposes only `compile` and `render`; `node scripts/verify.js` is green.
- [ ] S3/S4 spike verdicts recorded; either the code is gone or the reason it stays is written down.

## Spike Outcome

(to be filled by S3 and S4)
