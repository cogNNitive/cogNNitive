# Design: Video legacy stack cleanup

## Technical Approach

Deletion-first cleanup of `SKILL` = `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/`
in four revertible slices, applied on top of `video-series-extension-points` and
`blueprint-dependency-lifecycle`. No new behavior except one bug fix (GSAP ease) and one merge
(thumbnail tools). S3 and S4b are gated by spikes with written keep/delete outcomes.

## Architecture Decisions

| # | Topic | Choice | Rejected | Why |
|---|---|---|---|---|
| D1 | Compiler name | `git mv` to `scene-compiler.mjs`; `SceneCompiler`, `CompositionManifest`, `SceneTrack` typedefs. No re-export shim | Alias file | No back-compat; 5 importers + 7 tests + `nn-mcp` spec.spec.ts:622 + `test/video-script-contract-additions.test.mjs` updated in the same commit |
| D2 | Ease bug | Delete `easing` from the compiler's transition descriptor (`:529`); `scene-transition.mjs` `DEFAULT_EASING='power2.out'` applies | Map bezier to `CustomEase`; validate eases | `bezier(...)` is not a GSAP ease; nothing else sets `easing` |
| D3 | Residue guard | One `SKILL/test/no-legacy-renderer.test.mjs` walks the skill tree (skipping itself) for `/remotion/i`; delete the per-file asserts in `ensure-hyperframes.test.mjs:60`, `asset-synthesizer.test.mjs:52`, `video-engine-cli.test.mjs:161-166` | Keep scattered asserts | One rule, one test; the guard file is the only allowed match |
| D4 | `preview` | Delete `previewVideo`, the command branch, usage line and test; unknown command path prints usage | Wrap `hyperframes preview` | It started nothing; HyperFrames ships the real one |
| D5 | Thumbnails | S4a (always): fold `thumbnail-v1.mjs` (series-title default) into `render-thumbnail.mjs`, delete v1. S4b (spike PASS): `render-thumbnail.mjs` writes a one-frame composition and renders it with the pinned CLI; delete `sharp` | One gated slice | FAIL outcome = S4a alone ("merge into one compositor"); S4b stays reviewable |
| D6 | Version requirement | Drop the pinned literals from the living requirement; verify.js already checks registration | Re-pin per change | Literals were stale on every merge |
| D7 | `sharp` removal | Remove from wherever declared (skill `package.json` after the lifecycle change; root `devDependencies`); lockfile via `npm install --package-lock-only`. Keep `scripts/types/transform.d.ts` (nn-sources installs its own at run time) | `npm uninstall` | Worktree `node_modules` are junctions into the primary checkout |
| D8 | `render-formats.mjs` `+faststart` | Stays in every outcome | Delete with S3 | Web-delivery remux of final outputs, not the proxy workaround |

## File Changes

| Slice | File | Action |
|---|---|---|
| S1 | `scripts/remotion-scene-compiler.mjs` -> `scene-compiler.mjs` | Rename; delete `renderer` column, `sceneType`, `easing`, unread overlay `config` keys (recheck against `overlay-blocks.mjs` after sibling S6), Remotion comments |
| S1 | `video-engine-cli.mjs`, `asset-cost-estimator.mjs`, `synthesize-avatar.mjs` | Import rename; CLI: delete `preview`, `bundle-*` cases, `loadModule` JSDoc, Remotion comments |
| S1 | `asset-synthesizer.mjs:737,743`, `lib/faststart.mjs`, `lib/media-duration.mjs`, `lib/avatar-jobs.mjs` | Comment/SVG text only |
| S1 | `scripts/render-vertical.mjs` | Delete |
| S1 | `SKILL.md`, `references/cost-guardrails.md`, tests, `nn-mcp/src/tools/spec.spec.ts`, root contract test, `scripts/lib/loopback.js:11` | Rename refs; drop `preview`/`render-vertical` |
| S2 | `scripts/assemble-video.mjs`, `test/assemble-video.test.mjs`, SKILL.md 6b + description trigger words | Delete |
| S3 PASS | `lib/faststart.mjs`; `asset-synthesizer.mjs:539-558`; `synthesize-avatar.mjs:39,247`; `video-engine-cli.mjs:32,175,417`; SKILL.md 5b; `cost-guardrails.md` | Delete / simplify. FAIL: nothing (S1 fixed the comment) |
| S4a | `render-thumbnail.mjs` (+`--series`), `thumbnail-v1.mjs` + test, SKILL.md rows | Merge, delete |
| S4b PASS | `render-thumbnail.mjs` + test rewritten; `sharp` declarations; lockfile | Rewrite, delete |

Each slice bumps `blueprint_version` and skill `version` (minor in S1, patch after) and regenerates `catalog.json`.

## Spike Protocols (time-box 1h each, pin from the skill package)

**S3 (moov-at-end).** Use a raw cached WaveSpeed avatar clip (cached before remux); else make one with
`ffmpeg -f lavfi -i testsrc=d=6 -f lavfi -i sine=d=6 -c:v libx264 -c:a aac raw.mp4` (no `+faststart`).
Confirm `moov` follows `mdat` (`ffprobe -v trace`). Mount it as a muted `video` layer in a 2-scene
fixture, `render`. PASS = exit 0, no timeout, duration within 1 frame, `freezedetect` reports no
freeze over the clip span. Record verdict in tasks.md "Spike Outcome".

**S4 (still).** Hand-build a 2560x1440 composition (base `<img>` cover, title, subtitle, pill,
`frameCss`). Try `hyperframes snapshot`; else a 1-frame `render` + `ffmpeg -frames:v 1`. PASS =
exact size, text crisp at 320px wide, same bytes on two runs, under 20 s. FAIL = S4b does not ship
and the `two-phase-thumbnail` delta reverts item 3.

## Sequencing

Land after both siblings merge to `dev`, then rebase. Expected conflicts: compiler (sibling S2/S3/S8
edit it; rename after, never before), `overlay-blocks.mjs` (sibling S6 rewrite decides which
`config` keys survive), SKILL.md (lifecycle drops `engine:` and fixes Remotion text), `sharp`
location. Version numbers are read from `dev` at apply time (today blueprint `V_0-3-10`, skill
`V_0-5-2` after PRs #359/#361), never from this document.

## Testing Strategy

Strict TDD, `node --test SKILL/test/<file>`; gate `node scripts/verify.js --only=video`, full verify per slice.

| Layer | What |
|---|---|
| Unit | ease = `power2.out` and no `bezier(` (RED on today's code); no `sceneType`; overlay config keys subset of emitter reads; CLI `preview` exits non-zero; `--series` default |
| Guard | D3 residue walk; file-absence tests per deleted script; S3 no `faststart` import |
| Manual | spikes; `hyperframes check` on one fixture after S1 |

## Changed-lines Estimate

S1 ~300, S2 ~360 (delete-only), S3 ~190 PASS / 0 FAIL, S4a ~170, S4b ~650 (~510 whole-file rewrite) + lockfile.

## Open Questions

- [ ] Accept `size:exception` for S4b (deletion-dominated), or split the test rewrite out?
