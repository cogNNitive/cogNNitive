# Proposal: Video legacy stack cleanup

## Intent

HyperFrames is the only renderer, but the `nn-video-script` skill still carries Remotion-era scripts, names, dead manifest fields and a lying `preview` command. Agents read that residue as live surface. Delete it, and replace the two `sharp` thumbnail compositors only if a HyperFrames still holds up in a spike. Lands AFTER `video-series-extension-points` and `blueprint-dependency-lifecycle`, which list this work only as non-goals.

## Evidence (paths under `skills/nn-video-script/`, verified 2026-10-27)

| Residue | Where |
|---|---|
| Remotion naming on the live compiler | `scripts/remotion-scene-compiler.mjs:4-6,189`; imported at `video-engine-cli.mjs:23`, `asset-cost-estimator.mjs:15`, `synthesize-avatar.mjs:33` |
| React renderer names nothing reads | `remotion-scene-compiler.mjs:48-58` (`renderer`) |
| `sceneType` written, never read | `remotion-scene-compiler.mjs:523-524,546` |
| **Live bug**: `bezier(...)` passed to GSAP `ease:` (not a GSAP ease name) | `remotion-scene-compiler.mjs:529` -> `scene-transition.mjs:30,38` |
| Overlay config keys the emitter never reads | `remotion-scene-compiler.mjs:411,427-429` vs `overlay-blocks.mjs:55-57` |
| Dead reporter cases | `video-engine-cli.mjs:608-613` |
| `preview` prints "ready" and starts nothing | `video-engine-cli.mjs:581-588` |
| Remotion text in the placeholder SVG | `asset-synthesizer.mjs:737,743` |
| `render-vertical.mjs` duplicates native `--format 9:16` | `video-engine-cli.mjs:650-666`; `SKILL.md:82,129` |
| `assemble-video.mjs`, made for clips "produced outside Remotion", has no consumer | `SKILL.md:85-89` only |
| `faststart` exists for the Remotion proxy | `lib/faststart.mjs:4`; `asset-synthesizer.mjs:20,539-558`, `synthesize-avatar.mjs:39`, `video-engine-cli.mjs:417` |
| Two `sharp` compositors for one job | `render-thumbnail.mjs:27`, `thumbnail-v1.mjs:36-38,65` |
| Orphan living spec (TSX components, no code) | `openspec/specs/remotion-video-scenes` |

## Scope

### In Scope (slices, each independently revertible, under ~400 lines)
1. **S1 Rename + dead code**: `scene-compiler.mjs` / `SceneCompiler` / `CompositionManifest`. Delete `renderer`, `sceneType`, the `bezier` string (the GSAP default applies), unread config keys (re-checked after the sibling rewrite), `bundle-*` cases, the `preview` command (SKILL.md points to `hyperframes preview`), the Remotion SVG text and comments, and `render-vertical.mjs`. Retire `remotion-video-scenes`.
2. **S2**: delete `assemble-video.mjs`, its test and SKILL.md step 6b.
3. **S3 (spike first)**: render one raw WaveSpeed clip (moov at the end) through HyperFrames. If it plays, delete `lib/faststart.mjs`, the marker retry and its prose. If not, only fix the comment.
4. **S4 (spike first)**: thumbnail = HyperFrames composition exported as a still (`snapshot` or a 1-frame render) with frame tokens. If it passes, delete both compositors and `sharp`. If not, merge them into one compositor.

### Out of Scope
- Native per-format roots and a blur-fill layer: `--format` already renders natively, and a re-compile is a cache hit. `render-formats.mjs` is ffmpeg, not Remotion: one pass beats N renders.
- Ducking, `truepeak`, `normalize-audio`: they replace nothing that exists today.
- Word-timed captions (`hyperframes transcribe`): an addition. It needs its own change (`small.en` translates; pass `--model small --language <code>`).
- `produce` orchestrator and staleness detection: new surface.
- Draft->review->script bluepriNNt procedure: adds a file and deletes none; the tools already ship.
- ffprobe duration probing stays.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `remotion-video-scenes`: all requirements REMOVED.
- `video-script-skill`: tool list (no `preview`, no `assemble-video`/`render-vertical`, renamed compiler, `thumbnail-v1` requirement per S4).
- `two-phase-thumbnail`: REQ-2 tool becomes a composition still (S4 only).

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| The rename collides with sibling edits | High | Land after both siblings, then rebase |
| Chrome stalls on moov-at-end clips | Med | S3 spike; keep faststart if it fails |
| `snapshot` is not production-ready | Med | S4 spike; merge fallback |
| An external domain invokes a deleted script | Med | Clean break; release note names the replacements |

## Rollback Plan

Revert the slice commit. No data or workspace migration.

## Dependencies

- `video-series-extension-points` and `blueprint-dependency-lifecycle` merged (shared files: compiler, CLI, SKILL.md, `sharp` declaration).

## Success Criteria

- [ ] `rg -i remotion` finds no match in `skills/nn-video-script/`.
- [ ] A scene transition emits a valid GSAP ease (RED-then-GREEN).
- [ ] The CLI exposes only `compile` and `render`; `node scripts/verify.js` is green.
- [ ] S3/S4: spike verdict recorded; either the code is gone or the reason it stays is written down.

## Resolved assumptions (orchestrator defaults from the 2026-10-27 domain audit, pending maintainer review)

1. No domain runs the skill's `assemble-video.mjs` or `render-vertical.mjs`. The video_NN domain uses its own series-level copies (`tools/formats.mjs`, `render-vertical.ps1`), which the domain migration retires.
2. Yes, the blur-filled master is a real deliverable. iNNteresante publishes 1080x1920 and 1920x1080 variants of its square master, so `render-formats.mjs` stays.
3. The thumbnail stays a separate design that shares the same frame/brand tokens. It is not a frame grabbed from the video.
4. Deleting `preview` is fine: `hyperframes preview` covers it.
