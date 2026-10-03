# Tasks: Self-Contained Video Skill Dependencies

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~850–1100 (adds ~600 incl. committed mirror; deletes ~250) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | WU1 → WU2 → WU3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| WU1 | Parser mirror + rewire + verify step | PR 1 | Base = `dev` (session `session/video-dep-bundle`). Merges first. |
| WU2 | Remotion entry/composition + Remotion-only render | PR 2 | Base = `dev` after PR 1 lands (stacked). |
| WU3 | ensure-engine + SAPI removal + SKILL docs | PR 3 | Base = `dev` after PR 2 lands (stacked). |

## Phase 1: Parser Mirror (WU1)

- [ ] 1.1 Create `scripts/build-video-parser-mirror.mjs` (clone `build-trannsform-core-mirror.mjs`): esm, bundle, node20, `preserveSymlinks`, banner, `\r\n→\n`.
- [ ] 1.2 Embed `specs/V_0-3-3.json` via `loader:{'.json':'json'}`; stub `packageRoot()`/`loadVusSpec()`; `--check` mode.
- [ ] 1.3 RED: `skills/nn-video-script/scripts/lib/parser-mirror.test.mjs` — import mirror, `parse()` a valid fixture, no issues (spec: Parser resolves with no npm install).
- [ ] 1.4 GREEN: run builder to emit committed `skills/nn-video-script/scripts/lib/innfo-video-parser.generated.mjs`.
- [ ] 1.5 RED: test that `--check` exits non-zero after touching parser source, zero when in sync (spec: Drift check fails on stale mirror).
- [ ] 1.6 Add `steps.push(node('video-parser-mirror','Check Video Parser Mirror Fresh','scripts/build-video-parser-mirror.mjs','--check'))` near core-mirror step in `scripts/verify.js` (~L395).
- [ ] 1.7 Rewire `vus-parse-runner.mjs`: relative mirror import; drop `PARSER_ENTRY`/`pathToFileURL`/`../../../iNNfo/`.
- [ ] 1.8 Drop `--import tsx/esm` from `spawnSync` args in `vus-parse.mjs` (keep child boundary).
- [ ] 1.9 Replace `@cognnitive/innfo-video-parser` import (L17) in `remotion-scene-compiler.mjs` with relative mirror.
- [ ] 1.10 RED: integration — `vus-parse.mjs` child args contain no `tsx`; grep files reference no `@cognnitive/`, `../../../iNNfo/`, `tsx`.
- [ ] 1.11 Verify WU1: `node scripts/verify.js`; lint/format/typecheck on changed files.

## Phase 2: Remotion Composition & Render (WU2)

- [ ] 2.1 Create `scripts/remotion-entry.tsx` — `registerRoot(ScriptRoot)`.
- [ ] 2.2 Create `scripts/ScriptRoot.tsx` — `<Composition id={manifest.compositionId}>`, fps/width/height/`durationInFrames` fixed from `manifest.totalDurationInFrames`; no `calculateMetadata`.
- [ ] 2.3 Create `scripts/scene/Scene.tsx` + overlays: background image-or-color, `<Audio>` from `tracks.audio`, scene title, lowerThird/kineticTitle/conceptCallout text.
- [ ] 2.4 RED: `video-engine-cli.test.mjs` — fake `@remotion/renderer`/`bundler` via `loadModule`; assert `selectComposition` then `renderMedia({composition,serveUrl,codec:'h264'})`.
- [ ] 2.5 GREEN: switch `tryRemotionRender` to `selectComposition({serveUrl,id,inputProps})` → `renderMedia(...)`; DELETE hand-built composition object.
- [ ] 2.6 Delete FFmpeg-from-PATH fallback + silent mock in `renderVideo`; add named non-zero `VideoRenderError`; mock only behind `--allow-mock`.
- [ ] 2.7 RED: missing module → `VideoRenderError`; `--allow-mock` writes mock (spec: no mock masquerades as render).
- [ ] 2.8 Verify WU2: `node scripts/verify.js`; tests pass with `--allow-mock`.

## Phase 3: Engine Install & Docs (WU3)

- [ ] 3.1 RED: `ensure-engine.test.mjs` — no-op when `@remotion/renderer` resolves + pin matches; consent decline exits 1 (spec: Idempotent re-run is a no-op).
- [ ] 3.2 GREEN: create `scripts/ensure-engine.mjs` — idempotent, consent-gated; size + headless-browser notice BEFORE install; provider key/MCP check; exit 0/1.
- [ ] 3.3 RED: `asset-synthesizer.test.mjs` — `parseMedia({fields:{durationInSeconds:true}})` used; no ffprobe/ffmpeg/size probe.
- [ ] 3.4 GREEN: replace `probeAudioDuration` with `@remotion/media-parser`; delete `_synthesizeWindowsSapi` + both call sites.
- [ ] 3.5 Add `depends_on` frontmatter to `SKILL.md`; engine version+sha256 pin beside `vus_spec`.
- [ ] 3.6 Add `ensure-engine` step between Validate and Compile; document two-stage weight notice. `manifest/source.yaml` untouched.
- [ ] 3.7 Verify WU3: `node scripts/verify.js`; `npm --workspace=@cognnitive/innfo-video-parser test`; lint/typecheck/format.
